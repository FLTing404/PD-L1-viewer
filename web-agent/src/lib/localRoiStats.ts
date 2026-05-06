import type { CaseManifest, PatchEntry } from "@/types/case";

export interface WorldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LocalSelectionSummary {
  /** Real manifest patches intersecting snapped ROI */
  realPatchCount: number;
  /** Simulated all-negative grid slots in ROI with no export */
  syntheticPatchCount: number;
  patchCount: number;
  totalCells: number;
  positiveCells: number;
  negativeCells: number;
}

function rectIntersect(a: WorldRect, b: WorldRect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function patchRect(p: PatchEntry): WorldRect {
  return { x: p.px, y: p.py, w: p.width, h: p.height };
}

function averageCellsPerPatch(manifest: CaseManifest): number {
  const n = manifest.patches.length;
  if (n === 0) return 64;
  const total = manifest.patches.reduce((s, p) => s + p.numCells, 0);
  return Math.max(1, Math.round(total / n));
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
 * (includes blank / synthetic tiles when `stitched.jpg` fills the full WSI grid).
 * Manifest-only patches alone would miss white-only regions.
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

  const realPatches = manifest.patches.filter((p) =>
    rectIntersect(patchRect(p), snapped),
  );
  const patchKey = (gx: number, gy: number) => `${gx},${gy}`;
  const exportAtSlot = new Map<string, PatchEntry>();
  for (const p of manifest.patches) {
    exportAtSlot.set(patchKey(p.px, p.py), p);
  }

  const avgCells = averageCellsPerPatch(manifest);

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
      if (!exportAtSlot.has(patchKey(gx, gy))) syntheticPatchCount++;
    }
  }

  const realPatchCount = realPatches.length;
  let totalCells = 0;
  let positiveCells = 0;
  for (const p of realPatches) {
    totalCells += p.numCells;
    positiveCells += Math.round(p.patchPredTps * p.numCells);
  }
  positiveCells = Math.min(positiveCells, totalCells);

  totalCells += syntheticPatchCount * avgCells;
  const negativeCells = totalCells - positiveCells;

  const summary: LocalSelectionSummary = {
    realPatchCount,
    syntheticPatchCount,
    patchCount: realPatchCount + syntheticPatchCount,
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
  return manifest.patches.filter((p) =>
    rectIntersect(patchRect(p), worldRect),
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
