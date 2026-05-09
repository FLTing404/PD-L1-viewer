"use client";

import { useEffect, useRef, useState } from "react";
import type OpenSeadragonNS from "openseadragon";
import { ViewerContext } from "./ViewerContext";
import { PatchOverlay } from "./PatchOverlay";
import { LocalRoiSelector, LocalRoiToolbar } from "./LocalRoiSelector";
import { NavigationOverview } from "@/components/side/left/NavigationOverview";
import { RoiSummaryPopup } from "./RoiSummaryPopup";
import { TpsHeatmapOverlay } from "./TpsHeatmapOverlay";
import { useViewerStore } from "@/lib/store";
import { toOsdTileSource } from "./osdTileSource";

const OSD_OPTIONS_BASE: Partial<OpenSeadragonNS.Options> = {
  showNavigationControl: false,
  visibilityRatio: 0.6,
  constrainDuringPan: true,
  homeFillsViewer: false,
  immediateRender: true,
  crossOriginPolicy: "Anonymous",
  maxZoomPixelRatio: 16,
  minZoomImageRatio: 0.6,
  zoomPerClick: 1,
  zoomPerScroll: 1.25,
  springStiffness: 18,
  animationTime: 0.12,
  gestureSettingsMouse: {
    clickToZoom: false,
    dblClickToZoom: true,
    flickEnabled: true,
    scrollToZoom: true,
  },
  gestureSettingsTouch: {
    clickToZoom: false,
    dblClickToZoom: true,
  },
  gestureSettingsPen: {
    clickToZoom: false,
  },
};

