"use client";

import { Microscope } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex items-center gap-4 border-b border-border bg-background/80 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Microscope className="size-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">
            TPS Patch Analysis
          </span>
          <span className="text-sm uppercase tracking-wider text-muted-foreground">
            PD-L1 assistive viewer
          </span>
        </div>
      </div>
    </header>
  );
}
