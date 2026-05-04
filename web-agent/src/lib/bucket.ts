import type { PatchBucket } from "@/types/case";

/**
 * Clinical-severity palette for PD-L1 TPS buckets.
 *
 * Convention: the more severe (higher PD-L1 expression), the deeper / darker
 * the red. Negative bucket uses a cool slate-blue so it visually recedes.
 * This ordering is consistent with common pathology heatmaps.
 *
 *   TPS_50  ≥50%      → deep red          (#b91c1c, red-700)
 *   TPS_10  10–50%    → red / vermilion    (#ef4444, red-500)
 *   TPS_1   1–10%     → amber              (#f59e0b, amber-500)
 *   Negative <1%      → slate blue-grey    (#64748b, slate-500)
 */
export interface BucketStyle {
  label: string;          // short label for legend bars and tabs (e.g. ">50%")
  fullLabel: string;      // longer label for legends (e.g. "TPS ≥ 50%")
  rgb: string;            // raw "r,g,b" for inline rgba()
  hex: string;            // hex form for SVG stroke / fill
  // tailwind class fragments
  bar: string;            // background for solid bars
  text: string;           // foreground for accents / numbers
  ring: string;           // ring colour for selection rings
  badgeBg: string;        // background for soft pill badges
  badgeText: string;      // text colour for soft pill badges
  badgeRing: string;      // ring for soft pill badges
}

export const BUCKET_ORDER: PatchBucket[] = [
  "TPS_50",
  "TPS_10",
  "TPS_1",
  "Negative",
];

export const BUCKET_STYLES: Record<PatchBucket, BucketStyle> = {
  TPS_50: {
    label: ">50%",
    fullLabel: "TPS ≥ 50%",
    rgb: "185,28,28",
    hex: "#b91c1c",
    bar: "bg-red-700",
    text: "text-red-300",
    ring: "ring-red-700/60",
    badgeBg: "bg-red-700/25",
    badgeText: "text-red-200",
    badgeRing: "ring-red-600/50",
  },
  TPS_10: {
    label: "10–50%",
    fullLabel: "TPS 10–49%",
    rgb: "239,68,68",
    hex: "#ef4444",
    bar: "bg-red-500",
    text: "text-red-300",
    ring: "ring-red-500/60",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-200",
    badgeRing: "ring-red-500/45",
  },
  TPS_1: {
    label: "1–10%",
    fullLabel: "TPS 1–9%",
    rgb: "245,158,11",
    hex: "#f59e0b",
    bar: "bg-amber-500",
    text: "text-amber-300",
    ring: "ring-amber-500/60",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-200",
    badgeRing: "ring-amber-500/45",
  },
  Negative: {
    label: "<1%",
    fullLabel: "Negative",
    rgb: "100,116,139",
    hex: "#64748b",
    bar: "bg-slate-500",
    text: "text-slate-300",
    ring: "ring-slate-500/60",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-200",
    badgeRing: "ring-slate-400/45",
  },
};
