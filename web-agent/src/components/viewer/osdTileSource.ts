import type OpenSeadragon from "openseadragon";
import type { TileSourceConfig } from "@/types/tileSource";

/**
 * Translate our app-level TileSource description into a config OpenSeadragon
 * understands. Today we only emit the `image` kind for thumbnail-only cases;
 * `dzi` and `iiif` are wired so plugging in a real WSI pyramid is a one-liner.
 */
export function toOsdTileSource(
  config: TileSourceConfig,
): OpenSeadragon.TileSourceOptions | string {
  switch (config.kind) {
    case "image": {
      /* Huge single JPEG (e.g. stitched WSI): pyramid improves zoom/pan responsiveness */
      const px = config.width * config.height;
      return {
        type: "image",
        url: config.url,
        buildPyramid: px > 25_000_000,
      } as OpenSeadragon.TileSourceOptions;
    }
    case "dzi":
      return config.url;
    case "iiif":
      return config.infoUrl;
  }
}

export function getImageWidth(config: TileSourceConfig): number {
  switch (config.kind) {
    case "image":
    case "dzi":
      return config.width;
    case "iiif":
      return 0;
  }
}

export function getImageHeight(config: TileSourceConfig): number {
  switch (config.kind) {
    case "image":
    case "dzi":
      return config.height;
    case "iiif":
      return 0;
  }
}
