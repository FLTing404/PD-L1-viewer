"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { BUCKET_STYLES } from "@/lib/bucket";
import { countPatchesByBucket } from "@/lib/tpsHistogram";
import type { CaseManifest, PatchBucket } from "@/types/case";
import { cn } from "@/lib/utils";

/** Left → right on strip: TPS<1% … TPS>50% (matches proportional TPS axis). */
const STRIP_BUCKETS_LTR: PatchBucket[] = [
  "Negative",
  "TPS_1",
  "TPS_10",
  "TPS_50",
];

/** @deprecated Legend paired with former Hilbert density trace; strip is now whole-slide bucket mix only. */
export type HilbertDensityTraceLegend = {
  mode: "ws" | "roi_bars";
  wsAsReference: boolean;
};

/** Whole-slide TPS mix: bar width per clinical bucket ∝ patch count (predTPS bins). */
export function HilbertSpatialStrip({
  manifest,
  leftPad = 0,
  rightPad = 0,
  densityTraceLegend: _densityTraceLegend,
}: {
  manifest: CaseManifest;
  leftPad?: number;
  rightPad?: number;
  densityTraceLegend?: HilbertDensityTraceLegend;
}) {
  void _densityTraceLegend;
  const patches = patchesWithCellsForTps(manifest.patches);

  const bucketCounts = useMemo(
    () => countPatchesByBucket(patches),
    [patches],
  );
  const total = useMemo(
    () => STRIP_BUCKETS_LTR.reduce((s, b) => s + bucketCounts[b], 0),
    [bucketCounts],
  );

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
    const cssW = trackSize.w;
    const cssH = trackSize.h;
    if (total <= 0 || cssW <= 0 || cssH <= 0) return;

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

    let x = 0;
    for (let i = 0; i < STRIP_BUCKETS_LTR.length; i++) {
      const b = STRIP_BUCKETS_LTR[i]!;
      const frac = bucketCounts[b] / total;
      const segW =
        i === STRIP_BUCKETS_LTR.length - 1
          ? Math.max(0, w - x)
          : Math.floor(frac * w);
      ctx.fillStyle = BUCKET_STYLES[b].hex;
      ctx.fillRect(x, 0, Math.max(0, segW), h);
      x += segW;
    }
  }, [bucketCounts, total, trackSize.w, trackSize.h]);

  const n = patches.length;

  if (n === 0) {
    return (
      <div
        className="text-[10px] text-muted-foreground"
        style={{ paddingLeft: leftPad, paddingRight: rightPad }}
      >
        全图 TPS 占比: 无可用 patch。
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
        TPS Allocation Band
        </div>
        <div className="flex items-center gap-1.5 text-[9px] tabular-nums text-muted-foreground/65">
          <span>{n.toLocaleString()} patches</span>
          <span className="text-muted-foreground/35">·</span>
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-[26px] w-full overflow-hidden rounded-md bg-black/35 ring-1 ring-border/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.45)] select-none"
        role="img"
        aria-label="全图 TPS 占比 — 从左到右为小于1%、1–10%、10–50%、大于50%；悬停各区可看占比"
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-0 block h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/8 via-transparent to-black/35" />
        <div className="absolute inset-0 z-[2] flex h-full w-full min-h-[26px]">
          {STRIP_BUCKETS_LTR.map((b: PatchBucket) => {
            const style = BUCKET_STYLES[b];
            const c = bucketCounts[b];
            const pct = total > 0 ? (100 * c) / total : 0;
            return (
              <Tooltip key={b}>
                <TooltipTrigger
                  delay={120}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className={cn(
                        "h-full min-h-[26px] min-w-0 shrink-0 cursor-pointer bg-transparent p-0",
                        "hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/55 focus-visible:ring-offset-0",
                      )}
                      style={{
                        ...triggerProps.style,
                        flexGrow: Math.max(0, c),
                        flexBasis: 0,
                        minWidth: c > 0 ? 4 : 0,
                      }}
                      aria-label={`${style.fullLabel}: ${pct.toFixed(1)}%，${c.toLocaleString()} patches`}
                    />
                  )}
                />
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="flex max-w-[240px] flex-col gap-1 px-3 py-2 text-xs"
                >
                  <div className="font-semibold leading-tight text-background">
                    {style.fullLabel}
                  </div>
                  <div className="tabular-nums text-background/90">
                    <span className="text-lg font-bold">{pct.toFixed(1)}%</span>
                    <span className="mx-1.5 text-background/50">·</span>
                    <span>{c.toLocaleString()} patches</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[8px] leading-tight text-muted-foreground/85 sm:text-[9px]"
        role="group"
        aria-label="TPS 分桶图例（占比悬停条带查看）"
      >
        {STRIP_BUCKETS_LTR.map((b: PatchBucket) => {
          const style = BUCKET_STYLES[b];
          return (
            <span
              key={b}
              className="inline-flex items-center gap-1"
              title={style.fullLabel}
            >
              <span
                className="size-2 shrink-0 rounded-sm ring-1 ring-foreground/15"
                style={{ backgroundColor: style.hex }}
                aria-hidden
              />
              <span className={cn("font-medium", style.text)}>
                {style.label}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
