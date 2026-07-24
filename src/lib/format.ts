// 全局数据展示格式工具
// 规则：
// - 金额、百分比统一保留 2 位小数；
// - 数量（整数）保留 0 位小数；
// - 空值统一展示为 "--"；
// - 趋势遵循「红增绿减」（如需反转使用 invert）。

import { STATUS as TOKEN_STATUS } from "./tokens";

/** 趋势色：统一引用全局状态色 token */
export const TREND_UP = TOKEN_STATUS.danger.fg; // 红 - 增加
export const TREND_DOWN = TOKEN_STATUS.good.fg; // 绿 - 减少
export const TREND_FLAT = "#64748B"; // 灰 - 持平

/** 空值占位 */
export const EMPTY = "--";

/**
 * 项目名称统一展示：去除【地块/位置】括注 与 「-N期 / N期」等分期后缀。
 * 例：
 *   "上海招商臻境【浦东三林】-二期" -> "上海招商臻境"
 *   "深圳观潮府【A0020108】"        -> "深圳观潮府"
 *   "杭州云麓府一期"                -> "杭州云麓府"
 */
export function formatProjectName(name: string | null | undefined): string {
  if (!name) return "";
  return String(name)
    .replace(/【[^】]*】/g, "")
    .replace(/[·\-—－\s]*[一二三四五六七八九十百0-9]+期(?:项目)?\s*$/g, "")
    .trim();
}

const isNullish = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  (typeof v === "number" && (Number.isNaN(v) || !Number.isFinite(v)));

/** 空值占位（命中空值返回 placeholder，否则返回 null 由调用方继续处理） */
export function formatEmpty(v: unknown, placeholder = EMPTY): string | null {
  return isNullish(v) ? placeholder : null;
}

// ---------- 数字 ----------

export type NumberOpts = {
  /** 小数位，默认 2 */
  digits?: number;
  /** 是否千分位，默认 true */
  thousand?: boolean;
  /** 是否带正号（正值显示 +），默认 false */
  withSign?: boolean;
};

/**
 * 通用数字格式化：默认 2 位小数 + 千分位。
 * 整数型字段（套数 / 人数）建议传 { digits: 0 }。
 * 空值返回 "--"。
 */
export function formatNumber(
  v: number | null | undefined,
  optsOrDigits: NumberOpts | number = {},
): string {
  const empty = formatEmpty(v);
  if (empty) return empty;
  const opts: NumberOpts =
    typeof optsOrDigits === "number" ? { digits: optsOrDigits } : optsOrDigits;
  const { digits = 2, thousand = true, withSign = false } = opts;
  const n = Number(v);
  const text = thousand
    ? n.toLocaleString("zh-CN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : n.toFixed(digits);
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${text}`;
}

// ---------- 金额 ----------

export type AmountOpts = NumberOpts & {
  /** 单位（"亿" / "万元" 等），输出形如 "612.89 亿" */
  unit?: string;
};

/**
 * 金额：默认 2 位小数 + 千分位。
 * - formatAmount(612.891) -> "612.89"
 * - formatAmount(12345.6, { unit: "万元" }) -> "12,345.60 万元"
 * - 空值 -> "--"
 *
 * 兼容旧签名：formatAmount(v, "亿") 也可用。
 */
export function formatAmount(
  v: number | null | undefined,
  unitOrOpts: string | AmountOpts = "",
): string {
  const opts: AmountOpts =
    typeof unitOrOpts === "string" ? { unit: unitOrOpts } : unitOrOpts;
  const empty = formatEmpty(v);
  if (empty) return empty;
  const text = formatNumber(v, {
    digits: opts.digits ?? 2,
    thousand: opts.thousand ?? true,
    withSign: opts.withSign,
  });
  return opts.unit ? `${text} ${opts.unit}` : text;
}

// ---------- 百分比 ----------

/**
 * 百分比：默认 2 位小数。
 * - formatPercent(14.751) -> "14.75%"
 * - formatPercent(0.1475, { asRatio: true }) -> "14.75%"
 * - withSign=true 时正值显示 "+"
 * - 空值 -> "--"
 */
export function formatPercent(
  v: number | null | undefined,
  opts: { withSign?: boolean; asRatio?: boolean; digits?: number } = {},
): string {
  const empty = formatEmpty(v);
  if (empty) return empty;
  const { withSign = false, asRatio = false, digits = 2 } = opts;
  const n = asRatio ? Number(v) * 100 : Number(v);
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

// ---------- 日期 / 月份 ----------

function toDate(v: string | number | Date | null | undefined): Date | null {
  if (isNullish(v)) return null;
  const d = v instanceof Date ? v : new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 月份：统一展示为 "2026-03"。空值 -> "--" */
export function formatMonth(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return EMPTY;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** 日期：统一展示为 "2026-04-17"。空值 -> "--" */
export function formatDate(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return EMPTY;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ---------- 红增绿减 ----------

export type TrendCtx = {
  /** 反转：当指标"上升=好"时设为 true（如完成率），返回 上升=绿、下降=红 */
  invert?: boolean;
};

/** 红增绿减：返回趋势颜色（统一引用 token） */
export function getTrendColor(
  v: number | null | undefined,
  ctx: TrendCtx = {},
): string {
  if (isNullish(v)) return TREND_FLAT;
  const n = Number(v);
  if (n === 0) return TREND_FLAT;
  const up = n > 0;
  const positiveIsBad = !ctx.invert; // 默认：上升=坏=红
  return up
    ? positiveIsBad
      ? TREND_UP
      : TREND_DOWN
    : positiveIsBad
      ? TREND_DOWN
      : TREND_UP;
}

/** 红增绿减：返回完整样式（color + 方向） */
export function getTrendStyle(
  v: number | null | undefined,
  ctx: TrendCtx = {},
): { color: string; direction: "up" | "down" | "flat" } {
  if (isNullish(v)) return { color: TREND_FLAT, direction: "flat" };
  const n = Number(v);
  const direction = n > 0 ? "up" : n < 0 ? "down" : "flat";
  return { color: getTrendColor(v, ctx), direction };
}
