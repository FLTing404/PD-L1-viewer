export type PredefinedQuestion = {
  id: string;
  /** Button label in the assistant panel */
  label: string;
  /** Mustache-style {{field}} filled from getCaseStats → template mapping */
  template: string;
};

/** Template-only answers from precomputed fields (no free-form clinical claims). */
export const PREDEFINED_QUESTIONS: PredefinedQuestion[] = [
  {
    id: "wsi_tps_overview",
    label: "Summarize TPS for this whole slide",
    template: `Here's what the system has for this slide right now:

- **Case** {{caseId}} · **WSI** {{wsiId}}
- **Label export threshold** (UI-aligned): {{exportThreshold}}
- **Patches counted**: {{wsiPatchCount}} · **Total cells**: {{wsiTotalCells}}
- **Mean / max patch TPS**: {{wsiMeanTpsPct}}% / {{wsiMaxTpsPct}}%
- **Highest-TPS patch** (among exported patches with cells): {{wsiHighestPatchId}} at {{wsiHighestPatchTpsPct}}% · bucket {{wsiHighestPatchBucket}} · WSI px={{wsiHighestPatchPx}}, py={{wsiHighestPatchPy}}
- **Patches by bucket**: Negative {{wsiBucketNeg}}, 1–9% {{wsiBucket1}}, 10–49% {{wsiBucket10}}, ≥50% {{wsiBucket50}}
- **Positive / negative cells** (patch TPS × cell counts): {{wsiPosCells}} / {{wsiNegCells}}

These values are produced by this viewer’s pipeline (same rules as the charts). **They are not a clinical diagnosis—physician confirmation is required.**`,
  },
  {
    id: "selection_roi_summary",
    label: "What does my current ROI show?",
    template: `Here’s the ROI summary (same logic as the Selection ROI panel):

- **ROI active**: {{hasRoi}}
- **Snapped rectangle (WSI coords)**: x={{roiX}}, y={{roiY}}, w={{roiW}}, h={{roiH}}
- **Patch slots** (including synthetic grid slots): {{roiPatchCount}} · **Synthetic-only slots**: {{roiSynthPatchCount}}
- **Cells** · total {{roiTotalCells}} · positive {{roiPosCells}} · negative {{roiNegCells}}
- **Cell-weighted mean TPS in ROI**: {{roiMeanTpsPct}}%
- **Patch buckets (with cells)**: Neg {{roiBucketNeg}}, 1–9% {{roiBucket1}}, 10–49% {{roiBucket10}}, ≥50% {{roiBucket50}}

**These metrics are not a clinical diagnosis—physician confirmation is required.**

If no ROI is active, draw a box on the slide first and try again.`,
  },
  {
    id: "selected_patch_detail",
    label: "Break down the patch I’ve selected",
    template: `Details for the currently selected patch:

- **Patch selected**: {{hasPatch}}
- **Patch ID** {{patchId}} · **Bucket** {{patchBucket}} · **Patch TPS** {{patchTpsPct}}%
- **Position** px={{patchPx}}, py={{patchPy}} · **Cells** {{patchNumCells}}
- **At the current threshold**: positive {{patchPosCells}}, negative {{patchNegCells}}, positive fraction {{patchPosRatioPct}}%, mean positive prob. {{patchMeanCellProb}}

**These metrics are not a clinical diagnosis—physician confirmation is required.**

Pick a patch in the gallery or on the viewer to fill in the full row.`,
  },
  {
    id: "wsi_hotspot",
    label: "Where is the highest-TPS patch?",
    template: `Slide-wide hotspot (among exported patches with cells):

- **Patch ID**: {{wsiHighestPatchId}}
- **TPS**: {{wsiHighestPatchTpsPct}}% · **Bucket**: {{wsiHighestPatchBucket}}
- **WSI position**: px={{wsiHighestPatchPx}}, py={{wsiHighestPatchPy}}

Use this as the starting point when hunting for the strongest staining focus on the slide map.

**Not a clinical diagnosis—physician confirmation is required.**`,
  },
  {
    id: "wsi_cell_balance",
    label: "Positive vs negative cells (whole slide)",
    template: `Whole-slide cell counts at the **interactive threshold you set** (cell-level labels use this threshold together with export metadata):

- **Positive cells**: {{wsiPosCells}}
- **Negative cells**: {{wsiNegCells}}
- **Mean / max patch TPS**: {{wsiMeanTpsPct}}% / {{wsiMaxTpsPct}}%

These rolls ups weight patch TPS by cell counts across patches.

**Not a clinical diagnosis—physician confirmation is required.**`,
  },
  {
    id: "roi_compare_wsi",
    label: "Compare ROI to whole slide",
    template: `ROI vs whole slide (same pipeline rules as the Selection ROI panel):

- **ROI active**: {{hasRoi}}

**Whole slide**
- Mean patch TPS: {{wsiMeanTpsPct}}% · Patches: {{wsiPatchCount}} · Cells: {{wsiTotalCells}}
- Buckets: Neg {{wsiBucketNeg}}, 1–9% {{wsiBucket1}}, 10–49% {{wsiBucket10}}, ≥50% {{wsiBucket50}}

**ROI (when active)**
- Mean TPS in ROI (cell-weighted): {{roiMeanTpsPct}}%
- Patch slots: {{roiPatchCount}} · Cells: {{roiTotalCells}} · Pos / neg: {{roiPosCells}} / {{roiNegCells}}
- Buckets: Neg {{roiBucketNeg}}, 1–9% {{roiBucket1}}, 10–49% {{roiBucket10}}, ≥50% {{roiBucket50}}

If **ROI active** is No, draw a rectangle on the slide first to populate ROI metrics.

**Not a clinical diagnosis—physician confirmation is required.**`,
  },
  {
    id: "label_threshold",
    label: "What threshold is used for cell labels?",
    template: `Threshold context for this viewer session:

- **Label export threshold** (manifest / UI-aligned exports): {{exportThreshold}}
- **Interactive threshold** for patch-level summaries is sent with each request—the Selection ROI panel and patch stats update when you move it.

Quick prompts use the threshold slider state plus manifest exports so numbers stay consistent with the charts.

**Not a clinical diagnosis—physician confirmation is required.**`,
  },
  {
    id: "wsi_patch_mix",
    label: "How many patches per TPS band?",
    template: `Clinical band counts for **exported patches with cells** (same denominator as the TPS Allocation strip):

| Band | Count |
|------|-------|
| Negative (<1%) | {{wsiBucketNeg}} |
| 1–9% | {{wsiBucket1}} |
| 10–49% | {{wsiBucket10}} |
| ≥50% | {{wsiBucket50}} |

**Total patches in roll-up**: {{wsiPatchCount}}

**Not a clinical diagnosis—physician confirmation is required.**`,
  },
];

const byId = new Map(PREDEFINED_QUESTIONS.map((q) => [q.id, q]));

export function getPredefinedQuestion(id: string): PredefinedQuestion | undefined {
  return byId.get(id);
}
