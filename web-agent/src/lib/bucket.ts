import type { PatchBucket } from "@/types/case";

/**
 * TPS bucket colours — higher-chroma ramp for legible strips/charts on dark UI:
 * steel blue → teal → orange → rose-red (expression tier rises with warmth).
 *
 *   Negative <1%     → #5E8FD4
 *   TPS_1   1–10%    → #3CB88A
 *   TPS_10  10–50%   → #E67E22
 *   TPS_50  ≥50%     → #E03147
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
    rgb: "224,49,71",
    hex: "#E03147",
    bar: "bg-[#E03147]",
    text: "text-rose-300",
    ring: "ring-[rgba(224,49,71,0.55)]",
    badgeBg: "bg-[rgba(224,49,71,0.22)]",
    badgeText: "text-rose-100",
    badgeRing: "ring-[rgba(224,49,71,0.45)]",
  },
  TPS_10: {
    label: "TPS10–50%",
    fullLabel: "TPS 10–49%",
    rgb: "230,126,34",
    hex: "#E67E22",
    bar: "bg-[#E67E22]",
    text: "text-orange-200",
    ring: "ring-[rgba(230,126,34,0.55)]",
    badgeBg: "bg-[rgba(230,126,34,0.22)]",
    badgeText: "text-orange-100",
    badgeRing: "ring-[rgba(230,126,34,0.45)]",
  },
  TPS_1: {
    label: "TPS1–10%",
    fullLabel: "TPS 1–9%",
    rgb: "60,184,138",
    hex: "#3CB88A",
    bar: "bg-[#3CB88A]",
    text: "text-emerald-200",
    ring: "ring-[rgba(60,184,138,0.55)]",
    badgeBg: "bg-[rgba(60,184,138,0.22)]",
    badgeText: "text-emerald-100",
    badgeRing: "ring-[rgba(60,184,138,0.45)]",
  },
  Negative: {
    label: "TPS<1%",
    fullLabel: "Negative",
    rgb: "94,143,212",
    hex: "#5E8FD4",
    bar: "bg-[#5E8FD4]",
    text: "text-sky-200",
    ring: "ring-[rgba(94,143,212,0.52)]",
    badgeBg: "bg-[rgba(94,143,212,0.20)]",
    badgeText: "text-sky-100",
    badgeRing: "ring-[rgba(94,143,212,0.42)]",
  },
};
