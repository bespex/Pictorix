//! Applies the voting result to the files: rename/move them in place or copy them into a result folder.
//!
//! Safety rules:
//! - Everything is checked before the first file is touched; a conflict aborts without any change.
//! - Moves run in two phases via temporary names, so swapped names (`001-a` <-> `002-b`) cannot collide.
//! - Every applied result leaves a journal behind, so it can be reverted later.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Operation {
    /// Absolute path of an image directly inside the folder.
    pub from: String,
    /// Optional subfolder (a single folder name), e.g. the category.
    pub to_dir: Option<String>,
    pub to_name: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Method {
    Move,
    Copy,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyRequest {
    pub folder: String,
    pub method: Method,
    /// For [`Method::Copy`]: the result folder inside `folder`.
    pub copy_folder: Option<String>,
    pub operations: Vec<Operation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Journal {
    pub folder: String,
    pub method: Method,
    pub created_at: u64,
    /// The folder that shows the result: the image folder itself or the copy folder.
    pub target_folder: String,
    pub entries: Vec<JournalEntry>,
    pub created_dirs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ApplyError {
    /// Nothing was changed: these targets exist already or are used twice.
    Conflicts { paths: Vec<String> },
    /// The request itself is not valid, e.g. a file outside the folder.
    Invalid { message: String },
    /// A file operation failed; everything done so far was rolled back as far as possible.
    Io { message: String },
}

#[derive(Debug, Clone, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RevertReport {
    pub restored: usize,
    pub failed: Vec<String>,
}

fn invalid(message: impl Into<String>) -> ApplyError {
    ApplyError::Invalid { message: message.into() }
}

fn io(message: impl Into<String>) -> ApplyError {
    ApplyError::Io { message: message.into() }
}

/// A single, harmless path segment: no separators, no `..`, nothing Windows refuses.
fn check_segment(segment: &str) -> Result<(), ApplyError> {
    let reserved = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let mut components = Path::new(segment).components();
    let single_normal = matches!(components.next(), Some(Component::Normal(_))) && components.next().is_none();
    if segment.trim().is_empty()
        || !single_normal
        || segment.chars().any(|c| reserved.contains(&c) || c.is_control())
        || segment.ends_with('.')
        || segment.ends_with(' ')
    {
        return Err(invalid(format!("invalid name: {segment}")));
    }
    Ok(())
}

/// File systems on Windows and macOS usually ignore case, so `A.jpg` and `a.jpg` are the same file there.
fn key(path: &Path) -> String {
    let text = path.to_string_lossy();
    if cfg!(any(windows, target_os = "macos")) {
        text.to_lowercase()
    } else {
        text.into_owned()
    }
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

struct Planned {
    from: PathBuf,
    to: PathBuf,
}

fn plan(request: &ApplyRequest) -> Result<(PathBuf, Vec<Planned>), ApplyError> {
    let folder = PathBuf::from(&request.folder);
    if !folder.is_dir() {
        return Err(invalid(format!("not a directory: {}", folder.display())));
    }
    let mut target_root = folder.clone();
    if request.method == Method::Copy {
        let name = request.copy_folder.as_deref().unwrap_or("");
        check_segment(name)?;
        target_root = folder.join(name);
    }

    let mut planned = Vec::with_capacity(request.operations.len());
    for op in &request.operations {
        let from = PathBuf::from(&op.from);
        if from.parent() != Some(folder.as_path()) || !from.is_file() {
            return Err(invalid(format!("not an image in the folder: {}", op.from)));
        }
        check_segment(&op.to_name)?;
        let mut to = target_root.clone();
        if let Some(dir) = op.to_dir.as_deref().filter(|d| !d.is_empty()) {
            check_segment(dir)?;
            to.push(dir);
        }
        to.push(&op.to_name);
        planned.push(Planned { from, to });
    }

    // a source that is moved away frees its name for another file
    let sources: HashSet<String> = if request.method == Method::Move {
        planned.iter().map(|p| key(&p.from)).collect()
    } else {
        HashSet::new()
    };
    let mut targets = HashSet::new();
    let mut conflicts = Vec::new();
    for p in &planned {
        let target_key = key(&p.to);
        let unchanged = key(&p.from) == target_key;
        let taken = p.to.exists() && !sources.contains(&target_key) && !unchanged;
        if !targets.insert(target_key) || taken {
            conflicts.push(p.to.to_string_lossy().into_owned());
        }
    }
    if !conflicts.is_empty() {
        return Err(ApplyError::Conflicts { paths: conflicts });
    }
    Ok((target_root, planned))
}

/// Creates `dir` and its missing parents, remembering each created folder for the journal.
fn create_dirs(dir: &Path, created: &mut Vec<PathBuf>) -> std::io::Result<()> {
    let mut missing = Vec::new();
    let mut current = Some(dir);
    while let Some(d) = current {
        if d.exists() {
            break;
        }
        missing.push(d.to_path_buf());
        current = d.parent();
    }
    for d in missing.into_iter().rev() {
        std::fs::create_dir(&d)?;
        created.push(d);
    }
    Ok(())
}

fn remove_dirs(created: &[PathBuf]) {
    for d in created.iter().rev() {
        let _ = std::fs::remove_dir(d); // only succeeds if empty, which is exactly what we want
    }
}

pub fn apply(request: &ApplyRequest) -> Result<Journal, ApplyError> {
    let (target_root, planned) = plan(request)?;
    let mut created = Vec::new();

    match request.method {
        Method::Copy => {
            let mut copied: Vec<&Path> = Vec::new();
            for p in &planned {
                let result = create_dirs(p.to.parent().unwrap(), &mut created).and_then(|_| std::fs::copy(&p.from, &p.to));
                if let Err(e) = result {
                    copied.iter().for_each(|c| {
                        let _ = std::fs::remove_file(c);
                    });
                    remove_dirs(&created);
                    return Err(io(format!("{}: {e}", p.to.display())));
                }
                copied.push(&p.to);
            }
        }
        Method::Move => {
            // phase 1: everything to a temporary name in the same folder (same file system, so a cheap rename)
            let pid = std::process::id();
            let mut temps: Vec<PathBuf> = Vec::new();
            for (idx, p) in planned.iter().enumerate() {
                let temp = p.from.with_file_name(format!(".pictorix-{pid}-{idx}.tmp"));
                if let Err(e) = std::fs::rename(&p.from, &temp) {
                    for (done, t) in temps.iter().enumerate() {
                        let _ = std::fs::rename(t, &planned[done].from);
                    }
                    return Err(io(format!("{}: {e}", p.from.display())));
                }
                temps.push(temp);
            }
            // phase 2: temporary name to the final name
            for (idx, p) in planned.iter().enumerate() {
                let result = create_dirs(p.to.parent().unwrap(), &mut created).and_then(|_| std::fs::rename(&temps[idx], &p.to));
                if let Err(e) = result {
                    for (done, q) in planned.iter().enumerate() {
                        let current = if done < idx { &q.to } else { &temps[done] };
                        let _ = std::fs::rename(current, &q.from);
                    }
                    remove_dirs(&created);
                    return Err(io(format!("{}: {e}", p.to.display())));
                }
            }
        }
    }

    Ok(Journal {
        folder: request.folder.clone(),
        method: request.method,
        created_at: now(),
        target_folder: target_root.to_string_lossy().into_owned(),
        entries: planned
            .iter()
            .map(|p| JournalEntry {
                from: p.from.to_string_lossy().into_owned(),
                to: p.to.to_string_lossy().into_owned(),
            })
            .collect(),
        created_dirs: created.iter().map(|d| d.to_string_lossy().into_owned()).collect(),
    })
}

/// Undoes an applied result. Files that were changed or removed since then are left alone and reported.
pub fn revert(journal: &Journal) -> RevertReport {
    let mut report = RevertReport::default();
    match journal.method {
        Method::Copy => {
            for entry in &journal.entries {
                let to = Path::new(&entry.to);
                if to.is_file() && std::fs::remove_file(to).is_ok() {
                    report.restored += 1;
                } else {
                    report.failed.push(entry.to.clone());
                }
            }
        }
        Method::Move => {
            // two phases again, for the same reason as in apply(): swapped names
            let pid = std::process::id();
            let mut parked: Vec<(PathBuf, &JournalEntry)> = Vec::new();
            for (idx, entry) in journal.entries.iter().enumerate() {
                let to = Path::new(&entry.to);
                let temp = to.with_file_name(format!(".pictorix-revert-{pid}-{idx}.tmp"));
                if to.is_file() && std::fs::rename(to, &temp).is_ok() {
                    parked.push((temp, entry));
                } else {
                    report.failed.push(entry.to.clone());
                }
            }
            for (temp, entry) in parked {
                let from = Path::new(&entry.from);
                if !from.exists() && std::fs::rename(&temp, from).is_ok() {
                    report.restored += 1;
                } else {
                    // the original name is taken by now: leave the file where it was
                    let _ = std::fs::rename(&temp, &entry.to);
                    report.failed.push(entry.to.clone());
                }
            }
        }
    }
    let created: Vec<PathBuf> = journal.created_dirs.iter().map(PathBuf::from).collect();
    remove_dirs(&created);
    report
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup(names: &[&str]) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        for name in names {
            std::fs::write(dir.path().join(name), name.as_bytes()).unwrap();
        }
        dir
    }

    fn op(dir: &Path, from: &str, to_dir: Option<&str>, to_name: &str) -> Operation {
        Operation {
            from: dir.join(from).to_string_lossy().into_owned(),
            to_dir: to_dir.map(String::from),
            to_name: to_name.into(),
        }
    }

    fn request(dir: &Path, method: Method, operations: Vec<Operation>) -> ApplyRequest {
        ApplyRequest {
            folder: dir.to_string_lossy().into_owned(),
            method,
            copy_folder: Some("Result".into()),
            operations,
        }
    }

    fn content(path: PathBuf) -> String {
        std::fs::read_to_string(path).unwrap()
    }

    #[test]
    fn swapped_names_do_not_collide_and_can_be_reverted() {
        let dir = setup(&["001-a.jpg", "002-b.jpg"]);
        let d = dir.path();
        let req = request(d, Method::Move, vec![op(d, "001-a.jpg", None, "002-b.jpg"), op(d, "002-b.jpg", None, "001-a.jpg")]);

        let journal = apply(&req).unwrap();
        assert_eq!(content(d.join("002-b.jpg")), "001-a.jpg");
        assert_eq!(content(d.join("001-a.jpg")), "002-b.jpg");

        assert_eq!(revert(&journal), RevertReport { restored: 2, failed: vec![] });
        assert_eq!(content(d.join("001-a.jpg")), "001-a.jpg");
    }

    #[test]
    fn categories_become_folders_and_disappear_on_revert() {
        let dir = setup(&["a.jpg", "b.jpg"]);
        let d = dir.path();
        let req = request(d, Method::Move, vec![op(d, "a.jpg", Some("family"), "a.jpg"), op(d, "b.jpg", Some("trip"), "b.jpg")]);

        let journal = apply(&req).unwrap();
        assert!(d.join("family/a.jpg").is_file());
        assert_eq!(journal.created_dirs.len(), 2);

        revert(&journal);
        assert!(d.join("a.jpg").is_file());
        assert!(!d.join("family").exists());
    }

    #[test]
    fn existing_target_aborts_before_any_change() {
        let dir = setup(&["a.jpg", "b.jpg", "01-a.jpg"]);
        let d = dir.path();
        let req = request(d, Method::Move, vec![op(d, "b.jpg", None, "02-b.jpg"), op(d, "a.jpg", None, "01-a.jpg")]);

        let error = apply(&req).unwrap_err();
        assert!(matches!(error, ApplyError::Conflicts { ref paths } if paths.len() == 1));
        assert!(d.join("b.jpg").is_file(), "nothing may have been renamed");
    }

    #[test]
    fn copy_keeps_the_originals() {
        let dir = setup(&["a.jpg"]);
        let d = dir.path();
        let journal = apply(&request(d, Method::Copy, vec![op(d, "a.jpg", Some("best"), "a.jpg")])).unwrap();
        assert!(d.join("a.jpg").is_file());
        assert!(d.join("Result/best/a.jpg").is_file());

        revert(&journal);
        assert!(!d.join("Result").exists());
        assert!(d.join("a.jpg").is_file());
    }

    #[test]
    fn rejects_paths_that_leave_the_folder() {
        let dir = setup(&["a.jpg"]);
        let d = dir.path();
        for (to_dir, name) in [(Some(".."), "a.jpg"), (None, "../a.jpg"), (Some("x/y"), "a.jpg"), (None, "a?.jpg")] {
            let error = apply(&request(d, Method::Move, vec![op(d, "a.jpg", to_dir, name)])).unwrap_err();
            assert!(matches!(error, ApplyError::Invalid { .. }), "{to_dir:?} {name}");
        }
    }
}
