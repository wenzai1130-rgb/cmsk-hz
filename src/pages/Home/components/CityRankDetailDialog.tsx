import { ExportButton } from "@/components/ui/export-button";
import { useEffect, useMemo, useState } from "react";
import { X, Download, ArrowUpDown, ArrowUp, ArrowDown, Building2, Crown, Search, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ModuleBadge } from "@/components/requirements";
import { formatNumber, formatPercent } from "@/lib/format";
const fmtNum = (v: number) => formatNumber(v, { thousand: false });
const fmtPct = (v: number) => formatPercent(v);

// Kept for compatibility with callers
export type CityRankTab = "年度签约" | "月度签约" | "未售货值金额";

type Row = {
  name: string;
  group: string;
  yearTarget: number;
  yearSigned: number;
  yearAchieve: number; // %
  monthTarget: number;
  monthSigned: number;
  monthAchieve: number; // %
  unsold: number;
};

const GROUPS = [
  "全部城市群组",
  "南部城市群组",
  "北部城市群组",
  "东部城市群组",
  "中部城市群组",
  "西部城市群组",
] as const;

const CITY_BASE: { name: string; group: string }[] = [
  { name: "深圳公司", group: "南部城市群组" },
  { name: "上海公司", group: "东部城市群组" },
  { name: "广州公司", group: "南部城市群组" },
  { name: "北京公司", group: "北部城市群组" },
  { name: "杭州公司", group: "东部城市群组" },
  { name: "南京公司", group: "东部城市群组" },
  { name: "苏州公司", group: "东部城市群组" },
  { name: "成都公司", group: "西部城市群组" },
  { name: "佛山公司", group: "南部城市群组" },
  { name: "武汉公司", group: "中部城市群组" },
  { name: "宁波公司", group: "东部城市群组" },
  { name: "天津公司", group: "北部城市群组" },
  { name: "重庆公司", group: "西部城市群组" },
  { name: "长沙公司", group: "中部城市群组" },
  { name: "东莞公司", group: "南部城市群组" },
  { name: "青岛公司", group: "北部城市群组" },
  { name: "厦门公司", group: "南部城市群组" },
  { name: "西安公司", group: "西部城市群组" },
  { name: "珠海公司", group: "南部城市群组" },
  { name: "福州公司", group: "南部城市群组" },
  { name: "惠州公司", group: "南部城市群组" },
  { name: "中山公司", group: "南部城市群组" },
  { name: "昆明公司", group: "西部城市群组" },
  { name: "南宁公司", group: "南部城市群组" },
  { name: "合肥公司", group: "中部城市群组" },
  { name: "郑州公司", group: "中部城市群组" },
];

const PROJECT_POOL = [
  "海上世界", "前海湾·云璟", "公园1872", "天玺·湾", "雍景湾", "中环·璟台",
  "依云·上城", "璞悦山", "金山谷", "外滩·玺", "卓越·星河", "麓园",
  "云栖", "君汇", "御园", "华庭", "翠园", "锦绣", "湖畔里", "时代公馆",
];

function seeded(i: number, salt: number) {
  const x = Math.sin((i + 1) * 9301 + salt * 49297) * 10000;
  return x - Math.floor(x);
}

function buildRows(base: { name: string; group: string }[]): Row[] {
  return base.map((b, i) => {
    const yearSigned = +Math.max(8, Math.min(90, 90 - i * 3.1 + (seeded(i, 1) - 0.5) * 6)).toFixed(2);
    const yearTarget = +(yearSigned / (0.45 + seeded(i, 2) * 0.5)).toFixed(2);
    const yearAchieve = +((yearSigned / yearTarget) * 100).toFixed(2);
    const monthSigned = +Math.max(0.8, Math.min(12, yearSigned * (0.08 + seeded(i, 3) * 0.05))).toFixed(2);
    const monthTarget = +(monthSigned / (0.5 + seeded(i, 4) * 0.45)).toFixed(2);
    const monthAchieve = +((monthSigned / monthTarget) * 100).toFixed(2);
    const unsold = +Math.max(20, Math.min(180, 180 - i * 6 + (seeded(i, 5) - 0.5) * 18)).toFixed(2);
    return { name: b.name, group: b.group, yearTarget, yearSigned, yearAchieve, monthTarget, monthSigned, monthAchieve, unsold };
  });
}

