import { ExportButton } from "@/components/ui/export-button";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Info,
  Settings2,
  TrendingUp,
  TrendingDown,
  Layers,
  LineChart as LineIcon,
  Table as TableIcon,
  Inbox,
  RotateCcw,
  PieChart as PieIcon,
} from "lucide-react";
import { PROJECTS, fmtNumber } from "@/mocks/homeMock";
import { formatAmount, formatPercent, getTrendColor } from "@/lib/format";
import { evalDerived, formatDerived, type DerivedMetric } from "@/lib/metric";
import { CHART_PALETTE as TOKEN_CHART_PALETTE } from "@/lib/tokens";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  LineChart,
  BarChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ---------------- 数据层 ----------------
type Row = {
  cityGroup: string;
  cityCompany: string;
  total: number;
  landReserve: number;
  startUnsale: number;
  buildingUncert: number;
  buildingCertUnsold: number;
  doneUncert: number;
  doneCertUnsold: number;
  subtotal: number; // 总未售货值
  signed: number;
  // 兼容旧字段（供衍生指标公式上下文使用）
  achievedNoCert: number;
  certNoSale: number;
  doneNoSale: number;
};

const CITY_GROUP_MAP: Record<string, string> = {
  深圳公司: "南部城市群",
  广州公司: "南部城市群",
  佛山公司: "南部城市群",
  东莞公司: "南部城市群",
  珠海公司: "南部城市群",
  惠州公司: "南部城市群",
  中山公司: "南部城市群",
  江门公司: "南部城市群",
};

function buildRows(): Row[] {
  const map = new Map<string, Row>();
  for (const p of PROJECTS) {
    const cg = CITY_GROUP_MAP[p.cityCompany] || "南部城市群";
    const key = `${cg}|${p.cityCompany}`;
    const r = map.get(key) || {
      cityGroup: cg,
      cityCompany: p.cityCompany,
      total: 0,
      landReserve: 0,
      startUnsale: 0,
      buildingUncert: 0,
      buildingCertUnsold: 0,
      doneUncert: 0,
      doneCertUnsold: 0,
      subtotal: 0,
      signed: 0,
      achievedNoCert: 0,
      certNoSale: 0,
      doneNoSale: 0,
    };
    r.total += p.totalValue;
    // 6 个结构口径占未售货值的固定比例（合计=1）
    r.landReserve += p.unsoldValue * 0.12;
    r.startUnsale += p.unsoldValue * 0.15;
    r.buildingUncert += p.unsoldValue * 0.17;
    r.buildingCertUnsold += p.unsoldValue * 0.18;
    r.doneUncert += p.unsoldValue * 0.13;
    r.doneCertUnsold += p.unsoldValue * 0.25;
    r.subtotal += p.unsoldValue;
    r.signed += p.signedAmount;
    // 旧字段（公式上下文兼容）
    r.achievedNoCert += p.unsoldValue * 0.18;
    r.certNoSale += p.unsoldValue * 0.42;
    r.doneNoSale += p.unsoldValue * 0.4;
    map.set(key, r);
  }
  const rows = Array.from(map.values());
  // 招商蛇口全量范围 mock：补充其他城市群 / 城市公司的汇总数据
  const extras: Array<{ cityGroup: string; cityCompany: string; total: number; unsold: number; signed: number }> = [
    { cityGroup: "华东城市群", cityCompany: "上海公司", total: 276.8, unsold: 148.3, signed: 17.5 },
    { cityGroup: "华东城市群", cityCompany: "南京公司", total: 198.6, unsold: 108.4, signed: 12.8 },
    { cityGroup: "华东城市群", cityCompany: "杭州公司", total: 232.4, unsold: 124.6, signed: 14.9 },
    { cityGroup: "华东城市群", cityCompany: "苏州公司", total: 174.2, unsold: 92.1, signed: 11.3 },
    { cityGroup: "华北城市群", cityCompany: "北京公司", total: 245.2, unsold: 132.1, signed: 15.4 },
    { cityGroup: "华北城市群", cityCompany: "天津公司", total: 168.5, unsold: 88.7, signed: 10.6 },
    { cityGroup: "华北城市群", cityCompany: "济南公司", total: 142.3, unsold: 76.4, signed: 9.2 },
    { cityGroup: "西部城市群", cityCompany: "成都公司", total: 186.3, unsold: 96.8, signed: 10.6 },
    { cityGroup: "西部城市群", cityCompany: "重庆公司", total: 158.7, unsold: 82.4, signed: 9.3 },
    { cityGroup: "西部城市群", cityCompany: "西安公司", total: 134.2, unsold: 71.6, signed: 8.4 },
    { cityGroup: "中部城市群", cityCompany: "武汉公司", total: 192.5, unsold: 102.3, signed: 11.8 },
    { cityGroup: "中部城市群", cityCompany: "长沙公司", total: 156.8, unsold: 84.2, signed: 9.6 },
    { cityGroup: "中部城市群", cityCompany: "郑州公司", total: 138.4, unsold: 73.5, signed: 8.5 },
  ];
  for (const e of extras) {
    rows.push({
      cityGroup: e.cityGroup,
      cityCompany: e.cityCompany,
      total: e.total,
      landReserve: e.unsold * 0.12,
      startUnsale: e.unsold * 0.15,
      buildingUncert: e.unsold * 0.17,
      buildingCertUnsold: e.unsold * 0.18,
      doneUncert: e.unsold * 0.13,
      doneCertUnsold: e.unsold * 0.25,
      subtotal: e.unsold,
      signed: e.signed,
      achievedNoCert: e.unsold * 0.18,
      certNoSale: e.unsold * 0.42,
      doneNoSale: e.unsold * 0.4,
    });
  }
  return rows;
}

const ROWS_ALL = buildRows();

const TREND_BASE = [
  { period: "2025-11", q: "2025Q4", y: "2025" },
  { period: "2025-12", q: "2025Q4", y: "2025" },
  { period: "2026-01", q: "2026Q1", y: "2026" },
  { period: "2026-02", q: "2026Q1", y: "2026" },
  { period: "2026-03", q: "2026Q1", y: "2026" },
  { period: "2026-04", q: "2026Q2", y: "2026" },
];

// ---------------- 重点指标 ----------------
type MetricKey =
  | "totalValue"
  | "unsold"
  | "landReserve"
  | "startUnsale"
  | "buildingUncert"
  | "buildingCertUnsold"
  | "doneUncert"
  | "doneCertUnsold"
  | "signed"
  | "certDealRate";
type MetricStatus = "正常" | "偏高" | "需关注" | "增长" | "下降";

type Metric = {
  key: MetricKey;
  name: string;
  value: number;
  unit: string;
  delta: number;
  status: MetricStatus;
  desc: string;
  category: "scale" | "status" | "sales";
  sortField?: keyof Omit<Row, "cityGroup" | "cityCompany">;
};

