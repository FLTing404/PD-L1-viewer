"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useViewerStore, computeWsiStats } from "@/lib/store";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { patchesIntersectingRect } from "@/lib/localRoiStats";
import type { PatchEntry } from "@/types/case";
import { CellMixStackedBar, MetricHBar } from "@/components/charts/MetricBars";
import { cn } from "@/lib/utils";

function cellWeightedMeanTps(patches: PatchEntry[]): number {
  const withCells = patchesWithCellsForTps(patches);
  let sum = 0;
  let cells = 0;
  for (const p of withCells) {
    sum += p.patchPredTps * p.numCells;
    cells += p.numCells;
  }
  return cells > 0 ? sum / cells : 0;
}

/**
 * Selection ROI scalar metrics — embedded in TPS Distribution Overview (dashboard style).
 * Syncs via {@link useViewerStore} when ROI changes on the WSI.
 */
export function SelectionRoiPanel({
  className,
  variant = "embedded",
}: {
  className?: string;
  /** embedded = blend with parent card; panel = slightly stronger separation */
  variant?: "embedded" | "panel";
}) {
  const manifest = useViewerStore((s) => s.manifest);
  const localRoi = useViewerStore((s) => s.localRoi);
  const clearLocalRoi = useViewerStore((s) => s.clearLocalRoi);

  const wsiStats = useMemo(() => computeWsiStats(manifest), [manifest]);

  const roiMeanTps = useMemo(() => {
    if (!manifest || !localRoi) return 0;
    const inRoi = patchesIntersectingRect(manifest, localRoi.world);
    return cellWeightedMeanTps(inRoi);
  }, [manifest, localRoi]);

  if (!manifest) return null;

  const hasRoi = Boolean(localRoi);
  const s = localRoi?.summary;
  const positiveCells = hasRoi ? s!.positiveCells : wsiStats.positiveCells;
  const negativeCells = hasRoi ? s!.negativeCells : wsiStats.negativeCells;
  const patchCount = hasRoi ? s!.patchCount : wsiStats.patchCount;
  const totalCells = hasRoi ? s!.totalCells : wsiStats.totalCells;
  const meanTps = hasRoi ? roiMeanTps : wsiStats.meanTps;

  const subtitle = hasRoi ? "Local ROI" : "Whole slide";

  const patchFrac =
    wsiStats.patchCount > 0 ? patchCount / wsiStats.patchCount : 0;
  const cellFrac =
    wsiStats.totalCells > 0 ? totalCells / wsiStats.totalCells : 0;

  const patchesLabel = hasRoi ? "Patches (vs slide)" : "Patches";
  const cellsLabel = hasRoi ? "Cells (vs slide)" : "Cells";
  const patchesValue = hasRoi
    ? `${patchCount.toLocaleString()} / ${wsiStats.patchCount.toLocaleString()}`
    : patchCount.toLocaleString();
  const cellsValue = hasRoi
    ? `${totalCells.toLocaleString()} / ${wsiStats.totalCells.toLocaleString()}`
    : totalCells.toLocaleString();
  const patchesFraction = hasRoi ? Math.min(1, patchFrac) : 1;
  const cellsFraction = hasRoi ? Math.min(1, cellFrac) : 1;

  const embedded = variant === "embedded";

  return (
    <section
      aria-label="Selection ROI statistics"
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        embedded && "py-0.5",
        variant === "panel" &&
          "rounded-lg border border-border/60 bg-card/80 p-2.5 shadow-sm",
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/45 pb-1.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Selection ROI
          </span>
          <span className="text-[11px] font-medium leading-snug text-muted-foreground/75">
            {subtitle}
          </span>
        </div>
        {hasRoi ? (
          <button
            type="button"
            onClick={() => clearLocalRoi()}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Clear ROI"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-3">
        <MetricHBar
          variant="card"
          label="Mean TPS (scalar)"
          fraction={Math.min(1, Math.max(0, meanTps))}
          valueLabel={`${(meanTps * 100).toFixed(1)}%`}
          barClassName="bg-sky-600/75"
        />
        <MetricHBar
          variant="card"
          label={patchesLabel}
          fraction={patchesFraction}
          valueLabel={patchesValue}
          barClassName="bg-sky-500/55"
        />
        <MetricHBar
          variant="card"
          label={cellsLabel}
          fraction={cellsFraction}
          valueLabel={cellsValue}
          barClassName="bg-emerald-600/55"
        />
        <CellMixStackedBar
          variant="card"
          positiveCells={positiveCells}
          negativeCells={negativeCells}
        />
      </div>
    </section>
  );
}
