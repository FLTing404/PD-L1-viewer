"use client";

import { CaseSelector } from "@/components/topbar/CaseSelector";
import { WsiSummarySidebar } from "./WsiSummarySidebar";
import { PatchTpsBubbleChart } from "./PatchTpsBubbleChart";
import { PatchGallery } from "./PatchGallery";

/** Left column slot in the main 2:6:2 layout. */
export function LeftSidebar() {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-[2_1_0%] flex-col gap-2 overflow-hidden border-r border-border bg-background/85 py-2 pl-2.5 pr-2">
      <div className="shrink-0 space-y-1 px-0.5 pt-0.5">
        <div className="text-app-section shrink-0 font-medium uppercase tracking-wider text-muted-foreground">
          Case
        </div>
        <CaseSelector className="h-auto min-h-10 w-full text-app-body" />
      </div>
      <div className="shrink-0 space-y-2 px-0.5">
        <WsiSummarySidebar />
        <PatchTpsBubbleChart />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden px-0.5 pb-0.5">
        <PatchGallery variant="sidebar" />
      </div>
    </aside>
  );
}
