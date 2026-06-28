"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useOsdViewer } from "./ViewerContext";
import { makeRoiRegionFrame, makePatchSeverityFrame } from "./viewerRegionFrame";
import { BUCKET_STYLES } from "@/lib/bucket";
import { useViewerStore, getEffectiveBucket } from "@/lib/store";
import type { PatchEntry } from "@/types/case";

/** WSI: dashed ROI + thin solid bucket-coloured frame on selected / worst-in-ROI patch. */
export function PatchOverlay() {
  const { viewer } = useOsdViewer();
  const manifest = useViewerStore((s) => s.manifest);
  const selectedPatchId = useViewerStore((s) => s.selectedPatchId);
  const localRoi = useViewerStore((s) => s.localRoi);
  const bucketOverrides = useViewerStore((s) => s.bucketOverrides);
  const ownOverlaysRef = useRef<HTMLElement[]>([]);

  /** Avoid re-subscribing OSD handlers on every patch click (was causing full viewer flash). */
  const selectedPatchIdRef = useRef(selectedPatchId);
  const localRoiRef = useRef(localRoi);
  const bucketOverridesRef = useRef(bucketOverrides);
  selectedPatchIdRef.current = selectedPatchId;
  localRoiRef.current = localRoi;
  bucketOverridesRef.current = bucketOverrides;

  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!viewer || !manifest) return;

    const meta = manifest.wsiMeta;

    const removeOwnOverlays = () => {
      for (const el of ownOverlaysRef.current) {
        try {
          viewer.removeOverlay(el);
        } catch {
          /* ignore */
        }
      }
      ownOverlaysRef.current = [];
    };

    const refresh = () => {
      removeOwnOverlays();
      if (viewer.world.getItemCount() === 0) return;

      const next: HTMLElement[] = [];
      const roi = localRoiRef.current;
      const sid = selectedPatchIdRef.current;

      if (roi) {
        const r = roi.world;
        const ix = r.x * meta.thumbScaleX;
        const iy = r.y * meta.thumbScaleY;
        const iw = r.w * meta.thumbScaleX;
        const ih = r.h * meta.thumbScaleY;
        const roiRect = viewer.viewport.imageToViewportRectangle(ix, iy, iw, ih);
        const el = makeRoiRegionFrame();
        viewer.addOverlay({
          element: el,
          location: roiRect,
        });
        next.push(el);
      }

      if (sid) {
        const sel = manifest.patches.find(
          (p) => p.patchId === sid,
        ) as PatchEntry | undefined;
        if (sel) {
          const ix = sel.px * meta.thumbScaleX;
          const iy = sel.py * meta.thumbScaleY;
          const iw = sel.width * meta.thumbScaleX;
          const ih = sel.height * meta.thumbScaleY;
          const rect = viewer.viewport.imageToViewportRectangle(ix, iy, iw, ih);
          const bucket = getEffectiveBucket(sel, bucketOverridesRef.current);
          const hex = BUCKET_STYLES[bucket].hex;
          const el = makePatchSeverityFrame(hex);
          viewer.addOverlay({
            element: el,
            location: rect,
          });
          next.push(el);
        }
      }

      ownOverlaysRef.current = next;
    };

    refreshRef.current = refresh;

    viewer.addHandler("open", refresh);
    refresh();

    return () => {
      refreshRef.current = null;
      viewer.removeHandler("open", refresh);
      removeOwnOverlays();
    };
  }, [viewer, manifest]);

  useLayoutEffect(() => {
    refreshRef.current?.();
  }, [selectedPatchId, localRoi, bucketOverrides]);

  return null;
}
