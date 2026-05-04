"use client";

import { SelectedPatchStackedView } from "./SelectedPatchStackedView";

/** 与主页三栏 2:6:2 中的右侧一份 */
export function RightColumn() {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-[2_1_0%] flex-col border-l border-border bg-background/60">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-3">
        <SelectedPatchStackedView />
      </div>
    </aside>
  );
}
