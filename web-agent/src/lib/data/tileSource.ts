import fs from "node:fs/promises";
import { Buffer } from "node:buffer";
import type { WsiSummary } from "@/types/case";
import type { TileSourceConfig } from "@/types/tileSource";

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Read width/height of a PNG file by parsing its IHDR chunk.
 * Avoids pulling in image-parsing dependencies just for thumbnail dimensions.
 * Falls back to a sensible default if the file is not a PNG.
 */
export async function readImageSize(filePath: string): Promise<ImageSize> {
  const fd = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(24);
    await fd.read(buf, 0, 24, 0);
    const isPng =
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;
    if (!isPng) {
      return { width: 0, height: 0 };
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } finally {
    await fd.close();
  }
}

/**
 * Build a TileSource description. Today we serve the case thumbnail as a
 * single-image OpenSeadragon source. When real WSI pyramids land we will
 * inspect `wsi_summary` for a dzi field and return `{ kind: 'dzi', ... }`
 * without changing any frontend code.
 */
export function buildTileSource(
  caseId: string,
  wsiSummary: WsiSummary,
  thumbnailSize: ImageSize,
): TileSourceConfig {
  const fileEndpoint = (relPath: string) =>
    `/api/cases/${encodeURIComponent(caseId)}/file/${relPath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

  return {
    kind: "image",
    url: fileEndpoint(wsiSummary.thumbnailFile),
    width: thumbnailSize.width || 1,
    height: thumbnailSize.height || 1,
  };
}
