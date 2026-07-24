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
  primary: "#1E293B",
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
  good:    { fg: "#059669", bg: "#ECFDF5" },
  normal:  { fg: "#1677FF", bg: "#EFF6FF" },
  warning: { fg: "#D97706", bg: "#FFF4E6" },
  danger:  { fg: "#DC2626", bg: "#FEF2F2" },
} as const;

// 红增绿减（独立管理，不与业态/年份色混用）
export const TREND = {
  up: "#DC2626",
  down: "#059669",
} as const;

// ============ 通用 KPI 强调色（卡片渐变） ============
export type Accent = { from: string; to: string; soft: string; bar: string };
export const ACCENT: Record<"blue" | "violet" | "orange" | "indigo" | "rose" | "amber" | "teal" | "cyan" | "slate", Accent> = {
  blue:   { from: "#1677FF", to: "#60A5FA", soft: "#EFF6FF", bar: "#1677FF" },
  violet: { from: "#7C3AED", to: "#A78BFA", soft: "#F3F0FF", bar: "#7C3AED" },
  orange: { from: "#F59E0B", to: "#FBBF24", soft: "#FFF4E6", bar: "#F59E0B" },
  indigo: { from: "#6366F1", to: "#8B93F2", soft: "#EEF2FF", bar: "#6366F1" },
  rose:   { from: "#E11D48", to: "#F43F5E", soft: "#FFF1F2", bar: "#E11D48" },
  amber:  { from: "#F59E0B", to: "#FBBF24", soft: "#FFFBEB", bar: "#F59E0B" },
  teal:   { from: "#0E9C8F", to: "#5BC2B6", soft: "#ECFAF7", bar: "#0E9C8F" },
  cyan:   { from: "#0E84B8", to: "#3FB6E0", soft: "#EAF6FB", bar: "#0E84B8" },
  slate:  { from: "#64748B", to: "#94A3B8", soft: "#F1F5F9", bar: "#64748B" },
};

// ============ 业务分类色 —— 业态 ============
// 同一业态在所有图表 / 表格 / tooltip / legend 中必须使用同一颜色
export const BIZ_COLOR: Record<string, string> = {
  住宅:    "#5B8DEF", // 蓝
  公寓:    "#2DBDA8", // 青
  车位:    "#F08A8A", // 浅红
  车位配套: "#F08A8A",
  商业:    "#F4B042", // 橙
  写字楼:  "#A78BFA", // 紫
  其他:    "#94A3B8", // 灰蓝
};

// 通用图表色板（按 index 取色，与业态色同源）
export const CHART_PALETTE = ["#5B8DEF", "#2DBDA8", "#A78BFA", "#F4B042", "#F08A8A", "#94A3B8"] as const;

export const colorOfBiz = (name: string, idx = 0): string =>
  BIZ_COLOR[name] ?? CHART_PALETTE[idx % CHART_PALETTE.length];

// ============ 业务分类色 —— 拿地年份 ============
export const YEAR_COLOR: Record<string, string> = {
  "21年及之前": "#94A3B8",
  "2022":      "#0E84B8",
  "2023":      "#2DBDA8",
  "2024":      "#A78BFA",
  "2025":      "#1677FF",
  "2026":      "#F4B042",
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
