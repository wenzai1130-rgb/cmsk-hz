import { ExportButton } from "@/components/ui/export-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  BarChart3,
  TrendingDown,
  TrendingUp,
  MoreHorizontal,
  Info,
  ChartSpline,
  Download,
  ExternalLink,
} from "lucide-react";

import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoTip } from "@/components/ui/info-tip";

import { GroupValueQuadrantSection } from "@/pages/Grading/components/GroupValueQuadrantSection";
import { GroupProfitQuadrantSection } from "@/pages/Grading/components/GroupProfitQuadrantSection";
import { enrichProjects, computeAdaptiveThresholds, NINE_GRID_META, classifyNineGrid, COMPARE_LABEL, COMPARE_FILTER_LABEL, type CompareMode } from "@/utils/analysisMetrics";
import { tierOf } from "@/data/chartTheme";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { DayPicker } from "@/components/filters/home-filters";
import { groupProjectAnalysisData } from "@/data/groupProjectAnalysisData";
import { formatProjectName } from "@/lib/format";
import { KpiTrendPopover, type KpiTrendMetric } from "@/pages/Home/components/KpiTrendDialog";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { usePageRequirements, ModuleBadge } from "@/components/requirements";
import { PAGE_REQUIREMENTS } from "./config/pageRequirements";

type ScopeKey = "whole" | "phase1" | "phase2";
const SCOPE_LABEL: Record<ScopeKey, string> = {
  whole: "整盘",
  phase1: "（已开盘）一期",
  phase2: "（未开盘）二期",
};
type CaliberKey = "equity" | "full";
const CALIBER_LABEL: Record<CaliberKey, string> = { equity: "全口径 - 权益", full: "全口径" };

