"use client";

import { useEffect } from "react";
import { useOsdViewer } from "./ViewerContext";
import { useViewerStore } from "@/lib/store";
import { buildKdeTpsHeatmapCanvas } from "@/lib/kdeTpsHeatmap";

/** 右侧：整幅 WSI 上叠加连续 KDE 热力（非 patch 色块） */
export function TpsHeatmapOverlay() {
  const { heatmapViewer } = useOsdViewer();
  const manifest = useViewerStore((s) => s.manifest);

  useEffect(() => {
    if (!heatmapViewer || !manifest) return;

    const meta = manifest.wsiMeta;
    const tw = meta.thumbnailWidth;
    const th = meta.thumbnailHeight;

    const applyOverlay = () => {
      if (heatmapViewer.world.getItemCount() === 0) return;
      try {
        heatmapViewer.clearOverlays();
      } catch {
        return;
      }

      if (tw <= 0 || th <= 0 || manifest.patches.length === 0) return;

      const canvas = buildKdeTpsHeatmapCanvas(manifest);

      const rect = heatmapViewer.viewport.imageToViewportRectangle(0, 0, tw, th);
      heatmapViewer.addOverlay({
        element: canvas,
        location: rect,
      });
    };

    heatmapViewer.addHandler("open", applyOverlay);
    applyOverlay();

    return () => {
      heatmapViewer.removeHandler("open", applyOverlay);
      try {
        heatmapViewer.clearOverlays();
      } catch {
        /* destroyed */
      }
    };
  }, [heatmapViewer, manifest]);

  return null;
}
