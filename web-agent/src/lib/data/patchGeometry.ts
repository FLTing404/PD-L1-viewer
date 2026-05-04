export const DEFAULT_PATCH_SIZE = 512;

const PATCH_COORD_PATTERN = /_x(\d+)_y(\d+)$/;

export function parsePatchId(
  patchId: string,
): { px: number; py: number } | null {
  const m = patchId.match(PATCH_COORD_PATTERN);
  if (!m) return null;
  return { px: Number(m[1]), py: Number(m[2]) };
}

export interface DerivedExtent {
  wsiWidth: number;
  wsiHeight: number;
  patchSize: number;
}

/**
 * Estimate WSI extent from the maximum patch right/bottom edge.
 * Real WSI usually extends further, so we add a small buffer to avoid
 * missing clicks on patches at the very edge.
 */
export function deriveWsiExtent(
  patches: { px: number; py: number }[],
  patchSize: number = DEFAULT_PATCH_SIZE,
  bufferRatio = 0.02,
): DerivedExtent {
  if (patches.length === 0) {
    return {
      wsiWidth: patchSize,
      wsiHeight: patchSize,
      patchSize,
    };
  }
  let maxRight = 0;
  let maxBottom = 0;
  for (const p of patches) {
    maxRight = Math.max(maxRight, p.px + patchSize);
    maxBottom = Math.max(maxBottom, p.py + patchSize);
  }
  const buffer = Math.round(Math.max(maxRight, maxBottom) * bufferRatio);
  return {
    wsiWidth: maxRight + buffer,
    wsiHeight: maxBottom + buffer,
    patchSize,
  };
}
