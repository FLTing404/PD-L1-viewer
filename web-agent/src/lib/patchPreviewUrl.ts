import type { PanelLayer } from "@/lib/store";
import type { PatchEntry } from "@/types/case";

/** On-disk names next to `image.jpg` under each patch folder. */
export function patchLayerFileName(layer: PanelLayer): string {
  switch (layer) {
    case "cell_class":
      return "cells_overlay.png";
    case "heatmap_overlay":
      return "heatmap_overlay.png";
    case "center_prob":
      return "center_prob.png";
  }
}

/** Relative path under case dir → `/api/cases/.../file/...` URL (handles nested dirs). */
export function caseFileRelativeUrl(caseId: string, relPath: string): string {
  const segs = relPath.replace(/\\/g, "/").split("/").filter(Boolean);
  return `/api/cases/${encodeURIComponent(caseId)}/file/${segs.map(encodeURIComponent).join("/")}`;
}

/**
 * Uses manifest `image_file` dirname so overlays work when folder names differ from `patch_id`
 * (e.g. `patch_x0_y0` vs long IDs).
 */
export function patchPreviewFileUrlFromEntry(
  caseId: string,
  patch: Pick<PatchEntry, "imageFile">,
  layer: PanelLayer,
): string {
  const norm = patch.imageFile.replace(/\\/g, "/");
  const dir = norm.includes("/") ? norm.slice(0, norm.lastIndexOf("/")) : "";
  const file = patchLayerFileName(layer);
  const rel = dir ? `${dir}/${file}` : file;
  return caseFileRelativeUrl(caseId, rel);
}

/** Fallback when only `patch_id` is known (folder equals `patches/<patchId>/`). */
export function patchPreviewFileUrl(
  caseId: string,
  patchId: string,
  layer: PanelLayer,
): string {
  const file = patchLayerFileName(layer);
  return caseFileRelativeUrl(caseId, `patches/${patchId}/${file}`);
}
