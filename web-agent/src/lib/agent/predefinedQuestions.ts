export type PredefinedQuestion = {
  id: string;
  /** Button label in the assistant panel */
  label: string;
  /** Mustache-style {{field}} filled from getCaseStats → template mapping */
  template: string;
};

const DISCLAIMER =
  "**Not a clinical diagnosis — physician confirmation is required.**";

/** Template-only answers from precomputed fields (no free-form clinical claims). */
export const PREDEFINED_QUESTIONS: PredefinedQuestion[] = [
  {
    id: "wsi_tps_overview",
    label: "Summarize TPS for this whole slide",
    template: `### Whole-Slide TPS Summary

| Metric | Value |
|--------|-------|
| Case / WSI | {{caseId}} / {{wsiId}} |
| Patches counted | {{wsiPatchCount}} |
| Total cells | {{wsiTotalCells}} |
| Positive / negative cells | {{wsiPosCells}} / {{wsiNegCells}} |
| Mean / max patch TPS | {{wsiMeanTpsPct}}% / {{wsiMaxTpsPct}}% |
| Label export threshold | {{exportThreshold}} |

**Patches by TPS band:**

| Band | Count |
|------|-------|
| <1% | {{wsiBucketNeg}} |
| 1–9% | {{wsiBucket1}} |
| 10–49% | {{wsiBucket10}} |
| ≥50% | {{wsiBucket50}} |

**Highest-TPS patch:** {{wsiHighestPatchId}} at {{wsiHighestPatchTpsPct}}% ({{wsiHighestPatchBucket}}) — position ({{wsiHighestPatchPx}}, {{wsiHighestPatchPy}})

${DISCLAIMER}`,
  },
  {
    id: "selection_roi_summary",
    label: "What does my current ROI show?",
    template: `{{roiReportMarkdown}}`,
  },
  {
    id: "selected_patch_detail",
    label: "Break down the patch I've selected",
    template: `### Selected Patch Detail

| Metric | Value |
|--------|-------|
| Patch selected | {{hasPatch}} |
| Patch ID | {{patchId}} |
| TPS bucket | {{patchBucket}} |
| Patch TPS | {{patchTpsPct}}% |
| Position | ({{patchPx}}, {{patchPy}}) |
| Total cells | {{patchNumCells}} |
| Positive / negative cells | {{patchPosCells}} / {{patchNegCells}} |
| Positive fraction | {{patchPosRatioPct}}% |
| Mean positive prob. | {{patchMeanCellProb}} |

Pick a patch in the gallery or on the viewer to fill in the full row.

${DISCLAIMER}`,
  },
  {
    id: "wsi_hotspot",
    label: "Where is the highest-TPS patch?",
    template: `### Slide-Wide Hotspot

| Metric | Value |
|--------|-------|
| Patch ID | {{wsiHighestPatchId}} |
| TPS | {{wsiHighestPatchTpsPct}}% |
| TPS bucket | {{wsiHighestPatchBucket}} |
| Position | ({{wsiHighestPatchPx}}, {{wsiHighestPatchPy}}) |

Use this as the starting point when hunting for the strongest staining focus on the slide map.

${DISCLAIMER}`,
  },
  {
    id: "wsi_cell_balance",
    label: "Positive vs negative cells (whole slide)",
    template: `### Whole-Slide Cell Balance

| Metric | Value |
|--------|-------|
| Positive cells | {{wsiPosCells}} |
| Negative cells | {{wsiNegCells}} |
| Mean / max patch TPS | {{wsiMeanTpsPct}}% / {{wsiMaxTpsPct}}% |

${DISCLAIMER}`,
  },
  {
    id: "roi_compare_wsi",
    label: "Compare ROI to whole slide",
    template: `### ROI vs Whole Slide

**ROI active:** {{hasRoi}}

| Metric | Whole Slide | ROI |
|--------|-------------|-----|
| Mean patch TPS | {{wsiMeanTpsPct}}% | {{roiMeanTpsPct}}% |
| Patches | {{wsiPatchCount}} | {{roiPatchCount}} |
| Total cells | {{wsiTotalCells}} | {{roiTotalCells}} |
| Positive / negative | {{wsiPosCells}} / {{wsiNegCells}} | {{roiPosCells}} / {{roiNegCells}} |
| <1% | {{wsiBucketNeg}} | {{roiBucketNeg}} |
| 1–9% | {{wsiBucket1}} | {{roiBucket1}} |
| 10–49% | {{wsiBucket10}} | {{roiBucket10}} |
| ≥50% | {{wsiBucket50}} | {{roiBucket50}} |

If **ROI active** is No, draw a rectangle on the slide first to populate ROI metrics.

${DISCLAIMER}`,
  },
  {
    id: "label_threshold",
    label: "What threshold is used for cell labels?",
    template: `### Threshold Context

| Metric | Value |
|--------|-------|
| Label export threshold | {{exportThreshold}} |

The **interactive threshold** for patch-level summaries is sent with each request — the Selection ROI panel and patch stats update when you move it.

${DISCLAIMER}`,
  },
  {
    id: "wsi_patch_mix",
    label: "How many patches per TPS band?",
    template: `### Patches per TPS Band

| Band | Count |
|------|-------|
| <1% | {{wsiBucketNeg}} |
| 1–9% | {{wsiBucket1}} |
| 10–49% | {{wsiBucket10}} |
| ≥50% | {{wsiBucket50}} |

**Total patches:** {{wsiPatchCount}}

${DISCLAIMER}`,
  },
];

const byId = new Map(PREDEFINED_QUESTIONS.map((q) => [q.id, q]));

export function getPredefinedQuestion(id: string): PredefinedQuestion | undefined {
  return byId.get(id);
}
