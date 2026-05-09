/**
 * WSI overlay frames: dashed sky ROI vs thin solid bucket-coloured patch frame.
 */

function applyRoiRegionFrameStyles(el: HTMLElement): void {
  el.style.boxSizing = "border-box";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.border = "2px dashed rgba(56, 189, 248, 0.95)";
  el.style.boxShadow =
    "0 0 0 1px rgba(0, 0, 0, 0.35), inset 0 0 20px rgba(56, 189, 248, 0.12)";
  el.style.pointerEvents = "none";
  el.style.borderRadius = "2px";
  el.style.background = "rgba(56, 189, 248, 0.06)";
}

/** Local ROI drag result — dashed sky, distinct from patch severity frame. */
export function makeRoiRegionFrame(): HTMLDivElement {
  const div = document.createElement("div");
  applyRoiRegionFrameStyles(div);
  return div;
}

/** Selected / highest-TPS-in-ROI patch — 1px solid bucket colour, no shadow glow. */
export function makePatchSeverityFrame(hex: string): HTMLDivElement {
  const div = document.createElement("div");
  div.style.boxSizing = "border-box";
  div.style.width = "100%";
  div.style.height = "100%";
  div.style.border = `1px solid ${hex}`;
  div.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.45)";
  div.style.pointerEvents = "none";
  div.style.borderRadius = "0";
  div.style.background = "transparent";
  return div;
}

/** @deprecated Use {@link makeRoiRegionFrame} */
export function makeViewerRegionFrame(): HTMLDivElement {
  return makeRoiRegionFrame();
}

/** @deprecated Use {@link applyRoiRegionFrameStyles} internally */
export function applyViewerRegionFrameStyles(el: HTMLElement): void {
  applyRoiRegionFrameStyles(el);
}

/** Tailwind-friendly classes matching ROI dashed frame (rubber-band drag). */
export const VIEWER_REGION_FRAME_BOX_CLASS =
  "rounded-[2px] border-2 border-dashed border-sky-400/95 bg-sky-400/[0.06] shadow-[0_0_0_1px_rgba(0,0,0,0.35),inset_0_0_20px_rgba(56,189,248,0.12)]";
