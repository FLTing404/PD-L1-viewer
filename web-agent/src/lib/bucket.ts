import type { PatchBucket } from "@/types/case";

/**
 * TPS bucket colours — ColorBrewer YlOrRd–class ramp (yellow → orange → deep red)
 * for positive buckets, plus a neutral light grey for Negative so it reads as
 * "absence of signal" on dark UIs. Higher PD-L1 / TPS is visually hotter.
 *
 *   TPS_50  ≥50%      → #bd0026 (YlOrRd dark red)
 *   TPS_10  10–50%   → #fd8d3c (orange)
 *   TPS_1   1–10%    → #fed976 (light yellow)
 *   Negative <1%     → #bdbdbd (neutral grey)
 */
export interface BucketStyle {
  label: string; // short label for legend bars and tabs (e.g. ">50%")
  fullLabel: string; // longer label for legends (e.g. "TPS ≥ 50%")
  rgb: string; // raw "r,g,b" for inline rgba()
  hex: string; // hex form for SVG stroke / fill
  // tailwind class fragments
  bar: string; // legacy; prefer `hex` with inline style where precise colour matters
  text: string; // foreground for accents / numbers
  ring: string; // ring colour for selection rings
  badgeBg: string; // background for soft pill badges
  badgeText: string; // text colour for soft pill badges
  badgeRing: string; // ring for soft pill badges
}

export const BUCKET_ORDER: PatchBucket[] = [
  "TPS_50",
  "TPS_10",
  "TPS_1",
  "Negative",
];

export const BUCKET_STYLES: Record<PatchBucket, BucketStyle> = {
  TPS_50: {
    label: "TPS>50%",
    fullLabel: "TPS ≥ 50%",
    rgb: "189,0,38",
    hex: "#bd0026",
    bar: "bg-[#bd0026]",
    text: "text-red-300",
    ring: "ring-[rgba(189,0,38,0.55)]",
    badgeBg: "bg-[rgba(189,0,38,0.18)]",
    badgeText: "text-red-100",
    badgeRing: "ring-[rgba(189,0,38,0.45)]",
  },
  TPS_10: {
    label: "TPS10–50%",
    fullLabel: "TPS 10–49%",
    rgb: "253,141,60",
    hex: "#fd8d3c",
    bar: "bg-[#fd8d3c]",
    text: "text-orange-200",
    ring: "ring-[rgba(253,141,60,0.55)]",
    badgeBg: "bg-[rgba(253,141,60,0.20)]",
    badgeText: "text-orange-200",
    badgeRing: "ring-[rgba(253,141,60,0.45)]",
  },
  TPS_1: {
    label: "TPS1–10%",
    fullLabel: "TPS 1–9%",
    rgb: "254,217,118",
    hex: "#fed976",
    bar: "bg-[#fed976]",
    text: "text-amber-100",
    ring: "ring-[rgba(254,217,118,0.55)]",
    badgeBg: "bg-[rgba(254,217,118,0.18)]",
    badgeText: "text-amber-100",
    badgeRing: "ring-[rgba(254,217,118,0.45)]",
  },
  Negative: {
    label: "TPS<1%",
    fullLabel: "Negative",
    rgb: "189,189,189",
    hex: "#bdbdbd",
    bar: "bg-[#bdbdbd]",
    text: "text-slate-200",
    ring: "ring-[rgba(189,189,189,0.45)]",
    badgeBg: "bg-[rgba(189,189,189,0.16)]",
    badgeText: "text-slate-200",
    badgeRing: "ring-[rgba(189,189,189,0.45)]",
  },
};
