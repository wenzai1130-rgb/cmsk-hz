/**
 * 多维分析（Grading）页面 · 共享常量
 * --------------------------------------------------------------
 * 抽离原因：`PANEL_CLS` / `TOOLTIP_STYLE` / `BUBBLE_SIZE_META` / `BubbleSizeKey`
 * 在页面主文件与多个子组件中被广泛引用（20+ 处），集中一处便于统一调整视觉。
 *
 * 注：此处的 TOOLTIP_STYLE 与 `@/lib/tokens` 中的 TOOLTIP_STYLE 语义一致，
 * 目前保持独立以避免跨模块耦合，后续可考虑统一收敛。
 */

// 卡片 / Panel 通用样式
export const PANEL_CLS =
  "bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-shadow";

// recharts Tooltip 容器统一样式
export const TOOLTIP_STYLE = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  boxShadow: "0 6px 18px rgba(15,23,42,0.10)",
  fontSize: 12,
  padding: "10px 12px",
} as const;

// 气泡大小可选口径
export type BubbleSizeKey = "remainingValue" | "salesFloorPrice";

// 气泡大小元数据：控制 recharts ZAxis domain/range、标签、单位、图例样本、数值格式化
export const BUBBLE_SIZE_META: Record<
  BubbleSizeKey,
  {
    label: string;
    unit: string;
    range: [number, number];
    domain: [number, number];
    samples: { size: number; label: string }[];
    formatValue: (v: number) => string;
  }
> = {
  remainingValue: {
    label: "剩余货值",
    unit: "亿元",
    range: [60, 1800],
    domain: [0, 22],
    samples: [
      { size: 10, label: "1亿" },
      { size: 24, label: "10亿" },
      { size: 42, label: "20亿" },
    ],
    formatValue: (v) => `${v.toFixed(2)} 亿`,
  },
  salesFloorPrice: {
    label: "销售均价",
    unit: "元/㎡",
    range: [60, 1800],
    domain: [0, 150000],
    samples: [
      { size: 10, label: "3万/㎡" },
      { size: 24, label: "8万/㎡" },
      { size: 42, label: "14万/㎡" },
    ],
    formatValue: (v) => `${(v / 10000).toFixed(2)} 万/㎡`,
  },
};
