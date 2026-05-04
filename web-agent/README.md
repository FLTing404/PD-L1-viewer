# TPS Patch Analysis – web-agent

并行的 PD-L1 TPS 辅助分析前端，与 `code/web` 共享同一份 `code/data/<caseId>` 数据，但 UI 重新设计：

- **顶栏**：标题、Case 选择器、Case ID、Export Report 按钮（占位）。
- **左列**
  - 上：OpenSeadragon WSI 主视图（含右上 navigator + 右下 3 图浮层 cell_class / center_prob / heatmap_overlay）。
  - 中：TPS Distribution Overview（4 段彩色条 + 占比文字）。
  - 中：WSI Summary（紧凑 grid）。
  - 下：Patch Gallery — 4 桶 Tabs (`>50% / 10–50% / 1–10% / <1%`) + 排序 + 缩略图网格 + 分页，点击缩略图同步选中并 fly 到主视图对应区域。
- **右列**
  - 上：Selected Patch — 单图 + Cell Class / Center Prob / Heatmap 三选一 layer 切换。
  - 中：TPS Score 环形图 + 细胞统计（Total / Positive / Negative / Borderline / Mean prob.）。
  - 中：Patch Location Info — Position, Patch size, Model TPS, Cell count, Threshold, Magnification。
  - 下：AI Assistant — DeepSeek 流式聊天，自动注入当前 case + 选中 patch 的统计上下文。

> 所有数值均为 **AI 模型推理结果**，不作为独立诊断依据。

## 本地启动

```bash
cd code/web-agent
pnpm install

# AI Assistant 需要 DeepSeek API key
cp .env.local.example .env.local
# 编辑 .env.local 填入 DEEPSEEK_API_KEY=sk-xxxxxxxx

pnpm dev
# http://localhost:3000
```

数据目录默认 `../data`（即 `code/data/`）。需要换路径：

```bash
$env:CASES_ROOT = "D:\path\to\my\cases"
pnpm dev
```

## 与 `code/web` 的关系

- 服务端 API 接口（`/api/cases`, `/api/cases/[caseId]/manifest`, `/api/cases/[caseId]/patches/[patchId]/cells`, `/api/cases/[caseId]/file/[...path]`）一一对应、协议兼容。
- 类型 (`src/types/`)、解析器 (`src/lib/data/`)、OSD viewer 组件 (`src/components/viewer/`) 与 shadcn 基础组件 (`src/components/ui/`) 均与原版同源。
- 新增：右侧 `Selected Patch` 单图层切换、四桶 Patch Gallery、`/api/chat` DeepSeek 流式代理与 AI Assistant 面板。
- 删除：顶栏的全局 layer 多选切换（layer 现仅由右侧 Selected Patch 单选控制）。

## AI Assistant 工作机制

`POST /api/chat` 在转发到 DeepSeek 之前，会读取当前 `caseId`，组装一段英文 system prompt，包含：

- WSI ID / patch 总数 / bucket 占比 / 平均与最高 TPS / 阈值。
- 若有选中 patch：patch ID / bucket / TPS / 细胞数 / 在 WSI 中的坐标，以及当前阈值下的 positive / negative / borderline / 平均阳性概率。

提示规则要求模型：

- 明确说明所有结果是 AI 推理而非诊断。
- 关于 PD-L1 用药相关问题，可以引用公开指南级 cut-off（如 NSCLC TPS ≥1% / ≥50%），但必须明确要求医生确认。
- 不输出确诊、不输出处方。

模型回复以 SSE 流式透传给前端，前端逐 token 渲染（Markdown）。

## 配置

| Env | 默认 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 无 | 缺失时 `/api/chat` 返回 503，UI 会展示提示 |
| `CASES_ROOT` | `..\data` | 病例根目录 |
