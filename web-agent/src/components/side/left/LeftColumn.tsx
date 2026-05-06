"use client";

import type { RefObject } from "react";
import { MainViewer } from "@/components/viewer/MainViewer";
import { TpsDistributionBar } from "./TpsDistributionBar";
import { LocalSelectionSummary } from "./LocalSelectionSummary";

/**
 * Center column (6 of 2:6:2): full WSI + bottom TPS distribution strip.
 * Case / WSI summary / patch list live in {@link LeftSidebar}.
 */
export function LeftColumn({
  heatmapPaneRef,
}: {
  heatmapPaneRef?: RefObject<HTMLDivElement | null>;
} = {}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-[6_1_0%] flex-col gap-3 overflow-hidden p-3">
      <div className="relative flex min-h-0 min-w-0 flex-[5_1_0%] flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <MainViewer heatmapPaneRef={heatmapPaneRef} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-[2_1_0%] flex-col gap-2 overflow-y-auto">
        <div className="min-h-0 min-w-0 flex-1">
          <TpsDistributionBar />
        </div>
        <LocalSelectionSummary />
      </div>
    </div>
  );
}
