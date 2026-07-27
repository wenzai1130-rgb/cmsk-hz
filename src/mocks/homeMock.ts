// Dashboard mock data + 业务计算 / 格式化工具
// 后续替换为真实 API 时，只需替换 fetchProjects 即可。

export type Project = {
  id: string;
  name: string;
  cityCompany: string;
  businessType: string;
  status: string;
  month: string; // YYYY-MM
  totalValue: number; // 亿元
  soldValue: number;
  unsoldValue: number;
  totalArea: number; // 万㎡
  soldArea: number;
  unsoldArea: number;
  signedAmount: number; // 亿元
  signedArea: number; // 万㎡
  supplyAmount: number; // 亿元
  dealRate: number; // 0-1
  yoy: number; // 同比
  mom: number; // 环比
};

export const CITY_COMPANIES = [
  "深圳公司",
  "广州公司",
  "佛山公司",
  "东莞公司",
  "珠海公司",
  "惠州公司",
  "中山公司",
  "江门公司",
];
export const BUSINESS_TYPES = ["住宅", "公寓", "商业", "写字楼", "车位"];
export const PROJECT_STATUSES = ["在售", "未开盘", "售罄", "停售"];
export const MONTHS = [
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
];
export const CALIBERS = ["全口径", "全口径-权益", "并表口径"];
export const ORGS = ["招商蛇口", "南部城市群组", "北部城市群组", "东部城市群组"];

// 简单的可重现随机
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROJECT_NAMES = [
  "蛇口·海上世界",
  "前海湾·云璟",
  "招商·公园1872",
  "天玺·湾",
  "雍景湾",
  "中环·璟台",
  "依云·上城",
  "璞悦山",
  "金山谷",
  "外滩·玺",
  "卓越·星河",
  "招商·麓园",
  "时代·云栖",
  "九龙仓·君汇",
  "海景·御园",
  "湾景·华庭",
  "招商·樾府",
  "东郡·华府",
  "星河·湾",
  "翡翠·城",
  "翰林·华府",
  "山水·绿洲",
  "云端·城",
  "湖畔·名邸",
  "锦绣·华庭",
  "御景·东方",
  "招商·壹方城",
  "时代·上城",
  "华润·万象",
  "保利·天悦",
  "金茂·府",
  "中海·寰宇",
];

export const PROJECTS: Project[] = (() => {
  const rand = mulberry32(20260401);
  return PROJECT_NAMES.map((name, i) => {
    const totalValue = +(8 + rand() * 60).toFixed(2);
    const sold = +(totalValue * (0.2 + rand() * 0.7)).toFixed(2);
    const totalArea = +(totalValue / (1.5 + rand() * 1.5)).toFixed(2);
    const soldArea = +(totalArea * (sold / totalValue)).toFixed(2);
    const signedAmount = +(sold * (0.05 + rand() * 0.2)).toFixed(2);
    const signedArea = +(soldArea * (0.05 + rand() * 0.2)).toFixed(2);
    return {
      id: `P${1000 + i}`,
      name,
      cityCompany: CITY_COMPANIES[Math.floor(rand() * CITY_COMPANIES.length)],
      businessType: BUSINESS_TYPES[Math.floor(rand() * BUSINESS_TYPES.length)],
      status: PROJECT_STATUSES[Math.floor(rand() * PROJECT_STATUSES.length)],
      month: MONTHS[Math.floor(rand() * MONTHS.length)],
      totalValue,
      soldValue: sold,
      unsoldValue: +(totalValue - sold).toFixed(2),
      totalArea,
      soldArea,
      unsoldArea: +(totalArea - soldArea).toFixed(2),
      signedAmount,
      signedArea,
      supplyAmount: +(totalValue * (0.1 + rand() * 0.3)).toFixed(2),
      dealRate: +(sold / totalValue).toFixed(4),
      yoy: +((rand() - 0.5) * 0.6).toFixed(4),
      mom: +((rand() - 0.5) * 0.3).toFixed(4),
    };
  });
})();

export type Filters = {
  org: string;
  caliber: string;
  month: string;
  businessTypes: string[];
  cityCompanies: string[];
  statuses: string[];
  search: string;
};

export const DEFAULT_FILTERS: Filters = {
  org: "招商蛇口",
  caliber: "全口径",
  month: "2026-04",
  businessTypes: [],
  cityCompanies: [],
  statuses: [],
  search: "",
};

export function applyFilters(list: Project[], f: Filters): Project[] {
  return list.filter(
    (p) =>
      (!f.businessTypes.length || f.businessTypes.includes(p.businessType)) &&
      (!f.cityCompanies.length || f.cityCompanies.includes(p.cityCompany)) &&
      (!f.statuses.length || f.statuses.includes(p.status)) &&
      (!f.search || p.name.toLowerCase().includes(f.search.toLowerCase())),
  );
}

export type Unit = "amount" | "area";

export function unitLabel(u: Unit) {
  return u === "amount" ? "亿元" : "万㎡";
}

export function fmtNumber(n: number, digits = 2) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "-";
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPct(n: number, digits = 2) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtSigned(n: number, digits = 2) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function summarize(list: Project[], unit: Unit) {
  const k = (p: Project) => (unit === "amount" ? p.totalValue : p.totalArea);
  const sold = (p: Project) => (unit === "amount" ? p.soldValue : p.soldArea);
  const unsold = (p: Project) => (unit === "amount" ? p.unsoldValue : p.unsoldArea);
  const signed = (p: Project) => (unit === "amount" ? p.signedAmount : p.signedArea);
  const total = list.reduce((s, p) => s + k(p), 0);
  const totalSold = list.reduce((s, p) => s + sold(p), 0);
  const totalUnsold = list.reduce((s, p) => s + unsold(p), 0);
  const totalSigned = list.reduce((s, p) => s + signed(p), 0);
  return {
    total,
    sold: totalSold,
    unsold: totalUnsold,
    signed: totalSigned,
    dealRate: total > 0 ? totalSold / total : 0,
    count: list.length,
    yoy: list.length ? list.reduce((s, p) => s + p.yoy, 0) / list.length : 0,
    mom: list.length ? list.reduce((s, p) => s + p.mom, 0) / list.length : 0,
  };
}

export function groupBy<T extends keyof Project>(
  list: Project[],
  key: T,
  unit: Unit,
): { name: string; total: number; sold: number; unsold: number }[] {
  const map = new Map<string, { total: number; sold: number; unsold: number }>();
  for (const p of list) {
    const name = String(p[key]);
    const cur = map.get(name) || { total: 0, sold: 0, unsold: 0 };
    if (unit === "amount") {
      cur.total += p.totalValue;
      cur.sold += p.soldValue;
      cur.unsold += p.unsoldValue;
    } else {
      cur.total += p.totalArea;
      cur.sold += p.soldArea;
      cur.unsold += p.unsoldArea;
    }
    map.set(name, cur);
  }
  return Array.from(map.entries()).map(([name, v]) => ({
    name,
    total: +v.total.toFixed(2),
    sold: +v.sold.toFixed(2),
    unsold: +v.unsold.toFixed(2),
  }));
}
