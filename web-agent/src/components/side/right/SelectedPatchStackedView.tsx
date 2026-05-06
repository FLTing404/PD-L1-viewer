"use client";

import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useViewerStore,
  computeCellStats,
  selectSelectedPatch,
  type PanelLayer,
} from "@/lib/store";
import { formatPatchOriginXY } from "@/lib/patchDisplay";
import { cn } from "@/lib/utils";
import { useHeatmapPaneRef } from "@/components/viewer/HeatmapAlignContext";

interface ZoomState {
  zoom: number;
  panX: number;
  panY: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const IDENTITY: ZoomState = { zoom: 1, panX: 0, panY: 0 };

const POSITIVE_COLOR = "#b85a5a";
const NEGATIVE_COLOR = "#5e7ea8";
/** Ring color for patch.json patch_pred_tps (0–1). */
const PRED_TPS_RING_COLOR = "#e0786e";
const OSD_CORNER_LABEL =
  "pointer-events-none absolute left-2 top-2 z-10 rounded bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white/90 backdrop-blur-sm";

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

interface DonutSegment {
  value: number;
  color: string;
}

/** Donut box size / max side (~20% larger than former 118px). */
const DONUT_BOX_PX = 142;

function Donut({
  segments,
  centerLabel,
  centerSubLabel,
  size,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerSubLabel: string;
  size: number;
}) {
  const stroke = Math.max(8, Math.round((size * 20) / 188));
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  /* Top label / bottom value vertical offsets (e.g. Pred TPS + 21.06%) */
  const mainOffsetY = -Math.round(size * 0.055);
  const subLabelOffsetY = Math.round(size * 0.125);
  const fontPx = "0.75rem";

  const offsets: number[] = [];
  segments.reduce((sum, s) => {
    offsets.push(-sum);
    return sum + (s.value / total) * C;
  }, 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {segments.map((s, i) => {
        const len = (s.value / total) * C;
        if (len <= 0) return null;
        const dash = `${len} ${C - len}`;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={offsets[i]}
            strokeLinecap="round"
          />
        );
      })}
      <g className="rotate-90" style={{ transformOrigin: "center" }}>
        <text
          x={cx}
          y={cy + mainOffsetY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          style={{ fontSize: fontPx }}
        >
          {centerLabel}
        </text>
        <text
          x={cx}
          y={cy + subLabelOffsetY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground font-mono font-semibold"
          style={{ fontSize: fontPx }}
        >
          {centerSubLabel}
        </text>
      </g>
    </svg>
  );
}

function StatLine({
  label,
  value,
  hint,
  dotColor,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  dotColor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs leading-snug">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {dotColor ? (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: dotColor }}
          />
        ) : null}
        {label}
      </span>
      <span className="text-right font-mono tabular-nums">
        <span className="font-semibold text-foreground">{value}</span>
        {hint ? (
          <span className="ml-1 text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </div>
  );
}

/** Inline cell stats for selected patch (text-xs, no separate card title). */
function PatchCellStatsInline({ patchId }: { patchId: string }) {
  const cells = useViewerStore((s) => s.cells);
  const cellsStatus = useViewerStore((s) => s.cellsStatus);
  const threshold = useViewerStore((s) => s.threshold);
  const patch = useViewerStore(selectSelectedPatch);
  const stats = computeCellStats(cells, threshold);

  const donutBoxRef = useRef<HTMLDivElement>(null);
  const [donutSize, setDonutSize] = useState(96);

  useLayoutEffect(() => {
    const el = donutBoxRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const s = Math.floor(Math.min(width, height) * 0.92);
      setDonutSize(Math.max(72, Math.min(s, DONUT_BOX_PX)));
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [patchId, cellsStatus]);

  const predTps = patch ? clamp(patch.patchPredTps, 0, 1) : 0;
  const donutSegments: DonutSegment[] = [
    { value: predTps, color: PRED_TPS_RING_COLOR },
    { value: Math.max(0, 1 - predTps), color: "rgba(255,255,255,0.1)" },
  ];

  const positiveRatioPct = (stats.positiveRatio * 100).toFixed(1);
  const negativeRatioPct = stats.total
    ? ((stats.negative / stats.total) * 100).toFixed(1)
    : "0.0";

  if (cellsStatus === "loading") {
    return (
      <div className="flex shrink-0 items-center gap-3 border-t border-border/40 pt-2">
        <Skeleton
          className="shrink-0 rounded-full"
          style={{ width: DONUT_BOX_PX, height: DONUT_BOX_PX }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    );
  }

  if (cellsStatus === "error") {
    return (
      <p className="shrink-0 border-t border-border/40 pt-2 text-xs text-destructive">
        Failed to load cell-level results.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 shrink-0 flex-row items-center gap-3 border-t border-border/40 pt-2">
      <div
        ref={donutBoxRef}
        className="flex shrink-0 items-center justify-center"
        style={{ width: DONUT_BOX_PX, height: DONUT_BOX_PX }}
      >
        {donutSize > 0 ? (
          <Donut
            size={donutSize}
            segments={donutSegments}
            centerLabel="Pred TPS"
            centerSubLabel={
              patch ? `${(predTps * 100).toFixed(2)}%` : "—"
            }
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <StatLine label="Total Cells" value={stats.total} />
        <StatLine
          dotColor={POSITIVE_COLOR}
          label="Positive"
          value={stats.positive}
          hint={`(${positiveRatioPct}%)`}
        />
        <StatLine
          dotColor={NEGATIVE_COLOR}
          label="Negative"
          value={stats.negative}
          hint={`(${negativeRatioPct}%)`}
        />
      </div>
    </div>
  );
}

function PatchLayerZoomPreviewFixed({
  caseId,
  patchId,
  layer,
  label,
  squareSide,
  transform,
  setTransform,
}: {
  caseId: string;
  patchId: string;
  layer: PanelLayer;
  label: string;
  squareSide: number;
  transform: ZoomState;
  setTransform: React.Dispatch<React.SetStateAction<ZoomState>>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const previewUrl = `/api/cases/${encodeURIComponent(caseId)}/file/preview/by_patch/${encodeURIComponent(patchId)}/${layer}.png`;

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
    <div className="box-border flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-visible">
      <div
        ref={containerRef}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md bg-zinc-950 ring-1 ring-foreground/15 touch-none",
          transform.zoom > 1
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-zoom-in",
        )}
        style={
          squareSide > 0
            ? { width: squareSide, height: squareSide }
            : { width: "100%", aspectRatio: "1", maxHeight: "100%" }
        }
        onPointerDown={onPointerDown}
        onDoubleClick={() => setTransform(IDENTITY)}
      >
        <span className={cn(OSD_CORNER_LABEL)}>{label}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={previewUrl}
          src={previewUrl}
          alt=""
          className="h-full w-full select-none object-contain"
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
    </div>
  );
}

/** Top row of right column: Cell Class + Heatmap; vertically aligned to TPS spatial heatmap pane. */
export function SelectedPatchPreviewBand({
  alignRootRef,
}: {
  alignRootRef: RefObject<HTMLDivElement | null>;
}) {
  const caseId = useViewerStore((s) => s.caseId);
  const patch = useViewerStore(selectSelectedPatch);
  const heatmapPaneRef = useHeatmapPaneRef();
  const stackRef = useRef<HTMLDivElement>(null);
  const [squareSide, setSquareSide] = useState(0);
  const [alignBand, setAlignBand] = useState({ top: 0, height: 0 });
  const [patchViewTransform, setPatchViewTransform] =
    useState<ZoomState>(IDENTITY);

  useEffect(() => {
    setPatchViewTransform(IDENTITY);
  }, [caseId, patch?.patchId]);

  useLayoutEffect(() => {
    const hp = heatmapPaneRef?.current;
    const root = alignRootRef.current;
    if (!patch || !caseId || !hp || !root) {
      setAlignBand({ top: 0, height: 0 });
      return;
    }
    const update = () => {
      const hr = hp.getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      setAlignBand({
        top: Math.max(0, Math.round(hr.top - rr.top)),
        height: Math.max(0, Math.round(hr.height)),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(hp);
    ro.observe(root);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [heatmapPaneRef, alignRootRef, patch, caseId]);

  const alignActive =
    Boolean(heatmapPaneRef) && alignBand.height >= 48 && patch && caseId;

  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const pl = parseFloat(style.paddingLeft) || 0;
      const pr = parseFloat(style.paddingRight) || 0;
      const pt = parseFloat(style.paddingTop) || 0;
      const pb = parseFloat(style.paddingBottom) || 0;
      const gap =
        parseFloat(style.rowGap) ||
        parseFloat(style.columnGap) ||
        parseFloat(style.gap) ||
        0;
      const innerW = el.clientWidth - pl - pr;
      const innerH = el.clientHeight - pt - pb;
      const rowH = Math.max(0, (innerH - gap) / 2);
      const s = Math.max(32, Math.floor(Math.min(innerW, rowH)));
      setSquareSide(s);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [caseId, patch?.patchId, alignBand.height, alignActive]);

  const previewRows = patch && caseId && (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
        <PatchLayerZoomPreviewFixed
          caseId={caseId}
          patchId={patch.patchId}
          layer="cell_class"
          label="Cell Class"
          squareSide={squareSide}
          transform={patchViewTransform}
          setTransform={setPatchViewTransform}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
        <PatchLayerZoomPreviewFixed
          caseId={caseId}
          patchId={patch.patchId}
          layer="heatmap_overlay"
          label="Heatmap"
          squareSide={squareSide}
          transform={patchViewTransform}
          setTransform={setPatchViewTransform}
        />
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-zinc-950/30">
      {!caseId || !patch ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-3 text-center text-xs text-muted-foreground">
          Select a patch from the gallery or click on the WSI.
        </div>
      ) : (
        <>
          {alignActive ? (
            <>
              <div
                style={{ height: alignBand.top }}
                className="w-full shrink-0"
                aria-hidden
              />
              <div
                ref={stackRef}
                style={{ height: alignBand.height }}
                className="flex w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden px-1"
              >
                {previewRows}
              </div>
            </>
          ) : (
            <div
              ref={stackRef}
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden px-1 py-1"
            >
              {previewRows}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Bottom row: Selected Patch title + metrics (matches TPS distribution + local summary band). */
export function SelectedPatchDetailCard() {
  const caseId = useViewerStore((s) => s.caseId);
  const patch = useViewerStore(selectSelectedPatch);
  const setSelectedPatch = useViewerStore((s) => s.setSelectedPatch);

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-2">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pb-2 pt-0 sm:px-6">
        {!caseId || !patch ? (
          <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed px-4 text-center text-xs text-muted-foreground">
            Selection details appear here after you choose a patch.
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-semibold tracking-wide">
                  Selected Patch
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatPatchOriginXY(patch)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void setSelectedPatch(null)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Clear selection"
              >
                <X className="size-4" />
              </button>
            </div>
            <PatchCellStatsInline patchId={patch.patchId} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
