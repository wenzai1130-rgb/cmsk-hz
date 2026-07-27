/**
 * 全局颜色 token —— 跨页面统一色板
 * --------------------------------------------------------------
 * 同一业务含义在不同页面（首页 / 21年及之前 / 自助查询）必须引用
 * 本文件中的 token，避免颜色不一致造成的口径误解。
 *
 * 仅集中颜色规范，不涉及布局、字号、图表类型等。
 */

// ============ 品牌主色 ============
export const BRAND = {
  primary: "#1677FF",
  primaryHover: "#4D94FF",
  primaryActive: "#0E5FD9",
  primaryLight: "#EFF6FF",
} as const;

// ============ 文本 / 背景 / 边框 ============
export const TEXT = {
  primary: "#111827",
  secondary: "#475569",
  tertiary: "#64748B",
  disabled: "#94A3B8",
} as const;

export const SURFACE = {
  page: "#F5F7FB",
  card: "#FFFFFF",
  subtle: "#F8FAFD",
  borderDefault: "#E2E8F0",
  borderLight: "#EEF1F6",
} as const;

// ============ 状态色（仅用于状态判断，不可与业务分类色混用） ============
export const STATUS = {
  good:    { fg: "#10B981", bg: "#ECFDF5" },
  normal:  { fg: "#1677FF", bg: "#EFF6FF" },
  warning: { fg: "#F59E0B", bg: "#FFFBEB" },
  danger:  { fg: "#EF4444", bg: "#FEF2F2" },
} as const;

// 红增绿减（独立管理，不与业态/年份色混用）
export const TREND = {
  up: "#EF4444",
  down: "#10B981",
} as const;

// ============ 通用 KPI 强调色（卡片渐变） ============
export type Accent = { from: string; to: string; soft: string; bar: string };
export const ACCENT: Record<"blue" | "violet" | "orange" | "indigo" | "rose" | "amber" | "teal" | "cyan" | "slate", Accent> = {
  blue:   { from: "#1677FF", to: "#60A5FA", soft: "#EFF6FF", bar: "#1677FF" },
  violet: { from: "#7C3AED", to: "#A78BFA", soft: "#F3F0FF", bar: "#7C3AED" },
  orange: { from: "#F59E0B", to: "#FBBF24", soft: "#FFFBEB", bar: "#F59E0B" },
  indigo: { from: "#6366F1", to: "#8B93F2", soft: "#EEF2FF", bar: "#6366F1" },
  rose:   { from: "#EF4444", to: "#F87171", soft: "#FEF2F2", bar: "#EF4444" },
  amber:  { from: "#F59E0B", to: "#FBBF24", soft: "#FFFBEB", bar: "#F59E0B" },
  teal:   { from: "#10B981", to: "#34D399", soft: "#ECFDF5", bar: "#10B981" },
  cyan:   { from: "#0E84B8", to: "#3FB6E0", soft: "#EAF6FB", bar: "#0E84B8" },
  slate:  { from: "#64748B", to: "#94A3B8", soft: "#F1F5F9", bar: "#64748B" },
};

// ============ 业务分类色 —— 业态 ============
// 同一业态在所有图表 / 表格 / tooltip / legend 中必须使用同一颜色
export const DONUT_PALETTE = [
  "#24A1FF",
  "#5ACD7A",
  "#F8C541",
  "#4CC3F7",
  "#FF7874",
  "#CBABE5",
  "#02BFB2",
  "#FF7875",
  "#9CD023",
  "#70C1CA",
] as const;

export const BIZ_COLOR: Record<string, string> = {
  住宅:    DONUT_PALETTE[0],
  公寓:    DONUT_PALETTE[1],
  车位:    DONUT_PALETTE[6],
  车位配套: DONUT_PALETTE[6],
  商业:    DONUT_PALETTE[2],
  写字楼:  DONUT_PALETTE[7],
  其他:    DONUT_PALETTE[9],
};

// 通用图表色板（按 index 取色，与业态色同源）
export const CHART_PALETTE = DONUT_PALETTE;

export const colorOfBiz = (name: string, idx = 0): string =>
  BIZ_COLOR[name] ?? CHART_PALETTE[idx % CHART_PALETTE.length];

// ============ 业务分类色 —— 拿地年份 ============
export const YEAR_COLOR: Record<string, string> = {
  "21年及之前": "#94A3B8",
  "2022":      "#0E84B8",
  "2023":      "#10B981",
  "2024":      "#A78BFA",
  "2025":      "#1677FF",
  "2026":      "#F59E0B",
};

// ============ 业务分类色 —— 项目类别 ============
export const PROJECT_CATEGORY_COLOR: Record<string, Accent> = {
  综合型大盘:   ACCENT.indigo,
  正常持销:     ACCENT.teal,
  公商办:       ACCENT.cyan,
  滞销项目:     ACCENT.rose,
  "车位 / 尾盘": ACCENT.slate,
  车位尾盘:     ACCENT.slate,
};

// ============ 统一 tooltip 样式 ============
export const TOOLTIP_STYLE = {
  background: SURFACE.card,
  border: `1px solid ${SURFACE.borderDefault}`,
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
  fontSize: 12,
  padding: "6px 10px",
} as const;
