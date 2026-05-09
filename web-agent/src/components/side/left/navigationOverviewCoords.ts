/**
 * Map a click inside `container` to normalized [0,1]×[0,1] on the logical slide image,
 * accounting for CSS `object-contain` letterboxing on `img` (if present).
 */
export function clientToSlideUv(
  clientX: number,
  clientY: number,
  containerEl: HTMLElement,
  imgEl: HTMLImageElement | null,
): { u: number; v: number } {
  const rect = containerEl.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;
  if (
    imgEl &&
    imgEl.complete &&
    imgEl.naturalWidth > 0 &&
    imgEl.naturalHeight > 0
  ) {
    const nw = imgEl.naturalWidth;
    const nh = imgEl.naturalHeight;
    const scale = Math.min(cw / nw, ch / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;
    const lx = clientX - rect.left - ox;
    const ly = clientY - rect.top - oy;
    let u = lx / dw;
    let v = ly / dh;
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));
    return { u, v };
  }
  const nx = (clientX - rect.left) / Math.max(1e-6, cw);
  const ny = (clientY - rect.top) / Math.max(1e-6, ch);
  return {
    u: Math.max(0, Math.min(1, nx)),
    v: Math.max(0, Math.min(1, ny)),
  };
}
