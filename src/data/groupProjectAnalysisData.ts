// 集团（招商蛇口）多城市公司项目分析数据
// 基础：复用深圳 + 上海真实样本（cityCompany 字段标注归属）
// 扩展：基于现有样本按城市进行确定性扰动派生，覆盖更多城市公司，用于集团视角展示。
//
// 派生方式（基于种子哈希，结果稳定）：
//   - projectId / projectName / district / street 替换为目标城市
//   - 数值字段（snakeSellThroughRate / salesFloorPrice / cmbValuationPrice /
//     marketAvgDealPrice / marketSellThroughRate / remainingValue / totalValue）做 ±10–25% 扰动
//
// 注意：本文件不修改原始深圳 / 上海数据文件，仅在此处合成集团视角数据集。

import type { ShenzhenProjectRaw } from "./shenzhenProjectAnalysisData";
import { shenzhenProjectAnalysisData } from "./shenzhenProjectAnalysisData";
import { shanghaiProjectAnalysisData } from "./shanghaiProjectAnalysisData";

export type GroupProjectRow = ShenzhenProjectRaw & { cityCompany: string };

// 简易确定性 hash（字符串 → 0..1）
function seed(str: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round2 = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

interface CityProfile {
  cityCompany: string;
  cityName: string; // 项目名前缀使用
  districts: { district: string; streets: string[] }[];
  /** 价格整体缩放系数（销售底价 / 估值 / 成交均价） */
  priceScale: number;
  /** 市场去化率整体偏移（+/-） */
  marketRateBias: number;
  /** 项目去化率整体偏移 */
  snakeRateBias: number;
  idPrefix: string;
}

const CITY_PROFILES: CityProfile[] = [
  {
    cityCompany: "广州公司",
    cityName: "广州",
    idPrefix: "GZ",
    priceScale: 0.55,
    marketRateBias: -0.05,
    snakeRateBias: -0.03,
    districts: [
      { district: "天河区", streets: ["珠江新城街道", "员村街道"] },
      { district: "番禺区", streets: ["大石街道", "南村镇"] },
      { district: "黄埔区", streets: ["科学城街道", "永和街道"] },
    ],
  },
  {
    cityCompany: "佛山公司",
    cityName: "佛山",
    idPrefix: "FS",
    priceScale: 0.35,
    marketRateBias: -0.1,
    snakeRateBias: -0.08,
    districts: [
      { district: "南海区", streets: ["桂城街道", "里水镇"] },
      { district: "顺德区", streets: ["大良街道", "北滘镇"] },
    ],
  },
  {
    cityCompany: "杭州公司",
    cityName: "杭州",
    idPrefix: "HZ",
    priceScale: 0.75,
    marketRateBias: 0.05,
    snakeRateBias: 0.04,
    districts: [
      { district: "西湖区", streets: ["翠苑街道", "三墩镇"] },
      { district: "余杭区", streets: ["未来科技城", "良渚街道"] },
      { district: "钱塘区", streets: ["白杨街道", "下沙街道"] },
    ],
  },
  {
    cityCompany: "南京公司",
    cityName: "南京",
    idPrefix: "NJ",
    priceScale: 0.5,
    marketRateBias: -0.02,
    snakeRateBias: -0.01,
    districts: [
      { district: "鼓楼区", streets: ["江东街道", "宝塔桥街道"] },
      { district: "江宁区", streets: ["东山街道", "禄口街道"] },
    ],
  },
  {
    cityCompany: "北京公司",
    cityName: "北京",
    idPrefix: "BJ",
    priceScale: 0.85,
    marketRateBias: 0.02,
    snakeRateBias: 0.0,
    districts: [
      { district: "朝阳区", streets: ["望京街道", "东坝街道"] },
      { district: "海淀区", streets: ["西北旺镇", "上地街道"] },
      { district: "大兴区", streets: ["亦庄镇", "黄村镇"] },
    ],
  },
  {
    cityCompany: "成都公司",
    cityName: "成都",
    idPrefix: "CD",
    priceScale: 0.3,
    marketRateBias: -0.06,
    snakeRateBias: -0.05,
    districts: [
      { district: "高新区", streets: ["桂溪街道", "中和街道"] },
      { district: "天府新区", streets: ["华阳街道", "万安街道"] },
    ],
  },
];

// —— 扩展：按城市分档批量生成剩余城市公司 profile ——
type Tier = "newT1" | "t2" | "t34";
const TIER_DEFAULT: Record<Tier, { priceScale: number; marketRateBias: number; snakeRateBias: number }> = {
  newT1: { priceScale: 0.45, marketRateBias: -0.02, snakeRateBias: -0.02 },
  t2:    { priceScale: 0.28, marketRateBias: -0.08, snakeRateBias: -0.06 },
  t34:   { priceScale: 0.18, marketRateBias: -0.15, snakeRateBias: -0.12 },
};

// 拼音首字母映射（用于生成 idPrefix，简易穷举）
const PY_PREFIX: Record<string, string> = {
  重庆: "CQ", 武汉: "WH", 苏州: "SZ2", 西安: "XA", 长沙: "CS", 郑州: "ZZ", 天津: "TJ",
  合肥: "HF", 青岛: "QD", 东莞: "DG", 宁波: "NB",
  无锡: "WX", 济南: "JN", 大连: "DL", 沈阳: "SY", 厦门: "XM", 福州: "FZ", 温州: "WZ",
  金华: "JH", 常州: "CZ", 哈尔滨: "HRB", 南通: "NT", 昆明: "KM", 南昌: "NC", 南宁: "NN",
  长春: "CC", 嘉兴: "JX", 徐州: "XZ", 太原: "TY", 烟台: "YT", 绍兴: "SX", 惠州: "HUZ",
  珠海: "ZH", 台州: "TZ", 中山: "ZS", 扬州: "YZ",
  乌鲁木齐: "WLMQ", 海口: "HK", 襄阳: "XY", 宜昌: "YC", 镇江: "ZJ", 盐城: "YCH",
  芜湖: "WHU", 漳州: "ZHZ", 赣州: "GZH", 汕头: "ST", 保定: "BD", 宿迁: "SQ", 湛江: "ZJI",
  柳州: "LZ", 咸阳: "XYG", 肇庆: "ZQ", 三亚: "SYA", 日照: "RZ", 十堰: "SHY", 毕节: "BJI",
};

const EXTRA_CITIES: Record<Tier, string[]> = {
  newT1: ["重庆", "武汉", "苏州", "西安", "长沙", "郑州", "天津", "合肥", "青岛", "东莞", "宁波"],
  t2: ["无锡", "济南", "大连", "沈阳", "厦门", "福州", "温州", "金华", "常州", "哈尔滨", "南通", "昆明", "南昌", "南宁", "长春", "嘉兴", "徐州", "太原", "烟台", "绍兴", "惠州", "珠海", "台州", "中山", "扬州"],
  t34: ["乌鲁木齐", "海口", "襄阳", "宜昌", "镇江", "盐城", "芜湖", "漳州", "赣州", "汕头", "保定", "宿迁", "湛江", "柳州", "咸阳", "肇庆", "三亚", "日照", "十堰", "毕节"],
};

(Object.keys(EXTRA_CITIES) as Tier[]).forEach((tier) => {
  const cfg = TIER_DEFAULT[tier];
  EXTRA_CITIES[tier].forEach((cityName) => {
    CITY_PROFILES.push({
      cityCompany: `${cityName}公司`,
      cityName,
      idPrefix: PY_PREFIX[cityName] || cityName,
      priceScale: cfg.priceScale,
      marketRateBias: cfg.marketRateBias,
      snakeRateBias: cfg.snakeRateBias,
      districts: [
        { district: `${cityName}中心城区`, streets: ["核心商圈街道", "新城街道"] },
        { district: `${cityName}新区`, streets: ["产业园街道", "临港街道"] },
      ],
    });
  });
});


// 项目名"清洗"：把"深圳"/"上海"前缀去掉，保留剩余主体
function stripCityPrefix(name: string): string {
  return name.replace(/^(深圳|上海)/, "");
}

function derive(samples: ShenzhenProjectRaw[], profile: CityProfile, perCity: number): GroupProjectRow[] {
  const rng = seed(profile.idPrefix);
  const out: GroupProjectRow[] = [];
  for (let i = 0; i < perCity; i++) {
    const base = samples[Math.floor(rng() * samples.length) % samples.length];
    const distIdx = Math.floor(rng() * profile.districts.length);
    const d = profile.districts[distIdx];
    const street = d.streets[Math.floor(rng() * d.streets.length)];
    const jitter = (range: number) => 1 + (rng() - 0.5) * 2 * range; // ±range
    const sales = base.salesFloorPrice * profile.priceScale * jitter(0.18);
    const valuation = base.cmbValuationPrice * profile.priceScale * jitter(0.18);
    const marketAvg = (base.marketAvgDealPrice || sales * 0.9) * profile.priceScale * jitter(0.15);
    const market = clamp01(base.marketSellThroughRate + profile.marketRateBias + (rng() - 0.5) * 0.15);
    const snake = clamp01(base.snakeSellThroughRate + profile.snakeRateBias + (rng() - 0.5) * 0.15);
    const remaining = round2(base.remainingValue * jitter(0.25) + rng() * 1.5);
    out.push({
      projectId: `${profile.idPrefix}${String(i + 1).padStart(3, "0")}`,
      projectName: `${profile.cityName}·${stripCityPrefix(base.projectName)}`,
      district: d.district,
      street,
      businessType: "住宅",
      roomCount: Math.max(40, Math.round(base.roomCount * jitter(0.2))),
      onSaleRoomCount: Math.max(1, Math.round(base.onSaleRoomCount * jitter(0.25))),
      snakeSellThroughRate: round4(snake),
      salesFloorPrice: round2(sales),
      cmbValuationPrice: round2(valuation),
      marketAvgDealPrice: round2(marketAvg),
      marketSellThroughRate: round4(market),
      remainingValue: remaining,
      totalValue: remaining,
      cityCompany: profile.cityCompany,
    });
  }
  return out;
}

// 集团数据集：深圳 + 上海原样保留（打上 cityCompany），其余 6 个城市公司各派生 5 个项目
export const groupProjectAnalysisData: GroupProjectRow[] = [
  ...shenzhenProjectAnalysisData.map((p) => ({ ...p, cityCompany: "深圳公司" })),
  ...shanghaiProjectAnalysisData.map((p) => ({ ...p, cityCompany: "上海公司" })),
  ...CITY_PROFILES.flatMap((profile) =>
    derive(
      // 派生样本池：用深圳 + 上海合集作为模板
      [...shenzhenProjectAnalysisData, ...shanghaiProjectAnalysisData],
      profile,
      2,
    ),
  ),
];
