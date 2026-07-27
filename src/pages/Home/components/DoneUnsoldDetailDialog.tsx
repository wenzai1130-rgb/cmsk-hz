import { ExportButton } from "@/components/ui/export-button";
import { Input } from "@/components/ui/input";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useEffect, useMemo, useState } from "react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PackageCheck,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  LabelList,
} from "recharts";

type YeType = "住宅" | "商业" | "公寓" | "写字楼" | "车位" | "配套及其他";
const YE_TYPES: YeType[] = ["住宅", "商业", "公寓", "写字楼", "车位", "配套及其他"];

// Unified soft enterprise palette (aligned with LandYear dialog system)
const COLOR: Record<YeType, string> = {
  住宅: "#3B82F6",   // brand blue
  商业: "#F59E0B",   // amber
  公寓: "#14B8A6",   // teal
  写字楼: "#EF4444", // red-orange
  车位: "#8B5CF6",   // purple
  配套及其他: "#94A3B8",   // slate
};

// Shared SVG gradients for soft bar fills (must be inlined inside BarChart)
const GRADIENT_DEFS = (
  <defs>
    {YE_TYPES.map((k) => {
      const c = COLOR[k];
      return (
        <linearGradient key={k} id={`du-g-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={1} />
          <stop offset="100%" stopColor={c} stopOpacity={0.78} />
        </linearGradient>
      );
    })}
  </defs>
);

import { formatNumber, formatPercent } from "@/lib/format";
const fmt2 = (n: number | null | undefined) => formatNumber(n, { thousand: false });
const pct2 = (n: number | null | undefined) => formatPercent(n);

// --- Mock data ---
const YEARLY = [
  { x: "2022", 住宅: 380.25, 商业: 48.30, 公寓: 92.40, 写字楼: 32.10, 车位: 56.18, 配套及其他: 18.60 },
  { x: "2023", 住宅: 412.80, 商业: 52.45, 公寓: 88.65, 写字楼: 30.80, 车位: 61.20, 配套及其他: 21.10 },
  { x: "2024", 住宅: 396.50, 商业: 49.10, 公寓: 95.20, 写字楼: 28.95, 车位: 64.55, 配套及其他: 19.85 },
  { x: "2025", 住宅: 358.40, 商业: 50.25, 公寓: 90.10, 写字楼: 32.50, 车位: 60.40, 配套及其他: 22.30 },
  { x: "2026", 住宅: 368.50, 商业: 49.00, 公寓: 86.40, 写字楼: 31.20, 车位: 58.20, 配套及其他: 19.59 },
];

// Monthly 2026 — driven by current statistical month; future months render empty
const CURRENT_MONTH_2026 = 6;
const MONTHLY_RAW: Array<Record<string, any>> = [
  { x: "01", 住宅: 30.60, 商业: 4.50, 公寓: 7.10, 写字楼: 2.60, 车位: 4.80, 配套及其他: 1.20 },
  { x: "02", 住宅: 28.40, 商业: 4.10, 公寓: 6.90, 写字楼: 2.30, 车位: 4.30, 配套及其他: 1.10 },
  { x: "03", 住宅: 32.40, 商业: 4.70, 公寓: 7.80, 写字楼: 2.80, 车位: 5.00, 配套及其他: 1.30 },
  { x: "04", 住宅: 29.80, 商业: 4.30, 公寓: 7.40, 写字楼: 2.50, 车位: 4.60, 配套及其他: 1.15 },
  { x: "05", 住宅: 33.20, 商业: 4.90, 公寓: 8.10, 写字楼: 2.95, 车位: 5.20, 配套及其他: 1.35 },
  { x: "06", 住宅: 31.10, 商业: 4.60, 公寓: 7.60, 写字楼: 2.70, 车位: 4.90, 配套及其他: 1.25 },
  { x: "07", 住宅: 32.80, 商业: 4.80, 公寓: 7.95, 写字楼: 2.85, 车位: 5.10, 配套及其他: 1.30 },
  { x: "08", 住宅: 30.20, 商业: 4.40, 公寓: 7.30, 写字楼: 2.55, 车位: 4.70, 配套及其他: 1.18 },
  { x: "09", 住宅: 33.60, 商业: 4.95, 公寓: 8.20, 写字楼: 3.00, 车位: 5.30, 配套及其他: 1.38 },
  { x: "10", 住宅: 34.10, 商业: 5.05, 公寓: 8.40, 写字楼: 3.10, 车位: 5.40, 配套及其他: 1.42 },
  { x: "11", 住宅: 32.20, 商业: 4.75, 公寓: 7.85, 写字楼: 2.80, 车位: 5.05, 配套及其他: 1.28 },
  { x: "12", 住宅: 35.40, 商业: 5.20, 公寓: 8.70, 写字楼: 3.20, 车位: 5.55, 配套及其他: 1.48 },
];
const YE_KEYS = YE_TYPES;
const MONTHLY: Array<Record<string, any>> = MONTHLY_RAW.map((row, i) => {
  if (i + 1 <= CURRENT_MONTH_2026) return row;
  const blank: Record<string, any> = { x: row.x, __future: true };
  YE_KEYS.forEach((k) => (blank[k] = null));
  return blank;
});

// Summary table (per ye type)
type SummaryRow = {
  name: YeType | "合计";
  doneStart: number; doneNew: number;
  soldStart: number; soldNew: number;
  rateStart: number; rateNew: number;
};
const SUMMARY: SummaryRow[] = [
  { name: "住宅", doneStart: 220.40, doneNew: 148.10, soldStart: 130.20, soldNew: 90.50, rateStart: 59.07, rateNew: 61.11 },
  { name: "商业", doneStart: 28.50, doneNew: 20.50, soldStart: 12.30, soldNew: 8.40, rateStart: 43.16, rateNew: 40.98 },
  { name: "公寓", doneStart: 52.30, doneNew: 34.10, soldStart: 28.40, soldNew: 18.60, rateStart: 54.30, rateNew: 54.55 },
  { name: "写字楼", doneStart: 18.40, doneNew: 12.80, soldStart: 7.20, soldNew: 4.80, rateStart: 39.13, rateNew: 37.50 },
  { name: "车位", doneStart: 35.20, doneNew: 23.00, soldStart: 16.40, soldNew: 9.80, rateStart: 46.59, rateNew: 42.61 },
  { name: "配套及其他", doneStart: 11.80, doneNew: 7.79, soldStart: 5.10, soldNew: 3.20, rateStart: 43.22, rateNew: 41.08 },
];
const SUMMARY_TOTAL: SummaryRow = (() => {
  const sum = (k: keyof SummaryRow) => SUMMARY.reduce((a, r) => a + (r[k] as number), 0);
  const doneStart = sum("doneStart"), doneNew = sum("doneNew");
  const soldStart = sum("soldStart"), soldNew = sum("soldNew");
  return {
    name: "合计",
    doneStart: +doneStart.toFixed(2), doneNew: +doneNew.toFixed(2),
    soldStart: +soldStart.toFixed(2), soldNew: +soldNew.toFixed(2),
    rateStart: +(soldStart / doneStart * 100).toFixed(2),
    rateNew: +(soldNew / doneNew * 100).toFixed(2),
  };
})();

// Project detail by ye type
type ProjectRow = {
  name: string;
  doneStart: number; doneNew: number;
  soldStart: number; soldNew: number;
  rateStart: number; rateNew: number;
};

function genProjects(seed: string, base: number, count: number): ProjectRow[] {
  const out: ProjectRow[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const r1 = ((h >>> 0) % 1000) / 1000;
    h = (h * 1103515245 + 12345) >>> 0;
    const r2 = ((h >>> 0) % 1000) / 1000;
    h = (h * 1103515245 + 12345) >>> 0;
    const r3 = ((h >>> 0) % 1000) / 1000;
    h = (h * 1103515245 + 12345) >>> 0;
    const r4 = ((h >>> 0) % 1000) / 1000;
    const doneStart = +(base * (0.6 + r1 * 0.8)).toFixed(2);
    const doneNew = +(base * (0.4 + r2 * 0.6)).toFixed(2);
    const soldStart = +(doneStart * (0.35 + r3 * 0.4)).toFixed(2);
    const soldNew = +(doneNew * (0.30 + r4 * 0.45)).toFixed(2);
    out.push({
      name: `${seed}项目-${String(i + 1).padStart(2, "0")}`,
      doneStart, doneNew, soldStart, soldNew,
      rateStart: +(soldStart / doneStart * 100).toFixed(2),
      rateNew: +(soldNew / doneNew * 100).toFixed(2),
    });
  }
  return out;
}

const PROJECTS: Record<YeType, ProjectRow[]> = {
  住宅: [
    { name: "深湾玺园", doneStart: 18.40, doneNew: 12.20, soldStart: 11.30, soldNew: 7.50, rateStart: 61.41, rateNew: 61.48 },
    { name: "招商蛇口·璟悦", doneStart: 14.80, doneNew: 9.80, soldStart: 8.65, soldNew: 5.90, rateStart: 58.45, rateNew: 60.20 },
    { name: "虹桥公馆", doneStart: 22.30, doneNew: 14.50, soldStart: 13.85, soldNew: 9.10, rateStart: 62.11, rateNew: 62.76 },
    { name: "前滩玺悦", doneStart: 16.60, doneNew: 10.40, soldStart: 9.40, soldNew: 6.20, rateStart: 56.63, rateNew: 59.62 },
    { name: "杭州雍景湾", doneStart: 13.20, doneNew: 8.90, soldStart: 7.30, soldNew: 5.20, rateStart: 55.30, rateNew: 58.43 },
    { name: "南京雍景府", doneStart: 11.80, doneNew: 7.60, soldStart: 6.45, soldNew: 4.40, rateStart: 54.66, rateNew: 57.89 },
    { name: "北京雍璟府", doneStart: 19.50, doneNew: 12.40, soldStart: 11.80, soldNew: 7.60, rateStart: 60.51, rateNew: 61.29 },
    { name: "天津雍宁府", doneStart: 9.60, doneNew: 6.20, soldStart: 5.10, soldNew: 3.50, rateStart: 53.13, rateNew: 56.45 },
    { name: "武汉江湾国际", doneStart: 12.40, doneNew: 8.10, soldStart: 6.95, soldNew: 4.80, rateStart: 56.05, rateNew: 59.26 },
    { name: "长沙雍景华府", doneStart: 8.90, doneNew: 5.80, soldStart: 4.85, soldNew: 3.30, rateStart: 54.49, rateNew: 56.90 },
    { name: "成都招商大魔方", doneStart: 14.20, doneNew: 9.30, soldStart: 8.15, soldNew: 5.70, rateStart: 57.39, rateNew: 61.29 },
    { name: "重庆江湾城", doneStart: 10.50, doneNew: 6.80, soldStart: 5.70, soldNew: 3.95, rateStart: 54.29, rateNew: 58.09 },
    { name: "佛山公园大道", doneStart: 9.80, doneNew: 6.40, soldStart: 5.40, soldNew: 3.65, rateStart: 55.10, rateNew: 57.03 },
    { name: "广州金山谷", doneStart: 17.90, doneNew: 11.80, soldStart: 10.85, soldNew: 7.20, rateStart: 60.61, rateNew: 61.02 },
    ...genProjects("住宅", 8, 14),
  ],
  公寓: [
    { name: "海上世界公寓", doneStart: 12.40, doneNew: 8.20, soldStart: 6.80, soldNew: 4.50, rateStart: 54.84, rateNew: 54.88 },
    { name: "北京臻悦公寓", doneStart: 10.30, doneNew: 6.80, soldStart: 5.60, soldNew: 3.70, rateStart: 54.37, rateNew: 54.41 },
    { name: "上海前滩公寓", doneStart: 11.50, doneNew: 7.40, soldStart: 6.20, soldNew: 4.10, rateStart: 53.91, rateNew: 55.41 },
    { name: "杭州未来公寓", doneStart: 8.40, doneNew: 5.50, soldStart: 4.50, soldNew: 3.00, rateStart: 53.57, rateNew: 54.55 },
    ...genProjects("公寓", 5, 10),
  ],
  车位: [
    { name: "深圳车位组团A", doneStart: 6.20, doneNew: 4.10, soldStart: 2.90, soldNew: 1.80, rateStart: 46.77, rateNew: 43.90 },
    { name: "广州车位组团B", doneStart: 5.40, doneNew: 3.50, soldStart: 2.50, soldNew: 1.50, rateStart: 46.30, rateNew: 42.86 },
    ...genProjects("车位", 4, 12),
  ],
  商业: [
    { name: "广州天玺商业", doneStart: 8.40, doneNew: 6.10, soldStart: 3.60, soldNew: 2.50, rateStart: 42.86, rateNew: 40.98 },
    { name: "武汉招商花园城", doneStart: 7.20, doneNew: 5.20, soldStart: 3.10, soldNew: 2.10, rateStart: 43.06, rateNew: 40.38 },
    ...genProjects("商业", 5, 10),
  ],
  写字楼: [
    { name: "上海招商局大厦", doneStart: 9.50, doneNew: 6.40, soldStart: 3.70, soldNew: 2.40, rateStart: 38.95, rateNew: 37.50 },
    { name: "深圳招商前海大厦", doneStart: 6.80, doneNew: 4.50, soldStart: 2.70, soldNew: 1.70, rateStart: 39.71, rateNew: 37.78 },
    ...genProjects("写字楼", 5, 8),
  ],
  配套及其他: [
    { name: "综合配套-深圳", doneStart: 4.20, doneNew: 2.80, soldStart: 1.80, soldNew: 1.15, rateStart: 42.86, rateNew: 41.07 },
    ...genProjects("配套及其他", 3, 10),
  ],
};

// ---------- Tooltip ----------
function ChartTooltip({ active, payload, label, hidden }: any) {
  if (!active || !payload?.length) return null;
  // 过滤掉隐藏系列、null、以及 0 值（避免 Recharts 把空堆叠也带进来）
  const items = payload.filter(
    (p: any) => p && p.value != null && +p.value > 0 && !(hidden && hidden[p.dataKey]),
  );
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
        padding: "12px 14px",
        minWidth: 200,
        color: "#1E293B",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: items.length ? 8 : 4, color: "#1E293B" }}>{label}</div>
      {children}
    </div>
  );
  if (items.length === 0) {
    return <Shell><div style={{ fontSize: 12, color: "#94A3B8" }}>该月份尚未发生，暂无数据</div></Shell>;
  }
  const total = items.reduce((s: number, p: any) => s + (+p.value || 0), 0);
  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((p: any) => (
          <div key={p.dataKey} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, lineHeight: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: COLOR[p.dataKey as YeType], display: "inline-block" }} />
              {p.dataKey}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", fontVariantNumeric: "tabular-nums" }}>
              {(+p.value).toFixed(2)} 亿
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#64748B" }}>合计</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", fontVariantNumeric: "tabular-nums" }}>
          {total.toFixed(2)} 亿
        </span>
      </div>
    </Shell>
  );
}

// ---------- Stack chart with hover dim & legend toggle ----------
function StackBars({
  data,
  height = 300,
  variant = "stacked",
  hidden,
  onLegendClick,
  hoverKey,
  setHoverKey,
}: {
  data: any[];
  height?: number;
  variant?: "stacked" | "grouped";
  hidden: Record<string, boolean>;
  onLegendClick: (e: any) => void;
  hoverKey: string | null;
  setHoverKey: (k: string | null) => void;
}) {
  const chartData = useMemo(
    () =>
      data.map((row) => {
        const totalVisible = YE_TYPES.reduce((sum, key) => {
          if (hidden[key]) return sum;
          const value = row[key];
          return value == null ? sum : sum + (+value || 0);
        }, 0);
        return {
          ...row,
          __totalVisible: row.__future || totalVisible <= 0 ? null : +totalVisible.toFixed(2),
        };
      }),
    [data, hidden],
  );
  const topSeries = [...YE_TYPES].reverse().find((key) => !hidden[key]) ?? YE_TYPES[YE_TYPES.length - 1];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
          {GRADIENT_DEFS}
          <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="x" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
          <RTooltip cursor={{ fill: "rgba(59,130,246,0.05)" }} content={(props: any) => <ChartTooltip {...props} hidden={hidden} />} />
          <Legend
            iconType="rect"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "#64748B" }}
            onClick={onLegendClick}
            onMouseEnter={(e: any) => setHoverKey(e?.dataKey ?? e?.value ?? null)}
            onMouseLeave={() => setHoverKey(null)}
          />
          {YE_TYPES.map((t, i) => (
            <Bar
              key={t}
              dataKey={t}
              stackId={variant === "stacked" ? "a" : undefined}
              fill={`url(#du-g-${t})`}
              stroke={COLOR[t]}
              strokeOpacity={0}
              isAnimationActive={false}
              radius={variant === "grouped" ? [3, 3, 0, 0] : i === YE_TYPES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={variant === "grouped" ? 18 : 28}
              hide={!!hidden[t]}
              fillOpacity={hoverKey && hoverKey !== t ? 0.3 : 1}
            >
              {variant === "grouped" && (
                <LabelList
                  dataKey={t}
                  position="top"
                  formatter={(v: any) => (v == null || +v <= 0 ? "" : (+v).toFixed(2))}
                  style={{ fill: "#475569", fontSize: 10, fontWeight: 500 }}
                />
              )}
              {variant === "stacked" && t === topSeries && (
                <LabelList
                  dataKey="__totalVisible"
                  position="top"
                  formatter={(v: any) => (v == null || +v <= 0 ? "" : (+v).toFixed(2))}
                  style={{ fill: "#334155", fontSize: 10, fontWeight: 600 }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Section card ----------
function SectionCard({
  title,
  unit,
  right,
  hint,
  children,
}: {
  title: string;
  unit?: string;
  right?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded bg-[#3B82F6]" />
          <span className="text-[16px] font-semibold text-[#1E293B] leading-tight">{title}</span>
        </div>
        {right}
      </div>
      {(unit || hint) && (
        <div className="text-[12px] text-[#64748B] mb-4 flex items-center gap-2">
          {unit && <span>单位：{unit}</span>}
          {hint && <span className="text-[#94A3B8]">· {hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return <ExportButton onClick={onClick} />;
}

type SortDir = "asc" | "desc" | null;
type SortKey =
  | "doneStart" | "doneNew" | "doneSub"
  | "soldStart" | "soldNew" | "soldSub"
  | "remainStart" | "remainNew" | "remainSub"
  | "rateStart" | "rateNew" | "rateSub";

function sortRows<T extends ProjectRow>(rows: T[], key: SortKey | null, dir: SortDir): T[] {
  if (!key || !dir) return rows;
  const get = (r: T): number | null => {
    switch (key) {
      case "doneStart": return r.doneStart;
      case "doneNew": return r.doneNew;
      case "doneSub": return r.doneStart + r.doneNew;
      case "soldStart": return r.soldStart;
      case "soldNew": return r.soldNew;
      case "soldSub": return r.soldStart + r.soldNew;
      case "remainStart": return r.doneStart - r.soldStart;
      case "remainNew": return r.doneNew - r.soldNew;
      case "remainSub": return (r.doneStart + r.doneNew) - (r.soldStart + r.soldNew);
      case "rateStart": return r.rateStart;
      case "rateNew": return r.rateNew;
      case "rateSub": {
        const ds = r.doneStart + r.doneNew;
        return ds > 0 ? (r.soldStart + r.soldNew) / ds * 100 : null;
      }
    }
  };
  return [...rows].sort((a, b) => {
    const av = get(a), bv = get(b);
    const aE = av == null || Number.isNaN(av);
    const bE = bv == null || Number.isNaN(bv);
    if (aE && bE) return 0;
    if (aE) return 1; // 空值始终排在最后
    if (bE) return -1;
    return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });
}


function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ArrowUpDown className="w-3 h-3 text-[#CBD5E1]" />;
  return dir === "asc"
    ? <ArrowUp className="w-3 h-3 text-[#3B82F6]" />
    : <ArrowDown className="w-3 h-3 text-[#3B82F6]" />;
}

function GroupedTable({
  rows,
  withIndex,
  totalRow,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: ProjectRow[];
  withIndex: boolean;
  totalRow?: SummaryRow;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const Th = ({ k, children, leftBorder }: { k: SortKey; children: React.ReactNode; leftBorder?: boolean }) => (
    <th
      onClick={() => onSort(k)}
      className={`bg-[#F1F5F9] text-[#1E293B] px-3 py-2 text-right font-semibold whitespace-nowrap cursor-pointer select-none border-b border-[#E2E8F0] ${leftBorder ? "border-l border-[#E2E8F0]" : ""}`}
    >
      <span className="inline-flex items-center gap-1 justify-end">
        {children}
        <SortIcon active={sortKey === k} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="overflow-auto rounded-lg border border-[#EEF1F6]">
      <table className="min-w-full text-[13px] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#F1F5F9] text-[#1E293B]">
            {withIndex && (
              <th rowSpan={2} className="bg-[#F1F5F9] px-3 py-2 text-center font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0]" style={{ width: 60 }}>序号</th>
            )}
            <th rowSpan={2} className="bg-[#F1F5F9] px-3 py-2 text-left font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0]" style={{ minWidth: 200 }}>
              {withIndex ? "项目名称" : "业态"}
            </th>
            <th colSpan={3} className="bg-[#F1F5F9] px-3 py-2 text-center font-semibold border-b border-r border-[#E2E8F0]">已竣未售</th>
            <th colSpan={3} className="bg-[#F1F5F9] px-3 py-2 text-center font-semibold border-b border-r border-[#E2E8F0]">本年已售</th>
            <th colSpan={3} className="bg-[#F1F5F9] px-3 py-2 text-center font-semibold border-b border-r border-[#E2E8F0]">剩余已竣未售</th>
            <th colSpan={3} className="bg-[#E8F1FF] text-[#3B82F6] px-3 py-2 text-center font-semibold border-b border-[#E2E8F0]">去化率</th>
          </tr>
          <tr className="bg-[#F1F5F9] text-[#475569]">
            <Th k="doneStart" leftBorder>年初库存</Th>
            <Th k="doneNew">本年新增</Th>
            <Th k="doneSub">小计</Th>
            <Th k="soldStart" leftBorder>年初库存</Th>
            <Th k="soldNew">本年新增</Th>
            <Th k="soldSub">小计</Th>
            <Th k="remainStart" leftBorder>年初库存</Th>
            <Th k="remainNew">本年新增</Th>
            <Th k="remainSub">小计</Th>
            <Th k="rateStart" leftBorder>年初库存</Th>
            <Th k="rateNew">本年新增</Th>
            <Th k="rateSub">小计</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const doneSub = r.doneStart + r.doneNew;
            const soldSub = r.soldStart + r.soldNew;
            const remainStart = r.doneStart - r.soldStart;
            const remainNew = r.doneNew - r.soldNew;
            const remainSub = doneSub - soldSub;
            const rateSub = doneSub > 0 ? soldSub / doneSub * 100 : 0;
            const baseBg = i % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]";
            return (
              <tr key={i} className={`${baseBg} hover:bg-[#F5F9FF] transition-colors`}>
                {withIndex && (
                  <td className={`px-3 py-2.5 text-center text-[#64748B] tabular-nums border-b border-r border-[#EEF1F6]`}>
                    {String(i + 1).padStart(2, "0")}
                  </td>
                )}
                <td className={`px-3 py-2.5 text-left text-[#1E293B] border-b border-r border-[#EEF1F6] whitespace-nowrap`}>{r.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-l border-[#EEF1F6] text-[#1E293B]">{fmt2(r.doneStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-[#EEF1F6] text-[#1E293B]">{fmt2(r.doneNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-r border-[#EEF1F6] text-[#1E293B] font-medium">{fmt2(doneSub)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-[#EEF1F6] text-[#1E293B]">{fmt2(r.soldStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-[#EEF1F6] text-[#1E293B]">{fmt2(r.soldNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-r border-[#EEF1F6] text-[#1E293B] font-medium">{fmt2(soldSub)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-l border-[#EEF1F6] text-[#1E293B]">{fmt2(remainStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-[#EEF1F6] text-[#1E293B]">{fmt2(remainNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-r border-[#EEF1F6] text-[#1E293B] font-medium">{fmt2(remainSub)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-[#EEF1F6] text-[#1E293B]">{pct2(r.rateStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-[#EEF1F6] text-[#1E293B]">{pct2(r.rateNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-b border-[#EEF1F6] text-[#3B82F6] font-medium">{pct2(rateSub)}</td>
              </tr>
            );
          })}
          {totalRow && (() => {
            const r = totalRow;
            const doneSub = r.doneStart + r.doneNew;
            const soldSub = r.soldStart + r.soldNew;
            const remainStart = r.doneStart - r.soldStart;
            const remainNew = r.doneNew - r.soldNew;
            const remainSub = doneSub - soldSub;
            const rateSub = doneSub > 0 ? soldSub / doneSub * 100 : 0;
            return (
              <tr className="bg-[#EAF2FF] text-[#1E293B] font-semibold">
                {withIndex && <td className="px-3 py-2.5 border-r border-[#DCE7F5]" />}
                <td className="px-3 py-2.5 text-left border-r border-[#DCE7F5]">{r.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-l border-[#DCE7F5]">{fmt2(r.doneStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmt2(r.doneNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-r border-[#DCE7F5]">{fmt2(doneSub)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmt2(r.soldStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmt2(r.soldNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-r border-[#DCE7F5]">{fmt2(soldSub)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-l border-[#DCE7F5]">{fmt2(remainStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmt2(remainNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums border-r border-[#DCE7F5]">{fmt2(remainSub)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#3B82F6]">{pct2(r.rateStart)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#3B82F6]">{pct2(r.rateNew)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#3B82F6]">{pct2(rateSub)}</td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}

function PagerControls({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  const list = useMemo(() => {
    const out: (number | "...")[] = [];
    if (pageCount <= 7) for (let i = 1; i <= pageCount; i++) out.push(i);
    else {
      out.push(1);
      const left = Math.max(2, page - 1);
      const right = Math.min(pageCount - 1, page + 1);
      if (left > 2) out.push("...");
      for (let i = left; i <= right; i++) out.push(i);
      if (right < pageCount - 1) out.push("...");
      out.push(pageCount);
    }
    return out;
  }, [page, pageCount]);
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] disabled:opacity-40"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      {list.map((v, i) => v === "..." ? (
        <span key={"e" + i} className="px-1 text-[#94A3B8]">…</span>
      ) : (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`min-w-[28px] h-7 px-2 rounded text-[13px] ${v === page ? "bg-[#3B82F6] text-white border border-[#3B82F6]" : "border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]"}`}
        >{v}</button>
      ))}
      <button
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] disabled:opacity-40"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function DoneUnsoldDetailDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [activeYe, setActiveYe] = useState<YeType>("住宅");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>("rateSub");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [sumSortKey, setSumSortKey] = useState<SortKey | null>("rateSub");
  const [sumSortDir, setSumSortDir] = useState<SortDir>("desc");
  const [projectKeyword, setProjectKeyword] = useState("");

  // independent legend / hover state per chart
  const [yHidden, setYHidden] = useState<Record<string, boolean>>({});
  const [yHover, setYHover] = useState<string | null>(null);
  const [mHidden, setMHidden] = useState<Record<string, boolean>>({});
  const [mHover, setMHover] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    setPage(1);
    // 切换业态 tab 时恢复默认排序：去化率小计降序
    setSortKey("rateSub");
    setSortDir("desc");
  }, [activeYe]);
  useEffect(() => { setPage(1); }, [pageSize, projectKeyword]);

  const projectsAll = useMemo(() => {
    const keyword = projectKeyword.trim().toLowerCase();
    if (!keyword) return PROJECTS[activeYe];
    return PROJECTS[activeYe].filter((row) => row.name.toLowerCase().includes(keyword));
  }, [activeYe, projectKeyword]);

  if (!open) return null;

  const onSortDetail = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir("desc"); return; }
    if (sortDir === "desc") setSortDir("asc");
    else if (sortDir === "asc") { setSortKey(null); setSortDir(null); }
    else setSortDir("desc");
  };
  const onSortSummary = (k: SortKey) => {
    if (sumSortKey !== k) { setSumSortKey(k); setSumSortDir("desc"); return; }
    if (sumSortDir === "desc") setSumSortDir("asc");
    else if (sumSortDir === "asc") { setSumSortKey(null); setSumSortDir(null); }
    else setSumSortDir("desc");
  };

  const sorted = sortRows(projectsAll, sortKey, sortDir);
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const curPage = Math.min(page, pageCount);
  const pageStart = (curPage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);

  const summarySorted = sortRows(SUMMARY as any, sumSortKey, sumSortDir) as SummaryRow[];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      <div className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div
        className="relative bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "90vw", height: "89vh", maxWidth: 1600 }}
      >
        {/* Title */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-[#EEF1F6] shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-[#E8F1FF] text-[#3B82F6] flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </span>
            <span className="text-[20px] font-semibold text-[#1E293B]">已竣未售业态分析</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-[#FAFBFD]">
          {/* 1. 不同年份业态趋势 */}
          <SectionCard title="不同年份业态趋势" unit="亿" hint="点击图例可切换显隐对应业态">
            <div style={{ height: 280 }}>
              <StackBars
                data={YEARLY}
                height={280}
                variant="grouped"
                hidden={yHidden}
                onLegendClick={(e: any) => {
                  const k = e?.dataKey ?? e?.value;
                  if (!k) return;
                  setYHidden((s) => ({ ...s, [k]: !s[k] }));
                }}
                hoverKey={yHover}
                setHoverKey={setYHover}
              />
            </div>
          </SectionCard>

          {/* 2. 2026年月度业态趋势 */}
          <SectionCard
            title="2026年月度业态趋势"
            unit="亿"
          >
            <div style={{ height: 300 }}>
              <StackBars
                data={MONTHLY}
                height={300}
                hidden={mHidden}
                onLegendClick={(e: any) => {
                  const k = e?.dataKey ?? e?.value;
                  if (!k) return;
                  setMHidden((s) => ({ ...s, [k]: !s[k] }));
                }}
                hoverKey={mHover}
                setHoverKey={setMHover}
              />
            </div>
          </SectionCard>

          {/* 3. 各业态去化追踪 */}
          <SectionCard
            title="各业态去化追踪"
            right={<ExportBtn onClick={() => toast.success("各业态去化追踪已导出")} />}
          >
            <GroupedTable
              rows={summarySorted as unknown as ProjectRow[]}
              withIndex={false}
              totalRow={SUMMARY_TOTAL}
              sortKey={sumSortKey}
              sortDir={sumSortDir}
              onSort={onSortSummary}
            />
          </SectionCard>

          {/* 4. 各业态项目明细表 */}
          <SectionCard
            title="各业态项目明细表"
            right={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                  <Input
                    value={projectKeyword}
                    onChange={(event) => setProjectKeyword(event.target.value)}
                    placeholder="搜索项目"
                    className="h-8 w-[220px] pl-8 pr-3 rounded-md border border-[#E2E8F0] bg-white text-[12px] text-[#1E293B] shadow-none placeholder:text-[#94A3B8] focus-visible:ring-1 focus-visible:ring-[#1677FF]/30 focus-visible:border-[#1677FF]"
                  />
                </div>
                <SegmentedTabs
                  value={activeYe}
                  onChange={setActiveYe}
                  items={YE_TYPES}
                  size="md"
                />
                <ExportBtn onClick={() => toast.success("各业态项目明细已导出")} />
              </div>
            }
          >
            <GroupedTable
              rows={pageRows}
              withIndex
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSortDetail}
            />

            {/* pager */}
            <div className="mt-4 flex items-center justify-between text-[13px] text-[#475569]">
              <div className="text-[#64748B]">共 <span className="text-[#1E293B] font-medium">{total}</span> 条</div>
              <div className="flex items-center gap-3">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 px-2 rounded border border-[#E2E8F0] bg-white text-[#1E293B]"
                >
                  <option value={10}>10 条 / 页</option>
                  <option value={20}>20 条 / 页</option>
                  <option value={50}>50 条 / 页</option>
                </select>
                <PagerControls page={curPage} pageCount={pageCount} onChange={setPage} />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default DoneUnsoldDetailDialog;
