"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useViewerStore, computeWsiStats } from "@/lib/store";

interface InfoCellProps {
  label: string;
  value: React.ReactNode;
}

function InfoCell({ label, value }: InfoCellProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium leading-tight">{value}</span>
    </div>
  );
}

export function WsiSummaryCompact() {
  const manifest = useViewerStore((s) => s.manifest);
  const stats = computeWsiStats(manifest);
  const summary = manifest?.wsiSummary;

  return (
    <Card className="h-full gap-1.5 py-2">
      <CardContent className="flex h-full flex-col gap-1.5 px-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold tracking-wide">
            WSI Summary
          </span>
          <span className="truncate font-mono text-[13px] text-muted-foreground">
            {summary?.wsiId ?? "—"}
          </span>
        </div>

        <div className="grid flex-1 grid-cols-4 gap-x-2 gap-y-1 content-start">
          <InfoCell
            label="Patches"
            value={
              <span className="font-mono tabular-nums">
                {stats.patchCount}
              </span>
            }
          />
          <InfoCell
            label="Total cells"
            value={
              <span className="font-mono tabular-nums">
                {stats.totalCells.toLocaleString()}
              </span>
            }
          />
          <InfoCell
            label="Mean TPS"
            value={
              <span className="font-mono tabular-nums">
                {(stats.meanTps * 100).toFixed(1)}%
              </span>
            }
          />
          <InfoCell
            label="Max TPS"
            value={
              <span className="font-mono tabular-nums text-red-300">
                {(stats.maxTps * 100).toFixed(1)}%
              </span>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