const METRICS: Metric[] = [
  { key: "totalValue", name: "项目总货值", value: 3420.18, unit: "亿元", delta: 1.4, status: "正常", desc: "项目总货值合计", category: "scale", sortField: "total" },
  { key: "unsold", name: "总未售货值", value: 1720.45, unit: "亿元", delta: -2.3, status: "下降", desc: "未签约总货值合计", category: "scale", sortField: "subtotal" },
  { key: "landReserve", name: "土地储备货值", value: 206.45, unit: "亿元", delta: 0.6, status: "正常", desc: "土地储备阶段的货值", category: "status", sortField: "landReserve" },
  { key: "startUnsale", name: "开工未达预售货值", value: 258.07, unit: "亿元", delta: 1.9, status: "正常", desc: "已开工但未达到预售条件的货值", category: "status", sortField: "startUnsale" },
  { key: "buildingUncert", name: "在建达售未取证货值", value: 292.48, unit: "亿元", delta: 4.1, status: "需关注", desc: "在建且达售但未取得预售证的货值", category: "status", sortField: "buildingUncert" },
  { key: "buildingCertUnsold", name: "在建已取证未售货值", value: 309.68, unit: "亿元", delta: 1.2, status: "正常", desc: "在建且取得预售证但尚未签约的货值", category: "status", sortField: "buildingCertUnsold" },
  { key: "doneUncert", name: "已竣工未取证货值", value: 223.66, unit: "亿元", delta: 3.5, status: "需关注", desc: "已竣工但尚未取得预售证的货值", category: "status", sortField: "doneUncert" },
  { key: "doneCertUnsold", name: "已竣工已取证未售货值", value: 430.11, unit: "亿元", delta: 6.8, status: "偏高", desc: "已竣工已取证但尚未签约的货值，占用资金压力较大", category: "status", sortField: "doneCertUnsold" },
  { key: "signed", name: "签约货值", value: 350.62, unit: "亿元", delta: 9.4, status: "增长", desc: "本期累计签约货值", category: "sales", sortField: "signed" },
  { key: "certDealRate", name: "取证去化率", value: 42.8, unit: "%", delta: 2.1, status: "正常", desc: "签约货值 ÷（签约货值 + 已取证未售货值）", category: "sales" },
];

const DEFAULT_PINNED: string[] = ["totalValue", "unsold", "signed", "buildingUncert", "doneCertUnsold", "certDealRate"];

const CATEGORY_LABEL: Record<Metric["category"], string> = {
  scale: "总量指标",
  status: "货值结构",
  sales: "去化表现",
};


// 聚合上下文用于衍生指标卡片求值
const AGG_CTX = (() => {
  const total = ROWS_ALL.reduce((s, r) => s + r.total, 0);
  const subtotal = ROWS_ALL.reduce((s, r) => s + r.subtotal, 0);
  const achievedNoCert = ROWS_ALL.reduce((s, r) => s + r.achievedNoCert, 0);
  const certNoSale = ROWS_ALL.reduce((s, r) => s + r.certNoSale, 0);
  const doneNoSale = ROWS_ALL.reduce((s, r) => s + r.doneNoSale, 0);
  const signed = ROWS_ALL.reduce((s, r) => s + r.signed, 0);
  return { total, subtotal, achievedNoCert, certNoSale, doneNoSale, signed, signedArea: signed * 0.3, unsoldArea: subtotal * 0.5, avg12m: 14.2 };
})();

// ---------------- 主组件 ----------------
type ResultTab = "detail" | "trend" | "composition";
type ChipKind = "org" | "period" | "dim" | "metric" | "derived";
type SortRule = { field: string; dir: "asc" | "desc" };
type Props = {
  focusMetric: string | null;
  setFocusMetric: (k: string | null) => void;
  activeTab: ResultTab;
  setActiveTab: (t: ResultTab) => void;
  querySummary?: string;
  metricKeys?: string[];
  derivedMetrics?: DerivedMetric[];
  periodLabel?: string;
  orgLabel?: string;
  datasetName?: string;
  caliberLabel?: string;
  bizLabel?: string;
  dimCount?: number;
  metricCount?: number;
  hasQueried?: boolean;
  configDirty?: boolean;
  loading?: boolean;
  onRemoveChip?: (kind: ChipKind, key?: string) => void;
  onResetFilters?: () => void;
  onQuery?: () => void;
  pinned?: string[];
  setPinned?: (v: string[]) => void;
  onShowToast?: (msg: string) => void;
  onBackToDefault?: () => void;
  period?: { type: "year" | "quarter" | "month"; value: string };
  customRange?: { enabled: boolean; start: string; end: string };
  onConfigChange?: () => void;
  appliedDimColumns?: { key: string; name: string }[];
  appliedMetricColumns?: { key: string; name: string }[];
  appliedDimValueFilters?: Record<string, string[]>;
  appliedSortRules?: SortRule[];
};

