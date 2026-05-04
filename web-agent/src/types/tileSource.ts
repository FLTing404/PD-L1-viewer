export type TileSourceConfig =
  | {
      kind: "image";
      url: string;
      width: number;
      height: number;
    }
  | {
      kind: "dzi";
      url: string;
      width: number;
      height: number;
      tileSize: number;
      overlap: number;
    }
  | {
      kind: "iiif";
      infoUrl: string;
    };
