import type { CaseManifest } from "@/types/case";

function coolWarmRgba(t: number): [number, number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const r = Math.round(40 + x * 215);
  const g = Math.round(70 + 180 * Math.sin(x * Math.PI * 0.85));
  const b = Math.round(220 - x * 210);
  const a = 0.28 + x * 0.48;
  return [r, g, b, a];
}

function boxBlur2D(
  src: Float32Array,
  gw: number,
  gh: number,
  radius: number,
): Float32Array {
  if (radius < 1) return src;
  const tmp = new Float32Array(gw * gh);
  const out = new Float32Array(gw * gh);
  const r = radius;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= gh) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= gw) continue;
          s += src[yy * gw + xx];
          n++;
        }
      }
      tmp[y * gw + x] = n > 0 ? s / n : 0;
    }
  }
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= gh) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= gw) continue;
          s += tmp[yy * gw + xx];
          n++;
        }
      }
      out[y * gw + x] = n > 0 ? s / n : 0;
    }
  }
  return out;
}

/**
 * Patch 中心为高斯核、TPS 为权重的 2D KDE；低分辨率渲染后经高质量插值放大，
 * 叠在原图上呈连续渐变（非离散热块）。
 */
export function buildKdeTpsHeatmapCanvas(manifest: CaseManifest): HTMLCanvasElement {
  const meta = manifest.wsiMeta;
  const tw = meta.thumbnailWidth;
  const th = meta.thumbnailHeight;
  const patches = manifest.patches;

  const canvas = document.createElement("canvas");
  canvas.style.mixBlendMode = "multiply";
  canvas.style.pointerEvents = "none";

  if (tw <= 0 || th <= 0 || patches.length === 0) {
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }

  const aspect = th / tw;
  const gw = Math.min(
    448,
    Math.max(
      120,
      Math.round(tw / Math.max(4, Math.sqrt(patches.length) * 0.35)),
    ),
  );
  const gh = Math.max(80, Math.round(gw * aspect));

  const centers = patches.map((p) => ({
    cx: (p.px + p.width / 2) * meta.thumbScaleX,
    cy: (p.py + p.height / 2) * meta.thumbScaleY,
    w: Math.max(0, p.patchPredTps),
  }));

  const n = centers.length;
  const sigma =
    Math.max(tw, th) *
    Math.max(0.025, Math.min(0.11, 0.42 / Math.sqrt(Math.max(n, 1))));
  const denom = 2 * sigma * sigma;

  const buf = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const gx = ((i + 0.5) / gw) * tw;
      const gy = ((j + 0.5) / gh) * th;
      let s = 0;
      for (const c of centers) {
        const dx = gx - c.cx;
        const dy = gy - c.cy;
        s += c.w * Math.exp(-(dx * dx + dy * dy) / denom);
      }
      buf[j * gw + i] = s;
    }
  }

  const blurred =
    n >= 2 ? boxBlur2D(buf, gw, gh, Math.max(1, Math.round(gw / 96))) : buf;

  let mx = 0;
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > mx) mx = blurred[i];
  }
  if (mx < 1e-12) mx = 1;

  const small = document.createElement("canvas");
  small.width = gw;
  small.height = gh;
  const sctx = small.getContext("2d");
  if (!sctx) {
    canvas.width = tw;
    canvas.height = th;
    return canvas;
  }

  const sImg = sctx.createImageData(gw, gh);
  const { data } = sImg;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const v = blurred[j * gw + i] / mx;
      const [r, g, b, a] = coolWarmRgba(v);
      const idx = (j * gw + i) << 2;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(a * 255);
    }
  }
  sctx.putImageData(sImg, 0, 0);

  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, tw, th);

  return canvas;
}
