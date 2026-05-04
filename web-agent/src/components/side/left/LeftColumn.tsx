"use client";

import { MainViewer } from "@/components/viewer/MainViewer";
import { TpsDistributionBar } from "./TpsDistributionBar";

/**
 * 中间主列（三栏 2:6:2 中的 6）：WSI 全屏区 + 底部 TPS 分布条。
 * Case / WSI 摘要 / Patch 列表在左侧 {@link LeftSidebar}。
 */
export function LeftColumn() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-[6_1_0%] flex-col gap-3 overflow-hidden p-3">
      <div className="relative flex min-h-0 min-w-0 flex-[5_1_0%] flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <MainViewer />
      </div>

      <div className="flex min-h-0 flex-[2_1_0%] flex-col overflow-hidden">
        <TpsDistributionBar />
      </div>
    </div>
  );
}
