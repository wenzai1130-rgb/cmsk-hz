import { ExportButton } from "@/components/ui/export-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";


import { useEffect, useMemo, useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const SELLTHROUGH_TOOLTIP = "去化周期（月）= 总未售货值 ÷ 滚动 12 个月月均销售货值\n去化周期（月）= 未售总面积 ÷ 滚动 12 个月月均销售面积";
import {
  Wallet,
  Building2,
  AlertTriangle,
  Briefcase,
  Car,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Calendar as CalendarIcon,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ComposedChart,
  Line,
  LabelList,
  Legend,
  Cell,
} from "recharts";

import { toast } from "sonner";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { OrgPicker, DayPicker, CaliberPicker, CALIBER_OPTIONS, ORG_TREE, type Caliber } from "@/components/filters/home-filters";
import { ACCENT as TOKEN_ACCENT, PROJECT_CATEGORY_COLOR } from "@/lib/tokens";
import { CityDistAllDialog, CITY_DIST_ALL, type CityDistRow } from "@/pages/Legacy2021/components/CityDistAllDialog";
import { usePageRequirements, ModuleBadge } from "@/components/requirements";

// 组织层级判断 & 城市公司项目数据生成
const CITY_GROUP_NAMES = ORG_TREE.children?.map((c) => c.name) ?? [];
const CITY_COMPANY_GROUP_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  ORG_TREE.children?.forEach((g) => g.children?.forEach((c) => (m[c] = g.name)));
  return m;
})();
export function getOrgLevel(org: string): "root" | "group" | "company" {
  if (org === ORG_TREE.name) return "root";
  if (CITY_GROUP_NAMES.includes(org)) return "group";
  return "company";
}
const PROJECT_SUFFIX = ["臻境", "天玺", "雍云府", "未来中心", "璀璨时代", "金辉里", "玖玺台", "公园 1872", "璟悦湾", "印象大观", "翡翠学府", "山海间"];
export function buildProjectsForCompany(company: string) {
  const base = company.replace("公司", "");
  const seed = company.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return PROJECT_SUFFIX.map((suf, i) => {
    const f = 1 + (Math.sin((seed + i) * 1.7) + 1) * 0.55;
    const total = +(8 + ((i * 13 + seed * 5) % 28) * f).toFixed(2);
    const seg = (k: number) => +(total * k).toFixed(2);
    return {
      name: `${base}·${suf}`,
      group: company,
      综合型大盘: seg(0.4),
      正常持销: seg(0.21),
      公商办: seg(0.15),
      滞销项目: seg(0.11),
      车位尾盘: seg(0.08),
      未分类: seg(0.05),
      total,
      period: +(12 + ((seed * 3 + i * 7) % 22)).toFixed(1),
    };
  }).sort((a, b) => b.total - a.total);
}


import { formatNumber } from "@/lib/format";
import { HierarchyTag, resolveHierarchyType } from "@/components/HierarchyTag";
const fmt = (n: number, d = 2) => formatNumber(n, { digits: d });

// 年度时间进度：截止日期在当年已过天数 / 当年总天数
function calcYearProgress(dateStr: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const start = new Date(y, 0, 1);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const totalDays = isLeap ? 366 : 365;
  return { pct: (dayOfYear / totalDays) * 100, dayOfYear, totalDays, year: y };
}

// 规则化经营判断
function buildJudgement(completionPct: number, timePct: number) {
  const diff = completionPct - timePct;
  const ahead = diff >= 0;
  const lag = Math.abs(diff);
  const diffText = ahead
    ? `较时间进度领先 ${fmt(lag)}pct`
    : `较时间进度落后 ${fmt(lag)}pct`;
  let summary: string;
  if (ahead) {
    summary = "当前年度去化进度达到或高于时间进度要求，后续重点关注年度目标缺口及重点项目去化节奏。";
  } else if (lag <= 5) {
    summary = "当前年度去化进度略低于时间进度，建议关注目标缺口较大的类型，并推动重点项目加快去化。";
  } else if (lag <= 10) {
    summary = "当前年度去化进度低于时间进度，建议按分类、城市公司和项目维度进一步拆解原因。";
  } else {
    summary = "当前年度去化进度与时间进度差距较大，建议重点关注目标缺口和项目去化执行情况。";
  }
  return { diffText, summary };
}

