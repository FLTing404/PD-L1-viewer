"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  SelectedPatchDetailCard,
  SelectedPatchPreviewBand,
} from "./SelectedPatchStackedView";
import { useViewerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Right column: preview band (5) + detail strip (2), aligned with center column.
 * Preview tiles are square (side = band height / 2); aside width equals that tile side so it
 * matches the two stacked previews with no extra horizontal margin.
 */
export function RightColumn() {
  const previewBandRef = useRef<HTMLDivElement>(null);
  const [tileSizePx, setTileSizePx] = useState<number | null>(null);
  const caseId = useViewerStore((s) => s.caseId);
  const selectedPatchId = useViewerStore((s) => s.selectedPatchId);

  useLayoutEffect(() => {
    const el = previewBandRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      setTileSizePx(h > 0 ? h / 2 : null);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measuredAsideWidth =
    tileSizePx != null ? tileSizePx : undefined;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-[#2d2d2d] bg-background/60",
        measuredAsideWidth == null && "w-[clamp(360px,28vw,500px)]",
      )}
      style={
        measuredAsideWidth != null
          ? { width: `${Math.round(measuredAsideWidth)}px` }
          : undefined
      }
    >
      <div
        ref={previewBandRef}
        className="relative flex min-h-0 min-w-0 flex-[5_1_0%] flex-col overflow-hidden"
      >
        <SelectedPatchPreviewBand
          key={`${caseId ?? ""}::${selectedPatchId ?? ""}`}
          tileSizePx={tileSizePx}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-[2_1_0%] flex-col overflow-hidden border-t border-[#2d2d2d]">
        <SelectedPatchDetailCard />
      </div>
    </aside>
  );
}
