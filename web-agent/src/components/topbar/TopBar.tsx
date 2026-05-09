"use client";

export function TopBar() {
  return (
    <header className="flex items-center gap-4 border-b border-[#2d2d2d] bg-background/80 px-5 py-3 backdrop-blur">
      <div className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight">
          PD-L1 TPS Visual Analytics
        </span>
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground sm:text-xs">
          Multiscale WSI–patch exploration
        </span>
      </div>
    </header>
  );
}
