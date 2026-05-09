/** Smallest power of two >= v (v >= 1). */
export function nextPow2(v: number): number {
  const n = Math.max(1, Math.ceil(v));
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Hilbert curve distance d in [0, n²) for integer grid (x,y) in [0, n).
 * n must be a power of two.
 */
export function hilbertD(n: number, x: number, y: number): number {
  let d = 0;
  for (let s = Math.floor(n / 2); s > 0; s = Math.floor(s / 2)) {
    const rx = (x & s) > 0 ? 1 : 0;
    const ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const t = x;
      x = y;
      y = t;
    }
  }
  return d;
}
