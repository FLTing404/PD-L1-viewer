import { create } from "zustand";
import type {
  CaseManifest,
  CaseSummary,
  CellRecord,
  PatchBucket,
  PatchEntry,
} from "@/types/case";

export type PanelLayer = "cell_class" | "center_prob" | "heatmap_overlay";

export type PanelLayers = Record<PanelLayer, boolean>;

export type FetchStatus = "idle" | "loading" | "ready" | "error";

export type GallerySort = "desc" | "asc";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export type ChatStatus = "idle" | "streaming" | "error";

const DEFAULT_THRESHOLD = 0.5;
export const GALLERY_PAGE_SIZE = 16;
/** 左侧边栏竖排列表每页条数（略多于网格，仍以滚动为主） */
export const GALLERY_PAGE_SIZE_SIDEBAR = 24;

export const DEFAULT_PANEL_LAYERS: PanelLayers = {
  cell_class: true,
  center_prob: false,
  heatmap_overlay: true,
};

export const PREVIEW_TILE_MIN = 160;
export const PREVIEW_TILE_MAX = 720;
export const PREVIEW_TILE_DEFAULT = 160;

export interface ViewerState {
  caseList: CaseSummary[];
  caseListStatus: FetchStatus;
  caseListError?: string;

  caseId: string | null;
  manifest: CaseManifest | null;
  manifestStatus: FetchStatus;
  manifestError?: string;

  selectedPatchId: string | null;
  cells: CellRecord[] | null;
  cellsStatus: FetchStatus;
  cellsError?: string;

  threshold: number;
  panelLayers: PanelLayers;
  previewTileSize: number;

  // New: right-side single-image layer selector
  selectedLayer: PanelLayer;

  // New: left-bottom Patch Gallery state
  galleryBucket: PatchBucket;
  gallerySort: GallerySort;
  galleryPage: number;

  // New: viewer fly-to bridge from gallery -> main viewer
  pendingFlyToPatchId: string | null;

  // New: AI Assistant chat state
  chatMessages: ChatMessage[];
  chatStatus: ChatStatus;
  chatError?: string;

  loadCaseList: () => Promise<void>;
  setCase: (caseId: string) => Promise<void>;
  setSelectedPatch: (patchId: string | null) => Promise<void>;
  togglePanelLayer: (layer: PanelLayer) => void;
  setPanelLayer: (layer: PanelLayer, enabled: boolean) => void;
  setPreviewTileSize: (size: number) => void;
  setSelectedLayer: (layer: PanelLayer) => void;

  setGalleryBucket: (bucket: PatchBucket) => void;
  setGallerySort: (sort: GallerySort) => void;
  setGalleryPage: (page: number) => void;
  flyToPatch: (patchId: string) => void;
  clearPendingFlyTo: () => void;

  appendChatMessage: (msg: ChatMessage) => void;
  updateAssistantMessage: (id: string, content: string) => void;
  resetChat: () => void;
  setChatStatus: (status: ChatStatus, error?: string) => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  caseList: [],
  caseListStatus: "idle",

  caseId: null,
  manifest: null,
  manifestStatus: "idle",

  selectedPatchId: null,
  cells: null,
  cellsStatus: "idle",

  threshold: DEFAULT_THRESHOLD,
  panelLayers: { ...DEFAULT_PANEL_LAYERS },
  previewTileSize: PREVIEW_TILE_DEFAULT,

  selectedLayer: "cell_class",

  galleryBucket: "TPS_50",
  gallerySort: "desc",
  galleryPage: 0,

  pendingFlyToPatchId: null,

  chatMessages: [],
  chatStatus: "idle",

  loadCaseList: async () => {
    set({ caseListStatus: "loading", caseListError: undefined });
    try {
      const data = await fetchJson<{ cases: CaseSummary[] }>("/api/cases");
      set({ caseList: data.cases, caseListStatus: "ready" });
      const { caseId } = get();
      if (!caseId && data.cases.length > 0) {
        await get().setCase(data.cases[0].caseId);
      }
    } catch (err) {
      set({ caseListStatus: "error", caseListError: String(err) });
    }
  },

  setCase: async (caseId: string) => {
    set({
      caseId,
      manifest: null,
      manifestStatus: "loading",
      manifestError: undefined,
      selectedPatchId: null,
      cells: null,
      cellsStatus: "idle",
      galleryPage: 0,
      chatMessages: [],
      chatStatus: "idle",
    });
    try {
      const manifest = await fetchJson<CaseManifest>(
        `/api/cases/${encodeURIComponent(caseId)}/manifest`,
      );
      set({ manifest, manifestStatus: "ready" });
    } catch (err) {
      set({ manifestStatus: "error", manifestError: String(err) });
    }
  },

