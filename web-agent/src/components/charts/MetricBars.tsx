"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "overlay" | "card";

const variantStyles = {
  overlay: {
    label: "text-white/75",
    value: "text-white",
    track: "bg-white/12",
  },
  card: {
    label: "text-muted-foreground",
    value: "text-foreground",
    track: "bg-muted/50",
  },
} as const;

/** Label + value only — same typography as {@link MetricHBar} header row (no bar). */
export function MetricInlinePair({
  label,
  valueLabel,
  variant = "card",
}: {
  label: string;
  valueLabel: ReactNode;
  variant?: Variant;
}) {
  const vs = variantStyles[variant];
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2",
        variant === "card"
          ? "text-[9px] font-semibold uppercase tracking-[0.1em]"
          : "text-[10px]",
        vs.label,
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "shrink-0 font-mono tabular-nums font-semibold",
          variant === "card" ? "text-[11px]" : "text-xs",
          vs.value,
        )}
      >
        {valueLabel}
      </span>
    </div>
  );
}

/** Scalar 0..1 shown as horizontal bar (e.g. TPS or proportion). */
export function MetricHBar({
  label,
  fraction,
  valueLabel,
  barClassName,
  variant = "card",
}: {
  label: string;
  fraction: number;
  valueLabel: ReactNode;
  barClassName: string;
  variant?: Variant;
}) {
  const w = Math.min(100, Math.max(0, fraction * 100));
  const vs = variantStyles[variant];
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div
        className={cn(
          "flex items-baseline justify-between gap-2",
          variant === "card"
            ? "text-[9px] font-semibold uppercase tracking-[0.1em]"
            : "text-[10px]",
          vs.label,
        )}
      >
        <span>{label}</span>
        <span
          className={cn(
            "shrink-0 font-mono tabular-nums font-semibold",
            variant === "card" ? "text-[11px]" : "text-xs",
            vs.value,
          )}
        >
          {valueLabel}
        </span>
      </div>
      <div className={cn("h-1.5 w-full overflow-hidden rounded-full", vs.track)}>
        <div
          className={cn("h-full rounded-full transition-[width]", barClassName)}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

const MIX_POS_OVERLAY = "bg-[#e0786e]";
const MIX_NEG_OVERLAY = "bg-[#5e7ea8]";
const MIX_POS_CARD = "bg-[#b85a5a]";
const MIX_NEG_CARD = "bg-[#5e7ea8]";

/** Positive vs negative cell counts as one stacked bar. */
export function CellMixStackedBar({
  positiveCells,
  negativeCells,
  variant = "card",
}: {
  positiveCells: number;
  negativeCells: number;
  variant?: Variant;
}) {
  const t = Math.max(1, positiveCells + negativeCells);
  const pw = (positiveCells / t) * 100;
  const nw = (negativeCells / t) * 100;
  const posC = variant === "overlay" ? MIX_POS_OVERLAY : MIX_POS_CARD;
  const negC = variant === "overlay" ? MIX_NEG_OVERLAY : MIX_NEG_CARD;
  const vs = variantStyles[variant];

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div
        className={cn(
          "flex items-baseline justify-between gap-2",
          variant === "card"
            ? "text-[9px] font-semibold uppercase tracking-[0.1em]"
            : "text-[10px]",
          vs.label,
        )}
      >
        <span>Cell mix (+ / −)</span>
        <span
          className={cn(
            "shrink-0 font-mono tabular-nums font-semibold leading-tight",
            variant === "card" ? "text-[10px] sm:text-[11px]" : "text-xs",
            vs.value,
          )}
        >
          +{positiveCells.toLocaleString()} / −{negativeCells.toLocaleString()}
        </span>
      </div>
      <div
        className={cn(
          "flex h-2 w-full overflow-hidden rounded-full",
          variant === "overlay" ? "bg-white/10" : "bg-muted/40",
        )}
      >
        <div className={cn("min-w-0", posC)} style={{ width: `${pw}%` }} />
        <div className={cn("min-w-0", negC)} style={{ width: `${nw}%` }} />
      </div>
    </div>
  );
}
