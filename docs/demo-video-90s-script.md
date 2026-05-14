# 演示录屏脚本要点

## 0. 数据加载

- **操作**：点击 **Import** 扫描数据根，列表出现后略作停顿。
- **旁白**：用户通过目录导入触发服务端扫描，病例列表按整图TPS高到低加载。
- **译文（EN）**：Folder import triggers a server-side scan; The case list loads sorted by whole-slide TPS from high to low.

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

- **操作**：选定一例 WSI（演示可选用含患者侧双组织岛与对照侧的切片）；主视图缩放、平移；打开 **TPS 热力图（KDE）** 观察高响应区域的空间分布；在 **导航概览** 上点击目标位置，使主视口 **跨越大面积空白** 快速锚定至远端组织岛（对照论文中同片离散排版场景）。若切片含两块离散组织区，在**导航概览**上分别跳转至患者侧与对照侧组织岛，再各自框选 ROI 作对比。
- **旁白**：用户可借助热力图快速定位感兴趣区域并缩放查看；在**导航概览**上点击可跨越大留白跳转至另一组织岛，减少无效平移与空间迷失。对含患者侧与对照侧离岛的切片，ROI 便于分别检视两侧并支撑同片远距离锚定与视觉定标。**结合本例热力图**：患者侧穿刺沿扫描方向跨距较大，经物理制片与后续 **patch 网格导出** 后呈现为两块相邻组织岛；两岛在 KDE 着色上对比鲜明，提示局部 TPS 空间贡献差异显著。
- **译文（EN）**：Users use the KDE heatmap to locate regions of interest, zoom and pan, and jump across large blank regions via the navigator overview—reducing idle panning and disorientation. For slides with separated patient- and control-side islands, ROIs support bilateral inspection, long-range anchoring, and visual cross-calibration. 

## 3. 局部 ROI 与区域级量化

- **操作**：在患者侧两块相邻组织岛上 **依次** 框选 ROI；释放后矩形**吸附至 patch 网格**；每次框选后查看 **TPS 分布总览**、**Selection ROI** 嵌入统计及图库中与 ROI 相关的分档与列表。
- **旁白**：依次框选后，系统对各自 ROI 内有效 patch 进行 TPS 可视化与统计输出。就本演示病例而言，患者侧汇总层面 TPS 约 **35.7%**（接近关键临床边界），而两块 ROI 的局部结果极度分化：**约 61.2%** 与 **约 13.9%**，凸显「全局边界读数」与「局部异质」并存的风险。
- **译文（EN）**：Draw ROIs on the two adjacent patient islands in sequence; after grid snap, review the TPS overview, embedded Selection ROI stats, and gallery linkage. 
In this demo case, the biopsy is split into two regions showing sharp heatmap contrast.
The overall TPS sits at around 35.7 percent, right at the borderline level. 
Meanwhile the local region of interest values differ dramatically, 
at approximately 61.2 percent versus 13.9 percent, 
which clearly reveals strong spatial heterogeneity across the sample.


## 4. 分档联动、图库检索与 Fly-to

- **操作**：在直方图四个颜色轮流点击一遍，最后点击最严重的，在图库中点击条目，触发 **Fly-to-patch**；在右栏查看 **多图层预览** 与 **细胞阴阳性堆叠条**（时间允许时可调节交互阈值）。
- **旁白**：直方图与图库按临床档位建立**协调联动**。在左侧 patch 图库选中目标条目后，主阅片器与右栏同步聚焦至对应 patch；右栏呈现细胞级追溯证据，展示空间可能性热力图与阳性预测图层。
- **译文（EN）**：
- The histogram and Patch Gallery are coordinated via clinical bins. 
- Selecting a patch entry on the left synchronizes the main viewer and right panel on that patch; 
- the right panel shows cell-level trace evidence, 
- including a Cell probability heatmap and a positive-prediction overlay.

## 5. Pathology Insight

- **操作**：打开 **Pathology Insight**，选择一条 **Quick prompt（guided 模式）**。
- **旁白**：可借助 **Pathology Insight** 围绕当前病例发起追问，获得结构化解读与可复核的分析依据。
- **译文（EN）**：Pathology Insight supports follow-up questions on the current case, yielding structured interpretations and auditable analytical rationale.

