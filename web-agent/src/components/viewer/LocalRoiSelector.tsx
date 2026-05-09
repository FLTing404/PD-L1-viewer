"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type OpenSeadragonNS from "openseadragon";
import { Flame, SquareDashed } from "lucide-react";
import { useOsdViewer } from "./ViewerContext";
import { VIEWER_REGION_FRAME_BOX_CLASS } from "./viewerRegionFrame";
import { useViewerStore } from "@/lib/store";
import {
  computeLocalSelectionFromUserRect,
  getHighestTpsPatchInRect,
  imageDragToWorldRect,
} from "@/lib/localRoiStats";
import { cn } from "@/lib/utils";

const MIN_DRAG_IMG_PX = 6;

type OsdModule = typeof OpenSeadragonNS;
let osdLoadPromise: Promise<OsdModule> | null = null;
function loadOsd(): Promise<OsdModule> {
  if (!osdLoadPromise) {
    osdLoadPromise = import("openseadragon").then(
      (m) => (m as { default: OsdModule }).default,
    );
  }
  return osdLoadPromise;
}

async function clientToImage(
  viewer: OpenSeadragonNS.Viewer,
  clientX: number,
  clientY: number,
) {
  const OSD = await loadOsd();
  const rect = viewer.container.getBoundingClientRect();
  const p = new OSD.Point(clientX - rect.left, clientY - rect.top);
  return viewer.viewport.viewerElementToImageCoordinates(p);
}

/** Toolbar toggles next to the WSI label: local ROI draw mode and optional TPS heatmap overlay. */
export function LocalRoiToolbar() {
  const drawMode = useViewerStore((s) => s.localRoiDrawMode);
  const setDrawMode = useViewerStore((s) => s.setLocalRoiDrawMode);
  const manifest = useViewerStore((s) => s.manifest);
  const tpsHeatmapVisible = useViewerStore((s) => s.tpsHeatmapVisible);
  const toggleTpsHeatmap = useViewerStore((s) => s.toggleTpsHeatmap);

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={!manifest}
        title={
          drawMode
            ? "Drag on the image to draw a rectangle; release to snap to patch bounds."
            : "Enable local ROI: drag to draw a rectangle."
        }
        onClick={() => setDrawMode(!drawMode)}
        className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-medium backdrop-blur-sm transition-colors disabled:opacity-40",
          drawMode
            ? "bg-sky-500/90 text-white"
            : "bg-black/55 text-white/90 hover:bg-black/70",
        )}
      >
        <SquareDashed className="size-3.5 shrink-0" aria-hidden />
        ROI
      </button>
      <button
        type="button"
        disabled={!manifest || !manifest.patches.length}
        title={
          tpsHeatmapVisible
            ? "Hide KDE TPS heatmap overlay on the WSI."
            : "Show KDE TPS heatmap overlay on the WSI."
        }
        onClick={() => toggleTpsHeatmap()}
        className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-medium backdrop-blur-sm transition-colors disabled:opacity-40",
          tpsHeatmapVisible
            ? "bg-amber-600/90 text-white"
            : "bg-black/55 text-white/90 hover:bg-black/70",
        )}
      >
        <Flame className="size-3.5 shrink-0" aria-hidden />
        TPS heatmap
      </button>
    </div>
  );
}

export function LocalRoiSelector() {
  const { viewer } = useOsdViewer();
  const drawMode = useViewerStore((s) => s.localRoiDrawMode);
  const setDrawMode = useViewerStore((s) => s.setLocalRoiDrawMode);
  const setLocalRoi = useViewerStore((s) => s.setLocalRoi);
  const setSelectedPatch = useViewerStore((s) => s.setSelectedPatch);
  const manifest = useViewerStore((s) => s.manifest);

  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [rubber, setRubber] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const finishDrag = useCallback(
    async (clientX: number, clientY: number) => {
      if (!viewer || !manifest || !dragStartRef.current) {
        dragStartRef.current = null;
        setRubber(null);
        return;
      }
      const start = dragStartRef.current;
      dragStartRef.current = null;
      setRubber(null);

      const im0 = await clientToImage(viewer, start.x, start.y);
      const im1 = await clientToImage(viewer, clientX, clientY);
      const tx = manifest.wsiMeta.thumbScaleX;
      const ty = manifest.wsiMeta.thumbScaleY;
      if (
        Math.abs(im1.x - im0.x) < MIN_DRAG_IMG_PX ||
        Math.abs(im1.y - im0.y) < MIN_DRAG_IMG_PX
      ) {
        return;
      }

      const userWorld = imageDragToWorldRect(im0.x, im0.y, im1.x, im1.y, tx, ty);
      const result = computeLocalSelectionFromUserRect(manifest, userWorld);
      if (!result) return;
      setLocalRoi({ world: result.snapped, summary: result.summary });
      const top = getHighestTpsPatchInRect(manifest, result.snapped);
      if (top) {
        void setSelectedPatch(top.patchId);
      }
      setDrawMode(false);
    },
    [viewer, manifest, setDrawMode, setLocalRoi, setSelectedPatch],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawMode || !viewer || !manifest || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    const el = overlayRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setRubber({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        w: 0,
        h: 0,
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !overlayRef.current) return;
    const el = overlayRef.current;
    const r = el.getBoundingClientRect();
    const x0 = dragStartRef.current.x - r.left;
    const y0 = dragStartRef.current.y - r.top;
    const x1 = e.clientX - r.left;
    const y1 = e.clientY - r.top;
    setRubber({
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      w: Math.abs(x1 - x0),
      h: Math.abs(y1 - y0),
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      void finishDrag(e.clientX, e.clientY);
    }
  };

  const onPointerCancel = () => {
    dragStartRef.current = null;
    setRubber(null);
  };

  useEffect(() => {
    if (!drawMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dragStartRef.current = null;
        setRubber(null);
        setDrawMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawMode, setDrawMode]);

  if (!drawMode) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-[18] cursor-crosshair touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-10 flex justify-center px-2">
        <span className="rounded bg-black/65 px-2 py-0.5 text-center text-[11px] text-white/90 backdrop-blur-sm">
          Drag a rectangle; on release the ROI snaps to all 512×512 grid cells that
          intersect it (empty areas included).
        </span>
      </div>
      {rubber && rubber.w > 1 && rubber.h > 1 ? (
        <div
          className={cn(
            "pointer-events-none absolute",
            VIEWER_REGION_FRAME_BOX_CLASS,
          )}
          style={{
            left: rubber.x,
            top: rubber.y,
            width: rubber.w,
            height: rubber.h,
          }}
        />
      ) : null}
    </div>
  );
}
