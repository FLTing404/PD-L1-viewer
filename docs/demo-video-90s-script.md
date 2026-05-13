# 演示录屏脚本要点

## 0. 数据加载

- **操作**：点击 **Import** 扫描数据根，列表出现后略作停顿。
- **旁白**：用户通过目录导入触发服务端扫描，病例列表按整图TPS高到低加载。
- **译文（EN）**：Folder import triggers a server-side scan; the case list loads sorted by whole-slide TPS from high to low.

## 1. 三列布局（导入后立即）

- **左栏**：标本浏览器（病例摘要与排序）与 **Patch 图库**（分档筛选、与 ROI 联动、Fly-to-patch 触发）。
- **中栏**：基于金字塔的 **WSI 主阅片器**，及下方 **TPS 分布总览**（比例尺直方图、临床分档背景、Selection ROI 嵌入统计）。
- **右栏**：当前选中 patch 的 **多图层预览** 与 **细胞级详情**（异步加载细胞表、与全片基数对照）。
- **旁白**：界面遵循「宏观导航—区域定量—微观追溯」分工：左栏承担病例与 patch 检索，中栏承担全片阅片与 TPS 量化仪表盘，右栏承担 patch 级与细胞级证据展示。
- **译文（EN）**：The layout follows macro navigation, regional quantification, and micro-level tracing: 
- the left rail handles case and patch retrieval, 
- the center rail whole-slide viewing and the TPS dashboard, 
- and the right rail patch- and cell-level evidence.

## 2. 宏观导航、跨空白跳转与双侧读片

- **操作**：选定一例 WSI；主视图缩放、平移；打开 **TPS 热力图（KDE）** 辅助观察高响应区域；在 **导航概览** 上点击目标位置，使主视口 **跨越大面积空白** 快速锚定至远端组织岛（对照论文中同片离散排版场景）。若切片含两块离散组织区，在**导航概览**上分别跳转至患者侧与对照侧组织岛，再各自框选 ROI 作对比。
- **旁白**：用户可打开热力图快速找到感兴趣区域，进行缩放查看；在**导航概览**上点击目标位置可快速跳转至另一组织岛，以降低大留白 WSI 中的无效平移与空间迷失成本。对含患者侧与对照侧离岛的切片，ROI 便于分别检视两侧并支撑同片远距离锚定与视觉定标。
- **译文（EN）**：Users enable the heatmap to locate regions of interest, then zoom and pan; clicking the navigator overview jumps the viewport to another tissue island across large blank regions, reducing idle panning and spatial disorientation. For slides with separated patient- and control-side islands, ROIs support quick inspection of both sides, long-range anchoring on the same slide, and visual cross-calibration.

## 3. 局部 ROI 与区域级量化

- **操作**：框选 ROI，释放后矩形**吸附至 patch 网格**；查看 **TPS 分布总览** 与图库中与 ROI 相关的统计与分档结果。
- **旁白**：感兴趣区域经网格对齐后，系统对 ROI 内有效 patch 进行 TPS 可视化与统计输出。
- **译文（EN）**：After grid alignment, the system visualizes TPS and emits statistical summaries for valid patches inside the ROI.

## 4. 分档联动、图库检索与 Fly-to

- **操作**：在直方图四个颜色轮流点击一遍，最后点击最严重的，在图库中点击条目，触发 **Fly-to-patch**；在右栏查看 **多图层预览** 与 **细胞阴阳性堆叠条**（时间允许时可调节交互阈值）。
- **旁白**：直方图与图库按临床档位建立**协调联动**。在左侧 patch 图库选中目标条目后，主阅片器与右栏同步聚焦至对应 patch；右栏呈现细胞级追溯证据，展示空间可能性热力图与阳性预测图层。
- **译文（EN）**：The histogram and Patch Gallery are coordinated via clinical bins. Selecting a patch entry on the left synchronizes the main viewer and right panel on that patch; the right panel shows cell-level trace evidence, including a Cell probability heatmap and a positive-prediction overlay.

## 5. Pathology Insight

- **操作**：打开 **Pathology Insight**，选择一条 **Quick prompt（guided 模式）**。
- **旁白**：可借助 **Pathology Insight** 围绕当前病例发起追问，获得结构化解读与可复核的分析依据。
- **译文（EN）**：Pathology Insight supports follow-up questions on the current case, yielding structured interpretations and auditable analytical rationale.

