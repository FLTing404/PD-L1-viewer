import type { TileSourceConfig } from "./tileSource";

export type PatchBucket = "TPS_50" | "TPS_10" | "TPS_1" | "Negative";

export interface PatchEntry {
  patchId: string;
  imageFile: string;
  patchJson: string;
  cellsCsv: string;
  numCells: number;
  patchPredBucket: PatchBucket;
  patchPredTps: number;
  px: number;
  py: number;
  width: number;
  height: number;
}

export interface WsiSummary {
  wsiId: string;
  kfbPath?: string;
  thumbnailFile: string;
  numExportedPatches: number;
  modelCheckpoint?: string;
  bestCellThresholdFromModel?: number;
  cellThresholdUsedForExportLabels: number;
  selectionNotes?: string[];
}

export interface WsiMeta {
  wsiWidth: number;
  wsiHeight: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  thumbScaleX: number;
  thumbScaleY: number;
  patchSize: number;
}

export interface CaseSummary {
  caseId: string;
  wsiId: string;
  numExportedPatches: number;
  /** Mean patch-level TPS in 0–1, from `patches_manifest.csv`. */
  meanPatchTps: number;
  /** Thumbnail path under the case directory (e.g. `thumbnail.png`). */
  thumbnailRelative: string;
}

export interface CaseManifest {
  caseId: string;
  wsiSummary: WsiSummary;
  patches: PatchEntry[];
  wsiMeta: WsiMeta;
  tileSource: TileSourceConfig;
}

export interface CellRecord {
  cellId: number;
  x: number;
  y: number;
  centerProb: number;
  cellPosProb: number;
  cellPred: "Positive" | "Negative";
}

export interface PatchCellsResponse {
  patchId: string;
  threshold: number;
  cells: CellRecord[];
}
