"use client";

import { TopBar } from "@/components/topbar/TopBar";
import { LeftSidebar } from "@/components/side/left/LeftSidebar";
import { LeftColumn } from "@/components/side/left/LeftColumn";
import { RightColumn } from "@/components/side/right/RightColumn";
import { AiAssistantFloating } from "@/components/side/right/AiAssistantFloating";

export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeftSidebar />
        <LeftColumn />
        <RightColumn />
      </div>
      <AiAssistantFloating />
    </div>
  );
}
