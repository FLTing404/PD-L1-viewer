import fs from "node:fs/promises";
import { Buffer } from "node:buffer";
import type { TileSourceConfig } from "@/types/tileSource";

type DziTileSourceConfig = Extract<TileSourceConfig, { kind: "dzi" }>;

export interface ImageSize {
  width: number;
  height: number;
}

function parseTiffDimensions(data: Buffer): ImageSize | null {
  if (data.length < 8) return null;
  const le = data[0] === 0x49 && data[1] === 0x49;
  const be = data[0] === 0x4d && data[1] === 0x4d;
  if (!le && !be) return null;
  const r16 = (o: number) => (le ? data.readUInt16LE(o) : data.readUInt16BE(o));
  const r32 = (o: number) => (le ? data.readUInt32LE(o) : data.readUInt32BE(o));
  if (r16(2) !== 42) return null;
  let ifd = r32(4);
  for (let depth = 0; depth < 8; depth++) {
    if (ifd <= 0 || ifd + 2 > data.length) break;
    const n = r16(ifd);
    let w = 0;
    let h = 0;
    for (let i = 0; i < n; i++) {
      const off = ifd + 2 + i * 12;
      if (off + 12 > data.length) break;
      const tag = r16(off);
      const type = r16(off + 2);
      const count = r32(off + 4);
      const raw = data.subarray(off + 8, off + 12);
      if (tag === 256 && count === 1) {
        if (type === 3) w = le ? raw.readUInt16LE(0) : raw.readUInt16BE(0);
        else if (type === 4) w = le ? raw.readUInt32LE(0) : raw.readUInt32BE(0);
      }
      if (tag === 257 && count === 1) {
        if (type === 3) h = le ? raw.readUInt16LE(0) : raw.readUInt16BE(0);
        else if (type === 4) h = le ? raw.readUInt32LE(0) : raw.readUInt32BE(0);
      }
    }
    if (w > 0 && h > 0) return { width: w, height: h };
    const nextOff = ifd + 2 + n * 12;
    if (nextOff + 4 > data.length) break;
    ifd = r32(nextOff);
  }
  return null;
}

function parseJpegDimensions(data: Buffer): ImageSize | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let i = 2;
  while (i < data.length - 9) {
    if (data[i] !== 0xff) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < data.length && data[j] === 0xff) j++;
    if (j >= data.length) break;
    const marker = data[j];
    if (marker === 0xd9) break;
    if (j + 3 >= data.length) break;
    const segLen = data.readUInt16BE(j + 1);
    if (segLen < 2 || j + 1 + segLen > data.length) break;

    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    /* SOF: precision @ j+3, height @ j+4..5, width @ j+6..7 */
    if (isSof && j + 8 < data.length) {
      const h = data.readUInt16BE(j + 4);
      const w = data.readUInt16BE(j + 6);
      if (w > 0 && h > 0) return { width: w, height: h };
    }

    i = j + 1 + segLen;
  }
  return null;
}

/**
 * Read width/height without heavy deps: PNG (IHDR) or JPEG (SOF0/SOF2 …).
 */
export async function readImageSize(filePath: string): Promise<ImageSize> {
  const fd = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(512 * 1024);
    const { bytesRead } = await fd.read(buf, 0, buf.length, 0);
    const data = buf.subarray(0, bytesRead);

    // PNG — IHDR at offset 16 / 20
    if (
      data.length >= 24 &&
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47
    ) {
      return {
        width: data.readUInt32BE(16),
        height: data.readUInt32BE(20),
      };
    }

    const tiff = parseTiffDimensions(data);
    if (tiff) return tiff;

    const jpeg = parseJpegDimensions(data);
    if (jpeg) return jpeg;

    return { width: 0, height: 0 };
  } finally {
    await fd.close();
  }
}

/** Public URL for a file under `code/data/<caseId>/` (served by `/api/cases/.../file/...`). */
export function caseFileUrl(caseId: string, relPath: string): string {
  return `/api/cases/${encodeURIComponent(caseId)}/file/${relPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export interface DziXmlMeta {
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
}

/** Parse Deep Zoom `.dzi` XML (libvips `dzsave` output). */
export async function readDziXmlMeta(dziFilePath: string): Promise<DziXmlMeta | null> {
  let xml: string;
  try {
    xml = await fs.readFile(dziFilePath, "utf8");
  } catch {
    return null;
  }
  const tileSize = Number(xml.match(/\bTileSize="(\d+)"/)?.[1] ?? "256") || 256;
  const overlap = Number(xml.match(/\bOverlap="(\d+)"/)?.[1] ?? "1") || 1;

  const sizeTag = xml.match(/<Size([^/>]*)\/?>/);
  if (!sizeTag) return null;
  const attrs = sizeTag[1] ?? "";
  const wAttr = attrs.match(/\bWidth="(\d+)"/);
  const hAttr = attrs.match(/\bHeight="(\d+)"/);
  const width = wAttr ? Number(wAttr[1]) : 0;
  const height = hAttr ? Number(hAttr[1]) : 0;
  if (!width || !height) return null;

  return { width, height, tileSize, overlap };
}

/**
 * Deep Zoom pyramid — OpenSeadragon loads tiles on demand (smooth zoom on huge WSIs).
 */
export function buildDziTileSource(
  caseId: string,
  viewerRelPath: string,
  meta: DziXmlMeta,
): DziTileSourceConfig {
  return {
    kind: "dzi",
    url: caseFileUrl(caseId, viewerRelPath),
    width: meta.width,
    height: meta.height,
    tileSize: meta.tileSize,
    overlap: meta.overlap,
  };
}

/**
 * Build a TileSource description for OpenSeadragon `type: "image"`.
 * `viewerRelPath` is relative to the case folder (e.g. `stitched.jpg` or `thumbnail.png`).
 */
export function buildTileSource(
  caseId: string,
  viewerRelPath: string,
  viewerSize: ImageSize,
): TileSourceConfig {
  return {
    kind: "image",
    url: caseFileUrl(caseId, viewerRelPath),
    width: viewerSize.width || 1,
    height: viewerSize.height || 1,
  };
}
