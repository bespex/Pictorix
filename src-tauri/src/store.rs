//! Small JSON documents per image folder in the app data directory: the saved voting session and the
//! journal of the last applied result. Nothing is written into the image folder itself.

use std::path::{Path, PathBuf};

/// FNV-1a: stable across Rust versions and platforms, unlike `DefaultHasher`.
pub fn fnv1a(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

pub fn file_for(base: &Path, kind: &str, folder: &str) -> PathBuf {
    base.join(kind).join(format!("{:016x}.json", fnv1a(folder.as_bytes())))
}

pub fn read(path: &Path) -> Result<Option<String>, String> {
    match std::fs::read_to_string(path) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Writes atomically: a crash in the middle never leaves a truncated session behind.
pub fn write(path: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let partial = path.with_extension("json.part");
    std::fs::write(&partial, content).map_err(|e| e.to_string())?;
    std::fs::rename(&partial, path).map_err(|e| e.to_string())
}

pub fn remove(path: &Path) -> Result<(), String> {
    match std::fs::remove_file(path) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let file = file_for(dir.path(), "sessions", "/photos");
        assert_eq!(read(&file).unwrap(), None);
        write(&file, "{}").unwrap();
        assert_eq!(read(&file).unwrap().as_deref(), Some("{}"));
        remove(&file).unwrap();
        remove(&file).unwrap();
        assert_eq!(read(&file).unwrap(), None);
    }

    #[test]
    fn hash_is_stable() {
        // reference values of FNV-1a 64
        assert_eq!(fnv1a(b""), 0xcbf29ce484222325);
        assert_eq!(fnv1a(b"a"), 0xaf63dc4c8601ec8c);
    }
}
