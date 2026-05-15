"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useViewerStore,
  computeCellStats,
  computeWsiStats,
  selectSelectedPatch,
  type PanelLayer,
} from "@/lib/store";
import { BUCKET_STYLES } from "@/lib/bucket";
import { patchBucketFromPredTps } from "@/lib/tpsHistogram";
import type { PatchEntry } from "@/types/case";
import { formatPatchOriginXY } from "@/lib/patchDisplay";
import { patchPreviewFileUrlFromEntry } from "@/lib/patchPreviewUrl";
import { cn } from "@/lib/utils";
import { formatTpsPercentDigits } from "@/lib/formatTpsPercent";

interface ZoomState {
  zoom: number;
  panX: number;
  panY: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const IDENTITY: ZoomState = { zoom: 1, panX: 0, panY: 0 };

const OSD_CORNER_LABEL =
  "pointer-events-none absolute left-2 top-2 z-10 bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white/90 backdrop-blur-sm";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function clampPan(zoom: number, panX: number, panY: number): ZoomState {
  const max = zoom - 1;
  return {
    zoom,
    panX: clamp(panX, -max, 0),
    panY: clamp(panY, -max, 0),
  };
}

/** Selected-patch metrics: dense dashboard layout that expands to fill the card. */
function PatchCellStatsInline({ className }: { className?: string }) {
  const manifest = useViewerStore((s) => s.manifest);
  const cells = useViewerStore((s) => s.cells);
  const cellsStatus = useViewerStore((s) => s.cellsStatus);
  const patch = useViewerStore(selectSelectedPatch);
  const threshold = useViewerStore((s) => s.threshold);
  const stats = computeCellStats(cells, threshold);

  const wsiStats = useMemo(() => computeWsiStats(manifest), [manifest]);
  const wsiDen = wsiStats.totalCells;

  const predTps = patch ? clamp(patch.patchPredTps, 0, 1) : 0;
  const bucket = patch ? patchBucketFromPredTps(patch.patchPredTps) : null;
  const bucketStyle = bucket ? BUCKET_STYLES[bucket] : null;
  const bucketLabel = bucketStyle?.fullLabel ?? "—";

  const mixTotal = Math.max(1, stats.positive + stats.negative);
  const mixPosPct = (stats.positive / mixTotal) * 100;
  const mixNegPct = (stats.negative / mixTotal) * 100;

  if (cellsStatus === "loading") {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden overflow-x-hidden py-0.5",
          className,
        )}
      >
        <Skeleton className="h-24 w-full shrink-0 rounded-lg" />
        <Skeleton className="h-14 w-full shrink-0 rounded-lg" />
        <Skeleton className="h-14 w-full shrink-0 rounded-lg" />
      </div>
    );
  }

  if (cellsStatus === "error") {
    return (
      <p className="shrink-0 text-xs text-destructive">
        Failed to load cell-level results.
      </p>
    );
  }

  const predPct = predTps * 100;

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-hidden overflow-x-hidden py-0.5",
        className,
      )}
    >
      {/* Bucket → Total cells → Pred TPS (bar only on Pred TPS) */}
      <section className="flex shrink-0 flex-col gap-1.5 rounded-lg border border-border/60 bg-gradient-to-b from-muted/45 to-muted/20 px-2.5 py-1.5 shadow-sm dark:from-muted/20 dark:to-muted/10">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            patch_pred_bucket
          </span>
          <div className="flex min-w-0 items-center">
            {patch && bucketStyle ? (
              <span
                className={cn(
                  "inline-flex max-w-full truncate rounded px-2 py-0.5 text-[12px] font-semibold leading-tight ring-1",
                  bucketStyle.badgeBg,
                  bucketStyle.badgeText,
                  bucketStyle.badgeRing,
                )}
              >
                {bucketLabel}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div className="border-t border-border/45 pt-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Total cells (patch / WSI)
          </span>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0 font-mono tabular-nums leading-tight">
            <span className="text-[15px] font-semibold leading-none text-foreground">
              {stats.total.toLocaleString()}
            </span>
            <span className="text-[13px] text-muted-foreground">/</span>
            <span className="text-[13px] text-muted-foreground">
              {wsiDen > 0 ? wsiDen.toLocaleString() : "—"}
            </span>
          </div>
        </div>

        <div className="border-t border-border/45 pt-1.5">
          <div className="flex min-w-0 items-end justify-between gap-2">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Pred TPS
            </span>
            <span className="min-w-0 truncate font-mono text-lg font-semibold tabular-nums leading-none tracking-tight text-foreground">
              {patch ? `${formatTpsPercentDigits(predTps)}%` : "—"}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-muted/40">
            <div
              className="h-full rounded-full bg-primary/90 transition-[width] dark:bg-primary/85"
              style={{ width: `${Math.min(100, predPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Cell mix */}
      <section className="flex shrink-0 flex-col gap-1 rounded-lg border border-border/50 bg-card/80 px-2.5 py-1.5 dark:bg-card/50">
        <div className="flex min-w-0 items-baseline justify-between gap-1">
          <span className="min-w-0 shrink text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Cell mix (+ / −)
          </span>
          <span className="shrink-0 font-mono text-[12px] tabular-nums leading-tight text-foreground sm:text-[13px]">
            <span className="text-[#b85a5a] dark:text-red-300/90">
              +{stats.positive.toLocaleString()}
            </span>
            <span className="mx-0.5 text-muted-foreground">/</span>
            <span className="text-[#5e7ea8] dark:text-sky-300/85">
              −{stats.negative.toLocaleString()}
            </span>
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/45 dark:bg-muted/30">
          <div
            className="min-w-0 bg-[#b85a5a] dark:bg-[#c47066]"
            style={{ width: `${mixPosPct}%` }}
          />
          <div
            className="min-w-0 bg-[#5e7ea8] dark:bg-[#6b8ab8]"
            style={{ width: `${mixNegPct}%` }}
          />
        </div>
      </section>
    </div>
  );
}

function PatchLayerZoomPreviewFixed({
  caseId,
  patch,
  layer,
  label,
  seam,
  transform,
  setTransform,
  objectFit = "contain",
  hideChromeBorder = false,
}: {
  caseId: string;
  patch: PatchEntry;
  layer: PanelLayer;
  label: string;
  /** Top row: L/R/T + bottom seam; bottom row: L/R/B only (single 1px line between modules). */
  seam: "top" | "bottom";
  transform: ZoomState;
  setTransform: React.Dispatch<React.SetStateAction<ZoomState>>;
  /** `cover` fills the preview cell (no side pillarboxing on wide sidebars); `contain` preserves full image. */
  objectFit?: "contain" | "cover";
  /** Square rail tiles: no inner gray frame — divider lives on parent stack. */
  hideChromeBorder?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const previewUrl = patchPreviewFileUrlFromEntry(caseId, patch, layer);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;
      setTransform((prev) => {
        const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        const newZoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        if (newZoom === prev.zoom) return prev;
        const ratio = newZoom / prev.zoom;
        const newPanX = cx - (cx - prev.panX) * ratio;
        const newPanY = cy - (cy - prev.panY) * ratio;
        return clampPan(newZoom, newPanX, newPanY);
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setTransform]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (transform.zoom <= 1) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = transform.panX;
    const startPanY = transform.panY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const handleMove = (ev: PointerEvent) => {
      const dxN = (ev.clientX - startX) / rect.width;
      const dyN = (ev.clientY - startY) / rect.height;
      setTransform((prev) =>
        clampPan(prev.zoom, startPanX + dxN, startPanY + dyN),
      );
    };
    const handleUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative box-border h-full min-h-0 w-full min-w-0 overflow-hidden rounded-none bg-zinc-950 touch-none",
        !hideChromeBorder &&
          (seam === "top"
            ? "border border-[#2d2d2d]"
            : "border-b border-l border-r border-[#2d2d2d]"),
        transform.zoom > 1
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-zoom-in",
      )}
      onPointerDown={onPointerDown}
      onDoubleClick={() => setTransform(IDENTITY)}
    >
      <span className={cn(OSD_CORNER_LABEL)}>{label}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={previewUrl}
        src={previewUrl}
        alt=""
        className={cn(
          "block h-full w-full select-none",
          objectFit === "cover" ? "object-cover" : "object-contain",
        )}
        loading="lazy"
        draggable={false}
        style={{
          transform: `translate(${transform.panX * 100}%, ${transform.panY * 100}%) scale(${transform.zoom})`,
          transformOrigin: "top left",
          willChange: "transform",
          imageRendering: transform.zoom >= 4 ? "pixelated" : "auto",
        }}
      />
    </div>
  );
}

/**
 * Right column preview band: two stacked squares (side = band height / 2), aligned with
 * the WSI row top/bottom; object-cover fills each square with no inner letterboxing.
 */
export function SelectedPatchPreviewBand({
  tileSizePx,
}: {
  /** Half of preview-band height (parent ResizeObserver); squares are tile × tile. */
  tileSizePx: number | null;
}) {
  const caseId = useViewerStore((s) => s.caseId);
  const patch = useViewerStore(selectSelectedPatch);
  const [patchViewTransform, setPatchViewTransform] =
    useState<ZoomState>(IDENTITY);

  const useSquareRail =
    Boolean(patch && caseId && tileSizePx != null && tileSizePx > 0);

  const previewRows =
    patch &&
    caseId &&
    (useSquareRail ? (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-start overflow-hidden bg-zinc-950/30">
        <div
          className="flex shrink-0 flex-col divide-y divide-[#2d2d2d]/50 overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          style={{
            width: tileSizePx!,
            height: tileSizePx! * 2,
          }}
        >
          <div
            className="relative min-h-0 min-w-0 shrink-0 overflow-hidden"
            style={{ width: tileSizePx!, height: tileSizePx! }}
          >
            <PatchLayerZoomPreviewFixed
              caseId={caseId}
              patch={patch}
              layer="cell_class"
              label="Cell labels"
              seam="top"
              transform={patchViewTransform}
              setTransform={setPatchViewTransform}
              objectFit="cover"
              hideChromeBorder
            />
          </div>
          <div
            className="relative min-h-0 min-w-0 shrink-0 overflow-hidden"
            style={{ width: tileSizePx!, height: tileSizePx! }}
          >
            <PatchLayerZoomPreviewFixed
              caseId={caseId}
              patch={patch}
              layer="heatmap_overlay"
              label="P(cell) map"
              seam="bottom"
              transform={patchViewTransform}
              setTransform={setPatchViewTransform}
              objectFit="cover"
              hideChromeBorder
            />
          </div>
        </div>
      </div>
    ) : (
      <div className="grid h-full min-h-0 w-full min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-0 bg-zinc-950/30">
        <div className="relative min-h-0 min-w-0 overflow-hidden">
          <PatchLayerZoomPreviewFixed
            caseId={caseId}
            patch={patch}
            layer="cell_class"
            label="Cell labels"
            seam="top"
            transform={patchViewTransform}
            setTransform={setPatchViewTransform}
            objectFit="cover"
          />
        </div>
        <div className="relative min-h-0 min-w-0 overflow-hidden">
          <PatchLayerZoomPreviewFixed
            caseId={caseId}
            patch={patch}
            layer="heatmap_overlay"
            label="P(cell) map"
            seam="bottom"
            transform={patchViewTransform}
            setTransform={setPatchViewTransform}
            objectFit="cover"
          />
        </div>
      </div>
    ));

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-zinc-950/30">
      {!caseId || !patch ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-3 text-center text-xs text-muted-foreground">
          Select a patch from the gallery or click on the WSI.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">{previewRows}</div>
      )}
    </div>
  );
}

/** Bottom row: Selected Patch title + metrics (same flex height as TPS strip). */
export function SelectedPatchDetailCard() {
  const caseId = useViewerStore((s) => s.caseId);
  const patch = useViewerStore(selectSelectedPatch);
  const setSelectedPatch = useViewerStore((s) => s.setSelectedPatch);

  return (
    <div className="flex h-full min-h-0 flex-col gap-0 overflow-hidden bg-card py-1.5">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden px-2.5 pb-2 pt-1.5 sm:px-2.5">
        {!caseId || !patch ? (
          <div className="flex min-h-0 flex-1 items-center justify-center border border-dashed border-[#2d2d2d] px-3 py-6 text-center text-xs text-muted-foreground">
            Selection details appear here after you choose a patch.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/45 pb-1.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Selected patch
                </span>
                <span className="font-mono text-[13px] tabular-nums leading-snug text-muted-foreground">
                  {formatPatchOriginXY(patch)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void setSelectedPatch(null)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Clear selection"
              >
                <X className="size-4" />
              </button>
            </div>
            <PatchCellStatsInline className="min-h-0 flex-1" />
          </div>
        )}
      </CardContent>
    </div>
  );
}
