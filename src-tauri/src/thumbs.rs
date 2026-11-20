//! Small preview images for the summary gallery and the preview popups, cached on disk.

use image::{DynamicImage, ImageDecoder, ImageReader};
use std::path::{Path, PathBuf};

use crate::store::fnv1a;

/// Returns the path of a JPEG thumbnail of `source` that fits into `size` x `size`, creating it if needed.
/// The cache key contains size and modification time, so a changed file gets a new thumbnail.
pub fn thumbnail(cache_dir: &Path, source: &Path, size: u32) -> Result<PathBuf, String> {
    let meta = std::fs::metadata(source).map_err(|e| format!("{}: {e}", source.display()))?;
    let modified = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let key = format!("{}|{}|{}|{}", source.display(), meta.len(), modified, size);
    let target = cache_dir.join(format!("{:016x}.jpg", fnv1a(key.as_bytes())));
    if target.exists() {
        return Ok(target);
    }

    let image = decode_oriented(source)?;
    let thumb = if image.width() > size || image.height() > size {
        image.thumbnail(size, size)
    } else {
        image
    };
    std::fs::create_dir_all(cache_dir).map_err(|e| e.to_string())?;
    // write to a temporary name first, so a parallel request never sees a half-written file
    let partial = target.with_extension(format!("{}.part", std::process::id()));
    thumb
        .to_rgb8()
        .save_with_format(&partial, image::ImageFormat::Jpeg)
        .map_err(|e| e.to_string())?;
    std::fs::rename(&partial, &target).map_err(|e| e.to_string())?;
    Ok(target)
}

/// Decodes the image and turns it upright according to its EXIF orientation, like the web view does.
fn decode_oriented(source: &Path) -> Result<DynamicImage, String> {
    let reader = ImageReader::open(source)
        .and_then(|r| r.with_guessed_format())
        .map_err(|e| format!("{}: {e}", source.display()))?;
    let mut decoder = reader.into_decoder().map_err(|e| format!("{}: {e}", source.display()))?;
    let orientation = decoder.orientation().ok();
    let mut image = DynamicImage::from_decoder(decoder).map_err(|e| format!("{}: {e}", source.display()))?;
    if let Some(orientation) = orientation {
        image.apply_orientation(orientation);
    }
    Ok(image)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_and_reuses_a_thumbnail() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("big.png");
        image::RgbImage::from_pixel(800, 400, image::Rgb([200, 30, 30])).save(&source).unwrap();
        let cache = dir.path().join("cache");

        let thumb = thumbnail(&cache, &source, 200).unwrap();
        let decoded = image::open(&thumb).unwrap();
        assert_eq!((decoded.width(), decoded.height()), (200, 100));
        assert_eq!(thumbnail(&cache, &source, 200).unwrap(), thumb);
    }
}
