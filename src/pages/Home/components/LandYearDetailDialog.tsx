import { ExportButton } from "@/components/ui/export-button";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { X, Download, ArrowUpDown, ArrowUp, ArrowDown, CalendarRange } from "lucide-react";
import { ModuleBadge } from "@/components/requirements";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  LabelList,
} from "recharts";
import { toast } from "sonner";
import { DONUT_PALETTE as TOKEN_DONUT_PALETTE } from "@/lib/tokens";

// 拿地年份统一配色（产品级图表色板）
const LAND_YEAR_COLORS: Record<string, string> = {
  "2021及之前拿地": TOKEN_DONUT_PALETTE[0],
  "2022拿地": TOKEN_DONUT_PALETTE[1],
  "2023拿地": TOKEN_DONUT_PALETTE[2],
  "2024拿地": TOKEN_DONUT_PALETTE[3],
  "2025拿地": TOKEN_DONUT_PALETTE[4],
  "2026拿地": TOKEN_DONUT_PALETTE[5],
};
const LAND_YEAR_KEYS = ["2021及之前拿地", "2022拿地", "2023拿地", "2024拿地", "2025拿地", "2026拿地"];
const PCT_2021_KEY = "__pct2021";
const PCT_2021_LEGEND_NAME = "21年及之前拿地占比";
const LEGEND_KEY_ALIAS: Record<string, string> = {
  [PCT_2021_LEGEND_NAME]: PCT_2021_KEY,
};

const fmtAmt = (n: number) => `${(+n).toFixed(2)}亿`;
const fmtAmt2 = (n: number) => `${(+n).toFixed(2)}亿`;
const fmtPct = (n: number) => `${(+n).toFixed(2)}%`;

// 共用 SVG 渐变 defs（必须直接内联到 BarChart 子节点中，Recharts 不接受自定义组件包裹）
const GRADIENT_DEFS = (
  <defs>
    {LAND_YEAR_KEYS.map((k) => {
      const c = LAND_YEAR_COLORS[k];
      return (
        <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={1} />
          <stop offset="100%" stopColor={c} stopOpacity={0.78} />
        </linearGradient>
      );
    })}
  </defs>
);

// 统一 tooltip 容器
function TipShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
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
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#1E293B" }}>{title}</div>
      {children}
    </div>
  );
}