// 轻量 hover 提示（小问号），支持结构化 title / formula / note
function HelpTip({
  text,
  title,
  formula,
  note,
}: {
  text?: string;
  title?: string;
  formula?: string;
  note?: string;
}) {
  const structured = title || formula || note;
  return (
    <span className="relative inline-flex items-center group align-middle">
      <HelpCircle className="icon-sm text-token-disabled hover:text-token-tertiary cursor-help transition-colors" />
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-[60] hidden group-hover:block whitespace-normal w-[260px] rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[11px] leading-[16px] text-[#475569] shadow-[0_8px_22px_-8px_rgba(15,23,42,0.22)]"
      >
        {structured ? (
          <span className="block space-y-1.5">
            {title && (
              <span className="block text-[12px] font-semibold text-[#1E293B]">{title}</span>
            )}
            {formula && (
              <span className="block">
                <span className="text-[#94A3B8]">公式：</span>
                <span className="text-[#334155]">{formula}</span>
              </span>
            )}
            {note && (
              <span className="block">
                <span className="text-[#475569]">{note}</span>
              </span>
            )}
          </span>
        ) : (
          text
        )}
      </span>
    </span>
  );
}

// ============ Card ============
type Accent = { from: string; to: string; soft: string; bar: string };
// ACCENTS —— 引用全局 token (src/lib/tokens.ts)
const ACCENTS = {
  blue:   TOKEN_ACCENT.blue,
  indigo: TOKEN_ACCENT.indigo,
  rose:   TOKEN_ACCENT.rose,
  amber:  TOKEN_ACCENT.amber,
  teal:   TOKEN_ACCENT.teal,
  cyan:   TOKEN_ACCENT.cyan,
  slate:  TOKEN_ACCENT.slate,
} satisfies Record<string, Accent>;

function ProgressBar({ value, accent, size = "md" }: { value: number; accent: Accent; size?: "md" | "sm" }) {
  const w = Math.min(100, Math.max(0, value));
  const h = size === "sm" ? "h-[5px]" : "h-1.5";
  return (
    <div className={`w-full ${h} rounded-full bg-[#E5EAF3] overflow-hidden`}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${w}%`,
          background: `linear-gradient(90deg, ${accent.from}, ${accent.to})`,
        }}
      />
    </div>
  );
}

// 计算年内剩余月份数（按剩余自然天数 / 当月天数 折算）
function calcRemainingMonths(dateStr: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-11
  const day = d.getDate();
  const daysInCurMonth = new Date(y, m + 1, 0).getDate();
  const remainingInCurMonth = (daysInCurMonth - day) / daysInCurMonth;
  const fullMonthsLeft = 11 - m; // months after current month
  return Math.max(0, +(remainingInCurMonth + fullMonthsLeft).toFixed(2));
}

function PrimaryMetricCard({
  accent,
  icon,
  title,
  badge,
  mainValue,
  monthly,
  yearly,
  unitLabel = "亿",
  yearTimePct,
  remainingMonths,
  selected = false,
  onClick,
}: {
  accent: Accent;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  mainValue: number;
  monthly: { target: number; actual: number };
  yearly: { target: number; actual: number };
  unitLabel?: string;
  yearTimePct?: number;
  remainingMonths?: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  const monthPct = (monthly.actual / monthly.target) * 100;
  const yearPct = (yearly.actual / yearly.target) * 100;
  return (
    <div
      onClick={onClick}
      className={[
        "relative h-full bg-white rounded-[16px] transition-all duration-150",
        onClick ? "cursor-pointer" : "",
        selected
          ? "border border-[var(--color-brand)] shadow-[0_8px_22px_-10px_rgba(22,119,255,0.28)] ring-1 ring-[var(--color-brand)]/15"
          : "border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#C7D7EE]",
      ].join(" ")}
    >
      <div className="relative px-6 py-5 h-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* Left: 总盘核心数值 */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: accent.soft, color: accent.from }}
            >
              {icon}
            </span>
            <span className="text-[15px] font-semibold text-[#1E293B]">{title}</span>
            {badge && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F1F5FB] text-[#3B6FB5] border border-[#DBEAFE]">
                {badge}
              </span>
            )}
            <HelpTip note="剔除了退还地、股权转让、调规划、产园管理等项目属性的未售货值" />
          </div>
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="flex items-baseline gap-2">
              <span
                className="text-[48px] leading-none font-semibold tabular-nums tracking-[-0.02em]"
                style={{ color: accent.from }}
              >
                {fmt(mainValue)}
              </span>
              <span className="text-[15px] font-medium text-[#94A3B8] self-end pb-1.5">{unitLabel}</span>
            </div>
          </div>
        </div>

        {/* Middle: 月度 / 年度进度 */}
        <div className="lg:col-span-4 lg:border-l lg:border-[#EEF2F8] lg:pl-6 flex flex-col justify-center space-y-4">
          {(
            [
              { label: "月度", data: monthly, pct: monthPct },
              { label: "年度", data: yearly, pct: yearPct },
            ] as const
          ).map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="text-[#64748B]">
                  {row.label}目标
                  <span className="text-[#1E293B] tabular-nums ml-1">
                    {fmt(row.data.target)} {unitLabel}
                  </span>
                </span>
                <span className="text-[#64748B]">
                  去化
                  <span className="font-medium tabular-nums ml-1" style={{ color: accent.from }}>
                    {fmt(row.data.actual)} {unitLabel}
                  </span>
                  <span className="ml-2 tabular-nums" style={{ color: accent.from }}>
                    {fmt(row.pct)}%
                  </span>
                </span>
              </div>
              <ProgressBar value={row.pct} accent={accent} />
            </div>
          ))}
        </div>

        {/* Right: 浅背景分析区 */}
        {typeof yearTimePct === "number" && (() => {
          const monthGap = monthly.target - monthly.actual;
          const yearGap = yearly.target - yearly.actual;
          return (
            <div className="lg:col-span-5 rounded-[10px] px-4 py-3 flex flex-col bg-[#FAFCFE] border border-[#EEF3FA]">
              {/* 行1：月度缺口 + 年度缺口 */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-[11px] text-[#64748B]">月度缺口</div>
                  <div className="text-[16px] font-semibold tabular-nums text-[#1E293B] mt-0.5">
                    {monthGap <= 0 ? (
                      <>
                        已达成
                        <span className="text-[11px] text-[#64748B] font-normal ml-1">
                          {fmt(0)} {unitLabel}
                        </span>
                      </>
                    ) : (
                      <>
                        {fmt(monthGap)}
                        <span className="text-[11px] text-[#64748B] font-normal ml-1">{unitLabel}</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B]">年度缺口</div>
                  <div className="text-[16px] font-semibold tabular-nums text-[#1E293B] mt-0.5">
                    {yearGap <= 0 ? (
                      <>
                        已达成
                        <span className="text-[11px] text-[#64748B] font-normal ml-1">
                          {fmt(0)} {unitLabel}
                        </span>
                      </>
                    ) : (
                      <>
                        {fmt(yearGap)}
                        <span className="text-[11px] text-[#64748B] font-normal ml-1">{unitLabel}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* 行2：提示文案 */}
              <div className="text-[12px] leading-[18px] text-[#94A3B8] mt-auto">
                当前缺口按所选组织、口径和日期测算，仅供经营参考。
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

function SubMetricCard({
  accent,
  icon,
  title,
  mainValue,
  monthly,
  yearly,
  unitLabel = "亿",
  featured = false,
  share,
  selected = false,
  onClick,
}: {
  accent: Accent;
  icon: React.ReactNode;
  title: string;
  mainValue: number;
  monthly: { target: number; actual: number };
  yearly: { target: number; actual: number };
  unitLabel?: string;
  featured?: boolean;
  share?: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  const monthPct = (monthly.actual / monthly.target) * 100;
  const yearPct = (yearly.actual / yearly.target) * 100;
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      title={interactive ? "点击查看分类明细" : undefined}
      className={[
        "group relative h-full bg-white rounded-[12px] flex flex-col transition-all duration-150",
        interactive ? "cursor-pointer" : "",
        selected
          ? "shadow-[0_10px_26px_-12px_rgba(15,23,42,0.22)]"
          : "border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#C7D7EE] hover:shadow-[0_6px_18px_-12px_rgba(15,23,42,0.16)]",
      ].join(" ")}
      style={
        selected
          ? {
              border: `2px solid ${accent.from}`,
              background: `linear-gradient(180deg, ${accent.soft} 0%, #FFFFFF 55%)`,
            }
          : undefined
      }
    >
      {selected && (
        <>
          {/* 底部指向明细表的连接线 + 三角箭头 */}
          <span
            className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] w-[2px] h-[10px] pointer-events-none"
            style={{ background: accent.from }}
          />
          <span
            className="absolute left-1/2 -translate-x-1/2 -bottom-[14px] w-0 h-0 pointer-events-none"
            style={{
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderTop: `7px solid ${accent.from}`,
            }}
          />
        </>
      )}
      <div className="relative flex-1 flex flex-col px-4 py-3.5">
        {/* 标题行：图标 + 名称 + 占总盘 / 选中态 / hover 提示（右侧） */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: accent.soft, color: accent.from }}
          >
            {icon}
          </span>
          <span className="text-[13px] font-semibold text-[#1E293B] truncate">{title}</span>
          <span className="ml-auto relative shrink-0 h-[18px] flex items-center">
            {typeof share === "number" && (
              <span
                className={[
                  "text-[11px] text-[#64748B] tabular-nums transition-opacity duration-150",
                  interactive && !selected ? "group-hover:opacity-0" : "",
                  selected ? "opacity-0" : "",
                ].join(" ")}
              >
                占总盘 <span className="text-[#475569] font-medium">{fmt(share)}%</span>
              </span>
            )}
            {interactive && (
              <span
                className={[
                  "absolute right-0 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 text-[10.5px] px-1.5 py-0.5 rounded-md transition-opacity duration-150 whitespace-nowrap",
                  selected
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] opacity-100"
                    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)] opacity-0 group-hover:opacity-100",
                ].join(" ")}
              >
                {selected ? "已选中" : "查看明细"}
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </span>
        </div>
        {/* 主数值 */}
        <div className="flex items-baseline gap-1 mb-3">
          <span
            className="text-[26px] leading-none font-semibold tabular-nums tracking-tight"
            style={{ color: accent.from }}
          >
            {fmt(mainValue)}
          </span>
          <span className="text-[12px] text-[#94A3B8] self-end pb-0.5">{unitLabel}</span>
        </div>
        {/* 月度 / 年度 */}
        <div className="space-y-2.5 mt-auto">
          {(
            [
              { label: "月度", data: monthly, pct: monthPct },
              { label: "年度", data: yearly, pct: yearPct },
            ] as const
          ).map((row) => {
            const isMonthly = row.label === "月度";
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#64748B] tabular-nums">
                    {isMonthly ? "月度实际" : `${row.label}目标 ${fmt(row.data.target)}${unitLabel}`}
                  </span>
                  <span className="text-[#64748B]">
                    <span className="tabular-nums">签约 </span>
                    <span className="font-medium tabular-nums" style={{ color: accent.from }}>
                      {fmt(row.data.actual)}{unitLabel}
                    </span>
                    {!isMonthly && (
                      <span className="ml-1.5 tabular-nums" style={{ color: accent.from }}>
                        {fmt(row.pct)}%
                      </span>
                    )}
                  </span>
                </div>
                {!isMonthly && <ProgressBar value={row.pct} accent={accent} size="sm" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ Detail table data ============
type DetailRow = {
  group: string;
  category: string;
  startInv: number;
  m: { target: number; signed: number; units: number };
  y: { target: number; signed: number; units: number };
  visits: { newV: number; reV: number };
};

const DETAIL_BY_TAB: Record<string, DetailRow[]> = {
  城市群: [
    { group: "南部城市群", category: "综合型大盘", startInv: 132.5, m: { target: 14.0, signed: 12.85, units: 142 }, y: { target: 168.0, signed: 38.5, units: 412 }, visits: { newV: 2840, reV: 1680 } },
    { group: "北部城市群", category: "综合型大盘", startInv: 88.4, m: { target: 9.5, signed: 8.92, units: 98 }, y: { target: 114.0, signed: 26.7, units: 282 }, visits: { newV: 2120, reV: 1320 } },
    { group: "东部城市群", category: "综合型大盘", startInv: 156.2, m: { target: 16.5, signed: 14.2, units: 168 }, y: { target: 198.0, signed: 42.3, units: 478 }, visits: { newV: 3320, reV: 2010 } },
    { group: "西部城市群", category: "综合型大盘", startInv: 64.3, m: { target: 7.0, signed: 5.85, units: 72 }, y: { target: 84.0, signed: 18.4, units: 198 }, visits: { newV: 1480, reV: 920 } },
  ],
  城市公司: [
    { group: "上海公司", category: "综合型大盘", startInv: 88.5, m: { target: 9.0, signed: 8.85, units: 92 }, y: { target: 108.0, signed: 26.5, units: 280 }, visits: { newV: 1820, reV: 1060 } },
    { group: "深圳公司", category: "综合型大盘", startInv: 76.4, m: { target: 8.0, signed: 7.42, units: 78 }, y: { target: 96.0, signed: 23.1, units: 246 }, visits: { newV: 1560, reV: 980 } },
    { group: "北京公司", category: "综合型大盘", startInv: 64.2, m: { target: 7.0, signed: 6.32, units: 68 }, y: { target: 84.0, signed: 18.9, units: 208 }, visits: { newV: 1320, reV: 820 } },
    { group: "广州公司", category: "综合型大盘", startInv: 52.3, m: { target: 5.5, signed: 4.95, units: 56 }, y: { target: 66.0, signed: 14.8, units: 162 }, visits: { newV: 1080, reV: 620 } },
    { group: "天津公司", category: "综合型大盘", startInv: 38.1, m: { target: 4.0, signed: 3.62, units: 42 }, y: { target: 48.0, signed: 11.2, units: 124 }, visits: { newV: 820, reV: 480 } },
  ],
  项目: [
    { group: "上海·招商雍景湾", category: "综合型大盘", startInv: 38.6, m: { target: 4.0, signed: 3.85, units: 42 }, y: { target: 48.0, signed: 12.1, units: 128 }, visits: { newV: 820, reV: 510 } },
    { group: "深圳·招商蛇口湾", category: "综合型大盘", startInv: 32.4, m: { target: 3.5, signed: 3.42, units: 36 }, y: { target: 42.0, signed: 10.4, units: 112 }, visits: { newV: 720, reV: 460 } },
    { group: "北京·招商臻境", category: "正常持销", startInv: 26.8, m: { target: 2.8, signed: 2.65, units: 28 }, y: { target: 33.6, signed: 8.2, units: 96 }, visits: { newV: 580, reV: 340 } },
    { group: "广州·招商东湾", category: "公商办", startInv: 22.5, m: { target: 2.4, signed: 2.18, units: 24 }, y: { target: 28.8, signed: 6.85, units: 78 }, visits: { newV: 480, reV: 260 } },
  ],
  楼栋: [
    { group: "上海·雍景湾·1#", category: "综合型大盘", startInv: 8.6, m: { target: 0.9, signed: 0.85, units: 10 }, y: { target: 10.8, signed: 2.7, units: 32 }, visits: { newV: 220, reV: 140 } },
    { group: "上海·雍景湾·2#", category: "综合型大盘", startInv: 7.8, m: { target: 0.8, signed: 0.78, units: 9 }, y: { target: 9.6, signed: 2.4, units: 28 }, visits: { newV: 200, reV: 120 } },
    { group: "深圳·蛇口湾·A1", category: "综合型大盘", startInv: 6.5, m: { target: 0.7, signed: 0.68, units: 8 }, y: { target: 8.4, signed: 2.1, units: 24 }, visits: { newV: 180, reV: 110 } },
    { group: "深圳·蛇口湾·A2", category: "综合型大盘", startInv: 6.2, m: { target: 0.65, signed: 0.62, units: 7 }, y: { target: 7.8, signed: 1.95, units: 22 }, visits: { newV: 170, reV: 100 } },
  ],
};

// ============ Charts data ============
const CITY_DIST = [
  { name: "上海公司", 综合型大盘: 88.5, 正常持销: 22.4, 公商办: 18.6, 滞销项目: 14.5, 车位尾盘: 6.2, 未分类: 4.8, total: 155.0, period: 18.5 },
  { name: "深圳公司", 综合型大盘: 76.4, 正常持销: 20.1, 公商办: 16.4, 滞销项目: 12.8, 车位尾盘: 5.6, 未分类: 4.2, total: 135.5, period: 19.8 },
  { name: "北京公司", 综合型大盘: 64.2, 正常持销: 17.5, 公商办: 14.2, 滞销项目: 10.4, 车位尾盘: 4.8, 未分类: 3.6, total: 114.7, period: 22.4 },
  { name: "广州公司", 综合型大盘: 52.3, 正常持销: 14.6, 公商办: 11.5, 滞销项目: 8.6, 车位尾盘: 3.8, 未分类: 3.0, total: 93.8, period: 24.6 },
  { name: "天津公司", 综合型大盘: 38.1, 正常持销: 10.8, 公商办: 8.4, 滞销项目: 6.2, 车位尾盘: 2.6, 未分类: 2.2, total: 68.3, period: 26.8 },
];
const CITY_COLORS: Record<string, string> = {
  综合型大盘: "#2F7BF6",
  正常持销: "#38C2B0",
  公商办: "#8A63F6",
  滞销项目: "#F59E0B",
  车位尾盘: "#94A3B8",
  未分类: "#CBD5E1",
};

// 滚动12个月：以传入的(年,月)为最后一个月
function buildTrendData(endYear: number, endMonth: number) {
  // 36 months of base data (older first), 2024-01 ~ 2026-12
  const base = [
    // 2024
    7.6, 6.2, 8.8, 10.4, 11.6, 12.7, 10.6, 9.9, 11.5, 13.2, 12.6, 14.7,
    // 2025
    8.2, 6.5, 9.4, 11.2, 12.6, 13.8, 11.5, 10.8, 12.4, 14.2, 13.6, 15.8,
    // 2026
    9.1, 7.3, 10.6, 12.5, 14.1, 15.4, 12.9, 12.1, 13.9, 15.9, 15.2, 17.6,
  ];
  const lastIdx = (endYear - 2024) * 12 + (endMonth - 1);
  const startIdx = lastIdx - 11;
  const arr: { m: string; signed: number; yoy: number; growth: number }[] = [];
  for (let i = startIdx; i <= lastIdx; i++) {
    const safeI = Math.max(0, Math.min(base.length - 1, i));
    const safePrev = Math.max(0, Math.min(base.length - 1, i - 12));
    const y = 2024 + Math.floor(safeI / 12);
    const mo = (safeI % 12) + 1;
    const signed = base[safeI];
    const yoy = base[safePrev];
    const growth = yoy === 0 ? 0 : +(((signed - yoy) / yoy) * 100).toFixed(2);
    arr.push({
      m: `${String(y).slice(2)}/${String(mo).padStart(2, "0")}`,
      signed: +signed.toFixed(2),
      yoy: +yoy.toFixed(2),
      growth,
    });
  }
  return arr;
}

const TOP_PROJECTS: { name: string; value: number }[] = [
  { name: "成都天府总部基地项目", value: 31.7 },
  { name: "南京越城天地", value: 29.4 },
  { name: "深圳大空港配套", value: 28.6 },
  { name: "武汉未来中心", value: 27.8 },
  { name: "深圳前海妈湾", value: 26.2 },
  { name: "天津江山玺", value: 25.3 },
  { name: "重庆长嘉汇", value: 24.2 },
  { name: "上海弘安里", value: 20.3 },
  { name: "重庆渝天府", value: 18.9 },
  { name: "北京龙樾合玺", value: 16.8 },
  { name: "南通滨江项目", value: 15.6 },
  { name: "长春公园 1872", value: 14.9 },
  { name: "中山臻湾府", value: 14.2 },
  { name: "3-8 商墅", value: 13.8 },
  { name: "深圳太子湾望海大厦", value: 13.1 },
  { name: "南京招商局中心·臻境", value: 12.6 },
  { name: "深圳望海玥家园", value: 12.1 },
  { name: "深圳太子湾瑞玺大厦", value: 11.8 },
  { name: "合肥璟悦湾（奥体北）", value: 11.2 },
  { name: "深圳太子湾泓玺大厦", value: 10.9 },
  { name: "漳州卡达凯斯", value: 10.4 },
  { name: "北京招商臻园", value: 9.8 },
  { name: "厦门湾湖臻境", value: 9.3 },
  { name: "北京璀璨时代", value: 8.9 },
  { name: "深圳雍云府", value: 8.4 },
];

const KEY_PROJECTS = [
  { name: "成都天府总部基地项目【天府地块】", company: "成都", category: "综合型大盘", target: 4.0, actual: 3.85, units: 45, visits: 920, period: 12.8, commandUrl: "https://example.com/command-order/project-001" },
  { name: "南京越城天地【G98】", company: "南京", category: "公商办", target: 3.8, actual: 3.42, units: 36, visits: 720, period: 16.2, commandUrl: "https://example.com/command-order/project-002" },
  { name: "深圳大空港配套【配套部分】", company: "深圳", category: "综合型大盘", target: 3.5, actual: 3.45, units: 42, visits: 820, period: 14.2, commandUrl: "https://example.com/command-order/project-003" },
  { name: "武汉未来中心", company: "武汉", category: "正常持销", target: 3.6, actual: 3.20, units: 34, visits: 680, period: 13.7, commandUrl: "https://example.com/command-order/project-004" },
  { name: "深圳前海妈湾【15单元02街坊】", company: "深圳", category: "滞销项目", target: 3.2, actual: 2.48, units: 28, visits: 560, period: 20.1, commandUrl: "https://example.com/command-order/project-005" },
  { name: "天津江山玺【天拖地块】", company: "天津", category: "车位/尾盘", target: 2.9, actual: 2.61, units: 33, visits: 510, period: 11.9, commandUrl: "https://example.com/command-order/project-006" },
  { name: "重庆长嘉汇【长嘉汇地块】", company: "重庆", category: "综合型大盘", target: 3.1, actual: 2.95, units: 39, visits: 700, period: 13.4, commandUrl: "https://example.com/command-order/project-007" },
  { name: "上海弘安里【虹口17街坊】", company: "上海", category: "综合型大盘", target: 3.2, actual: 3.05, units: 38, visits: 760, period: 15.4, commandUrl: "https://example.com/command-order/project-008" },
  { name: "重庆渝天府", company: "重庆", category: "正常持销", target: 2.6, actual: 2.22, units: 26, visits: 480, period: 17.3, commandUrl: "https://example.com/command-order/project-009" },
  { name: "北京龙樾合玺【朝阳崔各庄】", company: "北京", category: "正常持销", target: 2.4, actual: 2.05, units: 24, visits: 460, period: 18.0, commandUrl: "https://example.com/command-order/project-010" },
  { name: "南通滨江项目", company: "南通", category: "综合型大盘", target: 2.3, actual: 2.10, units: 27, visits: 520, period: 15.1, commandUrl: "https://example.com/command-order/project-011" },
  { name: "长春公园1872【长春净月7号】", company: "长春", category: "正常持销", target: 2.2, actual: 1.95, units: 25, visits: 440, period: 16.4, commandUrl: "https://example.com/command-order/project-012" },
  { name: "中山臻湾府【翠亨新区地块】", company: "中山", category: "滞销项目", target: 2.1, actual: 1.62, units: 22, visits: 410, period: 22.6, commandUrl: "https://example.com/command-order/project-013" },
  { name: "深圳招商玺家园【DY0308】-三期", company: "深圳", category: "综合型大盘", target: 2.0, actual: 1.78, units: 23, visits: 430, period: 19.2, commandUrl: "https://example.com/command-order/project-014" },
  { name: "深圳太子湾望海大厦【DY0305】", company: "深圳", category: "正常持销", target: 1.9, actual: 1.72, units: 21, visits: 390, period: 17.8, commandUrl: "https://example.com/command-order/project-015" },
  { name: "南京招商局中心·臻境【G24】", company: "南京", category: "公商办", target: 1.8, actual: 1.55, units: 19, visits: 360, period: 18.5, commandUrl: "https://example.com/command-order/project-016" },
  { name: "深圳望海玥家园【渔二村】", company: "深圳", category: "综合型大盘", target: 1.7, actual: 1.48, units: 18, visits: 340, period: 19.0, commandUrl: "https://example.com/command-order/project-017" },
  { name: "深圳太子湾瑞玺大厦【DY0307】", company: "深圳", category: "正常持销", target: 1.7, actual: 1.42, units: 18, visits: 320, period: 21.4, commandUrl: "https://example.com/command-order/project-018" },
  { name: "合肥璟悦湾(奥体北)【XZ202112】", company: "合肥", category: "正常持销", target: 1.6, actual: 1.38, units: 17, visits: 310, period: 18.9, commandUrl: "https://example.com/command-order/project-019" },
  { name: "深圳太子湾泓玺大厦【DY0304】", company: "深圳", category: "公商办", target: 1.5, actual: 1.32, units: 16, visits: 290, period: 17.6, commandUrl: "https://example.com/command-order/project-020" },
  { name: "漳州卡达凯斯【2008B6B7B8B9】", company: "漳州", category: "正常持销", target: 1.5, actual: 1.28, units: 15, visits: 280, period: 18.2, commandUrl: "https://example.com/command-order/project-021" },
  { name: "北京招商臻园【羊坊020地块】", company: "北京", category: "综合型大盘", target: 1.4, actual: 1.20, units: 14, visits: 270, period: 20.8, commandUrl: "https://example.com/command-order/project-022" },
  { name: "厦门湾湖臻境【西潘B05】", company: "厦门", category: "正常持销", target: 1.4, actual: 1.15, units: 14, visits: 260, period: 21.0, commandUrl: "https://example.com/command-order/project-023" },
  { name: "北京璀璨时代【台湖0032】", company: "北京", category: "滞销项目", target: 1.3, actual: 1.05, units: 13, visits: 240, period: 23.4, commandUrl: "https://example.com/command-order/project-024" },
  { name: "深圳雍云府【九龙山】", company: "深圳", category: "车位/尾盘", target: 1.3, actual: 1.02, units: 13, visits: 230, period: 19.6, commandUrl: "https://example.com/command-order/project-025" },
];

// ============ Tooltip helpers ============
const tipShell: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  boxShadow: "0 6px 20px -8px rgba(15,23,42,0.18)",
  padding: "10px 12px",
  color: "#1E293B",
  fontSize: 12,
};

// ============ Tree (master-sub) detail data ============
type Bldg = {
  group: string; company: string; city: string; project: string; building: string;
  category: string; unsold: number;
  mT: number; mS: number; mU: number;
  yT: number; yS: number; yU: number;
  newV: number; reV: number;
  period: number;
};
const BUILDINGS_SEED: Bldg[] = (() => {
  const seed: { group: string; company: string; city: string; project: string; category: string; unsold: number; period: number }[] = [
    { group: "东部城市群", company: "上海公司", city: "上海", project: "上海·招商雍景湾", category: "综合型大盘", unsold: 88, period: 14 },
    { group: "东部城市群", company: "上海公司", city: "上海", project: "上海·臻湾府",     category: "正常持销",   unsold: 28, period: 16 },
    { group: "东部城市群", company: "苏州公司", city: "苏州", project: "苏州·云澜府",     category: "综合型大盘", unsold: 42, period: 15 },
    { group: "南部城市群", company: "深圳公司", city: "深圳", project: "深圳·招商蛇口湾", category: "综合型大盘", unsold: 76, period: 13 },
    { group: "南部城市群", company: "深圳公司", city: "深圳", project: "深圳·雍云府",     category: "公商办",     unsold: 38, period: 18 },
    { group: "南部城市群", company: "广州公司", city: "广州", project: "广州·东湾",       category: "滞销项目",   unsold: 52, period: 24 },
    { group: "南部城市群", company: "广州公司", city: "广州", project: "广州·天河项目",   category: "滞销项目",   unsold: 28, period: 22 },
    { group: "南部城市群", company: "佛山公司", city: "佛山", project: "佛山·湖景湾",     category: "车位 / 尾盘", unsold: 22, period: 28 },
    { group: "北部城市群", company: "北京公司", city: "北京", project: "北京·招商臻园",   category: "综合型大盘", unsold: 64, period: 14 },
    { group: "北部城市群", company: "北京公司", city: "北京", project: "北京·朝阳办公",   category: "公商办",     unsold: 30, period: 19 },
    { group: "北部城市群", company: "天津公司", city: "天津", project: "天津·海河项目",   category: "滞销项目",   unsold: 38, period: 23 },
    { group: "西部城市群", company: "成都公司", city: "成都", project: "成都·锦江项目",   category: "正常持销",   unsold: 26, period: 17 },
    { group: "西部城市群", company: "重庆公司", city: "重庆", project: "重庆·中央公园",   category: "综合型大盘", unsold: 34, period: 19 },
    { group: "西部城市群", company: "重庆公司", city: "重庆", project: "重庆·尾盘车位",   category: "车位 / 尾盘", unsold: 18, period: 30 },
  ];
  const list: Bldg[] = [];
  for (const p of seed) {
    const splits = [0.6, 0.4];
    splits.forEach((sp, idx) => {
      const u = +(p.unsold * sp).toFixed(2);
      const mT = +(u * 0.012).toFixed(2);
      const achieveM = 0.6 + ((p.project.length + idx) % 5) * 0.12;
      const mS = +(mT * achieveM).toFixed(2);
      const yT = +(u * 0.18).toFixed(2);
      const achieveY = 0.18 + ((p.project.length + idx) % 7) * 0.04;
      const yS = +(yT * achieveY).toFixed(2);
      // 套数：按签约金额折算（亿 → 套，约 1 亿 ≈ 10 套）
      const mU = Math.max(1, Math.round(mS * 10));
      const yU = Math.max(1, Math.round(yS * 10));
      // 到访：按月度目标体量折算
      const newV = Math.round(mT * 90 + ((p.project.length + idx * 7) % 13) * 8);
      const reV = Math.round(mT * 55 + ((p.project.length + idx * 5) % 11) * 6);
      list.push({
        group: p.group,
        company: p.company,
        city: p.city,
        project: p.project,
        building: `${idx + 1}#楼`,
        category: p.category,
        unsold: u,
        mT, mS, mU, yT, yS, yU,
        newV, reV,
        period: +(p.period + (idx === 0 ? 0 : 1.2)).toFixed(1),
      });
    });
  }
  return list;
})();

type TreeNode = {
  id: string;
  name: string;
  level: "城市群" | "城市公司" | "城市" | "项目" | "楼栋";
  category?: string;
  unsold: number;
  mT: number; mS: number; mU: number;
  yT: number; yS: number; yU: number;
  newV: number; reV: number;
  period: number;
  childCount?: number;
  children?: TreeNode[];
};

function aggregate(items: Bldg[]) {
  if (!items.length) return { unsold: 0, mT: 0, mS: 0, mU: 0, yT: 0, yS: 0, yU: 0, newV: 0, reV: 0, period: 0 };
  let unsold = 0, mT = 0, mS = 0, mU = 0, yT = 0, yS = 0, yU = 0, newV = 0, reV = 0, periodSum = 0;
  for (const b of items) {
    unsold += b.unsold; mT += b.mT; mS += b.mS; mU += b.mU;
    yT += b.yT; yS += b.yS; yU += b.yU;
    newV += b.newV; reV += b.reV;
    periodSum += b.period * b.unsold;
  }
  return {
    unsold: +unsold.toFixed(2),
    mT: +mT.toFixed(2), mS: +mS.toFixed(2), mU,
    yT: +yT.toFixed(2), yS: +yS.toFixed(2), yU,
    newV, reV,
    period: unsold > 0 ? +(periodSum / unsold).toFixed(1) : 0,
  };
}

function uniqCategories(items: Bldg[]) {
  const s = new Set(items.map((b) => b.category));
  if (s.size === 1) return [...s][0];
  return "综合";
}

function buildTree(buildings: Bldg[]): TreeNode[] {
  const groups = new Map<string, Bldg[]>();
  for (const b of buildings) {
    if (!groups.has(b.group)) groups.set(b.group, []);
    groups.get(b.group)!.push(b);
  }
  const result: TreeNode[] = [];
  for (const [gName, gItems] of groups) {
    const companies = new Map<string, Bldg[]>();
    for (const b of gItems) {
      if (!companies.has(b.company)) companies.set(b.company, []);
      companies.get(b.company)!.push(b);
    }
    const cChildren: TreeNode[] = [];
    for (const [cName, cItems] of companies) {
      const cities = new Map<string, Bldg[]>();
      for (const b of cItems) {
        if (!cities.has(b.city)) cities.set(b.city, []);
        cities.get(b.city)!.push(b);
      }
      const cityChildren: TreeNode[] = [];
      for (const [cityName, cityItems] of cities) {
        const projects = new Map<string, Bldg[]>();
        for (const b of cityItems) {
          if (!projects.has(b.project)) projects.set(b.project, []);
          projects.get(b.project)!.push(b);
        }
        const pChildren: TreeNode[] = [];
        for (const [pName, pItems] of projects) {
          const bChildren: TreeNode[] = pItems.map((b) => ({
            id: `${b.group}|${b.company}|${b.city}|${b.project}|${b.building}`,
            name: b.building,
            level: "楼栋",
            category: b.category,
            unsold: b.unsold, mT: b.mT, mS: b.mS, mU: b.mU, yT: b.yT, yS: b.yS, yU: b.yU,
            newV: b.newV, reV: b.reV,
            period: b.period,
          }));
          const ag = aggregate(pItems);
          pChildren.push({
            id: `${gName}|${cName}|${cityName}|${pName}`,
            name: pName,
            level: "项目",
            category: uniqCategories(pItems),
            ...ag,
            childCount: bChildren.length,
            children: bChildren,
          });
        }
        const ag = aggregate(cityItems);
        cityChildren.push({
          id: `${gName}|${cName}|${cityName}`,
          name: cityName,
          level: "城市",
          category: uniqCategories(cityItems),
          ...ag,
          childCount: pChildren.length,
          children: pChildren,
        });
      }
      const ag = aggregate(cItems);
      cChildren.push({
        id: `${gName}|${cName}`,
        name: cName,
        level: "城市公司",
        category: uniqCategories(cItems),
        ...ag,
        childCount: cityChildren.length,
        children: cityChildren,
      });
    }
    const ag = aggregate(gItems);
    result.push({
      id: gName,
      name: gName,
      level: "城市群",
      category: uniqCategories(gItems),
      ...ag,
      childCount: cChildren.length,
      children: cChildren,
    });
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => b.unsold - a.unsold);
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(result);
  return result;
}

// 搜索：找到任一节点匹配后，连同其祖先链展开
function filterTree(nodes: TreeNode[], q: string): { tree: TreeNode[]; expandIds: Set<string> } {
  const expandIds = new Set<string>();
  const lowerQ = q.toLowerCase();
  // 收集节点及其所有后代的 id，用于自匹配时整棵子树展开
  const collectExpand = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.children && n.children.length) {
        expandIds.add(n.id);
        collectExpand(n.children);
      }
    }
  };
  const walk = (list: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = [];
    for (const n of list) {
      const selfMatch = n.name.toLowerCase().includes(lowerQ);
      if (selfMatch) {
        // 自身命中：保留完整子树，并展开整条链
        out.push({ ...n });
        if (n.children && n.children.length) {
          expandIds.add(n.id);
          collectExpand(n.children);
        }
        continue;
      }
      const childRes = n.children ? walk(n.children) : [];
      if (childRes.length) {
        out.push({ ...n, children: childRes });
        expandIds.add(n.id);
      }
    }
    return out;
  };
  return { tree: walk(nodes), expandIds };
}

