import { ExportButton } from "@/components/ui/export-button";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Clock,
  ChevronDown,
  
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Building,
  Check,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieIcon,
  CalendarRange,
  Building2,
  LineChart as LineIcon,
  ChartSpline,

  BarChart3,
  PackageCheck,
  Layers,
  AlertTriangle,
  Crown,
  Info,
  HelpCircle,

} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  LabelList,
} from "recharts";
import { toast } from "sonner";
import { formatNumber, formatPercent } from "@/lib/format";
import { LandYearDetailDialog } from "@/pages/Home/components/LandYearDetailDialog";
import { CityRankDetailDialog } from "@/pages/Home/components/CityRankDetailDialog";
import { RateDetailDialog } from "@/pages/Home/components/RateDetailDialog";
import { DoneUnsoldDetailDialog } from "@/pages/Home/components/DoneUnsoldDetailDialog";
import { KpiTrendPopover, type KpiTrendMetric } from "@/pages/Home/components/KpiTrendDialog";


import { usePageRequirements, ModuleBadge, useRegisterModuleOpener } from "@/components/requirements";


import { HeaderNav } from "@/components/layout/HeaderNav";
import {
  CHART_PALETTE as TOKEN_CHART_PALETTE,
  DONUT_PALETTE as TOKEN_DONUT_PALETTE,
  BIZ_COLOR as TOKEN_BIZ_COLOR,
  colorOfBiz as tokenColorOfBiz,
  ACCENT as TOKEN_ACCENT,
  BRAND as TOKEN_BRAND,
  STATUS as TOKEN_STATUS,
  TREND as TOKEN_TREND,
  TOOLTIP_STYLE as TOKEN_TOOLTIP_STYLE,
} from "@/lib/tokens";



import { OrgPicker, CaliberPicker, DayPicker, CALIBER_OPTIONS, ORG_TREE, type Caliber } from "@/components/filters/home-filters";

// 统一企业级 BI 配色 —— 引用全局 token (src/lib/tokens.ts)
const BI_PALETTE = TOKEN_CHART_PALETTE as readonly string[];
// 业态 → 颜色 固定映射（跨页面保持一致）
const TYPE_COLOR: Record<string, string> = TOKEN_BIZ_COLOR;
const colorOf = (name: string, idx: number) => tokenColorOfBiz(name, idx);
const SUMMARY_COLOR = TOKEN_BRAND.primary;
const COLORS = BI_PALETTE;
// 统一 tooltip 样式（来自 token）
const TOOLTIP_STYLE = TOKEN_TOOLTIP_STYLE;
const CHART_TOOLTIP_STYLE = {
  ...TOOLTIP_STYLE,
  padding: "10px 12px",
  minWidth: 168,
} as const;
const chartTooltipTitleClass = "text-[12px] font-semibold mb-2 text-[#111827]";
const chartTooltipRowClass = "flex items-center justify-between gap-6 text-[12px] leading-[22px]";

// ====== mock data ======
const TYPE_DISTRIBUTION = [
  { name: "住宅", value: 368.5, pct: 60.1, sellRate: 16.5 },
  { name: "商业", value: 49.0, pct: 8.0, sellRate: 14.0 },
  { name: "公寓", value: 86.3, pct: 14.1, sellRate: 12.2 },
  { name: "写字楼", value: 31.4, pct: 5.1, sellRate: 6.2 },
  { name: "车位", value: 58.2, pct: 9.5, sellRate: 8.5 },
  { name: "配套及其他", value: 19.49, pct: 3.2, sellRate: 26.5 },
];

// 整体去化率（加权综合）
const OVERALL_SELL_RATE = 14.75;

// 去化率取色：≥15% 蓝（良好/正常），8%~15% 橙（偏低），<8% 红（需关注）
const sellRateColor = (rate: number) =>
  rate >= 15 ? "#2563EB" : rate >= 8 ? "#F59E0B" : "#EF4444";




// 总未售货值口径基准（亿元）。统一来源，避免分散硬编码。
// 全口径 4100.43 亿；全口径-权益 2300.32 亿。面积口径按 0.62 转换。
export const UNSOLD_TOTAL_BY_CALIBER: Record<"equity" | "full", number> = {
  equity: 2300.32,
  full: 4100.43,
};



const LAND_YEAR = [
  { year: "2021及以前", total: 168.4, unsold: 112.6 },
  { year: "2022", total: 124.5, unsold: 78.3 },
  { year: "2023", total: 102.8, unsold: 64.1 },
  { year: "2024", total: 88.6, unsold: 52.3 },
  { year: "2025", total: 76.4, unsold: 38.7 },
  { year: "2026", total: 52.2, unsold: 21.9 },
];

// 各拿地年份逐年销售货值（亿）。-- 表示无销售
const LAND_YEAR_SALES: Record<string, Record<string, number | null>> = {
  "2021及以前": { "2021年销售": 28.4, "2022年销售": 18.6, "2023年销售": 6.2, "2024年销售": 1.8, "2025年销售": 0.6, "2026年销售": 0.2 },
  "2022": { "2021年销售": null, "2022年销售": 12.4, "2023年销售": 18.2, "2024年销售": 9.6, "2025年销售": 4.8, "2026年销售": 1.2 },
  "2023": { "2021年销售": null, "2022年销售": null, "2023年销售": 14.8, "2024年销售": 16.2, "2025年销售": 6.4, "2026年销售": 1.1 },
  "2024": { "2021年销售": null, "2022年销售": null, "2023年销售": null, "2024年销售": 18.6, "2025年销售": 14.2, "2026年销售": 3.5 },
  "2025": { "2021年销售": null, "2022年销售": null, "2023年销售": null, "2024年销售": null, "2025年销售": 22.4, "2026年销售": 15.3 },
  "2026": { "2021年销售": null, "2022年销售": null, "2023年销售": null, "2024年销售": null, "2025年销售": null, "2026年销售": 18.9 },
};

const CITY_RANK = [
  { name: "深圳公司", value: 68.4, target: 92.5, cert: 78.4 },
  { name: "广州公司", value: 53.2, target: 85.2, cert: 72.1 },
  { name: "佛山公司", value: 45.6, target: 78.6, cert: 68.5 },
  { name: "东莞公司", value: 38.9, target: 71.2, cert: 64.3 },
  { name: "珠海公司", value: 34.5, target: 65.8, cert: 61.7 },
  { name: "惠州公司", value: 29.8, target: 58.4, cert: 55.2 },
  { name: "中山公司", value: 24.7, target: 52.6, cert: 49.8 },
  { name: "南宁公司", value: 22.1, target: 48.3, cert: 46.5 },
  { name: "厦门公司", value: 18.6, target: 42.7, cert: 41.2 },
  { name: "福州公司", value: 16.3, target: 38.4, cert: 36.8 },
];

const RATE_TREND = [
  { m: "2025-05", actual: 10.2, yoy: 8.9 },
  { m: "2025-06", actual: 11.1, yoy: 9.6 },
  { m: "2025-07", actual: 11.8, yoy: 10.1 },
  { m: "2025-08", actual: 12.4, yoy: 10.8 },
  { m: "2025-09", actual: 12.9, yoy: 11.4 },
  { m: "2025-10", actual: 13.1, yoy: 11.9 },
  { m: "2025-11", actual: 13.5, yoy: 12.2 },
  { m: "2025-12", actual: 13.8, yoy: 12.5 },
  { m: "2026-01", actual: 14.0, yoy: 12.7 },
  { m: "2026-02", actual: 14.4, yoy: 12.9 },
  { m: "2026-03", actual: 14.75, yoy: 13.1 },
  { m: "2026-04", actual: 15.1, yoy: 13.3 },
];

const RATE_TREND_YEAR = [
  { m: "2022", actual: 28.5, yoy: 25.1 },
  { m: "2023", actual: 11.2, yoy: 28.5 },
  { m: "2024", actual: 21.8, yoy: 11.2 },
  { m: "2025", actual: 17.4, yoy: 21.8 },
  { m: "2026", actual: 28.9, yoy: 17.4 },
];

const DONE_UNSOLD_BY_TYPE: { name: string; value: number; pct: number }[] = [
  { name: "住宅", value: 14.91, pct: 35.0 },
  { name: "商业", value: 4.69, pct: 11.0 },
  { name: "公寓", value: 8.52, pct: 20.0 },
  { name: "写字楼", value: 8.52, pct: 20.0 },
  { name: "车位配套", value: 5.96, pct: 14.0 },
];

const DONE_UNSOLD_BY_AGE = [
  { name: "12个月以内", value: 12.3 },
  { name: "12-18个月", value: 9.8 },
  { name: "18-24个月", value: 14.9 },
  { name: "24个月以上", value: 5.6 },
];

const DONE_UNSOLD_BY_FORMYEAR = [
  { name: "2021及以前", value: 8.6 },
  { name: "2022", value: 11.2 },
  { name: "2023", value: 12.4 },
  { name: "2024", value: 7.3 },
  { name: "2025", value: 3.1 },
  { name: "2026", value: 0.0 },
];

// ====== 在售货值变动（瀑布）Mock 数据 ======
type WFType = "start" | "add" | "sub" | "end";
type WFRaw = { name: string; type: WFType; value: number };

const ONSALE_WATERFALL_CERT: WFRaw[] = [
  { name: "年初在售货值", type: "start", value: 320.50 },
  { name: "本年新取证货值", type: "add", value: 88.20 },
  { name: "本年销售货值", type: "sub", value: 65.30 },
  { name: "货值折损", type: "sub", value: 12.80 },
  { name: "当前剩余在售", type: "end", value: 330.60 },
];
const ONSALE_WATERFALL_ACHIEVE: WFRaw[] = [
  { name: "年初在售货值", type: "start", value: 402.40 },
  { name: "本年新达售货值", type: "add", value: 105.60 },
  { name: "本年销售货值", type: "sub", value: 78.20 },
  { name: "货值折损", type: "sub", value: 18.40 },
  { name: "当前剩余在售", type: "end", value: 411.40 },
];

function buildWaterfall(rows: WFRaw[]) {
  let acc = 0;
  const startVal = rows[0]?.value ?? 0;
  const subTotal = rows
    .filter((r) => r.type === "sub")
    .reduce((sum, r) => sum + r.value, 0);
  const out = rows.map((r) => {
    if (r.type === "start") {
      acc = r.value;
      return { name: r.name, base: 0, bar: r.value, barTop: 0, delta: r.value, type: r.type };
    }
    if (r.type === "add") {
      const base = acc;
      acc += r.value;
      return { name: r.name, base, bar: r.value, barTop: 0, delta: r.value, type: r.type };
    }
    if (r.type === "sub") {
      const base = acc - r.value;
      acc -= r.value;
      return { name: r.name, base, bar: r.value, barTop: 0, delta: -r.value, type: r.type };
    }
    // end
    const beginningRemaining = +Math.max(0, startVal - subTotal).toFixed(2);
    const currentFromNew = +Math.max(0, r.value - beginningRemaining).toFixed(2);
    return {
      name: r.name,
      base: 0,
      bar: beginningRemaining,
      barTop: currentFromNew,
      delta: r.value,
      type: r.type,
      beginningRemaining,
      currentFromNew,
    };
  });
  return out;
}

const WF_COLOR: Record<WFType, string> = {
  start: TOKEN_BRAND.primary,
  add: "#F97066",
  sub: "#4ADE80",
  end: TOKEN_BRAND.primary,
};
// 终止柱上半段：本年新取证/新达售剩余
const WF_END_TOP_COLOR = WF_COLOR.add;

// 终止柱下半段（与起始柱一致的暗灰主色）
const WF_END_BASE_COLOR = TOKEN_BRAND.primary;


// ====== 去化率 分子/分母 mock（亿） ======
const RATE_KPI_BASE = {
  取证: { rate: 14.75, num: 45.32, den: 307.15, yoy: 2.43, mom: 0.35 },
  达售: { rate: 18.32, num: 62.87, den: 343.20, yoy: 3.12, mom: 0.62 },
} as const;

// ====== 在建 / 竣工 结构分析 mock（亿）======
const IN_BUILD_STRUCTURE = [
  { name: "开工未达预售", value: 241, pct: 84.56 },
  { name: "在建达售未取证", value: 41, pct: 14.39 },
  { name: "在建已取证未售", value: 3, pct: 1.05 },
];
const DONE_STRUCTURE = [
  { name: "已竣工未取证", value: 102, pct: 79.69 },
  { name: "已竣工已取证未售", value: 26, pct: 20.31 },
];
const IN_BUILD_COLORS = ["#F59E0B", "#FB923C", "#FDBA74"];
const DONE_COLORS = ["#2563EB", "#60A5FA"];

// 在建在售货值按 "取证未售货龄" 分布（亿）
const IN_BUILD_AGE_BUCKETS = [
  { age: "18个月以上", 达售未取证: 3.3, 取证未售: 0.3 },
  { age: "12-18个月", 达售未取证: 6.4, 取证未售: 0.6 },
  { age: "6-12个月", 达售未取证: 12.8, 取证未售: 0.9 },
  { age: "6个月以内", 达售未取证: 18.5, 取证未售: 1.2 },
];

const DONE_AGE_BUCKETS = [
  { age: "18个月以上", 达售未取证: 36.2, 取证未售: 8.1 },
  { age: "12-18个月", 达售未取证: 27.4, 取证未售: 7.2 },
  { age: "6-12个月", 达售未取证: 22.6, 取证未售: 6.4 },
  { age: "6个月以内", 达售未取证: 15.8, 取证未售: 4.3 },
];

const DONE_UNSOLD_BIZ = [
  { name: "住宅", value: 7.6, pct: 35 },
  { name: "商业", value: 2.39, pct: 11 },
  { name: "公寓", value: 4.35, pct: 20 },
  { name: "写字楼", value: 4.35, pct: 20 },
  { name: "车位", value: 1.82, pct: 8.4 },
  { name: "配套及其他", value: 1.22, pct: 5.6 },
];

const DONE_UNSOLD_AGE_BY_BIZ: Record<string, number[]> = {
  全部业态: [6.27, 5.0, 7.6, 2.86],
  住宅: [2.18, 1.75, 2.66, 1.01],
  商业: [0.68, 0.55, 0.83, 0.33],
  公寓: [1.25, 1.0, 1.52, 0.58],
  写字楼: [1.25, 1.0, 1.52, 0.58],
  车位: [0.55, 0.42, 0.64, 0.21],
  配套及其他: [0.36, 0.28, 0.43, 0.15],
};

const DONE_UNSOLD_YEAR_BY_BIZ: Record<string, number[]> = {
  全部业态: [3.04, 3.48, 4.13, 4.78, 4.56, 1.74],
  住宅: [1.06, 1.22, 1.45, 1.67, 1.6, 0.6],
  商业: [0.33, 0.38, 0.45, 0.53, 0.5, 0.2],
  公寓: [0.61, 0.7, 0.83, 0.96, 0.91, 0.34],
  写字楼: [0.61, 0.7, 0.83, 0.96, 0.91, 0.34],
  车位: [0.26, 0.29, 0.34, 0.4, 0.38, 0.15],
  配套及其他: [0.17, 0.19, 0.23, 0.26, 0.26, 0.11],
};


// ====== reusable UI bits ======