function BrandSelect<T extends string>({
  value,
  onChange,
  options,
  minWidth = 110,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { k: T; label: string }[];
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.k === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        className="h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 hover:bg-white transition-colors"
        style={{ minWidth }}
      >
        <span className="flex-1 text-left">{cur?.label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-full rounded-md border border-[#E2E8F0] bg-white shadow-xl z-30 py-1">
          {options.map((o) => (
            <button
              key={o.k}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.k); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-[var(--color-brand-soft)] ${
                value === o.k ? "text-[var(--color-brand)] font-medium" : "text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}


/** 与首页一致的 KPI 卡片外壳 —— 白底 + 顶部 3px 渐变条 + 右上角柔光 */
type KpiAccent = { from: string; to: string; soft: string };
const KPI_ACCENTS = {
  blue:   { from: "#1677FF", to: "#60A5FA", soft: "#EFF6FF" },
  violet: { from: "#7C3AED", to: "#A78BFA", soft: "#F3F0FF" },
  orange: { from: "#F59E0B", to: "#FBBF24", soft: "#FFF4E6" },
} as const;


function KpiCard({ accent, children }: { accent: KpiAccent; children: React.ReactNode }) {
  return (
    <section className="relative bg-white rounded-[14px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
      />
      <div
        className="absolute top-0 right-0 w-56 h-24 pointer-events-none"
        style={{
          background: `radial-gradient(120% 100% at 100% 0%, ${accent.soft}, transparent 70%)`,
          opacity: 0.9,
        }}
      />
      <div className="relative flex flex-col">{children}</div>
    </section>
  );
}

/**
 * 与首页 KPI 卡片一致的趋势入口图标
 * 点击外层 KpiTrendPopover 即弹出近 12 个月趋势浮窗。
 */
function TrendSparkIcon({ color }: { color: string }) {
  return (
    <ChartSpline
      className="shrink-0 ml-1 opacity-85 hover:opacity-100 transition-opacity"
      style={{ color }}
      size={14}
      strokeWidth={2}
      aria-hidden
    />
  );
}

/**
 * 可点击的指标标签 + 趋势图标 —— 与首页交互保持一致。
 */
function TrendLabel({
  label,
  metric,
  color,
  className = "text-[12px] text-muted-foreground",
}: {
  label: React.ReactNode;
  metric: KpiTrendMetric;
  color: string;
  className?: string;
}) {
  return (
    <KpiTrendPopover metric={metric}>
      <div
        role="button"
        tabIndex={0}
        title="点击查看近 12 个月趋势"
        className={`${className} inline-flex items-center cursor-pointer hover:text-[color:var(--_c)] transition-colors outline-none whitespace-nowrap`}
        style={{ ["--_c" as any]: color }}
      >
        <span>{label}</span>
        <TrendSparkIcon color={color} />
      </div>
    </KpiTrendPopover>
  );
}

const TABS = ["基本信息", "项目总览", "项目多维分析", "货值", "营销"] as const;
type TabKey = (typeof TABS)[number];

const CHART_TABS = ["总货值分析", "供货详情", "在售货值分析", "去化周期分析", "销售分析", "营销分析"] as const;
type ChartTabKey = (typeof CHART_TABS)[number];

// 稳定 hash（用于派生详情假数据）
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}
const rand = (seed: number, min: number, max: number) => min + ((seed % 10000) / 10000) * (max - min);

// 与首页底部趋势图一致的自定义 tooltip
const CHART_UNIT_MAP: Record<string, string> = {
  计划供货货值: "亿",
  实际供货货值: "亿",
  签约金额: "亿",
  总货值: "亿",
  年度累计签约金额: "亿",
};
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color: string }>;
  label?: string | number;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="px-3 py-2 min-w-[160px]"
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 8,
        fontSize: 12,
        boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[12px] font-medium text-[#0F172A]">{label}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium">
          全部业态
        </span>
      </div>
      <div className="space-y-1">
        {payload.map((p, i) => {
          const unit = CHART_UNIT_MAP[p.name] ?? "";
          return (
            <div key={i} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="flex items-center gap-1.5 text-[#475569]">
                <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
                {p.name}
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
}



interface Milestone {
  key: string;
  label: string;
  t: string;
  plan: string;
  actual: string;
  reached: boolean;
}

export default function ProjectDetail() {
  usePageRequirements("项目详情", PAGE_REQUIREMENTS);
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("项目总览");
  const [chartTab, setChartTab] = useState<ChartTabKey>("总货值分析");
  const [viewMode, setViewMode] = useState<"trend" | "detail">("trend");
  const [scope, setScope] = useState<ScopeKey>("whole");
  const [caliber, setCaliber] = useState<CaliberKey>("equity");
  const [dataDate, setDataDate] = useState<string>(getYesterdayStr());


  const project = useMemo(
    () => groupProjectAnalysisData.find((p) => p.projectId === id) ?? groupProjectAnalysisData[0],
    [id],
  );

  const detail = useMemo(() => {
    const seed = hash(project.projectId);
    const equity = 40;
    const totalLand = round2(rand(seed, 1.5, 4.2));
    const equityLand = round2((totalLand * equity) / 100);
    const saleableUnitLandPrice = Math.round(rand(seed + 20, 3200, 7800));
    const repayCoverageRate = round2(rand(seed + 21, 70, 118));
    const totalValue = round2(project.remainingValue * rand(seed + 1, 2.0, 3.0));
    const unsoldValue = round2(project.remainingValue);
    const yearSupplied = round2(unsoldValue * rand(seed + 2, 0.5, 0.8));
    const yearTarget = round2(yearSupplied * rand(seed + 3, 1.05, 1.25));
    const yoy = -(rand(seed + 4, 5, 18));
    const mom = rand(seed + 5, 0.1, 1.5);
    const notStarted = round2(totalValue * 0.42);
    const startedNotSell = round2(totalValue * 0.25);
    const onSale = round2(totalValue - notStarted - startedNotSell);
    return {
      equity,
      totalLand,
      equityLand,
      saleableUnitLandPrice,
      repayCoverageRate,
      totalValue,
      unsoldValue,
      yearSupplied,
      yearTarget,
      yoy,
      mom,
      supplyRate: (yearSupplied / yearTarget) * 100,
      notStarted,
      startedNotSell,
      onSale,
      landReserve: round2(notStarted),
      startedNoPresell: round2(startedNotSell),
      buildOnSaleNoLicense: round2(onSale * 0.19),
      buildOnSaleWithLicense: round2(onSale * 0.33),
      doneNoLicense: round2(onSale * 0.05),
      doneWithLicenseUnsold: round2(onSale * 0.43),
      signedYtd: round2(project.remainingValue * rand(seed + 6, 0.05, 0.15)),
      signedMonth: round2(project.remainingValue * rand(seed + 7, 0.02, 0.06)),
      signedYearTarget: round2(project.remainingValue * rand(seed + 8, 0.25, 0.4)),
      signedMonthTarget: round2(project.remainingValue * rand(seed + 9, 0.04, 0.09)),
    };
  }, [project]);

  const milestones: Milestone[] = useMemo(() => {
    const s = hash(project.projectId + "m");
    const dayOffset = (n: number) => new Date(2024, 0, 1 + Math.floor(rand(s + n, 0, 500))).toISOString().slice(0, 10);
    return [
      { key: "land", label: "拿地时间", t: "T", plan: "2024-01-23", actual: "2023-12-30", reached: true },
      { key: "plan", label: "规划方案获批", t: "T-107", plan: "2023-09-14", actual: "2023-09-14", reached: true },
      { key: "start", label: "基础开工", t: "T+31", plan: "2024-02-17", actual: "2024-01-30", reached: true },
      { key: "open", label: "开盘", t: "T+327", plan: "2024-10-15", actual: "2024-11-21", reached: true },
      { key: "shell", label: "外架拆除", t: "T+633", plan: "2025-09-25", actual: "2025-09-23", reached: true },
      { key: "done", label: "竣工备案", t: "T+849", plan: "2026-04-28", actual: "2026-04-27", reached: true },
      { key: "move", label: "集中入伙", t: "T+909", plan: "2026-06-28", actual: dayOffset(1), reached: true },
    ];
  }, [project]);

  const chartData = useMemo(() => {
    const s = hash(project.projectId + "c");
    const currentMonth = new Date().getMonth() + 1;
    return Array.from({ length: 12 }).map((_, i) => {
      const m = i + 1;
      const isFuture = m > currentMonth;
      const plan = round2(detail.yearTarget * ((i + 1) / 12) + rand(s + i, -1, 1));
      const real = round2(detail.yearSupplied * ((i + 1) / 12) * (i > 6 ? 0.9 : 1));
      const signMonth = round2((detail.signedYtd / 12) * (0.6 + rand(s + i + 5, 0, 0.9)));
      const totalBase = detail.totalValue * (0.82 + i * 0.015);
      return {
        month: `${m}月`,
        isFuture,
        计划供货货值: plan,
        实际供货货值: isFuture ? null : real,
        签约金额: isFuture ? null : signMonth,
        总货值: isFuture ? null : round2(totalBase + rand(s + i, -8, 8)),
        年度累计签约金额: isFuture
          ? null
          : round2(detail.signedYearTarget * ((i + 1) / 12) * rand(s + i * 2, 0.9, 1.05)),
      };
    });
  }, [project, detail]);


  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <HeaderNav activeKey="map" />

      {/* Sub tabs bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-[#EEF2F7]">
        <div className="px-6 flex items-center gap-1">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-[var(--color-brand)] pr-4 border-r border-[#EEF2F7] mr-2 py-3"
          >
            <ChevronLeft className="w-4 h-4" />
            返回项目列表
          </Link>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-4 py-3 text-[14px] transition-colors ${
                  active
                    ? "text-[var(--color-brand)] font-medium"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {t}
                {active && (
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-6 h-[2px] rounded-full bg-[var(--color-brand)]" />
                )}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 py-2">
            <ProjectSwitcher currentId={project.projectId} currentName={project.projectName} variant="header" />
            <BrandSelect<ScopeKey>
              value={scope}
              onChange={setScope}
              options={(Object.keys(SCOPE_LABEL) as ScopeKey[]).map((k) => ({ k, label: SCOPE_LABEL[k] }))}
              minWidth={110}
            />
            <BrandSelect<CaliberKey>
              value={caliber}
              onChange={setCaliber}
              options={(Object.keys(CALIBER_LABEL) as CaliberKey[]).map((k) => ({ k, label: CALIBER_LABEL[k] }))}
              minWidth={140}
            />
            <DayPicker value={dataDate} onChange={setDataDate} portal />
          </div>
        </div>

      </div>

      <div className="px-6 py-5">
        {tab === "基本信息" ? (
          <BasicInfoTab project={project} detail={detail} />
        ) : tab === "货值" ? (
          <HuozhiTab />
        ) : tab === "营销" ? (
          <MarketingTab />
        ) : tab === "项目多维分析" ? (
          <ProjectAnalysisTab project={project} />
        ) : (
          <div className="grid grid-cols-[400px_1fr] gap-4 items-stretch">
            {/* Row 1 - Left: 项目信息 */}
            <ModuleBadge moduleId="pd-info" className="flex flex-col h-full block">

              <section className="bg-white rounded-xl border border-[#EEF2F7] overflow-hidden h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-3.5 rounded-sm bg-[var(--color-brand)]" />
                    <span className="text-[14px] font-medium">项目信息</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2 text-[12.5px]">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0 leading-snug">项目名称：</span>
                    <span className="text-[13px] font-semibold text-foreground leading-snug break-all">
                      {formatProjectName(project.projectName)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="我方股比" value={`${detail.equity.toFixed(2)}%`} />
                    <Field label="并表类型" value="不并表" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="总地价" value={`${detail.totalLand}亿`} />
                    <Field label="权益地价" value={`${detail.equityLand}亿`} />
                  </div>
                  <Field
                    label="可售单方地价"
                    value={`${detail.saleableUnitLandPrice.toLocaleString()}元/㎡`}
                  />
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground shrink-0 inline-flex items-center gap-0.5">
                      回款地价覆盖率
                      <InfoTip tip="回款地价覆盖率 = 累计回款金额 / 总地价" className="ml-0.5" />
                      ：
                    </span>
                    <span className="text-foreground tabular-nums font-medium">
                      {detail.repayCoverageRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="pt-1 space-y-1 text-[12px]">
                    <div className="text-muted-foreground">
                      开盘时间：<span className="text-foreground">实际 2026-06-06，计划 2026-06-21</span>
                    </div>
                    <div className="text-muted-foreground">
                      竣备时间：<span className="text-foreground">实际 --，计划 2028-01-31</span>
                    </div>
                  </div>
                  <div className="pt-2 space-y-1.5">
                    <NineGridRow label="项目去化售估比九宫格分析" value="去化强，售估比高" />
                    <NineGridRow label="板块能级与估售比九宫格分析" value="板块强，估售比高" />
                  </div>

                  {/* 股东与操盘条线 */}
                  <div className="pt-2">
                    <div className="rounded-md border border-[#EEF2F7] overflow-hidden">
                      <div className="grid grid-cols-[1fr_64px_1.4fr] bg-[#F5F8FC] text-[11.5px] font-medium text-slate-700">
                        <div className="px-2 py-1.5">股东方</div>
                        <div className="px-2 py-1.5">股比</div>
                        <div className="px-2 py-1.5">操盘条线</div>
                      </div>
                      <div className="grid grid-cols-[1fr_64px_1.4fr] text-[11.5px] items-center border-t border-[#F1F5F9]">
                        <div className="px-2 py-1.5 text-foreground">招商</div>
                        <div className="px-2 py-1.5 tabular-nums text-foreground">40.00%</div>
                        <div className="px-2 py-1.5 text-foreground leading-snug">设计,营销,工程,成本,财务,物业,客服,采购,报建</div>
                      </div>
                      <div className="grid grid-cols-[1fr_64px_1.4fr] text-[11.5px] items-center border-t border-[#F1F5F9] bg-[#FAFBFD]">
                        <div className="px-2 py-1.5 text-foreground">郑州管城建</div>
                        <div className="px-2 py-1.5 tabular-nums text-foreground">60.00%</div>
                        <div className="px-2 py-1.5 text-muted-foreground">暂不确定</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </ModuleBadge>

            {/* Row 1 - Right: SupplyCard + StageCard + Milestone */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
                <ModuleBadge moduleId="pd-supply" className="block">
                  <SupplyCard detail={detail} />
                </ModuleBadge>
                <ModuleBadge moduleId="pd-stage" className="block">
                  <StageCard detail={detail} />
                </ModuleBadge>
              </div>
              <ModuleBadge moduleId="pd-milestone" className="block">
                <MilestoneCard milestones={milestones} showPhaseTabs={scope === "whole"} projectId={project.projectId} />
              </ModuleBadge>
            </div>


            {/* Row 2 - Left: 货值 card */}
            <ModuleBadge moduleId="pd-value" className="flex flex-col h-full block">


              {/* 货值 card */}
              {(() => {
                const isMockBig = project.projectId === "SH013";
                const total = isMockBig ? 186.42 : detail.totalValue;
                const unsold = isMockBig ? 112.58 : detail.unsoldValue;
                const sold = Math.max(0, round2(total - unsold));
                const sellRate = total > 0 ? (sold / total) * 100 : 0;
                const baseUnits = Math.max(
                  1,
                  Math.round((total * 1e8) / Math.max(project.salesFloorPrice, 1) / 100),
                );
                // 上海徐汇东安2 使用 5 位数套数 + 百亿金额 mock 数据
                const totalUnits = isMockBig ? Math.max(baseUnits, 12480) : baseUnits;
                const soldUnits = Math.round(totalUnits * (sellRate / 100));
                const unsoldUnits = Math.max(0, totalUnits - soldUnits);
                const unitSellRate = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;

                const parkingUnits = Math.round(totalUnits * 0.37);
                const residentialUnits = unsoldUnits;
                const parkingValue = round2(unsold * 0.022);
                const residentialValue = round2(unsold - parkingValue);
                const yearSoldValue = round2(sold * 0.31);
                // 未售业态明细：第一个项目展示多业态，其他项目默认住宅 + 车位
                // 显示顺序：住宅、公寓、商业、写字楼、其他、车位
                type FormatRow = { label: string; value: number; units: number; unit: string };
                const FORMAT_ORDER = ["住宅", "公寓", "商业", "写字楼", "其他", "车位"];
                const rawRows: FormatRow[] = (project.projectId === "SZ001" || project.projectId === "SH013")
                  ? [
                      { label: "住宅",   value: round2(unsold * 0.55), units: Math.round(unsoldUnits * 0.58), unit: "套" },
                      { label: "车位",   value: round2(unsold * 0.05), units: Math.round(unsoldUnits * 0.28), unit: "个" },
                      { label: "商业",   value: round2(unsold * 0.15), units: Math.round(unsoldUnits * 0.06), unit: "套" },
                      { label: "公寓",   value: round2(unsold * 0.12), units: Math.round(unsoldUnits * 0.05), unit: "套" },
                      { label: "写字楼", value: round2(unsold * 0.10), units: Math.round(unsoldUnits * 0.02), unit: "套" },
                      { label: "其他",   value: round2(unsold * 0.03), units: Math.round(unsoldUnits * 0.01), unit: "套" },
                    ]
                  : [
                      { label: "住宅", value: residentialValue, units: residentialUnits, unit: "套" },
                      { label: "车位", value: parkingValue,     units: parkingUnits,     unit: "个" },
                    ];
                const formatRows: FormatRow[] = rawRows
                  .filter((r) => r.value > 0 && r.units > 0)
                  .sort((a, b) => FORMAT_ORDER.indexOf(a.label) - FORMAT_ORDER.indexOf(b.label));

                return (
                  <section className="bg-white rounded-xl border border-[#EEF2F7] overflow-hidden h-full flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-3.5 rounded-sm bg-[var(--color-brand)]" />
                        <span className="text-[14px] font-medium">货值</span>
                      </div>
                    </div>

                    {/* Block 1: 主指标 */}
                    <div className="p-4">
                      <div className="grid grid-cols-[1fr_auto] gap-x-6 items-stretch">
                        {/* 左：总货值 / 总套数 */}
                        <div className="flex flex-col gap-4 min-w-0 justify-center">
                          <div>
                            <div className="flex items-baseline gap-1 leading-none tabular-nums whitespace-nowrap">
                              <span className="text-[18px] font-bold text-[#1677FF]">{total.toFixed(2)}</span>
                              <span className="text-[11px] font-medium text-slate-400">亿</span>
                              <span className="mx-1 text-slate-300 font-normal">/</span>
                              <span className="text-[18px] font-bold text-slate-900">{sellRate.toFixed(2)}</span>
                              <span className="text-[11px] font-medium text-slate-400">%</span>
                            </div>
                            <div className="mt-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                              总货值 <span className="text-slate-300">/</span> 累计去化率
                            </div>
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1 leading-none tabular-nums whitespace-nowrap">
                              <span className="text-[18px] font-bold text-[#F59E0B]">{totalUnits.toLocaleString()}</span>
                              <span className="text-[11px] font-medium text-slate-400">套</span>
                              <span className="mx-1 text-slate-300 font-normal">/</span>
                              <span className="text-[18px] font-bold text-slate-900">{unitSellRate.toFixed(2)}</span>
                              <span className="text-[11px] font-medium text-slate-400">%</span>
                            </div>
                            <div className="mt-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                              总套数 <span className="text-slate-300">/</span> 累计去化率
                              <div className="text-slate-400">(不含车位)</div>
                            </div>
                          </div>
                        </div>

                        {/* 右：已售 / 未售（含业态明细） */}
                        <div className="bg-slate-50/60 rounded-lg border border-slate-100 px-3 py-2.5 text-[11px] tabular-nums h-full min-h-[132px]">
                          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-1 gap-y-1.5 whitespace-nowrap">
                            {/* 已售 */}
                            <span className="text-slate-500">已售</span>
                            <span />
                            <span className="font-semibold text-[#1677FF] text-right">{sold.toFixed(2)}亿</span>
                            <span className="text-slate-300 px-1">/</span>
                            <span className="font-semibold text-[#F59E0B] text-left">{soldUnits.toLocaleString()}套</span>

                            {/* 未售 */}
                            <span className="text-slate-500">未售</span>
                            <span />
                            <span className="font-semibold text-[#1677FF] text-right">{unsold.toFixed(2)}亿</span>
                            <span className="text-slate-300 px-1">/</span>
                            <span className="font-semibold text-[#F59E0B] text-left">{unsoldUnits.toLocaleString()}套</span>

                            {/* 未售业态明细：与上方同网格对齐，/ 与 数值 整体右移一位 */}
                            {formatRows.length > 0 && formatRows.map((r, idx) => {
                              const isLast = idx === formatRows.length - 1;
                              return (
                                <div key={r.label} className="contents">
                                  <span className="text-slate-500 inline-flex items-center pl-2 relative">
                                    <span
                                      className="absolute left-2 w-px bg-slate-300"
                                      style={{ top: "-6px", height: isLast ? "calc(50% + 6px)" : "calc(100% + 6px)" }}
                                    />
                                    <span className="inline-block w-2 h-px bg-slate-300 mr-1.5 relative z-[1]" />
                                    <span className="inline-block w-[3em] text-justify [text-align-last:justify]">
                                      {r.label}
                                    </span>
                                  </span>
                                  <span />
                                  <span className="text-slate-900 text-right translate-x-3">{r.value.toFixed(2)}亿</span>
                                  <span className="text-slate-300 px-1 translate-x-3">/</span>
                                  <span className="text-slate-900 text-left translate-x-3">{r.units.toLocaleString()}{r.unit}</span>
                                </div>
                              );
                            })}


                          </div>
                        </div>
                      </div>
                    </div>




                    {/* Block 2: 年度达售 */}
                    <div className="px-4 pb-3">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="grid grid-cols-2 gap-3 items-center">
                          <div>
                            <div className="flex items-baseline gap-0.5 tabular-nums leading-none">
                              <span className="text-[18px] font-bold text-slate-900">{sellRate.toFixed(2)}</span>
                              <span className="text-[11px] text-slate-900">%</span>


                            </div>
                            <div className="mt-1.5 text-[11px] text-slate-500">年度达售去化率</div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">达售未售：</span>
                              <span className="text-[11px] font-semibold text-[#1677FF] tabular-nums">{unsold.toFixed(2)}亿</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">本年已售：</span>
                              <span className="text-[11px] font-semibold text-[#1677FF] tabular-nums">{yearSoldValue.toFixed(2)}亿</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Block 3: 已竣未售 */}
                    <div className="px-4 pb-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="grid grid-cols-2 gap-3 items-center">
                          <div>
                            <div className="flex items-baseline gap-0.5 tabular-nums leading-none">
                              <span className="text-[18px] font-bold text-[#1677FF]">0.00</span>
                              <span className="text-[11px] text-[#1677FF]">亿</span>

                            </div>
                            <div className="mt-1.5 text-[11px] text-slate-500">已竣未售</div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">往年竣工：</span>
                              <span className="text-[11px] font-semibold text-[#1677FF] tabular-nums">0.00亿</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">本年竣工：</span>
                              <span className="text-[11px] font-semibold text-[#1677FF] tabular-nums">0.00亿</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })()}
            </ModuleBadge>

            {/* Row 2 - Right: Chart */}

              <ModuleBadge moduleId="pd-chart" className="block">
              <section className="bg-white rounded-xl border border-[#EEF2F7]">

                <div className="flex items-center justify-between px-4 pt-3">
                  <div className="flex items-center gap-4 text-[13px]">
                    {CHART_TABS.map((c) => {
                      const active = chartTab === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setChartTab(c)}
                          className={`relative pb-2 transition-colors ${
                            active ? "text-[var(--color-brand)] font-medium" : "text-foreground/70 hover:text-foreground"
                          }`}
                        >
                          {c}
                          {active && (
                            <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[var(--color-brand)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="inline-flex rounded-md border border-[#E2E8F0] overflow-hidden text-[12px]">
                    {(["trend", "detail"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setViewMode(m)}
                        className={`px-3 py-1 transition-colors ${
                          viewMode === m
                            ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                            : "bg-white text-foreground/70 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {m === "trend" ? "趋势图" : "明细表"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#F1F5F9] mt-2 px-4 py-3">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 mb-3">
                    <MetricInline label="未售总货值" value={detail.unsoldValue} unit="亿元" color="#1677FF" />
                    <MetricInline label="年度计划供货货值" value={detail.yearTarget} unit="亿元" color="#1677FF" />
                    <MetricInline label="年累计供货值" value={detail.yearSupplied} unit="亿元" color="#1677FF" />
                    <MetricInline
                      label="年度累计签约金额"
                      value={detail.signedYearTarget}
                      unit="亿元"
                      color="#1677FF"
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-1">单位：亿</div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(91,141,239,0.06)" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                        <Bar dataKey="计划供货货值" barSize={10} fill="#F59E0B" radius={[2, 2, 0, 0]}>
                          {chartData.map((d, i) => (
                            <Cell
                              key={i}
                              fill={d.isFuture ? "transparent" : "#F59E0B"}
                              stroke="#F59E0B"
                              strokeWidth={d.isFuture ? 1 : 0}
                              strokeDasharray={d.isFuture ? "3 2" : undefined}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="实际供货货值" barSize={10} fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="签约金额" barSize={10} fill="#06B6D4" radius={[2, 2, 0, 0]} />
                        <Line type="monotone" dataKey="总货值" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} />
                        <Line type="monotone" dataKey="年度累计签约金额" stroke="#1677FF" strokeWidth={2} dot={{ r: 3, fill: "#1677FF" }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
              </ModuleBadge>
          </div>

        )}
      </div>
    </div>
  );
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted-foreground shrink-0">{label}：</span>
      <span className={`truncate ${strong ? "text-foreground font-medium" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function NineGridRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-1 text-[12px] leading-relaxed">
      <span className="text-muted-foreground shrink-0">{label}：</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function SignStat({
  label,
  value,
  target,
  color,
  monthLabel,
  metric,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  monthLabel?: boolean;
  metric: KpiTrendMetric;
}) {
  const rate = Math.min(999, (value / target) * 100);
  return (
    <div>
      <TrendLabel label={label} metric={metric} color={color} />
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[26px] font-bold tabular-nums leading-none" style={{ color }}>
          {value.toFixed(2)}
        </span>
        <span className="text-[10px]" style={{ color }}>
          亿
        </span>
        <TrendingUp className="w-2.5 h-2.5 text-muted-foreground ml-0.5" />
      </div>
      <div className="mt-1 text-[10.5px] text-muted-foreground tabular-nums leading-tight">
        {monthLabel ? "月目标" : "目标"} {target.toFixed(2)} 亿
        <span className="ml-1.5" style={{ color }}>
          达成 {rate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// 金额自适应：< 1 亿时切换为「万」展示；≥ 1 亿保留 2 位小数展示为「亿」。
function autoAmountFromYi(vInYi: number): { num: string; unit: string } {
  if (!Number.isFinite(vInYi)) return { num: "--", unit: "" };
  if (Math.abs(vInYi) < 1) {
    const wan = vInYi * 10000;
    return {
      num: wan.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      unit: "万",
    };
  }
  return { num: vInYi.toFixed(2), unit: "亿" };
}

// 归一化含「亿 / 万」单位的字符串：若为「亿」且绝对值 < 1，转换为「万」展示。
function normalizeAmountStr(s: string): string {
  const m = s.match(/^(.*?)(-?[\d,]+(?:\.\d+)?)(亿|万)(.*)$/);
  if (!m) return s;
  const [, prefix, numStr, unit, suffix] = m;
  const n = parseFloat(numStr.replace(/,/g, ""));
  if (!Number.isFinite(n)) return s;
  if (unit === "亿" && Math.abs(n) < 1) {
    const wan = n * 10000;
    return `${prefix}${wan.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}万${suffix}`;
  }
  return s;
}

function SupplyCard({ detail }: { detail: DetailShape }) {
  const MetricLabel = ({
    label,
    metric,
  }: {
    label: string;
    metric: KpiTrendMetric;
  }) => (
    <KpiTrendPopover metric={metric}>
      <div
        role="button"
        tabIndex={0}
        title="点击查看近 12 个月趋势"
        className="inline-flex items-center text-[12px] text-[#6B7280] cursor-pointer hover:text-[#1677FF] transition-colors outline-none whitespace-nowrap"
      >
        <span>{label}</span>
        <ChartSpline
          className="shrink-0 ml-1.5 opacity-85 hover:opacity-100 transition-opacity"
          style={{ color: "#1677FF" }}
          size={14}
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </KpiTrendPopover>
  );

  const TrendTag = ({
    value,
    label,
    invert = false,
  }: {
    value: number;
    label: string;
    invert?: boolean;
  }) => {
    const isUp = value >= 0;
    const color = invert ? (isUp ? "#059669" : "#DC2626") : (isUp ? "#DC2626" : "#059669");
    const Icon = isUp ? TrendingUp : TrendingDown;
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums" style={{ color }}>
        <Icon className="w-3 h-3" />
        {label} {Math.abs(value).toFixed(2)}%
      </span>
    );
  };

  return (
    <section className="h-full flex flex-col bg-white rounded-xl border border-[#EEF2F7] shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-4 py-3">
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-1 h-3.5 rounded-sm bg-[var(--color-brand)]" />
        <span className="text-[14px] font-medium text-[#1E293B]">总货值及供货</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 [grid-template-rows:auto_auto_auto] items-end">
        {/* Row 1: Labels */}
        <MetricLabel label="未售总货值" metric="未售总货值" />
        <MetricLabel label="年累计供货" metric="新拿地货值" />

        {/* Row 2: Main values */}
        {(() => {
          const u = autoAmountFromYi(detail.unsoldValue);
          return (
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-bold leading-none tabular-nums text-[#1677FF]">{u.num}</span>
              <span className="text-[11px] font-medium text-[#6B7280]">{u.unit}</span>
            </div>
          );
        })()}
        {(() => {
          const s = autoAmountFromYi(detail.yearSupplied);
          return (
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-bold leading-none tabular-nums text-[#1677FF]">{s.num}</span>
              <span className="text-[11px] font-medium text-[#6B7280]">{s.unit}</span>
            </div>
          );
        })()}

        {/* Row 3: Footer (trends / progress) — bottom aligned */}
        <div className="flex items-center gap-3 pt-1">
          <TrendTag value={detail.yoy} label="同比" />
          <TrendTag value={detail.mom} label="环比" />
        </div>
        <div className="pt-1">
          <div className="h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#BFDBFE] via-[#60A5FA] to-[#1677FF]"
              style={{ width: `${Math.min(100, detail.supplyRate)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-[#6B7280]">
            <span>
              目标 <span className="text-[#374151]">{(() => { const t = autoAmountFromYi(detail.yearTarget); return `${t.num} ${t.unit}`; })()}</span>
            </span>
            <span>
              达成 <span className="text-[#374151] font-medium">{detail.supplyRate.toFixed(2)}%</span>
            </span>
          </div>
        </div>
      </div>


      {/* 底部：土储 → 在建 → 竣工 阶段流转 */}
      <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
        {(() => {
          const unsold = detail.unsoldValue;
          const s1 = Math.round(unsold * 0.28 * 100) / 100;
          const s2 = Math.round(unsold * 0.51 * 100) / 100;
          const s3 = Math.round((unsold - s1 - s2) * 100) / 100;
          const stages = [
            { step: 1, label: "土储", value: s1, tint: "#94A3B8", bg: "#F1F5F9" },
            { step: 2, label: "在建", value: s2, tint: "#F59E0B", bg: "#FEF3C7" },
            { step: 3, label: "竣工", value: s3, tint: "#1677FF", bg: "#DBEAFE" },
          ];
          return (
        <div className="flex items-center justify-center gap-4">
          {stages.map((s, i, arr) => (
            <div key={s.step} className="flex items-center gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold tabular-nums"
                    style={{ background: s.bg, color: s.tint }}
                  >
                    {s.step}
                  </span>
                  <span className="text-[12px] text-[#475569]">{s.label}</span>
                </div>
                <div className="flex items-baseline gap-1 whitespace-nowrap">
                  {(() => {
                    const a = autoAmountFromYi(s.value);
                    return (
                      <>
                        <span className="text-[18px] font-bold tabular-nums text-[#1E293B] leading-none">{a.num}</span>
                        <span className="text-[11px] text-[#6B7280]">{a.unit}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              {i < arr.length - 1 && (
                <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EFF6FF] ring-1 ring-[#DBEAFE]">
                  <ChevronRight className="w-3.5 h-3.5 text-[#1677FF]" strokeWidth={2.5} />
                </span>
              )}
            </div>
          ))}
        </div>

          );
        })()}
      </div>

    </section>

  );
}

function StageCard({ detail }: { detail: DetailShape }) {
  void detail;
  // 经营指标数据（mock，可后续接入真实字段）
  const yearly = {
    sign: { value: "2.50亿", units: "253套", target: "目标4.31亿", rate: 58.01 },
    payback: { value: "2.35亿", units: "", target: "目标0万", rate: 0 },
    unpaid: { title: "签未回", main: "1,539万", sub: "" },
  };
  const cumulative = {
    sign: { value: "2.50亿", units: "253套", target: "去化率", rate: 31.52 },
    payback: { value: "2.35亿", units: "", target: "签约回款率", rate: 93.85 },
    unpaid: { title: "认未签", main: "4,443万", sub: "25套" },
  };

  const ValueWithUnit = ({
    value,
    color,
    numSize = "text-[18px]",
    unitSize = "text-[11px]",
  }: {
    value: string;
    color: string;
    numSize?: string;
    unitSize?: string;
  }) => {
    const match = value.trim().match(/^(\d[\d,.]*)(.*)$/);
    const num = match ? match[1] : value;
    const unit = match ? match[2].trim() : "";
    return (
      <span className="inline-flex items-baseline gap-0.5 tabular-nums leading-none">
        <span className={`font-bold ${numSize} ${color}`}>{num}</span>
        {unit && <span className={`font-medium text-slate-500 ${unitSize}`}>{unit}</span>}
      </span>
    );
  };

  const ProgressCard = ({
    kind,
    value,
    units,
    target,
    rate,
  }: {
    kind: string;
    value: string;
    units?: string;
    target: string;
    rate: number;
  }) => (
    <div className="bg-white rounded-lg border border-white shadow-sm hover:shadow-md transition-all px-3 py-2">
      <div>
        <span className="text-[11px] font-medium text-slate-500 tracking-tight">{kind}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 tabular-nums leading-none">
        <ValueWithUnit value={normalizeAmountStr(value)} color="text-[#1677FF]" />
        {units && <ValueWithUnit value={units} color="text-[#F59E0B]" numSize="text-[12px]" />}
      </div>
      <div className="mt-1.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#1677FF] transition-all"
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] font-medium">
        <span className="text-slate-400 truncate">{normalizeAmountStr(target)}</span>
        <span className="text-slate-500 tabular-nums">{rate.toFixed(2)}%</span>
      </div>
    </div>
  );

  const StatCard = ({
    title,
    main,
    sub,
    tip,
  }: {
    title: string;
    main: string;
    sub?: string;
    tip?: string;
  }) => (
    <div className="bg-white rounded-lg border border-white shadow-sm hover:shadow-md transition-all px-3 py-2 flex flex-col justify-center">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500">{title}</span>
        {tip ? (
          <InfoTip tip={tip} />
        ) : (
          <Info className="w-3 h-3 text-[#94A3B8]" />
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 tabular-nums leading-none">
        <ValueWithUnit value={normalizeAmountStr(main)} color="text-[#1677FF]" />
        {sub && <ValueWithUnit value={normalizeAmountStr(sub)} color="text-[#F59E0B]" numSize="text-[12px]" />}
      </div>
    </div>
  );

  return (
    <section className="h-full flex flex-col bg-white rounded-xl border border-[#EEF2F7] px-4 py-3">

      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="w-1 h-3.5 rounded-sm bg-[var(--color-brand)]" />
        <span className="text-[14px] font-medium">经营指标</span>
      </div>

      <div className="p-2.5 rounded-xl bg-[#F5F8FF] border border-blue-100/60">
        <div className="grid grid-cols-3 gap-2.5 items-stretch">
          <ProgressCard kind="年度签约" value={yearly.sign.value} units={yearly.sign.units} target={yearly.sign.target} rate={yearly.sign.rate} />
          <ProgressCard kind="年度回款" value={yearly.payback.value} target={yearly.payback.target} rate={yearly.payback.rate} />
          <StatCard title={yearly.unpaid.title} main={yearly.unpaid.main} sub={yearly.unpaid.sub} tip="签未回 = 累计签约金额 − 累计回款金额" />

          <ProgressCard kind="累计签约" value={cumulative.sign.value} units={cumulative.sign.units} target={cumulative.sign.target} rate={cumulative.sign.rate} />
          <ProgressCard kind="累计回款" value={cumulative.payback.value} target={cumulative.payback.target} rate={cumulative.payback.rate} />
          <StatCard title={cumulative.unpaid.title} main={cumulative.unpaid.main} sub={cumulative.unpaid.sub} tip="认未签 = 已认购但最终未签约的总套数及对应金额" />
        </div>
      </div>
    </section>
  );
}


const CN_NUMS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function getPhaseList(projectId?: string): { k: string; label: string }[] {
  if (projectId === "HF002") {
    const labels = [
      "公园56号住宅地块",
      "宗地三12、13、14号地块",
      "宗地七（销售）",
      "时代公园二期55号地",
      "宗地二57号地",
      "宗地二58号地",
      "宗地一54号地",
      "宗地五6号地块",
      "宗地二32号地",
      "宗地二59号地",
      "宗地二46、28号地",
      "宗地四4号地块",
      "宗地一3号地",
      "宗地一8号地块",
      "宗地三5号地",
    ];
    return labels.map((label, i) => ({ k: `phase${i + 1}`, label }));
  }

  return [
    { k: "phase1", label: "一期" },
    { k: "phase2", label: "二期" },
  ];
}

function MilestoneCard({ milestones, showPhaseTabs, projectId }: { milestones: Milestone[]; showPhaseTabs?: boolean; projectId?: string }) {
  const phases = useMemo(() => getPhaseList(projectId), [projectId]);
  const [phase, setPhase] = useState<string>(phases[0].k);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanL(el.scrollLeft > 2);
      setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [phases.length, showPhaseTabs]);
  const scrollBy = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  const displayMilestones = useMemo(() => {
    // HF002：从「二期」起，每多一期少 1 个已到达节点，仅显示计划日期
    if (projectId === "HF002") {
      const idx = phases.findIndex((p) => p.k === phase);
      const unreached = Math.min(milestones.length, Math.max(0, idx) * 1 + (idx >= 1 ? 3 : 0));
      if (unreached === 0) return milestones;
      return milestones.map((m, i) =>
        i >= milestones.length - unreached ? { ...m, actual: "--", reached: false } : m,
      );
    }
    return milestones;
  }, [milestones, phase, projectId, phases]);
  return (
    <section className="bg-white rounded-xl border border-[#EEF2F7] px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1 h-3.5 rounded-sm bg-[var(--color-brand)]" />
          <span className="text-[14px] font-medium">计划节点跟踪</span>
        </div>
        {showPhaseTabs && (
          <div className="relative flex items-center min-w-0 flex-1 justify-end max-w-[calc((100%-1rem)*2/3)]">
            {canL && (
              <button
                type="button"
                onClick={() => scrollBy(-120)}
                className="absolute left-0 z-10 h-6 w-6 inline-flex items-center justify-center rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[var(--color-brand)] hover:border-[var(--color-brand)] shadow-sm"
                aria-label="向左滚动"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <div
              ref={scrollRef}
              className="flex items-center gap-0.5 overflow-x-auto scrollbar-none rounded-md bg-[#F1F5F9] p-0.5 max-w-full"
              style={{ scrollbarWidth: "none", paddingLeft: canL ? 28 : undefined, paddingRight: canR ? 28 : undefined }}
            >
              {phases.map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setPhase(t.k)}
                  className={`shrink-0 px-2.5 py-1 text-[12px] rounded-[5px] transition-colors ${
                    phase === t.k
                      ? "bg-white text-[var(--color-brand)] shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {canR && (
              <button
                type="button"
                onClick={() => scrollBy(120)}
                className="absolute right-0 z-10 h-6 w-6 inline-flex items-center justify-center rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[var(--color-brand)] hover:border-[var(--color-brand)] shadow-sm"
                aria-label="向右滚动"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative pt-2">
        {(() => {
          const reachedCount = displayMilestones.filter((m) => !!m.actual && m.actual !== "--").length;
          const total = displayMilestones.length;
          const greenPct = total > 1 ? (Math.max(reachedCount - 1, 0) / (total - 1)) * 100 : 100;
          return (
            <>
              <div className="absolute left-0 right-0 top-[36px] h-[2px] bg-[#E2E8F0] rounded-full" />
              <div
                className="absolute left-0 top-[36px] h-[2px] bg-[#10B981] rounded-full"
                style={{ width: `${greenPct}%` }}
              />
            </>
          );
        })()}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${displayMilestones.length}, minmax(0, 1fr))` }}>
          {displayMilestones.map((m) => {
            const hasActual = !!m.actual && m.actual !== "--";
            const hasPlan = !!m.plan && m.plan !== "--";
            const notReached = !hasActual;
            let actualColor = "text-foreground";
            if (hasActual && hasPlan) {
              if (m.actual > m.plan) actualColor = "text-[#F59E0B]";
              else if (m.actual < m.plan) actualColor = "text-[#059669]";
            }
            const dotColor = notReached ? "bg-[#CBD5E1]" : "bg-[#10B981]";
            const labelColor = notReached ? "text-[#94A3B8]" : "text-[#059669]";
            return (
              <div key={m.key} className="flex flex-col items-center text-center px-1">
                <div className="text-[11px] text-muted-foreground mb-1">{m.t}</div>
                <div className={`relative z-10 w-3 h-3 rounded-full ring-4 ring-white ${dotColor}`} />
                <div className={`mt-2 text-[12.5px] font-medium ${labelColor}`}>{m.label}</div>
                {hasPlan && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    计划 <span className="text-foreground tabular-nums">{m.plan}</span>
                  </div>
                )}
                <div className={`text-[11px] text-muted-foreground ${!hasPlan ? "mt-1" : ""}`}>
                  实际{" "}
                  <span className={`tabular-nums ${hasActual ? actualColor : "text-muted-foreground"}`}>
                    {hasActual ? m.actual : "--"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MetricInline({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1" style={{ color }}>
        <span className="text-[20px] font-semibold tabular-nums leading-none">{value.toFixed(2)}</span>
        <span className="text-[11px]">{unit}</span>
      </div>
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#EEF2F7] p-20 text-center text-muted-foreground">
      <MoreHorizontal className="w-8 h-8 mx-auto mb-3 opacity-40" />
      「{name}」模块建设中
    </div>
  );
}

/* ============ 基本信息 Tab ============ */
function InfoField({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-[12.5px]">
      <span className="text-muted-foreground shrink-0">{label}：</span>
      <span className={`text-foreground ${strong ? "font-medium" : ""} break-all`}>{value}</span>
    </div>
  );
}
function SectionCard({ title, extra, children, className, bodyClassName }: { title: string; extra?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={`bg-white rounded-xl border border-[#EEF2F7] ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-sm bg-[var(--color-brand)]" />
          <span className="text-[14px] font-medium">{title}</span>
        </div>
        {extra}
      </div>
      <div className={`px-4 py-3 ${bodyClassName ?? ""}`}>{children}</div>
    </section>
  );
}
function BasicInfoTab({ project, detail }: { project: { projectId: string; projectName: string }; detail: DetailShape }) {
  const planRows = [
    { phase: "合计", zzTao: 473, zzArea: 56569, gyTao: 0, gyArea: 0, syTao: 0, syArea: 0, xzlTao: 0, xzlArea: 0, cwGe: 378, cwArea: 378, qtTao: 0, qtArea: 0, totalTao: 473, totalArea: 56569 },
    { phase: "一期", zzTao: 473, zzArea: 56569, gyTao: 0, gyArea: 0, syTao: 0, syArea: 0, xzlTao: 0, xzlArea: 0, cwGe: 378, cwArea: 378, qtTao: 0, qtArea: 0, totalTao: 473, totalArea: 56569 },
  ];
  const shareRows = [
    { name: "招商", ratio: "40.00%", ops: "设计,营销,工程,成本,财务,物业,客服,采购,报建" },
    { name: "郑州管城建中", ratio: "60.00%", ops: "暂不确定" },
    { name: "郑州管开新城", ratio: "0.00%", ops: "暂不确定" },
  ];
  const [landOpen, setLandOpen] = useState(true);
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(10);
  const planTotalPages = Math.max(1, Math.ceil(planRows.length / planPageSize));
  const planCurrentPage = Math.min(planPage, planTotalPages);
  const planPageRows = planRows.slice((planCurrentPage - 1) * planPageSize, planCurrentPage * planPageSize);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        <ModuleBadge moduleId="bi-info" className="block h-full">
        <SectionCard title="项目信息" className="h-full">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <InfoField label="项目名称" value={formatProjectName(project.projectName)} strong />
            <InfoField label="法人公司" value="郑州市禾康置业有限公司" />
            <InfoField label="推广名称" value="招商臻境" />
            <InfoField label="销售类型" value="预售项目" />
            <div className="col-span-2">
              <InfoField label="详细地址" value="河南省郑州市管城回族区天宝路北、尚义路东" />
            </div>
            <InfoField label="我方股比" value={`${detail.equity.toFixed(2)}%`} />
            <InfoField label="开盘时间" value="实际 2026-06-06，计划 2026-06-21" />
            <InfoField label="并表类型" value="不并表" />
            <InfoField label="竣备时间" value="实际 --，计划 2028-01-31" />
            <InfoField label="操盘类型" value="操盘" />
            <InfoField label="回款地价覆盖率" value={`${detail.repayCoverageRate.toFixed(2)}%`} />
          </div>
        </SectionCard>
        </ModuleBadge>

        <ModuleBadge moduleId="bi-share" className="block h-full">
        <SectionCard title="股东方及操盘信息" className="h-full flex flex-col" bodyClassName="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-[#EEF2F7]">
            <div className="grid grid-cols-[1fr_100px_2fr] bg-[#F5F8FC] text-[12px] font-medium text-slate-700 sticky top-0 z-10">
              <div className="px-3 py-2">股东方</div>
              <div className="px-3 py-2">股比</div>
              <div className="px-3 py-2">操盘条线</div>
            </div>
            {shareRows.map((r, i) => (
              <div
                key={r.name}
                className={`grid grid-cols-[1fr_100px_2fr] text-[12px] border-t border-[#F1F5F9] ${i % 2 ? "bg-[#FAFBFD]" : ""}`}
              >
                <div className="px-3 py-2 text-foreground">{r.name}</div>
                <div className="px-3 py-2 tabular-nums text-foreground">{r.ratio}</div>
                <div className="px-3 py-2 text-foreground leading-snug">{r.ops}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        </ModuleBadge>
      </div>

      <ModuleBadge moduleId="bi-land" className="block">
      <SectionCard
        title="土地信息(土地识别码：项目)"
        extra={
          <button
            type="button"
            onClick={() => setLandOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-[var(--color-brand)] transition-colors"
          >
            {landOpen ? "收起" : "展开"}
            <ChevronRight className={`w-4 h-4 transition-transform ${landOpen ? "rotate-90" : ""}`} />
          </button>
        }
      >
        {landOpen && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-2">
            <InfoField label="土地名称" value="果树所23亩" />
            <InfoField label="获取方式" value="收购" />
            <InfoField label="摘牌方" value="招商蛇口(郑州)置业有限公司" />
            <InfoField label="招拍挂日期" value="2026-03-13" />
            <InfoField label="总地价" value="25,530万" />
            <InfoField label="溢价率" value="-14.10%" />
            <InfoField label="可租售楼面地价" value="4,526元/㎡" />
            <InfoField label="容积率楼面地价" value="4,575元/㎡" />
            <InfoField label="占地面积" value="15,900㎡" />
            <InfoField label="容积率" value="3.50" />
            <InfoField label="总计容面积" value="55,686㎡" />
            <InfoField label="总可售面积" value="56,569㎡" />
            <InfoField label="土地合同开工日期" value="2024-12-26" />
            <InfoField label="土地合同竣工日期" value="2027-06-26" />
            <InfoField label="合同协议日期" value="2026-03-13" />
            <InfoField label="权益地价" value="10,212万" />
          </div>
        )}
      </SectionCard>
      </ModuleBadge>

      <ModuleBadge moduleId="bi-plan" className="block">
      <SectionCard
        title="项目规划指标"
        extra={<ExportButton />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] text-[#475569]">
                <th rowSpan={2} className="px-2 py-2 border border-[#EEF2F7] font-medium w-16">分期</th>
                <th colSpan={2} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">住宅</th>
                <th colSpan={2} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">公寓</th>
                <th colSpan={2} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">商业</th>
                <th colSpan={2} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">写字楼</th>
                <th colSpan={2} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">车位</th>
                <th colSpan={2} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">其他</th>
                <th colSpan={2} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">合计（不含车位）</th>
              </tr>
              <tr className="bg-[#F1F5F9] text-[#64748B]">
                {["套数","面积(㎡)","套数","面积(㎡)","套数","面积(㎡)","套数","面积(㎡)","个数","面积(㎡)","套数","面积(㎡)","套数","面积(㎡)"].map((h, i) => (
                  <th key={i} className="px-2 py-1.5 border border-[#EEF2F7] font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-center tabular-nums">
              {planPageRows.map((r) => (
                <tr key={r.phase} className="hover:bg-[#F5F9FF]">
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.phase}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.zzTao}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.zzArea.toLocaleString()}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.gyTao}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.gyArea}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.syTao}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.syArea}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.xzlTao}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.xzlArea}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.cwGe}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.cwArea}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.qtTao}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7]">{r.qtArea}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7] font-medium">{r.totalTao}</td>
                  <td className="px-2 py-2 border border-[#EEF2F7] font-medium">{r.totalArea.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#EEF2F7] text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>共 {planRows.length} 条</span>
            <select
              value={planPageSize}
              onChange={(e) => { setPlanPageSize(Number(e.target.value)); setPlanPage(1); }}
              className="h-6 px-1 rounded border border-[#E2E8F0] bg-white text-[11px] text-foreground/80 focus:outline-none focus:border-[var(--color-brand)]"
            >
              <option value={5}>5条/页</option>
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={planCurrentPage <= 1}
              onClick={() => setPlanPage(planCurrentPage - 1)}
              className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-foreground/70 hover:border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            {Array.from({ length: planTotalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPlanPage(n)}
                className={`min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded border text-[11px] ${
                  n === planCurrentPage
                    ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                    : "bg-white text-foreground/70 border-[#E2E8F0] hover:border-[#CBD5E1]"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={planCurrentPage >= planTotalPages}
              onClick={() => setPlanPage(planCurrentPage + 1)}
              className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-foreground/70 hover:border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </SectionCard>
      </ModuleBadge>

    </div>
  );
}

/* ============ 货值 Tab ============ */
type HzRow = {
  main: string;
  mainUnit: string;
  mainColor?: string;
  subLabel: string;
  subPercent?: string;
  hint?: boolean;
  right?: { label: string; value: string; unit?: string }[];
  /** 用于底部进度条：a=已售/前段，b=未售/后段。若省略则从 right[0]/[1] 数值中解析。 */
  bar?: { a: number; b: number };
};

const parseNum = (s: string) => Number(String(s).replace(/,/g, "")) || 0;

function HzMetric({ rows }: { rows: HzRow[] }) {
  return (
    <div className="bg-[#F5F8FC] rounded-xl px-4 py-4 flex flex-col gap-4 min-h-[112px] h-full">
      {rows.map((row, idx) => {
        const color = row.mainColor ?? "#1677FF";
        const a = row.bar?.a ?? (row.right ? parseNum(row.right[0]?.value ?? "0") : 0);
        const b = row.bar?.b ?? (row.right ? parseNum(row.right[1]?.value ?? "0") : 0);
        const total = a + b;
        const pctA = total > 0 ? (a / total) * 100 : 0;
        const showBar = total > 0;
        return (
          <div key={idx} className="flex flex-col gap-2">
            {/* 顶部：左主指标 / 右分项 */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-[24px] font-semibold tabular-nums leading-none" style={{ color }}>
                    {row.main}
                  </span>
                  <span className="text-[13px]" style={{ color }}>{row.mainUnit}</span>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-muted-foreground flex-wrap">
                  <span className="whitespace-nowrap">{row.subLabel}</span>
                  {row.subPercent && (
                    <span className="text-foreground font-medium tabular-nums">{row.subPercent}</span>
                  )}
                  {row.hint && <Info className="w-3 h-3 text-slate-400 shrink-0" />}
                </div>
              </div>
              {row.right && (
                <div className="flex flex-col gap-0.5 text-[12px] items-end shrink-0">
                  {row.right.map((r, i) => (
                    <div key={r.label} className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ background: i === 0 ? color : `${color}33` }} />
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {r.value}
                        {r.unit && <span className="ml-0.5 text-muted-foreground font-normal">{r.unit}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* 双段进度条 */}
            {showBar && (
              <div className="w-full h-1.5 rounded-full overflow-hidden flex" style={{ background: `${color}1A` }}>
                <div className="h-full transition-all" style={{ width: `${pctA}%`, background: color }} />
                <div className="h-full transition-all" style={{ width: `${100 - pctA}%`, background: `${color}55` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HuozhiTab() {
  const [distTab, setDistTab] = useState<"整体" | "已售" | "未售">("整体");

  const pieData =
    distTab === "已售"
      ? [
          { name: "住宅", value: 24597, color: "#1677FF" },
          { name: "车位", value: 431, color: "#10B981" },
        ]
      : distTab === "未售"
      ? [
          { name: "住宅", value: 53140, color: "#1677FF" },
          { name: "车位", value: 1241, color: "#10B981" },
        ]
      : [
          { name: "住宅", value: 77736, color: "#1677FF" },
          { name: "车位", value: 1672, color: "#10B981" },
        ];
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  const distRows = [
    { label: "合计", cnt: 851, area: 56947, amount: 79408, zzCnt: 473, zzArea: 56569, zzAmount: 77736, cwCnt: 378, cwArea: 378, cwAmount: 1672, bold: true },
    { label: "已售", cnt: 253, area: 17963, amount: 25028, zzCnt: 153, zzArea: 17863, zzAmount: 24597, cwCnt: 100, cwArea: 100, cwAmount: 431, indent: true },
    { label: "未售", cnt: 598, area: 38983, amount: 54380, zzCnt: 320, zzArea: 38705, zzAmount: 53140, cwCnt: 278, cwArea: 278, cwAmount: 1241, indent: true },
    { label: "其中：取证未售", cnt: 598, area: 38983, amount: 54380, zzCnt: 320, zzArea: 38705, zzAmount: 53140, cwCnt: 278, cwArea: 278, cwAmount: 1241, sub: true },
  ];

  const barData = [
    { name: "土地储备", value: 0 },
    { name: "开工未达售", value: 0 },
    { name: "在建达售未取证", value: 0 },
    { name: "在建已取证未售", value: 54380 },
    { name: "已竣工未取证未售", value: 0 },
    { name: "已竣工已取证未售", value: 0 },
  ];

  const unsoldRows = [
    { label: "合计", cnt: 598, area: 38983, amount: 54380, tdCnt: 0, tdArea: 0, tdAmount: 0, kgCnt: 0, kgArea: 0, kgAmount: 0, zjCnt: 0, zjArea: 0, zjAmount: 0, zjyCnt: 598, zjyArea: 38983, zjyAmount: 54380, extra: 0, bold: true },
    { label: "住宅", cnt: 320, area: 38705, amount: 53140, tdCnt: 0, tdArea: 0, tdAmount: 0, kgCnt: 0, kgArea: 0, kgAmount: 0, zjCnt: 0, zjArea: 0, zjAmount: 0, zjyCnt: 320, zjyArea: 38705, zjyAmount: 53140, extra: 0, indent: true },
    { label: "车位", cnt: 278, area: 278, amount: 1241, tdCnt: 0, tdArea: 0, tdAmount: 0, kgCnt: 0, kgArea: 0, kgAmount: 0, zjCnt: 0, zjArea: 0, zjAmount: 0, zjyCnt: 278, zjyArea: 278, zjyAmount: 1241, extra: 0, indent: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 货值总览 */}
      <SectionCard title="货值总览">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <HzMetric
            rows={[
              {
                main: "79,408",
                mainUnit: "万",
                subLabel: "总货值",
                subPercent: "31.52%",
                hint: true,
                right: [
                  { label: "已售", value: "25,028", unit: "万" },
                  { label: "未售", value: "54,380", unit: "万" },
                ],
              },
              {
                main: "473",
                mainUnit: "套",
                subLabel: "总套数(不含车位)",
                subPercent: "32.35%",
                right: [
                  { label: "已售", value: "153", unit: "套" },
                  { label: "未售", value: "320", unit: "套" },
                ],
              },
            ]}
          />
          <HzMetric
            rows={[
              {
                main: "1,672",
                mainUnit: "万",
                subLabel: "可售公建",
                subPercent: "25.78%",
                hint: true,
                right: [
                  { label: "已售", value: "431", unit: "万" },
                  { label: "未售", value: "1,241", unit: "万" },
                ],
              },
              {
                main: "378",
                mainUnit: "㎡",
                subLabel: "总面积",
                subPercent: "26.46%",
                hint: true,
                right: [
                  { label: "已售", value: "100", unit: "㎡" },
                  { label: "未售", value: "278", unit: "㎡" },
                ],
              },
            ]}
          />
          <HzMetric
            rows={[
              {
                main: "31.52",
                mainUnit: "%",
                mainColor: "#F59E0B",
                subLabel: "年度达售去化率",
                right: [
                  { label: "本年已售", value: "25,028", unit: "万" },
                  { label: "达售未售", value: "54,380", unit: "万" },
                ],
              },
            ]}
          />
          <HzMetric
            rows={[
              {
                main: "0",
                mainUnit: "万",
                mainColor: "#0F172A",
                subLabel: "已竣未售",
                right: [
                  { label: "往年竣工", value: "0", unit: "万" },
                  { label: "本年竣工", value: "0", unit: "万" },
                ],
              },
            ]}
          />
        </div>
      </SectionCard>

      {/* 货值分布 */}
      <SectionCard
        title="货值分布"
        extra={<ExportButton />}
      >
        <SegmentedTabs
          className="mb-3"
          value={distTab}
          onChange={setDistTab}
          items={["整体", "已售", "未售"] as const}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-center">
          <div className="flex items-center gap-4">
            <div className="w-[160px] h-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-[12.5px] min-w-0">
              {pieData.map((d) => {
                const pct = ((d.value / pieTotal) * 100).toFixed(2);
                return (
                  <div key={d.name} className="flex items-center gap-2 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="text-[var(--color-brand)] tabular-nums">{d.value.toLocaleString()}万</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-[var(--color-brand)] tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto">

            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#475569]">
                  <th rowSpan={2} className="px-2 py-2 border border-[#EEF2F7] font-medium w-32"></th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">合计</th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">住宅</th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">车位</th>
                </tr>
                <tr className="bg-[#F1F5F9] text-[#64748B]">
                  {["套数", "面积(㎡)", "金额(万)", "套数", "面积(㎡)", "金额(万)", "个数", "面积(㎡)", "金额(万)"].map((h, i) => (
                    <th key={i} className={`px-2 py-1.5 border border-[#EEF2F7] font-normal ${h.startsWith("金额") ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-center tabular-nums">
                {distRows.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F5F9FF]">
                    <td className={`px-3 py-2 border border-[#EEF2F7] text-left whitespace-nowrap ${r.bold ? "font-medium" : ""} ${r.sub ? "text-muted-foreground" : ""}`}>
                      {r.indent || r.sub ? <ChevronRight className="w-3 h-3 inline text-slate-400 mr-1" /> : null}
                      {r.label}
                    </td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.cnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.area.toLocaleString()}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{r.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.zzCnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.zzArea.toLocaleString()}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{r.zzAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.cwCnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.cwArea}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{r.cwAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>

      {/* 未售货值分布 */}
      <SectionCard
        title="未售货值分布"
        extra={<ExportButton />}
      >
        <div className="flex items-center gap-2 mb-3">
          <select className="text-[12px] border border-[#E5EAF1] rounded px-2 py-1 bg-white">
            <option>全部业态</option>
          </select>
          <select className="text-[12px] border border-[#E5EAF1] rounded px-2 py-1 bg-white">
            <option>全部产品</option>
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground mb-1">金额（万）</div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 8, left: 0, bottom: 32 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    interval={0}
                    axisLine={{ stroke: "#E5EAF1" }}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#F5F8FC" }}
                    formatter={(value: number, _name: string, item: any) => [
                      `${item?.payload?.name}:${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      "",
                    ]}
                    labelFormatter={() => ""}
                    separator=""
                  />
                  <Bar dataKey="value" fill="#1677FF" barSize={22} radius={[2, 2, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      style={{ fontSize: 10, fill: "#334155" }}
                      formatter={(v: number) =>
                        Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#475569]">
                  <th rowSpan={2} className="px-2 py-2 border border-[#EEF2F7] font-medium w-20"></th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">合计</th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">土地储备</th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">开工未达售</th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">在建达售未取证</th>
                  <th colSpan={3} className="px-2 py-1.5 border border-[#EEF2F7] font-medium">在建已取证未售</th>
                  <th className="px-2 py-1.5 border border-[#EEF2F7] font-medium">套数</th>
                </tr>
                <tr className="bg-[#F1F5F9] text-[#64748B]">
                  {["套数", "面积(㎡)", "金额(万)", "套数", "面积(㎡)", "金额(万)", "套数", "面积(㎡)", "金额(万)", "套数", "面积(㎡)", "金额(万)", "套数", "面积(㎡)", "金额(万)"].map((h, i) => (
                    <th key={i} className={`px-2 py-1.5 border border-[#EEF2F7] font-normal ${h.startsWith("金额") ? "text-right" : ""}`}>{h}</th>
                  ))}
                  <th className="px-2 py-1.5 border border-[#EEF2F7] font-normal"></th>
                </tr>
              </thead>
              <tbody className="text-center tabular-nums">
                {unsoldRows.map((r, i) => {
                  const fmtAmt = (v: number) =>
                    v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return (
                  <tr key={i} className="hover:bg-[#F5F9FF]">
                    <td className={`px-3 py-2 border border-[#EEF2F7] text-left ${r.bold ? "font-medium" : ""}`}>
                      {r.indent ? <ChevronRight className="w-3 h-3 inline text-slate-400 mr-1" /> : null}
                      {r.label}
                    </td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.cnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.area.toLocaleString()}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{fmtAmt(r.amount)}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.tdCnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.tdArea}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{fmtAmt(r.tdAmount)}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.kgCnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.kgArea}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{fmtAmt(r.kgAmount)}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.zjCnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.zjArea}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{fmtAmt(r.zjAmount)}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.zjyCnt}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.zjyArea.toLocaleString()}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7] text-right">{fmtAmt(r.zjyAmount)}</td>
                    <td className="px-2 py-2 border border-[#EEF2F7]">{r.extra}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

interface DetailShape {
  equity: number;
  totalLand: number;
  equityLand: number;
  saleableUnitLandPrice: number;
  repayCoverageRate: number;
  totalValue: number;
  unsoldValue: number;
  yearSupplied: number;
  yearTarget: number;
  yoy: number;
  mom: number;
  supplyRate: number;
  notStarted: number;
  startedNotSell: number;
  onSale: number;
  landReserve: number;
  startedNoPresell: number;
  buildOnSaleNoLicense: number;
  buildOnSaleWithLicense: number;
  doneNoLicense: number;
  doneWithLicenseUnsold: number;
  signedYtd: number;
  signedMonth: number;
  signedYearTarget: number;
  signedMonthTarget: number;
}

/* ============ 营销 Tab ============ */
type PeriodKey = "月" | "年" | "累计";
type MarketKpi = {
  period: PeriodKey;
  amount: string; // 万
  units: string; // 套
  target?: string; // 目标 万
  rate?: string; // 完成率 / 去化率
  rateLabel?: string;
};

function KpiMiniCard({ data, accent }: { data: MarketKpi; accent: { badgeBg: string; badgeFg: string; amount: string; units: string } }) {
  const AMOUNT_COLOR = "#1677FF";
  const UNITS_COLOR = "#F59E0B";
  const rateNum = data.rate ? parseFloat(data.rate) : null;
  const pct = rateNum != null ? Math.max(0, Math.min(100, rateNum)) : null;
  return (
    <div className="group relative rounded-xl px-4 pt-3 pb-3 min-h-[108px] overflow-hidden border border-[#EAF0F8] bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
      {/* 右上角柔光 */}
      <span
        className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-60"
        style={{ background: `radial-gradient(closest-side, ${accent.badgeBg}, transparent)` }}
      />
      <div className="relative flex items-center justify-between">
        <span
          className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full"
          style={{ background: accent.badgeBg, color: accent.badgeFg }}
        >
          {data.period}
        </span>
        {data.rate && (
          <span className="text-[11px] tabular-nums font-medium" style={{ color: AMOUNT_COLOR }}>
            {data.rateLabel ?? "完成率"} {data.rate}
          </span>
        )}
      </div>
      <div className="relative mt-2.5 flex items-baseline gap-1 tabular-nums">
        <span className="text-[26px] font-semibold leading-none tracking-tight" style={{ color: AMOUNT_COLOR }}>{data.amount}</span>
        <span className="text-[12px] text-slate-500">万</span>
        {data.units && (
          <>
            <span className="mx-1 text-slate-300">·</span>
            <span className="text-[18px] font-semibold leading-none" style={{ color: UNITS_COLOR }}>{data.units}</span>
            <span className="text-[11px] text-slate-500">套</span>
          </>
        )}
      </div>
      {data.target && (
        <div className="relative mt-2.5">
          <div className="h-1 rounded-full bg-[#EEF2F7] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct ?? 0}%`, background: AMOUNT_COLOR }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            目标 {data.target} 万
          </div>
        </div>
      )}
    </div>
  );
}

function MarketingTab() {
  const [gran, setGran] = useState<"日" | "周" | "月" | "季" | "年">("日");

  const subKpis: MarketKpi[] = [
    { period: "月", amount: "1,575", units: "9" },
    { period: "年", amount: "29,470", units: "178" },
    { period: "累计", amount: "29,470", units: "178" },
  ];
  const signKpis: MarketKpi[] = [
    { period: "月", amount: "1,723", units: "11", target: "6,485", rate: "26.57%" },
    { period: "年", amount: "25,028", units: "153", target: "43,143", rate: "58.01%" },
    { period: "累计", amount: "25,028", units: "153", rateLabel: "去化率", rate: "31.52%" },
  ];

  const subAccent = { badgeBg: "#E8F1FF", badgeFg: "#1677FF", amount: "#1677FF", units: "#F59E0B" };
  const signAccent = { badgeBg: "#FFF1E0", badgeFg: "#F59E0B", amount: "#F59E0B", units: "#F59E0B" };

  // 认签趋势 mock —— 日粒度
  const trendDates = [
    "6/09","6/10","6/11","6/12","6/13","6/14","6/15","6/16","6/17","6/18","6/19","6/20","6/21","6/22","6/23","6/24","6/25","6/26","6/27","6/28","6/29","6/30","7/01","7/02","7/03","7/04","7/05","7/06","7/07","7/08","7/09",
  ];
  const rkTao = [0,0,134,0,3,2,1,0,1,0,5,10,9,0,0,1,1,0,0,2,0,0,0,0,3,1,1,1,0,0,0];
  const qyTao = [0,0,0,34,17,9,17,0,2,0,5,17,0,0,4,0,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0];
  const rkAmt = [0,0,22227,0,643,363,136,45,181,0,719,1529,1305,0,98,133,192,0,0,318,0,0,0,0,706,67,1016,207,0,0,0];
  const qyAmt = [0,0,0,5044,3389,1235,2731,0,318,8,787,2902,113,0,706,67,1016,207,0,0,0,0,0,0,0,0,0,0,0,0,0];

  const trendData = trendDates.map((d, i) => ({
    date: d,
    认购套数: rkTao[i],
    签约套数: qyTao[i],
    认购金额: rkAmt[i],
    签约金额: qyAmt[i],
  }));

  const tableCols = trendDates;
  const tableRows: { group: string; label: string; values: number[] }[] = [
    { group: "合计", label: "认购金额", values: rkAmt },
    { group: "合计", label: "认购面积", values: rkAmt.map((v) => Math.round(v * 0.72)) },
    { group: "合计", label: "认购套数", values: rkTao },
    { group: "合计", label: "签约金额", values: qyAmt },
    { group: "合计", label: "签约套数", values: qyTao },
    { group: "一期", label: "认购金额", values: rkAmt },
    { group: "一期", label: "认购面积", values: rkAmt.map((v) => Math.round(v * 0.72)) },
    { group: "一期", label: "认购套数", values: rkTao },
    { group: "一期", label: "签约金额", values: qyAmt },
    { group: "一期", label: "签约套数", values: qyTao },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部两卡：认购 / 签约 */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="认购">
          <div className="grid grid-cols-3 gap-3">
            {subKpis.map((k) => (
              <KpiMiniCard key={k.period} data={k} accent={subAccent} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="签约">
          <div className="grid grid-cols-3 gap-3">
            {signKpis.map((k) => (
              <KpiMiniCard key={k.period} data={k} accent={signAccent} />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* 认签趋势 */}
      <SectionCard
        title="认签趋势"
        extra={
          <SegmentedTabs
            value={gran}
            onChange={setGran}
            items={["日", "周", "月", "季", "年"] as const}
          />
        }

      >
        <div className="text-[12px] text-muted-foreground mb-1">注：浅色系为周末</div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} label={{ value: "万", position: "insideTopLeft", fontSize: 11, fill: "#64748B" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} label={{ value: "套", position: "insideTopRight", fontSize: 11, fill: "#64748B" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5EAF1" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="right" dataKey="认购套数" fill="#1677FF" barSize={14} />
              <Bar yAxisId="right" dataKey="签约套数" fill="#CBD5E1" barSize={14} />
              <Line yAxisId="left" type="monotone" dataKey="认购金额" stroke="#1677FF" strokeWidth={2} dot={{ r: 2 }} />
              <Line yAxisId="left" type="monotone" dataKey="签约金额" stroke="#94A3B8" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between mt-2 mb-1">
          <span className="text-[12px] text-muted-foreground">单位：（万，㎡，套）</span>
          <ExportButton />
        </div>

        <div className="overflow-x-auto">
          <table className="text-[12px] border-collapse min-w-full">
            <thead>
              <tr className="bg-[#F1F5F9] text-[#475569]">
                <th className="px-2 py-2 border border-[#EEF2F7] font-medium sticky left-0 bg-[#F5F8FC] z-10 w-14"></th>
                <th className="px-2 py-2 border border-[#EEF2F7] font-medium sticky left-14 bg-[#F5F8FC] z-10 w-20"></th>
                {tableCols.map((c) => (
                  <th key={c} className="px-2 py-2 border border-[#EEF2F7] font-medium whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-center tabular-nums">
              {tableRows.map((r, i) => {
                const first = i === 0 || tableRows[i - 1].group !== r.group;
                const groupSize = tableRows.filter((x) => x.group === r.group).length;
                return (
                  <tr key={`${r.group}-${r.label}`} className="hover:bg-[#F5F9FF]">
                    {first && (
                      <td rowSpan={groupSize} className="px-2 py-2 border border-[#EEF2F7] font-medium sticky left-0 bg-white z-10">
                        {r.group}
                      </td>
                    )}
                    <td className="px-2 py-2 border border-[#EEF2F7] text-muted-foreground sticky left-14 bg-white z-10 text-left">
                      {r.label}
                    </td>
                    {r.values.map((v, j) => (
                      <td key={j} className="px-2 py-2 border border-[#EEF2F7]">{v ? v.toLocaleString() : 0}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ============ 项目多维分析 Tab ============ */
const X_LABEL: Record<"L" | "M" | "H", string> = { L: "低", M: "正常", H: "高" };
const Y_LABEL: Record<"L" | "M" | "H", string> = { L: "弱", M: "正常", H: "强" };

function ProjectSummaryCard({ project, compareMode }: { project: (typeof groupProjectAnalysisData)[number]; compareMode: CompareMode }) {
  const enriched = useMemo(() => enrichProjects(groupProjectAnalysisData, compareMode), [compareMode]);
  const target = enriched.find((p) => p.projectId === project.projectId);
  const displayName = formatProjectName(project.projectName);
  if (!target) {
    return (
      <div className="bg-white rounded-xl border border-[#EEF2F7] p-4 text-sm text-muted-foreground">
        暂无 {displayName} 的多维分析数据。
      </div>
    );
  }
  const cumulative = target.snakeSellThroughRate;
  const m12 = Math.max(0, Math.min(1, cumulative * 0.72));
  const m3 = Math.max(0, Math.min(1, cumulative * 0.28));
  const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`.replace(/%/g, "％");
  const fmtYi = (v: number) => `${v.toFixed(2)} 亿`;

  const xT = { low: 0.9, high: 1.1 };
  const yT = { low: 0.3, high: 0.7 };

  const tier = tierOf(target.sellThroughCompetitiveness, yT.low, yT.high);
  const cellKey = classifyNineGrid(target.valuationSalesRatio, target.sellThroughCompetitiveness, xT, yT);
  const meta = NINE_GRID_META[cellKey];
  const quadrantLabel = meta.label;
  const catColor = meta.color;

  const priceRatioColor =
    target.valuationSalesRatio > 1.2
      ? "#10B981"
      : target.valuationSalesRatio < 0.8
        ? "#EF4444"
        : "#3B82F6";

  void X_LABEL; void Y_LABEL;

  const compareFilterLabel = COMPARE_FILTER_LABEL[compareMode];
  const compareBaseLabel = COMPARE_LABEL[compareMode];

  return (
    <div className="bg-white rounded-xl border border-[#EEF2F7] p-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium">
          项目总结摘要
        </span>
        <span className="text-muted-foreground">基于{compareBaseLabel}基准（对比{compareBaseLabel}）自动生成</span>
      </div>
      <p className="mt-2 text-sm leading-7 text-foreground">
        <b>{displayName}</b> 项目去化率：累计 <b className="tabular-nums text-foreground">{fmtPct(cumulative)}</b>、
        近 12 个月 <b className="tabular-nums text-foreground">{fmtPct(m12)}</b>、
        近 3 个月 <b className="tabular-nums text-foreground">{fmtPct(m3)}</b>，
        剩余货值 <b className="tabular-nums text-foreground">{fmtYi(target.remainingValue)}</b>；
        {compareFilterLabel}，去化竞争力 <b style={{ color: tier.color }}>{tier.text}</b>，
        售估比 <b className="tabular-nums" style={{ color: priceRatioColor }}>{target.valuationSalesRatio.toFixed(2)}</b>，
        项目去化与售估比九宫格所属区域 <b style={{ color: catColor }}>{quadrantLabel}</b>。
      </p>
    </div>
  );
}


function ProjectAnalysisTab({ project }: { project: (typeof groupProjectAnalysisData)[number] }) {
  const [compareMode, setCompareMode] = useState<CompareMode>("street");
  return (
    <div className="flex flex-col gap-4">
      <ModuleBadge moduleId="pa-summary" className="block">
        <ProjectSummaryCard project={project} compareMode={compareMode} />
      </ModuleBadge>
      <ModuleBadge moduleId="pa-value-quadrant" className="block">
        <GroupValueQuadrantSection
          hideProjectList
          hideGroupFilter
          focusProjectId={project.projectId}
          compareMode={compareMode}
          onCompareModeChange={setCompareMode}
        />
      </ModuleBadge>
      <ModuleBadge moduleId="pa-district-quadrant" className="block">
        <GroupProfitQuadrantSection hideProjectList hideGroupFilter focusProjectId={project.projectId} />
      </ModuleBadge>
    </div>
  );
}




