"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useViewerStore, computeWsiStats } from "@/lib/store";
import { BUCKET_ORDER, BUCKET_STYLES } from "@/lib/bucket";

export function TpsDistributionBar() {
  const manifest = useViewerStore((s) => s.manifest);
  const stats = computeWsiStats(manifest);
  const total = stats.patchCount || 1;

  return (
    <Card className="h-full gap-1.5 py-2">
      <CardContent className="flex h-full flex-col gap-1.5 px-2.5">
        <div className="text-app-section flex items-center gap-1.5 font-semibold tracking-wide">
          TPS Distribution Overview
          <Info className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="flex h-2 overflow-hidden rounded-full ring-1 ring-foreground/10">
          {BUCKET_ORDER.map((b) => {
            const style = BUCKET_STYLES[b];
            const count = stats.bucketCounts[b] ?? 0;
            const pct = (count / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={b}
                className={style.bar}
                style={{ width: `${pct}%` }}
                title={`${style.label}: ${count}`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-1">
          {BUCKET_ORDER.map((b) => {
            const style = BUCKET_STYLES[b];
            const count = stats.bucketCounts[b] ?? 0;
            const pct = (count / total) * 100;
            return (
              <div
                key={b}
                className="flex flex-col items-center text-center"
              >
                <span className={`text-app-body font-semibold ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-app-body font-mono font-semibold tabular-nums leading-tight">
                  {pct.toFixed(1)}%
                </span>
                <span className="text-app-body text-muted-foreground leading-tight">
                  ({count})
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
