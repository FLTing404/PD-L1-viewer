"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hilbertD, nextPow2 } from "@/lib/hilbert";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { BUCKET_ORDER, BUCKET_STYLES } from "@/lib/bucket";
import type { CaseManifest, PatchBucket, PatchEntry } from "@/types/case";
import { cn } from "@/lib/utils";

type Cell = { patch: PatchEntry; d: number };

/** Same semantics as the density-trace row in TpsDistributionBar (whole-slide vs ROI). */
export type HilbertDensityTraceLegend = {
  mode: "ws" | "roi_bars";
  /** Whole-slide swatch: dashed when an ROI is shown for comparison. */
  wsAsReference: boolean;
};

/** predTPS 0..1: soft blue (0%) → white (1%) → soft red (100%). */
const TPS_PIVOT = 0.01;
const RGB_LOW = { r: 88, g: 124, b: 168 };
const RGB_MID = { r: 250, g: 251, b: 252 };
const RGB_HIGH = { r: 196, g: 118, b: 124 };

function legendGradientBackground(): string {
  const lo = `rgb(${RGB_LOW.r},${RGB_LOW.g},${RGB_LOW.b})`;
  const mid = `rgb(${RGB_MID.r},${RGB_MID.g},${RGB_MID.b})`;
  const hi = `rgb(${RGB_HIGH.r},${RGB_HIGH.g},${RGB_HIGH.b})`;
  return `linear-gradient(to right, ${lo} 0%, ${mid} 1%, ${hi} 100%)`;
}

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function predTpsToStripColor(predTps: number): string {
  const t = Math.max(0, Math.min(1, predTps));
  if (t <= TPS_PIVOT) {
    const u = TPS_PIVOT > 1e-12 ? t / TPS_PIVOT : 1;
    const r = lerp(RGB_LOW.r, RGB_MID.r, u);
    const g = lerp(RGB_LOW.g, RGB_MID.g, u);
    const b = lerp(RGB_LOW.b, RGB_MID.b, u);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }
  const u = (t - TPS_PIVOT) / (1 - TPS_PIVOT);
  const r = lerp(RGB_MID.r, RGB_HIGH.r, u);
  const g = lerp(RGB_MID.g, RGB_HIGH.g, u);
  const b = lerp(RGB_MID.b, RGB_HIGH.b, u);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** Hilbert-ordered 1D spatial strip: static canvas color bars (no brushing). */
export function HilbertSpatialStrip({
  manifest,
  leftPad = 0,
  rightPad = 0,
  densityTraceLegend,
}: {
  manifest: CaseManifest;
  /** Pixel padding so the strip aligns with the histogram plot area on the left. */
  leftPad?: number;
  /** Pixel padding so the strip aligns with the histogram plot area on the right. */
  rightPad?: number;
  /** Combined single-row legend with Hilbert colour scale + density trace + TPS buckets. */
  densityTraceLegend?: HilbertDensityTraceLegend;
}) {
  const traceLegend = densityTraceLegend ?? {
    mode: "ws" as const,
    wsAsReference: false,
  };
  const patches = patchesWithCellsForTps(manifest.patches);
  const ps = manifest.wsiMeta.patchSize;

  const sortedCells = useMemo((): Cell[] => {
    if (patches.length === 0) return [];
    const gxs = patches.map((p) => Math.floor(p.px / ps));
    const gys = patches.map((p) => Math.floor(p.py / ps));
    const gxMin = Math.min(...gxs);
    const gyMin = Math.min(...gys);
    const gW = Math.max(...gxs) - gxMin + 1;
    const gH = Math.max(...gys) - gyMin + 1;
    const n = nextPow2(Math.max(gW, gH));
    const cells: Cell[] = patches.map((p) => {
      const gx = Math.floor(p.px / ps) - gxMin;
      const gy = Math.floor(p.py / ps) - gyMin;
      return { patch: p, d: hilbertD(n, gx, gy) };
    });
    cells.sort((a, b) => a.d - b.d);
    return cells;
  }, [patches, ps]);

  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trackSize, setTrackSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setTrackSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setTrackSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const n = sortedCells.length;
    const cssW = trackSize.w;
    const cssH = trackSize.h;
    if (n === 0 || cssW <= 0 || cssH <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < n; i++) {
      const xs = Math.floor((i * w) / n);
      const xe = i === n - 1 ? w : Math.floor(((i + 1) * w) / n);
      const width = Math.max(1, xe - xs);
      ctx.fillStyle = predTpsToStripColor(sortedCells[i]!.patch.patchPredTps);
      ctx.fillRect(xs, 0, width, h);
    }
  }, [sortedCells, trackSize.w, trackSize.h]);

  const n = sortedCells.length;

  if (sortedCells.length === 0) {
    return (
      <div
        className="text-[10px] text-muted-foreground"
        style={{ paddingLeft: leftPad, paddingRight: rightPad }}
      >
        Spatial Hilbert trace: no patches.
      </div>
    );
  }

  return (
    <div
      className="space-y-1"
      style={{ paddingLeft: leftPad, paddingRight: rightPad }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/95">
          Spatial Hilbert Trace
        </div>
        <div className="flex items-center gap-1.5 text-[9px] tabular-nums text-muted-foreground/65">
          <span>{n.toLocaleString()} patches</span>
          <span className="text-muted-foreground/35">·</span>
          <span className="tracking-wide">spatial order →</span>
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-[26px] w-full cursor-default overflow-hidden rounded-md bg-black/35 ring-1 ring-border/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.45)] select-none"
        role="img"
        aria-label="Spatial Hilbert trace — each column shows patch predTPS color along Hilbert spatial order; see legend below for blue to red scale"
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 block h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/35" />
      </div>
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[8px] leading-tight text-muted-foreground/85 sm:text-[9px]"
        role="group"
        aria-label="Hilbert strip colour scale and TPS bucket legend"
      >
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className="h-2 min-h-[8px] w-7 shrink-0 rounded-sm ring-1 ring-border/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{ background: legendGradientBackground() }}
            aria-hidden
          />
          <span className="shrink-0 tabular-nums text-muted-foreground/90">TPS0%·1%·100%</span>
        </div>
        <span className="text-muted-foreground/40" aria-hidden>
          ·
        </span>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-sm",
              traceLegend.mode === "roi_bars" &&
                "bg-cyan-400 ring-1 ring-cyan-300/50",
              traceLegend.mode === "ws" &&
                !traceLegend.wsAsReference &&
                "bg-sky-400/50 ring-1 ring-sky-300/35",
              traceLegend.mode === "ws" &&
                traceLegend.wsAsReference &&
                "border border-dashed border-sky-400/50 bg-sky-400/15 ring-1 ring-sky-400/20",
            )}
            aria-hidden
          />
          <span className="font-medium text-muted-foreground">
            {traceLegend.mode === "roi_bars" ? "ROI bars" : "Whole Slide density"}
          </span>
        </div>
        <span className="text-muted-foreground/40" aria-hidden>
          ·
        </span>
        <div className="flex min-w-0 flex-[2_1_180px] flex-wrap items-center gap-x-2 gap-y-0.5">
          {BUCKET_ORDER.map((b: PatchBucket) => {
            const style = BUCKET_STYLES[b];
            return (
              <span
                key={b}
                className="inline-flex items-center gap-0.5"
                title={style.fullLabel}
              >
                <span
                  className="size-2 shrink-0 rounded-sm ring-1 ring-foreground/15"
                  style={{ backgroundColor: style.hex, opacity: 0.5 }}
                  aria-hidden
                />
                <span className={cn("font-medium", style.text)}>{style.label}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