// ============ Page ============
function LegacyPage() {
  usePageRequirements("21年及之前", [
    {
      code: "REQ-01",
      moduleId: "city-value-distribution",
      title: "各城市公司货值分布",
      desc: [
        '【展示内容】按总未售货值降序展示 TOP5 城市公司；每行以横向堆叠条按"综合型大盘 / 正常持销 / 公商办 / 滞销项目 / 车位尾盘 / 未分类"六类分段展示未售货值结构，条形长度与最大总未售货值成比例；表头列包含：排名、城市公司（或项目）、货值结构、总未售货值(亿/万㎡)、去化周期。当组织下钻到城市公司时，标题切换为"{公司} · 项目货值分布"并以单色条展示项目 TOP5。',
        '【交互规则】"总未售货值"和"去化周期"列表头带排序箭头图标，点击可切换升 / 降序，再次点击同一列则反转方向，切换列时总未售货值默认降序、去化周期默认升序；鼠标悬停条形展示浮层，明细列出各类别未售货值与占比、总未售货值合计、去化周期；点击右上角"查看全部"打开全量弹窗，弹窗内通过表头排序箭头切换总未售货值 / 去化周期排序，并支持按城市群筛选与搜索。',
        '【数据规则】总未售货值 = 综合型大盘 + 正常持销 + 公商办 + 滞销项目 + 车位尾盘 + 未分类；跟随顶部口径（全口径 / 权益）与指标（金额 / 面积）联动，金额单位"亿"，面积单位"万㎡"，均保留 2 位小数；未分类：暂未归入以上五类的未售货值；去化周期（月）= 当前未售规模 ÷ 近12个月月均去化规模。',
        '【边界处理】某类别数值为 0 时该分段不展示；总未售货值为 0 时行内条形置空；去化周期无法计算时展示为"--"；筛选结果为空时展示"暂无匹配数据"。',
      ].join("\n"),
    },
  ]);
  const [org, setOrg] = useState("招商蛇口");
  const [date, setDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [unit, setUnit] = useState<"amount" | "area">("amount");
  const [caliber, setCaliber] = useState<Caliber>("equity");
  const calFactor = CALIBER_OPTIONS.find((c) => c.key === caliber)!.factor;
  const [tab, setTab] = useState<"城市群" | "城市公司" | "项目" | "楼栋">("城市群");
  const [search, setSearch] = useState("");
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [trendTab, setTrendTab] = useState("全部");
  const [keyMode, setKeyMode] = useState<"month" | "year">("month");
  const [cityDistAllOpen, setCityDistAllOpen] = useState(false);
  const [cityDistSortKey, setCityDistSortKey] = useState<"total" | "period">("total");
  const [cityDistSortDir, setCityDistSortDir] = useState<"asc" | "desc">("desc");
  const toggleCityDistSort = (key: "total" | "period") => {
    if (cityDistSortKey === key) {
      setCityDistSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setCityDistSortKey(key);
      setCityDistSortDir(key === "period" ? "asc" : "desc");
    }
  };
  type KeySortKey = "target" | "actual" | "units" | "rate" | "visits" | "period" | "category";
  const [keySortKey, setKeySortKey] = useState<KeySortKey>("actual");
  const [keySortDir, setKeySortDir] = useState<"asc" | "desc">("desc");
  // 切换 月度/年度 时恢复默认排序（按签约金额降序）
  useEffect(() => { setKeySortKey("actual"); setKeySortDir("desc"); }, [keyMode]);
  const [categoryDetailOpen, setCategoryDetailOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = DETAIL_BY_TAB[tab] ?? [];
    if (!search) return list;
    return list.filter((r) => r.group.includes(search) || r.category.includes(search));
  }, [tab, search]);

  const trendTabs = ["全部", "综合型大盘", "滞销项目", "公商办", "正常持销", "车位/尾盘"];
  const trendFactor: Record<string, number> = {
    全部: 1,
    综合型大盘: 0.62,
    滞销项目: 0.18,
    公商办: 0.22,
    正常持销: 0.34,
    "车位/尾盘": 0.12,
  };
  const trendData = useMemo(() => {
    const f = trendFactor[trendTab] ?? 1;
    // parse selected date "YYYY-MM-DD"
    const [yStr, mStr] = (date || "2026-05-01").split("-");
    const ey = parseInt(yStr, 10) || 2026;
    const em = parseInt(mStr, 10) || 5;
    const base = buildTrendData(ey, em);
    return base.map((d) => {
      const signed = +(d.signed * f).toFixed(2);
      const yoy = +(d.yoy * f).toFixed(2);
      const growth = yoy === 0 ? 0 : +(((signed - yoy) / yoy) * 100).toFixed(2);
      return { ...d, signed, yoy, growth };
    });
  }, [trendTab, date]);

  // unit conversion: amount(亿) | area(万㎡)
  const unitFactor = (unit === "amount" ? 1 : 0.6) * calFactor;
  const unitLabel = unit === "amount" ? "亿" : "万㎡";
  const u = (n: number) => +(n * unitFactor).toFixed(2);

  // ===== 顶部模块派生数据 =====
  const TOTAL_BASE = 600;
  const PRIMARY = {
    monthly: { target: 50.0, actual: 42.5 },
    yearly: { target: 150.0, actual: 45.2 },
  };
  const CATEGORIES = [
    { key: "综合型大盘", accent: PROJECT_CATEGORY_COLOR["综合型大盘"],   base: 240, m: { target: 6.0, actual: 5.1 }, y: { target: 72.0, actual: 25.0 } },
    { key: "滞销项目",   accent: PROJECT_CATEGORY_COLOR["滞销项目"],     base: 150, m: { target: 4.0, actual: 2.0 }, y: { target: 48.0, actual: 11.5 } },
    { key: "公商办",     accent: PROJECT_CATEGORY_COLOR["公商办"],       base: 90,  m: { target: 4.0, actual: 2.0 }, y: { target: 48.0, actual: 11.5 } },
    { key: "正常持销",   accent: PROJECT_CATEGORY_COLOR["正常持销"],     base: 72,  m: { target: 2.0, actual: 2.4 }, y: { target: 24.0, actual: 12.0 } },
    { key: "车位 / 尾盘", accent: PROJECT_CATEGORY_COLOR["车位 / 尾盘"], base: 48,  m: { target: 1.0, actual: 1.65 }, y: { target: 12.0, actual: 6.6 } },
  ] as const;
  const yearProg = useMemo(() => calcYearProgress(date), [date]);

  const handleCategoryClick = (key: string) => {
    if (categoryDetailOpen && selectedCategory === key) {
      setCategoryDetailOpen(false);
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory(key);
    setCategoryDetailOpen(true);
  };
  const handlePrimaryClick = () => {
    if (categoryDetailOpen && selectedCategory === null) {
      setCategoryDetailOpen(false);
      return;
    }
    setSelectedCategory(null);
    setCategoryDetailOpen(true);
  };

  // ===== 明细树（master-sub） =====
  const filteredBuildings = useMemo(() => {
    if (!selectedCategory) return BUILDINGS_SEED;
    return BUILDINGS_SEED.filter((b) => b.category === selectedCategory);
  }, [selectedCategory]);
  const baseTree = useMemo(() => buildTree(filteredBuildings), [filteredBuildings]);
  const { tree: visibleTree, expandIds: searchExpandIds } = useMemo(
    () => (search ? filterTree(baseTree, search) : { tree: baseTree, expandIds: new Set<string>() }),
    [baseTree, search],
  );
  const totalUnsoldForRange = useMemo(
    () => filteredBuildings.reduce((s, b) => s + b.unsold, 0),
    [filteredBuildings],
  );
  const remainingMonths = useMemo(() => calcRemainingMonths(date), [date]);
  const detailTitle = selectedCategory ? `${selectedCategory}明细` : "总体明细";
  const detailScopeLabel = selectedCategory ? `当前查看：${selectedCategory}` : "当前查看：总体明细";
  const selectedAccent = selectedCategory
    ? CATEGORIES.find((c) => c.key === selectedCategory)?.accent
    : undefined;

  // 展开节点（手动 + 搜索命中）
  const [manualExpand, setManualExpand] = useState<Set<string>>(new Set());
  const expandedIds = useMemo(() => {
    const s = new Set<string>(manualExpand);
    searchExpandIds.forEach((id) => s.add(id));
    return s;
  }, [manualExpand, searchExpandIds]);
  const toggleNode = (id: string) => {
    setManualExpand((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportDetail = () => {
    const lines: string[] = [];
    lines.push(`筛选条件: 截止 ${date} / ${unit === "amount" ? "金额" : "面积"}`);
    lines.push(`当前分类: ${selectedCategory ?? "总体"}`);
    if (search) lines.push(`搜索关键字: ${search}`);
    lines.push("");
    lines.push(["层级路径", "层级", "名称", "项目类别", `年初库存(${unitLabel})`, "月度签约金额", "月度-套数", "年度-目标", "年度累计签约金额", "年度-套数", "年度-完成率%", "本月新访", "本月复访", "去化周期(月)"].join(","));
    const walk = (nodes: TreeNode[], path: string) => {
      for (const n of nodes) {
        const yPct = n.yT > 0 ? (n.yS / n.yT) * 100 : 0;
        lines.push([path, n.level, n.name, n.category ?? "", fmt(u(n.unsold)), fmt(u(n.mS)), n.mU, fmt(u(n.yT)), fmt(u(n.yS)), n.yU, fmt(yPct), n.newV, n.reV, fmt(n.period)].join(","));
        if (n.children) walk(n.children, path ? `${path} / ${n.name}` : n.name);
      }
    };
    walk(visibleTree, "");
    toast.success(`已导出 ${detailTitle}（${lines.length - 5} 行）`);
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F8FB]">
      <HeaderNav active="21年及之前" />

      {/* Filter bar */}
      <div className="sticky top-16 z-30 h-14 bg-white border-b border-[#E2E8F0] flex items-center px-6 gap-3">
        <OrgPicker value={org} onChange={setOrg} />
        <CaliberPicker value={caliber} onChange={setCaliber} />
        <DayPicker value={date} onChange={setDate} />
        <SegmentedTabs
          className="ml-auto"
          size="md"
          value={unit}
          onChange={setUnit}
          items={[
            { value: "amount", label: "金额" },
            { value: "area", label: "面积" },
          ] as const}
        />

      </div>

      <main className="px-6 py-5 space-y-5">
        {/* ============ Core metrics ============ */}
        <section className="space-y-4">
          {/* 上：总盘总览卡（横向占满） */}
          <PrimaryMetricCard
            accent={ACCENTS.blue}
            icon={<Wallet className="w-4 h-4" />}
            title="未售货值"
            badge="21年及之前拿地"
            mainValue={u(TOTAL_BASE)}
            monthly={{ target: u(PRIMARY.monthly.target), actual: u(PRIMARY.monthly.actual) }}
            yearly={{ target: u(PRIMARY.yearly.target), actual: u(PRIMARY.yearly.actual) }}
            unitLabel={unitLabel}
            yearTimePct={yearProg.pct}
            remainingMonths={remainingMonths}
            selected={categoryDetailOpen && selectedCategory === null}
            onClick={handlePrimaryClick}
          />
          {/* 下：五类资产结构卡片（5 等分横向） */}
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#94A3B8] mt-1 mb-1.5">
            <ChevronRight className="w-3 h-3 text-[var(--color-brand)]/70" />
            点击分类卡片可查看对应明细
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {CATEGORIES.map((c) => {
              const ICONS: Record<string, React.ReactNode> = {
                "综合型大盘": <Building2 className="w-3.5 h-3.5" />,
                "滞销项目": <AlertTriangle className="w-3.5 h-3.5" />,
                "公商办": <Briefcase className="w-3.5 h-3.5" />,
                "正常持销": <Building2 className="w-3.5 h-3.5" />,
                "车位 / 尾盘": <Car className="w-3.5 h-3.5" />,
              };
              return (
                <SubMetricCard
                  key={c.key}
                  accent={c.accent}
                  icon={ICONS[c.key]}
                  title={c.key}
                  mainValue={u(c.base)}
                  monthly={{ target: u(c.m.target), actual: u(c.m.actual) }}
                  yearly={{ target: u(c.y.target), actual: u(c.y.actual) }}
                  unitLabel={unitLabel}
                  share={(c.base / TOTAL_BASE) * 100}
                  selected={selectedCategory === c.key}
                  onClick={() => handleCategoryClick(c.key)}
                />
              );
            })}
          </div>
        </section>

        {/* ============ 明细（master-sub 树） ============ */}
        <section
          className="bg-white rounded-[14px] border shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden transition-colors"
          style={
            selectedAccent
              ? { borderColor: selectedAccent.from, borderTopWidth: 3 }
              : { borderColor: "#E5EAF1" }
          }
        >
          {!categoryDetailOpen ? (
            <div className="px-5 py-2.5 flex items-center justify-center">
              <button
                onClick={() => setCategoryDetailOpen(true)}
                className="h-8 px-4 rounded-full border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[13px] text-[var(--color-brand)] font-medium hover:bg-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
                展开明细
              </button>
            </div>
          ) : (
            <>
              {/* 工具条 */}
              <div
                className="px-5 py-3.5 flex items-center gap-3 border-b border-[#E2E8F0] flex-wrap transition-colors"
                style={selectedAccent ? { background: selectedAccent.soft } : undefined}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1 h-4 rounded"
                    style={{ background: selectedAccent?.from ?? "var(--color-brand)" }}
                  />
                  <span className="text-[15px] font-semibold text-[#1E293B]">{detailTitle}</span>
                  <span className="text-[12px] text-[#64748B] ml-1">{detailScopeLabel}</span>
                  <span className="text-[11px] text-[#94A3B8] tabular-nums ml-1">· 共 {filteredBuildings.length} 栋</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-[12px] text-[#64748B] hover:text-[var(--color-brand)] transition-colors cursor-pointer"
                    >
                      切回总体
                    </button>
                  )}
                  <div className="relative">
                    <Search className="icon-md absolute left-2.5 top-1/2 -translate-y-1/2 text-token-disabled" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索城市群 / 城市公司 / 城市 / 项目 / 楼栋"
                      className="h-9 pl-8 pr-3 w-72 rounded-md border border-[#E2E8F0] bg-white text-[13px] text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[var(--color-brand)]"
                    />
                  </div>
                  <ExportButton onClick={exportDetail}>导出明细</ExportButton>
                </div>
              </div>

              {/* 表格：两层表头 */}
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] border-separate border-spacing-0">
                  <colgroup>
                    <col style={{ minWidth: 280 }} />
                    <col style={{ width: 96 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 96 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 100 }} />
                  </colgroup>
                  <thead className="t-table-header">
                    <tr className="bg-[#F1F5F9]">
                      <th rowSpan={2} className="sticky left-0 z-20 bg-[#F1F5F9] px-3 py-2 text-left font-medium whitespace-nowrap border-b border-[#E2E8F0] align-middle">名称</th>
                      <th rowSpan={2} className="px-3 py-2 text-left font-medium whitespace-nowrap border-b border-l border-[#E2E8F0] align-middle">项目类别</th>
                      <th rowSpan={2} className="px-3 py-2 text-right font-medium whitespace-nowrap border-b border-l border-[#E2E8F0] align-middle">
                        年初库存<span className="text-[#94A3B8] font-normal ml-0.5">({unitLabel})</span>
                      </th>
                      <th colSpan={2} className="px-3 py-2 text-center font-medium whitespace-nowrap border-l border-b border-[#E2E8F0]">月度</th>
                      <th colSpan={4} className="px-3 py-2 text-center font-medium whitespace-nowrap border-l border-b border-[#E2E8F0]">年度</th>
                      <th colSpan={2} className="px-3 py-2 text-center font-medium whitespace-nowrap border-l border-b border-[#E2E8F0]">到访人数</th>
                      <th rowSpan={2} className="px-3 py-2 text-right font-medium whitespace-nowrap border-l border-b border-[#E2E8F0] align-middle">去化周期(月)</th>
                    </tr>
                    <tr className="bg-[#F8FAFC] text-[11.5px]">
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-l border-[#EEF2F7]">签约金额<span className="text-[#94A3B8] ml-0.5">({unitLabel})</span></th>
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-[#EEF2F7]">套数<span className="text-[#94A3B8] ml-0.5">(套)</span></th>
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-l border-[#EEF2F7]">目标<span className="text-[#94A3B8] ml-0.5">({unitLabel})</span></th>
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-[#EEF2F7]">签约金额<span className="text-[#94A3B8] ml-0.5">({unitLabel})</span></th>
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-[#EEF2F7]">套数<span className="text-[#94A3B8] ml-0.5">(套)</span></th>
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-[#EEF2F7]">完成率<span className="text-[#94A3B8] ml-0.5">(%)</span></th>
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-l border-[#EEF2F7]">本月新访<span className="text-[#94A3B8] ml-0.5">(人)</span></th>
                      <th className="px-3 py-1.5 text-right font-normal whitespace-nowrap border-b border-[#EEF2F7]">本月复访<span className="text-[#94A3B8] ml-0.5">(人)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTree.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-3 py-10 text-center text-[#94A3B8] text-[12px]">
                          {search ? `未匹配到「${search}」` : "暂无数据"}
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const out: React.ReactNode[] = [];
                        const renderRows = (nodes: TreeNode[], depth: number) => {
                          for (const n of nodes) {
                            const isOpen = expandedIds.has(n.id);
                            const hasChildren = !!(n.children && n.children.length);
                            const mPct = n.mT > 0 ? (n.mS / n.mT) * 100 : 0;
                            const yPct = n.yT > 0 ? (n.yS / n.yT) * 100 : 0;
                            const levelTone = depth === 0 ? "bg-[#FBFCFE]" : "bg-white";
                            out.push(
                              <tr
                                key={n.id}
                                className={`${levelTone} hover:bg-[#F1F5F9] transition-colors`}
                              >
                                <td className="sticky left-0 z-[1] px-3 py-2.5 whitespace-nowrap border-b border-[#F1F5F9]" style={{ background: "inherit" }}>
                                  <div className="flex items-center" style={{ paddingLeft: depth * 28 }}>
                                    {hasChildren ? (
                                      <button
                                        onClick={() => toggleNode(n.id)}
                                        className="icon-sm mr-2 inline-flex items-center justify-center text-token-tertiary hover:text-[var(--color-brand)] cursor-pointer"
                                        aria-label={isOpen ? "收起" : "展开"}
                                      >
                                        {isOpen ? <ChevronDown className="icon-sm" /> : <ChevronRight className="icon-sm" />}
                                      </button>
                                    ) : (
                                      <span className="icon-sm mr-2 inline-block" />
                                    )}
                                    <HierarchyTag type={resolveHierarchyType(n.level) ?? "cityGroup"} />
                                    <span className={`ml-2.5 text-[#1E293B] ${depth === 0 ? "font-semibold" : depth === 1 ? "font-medium" : ""}`}>
                                      {n.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-[#475569] border-b border-[#F1F5F9]">{n.category ?? "--"}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#1E293B] font-medium border-b border-l border-[#F1F5F9]">{fmt(u(n.unsold))}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#1E293B] border-b border-l border-[#F1F5F9]">{fmt(u(n.mS))}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#64748B] border-b border-[#F1F5F9]">{n.mU}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#475569] border-b border-l border-[#F1F5F9]">{fmt(u(n.yT))}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#1E293B] border-b border-[#F1F5F9]">{fmt(u(n.yS))}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#64748B] border-b border-[#F1F5F9]">{n.yU}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums font-medium border-b border-[#F1F5F9] ${yPct >= 100 ? "text-[#16A34A]" : "text-[var(--color-brand)]"}`}>{fmt(yPct)}%</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#475569] border-b border-l border-[#F1F5F9]">{n.newV.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#475569] border-b border-[#F1F5F9]">{n.reV.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[#64748B] border-b border-l border-[#F1F5F9]">{n.period > 0 ? fmt(n.period) : "--"}</td>
                              </tr>,
                            );
                            if (hasChildren && isOpen) renderRows(n.children!, depth + 1);
                          }
                        };
                        renderRows(visibleTree, 0);
                        return out;
                      })()
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 border-t border-[#E2E8F0] flex items-center justify-center">
                <button
                  onClick={() => {
                    setCategoryDetailOpen(false);
                    setSelectedCategory(null);
                    setSearch("");
                    setManualExpand(new Set());
                  }}
                  className="h-8 px-4 rounded-full border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[13px] text-[var(--color-brand)] font-medium hover:bg-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                  收起明细
                </button>
              </div>
            </>
          )}
        </section>

        {/* ============ Lower analytics (always visible) ============ */}
          <>
            {/* ===== Mini stat cards ===== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "今日签约", value: 0.12, units: 5, accent: ACCENTS.blue, icon: <CalendarDays className="w-5 h-5" /> },
                { label: "本周签约", value: 0.37, units: 15, accent: ACCENTS.cyan, icon: <CalendarRange className="w-5 h-5" /> },
                { label: "本月签约", value: 2.54, units: 30, accent: ACCENTS.indigo, icon: <CalendarClock className="w-5 h-5" /> },
                { label: "本年签约", value: 50.13, units: 59, accent: ACCENTS.amber, icon: <CalendarIcon className="w-5 h-5" /> },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-[12px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-5 py-4 flex items-center gap-4">
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: s.accent.soft, color: s.accent.from }}
                  >
                    {s.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#64748B] mb-1">{s.label}</div>
                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-[22px] leading-none font-semibold tabular-nums" style={{ color: s.accent.from }}>
                        {fmt(u(s.value))}
                      </span>
                      <span className="text-[12px] text-[#64748B]">{unitLabel}</span>
                      <span className="text-[12px] text-[#CBD5E1]">·</span>
                      <span className="text-[12px] text-[#64748B] tabular-nums">{s.units} 套</span>
                    </div>
                  </div>
                </div>
              ))}

            </section>

            {/* ===== Two charts row ===== */}
            <section className="grid grid-cols-2 gap-4">
              {/* City distribution */}
              <ModuleBadge moduleId="city-value-distribution" className="bg-white rounded-[14px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
                    <span className="text-[15px] font-semibold text-[#1E293B]">
                      {getOrgLevel(org) === "company" ? `${org} · 项目货值分布` : "各城市公司货值分布"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    
                    <button
                      type="button"
                      onClick={() => setCityDistAllOpen(true)}
                      className="text-xs text-[var(--color-brand)] hover:underline inline-flex items-center gap-0.5"
                    >
                      查看全部 <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {getOrgLevel(org) !== "company" && (
                  <div className="flex items-center gap-x-5 gap-y-2 mb-4 flex-wrap">
                    {Object.entries(CITY_COLORS).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-[#475569]">
                        <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: v }} />
                        {k}
                      </span>
                    ))}
                  </div>
                )}

                {/* Column headers */}
                <div className="grid grid-cols-[40px_80px_1fr_112px_112px] items-center gap-3 px-1 pb-2 mb-1.5 border-b border-[#EEF2F7] text-[11px] text-[#94A3B8]">
                  <span>排名</span>
                  <span>{getOrgLevel(org) === "company" ? "项目" : "城市公司"}</span>
                  <span />
                  <button
                    type="button"
                    onClick={() => toggleCityDistSort("total")}
                    className={`text-right inline-flex items-center justify-end gap-1 hover:text-[#1677FF] transition-colors ${cityDistSortKey === "total" ? "text-[#1677FF]" : ""}`}
                    aria-label="按总未售货值排序"
                  >
                    总未售货值({unitLabel})
                    {cityDistSortKey === "total" ? (
                      cityDistSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    )}
                  </button>
                  <span className="text-right inline-flex items-center justify-end gap-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleCityDistSort("period")}
                      className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-[#1677FF] transition-colors ${cityDistSortKey === "period" ? "text-[#1677FF]" : ""}`}
                      aria-label="按去化周期排序"
                    >
                      去化周期（月）
                      {cityDistSortKey === "period" ? (
                        cityDistSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      )}
                    </button>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center text-[#94A3B8] hover:text-[#1677FF] focus:outline-none" aria-label="去化周期说明">
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px] bg-white text-[#1E293B] border border-[#E2E8F0] shadow-md text-[12px] leading-relaxed font-normal whitespace-pre-line">
                          {SELLTHROUGH_TOOLTIP}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const lvl = getOrgLevel(org);
                    const base: CityDistRow[] | typeof CITY_DIST = lvl === "company"
                      ? buildProjectsForCompany(org).map((p) => ({ ...p, group: org })) as CityDistRow[]
                      : lvl === "group"
                        ? CITY_DIST_ALL.filter((x) => x.group === org)
                        : CITY_DIST;
                    const sign = cityDistSortDir === "desc" ? -1 : 1;
                    const sorted = [...base].sort((a: any, b: any) => sign * (a[cityDistSortKey] - b[cityDistSortKey]));
                    const list = sorted.slice(0, 5);
                    const maxU = u(Math.max(...list.map((r: any) => r.total), 1));
                    const isCompanyLvl = lvl === "company";
                    return list.map((d, idx) => {
                      const segs = (Object.keys(CITY_COLORS) as Array<keyof typeof CITY_COLORS>);
                      const totalU = u(d.total);
                      const rowPct = (totalU / maxU) * 100;
                      return (
                        <div
                          key={d.name}
                          className="grid grid-cols-[40px_80px_1fr_112px_112px] items-center gap-3 group relative rounded-md hover:bg-[#F8FAFD] py-1.5 -mx-1 px-1 transition-colors"
                        >
                          <span className="text-[12px] font-semibold text-[#2F7BF6] tabular-nums">TOP{idx + 1}</span>
                          <span className="text-[13px] font-medium text-[#1E293B] truncate">{d.name}</span>
                        <div className="relative">
                          <div className="h-3 rounded-[3px] bg-[#E9EEF5] overflow-hidden">
                            {isCompanyLvl ? (
                              <div
                                className="h-full rounded-[3px]"
                                style={{ width: `${rowPct}%`, background: "#2F7BF6" }}
                              />
                            ) : (
                              <div className="h-full flex" style={{ width: `${rowPct}%` }}>
                                {segs.map((k, si) => {
                                  const v = u((d as any)[k] as number);
                                  const w = (v / totalU) * 100;
                                  return (
                                    <div
                                      key={k}
                                      style={{
                                        width: `${w}%`,
                                        background: CITY_COLORS[k],
                                        borderTopLeftRadius: si === 0 ? 3 : 0,
                                        borderBottomLeftRadius: si === 0 ? 3 : 0,
                                        borderTopRightRadius: si === segs.length - 1 ? 3 : 0,
                                        borderBottomRightRadius: si === segs.length - 1 ? 3 : 0,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {/* Hover tooltip */}
                          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20 hidden group-hover:block">
                            <div className="min-w-[220px] rounded-lg border border-[#E5EAF1] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-3">
                              <div className="text-[12px] font-semibold text-[#1E293B] mb-2">{d.name}</div>
                              {!isCompanyLvl && (
                                <div className="space-y-1">
                                  {segs.map((k) => {
                                    const v = u((d as any)[k] as number);
                                    const pct = (v / totalU) * 100;
                                    return (
                                      <div key={k} className="flex items-center justify-between text-[11.5px]">
                                        <span className="inline-flex items-center gap-1.5 text-[#475569]">
                                          <span className="w-2 h-2 rounded-sm" style={{ background: CITY_COLORS[k] }} />
                                          {k}
                                        </span>
                                        <span className="tabular-nums text-[#1E293B]">
                                          {fmt(v)} {unitLabel}
                                          <span className="ml-1.5 text-[#94A3B8]">{fmt(pct)}%</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <div className={`${isCompanyLvl ? "" : "mt-2 pt-2 border-t border-[#F1F5F9]"} flex items-center justify-between text-[11.5px]`}>
                                <span className="text-[#64748B]">总未售货值</span>
                                <span className="tabular-nums font-semibold text-[#1E293B]">{fmt(totalU)} {unitLabel}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11.5px] mt-1">
                                <span className="text-[#64748B]">去化周期</span>
                                <span className="tabular-nums text-[#1E293B]">{d.period ? `${fmt(d.period)} 月` : "--"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <span className={`text-right text-[13px] tabular-nums ${cityDistSortKey === "total" ? "text-[#1677FF]" : "text-[#0F172A]"}`}>{fmt(totalU)}</span>
                        <span className={`text-right text-[12px] tabular-nums ${cityDistSortKey === "period" ? "text-[#1677FF]" : "text-[#0F172A]"}`}>{d.period ? fmt(d.period) : "--"}</span>
                      </div>
                    );
                    });
                  })()}
                </div>
              </ModuleBadge>

              {/* Trend */}
              <div className="bg-white rounded-[14px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
                    <span className="text-[15px] font-semibold text-[#1E293B]">签约趋势与同比分析</span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">单位：{unitLabel}</span>
                </div>
                <SegmentedTabs
                  className="mb-3 max-w-full flex-wrap"
                  size="md"
                  value={trendTab}
                  onChange={setTrendTab}
                  items={trendTabs as readonly string[]}
                />

                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="m" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                      <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <RTooltip
                        contentStyle={tipShell}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as any;
                          const up = d.growth >= 0;
                          return (
                            <div style={tipShell}>
                              <div className="text-[12px] text-[#64748B] mb-1.5">{label}</div>
                              <div className="flex items-center gap-3 text-[12px]">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ background: "#1677FF" }} />
                                  合同签约金额
                                </span>
                                <span className="tabular-nums font-medium" style={{ color: "#1677FF" }}>{fmt(u(d.signed))} {unitLabel}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[12px] mt-1">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ background: "#94A3B8" }} />
                                  同比签约金额
                                </span>
                                <span className="tabular-nums font-medium text-[#475569]">{fmt(u(d.yoy))} {unitLabel}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[12px] mt-1">
                                <span className="text-[#64748B]">同比增长率</span>
                                <span className="tabular-nums font-medium" style={{ color: up ? "#E11D48" : "#16A34A" }}>
                                  {up ? "+" : ""}{fmt(d.growth)}%
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={20}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, color: "#64748B" }}
                      />
                      <Line type="monotone" dataKey="signed" name="签约金额" stroke="#1677FF" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="yoy" name="同比" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2.5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ===== Third row ===== */}
            {(() => {
              // 月度 / 年度统一口径：左侧排行图 + 右侧明细表共用 keyMode
              const isYear = keyMode === "year";
              const enriched = KEY_PROJECTS.map((p, i) => {
                const annualTargetFactor = 11 + ((i % 4) * 0.3);
                const annualActualFactor = 10 + ((i % 3) * 0.5) + ((i % 5) * 0.2);
                const monthlyTarget = p.target;
                const monthlySignedAmount = p.actual;
                const monthlySignedUnits = p.units;
                const monthlyVisitCount = p.visits;
                const annualTarget = +(p.target * annualTargetFactor).toFixed(2);
                const annualSignedAmount = +(p.actual * annualActualFactor).toFixed(2);
                const annualSignedUnits = p.units * (10 + (i % 3));
                const annualVisitCount = p.visits * (9 + (i % 4));
                return {
                  ...p,
                  monthlyTarget, monthlySignedAmount, monthlySignedUnits, monthlyVisitCount,
                  annualTarget, annualSignedAmount, annualSignedUnits, annualVisitCount,
                };
              });
              const mapped = enriched.map((p) => {
                const target = isYear ? p.annualTarget : p.monthlyTarget;
                const actual = isYear ? p.annualSignedAmount : p.monthlySignedAmount;
                const units = isYear ? p.annualSignedUnits : p.monthlySignedUnits;
                const visits = isYear ? p.annualVisitCount : p.monthlyVisitCount;
                const rate = target > 0 ? (actual / target) * 100 : 0;
                return { ...p, _target: target, _actual: actual, _units: units, _visits: visits, _rate: rate };
              });
              const getSortVal = (p: typeof mapped[number]): number | string => {
                switch (keySortKey) {
                  case "target": return p._target;
                  case "actual": return p._actual;
                  case "units": return p._units;
                  case "rate": return p._rate;
                  case "visits": return p._visits;
                  case "period": return p.period;
                  case "category": return p.category ?? "";
                }
              };
              const rows = [...mapped].sort((a, b) => {
                const av = getSortVal(a); const bv = getSortVal(b);
                if (typeof av === "string" || typeof bv === "string") {
                  const cmp = String(av).localeCompare(String(bv), "zh-Hans-CN");
                  return keySortDir === "desc" ? -cmp : cmp;
                }
                return keySortDir === "desc" ? bv - av : av - bv;
              });
              // 左侧排行图始终按签约金额降序，与默认明细顺序一致
              const topRows = [...mapped].sort((a, b) => b._actual - a._actual).slice(0, 25).map((p) => ({ name: p.name, value: u(p._actual) }));
              const periodWord = isYear ? "年度" : "月度";
              const amountLabel = isYear ? "年度签约" : "月度签约";
              const headerCells: { label: string; key?: KeySortKey; align: "left" | "right" | "center" }[] = [
                { label: "序号", align: "left" },
                { label: "项目名称", align: "left" },
                { label: "城市公司", align: "left" },
                { label: "项目类别", key: "category", align: "left" },
                { label: `${periodWord}目标(${unitLabel})`, key: "target", align: "right" },
                { label: `${amountLabel}(${unitLabel})`, key: "actual", align: "right" },
                { label: `${periodWord}签约套数`, key: "units", align: "right" },
                { label: `${periodWord}达成率`, key: "rate", align: "right" },
                { label: `${isYear ? "年度" : "本月"}到访人数`, key: "visits", align: "right" },
                { label: "去化周期(月)", key: "period", align: "right" },
                { label: "操作", align: "center" },
              ];
              return (
                <section className="grid grid-cols-10 gap-4">
                  {/* Top 25 ranking */}
                  <div className="col-span-10 lg:col-span-3 bg-white rounded-[14px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
                        <span className="text-[15px] font-semibold text-[#1E293B]">
                          25个重点项目{isYear ? "年度" : "月度"}签约金额排行
                        </span>
                      </div>
                      <span className="text-[11px] text-[#64748B]">单位：{unitLabel}</span>
                    </div>
                    <div className="h-[480px] overflow-y-auto pr-1">
                      <ResponsiveContainer width="100%" height={Math.max(560, topRows.length * 22)}>
                        <BarChart data={topRows} layout="vertical" margin={{ top: 4, right: 50, left: 8, bottom: 4 }} barCategoryGap="35%">
                          <CartesianGrid horizontal={false} stroke="#F1F5F9" />
                          <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={120} interval={0} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} tick={(props: any) => {
                            const { x, y, payload } = props;
                            const max = 9;
                            const full = String(payload.value ?? "");
                            const text = full.length > max ? full.slice(0, max) + "…" : full;
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <text x={-116} y={0} dy={4} textAnchor="start" fill="#475569" fontSize={11}>
                                  {text}
                                  <title>{full}</title>
                                </text>
                              </g>
                            );
                          }} />
                          <RTooltip cursor={{ fill: "rgba(22,119,255,0.06)" }} contentStyle={tipShell} formatter={(v: any) => [`${fmt(+v)} ${unitLabel}`, `${amountLabel}金额`]} />
                          <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={12}>
                            {topRows.map((_, i) => (
                              <Cell key={i} fill={i < 3 ? "#1677FF" : i < 10 ? "#60A5FA" : "#93C5FD"} />
                            ))}
                            <LabelList dataKey="value" position="right" formatter={(v: any) => fmt(+v)} style={{ fill: "#475569", fontSize: 11 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Key project detail */}
                  <div className="col-span-10 lg:col-span-7 bg-white rounded-[14px] border border-[#E5EAF1] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
                        <span className="text-[15px] font-semibold text-[#1E293B]">重点项目明细</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SegmentedTabs
                          value={keyMode}
                          onChange={setKeyMode}
                          items={[
                            { value: "month", label: "月度" },
                            { value: "year", label: "年度" },
                          ] as const}
                        />

                        <ExportButton
                          onClick={() => toast.success(`${isYear ? "重点项目年度签约明细" : "重点项目月度签约明细"}已导出`)}
                        />
                      </div>
                    </div>
                    <div className="overflow-auto max-h-[480px]">
                      <table className="w-full text-[12px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-[#F1F5F9] text-[#475569]">

                            {headerCells.map((h) => {
                              const sortable = !!h.key;
                              const isActive = sortable && keySortKey === h.key;
                              const alignCls = h.align === "left" ? "text-left" : h.align === "center" ? "text-center" : "text-right";
                              return (
                                <th
                                  key={h.label}
                                  onClick={sortable ? () => {
                                    if (keySortKey === h.key) setKeySortDir(keySortDir === "desc" ? "asc" : "desc");
                                    else { setKeySortKey(h.key!); setKeySortDir("desc"); }
                                  } : undefined}
                                  className={`px-2 py-2 font-medium border-b border-[#E2E8F0] whitespace-nowrap ${alignCls} ${sortable ? "cursor-pointer select-none hover:text-[var(--color-brand)]" : ""} ${isActive ? "text-[var(--color-brand)]" : ""}`}
                                >
                                  <span className={`inline-flex items-center gap-1 align-middle ${h.align === "right" ? "justify-end w-full" : h.align === "center" ? "justify-center w-full" : ""}`}>
                                    {h.label}
                                    {sortable && (isActive
                                      ? (keySortDir === "desc"
                                          ? <ArrowDown className="w-3 h-3 text-[var(--color-brand)]" />
                                          : <ArrowUp className="w-3 h-3 text-[var(--color-brand)]" />)
                                      : <ArrowUpDown className="w-3 h-3 text-slate-400" />)}
                                  </span>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((p, i) => {
                            const target = u(p._target);
                            const actual = u(p._actual);
                            const units = p._units;
                            const visits = p._visits;
                            const rate = p._rate;
                            return (
                              <tr key={p.name} className={`${i % 2 ? "bg-[#FAFBFC]" : "bg-white"} hover:bg-[#F5F9FF]`}>
                                <td className="px-2 py-2 text-[#64748B]">{i + 1}</td>
                                <td className="px-2 py-2 text-[#1E293B] font-medium">{p.name}</td>
                                <td className="px-2 py-2 text-[#64748B]">{p.company}</td>
                                <td className="px-2 py-2 text-[#64748B]">{p.category}</td>
                                <td className={`px-2 py-2 text-right tabular-nums ${p.name.includes("深圳招商玺家园") && !isYear ? "text-[#94A3B8]" : keySortKey === "target" ? "text-[var(--color-brand)] font-medium" : ""}`}>{p.name.includes("深圳招商玺家园") && !isYear ? "--" : fmt(target)}</td>
                                <td className={`px-2 py-2 text-right tabular-nums ${keySortKey === "actual" ? "text-[var(--color-brand)] font-medium" : ""}`}>{fmt(actual)}</td>
                                <td className={`px-2 py-2 text-right tabular-nums ${keySortKey === "units" ? "text-[var(--color-brand)] font-medium" : ""}`}>{units}</td>
                                <td className={`px-2 py-2 text-right tabular-nums ${p.name.includes("深圳招商玺家园") && !isYear ? "text-[#94A3B8]" : rate >= 100 ? "text-[#E11D48]" : keySortKey === "rate" ? "text-[var(--color-brand)] font-medium" : ""}`}>{p.name.includes("深圳招商玺家园") && !isYear ? "--" : `${fmt(rate)}%`}</td>
                                <td className={`px-2 py-2 text-right tabular-nums ${keySortKey === "visits" ? "text-[var(--color-brand)] font-medium" : ""}`}>{visits.toLocaleString()}</td>
                                <td className={`px-2 py-2 text-right tabular-nums ${keySortKey === "period" ? "text-[var(--color-brand)] font-medium" : ""}`}>{fmt(p.period)}</td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    onClick={() => {
                                      const url = (p as any).commandUrl as string | undefined;
                                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                                      else toast.message("暂未配置指令单链接");
                                    }}
                                    className="text-[var(--color-brand)] hover:underline hover:opacity-90"
                                  >
                                    查看指令单
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 pt-2 border-t border-dashed border-[#E2E8F0] text-[11px] leading-[1.5] text-[#94A3B8]">
                      <span className="text-[#64748B]">备注：</span>
                      <span>1、武汉未来中心：包含一二三批次；2、重庆渝天府：包含 AH09、AH20 地块；3、南通滨江项目：包含一期 R19028、大二期 R21012；4、深圳招商玺家园：为三期商墅部分。</span>
                    </div>

                  </div>

                </section>
              );
            })()}
          </>
      </main>

      <CityDistAllDialog open={cityDistAllOpen} onOpenChange={setCityDistAllOpen} org={org} />
    </div>
  );
}

export default LegacyPage;
