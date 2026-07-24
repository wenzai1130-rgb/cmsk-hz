// Mock data for 分级分析 page (Grading Analysis)
export type StrategyType =
  | "high_diff_high_price" // 高难度高售价 - 重点降价促销
  | "high_diff_low_price" // 高难度低售价 - 非价格问题排查
  | "low_diff_high_price" // 低难度高售价 - 高价值兑现
  | "low_diff_low_price"; // 低难度低售价 - 提价观察

export type IndustryCompareType =
  | "advantage" // 行业好、蛇口好 - 优势维持
  | "improve" // 行业好、蛇口差 - 内部改善
  | "leading" // 行业差、蛇口好 - 相对领先
  | "pressure"; // 行业差、蛇口差 - 市场承压

export type PriorityLevel = "high" | "medium" | "low";

export interface ProjectRow {
  projectId: string;
  projectName: string;
  city: string;
  region: string;
  businessType: string;
  remainingValue: number; // 亿
  companySellThroughRate: number; // %
  industrySellThroughRate: number; // %
  sellThroughGap: number; // 蛇口 - 行业, 百分点
  currentPrice: number; // 元/㎡
  valuationPrice: number; // 元/㎡
  priceValuationGapRate: number; // %
  sellThroughDifficultyLevel: number; // 1-10
  industryCompareType: IndustryCompareType;
  strategyType: StrategyType;
  priorityLevel: PriorityLevel;
}

const cities = [
  ["深圳", "南部"],
  ["广州", "南部"],
  ["佛山", "南部"],
  ["东莞", "南部"],
  ["上海", "东部"],
  ["杭州", "东部"],
  ["南京", "东部"],
  ["苏州", "东部"],
  ["北京", "北部"],
  ["天津", "北部"],
  ["青岛", "北部"],
  ["武汉", "中部"],
  ["长沙", "中部"],
  ["成都", "西部"],
  ["重庆", "西部"],
  ["西安", "西部"],
];
const types = ["住宅", "公寓", "商业", "写字楼", "车位"];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function classifyStrategy(diff: number, gap: number): StrategyType {
  // diff 1-10 difficulty; gap = price/val-1
  const high = diff >= 6;
  const expensive = gap >= 0;
  if (high && expensive) return "high_diff_high_price";
  if (high && !expensive) return "high_diff_low_price";
  if (!high && expensive) return "low_diff_high_price";
  return "low_diff_low_price";
}
function classifyIndustry(c: number, ind: number): IndustryCompareType {
  const indGood = ind >= 18;
  const cGood = c >= ind;
  if (indGood && cGood) return "advantage";
  if (indGood && !cGood) return "improve";
  if (!indGood && cGood) return "leading";
  return "pressure";
}

function buildProjects(): ProjectRow[] {
  const r = rng(7);
  const list: ProjectRow[] = [];
  for (let i = 0; i < 126; i++) {
    const [city, region] = cities[Math.floor(r() * cities.length)];
    const bt = types[Math.floor(r() * types.length)];
    const industry = +(8 + r() * 22).toFixed(2); // 8-30
    const company = +Math.max(2, industry + (r() - 0.55) * 18).toFixed(2);
    const gap = +(company - industry).toFixed(2);
    const valuation = Math.round(18000 + r() * 42000);
    const price = Math.round(valuation * (0.82 + r() * 0.4));
    const pvgap = +((price / valuation - 1) * 100).toFixed(2);
    const diff = Math.max(1, Math.min(10, Math.round(1 + (1 - company / 35) * 10 + (r() - 0.5) * 2)));
    const remaining = +(0.6 + r() * 22).toFixed(2);
    const strategy = classifyStrategy(diff, pvgap);
    const ind = classifyIndustry(company, industry);
    let prio: PriorityLevel = "low";
    if (strategy === "high_diff_high_price") prio = "high";
    else if (strategy === "high_diff_low_price" || ind === "improve") prio = "medium";
    list.push({
      projectId: `P${(10000 + i).toString()}`,
      projectName: `${city}·${["华庭", "玺园", "印象", "云麓", "时代", "璞悦", "星河", "翰林", "公馆", "府上"][i % 10]}${["一期", "二期", "三期", "悦府", "瀚境"][i % 5]}`,
      city,
      region,
      businessType: bt,
      remainingValue: remaining,
      companySellThroughRate: company,
      industrySellThroughRate: industry,
      sellThroughGap: gap,
      currentPrice: price,
      valuationPrice: valuation,
      priceValuationGapRate: pvgap,
      sellThroughDifficultyLevel: diff,
      industryCompareType: ind,
      strategyType: strategy,
      priorityLevel: prio,
    });
  }
  return list;
}

export const PROJECTS: ProjectRow[] = buildProjects();

export const STRATEGY_META: Record<
  StrategyType,
  { label: string; color: string; soft: string; action: string }
> = {
  high_diff_high_price: {
    label: "高难度高售价",
    color: "#EF4444",
    soft: "#FEE2E2",
    action: "重点降价促销，限时折扣，加快回款",
  },
  high_diff_low_price: {
    label: "高难度低售价",
    color: "#F59E0B",
    soft: "#FEF3C7",
    action: "非价格问题排查，复盘产品力 / 渠道 / 推广",
  },
  low_diff_high_price: {
    label: "低难度高售价",
    color: "#3B82F6",
    soft: "#DBEAFE",
    action: "高价值兑现，维持节奏，避免过度让利",
  },
  low_diff_low_price: {
    label: "低难度低售价",
    color: "#10B981",
    soft: "#D1FAE5",
    action: "提价或收窄折扣观察，提升毛利",
  },
};

export const INDUSTRY_META: Record<
  IndustryCompareType,
  { label: string; color: string; desc: string }
> = {
  advantage: { label: "优势维持", color: "#10B981", desc: "行业好、蛇口好" },
  improve: { label: "内部改善", color: "#F59E0B", desc: "行业好、蛇口差" },
  leading: { label: "相对领先", color: "#3B82F6", desc: "行业差、蛇口好" },
  pressure: { label: "市场承压", color: "#EF4444", desc: "行业差、蛇口差" },
};

export const PRIORITY_META: Record<PriorityLevel, { label: string; color: string; soft: string }> = {
  high: { label: "高", color: "#DC2626", soft: "#FEE2E2" },
  medium: { label: "中", color: "#D97706", soft: "#FEF3C7" },
  low: { label: "低", color: "#0EA5E9", soft: "#E0F2FE" },
};