export function Dashboard({
  focusMetric,
  setFocusMetric,
  activeTab,
  setActiveTab,
  querySummary,
  metricKeys = [],
  derivedMetrics = [],
  periodLabel,
  orgLabel,
  datasetName,
  caliberLabel,
  bizLabel,
  dimCount,
  metricCount,
  hasQueried,
  configDirty,
  loading,
  onRemoveChip,
  onResetFilters,
  onQuery,
  pinned: pinnedProp,
  setPinned: setPinnedProp,
  onShowToast,
  onBackToDefault,
  period,
  customRange,
  onConfigChange,
  appliedDimColumns,
  appliedMetricColumns,
  appliedDimValueFilters,
  appliedSortRules,
}: Props) {
  const [manageOpen, setManageOpen] = useState(false);
  const [pinnedLocal, setPinnedLocal] = useState<string[]>(DEFAULT_PINNED);
  const pinned = pinnedProp ?? pinnedLocal;
  const setPinned = setPinnedProp ?? setPinnedLocal;

  // 候选池：左侧已选内置指标 + 已选衍生指标
  const builtinPool = useMemo(
    () => METRICS.filter((m) => metricKeys.includes(m.key)),
    [metricKeys],
  );
  const derivedPool = derivedMetrics;
  const poolKeys = useMemo(
    () => [...builtinPool.map((m) => m.key as string), ...derivedPool.map((d) => d.id)],
    [builtinPool, derivedPool],
  );
  const poolCount = poolKeys.length;

  // 同步 pinned 与候选池：移除已不在池中的项；如全部失效则恢复默认
  useEffect(() => {
    const valid = pinned.filter((k) => poolKeys.includes(k));
    if (valid.length !== pinned.length) {
      if (valid.length === 0) {
        const fallback = DEFAULT_PINNED.filter((k) => poolKeys.includes(k)).slice(0, 6);
        setPinned(fallback.length ? fallback : poolKeys.slice(0, 6));
      } else {
        setPinned(valid);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKeys.join("|")]);

  const visibleItems = pinned
    .map((k) => {
      const m = METRICS.find((x) => x.key === k);
      if (m) return { kind: "builtin" as const, m };
      const d = derivedPool.find((x) => x.id === k);
      if (d) return { kind: "derived" as const, d };
      return null;
    })
    .filter(Boolean)
    .slice(0, 6) as Array<{ kind: "builtin"; m: Metric } | { kind: "derived"; d: DerivedMetric }>;


  const handleMetricClick = (m: Metric) => {
    const next = focusMetric === m.key ? null : m.key;
    setFocusMetric(next);
    if (next && activeTab !== "trend") setActiveTab("detail");
  };

  const Chip = ({ label, onRemove }: { label: string; onRemove?: () => void }) => (
    <span className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/20 text-[12px] text-[var(--color-brand)]">
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="w-4 h-4 rounded-full hover:bg-[var(--color-brand)]/15 inline-flex items-center justify-center"
          title="移除该条件"
        >
          ×
        </button>
      )}
    </span>
  );

  return (
    <div className="p-6 space-y-5">
      {/* 默认重点指标 / 查询结果 */}
      <section className="bg-card rounded-xl border border-[var(--color-panel-border)] shadow-[0_1px_2px_rgba(20,40,80,0.04)] px-5 pt-3.5 pb-5">
        <div className="flex items-center justify-between gap-3 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-1 h-4 rounded bg-gradient-to-b from-[oklch(0.7_0.18_265)] to-[oklch(0.55_0.22_255)]" />
            <h2 className="text-base font-semibold text-foreground leading-none">
              {hasQueried ? "查询结果" : "默认重点指标"}
            </h2>
            <span className="text-[12px] text-[#64748B] ml-2 truncate">
              {hasQueried
                ? `基于当前查询条件实时计算，已应用 ${metricCount ?? 0} 个指标${dimCount ? ` · ${dimCount} 个分析维度` : ""}`
                : "基于当前组织范围、维度和指标配置自动推荐"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-[#64748B] mr-1">
              已展示 {visibleItems.length} / {Math.min(poolCount, 6)}
            </span>
            {hasQueried && !(pinned.length === DEFAULT_PINNED.length && pinned.every((k, i) => k === DEFAULT_PINNED[i])) && (
              <button
                onClick={() => {
                  onBackToDefault?.();
                  onShowToast?.("已返回默认重点指标展示");
                }}
                title="切回默认重点指标推荐展示，不影响左侧配置和下方结果"
                className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md text-xs text-muted-foreground hover:text-[var(--color-brand)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                返回默认重点指标
              </button>
            )}
            <button
              onClick={() => setManageOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-[var(--color-brand)] hover:border-[var(--color-brand)]"
            >
              <Settings2 className="w-3.5 h-3.5" />
              管理展示指标
            </button>
          </div>
        </div>


        {hasQueried && configDirty && (
          <div className="mt-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 inline-flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            查询配置已变更，请点击「查询数据」刷新结果。
            {onQuery && (
              <button onClick={onQuery} className="ml-1 underline hover:text-amber-900">立即查询</button>
            )}
          </div>
        )}

        <div className="mt-3" />

        {visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-panel-border)] bg-[#FAFBFD] py-10 text-center text-xs text-muted-foreground">
            请在左侧勾选指标后查看
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {visibleItems.map((item) => {
              if (item.kind === "derived") {
                const d = item.d;
                const v = evalDerived(d.formula, AGG_CTX);
                return (
                  <div
                    key={d.id}
                    title={d.desc || d.formula}
                    className="text-left p-4 rounded-lg border border-[var(--color-panel-border)] bg-card relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-bold bg-[var(--color-brand-soft)] text-[var(--color-brand)]">fx</span>
                        {d.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand)]/20">
                        衍生
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-xl font-semibold text-foreground tabular-nums">
                        {formatDerived(v, d.unit, d.decimals)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {d.formula}
                    </div>
                  </div>
                );
              }
              const m = item.m;
              const active = focusMetric === m.key;
              const trendColor = getTrendColor(m.delta);
              return (
                <button
                  key={m.key}
                  onClick={() => handleMetricClick(m)}
                  title={m.desc}
                  className={`group text-left p-4 rounded-lg border transition-all relative overflow-hidden ${
                    active
                      ? "border-[var(--color-brand)] bg-gradient-to-br from-[oklch(0.97_0.04_260)] to-white shadow-[0_4px_16px_rgba(80,100,220,0.12)]"
                      : "border-[var(--color-panel-border)] bg-card hover:border-[var(--color-brand)]/50 hover:shadow-[0_2px_8px_rgba(20,40,80,0.06)]"
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[oklch(0.7_0.18_265)] to-[oklch(0.55_0.22_255)]" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {m.name}
                      <Info className="w-3 h-3 opacity-60" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-xl font-semibold text-foreground tabular-nums">
                      {m.key === "certDealRate" ? `${m.value.toFixed(2)}` : formatAmount(m.value)}
                    </span>
                    {m.unit && <span className="text-xs text-muted-foreground">{m.unit}</span>}
                  </div>
                  <div className="mt-1 text-xs flex items-center gap-1 tabular-nums" style={{ color: trendColor }}>
                    {m.delta > 0 ? <TrendingUp className="w-3 h-3" /> : m.delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                    环比 {formatPercent(m.delta, { withSign: true })}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 结果展示容器 */}
      <section className="bg-card rounded-xl border border-[var(--color-panel-border)] shadow-[0_1px_2px_rgba(20,40,80,0.04)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--color-panel-border)]">
          <div className="inline-flex p-0.5 rounded-md bg-[#F1F4F9] border border-[var(--color-panel-border)]">
            {[
              { k: "detail" as const, label: "明细表格", icon: TableIcon },
              { k: "trend" as const, label: "趋势图表", icon: LineIcon },
              { k: "composition" as const, label: "构成图表", icon: PieIcon },
            ].map((t) => {
              const active = activeTab === t.k;
              const Icon = t.icon;
              return (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k)}
                  className={`px-3.5 h-8 text-sm rounded flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-card text-[var(--color-brand)] font-medium shadow-[0_1px_2px_rgba(20,40,80,0.08)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">
            {activeTab === "detail"
              ? "用于展示当前查询条件下的明细数据"
              : activeTab === "trend"
                ? "用于将当前查询结果按时间维度展示为趋势图"
                : "用于查看单个指标在不同维度下的占比构成"}
          </span>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-1/2 rounded bg-[#EEF2F7] animate-pulse" />
              <div className="h-32 rounded bg-[#F4F6FA] animate-pulse" />
              <div className="h-64 rounded bg-[#F4F6FA] animate-pulse" />
            </div>
          ) : hasQueried && (!metricCount || !periodLabel) ? (
            <div className="rounded-lg border border-dashed border-[var(--color-panel-border)] bg-[#FAFBFD] py-16 flex flex-col items-center justify-center text-center">
              <Inbox className="w-10 h-10 text-muted-foreground/60 mb-3" />
              <div className="text-sm text-foreground font-medium">当前条件下暂无数据</div>
              <div className="text-xs text-muted-foreground mt-1.5">{!periodLabel ? "请选择统计周期" : "请选择指标"}</div>
              <button
                onClick={onResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-[var(--color-panel-border)] text-xs text-muted-foreground hover:text-[var(--color-brand)] hover:border-[var(--color-brand)]"
              >
                重置筛选
              </button>
            </div>
          ) : activeTab === "detail" ? (
            <DetailTab
              focusMetric={focusMetric}
              querySummary={querySummary}
              derivedMetrics={derivedMetrics ?? []}
              appliedDimColumns={appliedDimColumns}
              appliedMetricColumns={appliedMetricColumns}
              appliedDimValueFilters={appliedDimValueFilters}
              appliedSortRules={appliedSortRules}
            />
          ) : activeTab === "trend" ? (
            <TrendTab focusMetric={focusMetric} derivedMetrics={derivedMetrics ?? []} period={period} customRange={customRange} periodLabel={periodLabel} onConfigChange={onConfigChange} />
          ) : (
            <CompositionTab focusMetric={focusMetric} />
          )}
        </div>
      </section>

      {manageOpen && (
        <ManageDrawer
          pinned={pinned}
          builtinPool={builtinPool}
          derivedPool={derivedPool}
          onSave={(next) => {
            setPinned(next);
            setManageOpen(false);
            onShowToast?.("展示指标已更新");
          }}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------- 趋势图表（轻量版） ----------------
type Granularity = "月度" | "季度" | "年度";
type SplitDim = "城市群" | "城市公司" | "业态" | "项目";

// 推断单位
function metricUnit(name: string): string {
  if (/率|占比|去化/.test(name)) return "%";
  if (/面积/.test(name)) return "万㎡";
  return "亿元";
}

function TrendTab({
  focusMetric,
  derivedMetrics = [],
  period,
  customRange,
  periodLabel,
  onConfigChange,
}: {
  focusMetric: string | null;
  derivedMetrics?: DerivedMetric[];
  period?: { type: "year" | "quarter" | "month"; value: string };
  customRange?: { enabled: boolean; start: string; end: string };
  periodLabel?: string;
  onConfigChange?: () => void;
}) {
  const focused = METRICS.find((m) => m.key === focusMetric);
  const periodType = period?.type ?? "month";

  // 按统计周期推断默认时间粒度
  const defaultGranularity: Granularity =
    periodType === "year" ? "年度" : periodType === "quarter" ? "季度" : "月度";

  const [metric, setMetric] = useState<string>(focused?.name ?? "签约货值");
  const [granularity, setGranularity] = useState<Granularity>(defaultGranularity);
  const [chartType, setChartType] = useState<"折线图" | "柱状图">("柱状图");
  const [splitDim, setSplitDim] = useState<SplitDim>("城市公司");
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  // 配置变更时重置隐藏状态（系列可能已变化）
  const handleConfigChange = () => {
    setHiddenKeys(new Set());
    onConfigChange?.();
  };

  // 当外部 focusMetric 变化时同步
  useEffect(() => {
    if (focused) setMetric(focused.name);
  }, [focused]);

  // 当统计周期变化时，若当前粒度细于周期则自动收敛
  useEffect(() => {
    if (periodType === "year" && granularity !== "年度") setGranularity("年度");
    else if (periodType === "quarter" && granularity === "月度") setGranularity("季度");
  }, [periodType]); // eslint-disable-line react-hooks/exhaustive-deps

  // 时间粒度可选项（粗于或等于统计周期）
  const granularityOptions = useMemo(() => {
    const all: { value: Granularity; disabled: boolean; title?: string }[] = [
      { value: "月度", disabled: periodType !== "month" },
      { value: "季度", disabled: periodType === "year" },
      { value: "年度", disabled: false },
    ];
    return all.map((o) => ({
      ...o,
      title: o.disabled ? "当前统计周期下不支持该时间粒度" : undefined,
    }));
  }, [periodType]);

  // 解析当前周期对应的结束基准
  const endRef = useMemo(() => {
    const v = period?.value ?? "";
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    if (periodType === "month") {
      const m = /(\d{4})-(\d{2})/.exec(v);
      if (m) { year = +m[1]; month = +m[2]; }
    } else if (periodType === "quarter") {
      const m = /(\d{4}).*Q?([1-4])/.exec(v);
      if (m) { year = +m[1]; month = (+m[2]) * 3; }
    } else if (periodType === "year") {
      const m = /(\d{4})/.exec(v);
      if (m) { year = +m[1]; month = 12; }
    }
    return { year, month };
  }, [period, periodType]);

  // 假设当前查询有时间维度
  const hasTime = true;

  const data = useMemo(() => {
    const rand = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // 生成时间轴
    let periods: string[] = [];
    if (granularity === "月度") {
      // 近 6 个月，以 endRef 为结束月
      for (let i = 5; i >= 0; i--) {
        let y = endRef.year;
        let m = endRef.month - i;
        while (m <= 0) { m += 12; y -= 1; }
        periods.push(`${y}-${String(m).padStart(2, "0")}`);
      }
    } else if (granularity === "季度") {
      // 近 4 个季度
      const endQ = Math.ceil(endRef.month / 3);
      for (let i = 3; i >= 0; i--) {
        let y = endRef.year;
        let q = endQ - i;
        while (q <= 0) { q += 4; y -= 1; }
        periods.push(`${y}Q${q}`);
      }
    } else {
      // 年度：2021年及以前 → 本年
      periods.push("2021年及以前");
      for (let y = 2022; y <= endRef.year; y++) periods.push(`${y}年`);
    }

    // 拆分项
    const companiesByScale = [...ROWS_ALL]
      .sort((a, b) => b.subtotal - a.subtotal)
      .map((r) => r.cityCompany);
    const topCompanies = companiesByScale.slice(0, 6);
    const companySplits = companiesByScale.length > 6 ? [...topCompanies, "其他"] : topCompanies;
    const groupSplits = Array.from(new Set(ROWS_ALL.map((r) => r.cityGroup)));
    const bizSplits = ["住宅", "商业", "写字楼", "车位", "其他"];
    const projectSplits = Array.from(new Set(ROWS_ALL.map((r: any) => r.project).filter(Boolean))).slice(0, 6);

    const splits =
      splitDim === "城市公司"
        ? companySplits
        : splitDim === "城市群"
          ? groupSplits
          : splitDim === "业态"
            ? bizSplits
            : (projectSplits.length ? projectSplits : companySplits);

    const isPct = metricUnit(metric) === "%";

    return periods.map((p, i) => {
      const row: Record<string, string | number> = { period: p };
      const base = isPct ? 60 : 1800 - i * 18;
      splits.forEach((s, si) => {
        const v = isPct
          ? +(base * (0.4 + rand(i * 7 + si * 3) * 0.6)).toFixed(2)
          : +(base * (0.2 + rand(i * 7 + si * 3) * 0.4)).toFixed(2);
        row[s] = v;
      });
      return row;
    });
  }, [granularity, splitDim, endRef, metric]);

  const splitKeys = useMemo(() => {
    return Object.keys(data[0] || {}).filter((k) => k !== "period");
  }, [data]);

  const unit = metricUnit(metric);

  // 统一图表色板 —— 引用全局 token (src/lib/tokens.ts)
  const palette = TOKEN_CHART_PALETTE as readonly string[];

  const tooltipFormatter = (v: any, name: any) => [`${v} ${unit}`, `${name} · ${metric}`];

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const noData = !data || data.length === 0 || splitKeys.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#F8FAFD] border border-[var(--color-panel-border)]">
        <div className="flex flex-wrap gap-2">
          <FilterPill label="趋势指标" value={metric} options={["总未售货值", "签约货值", "在建达售未取证货值", "在建已取证未售货值", "已竣工已取证未售货值", "取证去化率", ...derivedMetrics.map((d) => d.name)]} onChange={(v) => { setMetric(v); handleConfigChange(); }} />
          <FilterPill label="时间粒度" value={granularity} options={granularityOptions} onChange={(v) => { setGranularity(v as Granularity); handleConfigChange(); }} />
          <FilterPill label="图表类型" value={chartType} options={["柱状图", "折线图"]} onChange={(v) => { setChartType(v as any); handleConfigChange(); }} />
          <FilterPill label="拆分维度" value={splitDim} options={["城市群", "城市公司", "业态", "项目"]} onChange={(v) => { setSplitDim(v as SplitDim); handleConfigChange(); }} />
        </div>
        <div className="flex gap-2">
          <ExportButton>导出图片</ExportButton>
        </div>
      </div>

      {!hasTime || noData ? (
        <EmptyTrend />
      ) : (
        <div className="rounded-lg border border-[var(--color-panel-border)] bg-card p-4">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{metric} · {granularity}趋势</h3>
              <p className="mt-1 text-[12px] text-[#94A3B8] leading-relaxed">
                按{splitDim}拆分，共 {data.length} 个{granularity.replace("度", "")}，单位：{unit}。
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              结束周期：{data[data.length - 1]?.period}
            </span>
          </div>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "折线图" ? (
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#6b7c95" }} axisLine={{ stroke: "#E5EAF2" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7c95" }} axisLine={false} tickLine={false} label={{ value: unit, position: "insideTopLeft", fontSize: 11, fill: "#94A3B8", offset: 8 }} />
                  <Tooltip content={<TrendTooltip metric={metric} unit={unit} />} />
                  <Legend content={(props: any) => <TrendLegend payload={props.payload} hiddenKeys={hiddenKeys} onToggle={toggleKey} />} wrapperStyle={{ fontSize: 12 }} />
                  {splitKeys.map((k, i) => (
                    <Line key={k} type="monotone" dataKey={k} stroke={palette[i % palette.length]} strokeWidth={2} dot={{ r: 3 }} hide={hiddenKeys.has(k)} />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#6b7c95" }} axisLine={{ stroke: "#E5EAF2" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7c95" }} axisLine={false} tickLine={false} label={{ value: unit, position: "insideTopLeft", fontSize: 11, fill: "#94A3B8", offset: 8 }} />
                  <Tooltip content={<TrendTooltip metric={metric} unit={unit} />} cursor={{ fill: "rgba(22,119,255,0.06)" }} />
                  <Legend content={(props: any) => <TrendLegend payload={props.payload} hiddenKeys={hiddenKeys} onToggle={toggleKey} />} wrapperStyle={{ fontSize: 12 }} />
                  {splitKeys.map((k, i) => (
                    <Bar key={k} dataKey={k} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} hide={hiddenKeys.has(k)} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            当前趋势基于查询结果按{granularity.replace("度", "")}聚合生成，仅用于辅助观察变化方向，明细数据以明细表格为准。
          </p>
        </div>
      )}
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
  metric,
  unit,
}: any) {
  if (!active || !payload || payload.length === 0) return null;
  const items = payload.filter((p: any) => p && p.dataKey !== "period");
  const formatVal = (v: any) => {
    if (v == null || v === "" || (typeof v === "number" && !isFinite(v))) return "--";
    const n = Number(v);
    if (!isFinite(n)) return "--";
    return n.toFixed(2);
  };
  const max = 8;
  const visible = items.slice(0, max);
  const rest = items.length - visible.length;
  return (
    <div className="rounded-lg border border-[#E5EAF2] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] px-3 py-2 min-w-[200px]">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{metric}（{unit}）</div>
      <div className="mt-2 space-y-1">
        {visible.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: p.color || p.fill }} />
              <span className="text-foreground truncate">{p.name ?? p.dataKey}</span>
            </div>
            <span className="font-mono tabular-nums text-foreground">{formatVal(p.value)}</span>
          </div>
        ))}
        {rest > 0 && (
          <div className="text-[11px] text-muted-foreground pt-0.5">+{rest} 项</div>
        )}
      </div>
    </div>
  );
}

function TrendLegend({
  payload,
  hiddenKeys,
  onToggle,
}: {
  payload?: any[];
  hiddenKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (!payload || payload.length === 0) return null;
  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {payload.map((entry: any) => {
        const isHidden = hiddenKeys.has(entry.value);
        return (
          <button
            key={entry.value}
            type="button"
            onClick={() => onToggle(entry.value)}
            className={`flex items-center gap-1.5 text-xs cursor-pointer select-none transition-opacity ${
              isHidden ? "opacity-40" : "opacity-100"
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: isHidden ? "#CBD5E1" : entry.color }}
            />
            <span className={isHidden ? "text-muted-foreground/60" : "text-foreground"}>
              {entry.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyTrend() {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-panel-border)] bg-[#FAFBFD] py-16 flex flex-col items-center justify-center text-center">
      <Inbox className="w-10 h-10 text-muted-foreground/60 mb-3" />
      <div className="text-sm text-foreground font-medium">暂无趋势数据</div>
      <div className="text-xs text-muted-foreground mt-1.5">请调整查询条件后点击「查询数据」刷新结果。</div>
    </div>
  );
}

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: (string | { value: string; disabled?: boolean; title?: string })[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, disabled: false, title: undefined as string | undefined } : o,
  );
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-card border border-[var(--color-panel-border)] text-xs hover:border-[var(--color-brand)]"
      >
        <span className="text-muted-foreground">{label}：</span>
        <span className="text-foreground font-medium">{value}</span>
        <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 min-w-[140px] rounded-md border border-[var(--color-panel-border)] bg-card shadow-lg overflow-hidden">
            {normalized.map((o) => (
              <button
                key={o.value}
                disabled={o.disabled}
                title={o.title}
                onClick={() => {
                  if (o.disabled) return;
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-xs ${
                  o.disabled
                    ? "text-muted-foreground/50 cursor-not-allowed bg-[#F5F7FA]"
                    : `hover:bg-[var(--color-brand-soft)] ${o.value === value ? "text-[var(--color-brand)] font-medium" : "text-foreground"}`
                }`}
              >
                {o.value}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- 明细表格（按分析维度 + 已选指标 动态生成） ----------------

// 维度 key → 行字段提取/扩展配置
const DIM_VALUE_LISTS: Record<string, string[]> = {
  ddim_year: ["2021年及之前", "2022年", "2023年", "2024年", "2025年", "2026年"],
  ddim_age: ["小于1个月", "1-3个月", "3-6个月", "6-12个月", "12-24个月", "24个月以上"],
  ddim_biz_type: ["住宅", "商业", "写字楼", "车位", "其他"],
};
const DIM_LABEL: Record<string, string> = {
  ddim_city_group: "城市群",
  ddim_city_company: "城市公司",
  ddim_city: "城市",
  ddim_project: "项目",
  ddim_year: "货值形成年份",
  ddim_age: "货龄",
  ddim_biz_type: "业态",
};

// 指标 key → 数值字段（落到 Row 上）；不在表中的指标用派生估算
const METRIC_TO_ROW_KEY: Record<string, keyof Omit<Row, "cityGroup" | "cityCompany">> = {
  totalValue: "total",
  unsold: "subtotal",
  landReserve: "landReserve",
  startUnsale: "startUnsale",
  buildingUncert: "buildingUncert",
  buildingCertUnsold: "buildingCertUnsold",
  doneUncert: "doneUncert",
  doneCertUnsold: "doneCertUnsold",
  signed: "signed",
};

type DynRow = {
  dimValues: Record<string, string>;
  metrics: Record<string, number>;
};

function metricValue(key: string, base: Row, ratio: number): number {
  const rk = METRIC_TO_ROW_KEY[key];
  if (rk) return +(base[rk] * ratio).toFixed(2);
  // 取证去化率：签约 / (签约 + 在建已取证未售 + 已竣已取证未售)
  if (key === "certDealRate") {
    const signedV = base.signed * ratio;
    const certUnsold = (base.buildingCertUnsold + base.doneCertUnsold) * ratio;
    return +((signedV / Math.max(signedV + certUnsold, 1)) * 100).toFixed(2);
  }
  return +(base.total * ratio * 0.1).toFixed(2);
}

function isPercentMetric(key: string): boolean {
  return ["certDealRate", "dealRate", "valueDealRate", "monthDealRate", "yearDealRate", "longAgeRatio"].includes(key);
}

function buildDynRows(
  dimCols: { key: string; name: string }[],
  metricCols: { key: string; name: string }[],
  filters: Record<string, string[]>,
): DynRow[] {
  const out: DynRow[] = [];
  const groupF = filters["ddim_city_group"];
  const companyF = filters["ddim_city_company"];
  const cityF = filters["ddim_city"];
  const projectF = filters["ddim_project"];

  for (const r of ROWS_ALL) {
    // 顶层（按城市群/城市公司）筛选
    if (groupF && groupF.length && !groupF.includes(r.cityGroup)) continue;
    if (companyF && companyF.length && !companyF.includes(r.cityCompany)) continue;

    const expandKeys = dimCols
      .map((d) => d.key)
      .filter((k) => k !== "ddim_city_group" && k !== "ddim_city_company");

    const valueSets: { key: string; values: string[] }[] = expandKeys.map((k) => {
      if (k === "ddim_city") {
        const all = [r.cityCompany.replace(/公司$/, "")];
        const v = cityF && cityF.length ? all.filter((x) => cityF.includes(x)) : all;
        return { key: k, values: v.length ? v : all };
      }
      if (k === "ddim_project") {
        const projs = PROJECTS.filter((p) => p.cityCompany === r.cityCompany)
          .slice(0, 3)
          .map((p) => p.name);
        const all = projs.length ? projs : [`${r.cityCompany.replace(/公司$/, "")}项目A`];
        const v = projectF && projectF.length ? all.filter((x) => projectF.includes(x)) : all;
        return { key: k, values: v.length ? v : all };
      }
      const list = DIM_VALUE_LISTS[k] ?? ["—"];
      const f = filters[k];
      if (f && f.length) return { key: k, values: list.filter((v) => f.includes(v)) };
      return { key: k, values: list };
    });

    // 跳过空集合（某层级被筛掉）
    if (valueSets.some((vs) => vs.values.length === 0)) continue;

    let combos: Record<string, string>[] = [{}];
    for (const vs of valueSets) {
      const next: Record<string, string>[] = [];
      for (const c of combos) for (const v of vs.values) next.push({ ...c, [vs.key]: v });
      combos = next;
    }

    const share = 1 / Math.max(combos.length, 1);
    combos.forEach((combo, idx) => {
      const dimValues: Record<string, string> = {};
      for (const dc of dimCols) {
        if (dc.key === "ddim_city_group") dimValues[dc.key] = r.cityGroup;
        else if (dc.key === "ddim_city_company") dimValues[dc.key] = r.cityCompany;
        else dimValues[dc.key] = combo[dc.key] ?? "—";
      }
      const jitter = 0.85 + ((idx * 37) % 30) / 100;
      const metrics: Record<string, number> = {};
      for (const m of metricCols) {
        metrics[m.key] = metricValue(m.key, r, share * jitter);
      }
      out.push({ dimValues, metrics });
    });
  }
  return out;
}

function DetailTab({
  focusMetric,
  derivedMetrics = [],
  appliedDimColumns,
  appliedMetricColumns,
  appliedDimValueFilters,
  appliedSortRules,
}: {
  focusMetric: string | null;
  querySummary?: string;
  derivedMetrics?: DerivedMetric[];
  appliedDimColumns?: { key: string; name: string }[];
  appliedMetricColumns?: { key: string; name: string }[];
  appliedDimValueFilters?: Record<string, string[]>;
  appliedSortRules?: SortRule[];
}) {
  const focusName = METRICS.find((m) => m.key === focusMetric)?.name;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 默认从 appliedSortRules 或签约货值降序初始化
  const defaultSort = appliedSortRules && appliedSortRules.length > 0
    ? appliedSortRules[0]
    : { field: "signed", dir: "desc" as const };
  const [sortKey, setSortKey] = useState<string | null>(defaultSort.field);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(defaultSort.dir);

  // 当 appliedSortRules 变化时同步默认排序（查询后生效）
  useEffect(() => {
    if (appliedSortRules && appliedSortRules.length > 0) {
      setSortKey(appliedSortRules[0].field);
      setSortDir(appliedSortRules[0].dir);
    }
  }, [appliedSortRules?.map((r) => r.field + r.dir).join("|")]);

  const dimCols = appliedDimColumns && appliedDimColumns.length > 0
    ? appliedDimColumns
    : [
        { key: "ddim_city_group", name: DIM_LABEL.ddim_city_group },
        { key: "ddim_city_company", name: DIM_LABEL.ddim_city_company },
      ];
  const metricCols = appliedMetricColumns ?? [];
  const filters = appliedDimValueFilters ?? {};

  // 当切换维度/指标时，重置分页
  useEffect(() => {
    setPage(1);
  }, [dimCols.map((d) => d.key).join("|"), metricCols.map((m) => m.key).join("|"), JSON.stringify(filters)]);

  // 注：点击 KPI 卡片只触发列高亮（focusMetric），不再联动排序；排序仅由表头点击触发。


  const rows = useMemo(() => buildDynRows(dimCols, metricCols, filters), [dimCols, metricCols, filters]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    const arr = [...rows];
    const isMetric = metricCols.some((m) => m.key === sortKey);
    arr.sort((a, b) => {
      const av = isMetric ? a.metrics[sortKey] ?? 0 : (a.dimValues[sortKey] ?? "");
      const bv = isMetric ? b.metrics[sortKey] ?? 0 : (b.dimValues[sortKey] ?? "");
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [rows, sortKey, sortDir, metricCols]);

  const total = sorted.length;
  const totalPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPage);
  const pageData = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (k: string) => {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("desc");
    } else if (sortDir === "desc") setSortDir("asc");
    else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const activeFilters = Object.entries(filters).filter(([, v]) => Array.isArray(v) && v.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground">
          根据当前分析维度和指标自动生成明细结果 · 共 <span className="text-[var(--color-brand)] font-semibold">{total}</span> 条
          {sortKey && sortDir && (
            <span className="ml-2 text-muted-foreground/80">
              · 已按 {METRICS.find((m) => m.key === sortKey)?.name ?? dimCols.find((d) => d.key === sortKey)?.name ?? sortKey} {sortDir === "asc" ? "升序" : "降序"}排序
            </span>
          )}

        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">单位：亿元 / %</span>
          <ExportButton />
        </div>
      </div>
      {activeFilters.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>当前筛选：</span>
          {activeFilters.map(([k, v]) => (
            <span key={k} className="inline-flex items-center px-2 h-5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
              {DIM_LABEL[k] ?? k} = {(v as string[]).join("、")}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-[var(--color-panel-border)] bg-card overflow-hidden">
        <div className="overflow-auto max-h-[480px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <th className="th-cell th-left w-16">序号</th>
                {dimCols.map((d) => (
                  <th
                    key={d.key}
                    className="th-cell th-left cursor-pointer select-none"
                    onClick={() => toggleSort(d.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {d.name}
                      {sortKey === d.key
                        ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                        : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                    </span>
                  </th>
                ))}
                {metricCols.map((m) => (
                  <SortTh
                    key={m.key}
                    active={sortKey === m.key}
                    dir={sortDir}
                    highlight={focusMetric === m.key}
                    onClick={() => toggleSort(m.key)}
                  >
                    {m.name}
                  </SortTh>
                ))}
                {derivedMetrics.map((d) => (
                  <th key={d.id} className="th-cell text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-bold bg-white/60 text-[var(--color-brand)]">fx</span>
                      {d.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td className="td-cell text-center text-muted-foreground py-10" colSpan={1 + dimCols.length + metricCols.length + derivedMetrics.length}>
                    请选择至少 1 个指标后再查询
                  </td>
                </tr>
              ) : pageData.map((r, i) => {
                const ctx = {
                  total: r.metrics.totalValue ?? 0,
                  subtotal: r.metrics.unsold ?? 0,
                  achievedNoCert: r.metrics.achievedNoCert ?? 0,
                  certNoSale: r.metrics.certNoSale ?? 0,
                  doneNoSale: r.metrics.doneNoSale ?? 0,
                  signed: r.metrics.signed ?? 0,
                  signedArea: (r.metrics.signed ?? 0) * 0.3,
                  unsoldArea: (r.metrics.unsold ?? 0) * 0.5,
                  avg12m: 4.5,
                };
                return (
                  <tr key={i} className="border-t border-[#EEF1F6] hover:bg-[#F5F9FF]">
                    <td className="td-cell td-left text-muted-foreground tabular-nums">{(safePage - 1) * pageSize + i + 1}</td>
                    {dimCols.map((d) => (
                      <td key={d.key} className="td-cell td-left">{r.dimValues[d.key]}</td>
                    ))}
                    {metricCols.map((m) => {
                      const v = r.metrics[m.key] ?? 0;
                      const hl = focusMetric === m.key;
                      return (
                        <td key={m.key} className={`td-cell td-num ${hl ? "bg-[#EFF6FF] font-bold text-[var(--color-brand)]" : ""}`}>
                          {isPercentMetric(m.key) ? `${v.toFixed(1)}%` : fmtNumber(v)}
                        </td>
                      );
                    })}
                    {derivedMetrics.map((d) => {
                      const v = evalDerived(d.formula, ctx);
                      return <td key={d.id} className="td-cell td-num text-[var(--color-brand)] font-medium">{formatDerived(v, d.unit, d.decimals)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-[#EEF1F6] text-xs text-muted-foreground">
          <span>共 {total} 条</span>
          <button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-7 h-7 rounded border border-[var(--color-panel-border)] flex items-center justify-center disabled:opacity-40 hover:text-[var(--color-brand)] hover:border-[var(--color-brand)]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPage, 5) }).map((_, i) => {
            const n = i + 1;
            const active = n === safePage;
            return (
              <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 rounded border ${active ? "bg-[var(--color-brand)] text-[var(--color-brand-foreground)] border-[var(--color-brand)]" : "border-[var(--color-panel-border)] hover:text-[var(--color-brand)] hover:border-[var(--color-brand)]"}`}>
                {n}
              </button>
            );
          })}
          <button disabled={safePage === totalPage} onClick={() => setPage((p) => Math.min(totalPage, p + 1))} className="w-7 h-7 rounded border border-[var(--color-panel-border)] flex items-center justify-center disabled:opacity-40 hover:text-[var(--color-brand)] hover:border-[var(--color-brand)]">
            <ChevronRight className="w-4 h-4" />
          </button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-7 px-2 rounded border border-[var(--color-panel-border)] bg-card outline-none">
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}条/页</option>)}
          </select>
        </div>
      </div>

      <style>{`
        .th-cell { padding: 10px 16px; font-weight: 500; font-size: 13px; white-space: nowrap; line-height: 20px; }
        .th-left { text-align: left; }
        .th-center { text-align: center; }
        .td-cell { padding: 10px 16px; color: var(--color-foreground); white-space: nowrap; line-height: 20px; font-size: 13px; }
        .td-left { text-align: left; }
        .td-num { text-align: right; font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}

function SortTh({
  children,
  active,
  dir,
  onClick,
  rowSpan,
  highlight,
}: {
  children: React.ReactNode;
  active: boolean;
  dir: "asc" | "desc" | null;
  onClick: () => void;
  rowSpan?: number;
  highlight?: boolean;
}) {
  return (
    <th
      rowSpan={rowSpan}
      className={`th-cell text-right cursor-pointer select-none transition-colors ${highlight ? "bg-[#EFF6FF] !text-[var(--color-brand)] font-semibold" : ""}`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1 justify-end">
        {children}
        {active && dir === "asc" ? (
          <ArrowUp className="w-3.5 h-3.5" />
        ) : active && dir === "desc" ? (
          <ArrowDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
        )}
      </span>
    </th>
  );
}

// ---------------- 管理展示指标抽屉 ----------------
function ManageDrawer({
  pinned,
  builtinPool,
  derivedPool,
  onSave,
  onClose,
}: {
  pinned: string[];
  builtinPool: Metric[];
  derivedPool: DerivedMetric[];
  onSave: (next: string[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<string[]>(pinned);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: string) => {
    setError(null);
    setLocal((p) => {
      if (p.includes(k)) {
        if (p.length <= 1) {
          setError("至少保留 1 个展示指标");
          return p;
        }
        return p.filter((x) => x !== k);
      } else {
        if (p.length >= 6) {
          setError("最多展示 6 个重点指标，请先取消一个后再选择。");
          return p;
        }
        return [...p, k];
      }
    });
  };

  // 业务分组：按用户要求展示分类
  const CAT_GROUPS: { label: string; items: Metric[] }[] = [
    { label: "总量指标", items: builtinPool.filter((m) => m.category === "scale") },
    { label: "货值结构", items: builtinPool.filter((m) => m.category === "status") },
    { label: "去化表现", items: builtinPool.filter((m) => m.category === "sales") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div
        className="w-[420px] h-full bg-card border-l border-[var(--color-panel-border)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-brand)]" />
              管理展示指标
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            选择最多 6 个指标用于顶部重点指标卡片展示，不影响表格字段。
          </p>
        </div>
        <div className="px-5 pt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">至少 1 个，最多 6 个</span>
          <span className="text-[var(--color-brand)] font-medium">已选 {local.length} / 6</span>
        </div>
        {error && (
          <div className="mx-5 mt-2 px-3 py-1.5 rounded text-xs bg-orange-50 text-orange-700 border border-orange-200">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-auto px-5 py-3 space-y-4">
          {CAT_GROUPS.length === 0 && derivedPool.length === 0 && (
            <div className="text-xs text-muted-foreground py-6 text-center">
              请先在左侧勾选指标
            </div>
          )}
          {CAT_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <span className="inline-block w-1 h-3 rounded bg-[var(--color-brand)]" />
                {g.label}
              </div>
              <div className="space-y-2">
                {g.items.map((m) => {
                  const checked = local.includes(m.key);
                  return (
                    <label
                      key={m.key}
                      className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                        checked
                          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40"
                          : "border-[var(--color-panel-border)] hover:border-[var(--color-brand)]/50"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(m.key)} className="mt-0.5 accent-[var(--color-brand)]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{m.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{m.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {derivedPool.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <span className="inline-block w-1 h-3 rounded bg-[var(--color-brand)]" />
                我的衍生指标
              </div>
              <div className="space-y-2">
                {derivedPool.map((d) => {
                  const checked = local.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                        checked
                          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40"
                          : "border-[var(--color-panel-border)] hover:border-[var(--color-brand)]/50"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(d.id)} className="mt-0.5 accent-[var(--color-brand)]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-bold bg-[var(--color-brand-soft)] text-[var(--color-brand)]">fx</span>
                          {d.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{d.desc || d.formula}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-[var(--color-panel-border)] flex gap-3">
          <button onClick={onClose} className="flex-1 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">取消</button>
          <button
            onClick={() => {
              if (local.length < 1 || local.length > 6) return;
              onSave(local);
            }}
            disabled={local.length < 1 || local.length > 6}
            className="flex-1 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            保存展示配置
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- 构成图表 ----------------
type CompMetricKey = "total" | "subtotal" | "landReserve" | "startUnsale" | "buildingUncert" | "buildingCertUnsold" | "doneUncert" | "doneCertUnsold" | "signed" | "certDealRate";
const COMP_METRICS: { key: CompMetricKey; name: string }[] = [
  { key: "total", name: "项目总货值" },
  { key: "subtotal", name: "总未售货值" },
  { key: "landReserve", name: "土地储备货值" },
  { key: "startUnsale", name: "开工未达预售货值" },
  { key: "buildingUncert", name: "在建达售未取证货值" },
  { key: "buildingCertUnsold", name: "在建已取证未售货值" },
  { key: "doneUncert", name: "已竣工未取证货值" },
  { key: "doneCertUnsold", name: "已竣工已取证未售货值" },
  { key: "signed", name: "签约货值" },
  { key: "certDealRate", name: "取证去化率" },
];

function CompositionTab({ focusMetric }: { focusMetric: string | null }) {
  const focused = METRICS.find((m) => m.key === focusMetric);
  const defaultName = focused && COMP_METRICS.find((c) => c.name === focused.name) ? focused.name : "总未售货值";
  const [metricName, setMetricName] = useState<string>(defaultName);
  const [dim, setDim] = useState<string>("城市公司");
  const [chartType, setChartType] = useState<"条形图" | "环形图">("环形图");

  useEffect(() => {
    if (focused) {
      const hit = COMP_METRICS.find((c) => c.name === focused.name);
      if (hit) setMetricName(focused.name);
    }
  }, [focused]);

  const metricKey = (COMP_METRICS.find((c) => c.name === metricName)?.key ?? "subtotal") as CompMetricKey;

  const rawList = useMemo(() => {
    const arr = ROWS_ALL.map((r) => {
      let value: number;
      if (metricKey === "certDealRate") {
        const certUnsold = r.buildingCertUnsold + r.doneCertUnsold;
        value = +((r.signed / Math.max(r.signed + certUnsold, 1)) * 100).toFixed(2);
      } else {
        value = +((r[metricKey] as number) ?? 0).toFixed(2);
      }
      return { name: r.cityCompany, value };
    })
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
    return arr;
  }, [metricKey]);

  const total = rawList.reduce((s, x) => s + x.value, 0);
  const palette = TOKEN_CHART_PALETTE as readonly string[];

  // 环形图超过 8 个合并为"其他"
  const pieData = useMemo(() => {
    if (rawList.length <= 8) return rawList;
    const top = rawList.slice(0, 7);
    const rest = rawList.slice(7).reduce((s, x) => s + x.value, 0);
    return [...top, { name: "其他", value: +rest.toFixed(2) }];
  }, [rawList]);

  const listForTable = chartType === "环形图" ? pieData : rawList;

  if (rawList.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-panel-border)] bg-[#FAFBFD] py-16 flex flex-col items-center justify-center text-center">
        <Inbox className="w-10 h-10 text-muted-foreground/60 mb-3" />
        <div className="text-sm text-foreground font-medium">暂无可用于构成分析的数据</div>
        <div className="text-xs text-muted-foreground mt-1.5">请先在更多配置中选择至少一个可用于构成分析的指标。</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#F8FAFD] border border-[var(--color-panel-border)]">
        <div className="flex flex-wrap gap-2">
          <FilterPill label="构成指标" value={metricName} options={COMP_METRICS.map((c) => c.name)} onChange={setMetricName} />
          <FilterPill label="构成维度" value={dim} options={["城市群", "城市公司", "城市", "项目", "业态", "货龄"]} onChange={setDim} />
          <FilterPill label="图表类型" value={chartType} options={["条形图", "环形图"]} onChange={(v) => setChartType(v as "条形图" | "环形图")} />
        </div>
        <div className="flex gap-2">
          <ExportButton>导出图片</ExportButton>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-panel-border)] bg-card p-4">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{metricName}构成｜按{dim}</h3>
            <p className="mt-1 text-[12px] text-[#94A3B8]">占比 = 当前{dim}该指标值 / 当前筛选范围下该指标总值</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">共 {rawList.length} 项 · 合计 {fmtNumber(total)} 亿元</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "条形图" ? (
                <BarChart data={rawList} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#6b7c95" }} axisLine={{ stroke: "#E5EAF2" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#6b7c95" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5EAF2", fontSize: 12 }}
                    formatter={(v: number) => [`${fmtNumber(v)} 亿元 (${((v / total) * 100).toFixed(1)}%)`, metricName]}
                  />
                  <Bar dataKey="value" fill={palette[0]} radius={[0, 3, 3, 0]} />
                </BarChart>
              ) : (
                <PieChart>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5EAF2", fontSize: 12 }}
                    formatter={(v: number, n: string) => [`${fmtNumber(v)} 亿元 (${((v / total) * 100).toFixed(1)}%)`, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={120} paddingAngle={1}>
                    {pieData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="border border-[#EEF1F6] rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-[#F8FAFD] text-[12px] font-medium text-[var(--color-brand)] border-b border-[#EEF1F6] flex justify-between">
              <span>构成明细</span>
              <span className="text-muted-foreground">按占比降序</span>
            </div>
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full text-[12px]">
                <tbody>
                  {listForTable.map((r, i) => {
                    const pct = total > 0 ? (r.value / total) * 100 : 0;
                    return (
                      <tr key={r.name} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F5F9FF]">
                        <td className="px-3 py-2 text-foreground">
                          <span className="inline-block w-2 h-2 rounded-sm mr-2 align-middle" style={{ background: palette[i % palette.length] }} />
                          {r.name}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{fmtNumber(r.value)}亿元</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[var(--color-brand)] font-medium w-16">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
