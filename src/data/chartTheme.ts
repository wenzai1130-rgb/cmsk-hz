/**
 * 全局图表规范 —— 跨页面统一 recharts 配置
 * --------------------------------------------------------------
 * 适用：首页、21年及之前、自助查询，以及全部弹窗中的 recharts 图表。
 *
 * 用法示例：
 *   import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP, CHART_CURSOR_BAR,
 *            BIZ_LEGEND_ORDER, YEAR_LEGEND_ORDER, isFutureMonth } from "@/data/chartTheme";
 *
 *   <CartesianGrid {...CHART_GRID} />
 *   <XAxis tick={CHART_AXIS.tick} axisLine={CHART_AXIS.line} tickLine={false} />
 *   <Tooltip contentStyle={CHART_TOOLTIP.contentStyle}
 *            labelStyle={CHART_TOOLTIP.labelStyle}
 *            itemStyle={CHART_TOOLTIP.itemStyle}
 *            cursor={CHART_CURSOR_BAR} />
 *
 * 规则：
 *  1. 业态 / 年份 / 项目类别颜色必须使用 tokens.ts 中的 BIZ_COLOR / YEAR_COLOR / PROJECT_CATEGORY_COLOR，
 *     禁止在图表组件内硬编码 "#5B8DEF" / "#1677FF" 等具体颜色。
 *  2. legend 顺序固定（见下方 *_LEGEND_ORDER），不要按数据顺序随机展示。
 *  3. tooltip / 坐标轴 / 网格线统一引用本文件常量，不再行内书写 contentStyle。
 *  4. 金额、面积、百分比必须通过 src/lib/format.ts 的 formatAmount / formatPercent 输出。
 *  5. 未来月份不显示柱体 / 折线点，仅保留 X 轴刻度；hover 提示 "该月份尚未发生，暂无数据"。
 */

import { BRAND, STATUS, SURFACE, TEXT } from "@/lib/tokens";

// ============ 语义色（九宫格 / 分类结论统一使用） ============
// 中国财务惯例：红=增/优势，绿=减/关注。此处沿用页面既有 advantage=绿 的语义。
// 使用时优先引用 SEMANTIC.advantage / .watch / .concern，避免各组件散落硬编码。
export const SEMANTIC = {
  advantage: { fg: STATUS.good.fg, bg: STATUS.good.bg, label: "优势区" },
  watch:     { fg: STATUS.warning.fg, bg: STATUS.warning.bg, label: "观察区" },
  concern:   { fg: STATUS.danger.fg, bg: STATUS.danger.bg, label: "关注区" },
} as const;

// ============ 分位档位色（30/70 分位判定）============
// 用于 tooltip 中「在前30分位 / 中间40分位 / 在后30分位」文案配色。
// 与既有 UI 保持一致：优/劣分别沿用 #10B981 与 #DC2626，中间态取品牌蓝。
export const TIER_COLOR = {
  advantage: STATUS.good.fg,
  concern:   STATUS.danger.fg,
  normal:    BRAND.primary,
} as const;

export type TierInfo = { text: string; color: string };
export function tierOf(value: number, low: number, high: number): TierInfo {
  if (value > high) return { text: "在前30分位", color: TIER_COLOR.advantage };
  if (value < low)  return { text: "在后30分位", color: TIER_COLOR.concern };
  return { text: "中间40分位", color: TIER_COLOR.normal };
}

// ============ 坐标轴 ============
export const CHART_AXIS = {
  tick: { fontSize: 12, fill: TEXT.tertiary },
  line: { stroke: SURFACE.borderLight },
} as const;

// ============ 网格线 ============
export const CHART_GRID = {
  stroke: "#EEF2F7",
  strokeDasharray: "3 3" as const,
  vertical: false,
} as const;

// ============ Tooltip ============
export const CHART_TOOLTIP = {
  contentStyle: {
    background: SURFACE.card,
    border: `1px solid ${SURFACE.borderDefault}`,
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
    fontSize: 12,
    padding: "10px 12px",
  },
  labelStyle: { color: TEXT.primary, fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: TEXT.secondary, padding: "2px 0" },
} as const;

// 柱图 hover 背景（淡蓝）
export const CHART_CURSOR_BAR = { fill: "rgba(22,119,255,0.06)" } as const;
// 折线 hover 竖线
export const CHART_CURSOR_LINE = { stroke: "#CBD5E1", strokeDasharray: "3 3" } as const;

// ============ 图例 ============
export const CHART_LEGEND = {
  wrapperStyle: { fontSize: 12, color: TEXT.secondary, paddingTop: 8 },
  iconType: "circle" as const,
  iconSize: 8,
} as const;

// 图例固定顺序（同一维度跨页面顺序一致）
export const BIZ_LEGEND_ORDER     = ["住宅", "公寓", "车位", "商业", "写字楼", "其他"] as const;
export const YEAR_LEGEND_ORDER    = ["21年及之前", "2022", "2023", "2024", "2025", "2026"] as const;
export const PROJECT_CATEGORY_ORDER = ["综合型大盘", "正常持销", "公商办", "滞销项目", "车位 / 尾盘"] as const;

// ============ 几何样式 ============
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const BAR_RADIUS_HORIZONTAL: [number, number, number, number] = [0, 4, 4, 0];
export const BAR_MAX_SIZE = 28;
export const LINE_STROKE_WIDTH = 2;
export const LINE_DOT_RADIUS = 2.5;
export const LINE_ACTIVE_DOT_RADIUS = 4;

// ============ 环形图 ============
export const DONUT = {
  innerRadius: "62%",
  outerRadius: "92%",
  paddingAngle: 1.5,
  stroke: "#FFFFFF",
  strokeWidth: 1,
} as const;

// ============ 空态 / 未来月份 ============
export const EMPTY_TEXT = "暂无数据";
export const FUTURE_TOOLTIP_TEXT = "该月份尚未发生，暂无数据";

/**
 * 判断给定月份是否晚于当前所选月份（YYYY-MM 字符串比较即可）。
 * @param monthKey  形如 "2025-06"
 * @param current   当前选中月份，形如 "2025-04"
 */
export function isFutureMonth(monthKey: string, current: string): boolean {
  if (!monthKey || !current) return false;
  return monthKey > current;
}

/**
 * 将数据序列中未来月份的指标值置为 null，以阻断柱体 / 折线点渲染。
 * recharts 对 null 值不绘制柱 / 点，会保留 X 轴刻度，与规范一致。
 */
export function maskFuture<T extends Record<string, any>>(
  rows: T[],
  monthKey: keyof T,
  metricKeys: (keyof T)[],
  current: string,
): T[] {
  return rows.map((r) => {
    if (!isFutureMonth(String(r[monthKey]), current)) return r;
    const out: any = { ...r };
    for (const k of metricKeys) out[k] = null;
    return out;
  });
}
