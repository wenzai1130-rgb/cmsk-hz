import type { ShenzhenProjectRaw } from "@/data/shenzhenProjectAnalysisData";

// 九宫格区域 key（X = 估值售价比, Y = 去化竞争力）
// 区域名称使用直白型命名，方便业务用户一眼看懂。
export type NineGridKey =
  | "value_realization" // HH: 高X / 高Y
  | "steady_sale" // MH: 中X / 高Y
  | "price_up_watch" // LH: 低X / 高Y
  | "price_watch" // HM: 高X / 中Y
  | "balanced" // MM: 中X / 中Y
  | "price_repair" // LM: 低X / 中Y
  | "sale_improvement" // HL: 高X / 低Y
  | "ops_improvement" // ML: 中X / 低Y
  | "pressure"; // LL: 低X / 低Y

export type GridCategory = "advantage" | "watch" | "concern";

export const CATEGORY_META: Record<GridCategory, { label: string; color: string; soft: string }> = {
  advantage: { label: "优势区", color: "#10B981", soft: "#ECFDF5" },
  watch: { label: "观察区", color: "#EAB308", soft: "#FEFCE8" },
  concern: { label: "关注区", color: "#F43F5E", soft: "#FEF2F2" },
};

export interface NineGridMeta {
  key: NineGridKey;
  label: string; // 直白型命名
  category: GridCategory;
  color: string; // 取分类色
  soft: string;
  strategy: string;
}

export const NINE_GRID_META: Record<NineGridKey, NineGridMeta> = {
  value_realization: { key: "value_realization", label: "去化强，售估比高", category: "advantage", color: CATEGORY_META.advantage.color, soft: CATEGORY_META.advantage.soft, strategy: "项目去化强、售估比也高，建议保持节奏并关注利润兑现。" },
  steady_sale: { key: "steady_sale", label: "去化强，售估比正常", category: "advantage", color: CATEGORY_META.advantage.color, soft: CATEGORY_META.advantage.soft, strategy: "售估比接近基准、去化表现强，建议维持节奏并谨慎让利。" },
  price_up_watch: { key: "price_up_watch", label: "去化强，售估比低", category: "watch", color: CATEGORY_META.watch.color, soft: CATEGORY_META.watch.soft, strategy: "去化好但售估比相对偏低，关注后续承接力与价格策略稳定性。" },
  price_watch: { key: "price_watch", label: "去化正常，售估比高", category: "advantage", color: CATEGORY_META.advantage.color, soft: CATEGORY_META.advantage.soft, strategy: "售估比高、去化基本跟随市场，关注是否可适度提价或调整折扣。" },
  balanced: { key: "balanced", label: "去化正常，售估比正常", category: "watch", color: CATEGORY_META.watch.color, soft: CATEGORY_META.watch.soft, strategy: "售估比与去化均接近基准水平，保持常规跟踪。" },
  price_repair: { key: "price_repair", label: "去化正常，售估比低", category: "concern", color: CATEGORY_META.concern.color, soft: CATEGORY_META.concern.soft, strategy: "售估比相对市场偏低，去化跟随市场。关注产品力与价格策略平衡。" },
  sale_improvement: { key: "sale_improvement", label: "去化弱，售估比高", category: "watch", color: CATEGORY_META.watch.color, soft: CATEGORY_META.watch.soft, strategy: "售估比位置较好，但去化弱于市场。重点排查渠道、营销与竞品分流。" },
  ops_improvement: { key: "ops_improvement", label: "去化弱，售估比正常", category: "concern", color: CATEGORY_META.concern.color, soft: CATEGORY_META.concern.soft, strategy: "售估比接近基准但去化偏弱，重点提升营销、渠道与客户转化。" },
  pressure: { key: "pressure", label: "去化弱，售估比低", category: "concern", color: CATEGORY_META.concern.color, soft: CATEGORY_META.concern.soft, strategy: "售估比和去化表现均偏弱，重点排查产品、客群与库存结构问题。" },
};

