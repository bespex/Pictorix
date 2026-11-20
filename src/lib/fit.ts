/**
 * Svelte action: scales an image to the largest size that fits its parent, keeping the aspect ratio -
 * small images are enlarged as well. Unlike `object-fit`, the element box matches the visible image,
 * so outlines, shadows and the click target follow the image itself.
 */
export function fit(img: HTMLImageElement) {
  const parent = img.parentElement!;

  const update = () => {
    const { naturalWidth: w, naturalHeight: h } = img;
    const { clientWidth: pw, clientHeight: ph } = parent;
    if (!w || !h || !pw || !ph) return;
    const scale = Math.min(pw / w, ph / h);
    img.style.width = `${Math.floor(w * scale)}px`;
    img.style.height = `${Math.floor(h * scale)}px`;
  };

  const observer = new ResizeObserver(update);
  observer.observe(parent);
  img.addEventListener("load", update);
  if (img.complete) update();

  return {
    destroy() {
      observer.disconnect();
      img.removeEventListener("load", update);
    },
  };
}
