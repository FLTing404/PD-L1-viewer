"use client";

import { useEffect, useMemo } from "react";
import { FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewerStore } from "@/lib/store";
import { caseFileRelativeUrl } from "@/lib/patchPreviewUrl";
import { cn } from "@/lib/utils";

function specimenStatusLabel(meanTps: number): string {
  if (meanTps >= 0.5) return "High PD-L1";
  if (meanTps >= 0.1) return "Elevated";
  return "Low expressors";
}

/** Header section: directory-driven analysis instances with specimen-style cards. */
export function SpecimenExplorer({ className }: { className?: string }) {
  const caseList = useViewerStore((s) => s.caseList);
  const caseListStatus = useViewerStore((s) => s.caseListStatus);
  const caseId = useViewerStore((s) => s.caseId);
  const setCase = useViewerStore((s) => s.setCase);
  const loadCaseList = useViewerStore((s) => s.loadCaseList);

  useEffect(() => {
    if (caseListStatus === "idle") {
      void loadCaseList();
    }
  }, [caseListStatus, loadCaseList]);

  const handleImport = async () => {
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        await (window as Window & { showDirectoryPicker?: () => Promise<void> })
          .showDirectoryPicker?.();
      } catch {
        /* user cancelled */
      }
    }
    await loadCaseList();
  };

  const loading = caseListStatus === "loading";

  const casesByTpsDesc = useMemo(
    () => [...caseList].sort((a, b) => b.meanPatchTps - a.meanPatchTps),
    [caseList],
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-1.5 overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between gap-1">
        <span className="text-app-section shrink-0 font-medium uppercase tracking-wider text-muted-foreground">
          Specimen Explorer
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          title="Import Source Directory — refresh scanned analysis instances from the server data root"
          aria-label="Import Source Directory"
          disabled={loading}
          onClick={() => void handleImport()}
        >
          <FolderInput className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden pr-0.5">
        {loading && caseList.length === 0 ? (
          <div className="text-app-body text-muted-foreground">Loading…</div>
        ) : caseList.length === 0 ? (
          <div className="text-app-body text-muted-foreground">
            No analysis instances. Place case folders under the data root, then
            import.
          </div>
        ) : (
          casesByTpsDesc.map((c) => {
            const selected = c.caseId === caseId;
            const thumbUrl = caseFileRelativeUrl(c.caseId, c.thumbnailRelative);
            const tpsPct = (c.meanPatchTps * 100).toFixed(1);
            const status = specimenStatusLabel(c.meanPatchTps);
            return (
              <button
                key={c.caseId}
                type="button"
                onClick={() => void setCase(c.caseId)}
                className={cn(
                  "specimen-card relative flex w-full gap-2 rounded-lg border p-1.5 pl-2 text-left transition-all",
                  selected
                    ? "specimen-card--selected border-sky-400/80 bg-sky-500/10 ring-1 ring-sky-400/50"
                    : "border-border/80 bg-muted/15 hover:bg-muted/35",
                )}
              >
                <div
                  className={cn(
                    "relative size-[60px] shrink-0 overflow-hidden rounded-none bg-muted",
                    selected && "specimen-thumb-glow",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl}
                    alt=""
                    className="size-full object-contain object-center"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="inline-block max-w-none whitespace-nowrap font-mono text-[11px] leading-snug text-muted-foreground">
                    <span className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground/85">
                      ID:{" "}
                    </span>
                    <span>{c.caseId}</span>
                  </div>
                  <div className="text-[13px] font-bold tabular-nums leading-snug text-emerald-400">
                    TPS: {tpsPct}%
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide",
                        status === "High PD-L1"
                          ? "bg-rose-500/25 text-rose-200"
                          : status === "Elevated"
                            ? "bg-amber-500/20 text-amber-100"
                            : "bg-zinc-500/25 text-zinc-200",
                      )}
                    >
                      {status}
                    </span>
                    {c.numExportedPatches > 0 ? (
                      <span className="rounded border border-border/60 bg-background/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                        Processed
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