// 回退用的固定阈值（当样本 < 6 时使用）
export const X_THRESHOLDS = { low: 0.9, high: 1.1 } as const;
export const Y_THRESHOLDS = { low: 0.9, high: 1.1 } as const;

export type Thresholds = { low: number; high: number };

/**
 * 通用百分位数计算工具（线性插值法）。
 * @param arr 数值数组（NaN 会被过滤）
 * @param percentile 0-100
 */
export function getPercentile(arr: number[], percentile: number): number {
  const clean = arr.filter((v) => Number.isFinite(v));
  if (!clean.length) return 0;
  const q = Math.max(0, Math.min(100, percentile)) / 100;
  const a = [...clean].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
}

// 兼容老接口
export function quantile(arr: number[], q: number): number {
  return getPercentile(arr, q * 100);
}

/**
 * 基于当前数据集动态计算 30 / 70 百分位分界点。
 * - 样本 < 2：回退到固定基准（0.9 / 1.1）防止报错
 * - 样本 ≥ 2：使用真实的 30th / 70th 百分位数
 * - 两分位数重合时向两侧轻微撑开，避免分界线退化
 */
export function computeAdaptiveThresholds(values: number[], fallback: Thresholds = { low: 0.9, high: 1.1 }): Thresholds {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return fallback;
  let low = getPercentile(clean, 30);
  let high = getPercentile(clean, 70);
  if (!(high > low)) {
    const eps = Math.max(Math.abs(low) * 0.01, 1e-6);
    low = low - eps;
    high = high + eps;
  }
  return { low, high };
}

export type Band = "L" | "M" | "H";
export function bandOf(v: number, t: Thresholds): Band {
  if (v < t.low) return "L";
  if (v > t.high) return "H";
  return "M";
}

const CELL_KEY: Record<string, NineGridKey> = {
  LH: "price_up_watch", MH: "steady_sale", HH: "value_realization",
  LM: "price_repair", MM: "balanced", HM: "price_watch",
  LL: "pressure", ML: "ops_improvement", HL: "sale_improvement",
};

export function cellKeyOf(xb: Band, yb: Band): NineGridKey {
  return CELL_KEY[`${xb}${yb}`];
}

export function classifyNineGrid(x: number, y: number, xT: Thresholds = X_THRESHOLDS, yT: Thresholds = Y_THRESHOLDS): NineGridKey {
  return cellKeyOf(bandOf(x, xT), bandOf(y, yT));
}

export type CompareMode = "street" | "city" | "competitor" | "nation";

export const COMPARE_LABEL: Record<CompareMode, string> = {
  competitor: "竞品",
  street: "板块",
  city: "城市",
  nation: "全国",
};

export const COMPARE_FILTER_LABEL: Record<CompareMode, string> = {
  competitor: "与竞品比",
  street: "与板块比",
  city: "与城市比",
  nation: "与全国比",
};

export interface ProjectAnalysisRow extends ShenzhenProjectRaw {
  valuationSalesRatio: number;
  sellThroughCompetitiveness: number;
  quadrant: NineGridKey;
  sellRateGap: number; // 项目 - 有效市场
  cityMarketSellThroughRate: number;
  effectiveMarketSellThroughRate: number;
  compareMode: CompareMode;
  cityCompany?: string;
}

export interface CityCompanyAggregate {
  cityCompany: string;
  projectCount: number;
  totalRemainingValue: number;
  weightedSellThroughRate: number;
  weightedMarketSellThroughRate: number;
  competitiveness: number;
  category: GridCategory;
}

