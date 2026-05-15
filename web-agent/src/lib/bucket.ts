import type { PatchBucket } from "@/types/case";

/**
 * TPS bucket colours — higher-chroma ramp for legible strips/charts on dark UI:
 * steel blue → teal → orange → rose-red (expression tier rises with warmth).
 *
 *   Negative <1%     → #5E8FD4
 *   TPS_1   1–9%     → #3CB88A
 *   TPS_10  10–49%   → #E67E22
 *   TPS_50  ≥50%     → #E03147
 */

/** Clinical band ranges — single source of truth (matches `patchBucketFromPredTps`). */
export const BUCKET_RANGE_LABELS: Record<PatchBucket, string> = {
  Negative: "<1%",
  TPS_1: "1–9%",
  TPS_10: "10–49%",
  TPS_50: "≥50%",
};

/** TPS Allocation Band strip legend (TPS prefix). */
export const BUCKET_STRIP_LABELS: Record<PatchBucket, string> = {
  Negative: "TPS<1%",
  TPS_1: "TPS1–9%",
  TPS_10: "TPS10–49%",
  TPS_50: "TPS≥50%",
};

/** Left → right on allocation strip / proportional axis. */
export const BUCKET_ORDER_LTR: PatchBucket[] = [
  "Negative",
  "TPS_1",
  "TPS_10",
  "TPS_50",
];

/** Descending severity (gallery default sort, etc.). */
export const BUCKET_ORDER: PatchBucket[] = [
  "TPS_50",
  "TPS_10",
  "TPS_1",
  "Negative",
];

export function formatPatchBucketLabel(
  bucket: PatchBucket | string | null | undefined,
): string {
  if (bucket && bucket in BUCKET_RANGE_LABELS) {
    return BUCKET_RANGE_LABELS[bucket as PatchBucket];
  }
  return bucket ? String(bucket) : "—";
}

export function formatPatchBucketDistributionLine(
  bucket: PatchBucket,
  count: number,
  formatCount: (n: number) => string = String,
): string {
  return `${BUCKET_RANGE_LABELS[bucket]}: ${formatCount(count)} patches`;
}

export interface BucketStyle {
  label: string; // strip legend (e.g. "TPS≥50%")
  fullLabel: string; // tooltips / aria (e.g. "≥50%")
  rgb: string;
  hex: string;
  bar: string;
  text: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  badgeRing: string;
}

export const BUCKET_STYLES: Record<PatchBucket, BucketStyle> = {
  TPS_50: {
    label: BUCKET_STRIP_LABELS.TPS_50,
    fullLabel: BUCKET_RANGE_LABELS.TPS_50,
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
    label: BUCKET_STRIP_LABELS.TPS_10,
    fullLabel: BUCKET_RANGE_LABELS.TPS_10,
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
    label: BUCKET_STRIP_LABELS.TPS_1,
    fullLabel: BUCKET_RANGE_LABELS.TPS_1,
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
    label: BUCKET_STRIP_LABELS.Negative,
    fullLabel: BUCKET_RANGE_LABELS.Negative,
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
