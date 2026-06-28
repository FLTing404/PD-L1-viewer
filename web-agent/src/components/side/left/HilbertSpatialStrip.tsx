"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { BUCKET_ORDER_LTR, BUCKET_STYLES } from "@/lib/bucket";
import {
  countPatchesByBucket,
  displayBucketPercentsOneDecimalSum100,
  sanitizeBucketCounts,
  sumBucketCounts,
} from "@/lib/tpsHistogram";
import type { CaseManifest, PatchBucket } from "@/types/case";
import { cn } from "@/lib/utils";

const STRIP_BUCKETS_LTR = BUCKET_ORDER_LTR;

/** Min band pixel width for one-line `count (pct%)`; narrower bands hide label → hover tooltip. */
const INLINE_LABEL_MIN_PX = 52;

/** @deprecated Legend paired with former Hilbert density trace; strip is now whole-slide bucket mix only. */
export type HilbertDensityTraceLegend = {
  mode: "ws" | "roi_bars";
  wsAsReference: boolean;
};

export type HilbertStripScope = "whole_slide" | "roi_selection";

/** TPS mix strip: bar width per clinical bucket ∝ patch count (same math as proportional TPS axis). */
export function HilbertSpatialStrip({
  manifest,
  leftPad = 0,
  rightPad = 0,
  densityTraceLegend: _densityTraceLegend,
  /** When set (e.g. blended counts), drives segment widths instead of whole-slide manifest counts. */
  distributionCounts = null,
  /** Optional patch total for the subtitle line (defaults from bucket sum / manifest). */
  patchTotalDisplay = null,
  scope = "whole_slide",
}: {
  manifest: CaseManifest;
  leftPad?: number;
  rightPad?: number;
  densityTraceLegend?: HilbertDensityTraceLegend;
  distributionCounts?: Record<PatchBucket, number> | null;
  patchTotalDisplay?: number | null;
  scope?: HilbertStripScope;
}) {
  void _densityTraceLegend;
  const patches = patchesWithCellsForTps(manifest.patches);

  const wsBucketCounts = useMemo(
    () => countPatchesByBucket(patches),
    [patches],
  );

  /** Sanitize + same denominator \(N_{\mathrm{tot}}\) as proportional axis / paper. */
  const bucketCounts = sanitizeBucketCounts(distributionCounts ?? wsBucketCounts);
  const total = sumBucketCounts(bucketCounts);
  const displayPct = displayBucketPercentsOneDecimalSum100(bucketCounts, total);

  const nWs = patches.length;

  /** Strip width drives whether each band can fit its inline pct/count label. */
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripPxW, setStripPxW] = useState(0);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const update = () => setStripPxW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (nWs === 0 || total <= 1e-9) {
    const emptyMsg =
      scope === "roi_selection"
        ? "选区内 TPS 占比: 无可用 patch。"
        : "全图 TPS 占比: 无可用 patch。";
    return (
      <div
        className="text-[10px] text-muted-foreground"
        style={{ paddingLeft: leftPad, paddingRight: rightPad }}
      >
        {emptyMsg}
      </div>
    );
  }

  const ariaStrip =
    scope === "roi_selection"
      ? "选区内 TPS 占比 — 从左到右为 <1%、1–9%、10–49%、≥50%；悬停各区可看占比"
      : "全图 TPS 占比 — 从左到右为 <1%、1–9%、10–49%、≥50%；悬停各区可看占比";

  return (
    <div
      className="space-y-1"
      style={{ paddingLeft: leftPad, paddingRight: rightPad }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[15px] font-medium uppercase tracking-wider text-muted-foreground/95">
          TPS Allocation Band
        </div>
      </div>
      <div
        ref={stripRef}
        className="relative h-[26px] w-full overflow-hidden rounded-md bg-black/20 ring-1 ring-border/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.35)] select-none"
        role="img"
        aria-label={ariaStrip}
      >
        {/* DOM bands (reliable colour); canvas was easy to miss paint vs dark chrome */}
        <div className="absolute inset-0 z-0 flex h-full min-h-[26px] w-full">
          {STRIP_BUCKETS_LTR.map((b: PatchBucket) => {
            const c = bucketCounts[b];
            return (
              <div
                key={`band-${b}`}
                className="min-h-[26px] min-w-0 shrink-0"
                style={{
                  flexGrow: c,
                  flexBasis: 0,
                  minWidth: c > 0 ? 2 : 0,
                  backgroundColor: BUCKET_STYLES[b].hex,
                }}
              />
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/10 via-transparent to-black/15" />
        <div className="absolute inset-0 z-[2] flex h-full w-full min-h-[26px]">
          {STRIP_BUCKETS_LTR.map((b: PatchBucket) => {
            const style = BUCKET_STYLES[b];
            const c = bucketCounts[b];
            const pct = displayPct[b] ?? 0;
            const cRounded = Math.max(0, Math.round(c));
            /** Use Infinity until measured so SSR / first render prefers inline labels (avoids tooltip flash). */
            const bandPxW =
              total > 0 && stripPxW > 0 ? (c / total) * stripPxW : Number.POSITIVE_INFINITY;
            const showInlineLabel = c > 0 && bandPxW >= INLINE_LABEL_MIN_PX;
            const compactLabel = `${cRounded.toLocaleString()} (${pct.toFixed(1)}%)`;
            const ariaLabel = `${style.fullLabel}: ${compactLabel}`;
            const sharedBtnStyle: React.CSSProperties = {
              flexGrow: c,
              flexBasis: 0,
              minWidth: c > 0 ? 4 : 0,
            };
            const btnClass = cn(
              "flex h-full min-h-[26px] min-w-0 shrink-0 cursor-default items-center justify-center bg-transparent p-0",
              "hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/55 focus-visible:ring-offset-0",
            );

            const inlineLabel = showInlineLabel ? (
              <span className="pointer-events-none max-w-full truncate px-1 text-center text-[10px] font-semibold leading-none tabular-nums text-white/95 [text-shadow:0_1px_1.5px_rgba(0,0,0,0.45)]">
                {compactLabel}
              </span>
            ) : null;

            if (showInlineLabel) {
              return (
                <button
                  key={b}
                  type="button"
                  className={btnClass}
                  style={sharedBtnStyle}
                  aria-label={ariaLabel}
                >
                  {inlineLabel}
                </button>
              );
            }

            return (
              <Tooltip key={b}>
                <TooltipTrigger
                  delay={120}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className={btnClass}
                      style={{ ...triggerProps.style, ...sharedBtnStyle }}
                      aria-label={ariaLabel}
                    />
                  )}
                />
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="max-w-[260px] flex-col items-stretch gap-1 px-3 py-2 text-xs text-background/90"
                >
                  <span className="text-[10px] font-medium leading-tight text-background/75">
                    {style.fullLabel}
                  </span>
                  <span className="text-base font-semibold tabular-nums leading-none">
                    {compactLabel}
                  </span>
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