export function aggregateByCityCompany(rows: ProjectAnalysisRow[]): CityCompanyAggregate[] {
  const groups = new Map<string, ProjectAnalysisRow[]>();
  rows.forEach((r) => {
    const k = r.cityCompany || "未分类";
    const arr = groups.get(k) || [];
    arr.push(r);
    groups.set(k, arr);
  });
  const result: CityCompanyAggregate[] = [];
  groups.forEach((list, cityCompany) => {
    const totalRooms = list.reduce((s, p) => s + (p.roomCount || 0), 0) || 1;
    const wSnake =
      list.reduce((s, p) => s + (p.snakeSellThroughRate || 0) * (p.roomCount || 0), 0) / totalRooms;
    const wMarket =
      list.reduce((s, p) => s + (p.marketSellThroughRate || 0) * (p.roomCount || 0), 0) / totalRooms;
    const comp = wMarket > 0 ? wSnake / wMarket : 0;
    const category: GridCategory = comp >= 1.1 ? "advantage" : comp < 0.9 ? "concern" : "watch";
    result.push({
      cityCompany,
      projectCount: list.length,
      totalRemainingValue: list.reduce((s, p) => s + (p.remainingValue || 0), 0),
      weightedSellThroughRate: wSnake,
      weightedMarketSellThroughRate: wMarket,
      competitiveness: comp,
      category,
    });
  });
  return result.sort((a, b) => b.competitiveness - a.competitiveness);
}

export function computeCityMarketRate(rows: ShenzhenProjectRaw[]): number {
  const totalRooms = rows.reduce((s, p) => s + (p.roomCount || 0), 0);
  if (!totalRooms) return 0;
  return rows.reduce((s, p) => s + (p.marketSellThroughRate || 0) * (p.roomCount || 0), 0) / totalRooms;
}

export function enrichProjects(
  rows: ShenzhenProjectRaw[],
  compareMode: CompareMode = "street",
): ProjectAnalysisRow[] {
  // 对比基准按按钮口径切换：
  // - 街道：项目所在街道市场去化率（行级 marketSellThroughRate）
  // - 城市：当前城市/项目池按房间数加权市场去化率
  // - 全国：统一全国住宅大盘去化率基准（演示数据口径）
  // - 竞品：暂无真实竞品数据，先用街道基准的轻微折算兜底（按钮当前置灰）
  const cityRate = computeCityMarketRate(rows);
  const NATIONAL_MARKET_SELL_THROUGH_RATE = 0.62;
  const enriched = rows.map((p) => {
    // 售估比 = 销售底价 / 中介估值（招商蛇口集团口径）
    const valuationSalesRatio = p.cmbValuationPrice > 0 ? p.salesFloorPrice / p.cmbValuationPrice : 0;
    const streetRate = p.marketSellThroughRate || 0;
    const effective = compareMode === "street"
      ? streetRate
      : compareMode === "city"
        ? cityRate
        : compareMode === "nation"
          ? NATIONAL_MARKET_SELL_THROUGH_RATE
          : streetRate > 0
            ? streetRate * 0.95
            : 0;
    const sellThroughCompetitiveness = effective > 0 ? p.snakeSellThroughRate / effective : 0;
    return {
      ...p,
      valuationSalesRatio,
      sellThroughCompetitiveness,
      sellRateGap: p.snakeSellThroughRate - effective,
      cityMarketSellThroughRate: cityRate,
      effectiveMarketSellThroughRate: effective,
      compareMode,
    };
  });
  // 固定阈值（与图表网格 0.9 / 1.1 完全对齐），保证气泡颜色与所在格子一致
  return enriched.map((p) => ({
    ...p,
    quadrant: classifyNineGrid(p.valuationSalesRatio, p.sellThroughCompetitiveness, X_THRESHOLDS, Y_THRESHOLDS),
  }));
}

// 兼容别名
export type QuadrantKey = NineGridKey;
export const QUADRANT_META = NINE_GRID_META;

export const fmtPct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;
export const fmtRatio = (v: number) => v.toFixed(2);
export const fmtMoney = (v: number) => Math.round(v).toLocaleString("zh-CN");
export const fmtWan = (v: number) => `${(v / 10000).toFixed(2)}万/㎡`;
export const fmtYi = (v: number) => `${v.toFixed(2)}亿`;
