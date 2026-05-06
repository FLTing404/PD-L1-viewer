"use client";

import { useRef } from "react";
import { TopBar } from "@/components/topbar/TopBar";
import { LeftSidebar } from "@/components/side/left/LeftSidebar";
import { LeftColumn } from "@/components/side/left/LeftColumn";
import { RightColumn } from "@/components/side/right/RightColumn";
import { AiAssistantFloating } from "@/components/side/right/AiAssistantFloating";
import { HeatmapPaneRefContext } from "@/components/viewer/HeatmapAlignContext";

export default function Home() {
  const heatmapPaneRef = useRef<HTMLDivElement | null>(null);

  return (
    <HeatmapPaneRefContext.Provider value={heatmapPaneRef}>
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <TopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LeftSidebar />
          <LeftColumn heatmapPaneRef={heatmapPaneRef} />
          <RightColumn />
        </div>
        <AiAssistantFloating />
      </div>
    </HeatmapPaneRefContext.Provider>
  );
}
