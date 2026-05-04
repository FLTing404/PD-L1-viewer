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

/** 仅左侧主图：当前选中 patch 高亮框（不绘制 bucket 色块） */
export function PatchOverlay() {
  const { viewer } = useOsdViewer();
  const manifest = useViewerStore((s) => s.manifest);
  const selectedPatchId = useViewerStore((s) => s.selectedPatchId);

  useEffect(() => {
    if (!viewer || !manifest) return;

    const meta = manifest.wsiMeta;

    const refresh = () => {
      if (viewer.world.getItemCount() === 0) return;
      viewer.clearOverlays();

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
  }, [viewer, manifest, selectedPatchId]);

  return null;
}
