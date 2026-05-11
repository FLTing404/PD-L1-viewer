"use client";

import { SpecimenExplorer } from "./SpecimenExplorer";
import { PatchGallery } from "./PatchGallery";

/** Left sidebar: specimen explorer, then patch gallery. */
export function LeftSidebar() {
  return (
    <aside className="flex h-full min-h-0 w-fit min-w-[360px] max-w-[440px] flex-none flex-col overflow-hidden border-r border-[#2d2d2d] bg-background/85">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-[#2d2d2d] px-0.5 py-0.5">
          <SpecimenExplorer className="text-app-body h-full min-h-0" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-0.5 pb-0.5 pt-0.5">
          <PatchGallery variant="sidebar" />
        </div>
      </div>
    </aside>
  );
}
