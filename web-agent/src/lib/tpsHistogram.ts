import type { PatchBucket, PatchEntry } from "@/types/case";

/** Histogram bins at 1% TPS resolution; index k ∈ [0,100] → k% on [0%, 100%]. */
export const TPS_HISTOGRAM_BIN_COUNT = 101;

/** Clinical bucket by scalar TPS (0..1), consistent with `bucket.ts` labels. */
export function patchBucketFromPredTps(pred: number): PatchBucket {
  if (pred < 0.01) return "Negative";
  if (pred < 0.1) return "TPS_1";
  if (pred < 0.5) return "TPS_10";
  return "TPS_50";
}

/** Count patches per severity bucket (denominator for proportional band widths). */
export function countPatchesByBucket(
  patches: Pick<PatchEntry, "patchPredTps">[],
): Record<PatchBucket, number> {
  const out: Record<PatchBucket, number> = {
    Negative: 0,
    TPS_1: 0,
    TPS_10: 0,
    TPS_50: 0,
  };
  for (const p of patches) {
    out[patchBucketFromPredTps(p.patchPredTps)]++;
  }
  return out;
}

export type TpsProportionalAxis = {
  /** Map TPS percent 0..100 to SVG x (same coord space as px0/plotW). */
  mapTpsToX: (tpsPercent: number) => number;
  /** Pixel width of each of the four bands (Negative → TPS_50). */
  bandWidths: [number, number, number, number];
};

/**
 * Horizontal space for each clinical band is proportional to its patch count / total.
 * Within each band, TPS maps linearly to x (boundaries at 0, 1, 10, 50, 100%).
 */
export function createProportionalTpsAxis(
  bucketCounts: Record<PatchBucket, number>,
  px0: number,
  plotW: number,
): TpsProportionalAxis {
  const order: PatchBucket[] = ["Negative", "TPS_1", "TPS_10", "TPS_50"];
  const total = order.reduce((s, b) => s + bucketCounts[b], 0);
  const w =
    total > 0
      ? (order.map((b) => (bucketCounts[b] / total) * plotW) as [
          number,
          number,
          number,
          number,
        ])
      : ([plotW / 4, plotW / 4, plotW / 4, plotW / 4] as const);

  const [wN, w1, w10, w50] = w;

  function mapTpsToX(tpsPercent: number): number {
    const t = Math.max(0, Math.min(100, tpsPercent));
    if (t < 1) {
      return px0 + t * wN;
    }
    if (t < 10) {
      return px0 + wN + ((t - 1) / 9) * w1;
    }
    if (t < 50) {
      return px0 + wN + w1 + ((t - 10) / 40) * w10;
    }
    return px0 + wN + w1 + w10 + ((t - 50) / 50) * w50;
  }

  return {
    mapTpsToX,
    bandWidths: [wN, w1, w10, w50],
  };
}

/**
 * Linear TPS% axis: equal pixel width per percentage point (0–100%).
 * Band shading widths match clinical spans [0,1), [1,10), [10,50), [50,100].
 */
export function createLinearTpsAxis(px0: number, plotW: number): TpsProportionalAxis {
  function mapTpsToX(tpsPercent: number): number {
    const t = Math.max(0, Math.min(100, tpsPercent));
    return px0 + (t / 100) * plotW;
  }
  const wN = plotW / 100;
  const w1 = (9 / 100) * plotW;
  const w10 = (40 / 100) * plotW;
  const w50 = (50 / 100) * plotW;
  return {
    mapTpsToX,
    bandWidths: [wN, w1, w10, w50],
  };
}

/** `counts[k]` = patches with TPS% rounded to nearest integer percent (index k ∈ 0..100). */
export function buildTpsPercentBins(patches: Pick<PatchEntry, "patchPredTps">[]): number[] {
  const counts = new Array<number>(TPS_HISTOGRAM_BIN_COUNT).fill(0);
  for (const p of patches) {
    const k = Math.round(p.patchPredTps * 100);
    const idx = Math.max(0, Math.min(TPS_HISTOGRAM_BIN_COUNT - 1, k));
    counts[idx]!++;
  }
  return counts;
}

export function sumBins(counts: number[]): number {
  return counts.reduce((a, b) => a + b, 0);
}

export function maxBin(counts: number[]): number {
  let m = 0;
  for (const v of counts) if (v > m) m = v;
  return m <= 0 ? 1 : m;
}
