//! Reading an image folder.

use serde::Serialize;
use std::path::{Path, PathBuf};

/// The file types the web view can display on every platform.
pub const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageEntry {
    pub path: String,
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderInfo {
    pub path: String,
    /// The path for display, with the home directory shortened to "~" where that is common.
    pub display_path: String,
    pub images: Vec<ImageEntry>,
}

pub fn is_supported(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// Lists the images directly in `dir` (not in subfolders). Hidden files are skipped.
pub fn scan(dir: &Path) -> Result<FolderInfo, String> {
    if !dir.is_dir() {
        return Err(format!("not-a-directory:{}", dir.display()));
    }
    let dir = dunce_canonicalize(dir);
    let entries = std::fs::read_dir(&dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    let mut images: Vec<ImageEntry> = entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            let meta = entry.metadata().ok()?;
            if !meta.is_file() || name.starts_with('.') || !is_supported(&path) {
                return None;
            }
            Some(ImageEntry { path: path.to_string_lossy().into_owned(), name, size: meta.len() })
        })
        .collect();
    images.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(FolderInfo {
        display_path: display_path(&dir),
        path: dir.to_string_lossy().into_owned(),
        images,
    })
}

/// Canonical path without the `\\?\` prefix Windows adds, which confuses users and some tools.
pub fn dunce_canonicalize(path: &Path) -> PathBuf {
    let canonical = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let text = canonical.to_string_lossy();
    match text.strip_prefix(r"\\?\") {
        Some(stripped) if !stripped.starts_with("UNC") => PathBuf::from(stripped),
        _ => canonical,
    }
}

pub fn display_path(dir: &Path) -> String {
    let text = dir.to_string_lossy().into_owned();
    if cfg!(windows) {
        return text;
    }
    match std::env::var("HOME") {
        Ok(home) if !home.is_empty() && (text == home || text.starts_with(&format!("{home}/"))) => {
            format!("~{}", &text[home.len()..])
        }
        _ => text,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_only_supported_visible_files() {
        let dir = tempfile::tempdir().unwrap();
        for name in ["b.JPG", "a.png", "c.webp", ".hidden.jpg", "notes.txt", "d.heic"] {
            std::fs::write(dir.path().join(name), b"x").unwrap();
        }
        std::fs::create_dir(dir.path().join("sub.jpg")).unwrap();

        let info = scan(dir.path()).unwrap();
        let names: Vec<_> = info.images.iter().map(|i| i.name.as_str()).collect();
        assert_eq!(names, vec!["a.png", "b.JPG", "c.webp"]);
    }

    #[test]
    fn rejects_a_file() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.jpg");
        std::fs::write(&file, b"x").unwrap();
        assert!(scan(&file).unwrap_err().starts_with("not-a-directory:"));
    }
}