function Select({
  value,
  options,
  onChange,
  width = 160,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" style={{ width }}>
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm text-foreground flex items-center justify-between hover:border-[var(--color-brand)] transition-colors"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-full rounded-md border border-[#E2E8F0] bg-white shadow-lg z-20 py-1 max-h-64 overflow-auto">
          {options.map((o) => (
            <button
              key={o}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o);
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--color-brand-soft)] ${
                o === value ? "text-[var(--color-brand)] font-medium" : "text-foreground"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CardHead({
  title,
  icon,
  detail,
  onDetail,
}: {
  title: string;
  icon: React.ReactNode;
  detail?: boolean;
  onDetail?: () => void;
}) {
  return (
    <div className="h-12 shrink-0 px-5 flex items-center justify-between border-b border-[#EEF1F6]">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
          {icon}
        </span>
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
      </div>
      {detail && (
        <button
          onClick={onDetail}
          className="text-xs text-[var(--color-brand)] hover:underline flex items-center gap-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          查看详情 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyState({
  title = "暂无数据",
  description,
  className = "",
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[120px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center ${className}`}
    >
      <div className="text-sm font-medium text-[#475569]">{title}</div>
      {description && <div className="mt-1 text-xs leading-5 text-[#94A3B8]">{description}</div>}
    </div>
  );
}

function DeltaTag({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${
        up ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
      }`}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {formatPercent(Math.abs(value), { withSign: false })}
    </span>
  );
}

/**
 * 趋势入口图标
 * 用固定的 Lucide 折线图图标代替 Sparkline，作为点击查看趋势浮窗的入口。
 * 保留原有 props 签名，便于所有调用点无缝替换。
 */
function Sparkline({
  color = "#2563EB",
}: {
  data?: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  // 固定尺寸 14 + 左侧 16px（ml-4）与指标名保持一致间距
  return (
    <ChartSpline
      className="shrink-0 ml-1.5 opacity-85 hover:opacity-100 transition-opacity"
      style={{ color }}
      size={14}
      strokeWidth={2}
      aria-hidden
    />
  );
}



// 7 张核心卡片指标的缩略趋势（近 6 期，mock）
const SPARK_TRENDS: Record<string, number[]> = {
  未售总货值: [612, 605, 598, 594, 588, 585],
  新拿地货值: [42, 55, 63, 71, 80, 86],
  土储: [180, 172, 168, 162, 158, 155],
  在建: [260, 268, 272, 278, 282, 285],
  竣工: [110, 115, 118, 122, 126, 128],
  年累计签约: [12, 28, 45, 58, 68, 76],
  当月签约: [8.2, 9.4, 7.8, 10.1, 11.6, 12.4],
};



function StageDistributionCard({
  metricMode = "amount" as "amount" | "area",
  caliber = "full" as "equity" | "full",
}: {
  metricMode?: "amount" | "area";
  caliber?: "equity" | "full";
}) {


  const areaFactor = metricMode === "area" ? 0.62 : 1;
  const unit = metricMode === "area" ? "万㎡" : "亿";
  const cardTitle = metricMode === "area" ? "总面积阶段分布" : "总货值阶段分布";

  const rawStages = [
    {
      idx: 1,
      title: "土储",
      total: 155,
      badgeBg: "#E2E8F0",
      badgeFg: "#64748B",
      pill: "bg-slate-50 border border-slate-100",
      pillLabel: "text-slate-500",
      pillValue: "text-slate-800",
      items: [] as { label: string; value: number }[],
    },
    {
      idx: 2,
      title: "在建",
      total: 285,
      badgeBg: "#FFEDD5",
      badgeFg: "#C2410C",
      pill: "bg-orange-50/60 border border-orange-100/70",
      pillLabel: "text-orange-700/80",
      pillValue: "text-orange-900",
      items: [
        { label: "开工未达预售", value: 241 },
        { label: "在建达售未取证", value: 41 },
        { label: "在建已取证", value: 3 },
      ],
    },
    {
      idx: 3,
      title: "竣工",
      total: 128,
      badgeBg: "#DBEAFE",
      badgeFg: "#1D4ED8",
      pill: "bg-blue-50/60 border border-blue-100/70",
      pillLabel: "text-blue-700/80",
      pillValue: "text-blue-900",
      items: [
        { label: "已竣工未取证", value: 102 },
        { label: "已竣工已取证未售", value: 26 },
      ],
    },
  ];

  const totalAll = UNSOLD_TOTAL_BY_CALIBER[caliber] * areaFactor;
  const rawStageTotal = rawStages.reduce((sum, s) => sum + s.total, 0);
  const stageScale = rawStageTotal > 0 ? UNSOLD_TOTAL_BY_CALIBER[caliber] / rawStageTotal : 1;
  const displayScale = stageScale * areaFactor;

  const stages = rawStages.map((s) => ({
    ...s,
    total: s.total * displayScale,
    items: s.items.map((it) => ({ ...it, value: it.value * displayScale })),
  }));

  const hasStageData = stages.some((s) => s.total > 0 || s.items.some((it) => it.value > 0));

  return (
    <div className="relative h-full bg-white rounded-[14px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      {/* top gradient strip — 与左右卡片视觉对齐（活力橙渐变） */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, #FB923C, #F59E0B)" }}
      />
      {/* faint corner halo */}
      <div
        className="absolute top-0 right-0 w-56 h-24 pointer-events-none"
        style={{
          background: "radial-gradient(120% 100% at 100% 0%, #FFF4E6, transparent 70%)",
          opacity: 0.9,
        }}
      />
      <div className="relative h-11 flex items-center justify-between px-6 pt-5 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#FFF4E6", color: "#C2410C" }}
          >
            <Layers className="w-4 h-4" />
          </span>
          <span className="text-[16px] font-semibold text-foreground">{cardTitle}</span>
        </div>
      </div>
      {hasStageData ? (
      <div className="relative flex flex-1 min-h-0 items-stretch">
        {stages.map((s, i) => {
          const isLast = i === stages.length - 1;
          const basisClass = s.idx === 1 ? "basis-[22%]" : "basis-[39%]";
          const innerPad = "px-[clamp(0.75rem,2vw,2rem)]";
          return (
            <div key={s.idx} className={`relative flex shrink-0 grow-0 ${basisClass}`}>
              <div className={`flex-1 ${innerPad} py-2 flex flex-col justify-start min-w-0`}>
                <KpiTrendPopover metric={s.title as KpiTrendMetric}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="h-5 flex items-center gap-1.5 mb-1 cursor-pointer group outline-none"
                    title="点击查看近 12 个月趋势"
                  >
                    <span
                      className="w-[16px] h-[16px] rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0"
                      style={{ background: s.badgeBg, color: s.badgeFg }}
                    >
                      {s.idx}
                    </span>
                    <span
                      className="text-[12px] font-medium text-slate-500 transition-colors group-hover:text-[color:var(--_c)]"
                      style={{ ["--_c" as any]: s.badgeFg }}
                    >
                      {s.title}
                    </span>
                    <Sparkline data={SPARK_TRENDS[s.title] || []} color={s.badgeFg} />

                  </div>
                </KpiTrendPopover>



                <div className="h-7 flex items-baseline gap-1 mb-1.5">
                  <span className="text-[20px] font-semibold leading-none tabular-nums tracking-tight text-slate-900">
                    {s.total.toFixed(2)}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{unit}</span>
                </div>
                <div className="flex flex-col gap-1">

                  {s.items.map((it) => {
                    const pct = (it.value / totalAll) * 100;
                    return (
                      <div
                        key={it.label}
                        className={`flex items-center justify-between gap-x-1.5 pl-1.5 pr-1.5 py-0.5 rounded whitespace-nowrap overflow-hidden min-w-0 ${s.pill}`}
                      >
                        <span className={`text-[10.5px] truncate min-w-0 ${s.pillLabel}`}>{it.label}</span>
                        <span className="flex items-baseline gap-2 shrink-0">
                          <span className={`text-[10.5px] font-semibold tabular-nums ${s.pillValue}`}>
                            {it.value.toFixed(2)}
                          </span>
                          <span className={`text-[10px] tabular-nums ${s.pillLabel}`}>
                            {pct.toFixed(2)}%
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
              {!isLast && (
                <div
                  className="absolute -right-2.5 z-10 w-5 h-5 rounded-full flex items-center justify-center shadow-[0_2px_6px_-1px_rgba(37,99,235,0.3)] ring-1 ring-blue-100"
                  style={{
                    top: "calc(0.625rem + 8px - 10px)",
                    background:
                      "radial-gradient(circle at 30% 30%, #EFF6FF, #DBEAFE 70%)",
                  }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.75} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      ) : (
        <div className="relative flex flex-1 min-h-0 px-4 pb-4 pt-2">
          <EmptyState title="暂无阶段数据" description="当前筛选条件下暂无可展示的阶段分布" />
        </div>
      )}
    </div>
  );
}



function ProgressBar({
  value,
  from = "#60A5FA",
  to = "#2563EB",
}: {
  value: number;
  from?: string;
  to?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="w-full h-[6px] rounded-full bg-[#EEF2F6] overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${from}, ${to})`,
          boxShadow: `0 0 0 0.5px ${to}33`,
        }}
      />
    </div>
  );
}

type KpiAccent = { from: string; to: string; soft: string };

function KpiCard({
  accent,
  children,
}: {
  accent: KpiAccent;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full bg-white rounded-[14px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* top gradient strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
      />
      {/* faint corner halo */}
      <div
        className="absolute top-0 right-0 w-56 h-24 pointer-events-none"
        style={{
          background: `radial-gradient(120% 100% at 100% 0%, ${accent.soft}, transparent 70%)`,
          opacity: 0.9,
        }}
      />
      <div className="relative h-full px-6 py-5 flex flex-col justify-between">{children}</div>
    </div>
  );
}

function StatusBadge({
  tone,
  label,
}: {
  tone: "good" | "warn" | "alert";
  label: string;
}) {
  const map = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warn: "bg-amber-50 text-amber-700 border-amber-100",
    alert: "bg-rose-50 text-rose-600 border-rose-100",
  } as const;
  const dot = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    alert: "bg-rose-500",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${map[tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot[tone]}`} />
      {label}
    </span>
  );
}

// KPI 强调色 —— 引用全局 token (src/lib/tokens.ts)
const KPI_ACCENTS = {
  blue:   { from: TOKEN_ACCENT.blue.from,   to: TOKEN_ACCENT.blue.to,   soft: TOKEN_ACCENT.blue.soft },
  violet: { from: TOKEN_ACCENT.violet.from, to: TOKEN_ACCENT.violet.to, soft: TOKEN_ACCENT.violet.soft },
  orange: { from: TOKEN_ACCENT.orange.from, to: TOKEN_ACCENT.orange.to, soft: TOKEN_ACCENT.orange.soft },
} as const;

// 状态色 —— 引用全局 token
const STATUS_STYLE = {
  良好:   { bg: TOKEN_STATUS.good.bg,    fg: TOKEN_STATUS.good.fg },
  正常:   { bg: TOKEN_STATUS.normal.bg,  fg: TOKEN_STATUS.normal.fg },
  偏低:   { bg: TOKEN_STATUS.warning.bg, fg: TOKEN_STATUS.warning.fg },
  偏高:   { bg: TOKEN_STATUS.warning.bg, fg: TOKEN_STATUS.warning.fg },
  需关注: { bg: TOKEN_STATUS.danger.bg,  fg: TOKEN_STATUS.danger.fg },
} as const;
type StatusKey = keyof typeof STATUS_STYLE;

// ===== 状态判断规则 =====
function supplyStatus(rate: number): StatusKey {
  if (rate >= 95) return "良好";
  if (rate >= 80) return "正常";
  if (rate >= 60) return "偏低";
  return "需关注";
}
function signedStatus(diffPP: number): StatusKey {
  if (diffPP >= 10) return "良好";
  if (diffPP >= -5) return "正常";
  if (diffPP >= -15) return "偏低";
  return "需关注";
}
const SIGNED_DESC: Record<StatusKey, string> = {
  良好: "良好",
  正常: "正常",
  偏低: "偏低",
  偏高: "偏低",
  需关注: "明显滞后，需关注",
};
function unsoldStatus(rate: number): StatusKey {
  if (rate < 40) return "良好";
  if (rate < 55) return "正常";
  if (rate < 70) return "偏高";
  return "需关注";
}
const UNSOLD_DESC: Record<StatusKey, string> = {
  良好: "较低",
  正常: "正常",
  偏低: "正常",
  偏高: "偏高",
  需关注: "较高，需重点关注",
};


// filter pickers moved to @/components/filters/home-filters


// ====== page ======
// ====== 在售货值变动瀑布图卡片 ======
function OnSaleWaterfallCard({
  mode,
  setMode,
  factor,
  unit,
}: {
  mode: "取证" | "达售";
  setMode: (m: "取证" | "达售") => void;
  factor: number;
  unit: string;
}) {
  const raw = mode === "取证" ? ONSALE_WATERFALL_CERT : ONSALE_WATERFALL_ACHIEVE;
  const scaled = raw.map((r) => ({ ...r, value: +(r.value * factor).toFixed(2) }));
  const rows = buildWaterfall(scaled);
  return (
    <Card className="flex flex-col h-full">
      <CardHead title="在售货值变动" icon={<BarChart3 className="w-3.5 h-3.5" />} />
      <div className="px-4 pt-3 pb-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px]">
            {(["取证", "达售"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`px-3 rounded-[4px] transition-colors ${
                  mode === k
                    ? "bg-white text-[var(--color-brand)] shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex-1 min-h-[280px]">
          <div className="absolute left-0 top-0 z-10 text-[11px] text-[#64748B]">
            单位：{unit}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 42, right: 76, left: -8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <RTooltip
                cursor={{ fill: "rgba(91,141,239,0.06)" }}
                contentStyle={TOOLTIP_STYLE}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r: any = payload[0].payload;
                  const d = r.delta as number;
                  const color = r.type === "add" ? TOKEN_TREND.up : r.type === "sub" ? TOKEN_TREND.down : "#334155";
                  const isEnd = r.type === "end";
                  const newRemainLabel = mode === "取证" ? "本年新取证剩余" : "本年新达售剩余";
                  return (
                    <div style={CHART_TOOLTIP_STYLE}>
                      <div className={chartTooltipTitleClass}>{r.name}</div>
                      {isEnd ? (
                        <>
                          <div className={chartTooltipRowClass}>
                            <span className="text-[#475569]">当前剩余在售</span>
                            <span className="tabular-nums font-medium text-foreground">
                              {r.delta.toFixed(2)} {unit}
                            </span>
                          </div>
                          <div className={chartTooltipRowClass}>
                            <span className="text-[#475569]">年初在售剩余</span>
                            <span className="tabular-nums font-medium text-[#1677FF]">
                              {(r.beginningRemaining ?? 0).toFixed(2)} {unit}
                            </span>
                          </div>
                          <div className={chartTooltipRowClass}>
                            <span className="text-[#475569]">{newRemainLabel}</span>
                            <span className="tabular-nums font-medium text-[#F97066]">
                              {(r.currentFromNew ?? 0).toFixed(2)} {unit}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className={chartTooltipRowClass}>
                          <span className="text-[#475569]">变动金额</span>
                          <span className="tabular-nums font-medium" style={{ color }}>
                            {d >= 0 && r.type === "add" ? "+" : ""}
                            {d.toFixed(2)} {unit}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
              <Bar
                dataKey="bar"
                stackId="w"
                isAnimationActive={false}
                maxBarSize={38}
                shape={(props: any) => {
                  const { x, y, width, height, index } = props;
                  const r = rows[index];
                  const isEnd = r?.type === "end";
                  const fill = isEnd ? WF_END_BASE_COLOR : WF_COLOR[r?.type as keyof typeof WF_COLOR];
                  const rad = isEnd ? 0 : 4;
                  const w = Math.max(0, Math.min(width, 38));
                  const h = Math.max(0, height);
                  const dx = x + (width - w) / 2;
                  const rr = Math.min(rad, w / 2, h);
                  const d = rr > 0
                    ? `M${dx},${y + rr} Q${dx},${y} ${dx + rr},${y} L${dx + w - rr},${y} Q${dx + w},${y} ${dx + w},${y + rr} L${dx + w},${y + h} L${dx},${y + h} Z`
                    : `M${dx},${y} L${dx + w},${y} L${dx + w},${y + h} L${dx},${y + h} Z`;
                  return <path d={d} fill={fill} />;
                }}
              >
                <LabelList
                  dataKey="bar"
                  position="top"
                  content={(props: any) => {
                    const { x, y, width, index } = props;
                    const r = rows[index];
                    if (!r) return null;
                    if (r.type === "end") {
                      const val = (r as any).beginningRemaining ?? r.bar;
                      if (!val) return null;
                      return (
                        <text
                          x={x + width / 2 + 24}
                          y={y + 14}
                          textAnchor="start"
                          fontSize={10}
                          fontWeight={600}
                          fill={TOKEN_BRAND.primary}
                        >
                          {val.toFixed(2)}{unit}
                        </text>
                      );
                    }
                    const val = r.delta;
                    const txt =
                      r.type === "add"
                        ? `+${val.toFixed(2)} ${unit}`
                        : `${val.toFixed(2)} ${unit}`;
                    const color =
                      r.type === "add"
                        ? TOKEN_TREND.up
                        : r.type === "sub"
                          ? TOKEN_TREND.down
                          : "#334155";
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={600}
                        fill={color}
                      >
                        {txt}
                      </text>
                    );
                  }}
                />
              </Bar>
              <Bar dataKey="barTop" stackId="w" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={38}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={r.type === "end" && (r as any).barTop > 0 ? WF_END_TOP_COLOR : "transparent"} />
                ))}
                <LabelList

                  dataKey="barTop"
                  position="top"
                  content={(props: any) => {
                    const { x, y, width, index } = props;
                    const r = rows[index];
                    if (!r || r.type !== "end") return null;
                    const currentFromNew: number = (r as any).currentFromNew ?? 0;
                    const cx = x + width / 2;
                    return (
                      <g>
                        <text
                          x={cx}
                          y={y - 8}
                          textAnchor="middle"
                          fontSize={13}
                          fontWeight={700}
                          fill="#0F172A"
                        >
                          {r.delta.toFixed(2)} {unit}
                        </text>
                        {currentFromNew > 0 && (
                          <text
                            x={cx + 25}
                            y={y + 14}
                            textAnchor="start"
                            fontSize={10}
                            fontWeight={600}
                            fill={WF_COLOR.add}
                          >
                            {currentFromNew.toFixed(2)}{unit}
                          </text>
                        )}
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}


// ====== 结构分析卡片（在建 / 竣工） ======
function StructurePieCard({
  title,
  icon,
  data,
  colors,
  factor,
  unit,
  accentBg,
  accentFg,
}: {
  title: string;
  icon: React.ReactNode;
  data: { name: string; value: number; pct: number }[];
  colors: string[];
  factor: number;
  unit: string;
  accentBg: string;
  accentFg: string;
}) {
  const scaled = data.map((d) => ({ ...d, value: +(d.value * factor).toFixed(2) }));
  const total = +scaled.reduce((s, d) => s + d.value, 0).toFixed(2);
  return (
    <Card className="flex flex-col h-full">
      <div className="h-12 shrink-0 px-5 flex items-center border-b border-[#EEF1F6]">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: accentBg, color: accentFg }}
          >
            {icon}
          </span>
          <span className="text-[15px] font-semibold text-foreground">{title}</span>
        </div>
      </div>
      <div className="px-5 py-4 flex-1 flex items-center gap-4 min-w-0">
        <div className="relative w-[170px] h-[170px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={scaled}
                dataKey="value"
                innerRadius={54}
                outerRadius={80}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {scaled.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <RTooltip
                formatter={(v: number, _n, p: any) => [
                  `${v.toFixed(2)} ${unit} · ${p?.payload?.pct?.toFixed?.(2) ?? "-"}%`,
                  p?.payload?.name,
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[12px] text-slate-500">合计</div>
            <div className="text-[24px] font-semibold tabular-nums text-slate-900 leading-tight mt-0.5">
              {total.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500">{unit}</div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {scaled.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center gap-2 h-9 px-2 rounded bg-slate-50/60 border border-slate-100"
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: colors[i % colors.length] }}
              />
              <span className="text-[12px] text-slate-700 truncate flex-1">{d.name}</span>
              <span className="text-[12px] font-semibold tabular-nums text-slate-900">
                {d.value.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums w-14 text-right">
                {d.pct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ====== 货值结构分析卡片（货龄堆叠柱） ======
function AgeStackStructureCard({
  title,
  icon,
  factor,
  unit,
  accentBg,
  accentFg,
  buckets,
  firstLabel,
  secondLabel,
  colors,
}: {
  title: string;
  icon: React.ReactNode;
  factor: number;
  unit: string;
  accentBg: string;
  accentFg: string;
  buckets: { age: string; 达售未取证: number; 取证未售: number }[];
  firstLabel: string;
  secondLabel: string;
  colors: [string, string];
}) {
  const [hiddenAgeSeries, setHiddenAgeSeries] = useState<Record<string, boolean>>({});
  const firstHidden = !!hiddenAgeSeries[firstLabel];
  const secondHidden = !!hiddenAgeSeries[secondLabel];
  const bars = buckets.map((b) => ({
    age: b.age,
    [firstLabel]: +(b.达售未取证 * factor).toFixed(2),
    [secondLabel]: +(b.取证未售 * factor).toFixed(2),
    total: +((firstHidden ? 0 : b.达售未取证) * factor + (secondHidden ? 0 : b.取证未售) * factor).toFixed(2),
    __stackTotal: +((b.达售未取证 + b.取证未售) * factor).toFixed(2),
    __certificateUnsold: +(b.取证未售 * factor).toFixed(2),
  }));
  const certificateUnsoldTotal = +bars.reduce((sum, b) => sum + Number(b[secondLabel] ?? 0), 0).toFixed(2);
  const certificateSummaryLabel = unit.includes("㎡") ? "在建未售面积合计" : "在建未售货值合计";
  const renderTotalLabel = () => (
    <LabelList
      dataKey="total"
      position="top"
      offset={8}
      fill="#374151"
      fontSize={12}
      fontWeight={600}
      formatter={(value: number) => (Number(value) > 0 ? Number(value).toFixed(2) : "")}
    />
  );

  return (
    <Card className="flex flex-col h-full">
      <div className="h-12 shrink-0 px-5 flex items-center justify-between border-b border-[#EEF1F6]">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: accentBg, color: accentFg }}
          >
            {icon}
          </span>
          <span className="text-[15px] font-semibold text-foreground">{title}</span>
        </div>
      </div>
      <div className="px-5 py-4 flex-1 flex flex-col min-w-0">
        {/* 堆叠柱：在建在售货值按取证未售货龄分布 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-center mb-1.5 text-[12px] text-[#64748B]">
            <span>{certificateSummaryLabel}：</span>
            <span className="ml-1 text-[15px] font-semibold tabular-nums text-[#111827]">
              {certificateUnsoldTotal.toFixed(2)}
            </span>
            <span className="ml-1">{unit}</span>
          </div>
          <div className="relative flex-1 min-h-[180px]">
            <div className="absolute left-0 top-0 z-10 text-[11px] text-[#64748B]">
              单位：{unit}
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 34, right: 8, left: -12, bottom: 4 }}>
                <defs>
                  <linearGradient id="age-stack-first-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[0]} stopOpacity={0.82} />
                    <stop offset="100%" stopColor={colors[0]} stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="age-stack-second-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[1]} stopOpacity={0.82} />
                    <stop offset="100%" stopColor={colors[1]} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <RTooltip
                  cursor={{ fill: "rgba(91,141,239,0.06)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as Record<string, number> | undefined;
                    const stackTotal = Number(row?.total ?? 0);
                    return (
                      <div style={CHART_TOOLTIP_STYLE}>
                        <div className={chartTooltipTitleClass}>{label}</div>
                        {payload.filter((item) => !String(item.dataKey).startsWith("__") && item.dataKey !== "total").map((item) => (
                          <div key={String(item.dataKey)} className={chartTooltipRowClass}>
                            <span className="inline-flex items-center gap-1.5 text-[#475569]">
                              <span
                                className="w-2 h-2 rounded-sm"
                                style={{ background: item.dataKey === firstLabel ? colors[0] : colors[1] }}
                              />
                              {String(item.name)}
                            </span>
                            <span className="tabular-nums font-medium text-[#111827]">
                              {Number(item.value ?? 0).toFixed(2)} {unit}
                            </span>
                          </div>
                        ))}
                        <div className="my-1.5 h-px bg-[#EEF1F6]" />
                        <div className={chartTooltipRowClass}>
                          <span className="text-[#475569]">合计</span>
                          <span className="tabular-nums font-semibold text-[#111827]">
                            {stackTotal.toFixed(2)} {unit}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey={firstLabel} stackId="a" fill="url(#age-stack-first-gradient)" radius={[0, 0, 0, 0]} barSize={30} hide={firstHidden}>
                  {secondHidden && !firstHidden ? renderTotalLabel() : null}
                </Bar>
                <Bar dataKey={secondLabel} stackId="a" fill="url(#age-stack-second-gradient)" radius={[3, 3, 0, 0]} barSize={30} hide={secondHidden}>
                  {!secondHidden ? renderTotalLabel() : null}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1.5 flex items-center justify-center">
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              {[
                { label: firstLabel, color: colors[0], hidden: firstHidden },
                { label: secondLabel, color: colors[1], hidden: secondHidden },
              ].map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setHiddenAgeSeries((prev) => ({ ...prev, [item.label]: !prev[item.label] }))}
                  className={`flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-[#F8FAFC] ${item.hidden ? "text-[#94A3B8]" : "text-slate-500"}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: item.color, opacity: item.hidden ? 0.35 : 1 }}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DoneUnsoldDistributionCard({
  factor,
  unit,
  onDetail,
}: {
  factor: number;
  unit: string;
  onDetail?: () => void;
}) {
  const [activeBiz, setActiveBiz] = useState("全部业态");
  const [chartMode, setChartMode] = useState<"age" | "year">("age");
  const scaledBiz = DONE_UNSOLD_BIZ.map((d) => ({ ...d, value: +(d.value * factor).toFixed(2) }));
  const total = +scaledBiz.reduce((s, d) => s + d.value, 0).toFixed(2);
  const activeBizData = activeBiz === "全部业态" ? null : scaledBiz.find((d) => d.name === activeBiz);
  const selectedColor = activeBiz === "全部业态"
    ? SUMMARY_COLOR
    : colorOf(activeBiz, DONE_UNSOLD_BIZ.findIndex((d) => d.name === activeBiz));
  const selectedValues = chartMode === "age"
    ? DONE_UNSOLD_AGE_BY_BIZ[activeBiz] ?? DONE_UNSOLD_AGE_BY_BIZ["全部业态"]
    : DONE_UNSOLD_YEAR_BY_BIZ[activeBiz] ?? DONE_UNSOLD_YEAR_BY_BIZ["全部业态"];
  const chartLabels = chartMode === "age"
    ? ["24个月以上", "18-24个月", "12-18个月", "12个月以内"]
    : ["2021及之前", "2022", "2023", "2024", "2025", "2026"];
  const barData = chartLabels.map((name, i) => ({
    name,
    value: +((selectedValues[chartMode === "age" ? selectedValues.length - 1 - i : i] ?? 0) * factor).toFixed(2),
  }));

  const listRows = [
    { name: "全部业态", value: total, pct: 100, color: SUMMARY_COLOR },
    ...scaledBiz.map((d, i) => ({ ...d, color: colorOf(d.name, i) })),
  ];

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="h-12 shrink-0 px-5 flex items-center justify-between border-b border-[#EEF1F6]">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#DBEAFE] text-[var(--color-brand)] flex items-center justify-center">
            <PackageCheck className="w-3.5 h-3.5" />
          </span>
          <span className="text-[15px] font-semibold text-foreground">已竣未售分布</span>
        </div>
        <button
          type="button"
          onClick={onDetail}
          className="text-xs text-[var(--color-brand)] hover:underline inline-flex items-center gap-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)]"
        >
          查看详情 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 pt-3 text-[12px] text-[#64748B]">
        * 点击业态项，可联动切换分布
      </div>

      <div className="px-5 pb-4 pt-3 flex-1 grid grid-cols-[minmax(360px,0.9fr)_minmax(0,1.6fr)] gap-4 min-h-0">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div className="relative w-[144px] h-[144px] shrink-0 [&_.recharts-sector]:outline-none [&_.recharts-sector:focus]:outline-none [&_svg]:outline-none [&_svg_*]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scaledBiz}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={66}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {scaledBiz.map((d, i) => (
                    <Cell
                      key={d.name}
                      fill={colorOf(d.name, i)}
                      opacity={activeBiz === "全部业态" || activeBiz === d.name ? 1 : 0.35}
                      style={{ cursor: "pointer", transition: "opacity 160ms", outline: "none" }}
                      onClick={() => setActiveBiz(d.name)}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute left-1/2 top-1/2 flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center pointer-events-none">
              <div className="text-[12px] text-[#64748B] max-w-[92px] truncate">
                {activeBizData?.name ?? "全部业态"}
              </div>
              <div className="mt-0.5 flex items-baseline justify-center gap-0.5 leading-tight">
                <span className="text-[17px] font-semibold tabular-nums text-[#111827]">
                  {(activeBizData?.value ?? total).toFixed(2)}
                </span>
                <span className="text-[11px] text-[#64748B]">{unit}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {listRows.map((row) => {
              const active = activeBiz === row.name;
              return (
                <button
                  type="button"
                  key={row.name}
                  onClick={() => setActiveBiz(row.name)}
                  className={`grid grid-cols-[10px_minmax(58px,1fr)_56px_54px] items-center gap-1.5 h-8 rounded-md px-1.5 text-left transition-colors focus:outline-none ${
                    active
                      ? "bg-[#EFF6FF] border border-[#BFDBFE]"
                      : "border border-transparent hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-sm" style={{ background: row.color }} />
                  <span className={`text-[11.5px] truncate text-[#111827] ${active ? "font-semibold" : ""}`}>
                    {row.name}
                  </span>
                  <span className={`text-[11.5px] tabular-nums text-right text-[#111827] ${active ? "font-semibold" : ""}`}>
                    {row.value.toFixed(2)}{unit}
                  </span>
                  <span className="text-[11.5px] tabular-nums text-right text-[#64748B]">
                    {row.pct.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
              <span className="w-1 h-4 rounded" style={{ background: selectedColor }} />
              <span className="font-semibold text-[#1E293B]">已竣未售 - {activeBiz}</span>
            </div>
            <div className="inline-flex h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px]">
              <button
                type="button"
                onClick={() => setChartMode("age")}
                className={`px-3 rounded-[4px] transition-colors ${
                  chartMode === "age"
                    ? "bg-white text-[var(--color-brand)] shadow-sm"
                    : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                按货龄
              </button>
              <button
                type="button"
                onClick={() => setChartMode("year")}
                className={`px-3 rounded-[4px] transition-colors ${
                  chartMode === "year"
                    ? "bg-white text-[var(--color-brand)] shadow-sm"
                    : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                按形成年份
              </button>
            </div>
          </div>

          <div className="relative flex-1 min-h-[220px]">
            <div className="absolute left-0 top-0 z-10 text-[11px] text-[#64748B]">
              单位：{unit}
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 30, right: 8, left: -10, bottom: 4 }}>
                <defs>
                  <linearGradient id="done-unsold-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={selectedColor} stopOpacity={0.82} />
                    <stop offset="100%" stopColor={selectedColor} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF7" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <RTooltip
                  cursor={{ fill: "rgba(91,141,239,0.06)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const value = Number(payload[0]?.value ?? 0);
                    return (
                      <div style={CHART_TOOLTIP_STYLE}>
                        <div className={chartTooltipTitleClass}>{label}</div>
                        <div className={chartTooltipRowClass}>
                          <span className="inline-flex items-center gap-1.5 text-[#475569]">
                            <span className="w-2 h-2 rounded-sm" style={{ background: selectedColor }} />
                            已竣未售-{activeBiz}
                          </span>
                          <span className="tabular-nums font-medium text-[#111827]">
                            {value.toFixed(2)} {unit}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" fill="url(#done-unsold-bar-gradient)" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: any) => Number(v).toFixed(2)}
                    style={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HomePage() {
  usePageRequirements("首页", [
    {
      code: "REQ-01",
      moduleId: "type-distribution",
      title: "总货值业态分布",
      desc: [
        '【展示内容】环形图按住宅、商业、公寓、写字楼、车位、配套及其他的固定顺序展示总货值业态分布；中心展示"总货值"金额与单位；右侧列表展示业态、货值、占比、取证去化率；右上角胶囊展示整体取证去化率，胶囊内附 info 图标，鼠标悬停展示计算公式：取证去化率 = 本年已售 /（本年已售 + 取证未售）。',
        "【交互规则】鼠标悬停某业态：环形对应扇区高亮、其他扇区降透明度，中心数值切换为该业态值，对应列表行高亮；移出恢复全部业态汇总展示。鼠标悬停右上角胶囊内 info 图标即展示「取证去化率 = 本年已售 /（本年已售 + 取证未售）」公式提示。",
        '【数据规则】中心"总货值"与顶部总货值卡片完全一致，跟随口径（全口径 / 权益）与指标（金额 / 面积）联动；列表各业态货值 = 业态基础比例 × 当前总货值；占比与取证去化率使用配置的固定值（占比合计 100%）；取证去化率计算口径：取证去化率 = 本年已售 /（本年已售 + 取证未售）。',
        '【边界处理】当前筛选条件下无业态数据时，模块展示空状态提示"暂无业态数据"；某一业态数值为 0 时，环形图不展示色块，明细列表可保留该项并置灰；合计值为 0 或为空时，占比展示为"--"；取证去化率无法计算时展示为"--"；极小值处理：数值低于当前展示精度时，图例展示为"<0.01 亿"，Tooltip 展示实际精确值；数值统一保留 2 位小数；列表过长时容器内可滚动，不撑破卡片高度。',
      ].join("\n"),
    },
    {
      code: "REQ-02",
      moduleId: "total-value-kpi",
      title: "总货值",
      desc: [
        "【展示内容】核心指标：未售总货值、新拿地货值（当年新拿地），后面有趋势小图标；辅助指标：环比年初变化金额、新拿地项目平均权益比，后有问号图标。",
        "【交互规则】点击核心指标或其旁边的趋势图标，在下方弹出近 12 个月的折线图浮窗。浮窗颜色与卡片主色调一致。新拿地项目平均权益比右侧提供 info 图标 Hover 提示，展示计算公式。",
        '【数据规则】未售总货值跟随顶部口径（全口径 / 权益）与指标（金额 / 面积）联动；新拿地项目平均权益比固定在全口径口径下展示，不受口径切换影响；金额单位统一为"亿"，面积单位为"万㎡"，数值统一保留 2 位小数；。趋势浮窗默认按"金额-亿"展示近 12 个月月末值，末月为当前时点值。',
        '【边界处理】新拿地项目个数为 0 时，平均权益比展示"--"；趋势浮窗中某月无数据时，该点缺失，前后点断开，Tooltip 展示"--"。',
      ].join("\n"),


    },
    {
      code: "REQ-03",
      moduleId: "stage-distribution",
      title: "总货值阶段分布",
      desc: [
        '【展示内容】三列布局展示土储、在建、竣工三大阶段；每列顶部展示阶段序号、名称与趋势入口图标，阶段合计货值位于名称下方；有子级的阶段（在建、竣工）以胶囊标签展示子级名称、货值及占总未售货值占比。',
        '【交互规则】点击任一阶段（土储 / 在建 / 竣工）的名称行或其趋势图标，在锚点下方弹出趋势浮窗，展示该阶段近 12 个月折线趋势（X 轴为月份，末月标注"当前"）；浮窗颜色统一使用阶段分布卡片主色；Tooltip 同时展示当期、去年同月与同比变化。',
        '【数据规则】阶段合计货值与子级货值之和保持一致；子级占比 = 子级货值 / 总未售货值基准，统一保留 2 位小数；金额单位为"亿"，面积单位为"万㎡"；模块跟随顶部"金额/面积"切换联动：切换为面积时，标题变为"总面积阶段分布"。',
        '【边界处理】某阶段无子级时（如土储），仅展示阶段合计，不展示子级；子级货值为 0 时，胶囊标签仍可展示但数值为0；趋势浮窗中某月无数据时，该点缺失，Tooltip 展示"--"。',
      ].join("\n"),


    },
    {
      code: "REQ-04",
      moduleId: "land-year",
      title: "按拿地时间",
      desc: [
        '【展示内容】左侧环形图按拿地年份（2026年、2025年、2024年、2023年、2022年、2021年及之前）展示未售货值分布；扇区外侧通过引导线展示年份、货值、占比；中心显示当前聚焦年份的"未售货值"金额与单位，未聚焦时显示"总未售货值"；中间区域展示选中年份的核心指标；右侧展示已售货值按销售年份的分解明细，仅展示 2023 年及之后销售年份。',
        "【交互规则】点击或悬停环形图扇区、点击外侧标注，可聚焦该拿地年份：对应扇区高亮、其他扇区降透明度，中心数值切换为该年份未售货值，中间指标区同步更新为选中年份数据；移出悬停后恢复选中态展示。右上角提供'查看趋势'入口，可打开按拿地时间详情弹窗。指标行带 info 图标，Hover 展示公式说明。",
        '【数据规则】各年份未售货值跟随顶部口径（全口径 / 权益）与指标（金额 / 面积）联动；面积模式下所有数值展示面积数据，单位为"万㎡"；各年份未售货值按全局总未售货值基准同比例缩放，确保环形图合计与顶部总货值一致；累计去化率 = 已售货值 /（已售+未售）；未售货值占比 = 该拿地年份未售货值 / 全部拿地年份未售货值合计。',
        '【边界处理】当前筛选条件下无拿地年份数据时，模块展示空状态提示"暂无拿地时间数据"；某销售年份已售货值缺失时展示"--"；主卡右侧分解列表不展示 2021 年销售和 2022 年销售；数值统一保留 2 位小数，占比保留 2 位小数；极小值处理：数值低于当前展示精度时，图例展示为"<0.01"；列表与表格过长时容器内可滚动，不撑破卡片高度。',
      ].join("\n"),
    },
    {
      code: "REQ-05",
      moduleId: "land-year-5y-trend",
      title: "近5年未售货值趋势",
      desc: [
        '【展示内容】分组柱状图展示近5年每年末未售货值（时点值），按拿地年份分色展示；柱体上方显示具体数值标签；同时以折线展示「2021年及之前拿地」占比趋势，双轴展示（左轴货值/面积，右轴占比%）。',
        '【交互规则】图例支持单击切换显隐对应拿地批次，双击独显单个批次；隐藏后图例文字变灰，显示后恢复对应颜色；鼠标悬停柱体或折线节点触发 Tooltip，展示当年各拿地批次明细及合计；模块跟随外层弹窗的"金额/面积"切换联动。',
        '【数据规则】横轴为统计年份（近5年），颜色图例为拿地年份；柱体数值 = 当年末未售货值（时点值）；折线数值 = 当年「2021年及之前拿地」未售货值 / 当年全部未售货值 × 100%；所有数值跟随外层口径（全口径/权益）与指标（金额/面积）联动；面积模式下单位为"万㎡"。',
        '【边界处理】图例全部隐藏时图表区域展示空状态提示；数值统一保留 2 位小数，占比保留 2 位小数。',
      ].join("\n"),
    },
    {
      code: "REQ-06",
      moduleId: "land-year-monthly-trend",
      title: "当年月度未售货值趋势（分拿地年份）",
      desc: [
        '【展示内容】堆积柱状图展示当年各月末未售货值，按拿地年份分色堆叠；柱体上方常驻"合计标签"展示当月可见系列合计值；同时以折线展示各月「2021年及之前拿地」占比趋势，双轴展示（左轴货值/面积，右轴占比%）。',
        '【交互规则】默认仅展示"2021及之前拿地"批次与占比折线，其他拿地批次默认隐藏；图例支持单击切换显隐、双击独显，隐藏图例文字变灰；鼠标悬停柱体触发 Tooltip，展示当月各可见拿地批次明细及合计；该模块图例状态与"近5年趋势"图例互不联动。',
        '【数据规则】横轴为月份（01-12），颜色图例为拿地年份；柱体数值 = 该月末未售货值；折线数值 = 该月「2021年及之前拿地」未售货值 / 该月全部未售货值 × 100%；所有数值跟随外层弹窗的口径与指标（金额/面积）联动。',
        '【边界处理】未来月份（晚于当前月）柱体不渲染，Tooltip 提示"该月份尚未发生，暂无数据"；数值统一保留 2 位小数，占比保留 2 位小数。',
      ].join("\n"),
    },
    {

      code: "REQ-07",
      moduleId: "land-year-equity-table",
      title: "货值结构明细表",
      desc: [
        '【展示内容】明细表按拿地年份展示总货值/面积、已售货值/面积、累计去化率、剩余未售货值/面积、未售占比、以及按销售年份拆分的已售货值/面积；权益口径下模块标题展示为"权益货值结构明细表"，全口径下展示为"货值结构明细表"；销售年份列仅展示 2023 年及之后；底部"合计"行汇总展示各列总量。',
        '【交互规则】所有表头列均支持点击排序（升/降切换）；默认按"拿地年份"升序排列；支持导出为 Excel（文件名：模块名称_组织_口径_日期_时分秒.xlsx）；表格区域支持横/纵向滚动。',
        '【数据规则】跟随外层弹窗的口径（全口径/权益）与指标（金额/面积）联动；累计去化率 = 已售货值 / 总货值；未售占比 = 剩余未售货值 / 总货值；已售数据按销售年份分列，当前展示 2023年销售、2024年销售、2025年销售、2026年销售。',
        '【边界处理】销售年份早于拿地年份时该单元格展示为"--"且文字降级为浅灰色；数值统一保留 2 位小数，占比保留 2 位小数。',
      ].join("\n"),
    },
    {
      code: "REQ-08",
      moduleId: "city-rank",
      title: "城市公司排名 / 项目排名",
      desc: [
        '【展示内容】卡片式排名列表，顶部 Tab 切换"年度签约 / 月度签约 / 未售货值(面积)"三个指标维度；列表每行展示排名序号、公司（或项目）名称、目标、完成进度条、完成额、完成率（签约 Tab）或未售货值/面积、占比（未售 Tab）；顶部固定"全部平均"行。',
        '【交互规则】Tab 切换即时刷新列表与指标列；表头各列（除"占比"外）均可点击排序，双向箭头（▲▼）高亮当前排序方向，签约 Tab 默认按完成额降序，未售 Tab 默认按未售货值降序；"占比"列后置 Info 图标，Hover 提示公式"该公司未售货值 / 全部未售货值合计"；右上角"查看详情"打开排名详情弹窗。',
        '【数据规则】跟随顶部组织联动：组织选中"招商蛇口"或城市群组时展示对应城市公司排名，选中具体城市公司时切换为该公司的项目排名（标题变为"{组织}项目排名"）；跟随顶部"金额/面积"切换联动，金额单位"亿"、面积单位"万㎡"；完成率 = 完成额 / 目标 ×100%，≥100% 进度条转绿色；未售占比 = 该公司未售 / 全部公司未售合计 ×100%；第三个 Tab 标签随单位动态切换为"未售货值"或"未售面积"。',
        '【边界处理】目标为 0 时完成率显示"--"，进度条置空；数值统一保留 2 位小数，占比保留 2 位小数；列表行数较多时容器内纵向滚动，表头与"全部平均"行保持固定。',
      ].join("\n"),
    },
    {
      code: "REQ-09",
      moduleId: "city-rank-detail",
      title: "城市公司排名 - 查看详情弹窗",
      desc: [
        '【展示内容】排名详情弹窗，标题随外层组织动态变为"城市公司排名"或"{组织}项目排名"；顶部工具栏：搜索框、城市群组筛选（仅城市维度展示）、导出按钮；列分为四组——基础列（排名、城市群组、城市公司/项目）、年度签约（目标/完成额/完成率）、月度签约（目标/完成额/完成率）、未售（未售货值或面积、占比）；滚动时表头与"全部平均"行同列固定。',
        '【交互规则】所有数值列点击表头切换升/降序，激活方向高亮（▲▼）；外层 Tab 切换会同步设置弹窗默认排序键（年度签约→年度完成额、月度签约→月度完成额、未售→未售货值）；搜索按名称即时过滤；占比列后置 Info 图标，Hover 提示公式"该项 / 全部合计 ×100%"；分页 50 条/页，底部上一页/下一页 + 总条数；导出为当前过滤后的全量明细 .xlsx，文件名格式：城市公司排名_{组织}_{口径}_{YYYY-MM-DD}_{HHmmss}.xlsx。',
        '【数据规则】城市维度展示该组织下属城市公司行；项目维度（外层选中具体城市公司时）展示该公司下属项目行，并隐藏"城市群组"下拉与列；金额/面积、口径（全口径/权益）跟随外层联动；完成率 = 完成额 / 目标 ×100%；未售占比 = 该行未售 / 全部行未售合计 ×100%；"全部平均"行对所有数值列取算术平均。',
        '【边界处理】目标为 0 时完成率显示"--"；数值统一保留 2 位小数，占比保留 2 位小数；表头与"全部平均"行始终不滚动；项目维度下"城市群组"隐藏，避免空列。',
      ].join("\n"),
    },
    {
      code: "REQ-10",
      moduleId: "onsale-waterfall",
      title: "在售货值变动瀑布图",
      desc: [
        '【展示内容】瀑布图从左至右依次展示：年初在售货值（起始柱，主题蓝）、本年新达售/新取证货值（增量柱，红色向上）、本年销售货值（减量柱，绿色向下）、货值折损（减量柱，绿色向下）、当前剩余在售（终止柱）。终止柱改为双色堆积：下段为年初在售剩余，上段为本年新达售/新取证剩余；货值标注展示在对应色块旁边，柱顶展示当前剩余在售合计。',
        '【交互规则】顶部按钮切换"达售/取证"口径，图表数据即时刷新；鼠标悬停普通柱体触发 Tooltip，展示节点名称与变动金额；悬停终止柱时 Tooltip 展示当前剩余在售、年初在售剩余、本年新达售/新取证剩余。',
        '【数据规则】跟随顶部口径（全口径/权益）与指标（金额/面积）联动；本年销售与货值折损分来源明细，按实际归属拆分，金额单位"亿"、面积单位"万㎡"；数值统一保留 2 位小数并千分位分隔。',
        '【边界处理】某节点数值为 0 时柱体不渲染、标签展示 0.00；本年新增剩余为 0 时终止柱仅展示年初在售剩余；无数据时展示空状态"暂无数据"。',
      ].join("\n"),

    },
    {
      code: "REQ-11",
      moduleId: "rate-trend",
      title: "取证/达售去化率趋势",
      desc: [
        '【展示内容】卡片顶部展示 KPI 组：当期去化率（大号高亮）、已售金额、取证未售货值/达售未售货值（分子/分母）；右侧展示同比、环比（仅月度）DeltaTag；下方双线趋势图：当期去化率（蓝色）与同比去化率（青色）；顶部提供两个胶囊切换器——"取证 / 达售"口径 与 "月度 / 年度"周期。',
        '【交互规则】口径与周期切换即时刷新 KPI 与趋势图；鼠标悬停趋势节点触发 Tooltip，展示当期值、同比值、同比差额（个百分点，正红负绿）；右上角"查看详情"打开取证去化率详情弹窗，并沿用当前口径/周期。',
        '【数据规则】跟随顶部口径（全口径/权益）与指标（金额/面积）联动；去化率 = 已售金额 / (取证未售货值或达售未售货值) ×100%；同比 = 当期 − 去年同期；环比 = 当期 − 上期；年度周期下不展示环比；金额单位"亿"、面积单位"万㎡"，去化率与差额统一保留 2 位小数。',
        '【边界处理】分母为 0 时去化率展示"--"；同比/环比无对比期时 DeltaTag 展示"--"；未来月份不渲染数据点；无数据时图表区域展示空状态提示。',
      ].join("\n"),
    },
    {
      code: "REQ-12",
      moduleId: "in-build-structure",
      title: "在建货值结构分析",
      desc: [
        '【展示内容】模块展示在建货值结构分析，顶部展示在建货值合计；下方堆叠柱状图按货龄展示"在建达售未取证"与"在建取证未售"构成，柱顶展示在建货值合计，图例位于柱状图下方。',
        '【交互规则】鼠标悬停柱段触发 Tooltip，展示货龄、分项货值及合计；模块无点击跳转。',
        '【数据规则】跟随顶部口径（全口径/权益）与指标（金额/面积）联动；货龄口径统一按"进入在建状态起至今"计算；金额单位"亿"、面积单位"万㎡"，数值统一保留 2 位小数。',
        '【边界处理】某货龄段无数据时柱段不渲染；行数过多时容器纵向滚动，图例与坐标轴保持固定；全部为 0 时展示空状态"暂无在建货值数据"。',
      ].join("\n"),
    },
    {
      code: "REQ-13",
      moduleId: "done-structure",
      title: "竣工货值结构分析",
      desc: [
        '【展示内容】模块标题为"已竣未售分布"；左侧环形图展示已竣未售货值按业态（住宅 / 商业 / 公寓 / 写字楼 / 车位配套）的构成，中心展示合计金额与单位；右侧列表展示"全部业态"及各业态的货值、占比；右侧柱状图默认按货龄展示，支持切换为按形成年份展示，形成年份 X 轴依次为 2021及之前、2022、2023、2024、2025、2026。',
        '【交互规则】点击环形图扇区或左侧业态列表项后，当前业态高亮，右侧柱状图切换为该业态对应数据，柱体颜色同步使用该业态在系统中的固定业态色；点击"全部业态"恢复汇总数据；点击"按货龄 / 按形成年份"分段按钮切换右侧柱状图维度；右上角"查看详情"打开已竣未售明细弹窗。',
        '【数据规则】跟随顶部口径（全口径/权益）与指标（金额/面积）联动；占比 = 该业态货值 / 竣工未售货值合计 ×100%；按货龄维度依次展示 24个月以上、18-24个月、12-18个月、12个月以内；按形成年份维度依次展示 2021及之前、2022、2023、2024、2025、2026；金额单位"亿"、面积单位"万㎡"，数值与占比统一保留 2 位小数。',
        '【边界处理】某业态货值为 0 时环形不展示色块，列表可保留并置灰；合计为 0 时中心展示"--"并给出空状态提示；极小值处理：数值低于展示精度时图例展示为"<0.01"，Tooltip 展示精确值；点击环形图不展示浏览器默认焦点框。',
      ].join("\n"),
    },
    {
      code: "REQ-14",
      moduleId: "signing-amount-kpi",
      title: "签约金额",
      desc: [
        '【展示内容】卡片展示年累计签约、当月签约两大核心指标；每个指标名称右侧跟随趋势图标，下方展示对应目标完成率。',
        '【交互规则】点击"年累计签约"或"当月签约"指标名称/趋势图标，锚点下方弹出趋势浮窗，展示该指标近 12 个月折线趋势（X 轴为月份，末月标注"当前"）；浮窗颜色跟随所属卡片主色；Tooltip 同时展示当期、去年同月与同比变化。',
        '【数据规则】年累计签约 = 当年 1 月至当前月签约金额累计；当月签约 = 当前自然月签约金额；均跟随顶部口径（全口径 / 权益）联动；金额单位统一为"亿"。趋势浮窗默认按"金额-亿"展示近 12 个月月末值，末月为当前时点值。',
        '【边界处理】当前月尚未产生签约时，当月签约展示"0.00"；数值统一保留 2 位小数；趋势浮窗中某月无数据时，该点缺失，Tooltip 展示"--"。',
      ].join("\n"),
    },
    {
      code: "REQ-15",
      moduleId: "value-analysis",
      title: "底部趋势分析",
      desc: [
        "【展示内容】通过页签展示总货值、供货、在售货值、去化周期、销售、营销等趋势，可切换趋势图和明细表。",
        "【交互规则】切换页签即时刷新图表；切换为明细表时支持导出；鼠标悬停图表展示对应月份数据。",
        "【数据规则】跟随顶部口径、日期和金额/面积联动；数值按当前单位展示。",
        '【边界处理】无数据时展示空状态；未来月份不展示。',
      ].join("\n"),
    },
  ]);



  const [org, setOrg] = useState("招商蛇口");
  const [date, setDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [caliber, setCaliber] = useState<Caliber>("equity");
  const [metricMode, setMetricMode] = useState<"amount" | "area">("amount");


  const [activeType, setActiveType] = useState<string | null>(null);
  const [waterfallMode, setWaterfallMode] = useState<"取证" | "达售">("取证");
  const [rateMode, setRateMode] = useState<"取证" | "达售">("取证");
  const [ratePeriod, setRatePeriod] = useState<"月度" | "年度">("月度");
  const [hiddenRateSeries, setHiddenRateSeries] = useState<Record<string, boolean>>({});

  const calFactor = CALIBER_OPTIONS.find((c) => c.key === caliber)!.factor;
  const factor = calFactor * (metricMode === "amount" ? 1 : 0.62);
  const unit = metricMode === "amount" ? "亿" : "万㎡";
  const longUnit = metricMode === "amount" ? "亿元" : "万㎡";

  const [rateDetailOpen, setRateDetailOpen] = useState(false);
  const [doneUnsoldDetailOpen, setDoneUnsoldDetailOpen] = useState(false);

  const onDetail = (name: string) => {
    if (name === "取证去化率") { setRateDetailOpen(true); return; }
    if (name === "已竣未售分布") { setDoneUnsoldDetailOpen(true); return; }
    toast.info(`即将跳转：${name}（mock）`);
  };

  const fmt = (n: number, d = 2) => formatNumber(n, { digits: d, thousand: false });

  const totalValue = 568.0;
  const supplyDone = 245.0 * factor;
  const supplyTarget = 280.0 * factor;
  const ytdSigned = 35.7 * factor;
  const ytdSignedTarget = 170.0 * factor;
  const monthSigned = 12.8 * factor;
  const monthSignedTarget = 14.2 * factor;
  const unsoldTotal = 428.53 * factor;

  // ===== 状态动态计算 =====
  const supplyRate = (supplyDone / supplyTarget) * 100;
  const supplyKey = supplyStatus(supplyRate);
  const currentMonth = parseInt((date || "2026-04-17").split("-")[1], 10) || 1;
  const currentYearForDate = parseInt((date || "").slice(0, 4), 10) || new Date().getFullYear();
  const rateTrendMonthly = useMemo(() => {
    const currentMonthKey = `${currentYearForDate}-${String(currentMonth).padStart(2, "0")}`;
    return RATE_TREND.map((item, index) =>
      index === RATE_TREND.length - 1
        ? { ...item, m: currentMonthKey, actual: RATE_KPI_BASE[rateMode].rate }
        : item,
    );
  }, [currentMonth, currentYearForDate, rateMode]);
  const timeProgress = (currentMonth / 12) * 100;
  const ytdRate = (ytdSigned / ytdSignedTarget) * 100;
  const signedDiff = ytdRate - timeProgress;
  const signedKey = signedStatus(signedDiff);
  const signedDescWord = SIGNED_DESC[signedKey];

  void ratePeriod;
  void date;
  return (
    <div className="min-h-screen w-full bg-[#F6F8FB]">
      <HeaderNav active="首页" />

      {/* Filter bar */}
      <div className="sticky top-16 z-30 h-14 bg-white border-b border-[#E2E8F0] flex items-center px-6 gap-3">
        <OrgPicker value={org} onChange={setOrg} />
        <CaliberPicker value={caliber} onChange={setCaliber} />
        <DayPicker value={date} onChange={setDate} />
        <div className="ml-auto inline-flex h-9 rounded-md border border-[#E2E8F0] p-0.5 bg-[#F6F8FB]">
          {(["amount", "area"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setMetricMode(c)}
              className={`px-4 text-[12px] rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] disabled:opacity-50 disabled:cursor-not-allowed ${
                metricMode === c
                  ? "bg-white text-[var(--color-brand)] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "amount" ? "金额" : "面积"}
            </button>
          ))}
        </div>
      </div>

      {/* Page content */}
      <main className="px-6 py-5 space-y-4">
        {/* Core metrics — 首屏视觉重点 */}
        <section className="grid grid-cols-[minmax(320px,3fr)_minmax(640px,6fr)_minmax(320px,3fr)] gap-4 items-stretch overflow-x-auto pb-1">
          {/* Card 1: 总货值及供货 — 蓝色系 */}
          <ModuleBadge moduleId="total-value-kpi" className="h-full min-w-0">
            <KpiCard accent={KPI_ACCENTS.blue}>
              <div className="h-11 flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: KPI_ACCENTS.blue.soft, color: KPI_ACCENTS.blue.from }}
                  >
                    <Wallet className="w-4 h-4" />
                  </span>
                  <span className="text-[16px] font-semibold text-foreground">总货值</span>
                </div>
                
              </div>
              <div className="grid grid-cols-2 gap-4 items-start">
                <div className="flex flex-col">
                  <KpiTrendPopover metric="未售总货值">
                    <div
                      role="button"
                      tabIndex={0}
                      className="h-5 text-xs text-muted-foreground mb-1.5 flex items-center cursor-pointer hover:text-[color:var(--_c)] transition-colors outline-none"
                      style={{ ["--_c" as any]: KPI_ACCENTS.blue.from }}
                      title="点击查看近 12 个月趋势"
                    >
                      <span>未售总货值</span>
                      <Sparkline data={SPARK_TRENDS["未售总货值"]} color={KPI_ACCENTS.blue.from} />
                    </div>
                  </KpiTrendPopover>



                  <div className="h-7 flex items-baseline gap-1">
                    <span
                      className="text-[20px] font-semibold leading-none tabular-nums tracking-tight"
                      style={{ color: KPI_ACCENTS.blue.from }}
                    >
                      {fmt(UNSOLD_TOTAL_BY_CALIBER[caliber] * (metricMode === "amount" ? 1 : 0.62))}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{unit}</span>
                  </div>
                  <div className="mt-auto pt-4 min-h-[46px] flex flex-col justify-end gap-1">
                    <span className="text-[11px] text-muted-foreground">环比年初变化金额</span>
                    <span className="text-[12px] font-medium tabular-nums text-emerald-500">-23.46 {unit}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <KpiTrendPopover metric="新拿地货值">
                    <div
                      role="button"
                      tabIndex={0}
                      className="h-5 text-xs text-muted-foreground mb-1.5 flex items-center cursor-pointer hover:text-[color:var(--_c)] transition-colors outline-none"
                      style={{ ["--_c" as any]: KPI_ACCENTS.blue.from }}
                      title="点击查看近 12 个月趋势"
                    >
                      <span>新拿地货值</span>
                      <Sparkline data={SPARK_TRENDS["新拿地货值"]} color="#64748B" />
                    </div>
                  </KpiTrendPopover>



                  <div className="h-7 flex items-baseline gap-1">
                    <span
                      className="text-[20px] font-semibold leading-none tabular-nums"
                      style={{ color: KPI_ACCENTS.blue.from }}
                    >
                      {fmt(86.42)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{unit}</span>
                  </div>
                  <div className="mt-auto pt-4 min-h-[46px] flex flex-col justify-end gap-1">
                    {(() => {
                      const newLandCount = 8;
                      const avgEquity: number | null = newLandCount > 0 ? 72.5 : null;
                      return (
                        <>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            新拿地项目平均权益比
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3 h-3 text-muted-foreground/70 cursor-help hover:text-[#1677FF] transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-white text-slate-700 border border-[#E2E8F0] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] max-w-[240px] text-[11px] leading-relaxed">
                                  新拿地项目平均权益比 = 各新拿地项目的单独权益比例求和 / 新拿地项目总个数 N
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </span>
                          {avgEquity === null ? (
                            <span className="text-[12px] font-medium tabular-nums text-muted-foreground">--</span>
                          ) : (
                            <span className="text-[12px] font-medium tabular-nums text-[#111827]">
                              {avgEquity.toFixed(2)}%
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                </div>
              </div>
            </KpiCard>
          </ModuleBadge>

          {/* Card 2: 总货值阶段分布 — 三阶段漏斗 */}
          <ModuleBadge moduleId="stage-distribution" className="h-full min-w-0">
            <StageDistributionCard metricMode={metricMode} caliber={caliber} />
          </ModuleBadge>

          {/* Card 3: 签约金额 — 蓝紫青蓝系 */}
          <ModuleBadge moduleId="signing-amount-kpi" className="h-full min-w-0">

          <KpiCard accent={KPI_ACCENTS.violet}>
            <div className="h-11 flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: KPI_ACCENTS.violet.soft, color: KPI_ACCENTS.violet.from }}
                >
                  <BarChart3 className="w-4 h-4" />
                </span>
                <span className="text-[16px] font-semibold text-foreground">{metricMode === "area" ? "签约面积" : "签约金额"}</span>
              </div>
              
            </div>
            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="flex flex-col">
                <KpiTrendPopover metric="年累计签约">
                  <div
                    role="button"
                    tabIndex={0}
                    className="h-5 text-xs text-muted-foreground mb-1.5 flex items-center cursor-pointer hover:text-[color:var(--_c)] transition-colors outline-none"
                    style={{ ["--_c" as any]: KPI_ACCENTS.violet.from }}
                    title="点击查看近 12 个月趋势"
                  >
                    <span>年累计签约</span>
                    <Sparkline data={SPARK_TRENDS["年累计签约"]} color={KPI_ACCENTS.violet.from} />
                  </div>
                </KpiTrendPopover>



                <div className="h-7 flex items-baseline gap-1">
                  <span
                    className="text-[20px] font-semibold leading-none tabular-nums tracking-tight"
                    style={{ color: KPI_ACCENTS.violet.from }}
                  >
                    {fmt(ytdSigned)}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{unit}</span>
                </div>
                <div className="mt-auto pt-4 min-h-[46px]">
                  <div className="text-[11px] flex items-center justify-between">
                    <span className="text-muted-foreground">目标 {fmt(ytdSignedTarget)} {unit}</span>
                    <span className="font-medium tabular-nums text-[#111827]">
                      达成率 21.00%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={21} from={KPI_ACCENTS.violet.to} to={KPI_ACCENTS.violet.from} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <KpiTrendPopover metric="当月签约">
                  <div
                    role="button"
                    tabIndex={0}
                    className="h-5 text-xs text-muted-foreground mb-1.5 flex items-center cursor-pointer hover:text-[color:var(--_c)] transition-colors outline-none"
                    style={{ ["--_c" as any]: KPI_ACCENTS.violet.from }}
                    title="点击查看近 12 个月趋势"
                  >
                    <span>当月签约</span>
                    <Sparkline data={SPARK_TRENDS["当月签约"]} color="#64748B" />
                  </div>
                </KpiTrendPopover>



                <div className="h-7 flex items-baseline gap-1">
                  <span
                    className="text-[20px] font-semibold leading-none tabular-nums"
                    style={{ color: KPI_ACCENTS.violet.from }}
                  >
                    {fmt(monthSigned)}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{unit}</span>
                </div>
                <div className="mt-auto pt-4 min-h-[46px]">
                  <div className="text-[11px] flex items-center justify-between">
                    <span className="text-muted-foreground">月目标 {fmt(monthSignedTarget)} {unit}</span>
                    <span className="font-medium tabular-nums text-[#111827]">
                      达成率 90.14%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={90.14} from={KPI_ACCENTS.violet.from} to={KPI_ACCENTS.violet.to} />
                  </div>
                </div>
              </div>
            </div>
          </KpiCard>
          </ModuleBadge>
        </section>


        {/* Row 1: 业态 / 拿地 / 城市公司 */}
        <div className="grid grid-cols-[minmax(320px,3fr)_minmax(640px,6fr)_minmax(320px,3fr)] gap-4 overflow-x-auto pb-1">
          <ModuleBadge moduleId="type-distribution" className="flex h-[320px] min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden">

            <CardHead title="总货值业态分布" icon={<PieIcon className="w-3.5 h-3.5" />} />
            <div className="px-3 pb-3 pt-2 flex-1 flex flex-col">
              {/* breadcrumb / summary */}
              <div className="flex items-center justify-between text-xs mb-1 min-h-[22px] gap-2">
                <div className="flex items-center gap-1 min-w-0 flex-1" />
                <div className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[11px] text-[#64748B]">
                  取证去化率
                  <span className="tabular-nums font-semibold text-[var(--color-brand)]">
                    {OVERALL_SELL_RATE.toFixed(2)}%
                  </span>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="取证去化率计算公式"
                          className="ml-0.5 inline-flex items-center text-[#94A3B8] hover:text-[var(--color-brand)] transition-colors"
                        >
                          <HelpCircle className="w-3 h-3 hover:text-[#1677FF] transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-white text-slate-700 border border-[#E2E8F0] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] max-w-[260px] text-[11px] leading-relaxed">
                        取证去化率 = 本年已售 /（本年已售 + 取证未售）
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>


              {(() => {
                // 与顶部"总货值"口径联动保持一致
                const headerTotal =
                  UNSOLD_TOTAL_BY_CALIBER[caliber] * (metricMode === "amount" ? 1 : 0.62);
                const baseSum = TYPE_DISTRIBUTION.reduce((s, d) => s + d.value, 0);
                const scale = baseSum > 0 ? headerTotal / baseSum : 1;
                const data = TYPE_DISTRIBUTION.map((d) => ({ ...d, displayValue: d.value * scale }));
                const hasTypeData = headerTotal > 0 && data.some((d) => d.displayValue > 0);
                const centerLabel = `总货值`;
                const centerValue = headerTotal;
                const gridCols =
                  "grid-cols-[68px_54px_63px_73px] gap-x-0";
                if (!hasTypeData) {
                  return <EmptyState title="暂无业态数据" description="当前筛选条件下暂无可展示的业态分布" />;
                }
                return (
                  <div className="flex items-center gap-2 flex-1 min-w-0 min-h-0 overflow-hidden">
                    <div className="relative basis-[35%] max-w-[104px] min-w-[88px] aspect-square shrink-0 [&_.recharts-sector]:outline-none [&_.recharts-sector:focus]:outline-none [&_.recharts-wrapper]:outline-none [&_svg]:outline-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="displayValue"
                            innerRadius="64%"
                            outerRadius="92%"
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={1.5}
                            isAnimationActive={false}
                            onMouseEnter={(_, i) => setActiveType(data[i].name)}
                            onMouseLeave={() => setActiveType(null)}
                          >
                            {data.map((d, i) => (
                              <Cell
                                key={i}
                                fill={colorOf(d.name, i)}
                                opacity={activeType && activeType !== d.name ? 0.4 : 1}
                                style={{ transition: "opacity 180ms" }}
                              />
                            ))}
                          </Pie>
                          <RTooltip
                            formatter={(v: number, _n, p: any) => [
                              `${Number(v).toFixed(2)} ${longUnit} · ${p?.payload?.pct?.toFixed?.(2) ?? "-"}%`,
                              p?.payload?.name ?? "货值",
                            ]}
                            contentStyle={TOOLTIP_STYLE}
                            wrapperStyle={{ zIndex: 50 }}
                            allowEscapeViewBox={{ x: false, y: false }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {(() => {
                          const hovered = activeType ? data.find((d) => d.name === activeType) : null;
                          const label = hovered ? hovered.name : centerLabel;
                          const value = hovered ? hovered.displayValue : centerValue;
                          return (
                            <>
                              <div className="text-[11px] text-[#64748B] leading-tight max-w-[82px] truncate text-center">{label}</div>
                              <div className="text-[14px] sm:text-[15px] font-bold tabular-nums leading-tight text-[#1E293B] mt-0.5">
                                {fmt(value)}
                              </div>
                              <div className="text-[10px] text-[#64748B] leading-tight">{unit}</div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="basis-[65%] flex-1 min-w-0 min-h-0 overflow-x-auto overflow-y-auto">
                      <div className="min-w-[266px] w-full">
                      <div className={`grid ${gridCols} items-center w-full px-1 h-8 mb-1 border-b border-[#EEF1F6] text-[11px] font-medium text-[#64748B] leading-[16px] whitespace-nowrap`}>
                        <span className="text-left">业态</span>
                        <span className="text-right">{metricMode === "amount" ? "货值(亿)" : "面积(万㎡)"}</span>
                        <span className="pl-2 text-right">占比</span>
                        <span className="pl-2 text-right">取证去化率</span>
                      </div>
                      {data.map((t, i) => {
                        const isActive = activeType === t.name;
                        const rate = (t as any).sellRate as number | undefined;
                        return (
                          <div
                            key={t.name}
                            onMouseEnter={() => setActiveType(t.name)}
                            onMouseLeave={() => setActiveType(null)}
                            className={`grid ${gridCols} items-center w-full px-1 h-9 rounded-md border transition-colors text-[11px] leading-[16px] whitespace-nowrap text-[#1E293B] ${
                              isActive
                                ? "bg-[#EFF6FF] border-[#BFDBFE]"
                                : "border-transparent hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <span className="inline-flex w-[68px] min-w-0 items-center gap-1.5 text-left">
                              <span
                                className="w-2 h-2 rounded-sm shrink-0"
                                style={{ background: colorOf(t.name, i) }}
                              />
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`block max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap ${isActive ? "font-semibold" : ""}`}
                                    >
                                      {t.name}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-white text-slate-700 border border-[#E2E8F0] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] text-[11px]">
                                    {t.name}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                            <span className={`tabular-nums text-right ${isActive ? "font-semibold" : ""}`}>
                              {t.displayValue.toFixed(2)}
                            </span>
                            <span className="pl-2 tabular-nums text-right text-[#64748B]">
                              {t.pct.toFixed(2)}%
                            </span>
                            <span className="pl-2 tabular-nums text-right">
                              {rate != null ? `${rate.toFixed(2)}%` : "--"}
                            </span>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          </Card>
          </ModuleBadge>



          <ModuleBadge moduleId="land-year" className="h-[320px] block min-w-0">
            <LandYearCard factor={factor} unit={unit} caliber={caliber} metricMode={metricMode} currentYear={parseInt((date || "").slice(0, 4), 10) || new Date().getFullYear()} org={org} date={date} onDetail={() => onDetail("按拿地时间")} />
          </ModuleBadge>

          <ModuleBadge moduleId="city-rank" className="h-[320px] block min-w-0">
            <CityRankCard factor={factor} unit={unit} org={org} caliber={caliber} date={date} onDetail={() => onDetail("城市公司排名")} />
          </ModuleBadge>
        </div>

        {/* Row 2: 在售货值变动瀑布图 / 取证达售去化率 */}
        <div className="grid grid-cols-12 gap-4">
          <ModuleBadge moduleId="onsale-waterfall" className="col-span-6 h-full block">
            <OnSaleWaterfallCard mode={waterfallMode} setMode={setWaterfallMode} factor={factor} unit={unit} />
          </ModuleBadge>

          <ModuleBadge moduleId="rate-trend" className="col-span-6 h-full block">
          <Card className="h-full flex flex-col">

            <CardHead
              title={`${rateMode}去化率`}
              icon={<LineIcon className="w-3.5 h-3.5" />}
              detail
              onDetail={() => onDetail("取证去化率")}
            />
            <div className="px-4 pt-3 pb-3 flex-1 flex flex-col">
              {/* 筛选切换 */}
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px]">
                  {(["取证", "达售"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setRateMode(k)}
                      className={`px-3 rounded-[4px] transition-colors ${
                        rateMode === k
                          ? "bg-white text-[var(--color-brand)] shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="inline-flex h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px]">
                  {(["月度", "年度"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setRatePeriod(k)}
                      className={`px-3 rounded-[4px] transition-colors ${
                        ratePeriod === k
                          ? "bg-white text-[var(--color-brand)] shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI: 去化率 + 分子/分母 + 同环比 */}
              {(() => {
                const kpi = RATE_KPI_BASE[rateMode];
                const num = +(kpi.num * factor).toFixed(2);
                const den = +(kpi.den * factor).toFixed(2);
                return (
                  <div className="flex items-end justify-between mb-2 gap-4 flex-wrap">
                    <div className="flex items-end gap-4">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">{rateMode}去化率</div>
                        <div className="flex items-baseline">
                          <span className="text-[26px] leading-none font-semibold tabular-nums text-[var(--color-brand)]">
                            {kpi.rate.toFixed(2)}
                          </span>
                          <span className="text-sm ml-0.5 text-[var(--color-brand)]">%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">{unit.includes("㎡") ? "已售面积" : "已售金额"}</div>
                        <div className="text-[15px] font-semibold tabular-nums text-foreground leading-none">
                          {num.toFixed(2)}
                          <span className="text-[11px] text-muted-foreground ml-1 font-normal">{unit}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">{rateMode}{unit.includes("㎡") ? "未售面积" : "未售货值"}</div>
                        <div className="text-[15px] font-semibold tabular-nums text-foreground leading-none">
                          {den.toFixed(2)}
                          <span className="text-[11px] text-muted-foreground ml-1 font-normal">{unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>{ratePeriod === "年度" ? "较去年" : "同比"}</span>
                        <DeltaTag value={kpi.yoy} />
                      </div>
                      {ratePeriod === "月度" && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span>环比</span>
                          <DeltaTag value={kpi.mom} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 趋势图 */}
              <div className="flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={ratePeriod === "年度" ? RATE_TREND_YEAR : rateTrendMonthly}
                    margin={{ top: 10, right: 12, left: -8, bottom: 18 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                    <XAxis
                      dataKey="m"
                      tick={{ fontSize: 10, fill: "#64748B" }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(v: string) =>
                        ratePeriod === "年度" ? `${v}年` : `${v.slice(5)}月`
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                      domain={[0, "auto"]}
                    />
                    <RTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const a = payload.find((p) => p.dataKey === "actual")?.value as number;
                        const y = payload.find((p) => p.dataKey === "yoy")?.value as number;
                        const [yr, m] = (label as string).split("-");
                        const hasActual = typeof a === "number";
                        const hasYoy = typeof y === "number";
                        const diff = hasActual && hasYoy ? a - y : null;
                        return (
                          <div style={CHART_TOOLTIP_STYLE}>
                            <div className={chartTooltipTitleClass}>
                              {m ? `${yr}年${Number(m)}月` : `${yr}年`}
                            </div>
                            {hasActual && (
                              <div className={chartTooltipRowClass}>
                                <span className="text-[#475569]">当期{rateMode}去化率</span>
                                <span className="text-[var(--color-brand)] tabular-nums">
                                  {a.toFixed(2)}%
                                </span>
                              </div>
                            )}
                            {hasYoy && (
                              <div className={chartTooltipRowClass}>
                                <span className="text-[#475569]">同比{rateMode}去化率</span>
                                <span className="text-teal-500 tabular-nums">{y.toFixed(2)}%</span>
                              </div>
                            )}
                            {diff != null && (
                              <div className={chartTooltipRowClass}>
                                <span className="text-[#475569]">同比差额</span>
                                <span
                                  className={`tabular-nums ${diff > 0 ? "text-rose-600" : diff < 0 ? "text-emerald-600" : "text-slate-500"}`}
                                >
                                  {diff >= 0 ? "+" : ""}
                                  {diff.toFixed(2)}个百分点
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Legend
                      align="center"
                      verticalAlign="bottom"
                      iconType="plainline"
                      wrapperStyle={{ fontSize: 12, paddingTop: 4, textAlign: "center" }}
                      onClick={(entry: any) => {
                        const key = String(entry?.dataKey ?? "");
                        if (!key) return;
                        setHiddenRateSeries((prev) => ({ ...prev, [key]: !prev[key] }));
                      }}
                      formatter={(value: string, entry: any) => {
                        const key = String(entry?.dataKey ?? "");
                        const hidden = !!hiddenRateSeries[key];
                        return (
                          <span className={hidden ? "text-[#94A3B8]" : "text-[#64748B]"} style={{ cursor: "pointer" }}>
                            {value}
                          </span>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name={`${rateMode}去化率`}
                      stroke={TOKEN_BRAND.primary}
                      strokeWidth={2}
                      dot={{ r: 3, fill: TOKEN_BRAND.primary, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      hide={!!hiddenRateSeries.actual}
                    />
                    <Line
                      type="monotone"
                      dataKey="yoy"
                      name={`同比${rateMode}去化率`}
                      stroke="#2DD4BF"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#2DD4BF", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      hide={!!hiddenRateSeries.yoy}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
          </ModuleBadge>

        </div>

        {/* Row 2b: 在建货值结构分析 / 竣工货值结构分析 */}
        <div className="grid grid-cols-12 gap-4">
          <ModuleBadge moduleId="in-build-structure" className="col-span-4 h-full block">
            <AgeStackStructureCard
              title="在建货值结构分析"
              icon={<Building2 className="w-3.5 h-3.5" />}
              factor={factor}
              unit={unit}
              accentBg="#FFF4E6"
              accentFg="#C2410C"
              buckets={IN_BUILD_AGE_BUCKETS}
              firstLabel="在建达售未取证"
              secondLabel="在建取证未售"
              colors={[TOKEN_BRAND.primary, TOKEN_STATUS.warning.fg]}
            />
          </ModuleBadge>
          <ModuleBadge moduleId="done-structure" className="col-span-8 h-full block">
            <DoneUnsoldDistributionCard factor={factor} unit={unit} onDetail={() => onDetail("已竣未售分布")} />
          </ModuleBadge>
        </div>

        {/* Row 3: 综合分析（多 Tab + 趋势/明细） */}
        <ModuleBadge moduleId="value-analysis" className="block">
          <ValueAnalysisCard onDetail={onDetail} unit={unit} factor={factor} />
        </ModuleBadge>

        <div className="h-4" />
      </main>
      <RateDetailDialog
        open={rateDetailOpen}
        onOpenChange={setRateDetailOpen}
        initialMode={rateMode}
        initialPeriod={ratePeriod}
        unit={unit}
        org={org}
        caliberLabel={CALIBER_OPTIONS.find((c) => c.key === caliber)!.label}
        date={date}
      />
      <DoneUnsoldDetailDialog
        open={doneUnsoldDetailOpen}
        onOpenChange={setDoneUnsoldDetailOpen}
      />


    </div>

  );
}

// ====== Card 3: 总未售货值 ======
const UNSOLD_BY_PROJECT = [
  { name: "土地储备", short: "土地储备", value: 85.25 },
  { name: "开工未达预售", short: "开工未达预售", value: 124.5 },
  { name: "在建达售未取证", short: "在建达售未取证", value: 52.31 },
  { name: "在建已取证未售", short: "在建已取证未售", value: 98.65 },
  { name: "已竣工未取证", short: "已竣工未取证", value: 22.1 },
  { name: "已竣工已取证未售", short: "已竣已取证未售", value: 45.72 },
];
const UNSOLD_BY_SALES = [
  { name: "土地储备", value: 85.25 },
  { name: "开工未达预售", value: 124.5 },
  { name: "达售未取证", value: 52.31 },
  { name: "已取证未售", value: 98.65 },
];

function UnsoldCard({
  totalUnsold,
  unit,
  factor,
}: {
  totalUnsold: number;
  unit: string;
  factor: number;
}) {
  const [tab, setTab] = useState<"project" | "sales">("project");
  const list = tab === "project" ? UNSOLD_BY_PROJECT : UNSOLD_BY_SALES;
  const sum = list.reduce((s, x) => s + x.value, 0);
  const accent = KPI_ACCENTS.orange;
  const totalGoods = 612.89 * factor;
  const unsoldRate = (totalUnsold / totalGoods) * 100;
  const unsoldKey = unsoldStatus(unsoldRate);
  const unsoldDescWord = UNSOLD_DESC[unsoldKey];
  return (
    <KpiCard accent={accent}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: accent.soft, color: accent.from }}
          >
            <PackageCheck className="w-4 h-4" />
          </span>
          <span className="text-[16px] font-semibold text-foreground">总未售货值</span>
        </div>
        <div className="inline-flex h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px] mr-6">
          {([
            ["project", "按工程"],
            ["sales", "按销售"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-2 rounded-[4px] transition-colors ${
                tab === k
                  ? "bg-white text-[#B45309] shadow-sm"
                  : "text-muted-foreground hover:text-[#B45309]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-4">
        {/* 主指标 */}
        <div className="flex flex-col justify-start pt-1">
          <div className="text-xs text-muted-foreground mb-1.5">总未售货值</div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-[30px] font-semibold leading-none tabular-nums tracking-tight"
              style={{ color: accent.from }}
            >
              {totalUnsold.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
        {/* 未售分项明细 */}
        <div className="grid grid-cols-2 gap-4 content-start">
          {list.map((r) => {
            const v = r.value * factor;
            const pct = (r.value / sum) * 100;
            return (
              <div
                key={r.name}
                className="group/item relative cursor-default leading-tight flex items-baseline justify-between gap-2"
              >
                <span className="text-[11px] text-muted-foreground whitespace-nowrap truncate">
                  {("short" in r ? (r as { short: string }).short : r.name)}
                </span>
                <span className="flex items-baseline gap-0.5 shrink-0">
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">
                    {v.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{unit}</span>
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap px-2 py-1 rounded bg-foreground text-white text-[11px] opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity z-20 shadow-md">
                  {r.name} · {v.toFixed(2)} {unit} · 占比 {pct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </KpiCard>
  );
}

// ====== 按拿地时间 ======
// 拿地年份配色复用统一环形图色板，确保首页环形图视觉一致
const LAND_COLORS = TOKEN_DONUT_PALETTE.slice(0, 6);
const LAND_YEAR_LABELS = ["2026年", "2025年", "2024年", "2023年", "2022年", "2021年及之前"];
const LAND_YEAR_KEYS = ["2026", "2025", "2024", "2023", "2022", "2021及以前"];
const SALE_YEAR_KEYS = ["2021年销售", "2022年销售", "2023年销售", "2024年销售", "2025年销售", "2026年销售"];
const DISPLAY_SALE_YEAR_KEYS = SALE_YEAR_KEYS.filter((k) => !k.startsWith("2021") && !k.startsWith("2022"));

function LandYearCard({
  factor,
  unit,
  caliber,
  metricMode,
  currentYear,
  org,
  date,
  onDetail: _onDetail,
}: {
  factor: number;
  unit: string;
  caliber: Caliber;
  metricMode: "amount" | "area";
  currentYear: number;
  org: string;
  date: string;
  onDetail: () => void;
}) {
  // 根据顶部年份动态截断：拿地年份不允许超过 currentYear
  const visibleLandIdx = LAND_YEAR_KEYS.map((k, i) => {
    const isPre = k === "2021及以前";
    const yr = isPre ? 2021 : parseInt(k, 10);
    return yr <= currentYear ? i : -1;
  }).filter((i) => i >= 0);
  const visibleLandKeys = visibleLandIdx.map((i) => LAND_YEAR_KEYS[i]);
  const defaultSelected = visibleLandKeys.includes(String(currentYear))
    ? String(currentYear)
    : visibleLandKeys[0] ?? LAND_YEAR_KEYS[0];

  const [selected, setSelected] = useState<string>(defaultSelected);
  const [hasFocusedLandYear, setHasFocusedLandYear] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  useRegisterModuleOpener("land-year-5y-trend", () => setDetailOpen(true), []);
  useRegisterModuleOpener("land-year-monthly-trend", () => setDetailOpen(true), []);
  useRegisterModuleOpener("land-year-equity-table", () => setDetailOpen(true), []);



  // 顶部年份变化时，重置选中
  useEffect(() => {
    setSelected(defaultSelected);
    setHasFocusedLandYear(false);
  }, [defaultSelected]);

  const effectiveSelected = visibleLandKeys.includes(selected) ? selected : defaultSelected;

  // 销售年份也要截断：不允许超过顶部 currentYear
  const visibleSaleKeys = SALE_YEAR_KEYS.filter((k) => {
    const yr = parseInt(k, 10);
    return yr <= currentYear;
  });
  const displaySaleKeys = DISPLAY_SALE_YEAR_KEYS.filter((k) => {
    const yr = parseInt(k, 10);
    return yr <= currentYear;
  });

  // ---- 总未售货值口径对齐：将原始 LAND_YEAR 数据按口径目标值同比例放缩 ----
  // 目标总未售货值（金额口径下的亿元数），面积口径再 × 0.62
  const targetUnsoldAmount =
    UNSOLD_TOTAL_BY_CALIBER[caliber] * (metricMode === "amount" ? 1 : 0.62);
  // 原始（未缩放）未售合计 —— 与 factor 无关，仅用作比例
  const rawUnsoldSum = visibleLandIdx.reduce((s, i) => {
    const k = LAND_YEAR_KEYS[i];
    const d = LAND_YEAR.find((x) => x.year === k)!;
    const sales = visibleSaleKeys.reduce(
      (acc, sk) => acc + (LAND_YEAR_SALES[k]?.[sk] ?? 0),
      0,
    );
    return s + Math.max(d.total - sales, 0);
  }, 0);
  const scale = rawUnsoldSum > 0 ? targetUnsoldAmount / rawUnsoldSum : 0;

  const total = LAND_YEAR
    .filter((d) => visibleLandKeys.includes(d.year))
    .reduce((s, d) => s + d.total * factor, 0);
  const cur = LAND_YEAR.find((d) => d.year === effectiveSelected)!;
  const curTotal = cur.total * factor;
  const sales = LAND_YEAR_SALES[effectiveSelected];
  const salesSum = visibleSaleKeys.reduce((s, k) => s + (sales?.[k] ?? 0), 0);
  const curSold = salesSum * factor;
  const rawCurUnsold = Math.max(cur.total - salesSum, 0);
  const curUnsold = +(rawCurUnsold * scale).toFixed(2);
  const dehua = curTotal > 0 ? (curSold / curTotal) * 100 : 0;

  // 各拿地年份的未售货值（作为环形图扇区值）——使用口径对齐后的缩放值
  const pieData = visibleLandIdx.map((i) => {
    const k = LAND_YEAR_KEYS[i];
    const d = LAND_YEAR.find((x) => x.year === k)!;
    const sRaw = visibleSaleKeys.reduce(
      (acc, sk) => acc + (LAND_YEAR_SALES[k]?.[sk] ?? 0),
      0,
    );
    const u = Math.max(d.total - sRaw, 0) * scale;
    return {
      name: LAND_YEAR_LABELS[i],
      key: k,
      value: +u.toFixed(2),
      color: LAND_COLORS[i],
    };
  });
  const totalUnsold = pieData.reduce((s, p) => s + p.value, 0);
  // 该拿地年份未售货值占总未售货值之比
  const unsoldShare = totalUnsold > 0 ? (curUnsold / totalUnsold) * 100 : 0;
  const toggleLandYear = (key: string) => {
    if (hasFocusedLandYear && selected === key) {
      setHasFocusedLandYear(false);
      setHoverKey(null);
      return;
    }
    setSelected(key);
    setHasFocusedLandYear(true);
  };
  const renderLandYearLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, payload } = props;
    const focusKey = hoverKey ?? (hasFocusedLandYear ? selected : null);
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 2) * cos;
    const sy = cy + (outerRadius + 2) * sin;
    const mx = cx + (outerRadius + 8) * cos;
    const my = cy + (outerRadius + 12) * sin;
    const labelYOffset: Record<string, number> = {
      "2025": -42,
      "2026": 4,
      "2024": -14,
      "2023": 14,
    };
    const labelY = my + (labelYOffset[String(payload.key)] ?? 0);
    const isRight = cos >= 0;
    const dotX = cx + (isRight ? 70 : -70);
    const textX = cx + (isRight ? 75 : -75);
    const textAnchor = isRight ? "start" : "end";
    const pct = totalUnsold > 0 ? (payload.value / totalUnsold) * 100 : 0;
    const isSel = selected === payload.key;
    const isFocus = !focusKey || focusKey === payload.key;
    const opacity = isFocus ? 1 : 0.42;
    const textColor = isSel ? "#1677FF" : "#475569";

    return (
      <g
        onClick={() => {
          toggleLandYear(payload.key);
        }}
        style={{ cursor: "pointer" }}
      >
        <path d={`M${sx},${sy}L${mx},${my}L${dotX},${labelY}`} fill="none" stroke={payload.color} strokeWidth={isFocus ? 1.2 : 1} opacity={opacity} />
        <circle cx={dotX} cy={labelY} r={2} fill={payload.color} opacity={opacity} />
        <text x={textX} y={labelY - 12} textAnchor={textAnchor} fill={textColor} fontSize={10.5} fontWeight={isSel ? 600 : 500} opacity={opacity}>
          {payload.name}
        </text>
        <text x={textX} y={labelY + 1} textAnchor={textAnchor} fill="#111827" fontSize={9.5} fontWeight={500} opacity={opacity}>
          {payload.value > 0 && payload.value < 0.01 ? "<0.01" : payload.value.toFixed(2)} {unit}
        </text>
        <text x={textX} y={labelY + 14} textAnchor={textAnchor} fill="#64748B" fontSize={9.5} opacity={opacity}>
          {pct.toFixed(2)}%
        </text>
      </g>
    );
  };


  const selectedLabel = LAND_YEAR_LABELS[LAND_YEAR_KEYS.indexOf(effectiveSelected)];

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="h-11 px-5 flex items-center justify-between border-b border-[#EEF1F6] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
            <CalendarRange className="w-3.5 h-3.5" />
          </span>
          <span className="text-[15px] font-semibold text-foreground">按拿地时间</span>
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          className="text-xs text-[var(--color-brand)] hover:underline inline-flex items-center gap-0.5"
        >
          查看趋势 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 pt-2.5 text-[12px] text-[#64748B]">
        * 点击年份，可联动切换拿地年份数据
      </div>

      <div className="px-4 pt-2 pb-1.5 grid grid-cols-[minmax(0,5.2fr)_minmax(0,3.4fr)_minmax(0,3.4fr)] gap-4 flex-1 min-h-0 overflow-y-auto">
        {/* Left: donut + 扇区外侧标注 */}
        <div className="flex flex-col items-center min-h-0">
          <div className="relative w-full h-full min-h-[210px] [&_.recharts-sector]:outline-none [&_.recharts-sector]:focus:outline-none [&_svg]:outline-none [&_svg_*]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 12, right: 70, bottom: 8, left: 70 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={50}
                  paddingAngle={1.5}
                  stroke="#fff"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  label={renderLandYearLabel}
                  labelLine={false}
                  onMouseEnter={(d: any) => setHoverKey(d.key)}
                  onMouseLeave={() => setHoverKey(null)}
                  onClick={(d: any) => {
                    toggleLandYear(d.key);
                  }}
                >
                  {pieData.map((p) => {
                    const focus = hoverKey ?? (hasFocusedLandYear ? selected : null);
                    return (
                      <Cell
                        key={p.key}
                        fill={p.color}
                        opacity={!focus || focus === p.key ? 1 : 0.4}
                        style={{ cursor: "pointer", transition: "opacity 180ms" }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                type="button"
                onClick={() => {
                  setHasFocusedLandYear(false);
                  setHoverKey(null);
                }}
                className="w-[76px] h-[76px] flex flex-col items-center justify-center rounded-full outline-none pointer-events-auto"
                title="点击查看总货值"
              >
              {(() => {
                const focusKey = hoverKey ?? (hasFocusedLandYear ? selected : null);
                const focusItem = pieData.find((p) => p.key === focusKey);
                const label = focusItem ? focusItem.name : "总货值";
                const val = focusItem ? focusItem.value : totalUnsold;
                return (
                  <>
                    <div className="text-[11px] text-[#64748B] leading-tight">{label}</div>
                    <div className="text-[15px] font-bold tabular-nums leading-tight text-[#1E293B] mt-0.5 whitespace-nowrap">
                      {val.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[#64748B] leading-tight">{unit}</div>
                  </>
                );
              })()}
              </button>
            </div>
          </div>
        </div>

        {/* Middle: 选中年份指标 */}
        <div className="flex flex-col min-h-0 min-w-0">
          <div className="mb-1 flex items-center gap-2 whitespace-nowrap">
            <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
            <span className="text-[13px] font-semibold text-foreground">{selectedLabel}拿地指标</span>
          </div>
          <div className="mb-2 pl-2.5 text-[11px] text-[#64748B] truncate">
            当前选中拿地年份的核心指标
          </div>
          <div className="rounded-md border border-[#EEF1F6] overflow-hidden text-[12px] flex flex-col">
            <div className="grid grid-cols-[1fr_68px] bg-[#F1F5F9]">
              <div className="px-2.5 py-1.5 font-semibold text-foreground border-r border-[#EEF1F6]">指标</div>
              <div className="px-2.5 py-1.5 font-semibold text-foreground text-right">数值</div>
            </div>

            {[
              { label: `已售+未售（${unit}）`, value: curTotal.toFixed(2) },
              { label: `已售货值（${unit}）`, value: curSold.toFixed(2) },
              {
                label: "累计去化率",
                value: `${dehua.toFixed(2)}%`,
                tip: "累计去化率 = 已售货值 /（已售+未售）",
              },
              { label: `剩余未售（${unit}）`, value: curUnsold.toFixed(2) },
              {
                label: "未售货值占比",
                value: `${unsoldShare.toFixed(2)}%`,
                tip: "未售货值占比 = 该拿地年份未售货值 / 全部拿地年份未售货值合计；反映该年份在总未售货值结构中的占比。",
              },
            ].map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_68px] ${i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}`}
              >
                <div className="px-2.5 py-1.5 text-muted-foreground border-r border-[#EEF1F6] flex items-center gap-1 min-w-0">
                  <span className="truncate">{row.label}</span>
                  {row.tip && (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-muted-foreground/70 cursor-help shrink-0 hover:text-[#1677FF] transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-white text-slate-700 border border-[#E2E8F0] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] max-w-[260px] text-[11px] leading-relaxed">
                          {row.tip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="px-2.5 py-1.5 text-right tabular-nums text-foreground">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Right: 已售货值分解（按销售年份） */}
        <div className="flex flex-col min-h-0 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
            <span className="text-[13px] font-semibold text-foreground">已售货值分解</span>
          </div>
          <div className="mb-2 pl-2.5 text-[11px] text-[#64748B]">
            对应当前拿地年份的销售年份拆分
          </div>
          <div className="rounded-md border border-[#EEF1F6] overflow-hidden text-[12px] shrink-0">
            <div className="grid grid-cols-[1fr_68px] bg-[#F1F5F9]">
              <div className="px-2.5 py-1.5 font-semibold text-foreground border-r border-[#EEF1F6]">销售年份</div>
              <div className="px-2.5 py-1.5 font-semibold text-foreground text-right whitespace-nowrap">已售（{unit}）</div>
            </div>
            {displaySaleKeys.map((k, i) => {
              const v = sales?.[k];
              const year = k.replace("销售", "");
              return (
                <div key={k} className={`grid grid-cols-[1fr_68px] ${i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}`}>
                  <div className="px-2.5 py-1.5 text-muted-foreground border-r border-[#EEF1F6]">{year}</div>
                  <div className="px-2.5 py-1.5 text-right tabular-nums text-foreground">
                    {v == null ? <span className="text-muted-foreground">--</span> : (v * factor).toFixed(2)}
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-[1fr_68px] bg-[#F1F5F9] border-t border-[#EEF1F6]">
              <div className="px-2.5 py-1.5 font-semibold text-foreground border-r border-[#EEF1F6]">合计</div>
              <div className="px-2.5 py-1.5 text-right tabular-nums text-foreground font-semibold">
                {(() => {
                  const sum = displaySaleKeys.reduce((s, k) => s + (sales?.[k] ?? 0), 0);
                  return (sum * factor).toFixed(2);
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
      <LandYearDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} currentYear={currentYear} metricMode={metricMode} factor={metricMode === "amount" ? 1 : 0.62} unit={metricMode === "amount" ? "亿" : "万㎡"} org={org} caliber={caliber} date={date} />
    </Card>
  );
}

// ====== 城市公司排名 / 项目排名 ======
type RankTab = "年度签约" | "月度签约" | "未售货值金额";

// 字符串 hash → 0~1 稳定随机
function _hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// 城市梯队（影响排名的体量系数）
const _CITY_TIER: Record<string, number> = {
  // T1：一线/核心，体量最大
  "深圳公司": 2.4, "上海公司": 2.35, "北京公司": 2.1, "广州公司": 2.0,
  // T2：强二线
  "杭州公司": 1.75, "南京公司": 1.6, "苏州公司": 1.55, "成都公司": 1.55,
  "武汉公司": 1.45, "西安公司": 1.35, "重庆公司": 1.35, "宁波公司": 1.3,
  // T3：普通二线
  "佛山公司": 1.15, "东莞公司": 1.1, "天津公司": 1.05, "青岛公司": 1.0,
  "长沙公司": 1.0, "郑州公司": 0.95, "济南公司": 0.9, "合肥公司": 0.9,
  // T4：其他
  "珠海公司": 0.8, "惠州公司": 0.7, "中山公司": 0.65, "江门公司": 0.55,
  "昆明公司": 0.6, "海南公司": 0.7, "深圳前海": 1.1,
  "产园华南": 0.85, "产园华东": 0.8,
};

// 根据公司/项目名生成稳定的指标
function _seedEntry(name: string) {
  const a = _hash01(name, 1);
  const b = _hash01(name, 2);
  const c = _hash01(name, 3);
  const tier = _CITY_TIER[name] ?? 0.7;
  const target = +((30 + a * 25) * tier).toFixed(2); // 目标随梯队放大
  const value = +(target * (0.55 + b * 0.55)).toFixed(2); // 完成额 ≈ 55%~110% 目标
  const cert = +(50 + c * 45).toFixed(2);
  return { name, target, value, cert };
}

// 项目名池（用于城市公司维度下展示项目排名）
const _PROJECT_POOL = [
  "海上世界", "前海湾·云璟", "公园1872", "天玺·湾", "雍景湾", "中环·璟台",
  "依云·上城", "璞悦山", "金山谷", "外滩·玺", "卓越·星河", "麓园",
  "云栖", "君汇", "御园", "华庭",
];

function CityRankCard({
  factor,
  unit,
  org,
  caliber,
  date,
  onDetail: _onDetail,
}: {
  factor: number;
  unit: string;
  org: string;
  caliber: Caliber;
  date: string;
  onDetail: () => void;
}) {
  const [tab, setTab] = useState<RankTab>("年度签约");
  const [sortKey, setSortKey] = useState<"value" | "rate">("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [riskSortKey, setRiskSortKey] = useState<"value" | "pct">("value");
  const [riskSortDir, setRiskSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (k: "value" | "rate") => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  };
  const toggleRiskSort = (k: "value" | "pct") => {
    if (riskSortKey === k) setRiskSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setRiskSortKey(k); setRiskSortDir("desc"); }
  };
  const SortArrows = ({ active, dir, color }: { active: boolean; dir: "asc" | "desc"; color: string }) => (
    <span className="inline-flex flex-col leading-none ml-0.5 text-[7px]">
      <span style={{ color: active && dir === "asc" ? color : "#CBD5E1" }}>▲</span>
      <span style={{ color: active && dir === "desc" ? color : "#CBD5E1", marginTop: "-1px" }}>▼</span>
    </span>
  );
  const [detailOpen, setDetailOpen] = useState(false);
  useRegisterModuleOpener("city-rank-detail", () => setDetailOpen(true), []);

  // 判断当前 org 类型
  const groups = ORG_TREE.children || [];
  const isGroup = groups.some((g) => g.name === org);
  const isLeafCity = groups.some((g) => g.children?.includes(org));
  const mode: "city" | "project" = isLeafCity ? "project" : "city";

  // 构造名称列表
  const names: string[] = (() => {
    if (mode === "project") {
      return _PROJECT_POOL.slice(0, 10).map((p) => `${org.replace("公司", "")}·${p}`);
    }
    if (isGroup) {
      return groups.find((g) => g.name === org)?.children || [];
    }
    // 招商蛇口或其他：汇总全部城市公司
    return groups.flatMap((g) => g.children || []);
  })();

  const base = names.map(_seedEntry);

  // Tab 间略做差异化
  const data = base.map((c) => {
    const mult = tab === "年度签约" ? 1 : tab === "月度签约" ? 0.18 : 1.45;
    return {
      ...c,
      value: +(c.value * mult * factor).toFixed(2),
      target: +(c.target * (tab === "未售货值金额" ? 0.6 : 1) * factor).toFixed(2),
    };
  });
  const max = Math.max(...data.map((d) => d.value), 1);

  const isRisk = tab === "未售货值金额";
  const totalSumAll = data.reduce((s, x) => s + x.value, 0);
  const sorted = isRisk
    ? [...data].sort((a, b) => {
        const av = riskSortKey === "pct" ? (a.value / (totalSumAll || 1)) : a.value;
        const bv = riskSortKey === "pct" ? (b.value / (totalSumAll || 1)) : b.value;
        return riskSortDir === "desc" ? bv - av : av - bv;
      })
    : [...data].sort((a, b) => {
        const av = sortKey === "rate" ? (a.target > 0 ? a.value / a.target : 0) : a.value;
        const bv = sortKey === "rate" ? (b.target > 0 ? b.value / b.target : 0) : b.value;
        return sortDir === "desc" ? bv - av : av - bv;
      });

  const nameColLabel = mode === "project" ? "项目" : "公司";
  const titleText = mode === "project" ? `${org}·项目排名` : "城市公司排名";
  const rankGridCols = isRisk
    ? "grid-cols-[22px_minmax(64px,1fr)_minmax(72px,96px)_48px_14px]"
    : "grid-cols-[22px_minmax(64px,1fr)_48px_minmax(44px,76px)_52px_48px]";
  const rankGridClass = `grid ${rankGridCols} items-center gap-2`;

  return (
    <>
    <Card className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="h-11 px-5 flex items-center justify-between border-b border-[#EEF1F6] shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-md flex items-center justify-center ${
            isRisk ? "bg-[#FFF1EC] text-[#E0581F]" : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
          }`}>
            <Building2 className="w-3.5 h-3.5" />
          </span>
          <span className="text-[15px] font-semibold text-foreground truncate" title={titleText}>{titleText}</span>
        </div>
        <button
          onClick={() => setDetailOpen(true)}
          className="text-xs text-[var(--color-brand)] hover:underline inline-flex items-center gap-0.5 shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          查看更多 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2 shrink-0">
        <div className="inline-flex h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px]">
          {(["年度签约", "月度签约", "未售货值金额"] as RankTab[]).map((k) => {
            const active = tab === k;
            const riskActive = active && k === "未售货值金额";
            const label = k === "未售货值金额" ? (unit === "万㎡" ? "未售面积" : "未售货值") : k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-2.5 rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? riskActive
                      ? "bg-white text-[#E0581F] shadow-sm"
                      : "bg-white text-[var(--color-brand)] shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}

        </div>
      </div>

      {/* Header + 列表 */}
      <div className="mt-1.5 flex-1 min-h-0 flex flex-col">
        <div className="px-4 shrink-0">
          <div className={`${rankGridClass} px-2 h-8 border-b border-[#EEF1F6] text-[11px] font-medium text-[#64748B] leading-[16px] whitespace-nowrap`}>
            {isRisk ? (
              <>
                <span />
                <span className="min-w-0">{nameColLabel}</span>
                <button
                  type="button"
                  onClick={() => toggleRiskSort("value")}
                  className={`min-w-0 text-right inline-flex items-center justify-end gap-0.5 hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E0581F] ${
                    riskSortKey === "value" ? "text-[#E0581F]" : ""
                  }`}
                  title="点击切换升/降序"
                >
                  {unit === "万㎡" ? `未售面积(${unit})` : `未售货值(${unit})`}
                  <SortArrows active={riskSortKey === "value"} dir={riskSortDir} color="#E0581F" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleRiskSort("pct")}
                  className={`text-right inline-flex items-center justify-end hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E0581F] ${
                    riskSortKey === "pct" ? "text-[#E0581F]" : ""
                  }`}
                  title="点击切换升/降序"
                >
                  占比
                </button>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 shrink-0 text-[#94A3B8] hover:text-[#1677FF] transition-colors cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-white text-slate-700 border border-[#E2E8F0] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] max-w-[240px] text-[11px] leading-[16px]">
                      占总未售 = 当前{nameColLabel}未售货值/面积 ÷ 全部{nameColLabel}未售货值/面积合计 × 100%
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <>
                <span />
                <span className="min-w-0">{nameColLabel}</span>
                <span className="text-right">目标({unit})</span>
                <span />
                <button
                  type="button"
                  onClick={() => toggleSort("value")}
                  className={`text-right inline-flex items-center justify-end gap-0.5 hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] ${
                    sortKey === "value" ? "text-[var(--color-brand)]" : ""
                  }`}
                  title="点击切换升/降序"
                >
                  完成额({unit})
                  <SortArrows active={sortKey === "value"} dir={sortDir} color="var(--color-brand)" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort("rate")}
                  className={`text-right inline-flex items-center justify-end gap-0.5 hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] ${
                    sortKey === "rate" ? "text-[var(--color-brand)]" : ""
                  }`}
                  title="点击切换升/降序"
                >
                  完成率
                  <SortArrows active={sortKey === "rate"} dir={sortDir} color="var(--color-brand)" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-4 pb-3 mt-0.5 overflow-y-auto flex-1 min-h-0 rank-scroll">
        {sorted.length === 0 ? (
          <EmptyState
            title="暂无排名数据"
            description="当前筛选条件下暂无可展示的公司或项目排名"
            className="min-h-[190px]"
          />
        ) : (
        <>
        {(() => {
          const n = sorted.length || 1;
          const avgValue = +(sorted.reduce((s, x) => s + x.value, 0) / n).toFixed(2);
          const avgTarget = +(sorted.reduce((s, x) => s + x.target, 0) / n).toFixed(2);
          const avgRate = avgTarget > 0 ? +((avgValue / avgTarget) * 100).toFixed(2) : 0;
          const totalSum = sorted.reduce((s, x) => s + x.value, 0);
          const avgPct = +((avgValue / (totalSum || 1)) * 100).toFixed(2);
          return (
            <div
              className={`sticky top-0 z-[1] ${rankGridClass} px-2 h-9 rounded-md whitespace-nowrap bg-[#F8FAFC] border-b border-[#E2E8F0]`}
              title="基于当前筛选范围的均值"
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <span className="px-1 h-[15px] inline-flex items-center rounded text-[9px] font-medium bg-[#E6EEFB] text-[var(--color-brand)] leading-none">均值</span>
              </span>
              <span className="min-w-0 text-[11px] leading-[16px] text-[#475569] truncate font-medium">全部平均</span>
              {isRisk ? (
                <>
                  <div className="flex items-center justify-end gap-1.5 min-w-0">
                    <div className="min-w-[38px] flex-1 h-1.5" />
                    <span className="text-[11px] leading-[16px] tabular-nums shrink-0 text-right text-[#1E293B] font-semibold">{avgValue.toFixed(2)}</span>
                  </div>
                  <span className="text-right text-[11px] leading-[16px] tabular-nums text-[#1E293B] font-semibold">{avgPct.toFixed(2)}%</span>
                  <span />
                </>
              ) : (
                <>
                  <span className="text-right text-[11px] leading-[16px] tabular-nums text-[#475569] font-semibold">{avgTarget.toFixed(2)}</span>
                  <div />
                  <span className="text-right text-[11px] leading-[16px] tabular-nums text-[#1E293B] font-semibold">{avgValue.toFixed(2)}</span>
                  <span className="text-right text-[11px] leading-[16px] tabular-nums text-[#475569] font-semibold">{avgRate.toFixed(1)}%</span>
                </>
              )}
            </div>
          );
        })()}
        {sorted.slice(0, 10).map((c, i) => {
          const top3 = i < 3;
          const riskColors = ["#DC2626", "#EA580C", "#F59E0B"];
          const riskColor = riskColors[i] ?? "#FB923C";
          const totalSum = sorted.reduce((s, x) => s + x.value, 0);
          const pctOfTotal = (c.value / (totalSum || 1)) * 100;
          const rate = c.target > 0 ? (c.value / c.target) * 100 : 0;
          return (
            <div
              key={c.name}
              className={`${rankGridClass} px-2 h-9 rounded-md whitespace-nowrap ${
                isRisk && top3 ? "hover:bg-[#FFF7F2]" : "hover:bg-[#F8FAFC]"
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                {isRisk && top3 ? (
                  <AlertTriangle
                    className="w-4 h-4"
                    style={{ color: riskColor }}
                    fill={riskColor}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                ) : top3 && !isRisk ? (
                  <Crown
                    className="w-4 h-4"
                    style={{ color: ["#F5A524", "#94A3B8", "#D97757"][i] }}
                    fill={["#F5A524", "#94A3B8", "#D97757"][i]}
                  />
                ) : (
                  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-medium ${
                    isRisk ? "bg-[#FFF1EC] text-[#E0581F]" : "bg-[#F1F5F9] text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                )}
              </span>
              <span className="min-w-0 text-[11px] leading-[16px] text-[#1E293B] truncate" title={c.name}>{c.name}</span>
              {isRisk ? (
                <>
                  <div className="flex items-center justify-end gap-1.5 min-w-0">
                    <div className="min-w-[38px] flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.value / max) * 100}%`,
                          background: top3
                            ? `linear-gradient(90deg, #FB923C, ${riskColor})`
                            : "linear-gradient(90deg, #FCD9C4, #FB923C)",
                        }}
                      />
                    </div>
                    <span
                      className={`text-[11px] leading-[16px] tabular-nums shrink-0 text-right text-[#1E293B] ${
                        top3 ? "font-semibold" : ""
                      }`}
                      style={top3 ? { color: riskColor } : undefined}
                    >
                      {c.value.toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={`text-right text-[11px] leading-[16px] tabular-nums ${
                      top3 ? "font-semibold" : "text-[#1E293B]"
                    }`}
                    style={top3 ? { color: riskColor } : undefined}
                  >
                    {pctOfTotal.toFixed(2)}%
                  </span>
                  <span />
                </>
              ) : (
                <>
                  <span className="text-right text-[11px] leading-[16px] tabular-nums text-[#475569]">
                    {c.target.toFixed(2)}
                  </span>
                  <div className="relative min-w-0 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, rate)}%`,
                        background: rate >= 100
                          ? "linear-gradient(90deg, #34D399, #10B981)"
                          : top3
                          ? "linear-gradient(90deg, #60A5FA, #1677FF)"
                          : "linear-gradient(90deg, #BFDBFE, #60A5FA)",
                      }}
                    />
                  </div>
                  <span className={`text-right text-[11px] leading-[16px] tabular-nums text-[#1E293B] ${top3 ? "font-semibold" : ""}`}>
                    {c.value.toFixed(2)}
                  </span>
                  <span className="text-right text-[11px] leading-[16px] tabular-nums text-[#475569]">
                    {rate.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          );
        })}
        </>
        )}
        </div>
      </div>
    </Card>
    <CityRankDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} factor={factor} unit={unit} date={date} org={org} caliberLabel={CALIBER_OPTIONS.find((c) => c.key === caliber)!.label} tab={tab} mode={mode} />
    </>
  );
}


// ====== Row 3: 综合分析（多 Tab + KPI + 趋势/明细） ======
const VALUE_TABS = [
  "总货值分析",
  "供货详情",
  "在售货值分析",
  "去化周期分析",
  "销售分析",
  "营销分析",
] as const;
type ValueTab = (typeof VALUE_TABS)[number];

/** KPI 名称 -> hover 提示（含定义 / 取数来源 / 更新频度 / 数据归属方） */
const KPI_TOOLTIPS: Record<string, string> = {
  年度累计签约金额:
    "年度累计签约金额：当年1月1日至统计月末，组织下全部项目累计签约货值\n取数来源：招商蛇口新销售系统\n更新频度：按日更新(T+1)\n数据归属方：招商蛇口总部运营部",
  年度签约目标:
    "年度签约目标：年度经营计划下达签约货值总额\n取数来源：招商蛇口新销售系统\n更新频度：按日更新(T+1)\n数据归属方：招商蛇口总部运营部",
  累计签约缺口:
    "累计签约缺口：阶段性累计目标 - 累计签约货值\n取数来源：招商蛇口新销售系统\n更新频度：按日更新(T+1)\n数据归属方：招商蛇口总部运营部",
  签约完成率:
    "签约完成率：累计签约货值 / 阶段性累计目标 × 100%\n取数来源：招商蛇口新销售系统\n更新频度：按日更新(T+1)\n数据归属方：招商蛇口总部运营部",
  年度累计签约面积:
    "年度累计签约面积：当年1月1日至统计月末，组织下全部项目累计签约面积\n取数来源：招商蛇口新销售系统\n更新频度：按日更新(T+1)\n数据归属方：招商蛇口总部运营部",
};


const BIZ_TYPES = ["全部业态", "住宅", "公寓", "车位", "商业", "写字楼", "其他"] as const;
type BizType = (typeof BIZ_TYPES)[number];

// 当前为 2026 年 5 月
const CURRENT_YEAR = 2026;
const CURRENT_MONTH = 5;
// 本年 12 个月（用于总货值/供货详情，未来月份只显示计划值轮廓）
const FULL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) =>
  `${String(i + 1).padStart(2, "0")}月`
);

// 生成滚动 12 个月（含当月）的标签，例如 25-06 ~ 26-05
function rollingMonths(endYear: number, endMonth: number, count: number) {
  const out: string[] = [];
  let y = endYear;
  let m = endMonth;
  for (let i = 0; i < count; i++) {
    out.unshift(`${String(y).slice(2)}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

const ROLL_12_TO_NOW = rollingMonths(CURRENT_YEAR, CURRENT_MONTH, 12);
const PREV_YEAR = (CURRENT_MONTH as number) === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR;
const PREV_MONTH = (CURRENT_MONTH as number) === 1 ? 12 : CURRENT_MONTH - 1;
const ROLL_12_TO_PREV = rollingMonths(PREV_YEAR, PREV_MONTH, 12);

const VALUE_KPIS: Record<ValueTab, { label: string; value: number; unit: string }[]> = {
  总货值分析: [
    { label: "总货值", value: 612.89, unit: "亿元" },
    { label: "年度计划供货货值", value: 178.50, unit: "亿元" },
    { label: "本年度累计供货货值", value: 92.36, unit: "亿元" },
    { label: "年度累计签约金额", value: 76.82, unit: "亿元" },
  ],
  供货详情: [
    { label: "年度计划供货", value: 178.50, unit: "亿元" },
    { label: "年累计实际", value: 92.36, unit: "亿元" },
    { label: "达成率", value: 51.74, unit: "%" },
  ],
  在售货值分析: [
    { label: "在售货值", value: 220.50, unit: "亿元" },
    { label: "达售未取证货值", value: 152.30, unit: "亿元" },
    { label: "取证未售货值", value: 68.20, unit: "亿元" },
  ],
  去化周期分析: [
    { label: "去化周期", value: 11.71, unit: "月" },
    { label: "剩余未售面积", value: 286.40, unit: "万㎡" },
    { label: "滚动12个月月均销售面积", value: 24.46, unit: "万㎡" },
  ],
  销售分析: [
    { label: "年度累计签约金额", value: 286.40, unit: "亿元" },
    { label: "年度签约目标", value: 480.00, unit: "亿元" },
    { label: "累计签约缺口", value: 193.60, unit: "亿元" },
    { label: "签约完成率", value: 59.67, unit: "%" },
  ],
  营销分析: [
    { label: "累计到访量", value: 12860, unit: "人" },
    { label: "累计认购量", value: 2386, unit: "套" },
    { label: "累计签约量", value: 2102, unit: "套" },
    { label: "到访转认购率", value: 18.55, unit: "%" },
    { label: "认购转签约率", value: 88.10, unit: "%" },
  ],
};

// 业态系数（对原始数据缩放，模拟筛选效果）
const BIZ_FACTOR: Record<BizType, number> = {
  全部业态: 1,
  住宅: 0.62,
  公寓: 0.14,
  车位: 0.09,
  商业: 0.08,
  写字楼: 0.05,
  其他: 0.02,
};

function pseudo(seed: number) {
  const x = Math.sin(seed * 9.13) * 10000;
  return x - Math.floor(x);
}

// —— 各 Tab 数据生成 ——
function buildTab1Data() {
  // 12 个月：已过去月份显示全部数据；未来月份仅显示"计划供货货值"的轮廓柱
  return FULL_YEAR_MONTHS.map((m, i) => {
    const r = pseudo(i + 1);
    const isFuture = i + 1 > CURRENT_MONTH;
    const plan = +(38 + r * 12).toFixed(2);
    return {
      month: m,
      isFuture,
      计划供货货值: plan,
      实际供货货值: isFuture ? null : +(34 + pseudo(i + 11) * 10).toFixed(2),
      签约金额: isFuture ? null : +(40 + pseudo(i + 21) * 9).toFixed(2),
      总货值: isFuture ? null : +(495 + i * 16 + r * 8).toFixed(2),
      年度累计签约金额: isFuture ? null : +(465 + i * 12 + pseudo(i + 31) * 6).toFixed(2),
    };
  });
}

function buildTab2Data(biz: BizType) {
  const f = BIZ_FACTOR[biz];
  return FULL_YEAR_MONTHS.map((m, i) => {
    const isFuture = i + 1 > CURRENT_MONTH;
    const plan = +(46 + pseudo(i + 2) * 14).toFixed(2);
    const real = +(plan * (0.78 + pseudo(i + 5) * 0.18)).toFixed(2);
    return {
      month: m,
      isFuture,
      计划供货: +(plan * f).toFixed(2),
      实际供货: isFuture ? null : +(real * f).toFixed(2),
      达成率: isFuture ? null : +((real / plan) * 100).toFixed(2),
    };
  });
}

const SALE_BUCKETS = ["小于1个月", "1-3个月", "3-6个月", "6-12个月", "12-24个月", "24个月以上"] as const;
function buildTab3Data(biz: BizType) {
  const f = BIZ_FACTOR[biz];
  return SALE_BUCKETS.map((b, i) => {
    const a = +(36 + pseudo(i + 7) * 14).toFixed(2);
    const c = +(4 + pseudo(i + 17) * 6).toFixed(2);
    return {
      bucket: b,
      取证未售: +(a * f).toFixed(2),
      达售未取证: +(c * f).toFixed(2),
    };
  });
}

function buildTab4Data(biz: BizType) {
  const f = BIZ_FACTOR[biz];
  return ROLL_12_TO_NOW.map((m, i) => ({
    month: m,
    库存面积: +((260 + pseudo(i + 4) * 80) * f).toFixed(2),
    去化周期: +(8 + pseudo(i + 14) * 6).toFixed(2),
  }));
}

function buildTab5Data() {
  return ROLL_12_TO_PREV.map((m, i) => {
    const sign = +(20 + pseudo(i + 3) * 18).toFixed(2);
    const gap = +(4 + pseudo(i + 13) * 8).toFixed(2);
    return {
      month: m,
      签约金额: sign,
      签约缺口: gap,
      签约同比: +(-15 + pseudo(i + 23) * 60).toFixed(2),
      签约完成率: +(40 + pseudo(i + 33) * 50).toFixed(2),
    };
  });
}

function buildTab6Data(biz: BizType) {
  const f = BIZ_FACTOR[biz];
  return ROLL_12_TO_NOW.map((m, i) => {
    // 到访量按项目统计，不拆分业态，始终使用全量数据
    const visit = Math.round(900 + pseudo(i + 1) * 600);
    const fullBuy = Math.round(visit * (0.14 + pseudo(i + 6) * 0.08));
    const fullSign = Math.round(fullBuy * (0.82 + pseudo(i + 16) * 0.12));
    const buy = Math.round(fullBuy * f);
    const sign = Math.round(fullSign * f);
    return {
      month: m,
      到访量: visit,
      认购量: buy,
      签约量: sign,
      // 到访转认购率始终基于全量
      到访转认购率: +(((fullBuy / visit) * 100) || 0).toFixed(2),
      认购转签约率: +((buy > 0 ? (sign / buy) * 100 : 0)).toFixed(2),
    };
  });
}


const C = {
  blue: "#1677FF",
  cyan: "#06B6D4",
  yellow: "#F59E0B",
  purple: "#8B5CF6",
  green: "#10B981",
  orange: "#F97316",
};

function BizFilter({ value, onChange }: { value: BizType; onChange: (b: BizType) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {BIZ_TYPES.map((b) => {
        const active = b === value;
        return (
          <button
            key={b}
            onClick={() => onChange(b)}
            className={`px-2.5 h-7 rounded text-[12px] transition-colors border ${
              active
                ? "border-[var(--color-brand)] text-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                : "border-transparent text-[#475569] hover:text-[var(--color-brand)] hover:bg-[#F8FAFC]"
            }`}
          >
            {b}
          </button>
        );
      })}
    </div>
  );
}

function ValueAnalysisCard({
  unit: _unit,
  factor: _factor,
}: {
  onDetail: (label: string) => void;
  unit: string;
  factor: number;
}) {
  const [tab, setTab] = useState<ValueTab>("总货值分析");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [biz, setBiz] = useState<BizType>("全部业态");
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(
    () => new Set(["计划供货货值", "实际供货货值", "签约金额"])
  );
  const toggleSeries = (name: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const legendFormatter = (value: string) => (
    <span style={{ opacity: hiddenSeries.has(value) ? 0.4 : 1, cursor: "pointer", color: "#475569" }}>
      {value}
    </span>
  );
  const isArea = _unit === "万㎡";
  const baseKpis = VALUE_KPIS[tab].map((k) => {
    if (tab === "销售分析" && isArea && k.label === "年度累计签约金额") {
      return { ...k, label: "年度累计签约面积", unit: "万㎡" };
    }
    return k;
  });
  // 数据（提前到 kpis 计算之前，便于联动）
  const tab1 = buildTab1Data();
  const tab2 = buildTab2Data(biz);
  const tab3 = buildTab3Data(biz);
  const tab4 = buildTab4Data(biz);
  const tab5 = buildTab5Data();
  const tab6 = buildTab6Data(biz);
  // 营销分析：到访量/到访转认购率不拆业态；认购/签约/认购转签约率按业态刷新
  const kpis: { label: string; value: number; unit: string; allBizTag?: boolean }[] = (() => {
    if (tab === "总货值分析") {
      // 与趋势图/明细表强一致：取最新有实际数据的月份
      const latest = [...tab1].reverse().find((d) => !d.isFuture);
      const totalValue = latest?.总货值 ?? baseKpis[0].value;
      const cumSign = latest?.年度累计签约金额 ?? baseKpis[3].value;
      return [
        { label: "总货值", value: totalValue, unit: "亿元" },
        baseKpis[1],
        baseKpis[2],
        { label: "年度累计签约金额", value: cumSign, unit: "亿元" },
      ];
    }
    if (tab !== "营销分析") return baseKpis;
    const f = BIZ_FACTOR[biz];
    const fullVisit = 12860;
    const fullBuy = 2386;
    const fullSign = 2102;
    const buy = Math.round(fullBuy * f);
    const sign = Math.round(fullSign * f);
    const visitToBuy = +((fullBuy / fullVisit) * 100).toFixed(2);
    const buyToSign = +(buy > 0 ? (sign / buy) * 100 : 0).toFixed(2);
    return [
      { label: "累计到访量", value: fullVisit, unit: "人", allBizTag: true },
      { label: "累计认购量", value: buy, unit: "套" },
      { label: "累计签约量", value: sign, unit: "套" },
      { label: "到访转认购率", value: visitToBuy, unit: "%", allBizTag: true },
      { label: "认购转签约率", value: buyToSign, unit: "%" },
    ];
  })();
  const showBizFilter = tab === "供货详情" || tab === "在售货值分析" || tab === "去化周期分析" || tab === "营销分析";



  // unit label
  const leftUnitLabel =
    tab === "去化周期分析" ? "万㎡" : tab === "营销分析" ? "数量" : "亿";
  const rightUnitLabel =
    tab === "供货详情" || tab === "去化周期分析" || tab === "销售分析" || tab === "营销分析" ? "%" : null;




  const tooltipStyle = {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
  } as const;

  const UNIT_MAP: Record<string, string> = {
    计划供货货值: "亿", 实际供货货值: "亿", 签约金额: "亿", 总货值: "亿", 年度累计签约金额: "亿",
    计划供货: "亿", 实际供货: "亿", 达成率: "%",
    取证未售: "亿", 达售未取证: "亿",
    库存面积: "万㎡", 去化周期: "月",
    签约缺口: "亿", 签约同比: "%", 签约完成率: "%",
    到访量: "组", 认购量: "套", 签约量: "套",
    到访转认购率: "%", 认购转签约率: "%",
  };
  const bizTagText = showBizFilter ? biz : "全部业态";
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number | string; color: string }>; label?: string | number }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={tooltipStyle} className="px-3 py-2 min-w-[160px]">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-[12px] font-medium text-[#0F172A]">{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium">
            {bizTagText}
          </span>
        </div>
        <div className="space-y-1">
          {payload.map((p, i) => {
            const allBizField = tab === "营销分析" && (p.name === "到访量" || p.name === "到访转认购率");
            const suffix = allBizField && biz !== "全部业态" ? "（全业态）" : "";
            const unit = UNIT_MAP[p.name] ?? "";
            return (
              <div key={i} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
                  {p.name}{suffix}
                </span>
                <span className="tabular-nums text-[#0F172A]">
                  {p.value}
                  {unit && <span className="ml-0.5 text-[#64748B]">{unit}</span>}
                </span>
              </div>
            );
          })}

        </div>
      </div>
    );
  };

  function renderChart() {
    if (tab === "总货值分析") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tab1} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
            <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(91,141,239,0.06)" }} />
            <Legend
              wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
              iconSize={10}
              formatter={legendFormatter}
              onClick={(e: { value?: unknown; dataKey?: unknown }) => toggleSeries(String(e.value ?? e.dataKey ?? ""))}
            />
            <Bar dataKey="计划供货货值" barSize={10} fill={C.yellow} radius={[2, 2, 0, 0]} hide={hiddenSeries.has("计划供货货值")}>
              {tab1.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isFuture ? "transparent" : C.yellow}
                  stroke={C.yellow}
                  strokeWidth={d.isFuture ? 1 : 0}
                  strokeDasharray={d.isFuture ? "3 2" : undefined}
                />
              ))}
            </Bar>
            <Bar dataKey="实际供货货值" barSize={10} fill={C.purple} radius={[2, 2, 0, 0]} hide={hiddenSeries.has("实际供货货值")} />
            <Bar dataKey="签约金额" barSize={10} fill={C.cyan} radius={[2, 2, 0, 0]} hide={hiddenSeries.has("签约金额")} />
            <Line type="monotone" dataKey="总货值" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} hide={hiddenSeries.has("总货值")} />
            <Line type="monotone" dataKey="年度累计签约金额" stroke={C.blue} strokeWidth={2} dot={{ r: 3, fill: C.blue }} hide={hiddenSeries.has("年度累计签约金额")} />

          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    if (tab === "供货详情") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tab2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={40} />
            <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(91,141,239,0.06)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
            <Bar yAxisId="left" dataKey="计划供货" barSize={12} fill={C.blue} radius={[2, 2, 0, 0]}>
              {tab2.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isFuture ? "transparent" : C.blue}
                  stroke={C.blue}
                  strokeWidth={d.isFuture ? 1 : 0}
                  strokeDasharray={d.isFuture ? "3 2" : undefined}
                />
              ))}
            </Bar>
            <Bar yAxisId="left" dataKey="实际供货" barSize={12} fill={C.yellow} radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="达成率" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    if (tab === "在售货值分析") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={tab3} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
            <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(91,141,239,0.06)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
            <Bar dataKey="取证未售" stackId="a" barSize={28} fill={C.blue} />
            <Bar dataKey="达售未取证" stackId="a" barSize={28} fill={C.yellow} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (tab === "去化周期分析") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tab4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={40} />
            <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(91,141,239,0.06)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
            <Bar yAxisId="left" dataKey="库存面积" barSize={14} fill={C.blue} radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="去化周期" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    if (tab === "销售分析") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tab5} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={40} />
            <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(91,141,239,0.06)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
            <Bar yAxisId="left" dataKey="签约金额" stackId="s" barSize={14} fill={C.blue} />
            <Bar yAxisId="left" dataKey="签约缺口" stackId="s" barSize={14} fill={C.yellow} radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="签约同比" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} />
            <Line yAxisId="right" type="monotone" dataKey="签约完成率" stroke={C.purple} strokeWidth={2} dot={{ r: 3, fill: C.purple }} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    // 营销分析
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={tab6} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={40} />
          <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(91,141,239,0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
          <Bar yAxisId="left" dataKey="到访量" barSize={10} fill={C.cyan} radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="认购量" barSize={10} fill={C.yellow} radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="签约量" barSize={10} fill={C.purple} radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="到访转认购率" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} />
          <Line yAxisId="right" type="monotone" dataKey="认购转签约率" stroke={C.blue} strokeWidth={2} dot={{ r: 3, fill: C.blue }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  type TableCol = { key: string; label: string; xKey?: boolean };
  function getTableData(): { cols: TableCol[]; rows: Record<string, unknown>[] } {
    if (tab === "总货值分析") return { cols: [
      { key: "month", label: "月份", xKey: true },
      { key: "计划供货货值", label: "计划供货货值(亿)" },
      { key: "实际供货货值", label: "实际供货货值(亿)" },
      { key: "签约金额", label: "签约金额(亿)" },
      { key: "总货值", label: "总货值(亿)" },
      { key: "年度累计签约金额", label: "年度累计签约金额(亿)" },
    ], rows: tab1 };
    if (tab === "供货详情") return { cols: [
      { key: "month", label: "月份", xKey: true },
      { key: "计划供货", label: "计划供货(亿)" },
      { key: "实际供货", label: "实际供货(亿)" },
      { key: "达成率", label: "达成率(%)" },
    ], rows: tab2 };
    if (tab === "在售货值分析") return { cols: [
      { key: "bucket", label: "去化区间", xKey: true },
      { key: "取证未售", label: "取证未售(亿)" },
      { key: "达售未取证", label: "达售未取证(亿)" },
    ], rows: tab3 };
    if (tab === "去化周期分析") return { cols: [
      { key: "month", label: "月份", xKey: true },
      { key: "库存面积", label: "库存面积(万㎡)" },
      { key: "去化周期", label: "去化周期(月)" },
    ], rows: tab4 };
    if (tab === "销售分析") return { cols: [
      { key: "month", label: "月份", xKey: true },
      { key: "签约金额", label: "签约金额(亿)" },
      { key: "签约缺口", label: "签约缺口(亿)" },
      { key: "签约同比", label: "签约同比(%)" },
      { key: "签约完成率", label: "签约完成率(%)" },
    ], rows: tab5 };
    return { cols: [
      { key: "month", label: "月份", xKey: true },
      { key: "到访量", label: "到访量(人)" },
      { key: "认购量", label: "认购量(套)" },
      { key: "签约量", label: "签约量(套)" },
      { key: "到访转认购率", label: "到访转认购率(%)" },
      { key: "认购转签约率", label: "认购转签约率(%)" },
    ], rows: tab6 };
  }

  function exportTableCSV() {
    const { cols, rows } = getTableData();
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.map((c) => esc(c.label)).join(",");
    const body = rows.map((r) => cols.map((c) => esc(r[c.key])).join(",")).join("\n");
    const csv = "\uFEFF" + header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}_${bizTagText}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderTable() {
    const { cols, rows } = getTableData();
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-[#F1F5F9] text-[#475569]">
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={`font-medium px-3 py-2 border border-[#EEF1F6] ${c.xKey ? "text-left" : "text-right"}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-[#F5F9FF]">
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 border border-[#EEF1F6] ${c.xKey ? "" : "text-right tabular-nums"}`}
                  >
                    {String(r[c.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card className="flex flex-col">
      {/* Header: tabs + 视图切换 */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#EEF1F6] shrink-0">
        <div className="flex items-end gap-1 overflow-x-auto -mb-px">
          {VALUE_TABS.map((t) => {
            const active = t === tab;
            const tone: "blue" | "orange" | "violet" =
              t === "总货值分析" || t === "供货详情"
                ? "blue"
                : t === "在售货值分析" || t === "去化周期分析"
                ? "orange"
                : "violet";
            const grad =
              tone === "blue"
                ? { from: "#1677FF", to: "#60A5FA", soft: "#EFF6FF", text: "#1677FF" }
                : tone === "orange"
                ? { from: "#F59E0B", to: "#FBBF24", soft: "#FFF4E6", text: "#B45309" }
                : { from: "#7C3AED", to: "#A78BFA", soft: "#F3F0FF", text: "#7C3AED" };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-3 h-8 rounded-t-md text-[12px] whitespace-nowrap transition-colors ${
                  active ? "" : "text-[#475569] hover:bg-[#F8FAFC]"
                }`}
                style={{
                  color: active ? grad.text : undefined,
                  backgroundImage: active
                    ? `linear-gradient(90deg, ${grad.from}, ${grad.to}), linear-gradient(${grad.soft}, ${grad.soft})`
                    : "none",
                  backgroundSize: "100% 3px, 100% 100%",
                  backgroundPosition: "top left, bottom left",
                  backgroundRepeat: "no-repeat, no-repeat",
                }}
              >
                {t}
              </button>
            );

          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px]">
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 rounded-[4px] transition-colors ${
                  view === v
                    ? "bg-white text-[var(--color-brand)] shadow-sm"
                    : "text-[#64748B] hover:text-[var(--color-brand)]"
                }`}
              >
                {v === "chart" ? "趋势图" : "明细表"}
              </button>
            ))}
          </div>
          {view === "table" && (
            <ExportButton onClick={exportTableCSV} title="导出 CSV" />
          )}
        </div>
      </div>

      {/* 营销分析口径说明 */}
      {tab === "营销分析" && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-[#BAE0FD] bg-[#EFF6FF] px-3 py-2 text-[12px] text-[#0C4A6E]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[var(--color-brand)]"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>
            <span className="font-medium">口径说明：</span>
            到访数据按项目统计，暂不拆分业态；切换业态后，仅认购量、签约量、认购转签约率按业态刷新。
          </span>
        </div>
      )}

      {/* KPI + 业态筛选 */}
      <div className="px-4 pt-3 flex flex-wrap items-stretch gap-4 justify-between">
        <div
          className="grid gap-0 rounded-md border border-[#EEF1F6] bg-[#FAFBFC] flex-1 min-w-[420px]"
          style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}
        >
          {kpis.map((k, i) => (
            <div
              key={k.label + i}
              className={`px-4 py-2.5 ${i > 0 ? "border-l border-[#EEF1F6]" : ""}`}
            >
              <div className="text-[11px] text-[#64748B] mb-1 flex items-center gap-1">
                <span>{k.label}</span>
                {KPI_TOOLTIPS[k.label] && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-[#94A3B8] cursor-help hover:text-[#1677FF] transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-white text-slate-700 border border-[#E2E8F0] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] max-w-[280px] text-[11px] leading-relaxed whitespace-pre-line">
                        {KPI_TOOLTIPS[k.label]}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {k.allBizTag && biz !== "全部业态" && (
                  <span className="text-[10px] text-[#94A3B8]">（全业态总计）</span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-[20px] font-semibold text-[var(--color-brand)] tabular-nums leading-none">
                  {k.unit === "人" || k.unit === "套" ? k.value.toLocaleString() : k.value.toFixed(2)}
                </span>
                <span className="text-[11px] text-[#64748B]">{k.unit}</span>
              </div>
            </div>
          ))}
        </div>
        {showBizFilter && (
          <div className="flex items-center">
            <BizFilter value={biz} onChange={setBiz} />
          </div>
        )}
      </div>


      {/* 主体 */}
      <div className="px-4 pt-3 pb-4">
        {view === "chart" ? (
          <>
            <div className="flex justify-between text-[11px] text-[#94A3B8] mb-1">
              <span>单位：{leftUnitLabel}</span>
              {rightUnitLabel && <span>单位：{rightUnitLabel}</span>}
            </div>
            <div className="h-[300px]">{renderChart()}</div>
          </>
        ) : (
          renderTable()
        )}
      </div>
    </Card>
  );
}


export default HomePage;
