/**
 * User-facing TPS is shown at 0.1% precision (one decimal on the percent scale).
 * `pred` is scalar TPS in [0, 1] (e.g. manifest `patchPredTps`).
 */
export function formatTpsPercentDigits(pred: number): string {
  const t = Math.max(0, Math.min(1, pred));
  return (t * 100).toFixed(1);
}

/** Same digits as {@link formatTpsPercentDigits}, for fractions already in 0..1 (e.g. cell positive ratio). */
export function formatPercent01Digits(fraction: number): string {
  const t = Math.max(0, Math.min(1, fraction));
  return (t * 100).toFixed(1);
}
