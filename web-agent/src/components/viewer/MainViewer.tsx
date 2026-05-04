"use client";

import { useEffect, useRef, useState } from "react";
import type OpenSeadragonNS from "openseadragon";
import { ViewerContext } from "./ViewerContext";
import { PatchOverlay } from "./PatchOverlay";
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
  const rightRef = useRef<HTMLDivElement | null>(null);
  const navigatorRef = useRef<HTMLDivElement | null>(null);

  const leftViewerRef = useRef<OpenSeadragonNS.Viewer | null>(null);
  const rightViewerRef = useRef<OpenSeadragonNS.Viewer | null>(null);

  const [leftViewer, setLeftViewer] = useState<OpenSeadragonNS.Viewer | null>(
    null,
  );
  const [rightViewer, setRightViewer] = useState<OpenSeadragonNS.Viewer | null>(
    null,
  );

  const ignoreViewportSyncRef = useRef<"left" | "right" | null>(null);

  const manifest = useViewerStore((s) => s.manifest);
  const manifestStatus = useViewerStore((s) => s.manifestStatus);
  const tileSource = manifest?.tileSource;

  useEffect(() => {
    let cancelled = false;
    let vLeft: OpenSeadragonNS.Viewer | null = null;
    let vRight: OpenSeadragonNS.Viewer | null = null;

    (async () => {
      const OpenSeadragon = (await import("openseadragon")).default;
      if (cancelled || !leftRef.current || !rightRef.current) return;

      vLeft = OpenSeadragon({
        element: leftRef.current,
        ...OSD_OPTIONS_BASE,
        showNavigator: true,
        navigatorId: navigatorRef.current?.id,
        navigatorPosition: "BOTTOM_LEFT",
        navigatorAutoFade: false,
        navigatorBackground: "rgba(20,20,20,0.85)",
        navigatorBorderColor: "rgba(255,255,255,0.25)",
        navigatorDisplayRegionColor: "#ef4444",
        navigatorSizeRatio: 0.22,
      });

      vRight = OpenSeadragon({
        element: rightRef.current,
        ...OSD_OPTIONS_BASE,
        showNavigator: false,
      });

      const onLeftViewportChange = () => {
        if (ignoreViewportSyncRef.current === "left") {
          ignoreViewportSyncRef.current = null;
          return;
        }
        ignoreViewportSyncRef.current = "right";
        try {
          vRight!.viewport.fitBounds(vLeft!.viewport.getBounds(), true);
        } catch {
          /* ignore */
        }
      };

      const onRightViewportChange = () => {
        if (ignoreViewportSyncRef.current === "right") {
          ignoreViewportSyncRef.current = null;
          return;
        }
        ignoreViewportSyncRef.current = "left";
        try {
          vLeft!.viewport.fitBounds(vRight!.viewport.getBounds(), true);
        } catch {
          /* ignore */
        }
      };

      vLeft.addHandler("viewport-change", onLeftViewportChange);
      vRight.addHandler("viewport-change", onRightViewportChange);
      /* 与 spring 动画帧同步，减少一侧动画、另一侧仍落后的体感延迟 */
      vLeft.addHandler("animation", onLeftViewportChange);
      vRight.addHandler("animation", onRightViewportChange);

      leftViewerRef.current = vLeft;
      rightViewerRef.current = vRight;
      setLeftViewer(vLeft);
      setRightViewer(vRight);
    })();

    return () => {
      cancelled = true;
      for (const v of [vLeft, vRight]) {
        if (v) {
          try {
            v.destroy();
          } catch {
            /* best-effort */
          }
        }
      }
      leftViewerRef.current = null;
      rightViewerRef.current = null;
      setLeftViewer(null);
      setRightViewer(null);
    };
  }, []);

  const viewersReady = leftViewer && rightViewer;

  useEffect(() => {
    if (!viewersReady || !tileSource) return;
    const ts = toOsdTileSource(tileSource);
    try {
      leftViewer.open({ tileSource: ts });
      rightViewer.open({ tileSource: ts });
      requestAnimationFrame(() => {
        try {
          leftViewer.viewport.resize();
          rightViewer.viewport.resize();
        } catch {
          /* ignore */
        }
      });
    } catch (err) {
      console.error("[MainViewer] failed to open tile source", err);
    }
  }, [viewersReady, tileSource, leftViewer, rightViewer]);

  useEffect(() => {
    if (!leftViewer || !rightViewer || !containerRef.current) return;
    const el = containerRef.current;
    const syncSize = () => {
      try {
        leftViewer.viewport.resize();
        rightViewer.viewport.resize();
      } catch {
        /* ignore */
      }
    };
    syncSize();
    const ro = new ResizeObserver(() => syncSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [leftViewer, rightViewer]);

  useEffect(() => {
    const viewer = leftViewer;
    if (!viewer) return;
    const handler = (event: OpenSeadragonNS.CanvasClickEvent) => {
      if (!event.quick) return;
      const state = useViewerStore.getState();
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
        heatmapViewer: rightViewer,
        ready,
      }}
    >
      <div
        ref={containerRef}
        className="relative flex min-h-0 min-w-0 w-full flex-1 gap-2 overflow-hidden bg-zinc-950"
      >
        <div className="relative min-h-0 min-w-0 flex-1 basis-0 overflow-hidden">
          <div className="absolute left-2 top-2 z-10 rounded bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white/90 backdrop-blur-sm">
            WSI
          </div>
          <div ref={leftRef} className="absolute inset-0" />
          <div
            id="osd-navigator"
            ref={navigatorRef}
            className="pointer-events-auto absolute bottom-3 left-3 z-10 h-[130px] w-[200px] overflow-hidden rounded-md border border-white/15 bg-black/60 shadow-lg backdrop-blur-sm"
          />
          <PatchOverlay />
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 basis-0 overflow-hidden">
          <div className="absolute left-2 top-2 z-10 rounded bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white/90 backdrop-blur-sm">
            TPS spatial heatmap
          </div>
          <div ref={rightRef} className="absolute inset-0" />
          <TpsHeatmapOverlay />
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
