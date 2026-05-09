"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GALLERY_PAGE_SIZE,
  GALLERY_PAGE_SIZE_SIDEBAR,
  useViewerStore,
} from "@/lib/store";
import { BUCKET_STYLES } from "@/lib/bucket";
import { formatPatchOriginXY } from "@/lib/patchDisplay";
import { caseFileRelativeUrl } from "@/lib/patchPreviewUrl";
import type { PatchEntry } from "@/types/case";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { cn } from "@/lib/utils";

export type PatchGalleryVariant = "grid" | "sidebar";

export function PatchGallery({
  variant = "grid",
}: {
  variant?: PatchGalleryVariant;
}) {
  const manifest = useViewerStore((s) => s.manifest);
  const caseId = useViewerStore((s) => s.caseId);
  const selectedPatchId = useViewerStore((s) => s.selectedPatchId);
  const galleryBucket = useViewerStore((s) => s.galleryBucket);
  const galleryPage = useViewerStore((s) => s.galleryPage);
  const setGalleryPage = useViewerStore((s) => s.setGalleryPage);
  const setSelectedPatch = useViewerStore((s) => s.setSelectedPatch);
  const flyToPatch = useViewerStore((s) => s.flyToPatch);

  const pageSize =
    variant === "sidebar" ? GALLERY_PAGE_SIZE_SIDEBAR : GALLERY_PAGE_SIZE;

  const filtered: PatchEntry[] = patchesWithCellsForTps(
    manifest?.patches ?? [],
  ).filter((p) => p.patchPredBucket === galleryBucket);
  const sorted = [...filtered].sort((a, b) => b.patchPredTps - a.patchPredTps);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(galleryPage, totalPages - 1);
  const startIdx = page * pageSize;
  const pageItems = sorted.slice(startIdx, startIdx + pageSize);

  const handlePatchClick = (patchId: string) => {
    void setSelectedPatch(patchId);
    flyToPatch(patchId);
  };

  const titleClass =
    "text-app-section font-semibold tracking-wide";

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col gap-2 py-3",
        variant === "sidebar" && "h-full py-2 shadow-sm",
      )}
    >
      <CardContent
        className={cn(
          "flex min-h-0 flex-col gap-2.5 px-3",
          variant === "sidebar" && "h-full gap-2 px-2.5 py-0",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={titleClass}>Patch Gallery</span>
        </div>

        {sorted.length === 0 ? (
          <div className="text-app-body flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed text-muted-foreground">
            No patches in this bucket.
          </div>
        ) : variant === "sidebar" ? (
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5">
            {pageItems.map((p) => {
              const isActive = p.patchId === selectedPatchId;
              const tpsPct = (p.patchPredTps * 100).toFixed(1);
              const thumbUrl = caseId
                ? caseFileRelativeUrl(caseId, p.imageFile)
                : "";
              const bucketStyle = BUCKET_STYLES[p.patchPredBucket];
              const xyLabel = formatPatchOriginXY(p);
              return (
                <button
                  key={p.patchId}
                  type="button"
                  onClick={() => handlePatchClick(p.patchId)}
                  className={cn(
                    "flex w-full flex-col gap-0 rounded-md border p-1.5 text-left transition-colors",
                    isActive
                      ? "border-red-500 bg-red-500/10 ring-1 ring-red-500"
                      : "border-border bg-muted/20 hover:bg-muted/45",
                  )}
                  title={`${p.patchId} · ${xyLabel}`}
                >
                  <div className="flex w-full gap-2">
                    <div className="size-10 shrink-0 overflow-hidden rounded bg-muted">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "font-mono text-app-body leading-tight tabular-nums",
                          isActive ? "text-red-200" : "text-foreground",
                        )}
                      >
                        {xyLabel}
                      </div>
                      <div className="text-app-body mt-0.5 text-muted-foreground">
                        TPS{" "}
                        <span
                          className={cn(
                            "font-mono font-semibold tabular-nums",
                            isActive ? "text-red-300" : bucketStyle.text,
                          )}
                        >
                          {tpsPct}%
                        </span>
                        <span className="mx-1 text-border">·</span>
                        Cells{" "}
                        <span className="font-mono tabular-nums text-foreground">
                          {p.numCells}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {pageItems.map((p) => {
                const isActive = p.patchId === selectedPatchId;
                const tpsPct = (p.patchPredTps * 100).toFixed(1);
                const thumbUrl = caseId
                  ? caseFileRelativeUrl(caseId, p.imageFile)
                  : "";
                const bucketStyle = BUCKET_STYLES[p.patchPredBucket];
                return (
                  <button
                    key={p.patchId}
                    type="button"
                    onClick={() => handlePatchClick(p.patchId)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-md ring-1 transition-all",
                      isActive
                        ? "ring-2 ring-red-500"
                        : cn("ring-border hover:ring-2", bucketStyle.ring),
                    )}
                    title={`${p.patchId} · ${formatPatchOriginXY(p)}`}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "text-app-body py-0.5 text-center font-mono font-semibold tabular-nums leading-none",
                        isActive ? "text-red-300" : bucketStyle.text,
                      )}
                    >
                      {tpsPct}%
                    </span>
                    <span className="text-[10px] leading-tight text-center font-mono tabular-nums text-muted-foreground px-0.5 pb-0.5">
                      {formatPatchOriginXY(p)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {totalPages > 1 ? (
          <div
            className={cn(
              "flex items-center justify-center gap-1 pt-1",
              variant === "sidebar" && "flex-wrap",
            )}
          >
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={page === 0}
              onClick={() => setGalleryPage(page - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {variant === "sidebar" && totalPages > 6 ? (
              <span className="text-app-body px-1 text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
            ) : (
              Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryPage(i)}
                  className={cn(
                    "text-app-body h-9 min-w-9 rounded-md px-2 font-medium transition-colors",
                    i === page
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {i + 1}
                </button>
              ))
            )}
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={page === totalPages - 1}
              onClick={() => setGalleryPage(page + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
