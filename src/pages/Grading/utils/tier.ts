import type { ProjectAnalysisRow } from "@/utils/analysisMetrics";

// 招商蛇口维度：按城市能级配色（浅色系，保证深色文字对比度）
export const TIER_COLOR = {
  t1: "#93C5FD",    // 一线 浅蓝
  newT1: "#BAE6FD", // 新一线 冰蓝
  t2: "#FDE68A",    // 二线 浅琥珀
  t34: "#E2E8F0",   // 三四线 浅灰
  other: "#F1F5F9",
} as const;

export const TIER_LABEL: Record<keyof typeof TIER_COLOR, string> = {
  t1: "一线", newT1: "新一线", t2: "二线", t34: "三四线", other: "其他",
};

export const TIER_CITY_MAP: Record<string, keyof typeof TIER_COLOR> = (() => {
  const m: Record<string, keyof typeof TIER_COLOR> = {};
  const G = {
    t1: ["上海", "北京", "深圳", "广州"],
    newT1: ["成都", "杭州", "重庆", "武汉", "苏州", "西安", "南京", "长沙", "郑州", "天津", "合肥", "青岛", "东莞"],
    t2: ["无锡", "济南", "厦门", "福州", "常州", "南通", "昆明", "南昌", "惠州"],
    t34: ["海口", "宜昌", "盐城", "赣州", "汕头", "湛江", "三亚"],
  } as const;
  (Object.keys(G) as (keyof typeof G)[]).forEach((k) => G[k].forEach((c) => (m[c] = k)));
  return m;
})();

export const cityOfProject = (p: ProjectAnalysisRow) =>
  (p.cityCompany || "").replace(/公司$/, "").trim();

export const tierOfProject = (p: ProjectAnalysisRow): keyof typeof TIER_COLOR =>
  TIER_CITY_MAP[cityOfProject(p)] || "other";
