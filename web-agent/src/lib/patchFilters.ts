import type { PatchEntry } from "@/types/case";

/**
 * Patches that contribute to TPS aggregates and visualizations.
 * Zero-cell (e.g. blank/white) tiles are excluded from histogram, Hilbert trace,
 * gallery, mean TPS, KDE overlays, etc.
 */
export function patchesWithCellsForTps(patches: PatchEntry[]): PatchEntry[] {
  return patches.filter((p) => p.numCells > 0);
}
