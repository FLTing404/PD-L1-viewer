import type { PatchEntry } from "@/types/case";

/** Level-0 WSI top-left pixel coordinates for the patch (matches patch id `_x…_y…`). */
export function formatPatchOriginXY(
  p: Pick<PatchEntry, "px" | "py">,
): string {
  return `x=${p.px}, y=${p.py}`;
}
