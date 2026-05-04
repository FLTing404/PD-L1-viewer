from __future__ import annotations

from pathlib import Path
import shutil

import cv2
import numpy as np


PANEL_NAMES = ("center_prob", "cell_class", "heatmap_overlay")


def detect_panels(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mask = (gray < 245).astype(np.uint8)
    num_labels, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)

    boxes: list[tuple[int, int, int, int]] = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if area < 50000:
            continue
        boxes.append((int(x), int(y), int(w), int(h)))

    boxes.sort(key=lambda item: item[0])
    if len(boxes) < 3:
        raise ValueError(f"Expected 3 panels, found {len(boxes)}")

    return boxes[:3]


def crop_to_512(panel: np.ndarray) -> np.ndarray:
    h, w = panel.shape[:2]
    if h < 512 or w < 512:
        raise ValueError(f"Panel too small: {w}x{h}")

    y0 = (h - 512) // 2
    x0 = (w - 512) // 2
    return panel[y0 : y0 + 512, x0 : x0 + 512]


def ensure_dirs(preview_dir: Path) -> tuple[Path, dict[str, Path]]:
    by_patch_root = preview_dir / "by_patch"
    by_patch_root.mkdir(parents=True, exist_ok=True)

    type_dirs: dict[str, Path] = {}
    for name in PANEL_NAMES:
        target = preview_dir / name
        target.mkdir(parents=True, exist_ok=True)
        type_dirs[name] = target

    return by_patch_root, type_dirs


def process_case_preview(preview_dir: Path) -> None:
    by_patch_root, type_dirs = ensure_dirs(preview_dir)

    png_files = sorted(
        p
        for p in preview_dir.glob("*.png")
        if p.is_file()
    )
    if not png_files:
        raise FileNotFoundError(f"No png files found in {preview_dir}")

    for png_path in png_files:
        patch_id = png_path.stem
        image = cv2.imread(str(png_path))
        if image is None:
            print(f"[WARN] Failed to read image: {png_path}")
            continue

        boxes = detect_panels(image)
        patch_dir = by_patch_root / patch_id
        patch_dir.mkdir(parents=True, exist_ok=True)

        # 保留原始拼图，便于回溯
        shutil.copy2(png_path, patch_dir / "preview_combined.png")

        for panel_name, (x, y, w, h) in zip(PANEL_NAMES, boxes):
            panel = image[y : y + h, x : x + w]
            panel_512 = crop_to_512(panel)

            # 结构1：按 patch 归档
            patch_output = patch_dir / f"{panel_name}.png"
            cv2.imwrite(str(patch_output), panel_512)

            # 结构2：按图层类型归档，便于系统直接读取
            type_output = type_dirs[panel_name] / f"{patch_id}.png"
            cv2.imwrite(str(type_output), panel_512)

        print(f"[OK] {patch_id}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent
    preview_path = repo_root / "data" / "case1" / "preview"
    process_case_preview(preview_path)
    print(f"Done: {preview_path}")
