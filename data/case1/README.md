# DI2025-030614_2025-04-21_14_59_40

**单个 WSI、仅含推理结果**的数据导出。

## 文件结构

- `thumbnail.png`：WSI 缩略图，保留了比普通缩略图更高的清晰度，方便做全局定位。
- `wsi_summary.json`：这批数据的总体说明，包括来源 WSI、模型 checkpoint、导出阈值。
- `patches_manifest.csv`：20 个 patch 的总清单。
- `patches/<patch_id>/image.jpg`：patch 原图。
- `patches/<patch_id>/patch.json`：该 patch 的 patch 级推理结果。
- `patches/<patch_id>/cells.csv`：该 patch 的细胞级推理结果。
- `preview/`：给内部筛查用的预览图，不建议直接外发。

## cells.csv 字段

- `cell_id`：细胞唯一编号，只在当前 patch 内有效。
- `x`, `y`：细胞中心坐标，基于 `image.jpg` 的像素坐标系。
- `center_prob`：蒸馏定位 heatmap 在该中心位置的概率，可直接用来画热力图或调节点透明度。
- `cell_pos_prob`：双任务模型给出的细胞阳性概率。
- `cell_pred`：基于导出阈值得到的细胞阴/阳性分类结果。

## patch.json 字段

- `patch_pred_bucket`：patch 级四分类结果，取值为 `TPS_50` / `TPS_10` / `TPS_1` / `Negative`。
- `patch_pred_tps`：patch 级 TPS 标量预测。
- `cell_threshold_used`：导出时把 `cell_pos_prob` 转为 `cell_pred` 所用阈值。

## 说明

- 这份导出**不包含 GT**。
- 同一 patch 内，细胞的不同结果通过 `cell_id` 串联。
- 当前一共导出 `20` 个 patch，来自同一个 WSI：`DI2025-030614_2025-04-21_14_59_40`。
