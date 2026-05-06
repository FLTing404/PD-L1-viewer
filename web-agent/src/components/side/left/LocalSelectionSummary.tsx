"use client";

import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { useViewerStore } from "@/lib/store";

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-app-body text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      {sub ? (
        <span className="text-app-body text-muted-foreground">{sub}</span>
      ) : null}
    </div>
  );
}

/** Aggregated stats for the current local ROI (includes synthetic all-negative patches). */
export function LocalSelectionSummary() {
  const localRoi = useViewerStore((s) => s.localRoi);
  const clearLocalRoi = useViewerStore((s) => s.clearLocalRoi);
  const manifest = useViewerStore((s) => s.manifest);

  if (!manifest) return null;

  const s = localRoi?.summary;

  return (
    <Card className="shrink-0 gap-1.5 py-2">
      <CardContent className="flex flex-col gap-2 px-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-app-section font-semibold tracking-wide">
            Local Selection Summary
          </div>
          {localRoi ? (
            <button
              type="button"
              onClick={() => clearLocalRoi()}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Clear selection"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {!localRoi ? (
          <p className="text-app-body leading-snug text-muted-foreground">
            Click ROI on the WSI, then drag a rectangle. On release the region
            snaps to the union of all 512×512 grid cells under your rectangle
            (including empty slide areas). Cells without exported inference are
            counted as simulated all-negative patches.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/40 pt-2">
            <StatRow
              label="Patch count"
              value={s?.patchCount ?? "—"}
              sub={
                s
                  ? `${s.realPatchCount} with data · ${s.syntheticPatchCount} simulated (all-negative)`
                  : undefined
              }
            />
            <StatRow label="Total cells" value={s?.totalCells ?? "—"} />
            <StatRow label="Positive cells" value={s?.positiveCells ?? "—"} />
            <StatRow label="Negative cells" value={s?.negativeCells ?? "—"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
