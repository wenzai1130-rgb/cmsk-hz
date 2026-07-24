import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TIER_COLOR } from "../utils/tier";

/**
 * 项目存货结构 · 矩形树图
 * 从 Grading/index.tsx 抽离,包含:
 * - TreemapCanvas: 容器 + resize 观察 + tile 渲染
 * - squarify: 纯 JS 实现的 Squarified Treemap 布局算法
 */

export type TreemapDatum = {
  value: number;
  projectId: string;
  projectName: string;
  itemStyle: { color: string };
  tier: keyof typeof TIER_COLOR;
  city: string;
};

export type TileInput = { value: number; payload: unknown };
export type Tile = { x: number; y: number; w: number; h: number; payload: unknown };

export function TreemapCanvas({
  data, renderTile,
}: {
  data: TreemapDatum[];
  renderTile: (t: Tile, data: TreemapDatum[]) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tiles = useMemo(() => {
    if (box.w <= 0 || box.h <= 0 || data.length === 0) return [];
    return squarify(
      data.map((d) => ({ value: d.value, payload: d })),
      { x: 0, y: 0, w: box.w, h: box.h },
    );
  }, [data, box]);
  return (
    <div
      ref={containerRef}
      className="inventory-treemap relative flex-1 min-h-0 rounded-lg overflow-hidden bg-[#F8FAFC] h-full"
    >
      {data.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          暂无可分析项目
        </div>
      ) : (
        tiles.map((t) => renderTile(t, data))
      )}
    </div>
  );
}

/* ---------- Squarified Treemap layout (pure JS) ---------- */
export function squarify(items: TileInput[], rect: { x: number; y: number; w: number; h: number }): Tile[] {
  const total = items.reduce((s, it) => s + Math.max(0, it.value), 0);
  if (total <= 0) return [];
  const scale = (rect.w * rect.h) / total;
  const scaled = items.map((it) => ({ ...it, area: Math.max(0, it.value) * scale }));
  const result: Tile[] = [];
  layout(scaled, [], { ...rect });
  return result;

  function worst(row: { area: number }[], w: number) {
    if (row.length === 0) return Infinity;
    const sum = row.reduce((s, r) => s + r.area, 0);
    const rMax = Math.max(...row.map((r) => r.area));
    const rMin = Math.min(...row.map((r) => r.area));
    const w2 = w * w;
    const s2 = sum * sum;
    return Math.max((w2 * rMax) / s2, s2 / (w2 * rMin));
  }
  function layout(rest: typeof scaled, row: typeof scaled, r: { x: number; y: number; w: number; h: number }) {
    const shortSide = Math.min(r.w, r.h);
    if (rest.length === 0) {
      placeRow(row, r, shortSide);
      return;
    }
    const next = rest[0];
    const newRow = [...row, next];
    if (row.length === 0 || worst(newRow, shortSide) <= worst(row, shortSide)) {
      layout(rest.slice(1), newRow, r);
    } else {
      const newR = placeRow(row, r, shortSide);
      layout(rest, [], newR);
    }
  }
  function placeRow(row: typeof scaled, r: { x: number; y: number; w: number; h: number }, shortSide: number) {
    if (row.length === 0) return r;
    const sum = row.reduce((s, x) => s + x.area, 0);
    const rowThickness = sum / shortSide;
    let offset = 0;
    if (r.w >= r.h) {
      // 竖向铺一列宽度=rowThickness
      for (const it of row) {
        const h = it.area / rowThickness;
        result.push({ x: r.x, y: r.y + offset, w: rowThickness, h, payload: it.payload });
        offset += h;
      }
      return { x: r.x + rowThickness, y: r.y, w: r.w - rowThickness, h: r.h };
    } else {
      // 横向铺一行高度=rowThickness
      for (const it of row) {
        const w = it.area / rowThickness;
        result.push({ x: r.x + offset, y: r.y, w, h: rowThickness, payload: it.payload });
        offset += w;
      }
      return { x: r.x, y: r.y + rowThickness, w: r.w, h: r.h - rowThickness };
    }
  }
}