const CITY_ROWS = buildRows(CITY_BASE);

type NumKey = Exclude<keyof Row, "name" | "group"> | "unsoldPct";

type ColDef = {
  key: NumKey;
  label: string;
  fmt: (v: number) => string;
  scale?: boolean; // amount/area metric scaled by factor
};

function getColumns(unit: string): { year: ColDef[]; month: ColDef[]; unsold: ColDef[] } {
  return {
    year: [
      { key: "yearTarget", label: `目标(${unit})`, fmt: fmtNum, scale: true },
      { key: "yearSigned", label: `完成额(${unit})`, fmt: fmtNum, scale: true },
      { key: "yearAchieve", label: "完成率", fmt: fmtPct },
    ],
    month: [
      { key: "monthTarget", label: `目标(${unit})`, fmt: fmtNum, scale: true },
      { key: "monthSigned", label: `完成额(${unit})`, fmt: fmtNum, scale: true },
      { key: "monthAchieve", label: "完成率", fmt: fmtPct },
    ],
    unsold: [
      { key: "unsold", label: `未售货值(${unit})`, fmt: fmtNum, scale: true },
      { key: "unsoldPct", label: "占比", fmt: fmtPct },
    ],
  };
}

export function CityRankDetailDialog({
  open,
  onClose,
  factor = 1,
  unit = "亿",
  date,
  org = "招商蛇口",
  caliberLabel = "权益口径",
  tab = "年度签约",
  mode = "city",
}: {
  open: boolean;
  onClose: () => void;
  tab?: CityRankTab;
  factor?: number;
  unit?: string;
  date?: string;
  org?: string;
  caliberLabel?: string;
  mode?: "city" | "project";
}) {
  const isProject = mode === "project";
  const [keyword, setKeyword] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("全部城市群组");
  const defaultSortKey: NumKey = tab === "月度签约" ? "monthSigned" : tab === "未售货值金额" ? "unsold" : "yearAchieve";
  const [sortKey, setSortKey] = useState<NumKey>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  useEffect(() => { setSortKey(defaultSortKey); setSortDir("desc"); }, [defaultSortKey, open]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const cols = useMemo(() => getColumns(unit), [unit]);
  const allCols: ColDef[] = [...cols.year, ...cols.month, ...cols.unsold];

  // Project mode: build rows from project pool prefixed by org
  const sourceRows = useMemo<Row[]>(() => {
    if (isProject) {
      const prefix = org.replace("公司", "");
      const base = PROJECT_POOL.map((p) => ({ name: `${prefix}·${p}`, group: org }));
      return buildRows(base);
    }
    return CITY_ROWS;
  }, [isProject, org]);

  useEffect(() => { setPage(1); }, [keyword, group, pageSize, sortKey, sortDir, isProject]);

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

  // Compute total unsold (post-filter excluding the current row would be over-engineering; use whole filtered set sum)
  const filtered = useMemo(() => {
    let arr = sourceRows.filter((r) =>
      (isProject || group === "全部城市群组" || r.group === group) &&
      (keyword.trim() === "" || r.name.includes(keyword.trim()))
    );
    const totalUnsold = arr.reduce((s, r) => s + r.unsold, 0) || 1;
    const withPct = arr.map((r) => ({ ...r, unsoldPct: +((r.unsold / totalUnsold) * 100).toFixed(2) }));
    withPct.sort((a, b) => {
      const av = (a as any)[sortKey] as number;
      const bv = (b as any)[sortKey] as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return withPct;
  }, [sourceRows, isProject, group, keyword, sortKey, sortDir]);

  if (!open) return null;

  const toggleSort = (k: NumKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: NumKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-[var(--color-brand)]" />
      : <ArrowDown className="w-3 h-3 text-[var(--color-brand)]" />;
  };

  const nameLabel = isProject ? "项目" : "城市公司";
  const titleText = isProject ? `${org}·项目排名详情` : "城市公司排名详情";
  const pctTip = isProject
    ? "占比 = 该项目未售货值 / 当前筛选项目未售合计 ×100%"
    : "占比 = 该公司未售货值 / 当前筛选公司未售合计 ×100%";

  const onExport = () => {
    const headers = [
      "排名", ...(isProject ? [] : ["城市群组"]), nameLabel,
      `年度目标(${unit})`, `年度完成额(${unit})`, "年度完成率(%)",
      `月度目标(${unit})`, `月度完成额(${unit})`, "月度完成率(%)",
      `未售货值(${unit})`, "未售占比(%)",
    ];
    const body = filtered.map((r, i) => [
      i + 1, ...(isProject ? [] : [r.group]), r.name,
      +(r.yearTarget * factor).toFixed(2), +(r.yearSigned * factor).toFixed(2), +r.yearAchieve.toFixed(2),
      +(r.monthTarget * factor).toFixed(2), +(r.monthSigned * factor).toFixed(2), +r.monthAchieve.toFixed(2),
      +(r.unsold * factor).toFixed(2), +r.unsoldPct.toFixed(2),
    ]);
    const avgRow = [
      "均值", ...(isProject ? [] : [group]), "全部平均",
      +(avg("yearTarget") * factor).toFixed(2), +(avg("yearSigned") * factor).toFixed(2), +avg("yearAchieve").toFixed(2),
      +(avg("monthTarget") * factor).toFixed(2), +(avg("monthSigned") * factor).toFixed(2), +avg("monthAchieve").toFixed(2),
      +(avg("unsold") * factor).toFixed(2), +avg("unsoldPct").toFixed(2),
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, avgRow, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isProject ? "项目排名" : "城市公司排名");
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const dateStr = (date || "").replaceAll("-", "");
    const moduleName = isProject ? "项目排名" : "城市公司排名";
    XLSX.writeFile(wb, `${moduleName}_${org}_${caliberLabel}_${dateStr}_${ts}.xlsx`);
    toast.success(`${moduleName}已导出`);
  };

  const total = filtered.length;
  const totalPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPage);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const n = filtered.length || 1;
  const avg = (k: NumKey) => +(filtered.reduce((s, r) => s + ((r as any)[k] as number), 0) / n).toFixed(2);

  return (
    <TooltipProvider delayDuration={120}>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <ModuleBadge
        moduleId="city-rank-detail"
        className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col"
        style={{ width: "90vw", height: "90vh", maxWidth: 1600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl">
        {/* Title */}
        <div className="h-12 px-5 flex items-center justify-between border-b border-[#EEF1F6] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </span>
            <span className="text-[16px] font-semibold text-[#1E293B]">{titleText}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9]" aria-label="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col bg-[#FAFBFD]">
          {/* Toolbar */}
          <div className="px-5 py-2.5 flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={isProject ? "搜索项目" : "搜索城市公司"}
                className="h-7 w-48 pl-8 pr-2 text-[12px] rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>
            {!isProject && (
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as any)}
                className="h-7 px-2 text-[12px] rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] focus:outline-none focus:border-[var(--color-brand)]"
              >
                {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            <ExportButton onClick={onExport} className="ml-auto" />
          </div>

          {/* Table */}
          <div className="px-5 pb-3 flex-1 min-h-0">
            <div className="bg-white rounded-xl border border-[#E2E8F0] flex flex-col h-full overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead className="sticky top-0 z-[2] bg-[#F1F5F9]">
                    {/* Group header row */}
                    <tr className="text-[#475569]">
                      <th rowSpan={2} className="h-8 px-2 text-left font-medium border-b border-[#E2E8F0] whitespace-nowrap" style={{ width: 56 }}>排名</th>
                      {!isProject && (
                        <th rowSpan={2} className="h-8 px-2 text-left font-medium border-b border-[#E2E8F0] whitespace-nowrap" style={{ width: 110 }}>城市群组</th>
                      )}
                      <th rowSpan={2} className="h-8 px-2 text-left font-medium border-b border-[#E2E8F0] whitespace-nowrap" style={{ width: isProject ? 180 : 120 }}>{nameLabel}</th>
                      <th colSpan={3} className="h-7 px-2 text-center font-medium border-l border-b border-[#E2E8F0] bg-[#E6EEFB] text-[var(--color-brand)]">年度</th>
                      <th colSpan={3} className="h-7 px-2 text-center font-medium border-l border-b border-[#E2E8F0] bg-[#ECFDF5] text-[#047857]">月度</th>
                      <th colSpan={2} className="h-7 px-2 text-center font-medium border-l border-b border-[#E2E8F0] bg-[#FFF7ED] text-[#C2410C]">未售</th>
                    </tr>
                    <tr className="text-[#475569]">
                      {cols.year.map((c) => (
                        <th key={c.key} className="h-7 px-2 text-right font-normal border-b border-l border-[#E2E8F0] whitespace-nowrap bg-[#F5F9FF]">
                          <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 cursor-pointer">
                            {c.label}<SortIcon k={c.key} />
                          </button>
                        </th>
                      ))}
                      {cols.month.map((c) => (
                        <th key={c.key} className="h-7 px-2 text-right font-normal border-b border-l border-[#E2E8F0] whitespace-nowrap bg-[#F0FDF4]">
                          <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 cursor-pointer">
                            {c.label}<SortIcon k={c.key} />
                          </button>
                        </th>
                      ))}
                      {cols.unsold.map((c) => (
                        <th key={c.key} className="h-7 px-2 text-right font-normal border-b border-l border-[#E2E8F0] whitespace-nowrap bg-[#FFF7ED]">
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 cursor-pointer">
                              {c.label}<SortIcon k={c.key} />
                            </button>
                            {c.key === "unsoldPct" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex"><Info className="w-3 h-3 text-[#94A3B8] hover:text-[#C2410C] cursor-help" /></span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[260px] text-[12px] leading-relaxed">
                                  {pctTip}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                    {/* Average row (in thead so it sticks with header, no gap) */}
                    <tr className="bg-[#F8FAFC] text-[#1E293B]" style={{ height: 32 }}>
                      <td className="px-2 text-left border-t border-[#E2E8F0]">
                        <span className="px-1.5 h-4 inline-flex items-center rounded text-[10px] font-medium bg-[#E6EEFB] text-[var(--color-brand)]">均值</span>
                      </td>
                      {!isProject && (
                        <td className="px-2 text-left text-[#64748B] border-t border-[#E2E8F0]">{group}</td>
                      )}
                      <td className="px-2 text-left font-medium border-t border-[#E2E8F0]">全部平均</td>
                      {allCols.map((c) => {
                        const v = c.scale ? +(avg(c.key) * factor).toFixed(2) : avg(c.key);
                        return (
                          <td key={c.key} className="px-2 text-right border-l border-t border-[#E2E8F0]">
                            <span className="tabular-nums font-semibold">
                              {filtered.length === 0 ? "--" : c.fmt(v)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>

                    {pageRows.map((r, idx) => {
                      const i = pageStart + idx;
                      const top3 = i < 3 && sortKey === "yearSigned" && sortDir === "desc";
                      const crownColor = ["#F5A524", "#94A3B8", "#D97757"][i];
                      return (
                        <tr key={r.name} className="border-b border-[#EEF1F6] hover:bg-[#F5F9FF]" style={{ height: 32 }}>
                          <td className="px-2 text-left">
                            {top3 ? (
                              <span className="inline-flex items-center gap-1">
                                <Crown className="w-3 h-3" style={{ color: crownColor }} fill={crownColor} />
                                <span className="tabular-nums font-semibold" style={{ color: crownColor }}>{i + 1}</span>
                              </span>
                            ) : (
                              <span className="tabular-nums text-[#64748B]">{i + 1}</span>
                            )}
                          </td>
                          {!isProject && (
                            <td className="px-2 text-left text-[#64748B]">{r.group}</td>
                          )}
                          <td className="px-2 text-left text-[#1E293B] font-medium">{r.name}</td>
                          {allCols.map((c) => {
                            const raw = (r as any)[c.key] as number;
                            const v = c.scale ? +(raw * factor).toFixed(2) : raw;
                            const active = sortKey === c.key;
                            const isUnsoldCol = c.key === "unsold" || c.key === "unsoldPct";
                            return (
                              <td
                                key={c.key}
                                className={`px-2 text-right border-l border-[#EEF1F6] ${active ? "bg-[#F5F9FF]" : ""}`}
                              >
                                <span
                                  className={`tabular-nums ${active ? "font-semibold text-[var(--color-brand)]" : isUnsoldCol ? "font-medium text-[#C2410C]" : "text-[#1E293B]"}`}
                                >
                                  {c.fmt(v)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={(isProject ? 2 : 3) + allCols.length} className="text-center text-[#94A3B8] py-12 text-[13px]">无匹配数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pager
                total={total}
                page={safePage}
                pageSize={pageSize}
                totalPage={totalPage}
                onPage={setPage}
                onPageSize={setPageSize}
              />
            </div>
          </div>
        </div>
        </div>
        </ModuleBadge>
    </div>
    </TooltipProvider>
  );
}

function buildPageList(current: number, totalPage: number): (number | "...")[] {
  if (totalPage <= 7) return Array.from({ length: totalPage }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPage - 1, current + 1);
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPage - 1) pages.push("...");
  pages.push(totalPage);
  return pages;
}

function Pager({
  total, page, pageSize, totalPage, onPage, onPageSize,
}: {
  total: number; page: number; pageSize: number; totalPage: number;
  onPage: (p: number) => void; onPageSize: (s: number) => void;
}) {
  const pages = buildPageList(page, totalPage);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPage;
  return (
    <div className="h-10 px-3 flex items-center justify-between text-[12px] text-[#64748B] border-t border-[#EEF1F6] bg-white shrink-0">
      <div>共 <span className="text-[#1E293B] font-medium tabular-nums">{total}</span> 条</div>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-6 px-1.5 text-[12px] rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] focus:outline-none focus:border-[var(--color-brand)]"
          >
            {[20, 50, 100].map((n) => <option key={n} value={n}>{n} 条</option>)}
          </select>
        </div>
        <div className="inline-flex items-center gap-0.5">
          <button
            onClick={() => !prevDisabled && onPage(page - 1)}
            disabled={prevDisabled}
            className={`w-6 h-6 inline-flex items-center justify-center rounded-md border ${prevDisabled ? "border-[#EEF1F6] text-[#CBD5E1] cursor-not-allowed" : "border-[#E2E8F0] text-[#475569] hover:text-[var(--color-brand)]"}`}
            aria-label="上一页"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`e-${idx}`} className="w-6 h-6 inline-flex items-center justify-center text-[#94A3B8]">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded-md text-[12px] tabular-nums ${p === page ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold" : "text-[#475569] hover:bg-[#F1F5F9]"}`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => !nextDisabled && onPage(page + 1)}
            disabled={nextDisabled}
            className={`w-6 h-6 inline-flex items-center justify-center rounded-md border ${nextDisabled ? "border-[#EEF1F6] text-[#CBD5E1] cursor-not-allowed" : "border-[#E2E8F0] text-[#475569] hover:text-[var(--color-brand)]"}`}
            aria-label="下一页"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
