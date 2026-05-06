"use client";

import { useEffect } from "react";
import { useOsdViewer } from "./ViewerContext";
import { useViewerStore } from "@/lib/store";
import type { PatchEntry } from "@/types/case";

function makeSelectionFrame(): HTMLDivElement {
  const div = document.createElement("div");
  div.style.boxSizing = "border-box";
  div.style.width = "100%";
  div.style.height = "100%";
  div.style.border = "2px solid #ff3b30";
  div.style.boxShadow =
    "0 0 0 1px rgba(0,0,0,0.4), 0 0 12px rgba(255,59,48,0.6)";
  div.style.pointerEvents = "none";
  div.style.borderRadius = "2px";
  return div;
}

function makeLocalRoiFrame(): HTMLDivElement {
  const div = document.createElement("div");
  div.style.boxSizing = "border-box";
  div.style.width = "100%";
  div.style.height = "100%";
  div.style.border = "2px dashed rgba(56,189,248,0.95)";
  div.style.boxShadow =
    "0 0 0 1px rgba(0,0,0,0.35), inset 0 0 20px rgba(56,189,248,0.12)";
  div.style.pointerEvents = "none";
  div.style.borderRadius = "2px";
  div.style.background = "rgba(56,189,248,0.06)";
  return div;
}

/** Left WSI: selected patch frame + local ROI overlay (no bucket tint blocks). */
export function PatchOverlay() {
  const { viewer } = useOsdViewer();
  const manifest = useViewerStore((s) => s.manifest);
  const selectedPatchId = useViewerStore((s) => s.selectedPatchId);
  const localRoi = useViewerStore((s) => s.localRoi);

  useEffect(() => {
    if (!viewer || !manifest) return;

    const meta = manifest.wsiMeta;

    const refresh = () => {
      if (viewer.world.getItemCount() === 0) return;
      viewer.clearOverlays();

      if (localRoi) {
        const r = localRoi.world;
        const ix = r.x * meta.thumbScaleX;
        const iy = r.y * meta.thumbScaleY;
        const iw = r.w * meta.thumbScaleX;
        const ih = r.h * meta.thumbScaleY;
        const roiRect = viewer.viewport.imageToViewportRectangle(ix, iy, iw, ih);
        viewer.addOverlay({
          element: makeLocalRoiFrame(),
          location: roiRect,
        });
      }

      if (selectedPatchId) {
        const sel = manifest.patches.find(
          (p) => p.patchId === selectedPatchId,
        ) as PatchEntry | undefined;
        if (sel) {
          const ix = sel.px * meta.thumbScaleX;
          const iy = sel.py * meta.thumbScaleY;
          const iw = sel.width * meta.thumbScaleX;
          const ih = sel.height * meta.thumbScaleY;
          const rect = viewer.viewport.imageToViewportRectangle(ix, iy, iw, ih);
          viewer.addOverlay({
            element: makeSelectionFrame(),
            location: rect,
          });
        }
      }
    };

    viewer.addHandler("open", refresh);
    refresh();

    return () => {
      viewer.removeHandler("open", refresh);
      try {
        viewer.clearOverlays();
      } catch {
        /* viewer may be destroyed */
      }
    };
  }, [viewer, manifest, selectedPatchId, localRoi]);

  return null;
}