export function MainViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  /** Skip redundant viewport.resize — sub-pixel layout churn caused visible flashes on patch change. */
  const lastViewportPxRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const leftViewerRef = useRef<OpenSeadragonNS.Viewer | null>(null);

  const [leftViewer, setLeftViewer] = useState<OpenSeadragonNS.Viewer | null>(
    null,
  );

  /** Set when OSD loads (dynamic import); avoids static `openseadragon` import on the server. */
  const osdLibRef = useRef<typeof OpenSeadragonNS | null>(null);

  const manifest = useViewerStore((s) => s.manifest);
  const manifestStatus = useViewerStore((s) => s.manifestStatus);
  const tileSource = manifest?.tileSource;
  const setOsdViewer = useViewerStore((s) => s.setOsdViewer);

  /** Left sidebar is not under ViewerContext; minimap reads viewer from the store. */
  useEffect(() => {
    setOsdViewer(leftViewer);
    return () => setOsdViewer(null);
  }, [leftViewer, setOsdViewer]);

  useEffect(() => {
    let cancelled = false;
    let vLeft: OpenSeadragonNS.Viewer | null = null;

    (async () => {
      const OpenSeadragon = (await import("openseadragon")).default;
      if (cancelled || !leftRef.current) return;

      osdLibRef.current = OpenSeadragon;

      vLeft = OpenSeadragon({
        element: leftRef.current,
        ...OSD_OPTIONS_BASE,
        showNavigator: false,
      });

      leftViewerRef.current = vLeft;
      setLeftViewer(vLeft);
    })();

    return () => {
      cancelled = true;
      if (vLeft) {
        try {
          vLeft.destroy();
        } catch {
          /* best-effort */
        }
      }
      leftViewerRef.current = null;
      osdLibRef.current = null;
      setLeftViewer(null);
    };
  }, []);

  useEffect(() => {
    if (!leftViewer || !tileSource) return;
    const ts = toOsdTileSource(tileSource);
    try {
      /* Pass the tile source directly (not `{ tileSource }`). OSD typings omit some valid specifiers. */
      leftViewer.open(ts as never);
      requestAnimationFrame(() => {
        try {
          const OSD = osdLibRef.current;
          if (!OSD) return;
          const lw = leftRef.current?.clientWidth ?? 0;
          const lh = leftRef.current?.clientHeight ?? 0;
          if (lw > 0 && lh > 0) {
            const last = lastViewportPxRef.current;
            if (
              Math.abs(lw - last.w) >= 2 ||
              Math.abs(lh - last.h) >= 2
            ) {
              lastViewportPxRef.current = { w: lw, h: lh };
              leftViewer.viewport.resize(new OSD.Point(lw, lh), false);
            }
          }
        } catch {
          /* ignore */
        }
      });
    } catch (err) {
      console.error("[MainViewer] failed to open tile source", err);
    }
  }, [leftViewer, tileSource]);

  useEffect(() => {
    if (!leftViewer || !containerRef.current) return;
    const el = containerRef.current;
    const syncSize = () => {
      try {
        const OSD = osdLibRef.current;
        if (!OSD) return;
        const lw = leftRef.current?.clientWidth ?? 0;
        const lh = leftRef.current?.clientHeight ?? 0;
        if (lw > 0 && lh > 0) {
          const last = lastViewportPxRef.current;
          if (
            Math.abs(lw - last.w) < 2 &&
            Math.abs(lh - last.h) < 2
          ) {
            return;
          }
          lastViewportPxRef.current = { w: lw, h: lh };
          leftViewer.viewport.resize(new OSD.Point(lw, lh), false);
        }
      } catch {
        /* ignore */
      }
    };
    syncSize();
    const ro = new ResizeObserver(() => syncSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [leftViewer]);

  useEffect(() => {
    const viewer = leftViewer;
    if (!viewer) return;
    const handler = (event: OpenSeadragonNS.CanvasClickEvent) => {
      if (!event.quick) return;
      const state = useViewerStore.getState();
      if (state.localRoiDrawMode) return;
      const m = state.manifest;
      if (!m) return;
      const imagePt = viewer.viewport.viewerElementToImageCoordinates(
        event.position,
      );
      const wx = imagePt.x / m.wsiMeta.thumbScaleX;
      const wy = imagePt.y / m.wsiMeta.thumbScaleY;
      const hit =
        m.patches.find(
          (p) =>
            wx >= p.px &&
            wx < p.px + p.width &&
            wy >= p.py &&
            wy < p.py + p.height,
        ) ?? null;
      void state.setSelectedPatch(hit ? hit.patchId : null);
    };
    viewer.addHandler("canvas-click", handler);
    return () => {
      viewer.removeHandler("canvas-click", handler);
    };
  }, [leftViewer]);

  const pendingFlyToPatchId = useViewerStore((s) => s.pendingFlyToPatchId);
  const clearPendingFlyTo = useViewerStore((s) => s.clearPendingFlyTo);
  useEffect(() => {
    const viewer = leftViewer;
    if (!viewer || !manifest || !pendingFlyToPatchId) return;
    const patch = manifest.patches.find(
      (p) => p.patchId === pendingFlyToPatchId,
    );
    if (!patch) {
      clearPendingFlyTo();
      return;
    }
    const meta = manifest.wsiMeta;
    const ix = patch.px * meta.thumbScaleX;
    const iy = patch.py * meta.thumbScaleY;
    const iw = patch.width * meta.thumbScaleX;
    const ih = patch.height * meta.thumbScaleY;
    const padX = iw * 1.5;
    const padY = ih * 1.5;
    const fitWhenReady = () => {
      try {
        const rect = viewer.viewport.imageToViewportRectangle(
          ix - padX,
          iy - padY,
          iw + padX * 2,
          ih + padY * 2,
        );
        viewer.viewport.fitBoundsWithConstraints(rect, false);
      } catch (err) {
        console.warn("[MainViewer] flyTo failed", err);
      }
      clearPendingFlyTo();
    };
    if (viewer.world.getItemCount() > 0) {
      fitWhenReady();
    } else {
      const onOpen = () => {
        viewer.removeHandler("open", onOpen);
        fitWhenReady();
      };
      viewer.addHandler("open", onOpen);
    }
  }, [leftViewer, manifest, pendingFlyToPatchId, clearPendingFlyTo]);

  const isLoading = manifestStatus === "loading";
  const isError = manifestStatus === "error";
  const isEmpty = !manifest && manifestStatus === "ready";
  const ready = Boolean(leftViewer);

  return (
    <ViewerContext.Provider
      value={{
        viewer: leftViewer,
        ready,
      }}
    >
      <div
        ref={containerRef}
        className="relative flex min-h-0 min-w-0 w-full flex-1 overflow-hidden bg-zinc-950"
      >
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
            <span className="rounded bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white/90 backdrop-blur-sm">
              WSI
            </span>
            <LocalRoiToolbar />
          </div>
          <RoiSummaryPopup />
          <div ref={leftRef} className="absolute inset-0" />
          <PatchOverlay />
          <LocalRoiSelector />
          <TpsHeatmapOverlay />
          {manifest && manifestStatus === "ready" ? (
            <div className="pointer-events-auto absolute bottom-3 left-3 z-[25] w-[min(240px,calc(100%-1.5rem))] max-w-[280px] rounded-md bg-black/55 p-1 shadow-lg shadow-black/40 backdrop-blur-md ring-1 ring-white/10">
              <NavigationOverview floating />
            </div>
          ) : null}
        </div>

        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/70">
            Loading case…
          </div>
        )}
        {isError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-red-400">
            Failed to load case. Check the code/data directory and API routes.
          </div>
        )}
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/60">
            No manifest data.
          </div>
        )}
      </div>
    </ViewerContext.Provider>
  );
}
