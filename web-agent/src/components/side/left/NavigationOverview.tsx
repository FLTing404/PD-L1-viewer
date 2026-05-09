"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import { useViewerStore } from "@/lib/store";
import { caseFileRelativeUrl } from "@/lib/patchPreviewUrl";
import { cn } from "@/lib/utils";
import { clientToSlideUv } from "./navigationOverviewCoords";

/** Same accent as ROI bars / local selection (see TpsDistributionBar). */
const ROI_VIEWPORT_STROKE = "#22d3ee";
const ROI_VIEWPORT_FILL = "rgba(34, 211, 238, 0.14)";

/** Thumbnail minimap + live viewport locator; click pans WSI. (TPS KDE is on the main WSI via toolbar, not on this overview.) */
export function NavigationOverview({
  floating = false,
}: {
  /** When true: compact styling for absolute positioning on the WSI (bottom-left). */
  floating?: boolean;
}) {
  const manifest = useViewerStore((s) => s.manifest);
  const caseId = useViewerStore((s) => s.caseId);
  const viewer = useViewerStore((s) => s.osdViewer);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const thumbImgRef = useRef<HTMLImageElement | null>(null);
  const [vp, setVp] = useState({ x: 0, y: 0, w: 0, h: 0 });
  /** Authoritative slide pixel size from OpenSeadragon (matches pan/zoom space). */
  const [contentSize, setContentSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  const tw = manifest?.wsiMeta.thumbnailWidth ?? 0;
  const th = manifest?.wsiMeta.thumbnailHeight ?? 0;
  const thumbRel = manifest?.wsiSummary.thumbnailFile ?? "thumbnail.png";
  const thumbUrl =
    caseId && tw > 0
      ? caseFileRelativeUrl(caseId, thumbRel)
      : "";

  const iw = contentSize.w > 0 ? contentSize.w : tw;
  const ih = contentSize.h > 0 ? contentSize.h : th;

  useEffect(() => {
    if (!viewer || !manifest || tw <= 0 || th <= 0) return;

    const tick = () => {
      try {
        const item = viewer.world.getItemAt(0) as OpenSeadragon.TiledImage | undefined;
        if (!item) {
          setVp({ x: 0, y: 0, w: 0, h: 0 });
          return;
        }
        const size = item.getContentSize();
        setContentSize({ w: size.x, h: size.y });
        const bounds = viewer.viewport.getBounds();
        const r = item.viewportToImageRectangle(bounds, true);
        setVp({
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
        });
      } catch {
        /* ignore */
      }
    };

    viewer.addHandler("animation", tick);
    viewer.addHandler("resize", tick);
    viewer.addHandler("rotate", tick);
    viewer.addHandler("open", tick);
    viewer.addHandler("viewport-change", tick);
    viewer.addHandler("canvas-drag", tick);
    viewer.addHandler("canvas-drag-end", tick);
    viewer.world.addHandler("add-item", tick);
    tick();

    return () => {
      viewer.removeHandler("animation", tick);
      viewer.removeHandler("resize", tick);
      viewer.removeHandler("rotate", tick);
      viewer.removeHandler("open", tick);
      viewer.removeHandler("viewport-change", tick);
      viewer.removeHandler("canvas-drag", tick);
      viewer.removeHandler("canvas-drag-end", tick);
      viewer.world.removeHandler("add-item", tick);
    };
  }, [viewer, manifest, tw, th]);

  const onMinimapPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!viewer || !manifest || iw <= 0 || ih <= 0) return;
      e.preventDefault();
      e.stopPropagation();
      const container = mapContainerRef.current;
      if (!container) return;

      const item = viewer.world.getItemAt(0) as OpenSeadragon.TiledImage | undefined;
      if (!item) return;

      const { u, v } = clientToSlideUv(
        e.clientX,
        e.clientY,
        container,
        thumbImgRef.current,
      );
      const ix = u * iw;
      const iy = v * ih;

      try {
        const vpPt = item.imageToViewportCoordinates(ix, iy, true);
        viewer.viewport.panTo(vpPt, true);
      } catch {
        /* ignore */
      }
    },
    [viewer, manifest, iw, ih],
  );

  if (!manifest || !caseId) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-border/60 px-2 py-6 text-center text-[11px] text-muted-foreground",
          floating && "border-white/25 bg-black/50 text-white/70",
        )}
      >
        Open a specimen to show Navigation Overview.
      </div>
    );
  }

  const lx = iw > 0 ? (vp.x / iw) * 100 : 0;
  const ly = ih > 0 ? (vp.y / ih) * 100 : 0;
  const lw = iw > 0 ? (vp.w / iw) * 100 : 0;
  const lh = ih > 0 ? (vp.h / ih) * 100 : 0;

  return (
    <div className="space-y-1">
      {!floating ? (
        <div className="text-app-section font-medium uppercase tracking-wider text-muted-foreground">
          Navigation Overview
        </div>
      ) : null}
      <div
        ref={mapContainerRef}
        className={cn(
          "relative w-full cursor-crosshair overflow-hidden rounded-[4px]",
          floating
            ? "bg-black/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
            : "border border-border/55 bg-black/40",
        )}
        style={{
          aspectRatio: iw > 0 && ih > 0 ? `${iw} / ${ih}` : "16 / 9",
        }}
        onPointerDown={onMinimapPointerDown}
        role="presentation"
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={thumbImgRef}
            src={thumbUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        ) : null}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {lw > 0 && lh > 0 ? (
            <rect
              x={lx}
              y={ly}
              width={lw}
              height={lh}
              fill={ROI_VIEWPORT_FILL}
              stroke={ROI_VIEWPORT_STROKE}
              strokeOpacity={0.72}
              strokeWidth={0.45}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      </div>
      {!floating ? (
        <p className="text-[10px] leading-tight text-muted-foreground">
          Viewport Locator (cyan). Click minimap to pan the WSI — overview +
          detail.
        </p>
      ) : null}
    </div>
  );
}