  setSelectedPatch: async (patchId: string | null) => {
    set({
      selectedPatchId: patchId,
      cells: null,
      cellsStatus: patchId ? "loading" : "idle",
      cellsError: undefined,
    });
    if (!patchId) return;
    const caseId = get().caseId;
    if (!caseId) return;
    try {
      const data = await fetchJson<{ cells: CellRecord[] }>(
        `/api/cases/${encodeURIComponent(caseId)}/patches/${encodeURIComponent(
          patchId,
        )}/cells`,
      );
      // Drop stale results if user switched patches mid-flight.
      if (get().selectedPatchId !== patchId) return;
      set({ cells: data.cells, cellsStatus: "ready" });
    } catch (err) {
      if (get().selectedPatchId !== patchId) return;
      set({ cellsStatus: "error", cellsError: String(err) });
    }
  },

  togglePanelLayer: (layer: PanelLayer) =>
    set((state) => ({
      panelLayers: {
        ...state.panelLayers,
        [layer]: !state.panelLayers[layer],
      },
    })),
  setPanelLayer: (layer: PanelLayer, enabled: boolean) =>
    set((state) => ({
      panelLayers: { ...state.panelLayers, [layer]: enabled },
    })),
  setPreviewTileSize: (size: number) =>
    set({
      previewTileSize: Math.max(
        PREVIEW_TILE_MIN,
        Math.min(PREVIEW_TILE_MAX, Math.round(size)),
      ),
    }),
  setSelectedLayer: (layer: PanelLayer) => set({ selectedLayer: layer }),

  setGalleryBucket: (bucket: PatchBucket) =>
    set({ galleryBucket: bucket, galleryPage: 0 }),
  setGallerySort: (sort: GallerySort) => set({ gallerySort: sort, galleryPage: 0 }),
  setGalleryPage: (page: number) => set({ galleryPage: Math.max(0, page) }),

  flyToPatch: (patchId: string) => set({ pendingFlyToPatchId: patchId }),
  clearPendingFlyTo: () => set({ pendingFlyToPatchId: null }),

  appendChatMessage: (msg: ChatMessage) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  updateAssistantMessage: (id: string, content: string) =>
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === id ? { ...m, content } : m,
      ),
    })),
  resetChat: () => set({ chatMessages: [], chatStatus: "idle", chatError: undefined }),
  setChatStatus: (status: ChatStatus, error?: string) =>
    set({ chatStatus: status, chatError: error }),
}));

// ---------- selectors ----------

export function selectSelectedPatch(state: ViewerState): PatchEntry | null {
  if (!state.manifest || !state.selectedPatchId) return null;
  return (
    state.manifest.patches.find((p) => p.patchId === state.selectedPatchId) ??
    null
  );
}

export interface CellStats {
  total: number;
  positive: number;
  negative: number;
  borderline: number;
  positiveRatio: number;
  meanProb: number;
}

const BORDERLINE_DELTA = 0.05;

export function computeCellStats(
  cells: CellRecord[] | null,
  threshold: number,
): CellStats {
  const total = cells?.length ?? 0;
  if (!cells || total === 0) {
    return {
      total: 0,
      positive: 0,
      negative: 0,
      borderline: 0,
      positiveRatio: 0,
      meanProb: 0,
    };
  }
  let positive = 0;
  let borderline = 0;
  let sum = 0;
  for (const c of cells) {
    sum += c.cellPosProb;
    if (c.cellPosProb >= threshold) positive++;
    if (Math.abs(c.cellPosProb - threshold) <= BORDERLINE_DELTA) borderline++;
  }
  return {
    total,
    positive,
    negative: total - positive,
    borderline,
    positiveRatio: positive / total,
    meanProb: sum / total,
  };
}

export interface WsiStats {
  patchCount: number;
  totalCells: number;
  meanTps: number;
  maxTps: number;
  bucketCounts: Record<string, number>;
  /** 由各 patch 的 patchPredTps×numCells 四舍五入后求和，用于概览（无需加载全部 cells.csv） */
  positiveCells: number;
  negativeCells: number;
}

export function computeWsiStats(manifest: CaseManifest | null): WsiStats {
  if (!manifest) {
    return {
      patchCount: 0,
      totalCells: 0,
      meanTps: 0,
      maxTps: 0,
      bucketCounts: { TPS_50: 0, TPS_10: 0, TPS_1: 0, Negative: 0 },
      positiveCells: 0,
      negativeCells: 0,
    };
  }
  const buckets: Record<string, number> = {
    TPS_50: 0,
    TPS_10: 0,
    TPS_1: 0,
    Negative: 0,
  };
  let totalCells = 0;
  let positiveCells = 0;
  let tpsSum = 0;
  let tpsMax = 0;
  for (const p of manifest.patches) {
    totalCells += p.numCells;
    positiveCells += Math.round(p.patchPredTps * p.numCells);
    tpsSum += p.patchPredTps;
    if (p.patchPredTps > tpsMax) tpsMax = p.patchPredTps;
    buckets[p.patchPredBucket] = (buckets[p.patchPredBucket] ?? 0) + 1;
  }
  positiveCells = Math.min(positiveCells, totalCells);
  const negativeCells = totalCells - positiveCells;
  return {
    patchCount: manifest.patches.length,
    totalCells,
    meanTps: manifest.patches.length === 0 ? 0 : tpsSum / manifest.patches.length,
    maxTps: tpsMax,
    bucketCounts: buckets,
    positiveCells,
    negativeCells,
  };
}
