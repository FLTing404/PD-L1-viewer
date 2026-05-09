"use client";

import { MainViewer } from "@/components/viewer/MainViewer";
import { TpsDistributionBar } from "./TpsDistributionBar";

/**
 * Center column: WSI + bottom TPS strip (same flex ratios as {@link RightColumn}).
 */
export function LeftColumn() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-[5_1_0%] flex-col overflow-hidden">
        <MainViewer />
      </div>

      <div className="flex min-h-0 min-w-0 w-full flex-[2_1_0%] flex-col overflow-x-hidden overflow-y-auto border-t border-[#2d2d2d]">
        <TpsDistributionBar />
      </div>
    </div>
  );
}
