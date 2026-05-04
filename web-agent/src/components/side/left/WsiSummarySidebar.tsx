"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useViewerStore, computeWsiStats } from "@/lib/store";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-app-body flex items-baseline justify-between gap-2">
      <span className="shrink-0 uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-mono font-medium tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function WsiSummarySidebar() {
  const manifest = useViewerStore((s) => s.manifest);
  const stats = computeWsiStats(manifest);

  return (
    <Card className="gap-0 py-2 shadow-sm">
      <CardContent className="flex flex-col gap-2 px-3 py-0">
        <div className="text-app-section font-semibold tracking-wide">WSI Summary</div>
        <div className="flex flex-col gap-1.5">
          <Row label="Patches" value={stats.patchCount} />
          <Row
            label="TPS (mean)"
            value={`${(stats.meanTps * 100).toFixed(1)}%`}
          />
          <Row
            label="Cells (total)"
            value={stats.totalCells.toLocaleString()}
          />
          <Row
            label="Positive"
            value={stats.positiveCells.toLocaleString()}
          />
          <Row
            label="Negative"
            value={stats.negativeCells.toLocaleString()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
