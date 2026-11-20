mod apply;
mod folder;
mod store;
mod thumbs;

use apply::{ApplyError, ApplyRequest, Journal, RevertReport};
use folder::FolderInfo;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, LogicalSize, Manager};

#[derive(Debug, Clone, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
struct LaunchArgs {
    directory: Option<String>,
    mode: Option<String>,
    lang: Option<String>,
}

/// `pictorix [directory] [--mode=order|simple-knockout|full-knockout|rate|categorize] [--lang=en|de]`
fn parse_args(args: impl IntoIterator<Item = String>, cwd: &Path) -> LaunchArgs {
    let mut result = LaunchArgs::default();
    let mut args = args.into_iter().peekable();
    while let Some(arg) = args.next() {
        let mut flag = |name: &str| -> Option<String> {
            let rest = arg.strip_prefix("--")?.strip_prefix(name)?;
            match rest.strip_prefix('=') {
                Some(value) => Some(value.to_string()),
                None if rest.is_empty() => args.next(),
                None => None,
            }
        };
        if let Some(mode) = flag("mode") {
            result.mode = Some(mode.to_lowercase());
        } else if let Some(lang) = flag("lang") {
            result.lang = Some(lang.to_lowercase());
        } else if !arg.starts_with('-') && result.directory.is_none() {
            result.directory = Some(cwd.join(&arg).to_string_lossy().into_owned());
        }
    }
    result
}

fn app_dir(app: &AppHandle, kind: &str) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(base.join(kind))
}

#[tauri::command]
fn launch_args() -> LaunchArgs {
    let cwd = std::env::current_dir().unwrap_or_default();
    parse_args(std::env::args().skip(1), &cwd)
}

#[tauri::command]
fn scan_folder(app: AppHandle, path: String) -> Result<FolderInfo, String> {
    let mut dir = PathBuf::from(&path);
    // a dropped image means its folder
    if dir.is_file() {
        dir.pop();
    }
    let info = folder::scan(&dir)?;
    // the web view may only load images from folders the user picked
    app.asset_protocol_scope()
        .allow_directory(&info.path, false)
        .map_err(|e| e.to_string())?;
    Ok(info)
}

#[tauri::command]
async fn thumbnail(app: AppHandle, path: String, size: u32) -> Result<String, String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("thumbnails");
    tauri::async_runtime::spawn_blocking(move || thumbs::thumbnail(&cache, Path::new(&path), size.clamp(32, 1024)))
        .await
        .map_err(|e| e.to_string())?
        .map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn session_load(app: AppHandle, folder: String) -> Result<Option<String>, String> {
    store::read(&store::file_for(&app_dir(&app, "")?, "sessions", &folder))
}

#[tauri::command]
fn session_save(app: AppHandle, folder: String, content: String) -> Result<(), String> {
    store::write(&store::file_for(&app_dir(&app, "")?, "sessions", &folder), &content)
}

#[tauri::command]
fn session_clear(app: AppHandle, folder: String) -> Result<(), String> {
    store::remove(&store::file_for(&app_dir(&app, "")?, "sessions", &folder))
}

#[tauri::command]
fn journal_load(app: AppHandle, folder: String) -> Result<Option<Journal>, String> {
    let text = store::read(&store::file_for(&app_dir(&app, "")?, "journals", &folder))?;
    Ok(text.and_then(|t| serde_json::from_str(&t).ok()))
}

#[tauri::command]
async fn apply_result(app: AppHandle, request: ApplyRequest) -> Result<Journal, ApplyError> {
    let base = app_dir(&app, "").map_err(|message| ApplyError::Io { message })?;
    let journal = tauri::async_runtime::spawn_blocking(move || apply::apply(&request))
        .await
        .map_err(|e| ApplyError::Io { message: e.to_string() })??;
    let text = serde_json::to_string_pretty(&journal).unwrap_or_default();
    // the files are changed already: a failing journal must not turn this into an error
    let _ = store::write(&store::file_for(&base, "journals", &journal.folder), &text);
    let _ = store::remove(&store::file_for(&base, "sessions", &journal.folder));
    Ok(journal)
}

#[tauri::command]
async fn revert_last(app: AppHandle, folder: String) -> Result<RevertReport, String> {
    let file = store::file_for(&app_dir(&app, "")?, "journals", &folder);
    let journal: Journal = store::read(&file)?
        .and_then(|t| serde_json::from_str(&t).ok())
        .ok_or_else(|| "no journal".to_string())?;
    let report = tauri::async_runtime::spawn_blocking(move || apply::revert(&journal))
        .await
        .map_err(|e| e.to_string())?;
    store::remove(&file)?;
    Ok(report)
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    tauri_plugin_opener::open_path(path, None::<&str>).map_err(|e| e.to_string())
}

/// How this installation gets updates: the AppImage and the Windows installer
/// update themselves through Tauri's updater; a .deb is kept current by APT
/// (the be spex package repository), so the app only checks in those two cases.
#[tauri::command]
fn self_update_supported() -> bool {
    if cfg!(debug_assertions) {
        return false;
    }
    cfg!(windows) || (cfg!(target_os = "linux") && std::env::var_os("APPIMAGE").is_some())
}

/// Like the original iorg: nearly the full screen height, at most 3:2.
fn size_main_window(app: &tauri::App) {
    let Some(window) = app.get_webview_window("main") else { return };
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let screen = monitor.size().to_logical::<f64>(scale);
        let height = (screen.height - 80.0).max(600.0);
        let width = (screen.width - 80.0).min(height * 1.5).max(900.0);
        let _ = window.set_size(LogicalSize::new(width, height));
        let _ = window.center();
    }
    let _ = window.show();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if let Ok(cache) = app.path().app_cache_dir() {
                let thumbs = cache.join("thumbnails");
                let _ = std::fs::create_dir_all(&thumbs);
                let _ = app.asset_protocol_scope().allow_directory(&thumbs, false);
            }
            size_main_window(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            launch_args,
            scan_folder,
            thumbnail,
            session_load,
            session_save,
            session_clear,
            journal_load,
            apply_result,
            revert_last,
            open_folder,
            self_update_supported
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pictorix");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(list: &[&str]) -> LaunchArgs {
        parse_args(list.iter().map(|s| s.to_string()), Path::new("/home/me"))
    }

    #[test]
    fn parses_all_parameters() {
        assert_eq!(
            args(&["Pictures/Birds", "--mode=Order", "--lang", "de"]),
            LaunchArgs {
                directory: Some("/home/me/Pictures/Birds".into()),
                mode: Some("order".into()),
                lang: Some("de".into()),
            }
        );
        assert_eq!(args(&["/abs"]).directory.as_deref(), Some("/abs"));
        assert_eq!(args(&[]), LaunchArgs::default());
    }
}
