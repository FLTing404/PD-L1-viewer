"use client";

import { useRef } from "react";
import {
  SelectedPatchDetailCard,
  SelectedPatchPreviewBand,
} from "./SelectedPatchStackedView";

/**
 * Right column (2 of 2:6:2): mirrors LeftColumn — top band aligns with WSI+heatmap
 * row; bottom band aligns with TPS distribution + local summary strip.
 */
export function RightColumn() {
  const previewShellRef = useRef<HTMLDivElement>(null);

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-[2_1_0%] flex-col gap-3 overflow-hidden border-l border-border bg-background/60 p-3">
      <div
        ref={previewShellRef}
        className="relative flex min-h-0 min-w-0 flex-[5_1_0%] flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10"
      >
        <SelectedPatchPreviewBand alignRootRef={previewShellRef} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-[2_1_0%] flex-col gap-2 overflow-y-auto">
        <SelectedPatchDetailCard />
      </div>
    </aside>
  );
}
