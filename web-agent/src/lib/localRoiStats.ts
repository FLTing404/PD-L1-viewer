import type { CaseManifest, PatchEntry } from "@/types/case";

export interface WorldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LocalSelectionSummary {
  /** Real manifest patches intersecting snapped ROI (tissue patches with cells>0). */
  realPatchCount: number;
  /**
   * Grid slots inside the snapped ROI that have no exported (real) patch — pure
   * background tiles that the snap covers. Kept for visual context only; **not**
   * folded into `patchCount` / `totalCells` (those are real-only).
   */
  syntheticPatchCount: number;
  /** Real patches only. Excludes synthetic / blank grid slots. */
  patchCount: number;
  /** Sum of `numCells` over real patches only. */
  totalCells: number;
  positiveCells: number;
  negativeCells: number;
}

/** Sub-pixel tolerance so patches touching the ROI edge are not dropped (strict < loses shared boundaries). */
const RECT_OVERLAP_EPS = 0.5;

function rectIntersect(a: WorldRect, b: WorldRect): boolean {
  return (
    a.x < b.x + b.w + RECT_OVERLAP_EPS &&
    a.x + a.w + RECT_OVERLAP_EPS > b.x &&
    a.y < b.y + b.h + RECT_OVERLAP_EPS &&
    a.y + a.h + RECT_OVERLAP_EPS > b.y
  );
}

/** Fallback to manifest patch grid size when width/height are missing or zero (otherwise rect tests drop the patch). */
function patchRect(p: PatchEntry, patchSize: number): WorldRect {
  const w =
    Number.isFinite(p.width) && p.width > 0 ? p.width : patchSize;
  const h =
    Number.isFinite(p.height) && p.height > 0 ? p.height : patchSize;
  return { x: p.px, y: p.py, w, h };
}

/**
 * Image-space drag → WSI coordinates (same space as patch px/py).
 */
export function imageDragToWorldRect(
  ix0: number,
  iy0: number,
  ix1: number,
  iy1: number,
  thumbScaleX: number,
  thumbScaleY: number,
): WorldRect {
  const x0 = Math.min(ix0, ix1) / thumbScaleX;
  const y0 = Math.min(iy0, iy1) / thumbScaleY;
  const x1 = Math.max(ix0, ix1) / thumbScaleX;
  const y1 = Math.max(iy0, iy1) / thumbScaleY;
  return {
    x: x0,
    y: y0,
    w: Math.max(1, x1 - x0),
    h: Math.max(1, y1 - y0),
  };
}

/**
 * From drawn ROI: snap to the union of all 512×512 grid cells that intersect the drag rect
 * (snap geometry includes blank / background tiles so the rubber band aligns with the WSI
 * patch grid, even over white areas). Statistics, however, are computed from **real
 * exported patches only** (those with `numCells > 0`): blank grid slots inside the snapped
 * rectangle are reported as `syntheticPatchCount` for visual context, but they are
 * excluded from `patchCount`, `totalCells`, and positive / negative cell counts.
 */
export function computeLocalSelectionFromUserRect(
  manifest: CaseManifest,
  userWorld: WorldRect,
):
  | { snapped: WorldRect; summary: LocalSelectionSummary }
  | null {
  const ps = manifest.wsiMeta.patchSize;
  const wsiW = manifest.wsiMeta.wsiWidth;
  const wsiH = manifest.wsiMeta.wsiHeight;

  const gxMin = Math.floor(userWorld.x / ps) * ps;
  const gyMin = Math.floor(userWorld.y / ps) * ps;
  const gxMax = Math.ceil((userWorld.x + userWorld.w) / ps) * ps;
  const gyMax = Math.ceil((userWorld.y + userWorld.h) / ps) * ps;

  let minX = Infinity;
  let minY = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  let anyCell = false;

  for (let gx = gxMin; gx < gxMax; gx += ps) {
    if (gx >= wsiW) continue;
    for (let gy = gyMin; gy < gyMax; gy += ps) {
      if (gy >= wsiH) continue;
      const cw = Math.min(ps, wsiW - gx);
      const ch = Math.min(ps, wsiH - gy);
      if (cw <= 0 || ch <= 0) continue;
      const cell: WorldRect = { x: gx, y: gy, w: cw, h: ch };
      if (!rectIntersect(cell, userWorld)) continue;
      anyCell = true;
      minX = Math.min(minX, gx);
      minY = Math.min(minY, gy);
      maxR = Math.max(maxR, gx + cw);
      maxB = Math.max(maxB, gy + ch);
    }
  }

  if (!anyCell || minX === Infinity) return null;

  const snapped: WorldRect = {
    x: minX,
    y: minY,
    w: maxR - minX,
    h: maxB - minY,
  };

  /** Real exported patches with cells > 0 that fall inside the snapped grid. */
  const patchesInSnapped = patchesIntersectingRect(manifest, snapped).filter(
    (p) => p.numCells > 0,
  );

  /** Blank grid slots (no exported patch with cells) inside the snapped rect — context only. */
  const patchKey = (gx: number, gy: number) => `${gx},${gy}`;
  const realSlotSet = new Set<string>();
  for (const p of patchesInSnapped) {
    realSlotSet.add(patchKey(p.px, p.py));
  }
  const xStart = Math.floor(snapped.x / ps) * ps;
  const yStart = Math.floor(snapped.y / ps) * ps;
  const xEnd = snapped.x + snapped.w;
  const yEnd = snapped.y + snapped.h;
  let syntheticPatchCount = 0;
  for (let gx = xStart; gx < xEnd; gx += ps) {
    if (gx >= wsiW) continue;
    for (let gy = yStart; gy < yEnd; gy += ps) {
      if (gy >= wsiH) continue;
      const cw = Math.min(ps, wsiW - gx);
      const ch = Math.min(ps, wsiH - gy);
      if (cw <= 0 || ch <= 0) continue;
      const cell: WorldRect = { x: gx, y: gy, w: cw, h: ch };
      if (!rectIntersect(cell, snapped)) continue;
      if (!realSlotSet.has(patchKey(gx, gy))) syntheticPatchCount++;
    }
  }

  const realPatchCount = patchesInSnapped.length;
  let totalCells = 0;
  let positiveCells = 0;
  for (const p of patchesInSnapped) {
    totalCells += p.numCells;
    positiveCells += Math.round(p.patchPredTps * p.numCells);
  }
  positiveCells = Math.min(positiveCells, totalCells);
  const negativeCells = totalCells - positiveCells;

  const summary: LocalSelectionSummary = {
    realPatchCount,
    syntheticPatchCount,
    patchCount: realPatchCount,
    totalCells,
    positiveCells,
    negativeCells,
  };

  return { snapped, summary };
}

/** Patches with manifest data that intersect a world-space rectangle (e.g. snapped ROI). */
export function patchesIntersectingRect(
  manifest: CaseManifest,
  worldRect: WorldRect,
): PatchEntry[] {
  const ps = manifest.wsiMeta.patchSize;
  return manifest.patches.filter(
    (p) =>
      p.numCells > 0 && rectIntersect(patchRect(p, ps), worldRect),
  );
}

/** Highest `patchPredTps` among real patches in the region; null if none. */
export function getHighestTpsPatchInRect(
  manifest: CaseManifest,
  worldRect: WorldRect,
): PatchEntry | null {
  const inRect = patchesIntersectingRect(manifest, worldRect);
  if (inRect.length === 0) return null;
  let best = inRect[0]!;
  for (let i = 1; i < inRect.length; i++) {
    const p = inRect[i]!;
    if (p.patchPredTps > best.patchPredTps) best = p;
  }
  return best;
}
