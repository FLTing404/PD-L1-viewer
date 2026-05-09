"use client";

import { useEffect, useRef } from "react";
import { useOsdViewer } from "./ViewerContext";
import { useViewerStore } from "@/lib/store";
import { buildKdeTpsHeatmapCanvas } from "@/lib/kdeTpsHeatmap";

/** Optional KDE TPS heatmap on the main WSI viewer; toggled from the toolbar. */
export function TpsHeatmapOverlay() {
  const { viewer } = useOsdViewer();
  const manifest = useViewerStore((s) => s.manifest);
  const tpsHeatmapVisible = useViewerStore((s) => s.tpsHeatmapVisible);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!viewer || !manifest) return;

    const meta = manifest.wsiMeta;
    const tw = meta.thumbnailWidth;
    const th = meta.thumbnailHeight;

    const removeHeatmapOverlay = () => {
      const el = canvasRef.current;
      if (!el) return;
      try {
        viewer.removeOverlay(el);
      } catch {
        /* overlay may already be gone */
      }
      canvasRef.current = null;
    };

    const applyOverlay = () => {
      removeHeatmapOverlay();

      if (!tpsHeatmapVisible) return;
      if (viewer.world.getItemCount() === 0) return;
      if (tw <= 0 || th <= 0 || manifest.patches.length === 0) return;

      const canvas = buildKdeTpsHeatmapCanvas(manifest);
      canvasRef.current = canvas;

      const rect = viewer.viewport.imageToViewportRectangle(0, 0, tw, th);
      viewer.addOverlay({
        element: canvas,
        location: rect,
      });
    };

    viewer.addHandler("open", applyOverlay);
    applyOverlay();

    return () => {
      viewer.removeHandler("open", applyOverlay);
      removeHeatmapOverlay();
    };
  }, [viewer, manifest, tpsHeatmapVisible]);

  return null;
}
