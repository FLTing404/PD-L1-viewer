"use client";

import { createContext, useContext } from "react";
import type OpenSeadragon from "openseadragon";

export interface ViewerContextValue {
  /** 左侧主 WSI viewer（点击选 patch、导航图） */
  viewer: OpenSeadragon.Viewer | null;
  /** 右侧同源 WSI + TPS 热力叠层 */
  heatmapViewer: OpenSeadragon.Viewer | null;
  ready: boolean;
}

export const ViewerContext = createContext<ViewerContextValue>({
  viewer: null,
  heatmapViewer: null,
  ready: false,
});

export function useOsdViewer(): ViewerContextValue {
  return useContext(ViewerContext);
}