function TipRow({ color, name, value }: { color: string; name: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, lineHeight: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
        {name}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#1E293B", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

// ---- 第一区块 mock 数据 ----
const TREND_5Y = [
  { stat: "2022", "2021及之前拿地": 145.3, "2022拿地": 34.2, "2023拿地": 0, "2024拿地": 0, "2025拿地": 0, "2026拿地": 0 },
  { stat: "2023", "2021及之前拿地": 121.7, "2022拿地": 58.7, "2023拿地": 28.4, "2024拿地": 0, "2025拿地": 0, "2026拿地": 0 },
  { stat: "2024", "2021及之前拿地": 105.9, "2022拿地": 75.0, "2023拿地": 48.5, "2024拿地": 24.8, "2025拿地": 0, "2026拿地": 0 },
  { stat: "2025", "2021及之前拿地": 99.1, "2022拿地": 84.4, "2023拿地": 61.1, "2024拿地": 40.5, "2025拿地": 22.4, "2026拿地": 0 },
  { stat: "2026", "2021及之前拿地": 96.7, "2022拿地": 88.6, "2023拿地": 66.1, "2024拿地": 46.7, "2025拿地": 37.7, "2026拿地": 8.9 },
];

// ---- 第二区块 mock 数据 ----（按拿地年份堆积，复用统一色板）
// 当前筛选月份（mock）。后续接入真实筛选时由 props 注入即可。
const CURRENT_MONTH_2026 = 6;
const MONTHLY_REAL: Array<Record<string, any>> = [
  { m: "01", "2021及之前拿地": 76.80, "2022拿地": 50.20, "2023拿地": 28.60, "2024拿地": 18.40, "2025拿地": 23.10, "2026拿地": 0.00 },
  { m: "02", "2021及之前拿地": 75.40, "2022拿地": 49.80, "2023拿地": 28.10, "2024拿地": 18.20, "2025拿地": 22.80, "2026拿地": 0.00 },
  { m: "03", "2021及之前拿地": 73.90, "2022拿地": 49.10, "2023拿地": 27.60, "2024拿地": 17.90, "2025拿地": 22.40, "2026拿地": 0.00 },
  { m: "04", "2021及之前拿地": 72.10, "2022拿地": 48.50, "2023拿地": 27.10, "2024拿地": 17.50, "2025拿地": 22.10, "2026拿地": 0.00 },
  { m: "05", "2021及之前拿地": 70.80, "2022拿地": 47.90, "2023拿地": 26.70, "2024拿地": 17.10, "2025拿地": 21.80, "2026拿地": 0.00 },
  { m: "06", "2021及之前拿地": 69.40, "2022拿地": 47.20, "2023拿地": 26.30, "2024拿地": 16.80, "2025拿地": 21.40, "2026拿地": 0.00 },
  { m: "07", "2021及之前拿地": 68.10, "2022拿地": 46.60, "2023拿地": 25.90, "2024拿地": 16.50, "2025拿地": 21.10, "2026拿地": 0.00 },
  { m: "08", "2021及之前拿地": 66.80, "2022拿地": 45.90, "2023拿地": 25.40, "2024拿地": 16.20, "2025拿地": 20.80, "2026拿地": 0.00 },
  { m: "09", "2021及之前拿地": 65.40, "2022拿地": 45.30, "2023拿地": 25.00, "2024拿地": 15.90, "2025拿地": 20.50, "2026拿地": 0.00 },
  { m: "10", "2021及之前拿地": 64.10, "2022拿地": 44.70, "2023拿地": 24.60, "2024拿地": 15.60, "2025拿地": 20.20, "2026拿地": 0.00 },
  { m: "11", "2021及之前拿地": 62.80, "2022拿地": 44.10, "2023拿地": 24.20, "2024拿地": 15.30, "2025拿地": 19.90, "2026拿地": 0.00 },
  { m: "12", "2021及之前拿地": 61.50, "2022拿地": 43.50, "2023拿地": 23.80, "2024拿地": 15.00, "2025拿地": 19.60, "2026拿地": 0.00 },
];
const MONTHLY_2026: Array<Record<string, any>> = MONTHLY_REAL.map((r, i) => {
  const idx = i + 1;
  if (idx > CURRENT_MONTH_2026) {
    // 未发生月份：柱体不渲染（数值置 0），并标记 __empty
    const empty: Record<string, any> = { m: r.m, __empty: true, __total: 0 };
    LAND_YEAR_KEYS.forEach((k) => (empty[k] = 0));
    return empty;
  }
  const total = LAND_YEAR_KEYS.reduce((s, k) => s + (r[k] || 0), 0);
  return { ...r, __empty: false, __total: total };
});

// ---- 第三区块 mock 数据 ----
type Row = {
  year: string;
  total: number;
  s2021: number | null;
  s2022: number | null;
  s2023: number | null;
  s2024: number | null;
  s2025: number | null;
  s2026: number | null;
  sold: number;
  rate: number;
  remain: number;
  remainPct: number;
  isTotal?: boolean;
};
const ROWS: Row[] = [
  { year: "2021年及之前", total: 1763.9, s2021: 609.6, s2022: 392.8, s2023: 257.7, s2024: 165.5, s2025: 71.2, s2026: 25.1, sold: 1521.7, rate: 86.27, remain: 242.2, remainPct: 13.73 },
  { year: "2022年", total: 1286.3, s2021: null, s2022: 358.2, s2023: 256.6, s2024: 170.7, s2025: 98.5, s2026: 44.0, sold: 928.0, rate: 72.15, remain: 358.3, remainPct: 27.85 },
  { year: "2023年", total: 1095.7, s2021: null, s2022: null, s2023: 297.5, s2024: 210.6, s2025: 132.0, s2026: 52.4, sold: 692.5, rate: 63.20, remain: 403.2, remainPct: 36.80 },
  { year: "2024年", total: 935.4, s2021: null, s2022: null, s2023: null, s2024: 259.8, s2025: 164.5, s2026: 64.9, sold: 489.2, rate: 52.30, remain: 446.2, remainPct: 47.70 },
  { year: "2025年", total: 800.3, s2021: null, s2022: null, s2023: null, s2024: null, s2025: 234.6, s2026: 160.3, sold: 394.9, rate: 49.34, remain: 405.4, remainPct: 50.66 },
  { year: "2026年", total: 538.4, s2021: null, s2022: null, s2023: null, s2024: null, s2025: null, s2026: 93.2, sold: 93.2, rate: 17.31, remain: 445.0, remainPct: 82.69 },
];
const TOTAL_ROW: Row = {
  year: "合计",
  total: 6420.0,
  s2021: 609.6, s2022: 751.0, s2023: 811.8, s2024: 806.6, s2025: 700.8, s2026: 439.9,
  sold: 4119.5, rate: 64.17, remain: 2300.3, remainPct: 35.83,
  isTotal: true,
};

type SortKey =
  | "year" | "total"
  | "s2021" | "s2022" | "s2023" | "s2024" | "s2025" | "s2026"
  | "sold" | "rate" | "remain" | "remainPct";

const SALE_COLS: { key: SortKey; label: string }[] = [
  { key: "s2023", label: "2023年销售" },
  { key: "s2024", label: "2024年销售" },
  { key: "s2025", label: "2025年销售" },
  { key: "s2026", label: "2026年销售" },
];

function fmtNum(n: number | null | undefined, d = 2) {
  if (n == null) return "--";
  return n.toFixed(d);
}

export function LandYearDetailDialog({
  open,
  onClose,
  currentYear,
  metricMode = "amount",
  factor = 1,
  unit = "亿",
  org = "招商蛇口",
  caliber = "equity",
  date = "",
}: {
  open: boolean;
  onClose: () => void;
  currentYear: number;
  metricMode?: "amount" | "area";
  factor?: number;
  unit?: string;
  org?: string;
  caliber?: "equity" | "full";
  date?: string;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  // Block2 图例显隐独立维护：默认展示全部拿地年份，形成月度堆积图
  const [hiddenSeries2, setHiddenSeries2] = useState<Record<string, boolean>>({});
  const hoverKey: string | null = null;
  const [sortKey, setSortKey] = useState<SortKey | null>("year");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimerRef2 = useRef<ReturnType<typeof setTimeout> | null>(null);



  // 仅展示截至全局选中年份的拿地年份与统计年份
  const visibleYearKeys = useMemo(
    () =>
      LAND_YEAR_KEYS.filter((k) => {
        if (k === "2021及之前拿地") return true;
        const y = parseInt(k.slice(0, 4), 10);
        return y <= currentYear;
      }),
    [currentYear],
  );
  const trend5Y = useMemo(
    () =>
      TREND_5Y.filter((d) => parseInt(d.stat, 10) <= currentYear).map((d) => {
        const row: any = { stat: d.stat };
        let total = 0;
        LAND_YEAR_KEYS.forEach((k) => {
          const v = +(((d as any)[k] || 0) * factor).toFixed(2);
          row[k] = v;
          total += v;
        });
        row[PCT_2021_KEY] = total > 0 ? +((row["2021及之前拿地"] / total) * 100).toFixed(2) : 0;
        return row;
      }),
    [currentYear, factor],
  );
  const trendLegendKeys = useMemo(() => [...visibleYearKeys, PCT_2021_KEY], [visibleYearKeys]);
  const monthly2026 = useMemo(
    () =>
      MONTHLY_2026.map((r) => {
        const o: any = { m: r.m, __empty: r.__empty };
        let total = 0;
        let visibleTotal = 0;
        LAND_YEAR_KEYS.forEach((k) => {
          const v = +(((r as any)[k] || 0) * factor).toFixed(2);
          o[k] = v;
          total += v;
          if (!hiddenSeries2[k]) visibleTotal += v;
        });
        o.__total = +total.toFixed(2);
        o.__totalVisible = +visibleTotal.toFixed(2);
        o[PCT_2021_KEY] = r.__empty ? null : total > 0 ? +((o["2021及之前拿地"] / total) * 100).toFixed(2) : 0;

        return o;
      }),
    [factor, hiddenSeries2],
  );
  const monthlyLegendKeys = useMemo(() => [...LAND_YEAR_KEYS, PCT_2021_KEY], []);


  // ESC + lock body scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // 动态过滤销售年列和拿地行（不超过全局年份）
  const visibleSaleCols = useMemo(
    () => SALE_COLS.filter((c) => parseInt(c.key.slice(1), 10) <= currentYear),
    [currentYear],
  );
  const visibleRows = useMemo(
    () =>
      ROWS.filter((r) => {
        const m = r.year.match(/(\d{4})/);
        if (!m) return true;
        return parseInt(m[1], 10) <= currentYear;
      }),
    [currentYear],
  );
  const dynamicTotalRow = useMemo<Row>(() => {
    const total = visibleRows.reduce((s, r) => s + (r.total ?? 0), 0);
    const remain = visibleRows.reduce((s, r) => s + (r.remain ?? 0), 0);
    const sold = visibleRows.reduce((s, r) => s + (r.sold ?? 0), 0);
    const row: Row = {
      year: "合计",
      total: +total.toFixed(2),
      s2021: null, s2022: null, s2023: null, s2024: null, s2025: null, s2026: null,
      sold: +sold.toFixed(2),
      rate: total ? +((sold / total) * 100).toFixed(2) : 0,
      remain: +remain.toFixed(2),
      remainPct: total ? +((remain / total) * 100).toFixed(2) : 0,
      isTotal: true,
    };
    visibleSaleCols.forEach((c) => {
      (row as any)[c.key] = +visibleRows
        .reduce((s, r) => s + (((r as any)[c.key] as number | null) ?? 0), 0)
        .toFixed(2);
    });
    return row;
  }, [visibleRows, visibleSaleCols]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return visibleRows;
    const arr = [...visibleRows];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [sortKey, sortDir, visibleRows]);

  if (!open) return null;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const handleExport = () => {
    const metricLabel = metricMode === "area" ? "面积" : "货值";
    const header = [
      "拿地年份",
      `总${metricLabel}（${unit}）`,
      `已售${metricLabel}（${unit}）`,
      "累计去化率(%)",
      `剩余未售${metricLabel}（${unit}）`,
      "未售占比(%)",
      ...visibleSaleCols.map((c) => `${c.label}（${unit}）`),
    ];
    const fmt = (v: number | null | undefined) => (v == null ? "--" : +v.toFixed(2));
    const body = sortedRows.map((r) => [
      r.year,
      fmt(r.total),
      fmt(r.sold),
      fmt(r.rate),
      fmt(r.remain),
      fmt(r.remainPct),
      ...visibleSaleCols.map((c) => fmt((r as any)[c.key])),
    ]);
    const totalRow = [
      dynamicTotalRow.year,
      fmt(dynamicTotalRow.total),
      fmt(dynamicTotalRow.sold),
      fmt(dynamicTotalRow.rate),
      fmt(dynamicTotalRow.remain),
      fmt(dynamicTotalRow.remainPct),
      ...visibleSaleCols.map((c) => fmt((dynamicTotalRow as any)[c.key])),
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...body, totalRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "权益货值结构明细表");
    const caliberLabel = caliber === "full" ? "全口径" : "权益";
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeDate = (date || "").replace(/[^0-9]/g, "") || `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const filename = `权益货值结构明细表_${org}_${caliberLabel}_${safeDate}_${ts}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success("明细表已导出");
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-[var(--color-brand)]" />
      : <ArrowDown className="w-3 h-3 text-[var(--color-brand)]" />;
  };

  const onLegendClick = (e: any, legendKeys = visibleYearKeys) => {
    const rawKey = e?.dataKey ?? e?.value;
    const key = LEGEND_KEY_ALIAS[rawKey] ?? rawKey;
    if (!key) return;
    if (clickTimerRef.current) {
      // 双击：独显（若已是独显，则恢复全部显示）
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setHiddenSeries((current) => {
        const others = legendKeys.filter((k) => k !== key);
        const isSoloed =
          others.every((k) => current[k]) && !current[key];
        if (isSoloed) return {};
        const next: Record<string, boolean> = {};
        others.forEach((k) => (next[k] = true));
        next[key] = false;
        return next;
      });
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      // 单击：切换显隐
      setHiddenSeries((s) => ({ ...s, [key]: !s[key] }));
    }, 240);
  };

  const legendFormatter = (value: string, _entry: any) => {
    const key = LEGEND_KEY_ALIAS[value] ?? value;
    const isHidden = !!hiddenSeries[key];
    // 显式颜色映射，不依赖 entry?.color（Bar fill 为渐变 URL 时不可靠）
    let activeColor = "#1E293B";
    if (key === PCT_2021_KEY) activeColor = "#475569";
    else if (LAND_YEAR_COLORS[key]) activeColor = LAND_YEAR_COLORS[key];
    return (
      <span style={{ color: isHidden ? "#94A3B8" : activeColor, transition: "color 0.2s" }}>
        {value}
      </span>
    );
  };

  // Block 2 专属（独立状态）
  const onLegendClick2 = (e: any, legendKeys: string[]) => {
    const rawKey = e?.dataKey ?? e?.value;
    const key = LEGEND_KEY_ALIAS[rawKey] ?? rawKey;
    if (!key) return;
    if (clickTimerRef2.current) {
      clearTimeout(clickTimerRef2.current);
      clickTimerRef2.current = null;
      setHiddenSeries2((current) => {
        const others = legendKeys.filter((k) => k !== key);
        const isSoloed = others.every((k) => current[k]) && !current[key];
        if (isSoloed) return {};
        const next: Record<string, boolean> = {};
        others.forEach((k) => (next[k] = true));
        next[key] = false;
        return next;
      });
      return;
    }
    clickTimerRef2.current = setTimeout(() => {
      clickTimerRef2.current = null;
      setHiddenSeries2((s) => ({ ...s, [key]: !s[key] }));
    }, 240);
  };

  const legendFormatter2 = (value: string, _entry: any) => {
    const key = LEGEND_KEY_ALIAS[value] ?? value;
    const isHidden = !!hiddenSeries2[key];
    let activeColor = "#1E293B";
    if (key === PCT_2021_KEY) activeColor = "#475569";
    else if (LAND_YEAR_COLORS[key]) activeColor = LAND_YEAR_COLORS[key];
    return (
      <span style={{ color: isHidden ? "#94A3B8" : activeColor, transition: "color 0.2s" }}>
        {value}
      </span>
    );
  };


  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "90vw", height: "88vh", maxWidth: 1600 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-[#EEF1F6] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
              <CalendarRange className="w-4 h-4" />
            </span>
            <span className="t-dialog-title">
              按拿地年份货值及去化趋势分析
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 bg-[#FAFBFD]">
          {/* Block 1: 5Y trend */}
          <ModuleBadge moduleId="land-year-5y-trend">
            <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
                <span className="t-section-title leading-tight">
                  近5年未售{metricMode === "area" ? "面积" : "货值"}趋势
                </span>
              </div>
              <span className="t-caption max-w-[60%] text-right leading-relaxed">
                * 横轴为统计年份，颜色图例为拿地年份；点击图例可切换显隐对应拿地批次；折线为「21年及之前」占比。
              </span>
            </div>
            <div className="t-caption mb-3">单位：{unit} ｜ 占比（%）</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend5Y} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
                  {GRADIENT_DEFS}
                  <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="stat" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <RTooltip
                    cursor={{ fill: "rgba(22,119,255,0.05)" }}
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const bars = payload.filter(
                        (p: any) => p.dataKey !== PCT_2021_KEY && !hiddenSeries[p.dataKey] && +p.value > 0,
                      );
                      const lineItem = hiddenSeries[PCT_2021_KEY]
                        ? null
                        : payload.find((p: any) => p.dataKey === PCT_2021_KEY);
                      if (!bars.length && !lineItem) {
                        return (
                          <TipShell title={`${label}年`}>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>暂无数据</div>
                          </TipShell>
                        );
                      }
                      const totalYear = bars.reduce((s: number, p: any) => s + (+p.value || 0), 0);
                      return (
                        <TipShell title={`${label}年`}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {bars.map((p: any) => {
                              const pct = totalYear ? ((+p.value / totalYear) * 100) : 0;
                              return (
                                <div
                                  key={p.dataKey}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 24,
                                    lineHeight: "22px",
                                    opacity: hoverKey && hoverKey !== p.dataKey ? 0.45 : 1,
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: LAND_YEAR_COLORS[p.dataKey], display: "inline-block" }} />
                                    {p.dataKey}
                                  </div>
                                  <div style={{ fontSize: 12, color: "#1E293B", fontVariantNumeric: "tabular-nums" }}>
                                    <span style={{ fontWeight: 500 }}>{(+p.value).toFixed(2)}{unit}</span>
                                    <span style={{ marginLeft: 8, color: "#94A3B8", fontWeight: 400 }}>{fmtPct(pct)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ height: 1, background: "#EEF1F6", margin: "8px 0 6px" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "#64748B" }}>合计</span>
                            <span style={{ fontWeight: 600, color: "#1E293B", fontVariantNumeric: "tabular-nums" }}>{totalYear.toFixed(2)}{unit}</span>
                          </div>
                          {lineItem && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                              <span style={{ color: "#64748B" }}>21年及之前占比</span>
                              <span style={{ fontWeight: 600, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{(+lineItem.value).toFixed(2)}%</span>
                            </div>
                          )}
                        </TipShell>
                      );
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 10, color: "#64748B" }}
                    formatter={legendFormatter}
                    onClick={(e: any) => onLegendClick(e, trendLegendKeys)}
                  />
                  {visibleYearKeys.map((k) => (
                    <Bar
                      key={k}
                      yAxisId="left"
                      dataKey={k}
                      fill={`url(#g-${k})`}
                      stroke={LAND_YEAR_COLORS[k]}
                      strokeOpacity={0}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={22}
                      hide={!!hiddenSeries[k]}
                      isAnimationActive={false}
                      fillOpacity={hoverKey && hoverKey !== k ? 0.3 : 1}
                    >
                      <LabelList
                        dataKey={k}
                        position="top"
                        formatter={(v: number) => (v > 0 ? v.toFixed(2) : "")}
                        style={{ fontSize: 10, fill: LAND_YEAR_COLORS[k], fontWeight: 500 }}
                      />
                    </Bar>
                  ))}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={PCT_2021_KEY}
                    name={PCT_2021_LEGEND_NAME}
                    stroke="#475569"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#fff", stroke: "#475569", strokeWidth: 2 }}
                    activeDot={{ r: 4 }}
                    hide={!!hiddenSeries[PCT_2021_KEY]}
                    strokeOpacity={hoverKey && hoverKey !== PCT_2021_KEY ? 0.3 : 1}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey={PCT_2021_KEY}
                      position="top"
                      formatter={(v: number) => (v > 0 ? `${v.toFixed(2)}%` : "")}
                      style={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
          </ModuleBadge>

          {/* Block 2: Monthly 2026 stacked by land year */}
          <ModuleBadge moduleId="land-year-monthly-trend">
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
              <span className="t-section-title leading-tight">{currentYear}年月度未售{metricMode === "area" ? "面积" : "货值"}趋势</span>
            </div>
            <div className="t-caption mb-3">
              单位：{unit} ｜ 占比（%）
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly2026} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
                  {GRADIENT_DEFS}
                  <CartesianGrid stroke="#EEF1F6" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="m"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <RTooltip
                    cursor={{ fill: "rgba(22,119,255,0.04)" }}
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload;
                      if (row?.__empty) {
                        return (
                          <TipShell title={`${label}月`}>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>该月份尚未发生，暂无数据</div>
                          </TipShell>
                        );
                      }
                      const map: Record<string, any> = {};
                      payload.forEach((p: any) => (map[p.dataKey] = p));
                      const visBars = LAND_YEAR_KEYS.filter((k) => !hiddenSeries2[k] && map[k] && +map[k].value > 0);
                      const visTotal = visBars.reduce((s, k) => s + (+map[k].value || 0), 0);
                      const pctItem = hiddenSeries2[PCT_2021_KEY] ? null : map[PCT_2021_KEY];
                      return (
                        <TipShell title={`${label}月`}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {visBars.map((k) => (
                              <TipRow key={k} color={LAND_YEAR_COLORS[k]} name={k} value={`${(+map[k].value).toFixed(2)}${unit}`} />
                            ))}
                          </div>
                          <div style={{ height: 1, background: "#EEF1F6", margin: "8px 0 6px" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "#64748B" }}>合计</span>
                            <span style={{ fontWeight: 600, color: "#1E293B", fontVariantNumeric: "tabular-nums" }}>{visTotal.toFixed(2)}{unit}</span>
                          </div>
                          {pctItem && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                              <span style={{ color: "#64748B" }}>21年及之前占比</span>
                              <span style={{ fontWeight: 600, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{(+pctItem.value).toFixed(2)}%</span>
                            </div>
                          )}
                        </TipShell>
                      );
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 10, color: "#64748B" }}
                    formatter={legendFormatter2}
                    onClick={(e: any) => onLegendClick2(e, monthlyLegendKeys)}
                    payload={[
                      ...LAND_YEAR_KEYS.map((k) => ({
                        value: k,
                        type: "circle" as const,
                        id: k,
                        color: LAND_YEAR_COLORS[k],
                        dataKey: k,
                        inactive: !!hiddenSeries2[k],
                      })),
                      {
                        value: PCT_2021_LEGEND_NAME,
                        type: "plainline" as const,
                        id: PCT_2021_KEY,
                        color: "#475569",
                        dataKey: PCT_2021_KEY,
                        inactive: !!hiddenSeries2[PCT_2021_KEY],
                        payload: { strokeDasharray: "0" },
                      },
                    ]}
                  />
                  {LAND_YEAR_KEYS.map((k) => (
                    <Bar
                      key={k}
                      yAxisId="left"
                      dataKey={k}
                      name={k}
                      stackId="m"
                      fill={`url(#g-${k})`}
                      maxBarSize={28}
                      hide={!!hiddenSeries2[k]}
                      isAnimationActive={false}
                      fillOpacity={hoverKey && hoverKey !== k ? 0.3 : 1}
                    />
                  ))}
                  {/* 合计标签：使用透明 Line 承载 __totalVisible 标签，跟随堆积顶部 */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="__totalVisible"
                    stroke="transparent"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    legendType="none"
                  >
                    <LabelList
                      dataKey="__totalVisible"
                      position="top"
                      formatter={(v: number) => (v > 0 ? v.toFixed(2) : "")}
                      style={{ fontSize: 10, fill: "#1E293B", fontWeight: 600 }}
                    />
                  </Line>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={PCT_2021_KEY}
                    name={PCT_2021_LEGEND_NAME}
                    stroke="#475569"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#fff", stroke: "#475569", strokeWidth: 2 }}
                    activeDot={{ r: 4 }}
                    hide={!!hiddenSeries2[PCT_2021_KEY]}
                    strokeOpacity={hoverKey && hoverKey !== PCT_2021_KEY ? 0.3 : 1}
                    isAnimationActive={false}
                    legendType="none"
                    connectNulls={false}
                  >
                    <LabelList
                      dataKey={PCT_2021_KEY}
                      position="top"
                      formatter={(v: any) => (v == null ? "" : `${(+v).toFixed(2)}%`)}
                      style={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                    />
                  </Line>

                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
          </ModuleBadge>


          {/* Block 3: 权益货值结构明细表 */}
          <ModuleBadge moduleId="land-year-equity-table">
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
                <span className="t-section-title leading-tight">权益货值结构明细表</span>
              </div>
              <ExportButton onClick={handleExport} />
            </div>

            <div className="overflow-auto rounded-lg border border-[#EEF1F6]" style={{ maxHeight: 360 }}>
              <table className="min-w-full text-[12px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#F1F5F9] text-[#1E293B]">
                    <th rowSpan={2} className="sticky left-0 z-20 bg-[#F1F5F9] text-left px-2.5 py-2 font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0] min-w-[120px]">
                      <button onClick={() => toggleSort("year")} className="inline-flex items-center gap-1">
                        拿地年份 <SortIcon k="year" />
                      </button>
                    </th>
                    <th rowSpan={2} className="text-right px-2.5 py-2 font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0] min-w-[120px]">
                      <button onClick={() => toggleSort("total")} className="inline-flex items-center gap-1">
                        总{metricMode === "area" ? "面积" : "货值"}（{unit}） <SortIcon k="total" />
                      </button>
                    </th>
                    <th rowSpan={2} className="text-right px-2.5 py-2 font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0] min-w-[130px]">
                      <button onClick={() => toggleSort("sold")} className="inline-flex items-center gap-1">
                        已售{metricMode === "area" ? "面积" : "货值"}（{unit}） <SortIcon k="sold" />
                      </button>
                    </th>
                    <th rowSpan={2} className="text-right px-2.5 py-2 font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0] min-w-[100px]">
                      <button onClick={() => toggleSort("rate")} className="inline-flex items-center gap-1">
                        累计去化率 <SortIcon k="rate" />
                      </button>
                    </th>
                    <th rowSpan={2} className="text-right px-2.5 py-2 font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0] min-w-[150px]">
                      <button onClick={() => toggleSort("remain")} className="inline-flex items-center gap-1">
                        剩余未售{metricMode === "area" ? "面积" : "货值"}（{unit}） <SortIcon k="remain" />
                      </button>
                    </th>
                    <th rowSpan={2} className="text-right px-2.5 py-2 font-semibold whitespace-nowrap border-b border-r border-[#E2E8F0] min-w-[100px]">
                      <button onClick={() => toggleSort("remainPct")} className="inline-flex items-center gap-1">
                        未售占比 <SortIcon k="remainPct" />
                      </button>
                    </th>
                    <th colSpan={visibleSaleCols.length} className="text-center px-2.5 py-2 font-semibold whitespace-nowrap border-b border-[#E2E8F0] bg-[#F1F5F9] text-[#1E293B]">
                      已售权益{metricMode === "area" ? "面积" : "货值"}（{unit}）
                    </th>
                  </tr>
                  <tr className="bg-[#F1F5F9] text-[#1E293B]">
                    {visibleSaleCols.map((c) => (
                      <th
                        key={c.key}
                        className="text-right px-2.5 py-2 font-medium whitespace-nowrap border-b border-[#E2E8F0] min-w-[110px]"
                      >
                        <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1">
                          {c.label} <SortIcon k={c.key} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...sortedRows, dynamicTotalRow].map((r, idx) => {
                    const baseBg = r.isTotal
                      ? "bg-[#F8FAFC] font-semibold"
                      : idx % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]";
                    return (
                      <tr key={r.year} className={`${baseBg} hover:bg-[#F5F9FF] transition-colors`}>
                        <td className={`sticky left-0 z-[1] ${baseBg} px-2.5 py-2 text-left whitespace-nowrap border-b border-r border-[#EEF1F6] text-[#1E293B]`}>
                          {r.year}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap border-b border-r border-[#EEF1F6] text-[#1E293B]">{fmtNum(r.total == null ? null : r.total * factor)}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap border-b border-r border-[#EEF1F6] text-[#1E293B]">{fmtNum(r.sold == null ? null : r.sold * factor)}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap border-b border-r border-[#EEF1F6] text-[#1E293B] font-medium">{r.rate.toFixed(2)}%</td>
                        <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap border-b border-r border-[#EEF1F6] text-[#1E293B]">{fmtNum(r.remain == null ? null : r.remain * factor)}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap border-b border-r border-[#EEF1F6] text-[#1E293B]">{r.remainPct.toFixed(2)}%</td>
                        {visibleSaleCols.map((c) => {
                          const raw = (r as any)[c.key] as number | null;
                          return (
                            <td
                              key={c.key}
                              className={`px-2.5 py-2 text-right tabular-nums whitespace-nowrap border-b border-[#EEF1F6] ${raw == null ? "text-[#94A3B8]" : "text-[#1E293B]"}`}
                            >
                              {fmtNum(raw == null ? null : raw * factor)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          </ModuleBadge>

        </div>
      </div>
    </div>
  );
}
