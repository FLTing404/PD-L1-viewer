"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useViewerStore, computeWsiStats } from "@/lib/store";
import { BUCKET_ORDER, BUCKET_STYLES, type BucketStyle } from "@/lib/bucket";
import type { PatchBucket } from "@/types/case";
import { cn } from "@/lib/utils";

function pctTextClass(bucket: PatchBucket): string {
  if (bucket === "TPS_1") {
    return "text-zinc-900";
  }
  return "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]";
}

export function TpsDistributionBar() {
  const manifest = useViewerStore((s) => s.manifest);
  const stats = computeWsiStats(manifest);
  const total = stats.patchCount || 1;

  return (
    <Card className="h-full gap-1.5 py-2">
      <CardContent className="flex h-full flex-col gap-2 px-2.5">
        <div className="text-app-section flex items-center gap-1.5 font-semibold tracking-wide">
          TPS Distribution Overview
          <Info className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="flex h-10 min-h-[2.5rem] overflow-hidden rounded-lg ring-1 ring-foreground/15">
          {BUCKET_ORDER.map((b) => {
            const style = BUCKET_STYLES[b];
            const count = stats.bucketCounts[b] ?? 0;
            const pct = (count / total) * 100;
            if (pct <= 0) return null;
            const showPctInside = pct >= 5;
            return (
              <div
                key={b}
                className={cn(
                  style.bar,
                  "flex min-w-0 items-center justify-center",
                )}
                style={{ width: `${pct}%` }}
                title={`${style.fullLabel}: ${count} patches (${pct.toFixed(1)}%)`}
              >
                {showPctInside ? (
                  <span
                    className={cn(
                      "truncate px-0.5 text-center text-xs font-mono font-semibold tabular-nums leading-none",
                      pctTextClass(b),
                    )}
                  >
                    {pct.toFixed(1)}%
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/40 pt-2">
          {BUCKET_ORDER.map((b) => {
            const style = BUCKET_STYLES[b];
            const count = stats.bucketCounts[b] ?? 0;
            const pct = (count / total) * 100;
            return (
              <LegendSwatch
                key={b}
                style={style}
                count={count}
                pct={pct}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function LegendSwatch({
  style,
  count,
  pct,
}: {
  style: BucketStyle;
  count: number;
  pct: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5"
      title={`${style.fullLabel}: ${count} patches (${pct.toFixed(1)}%)`}
    >
      <span
        className="size-3 shrink-0 rounded-sm ring-1 ring-foreground/20"
        style={{ backgroundColor: style.hex }}
        aria-hidden
      />
      <span
        className={cn(
          "text-[10px] font-medium leading-none sm:text-[11px]",
          style.text,
        )}
      >
        {style.label}
      </span>
    </div>
  );
}
