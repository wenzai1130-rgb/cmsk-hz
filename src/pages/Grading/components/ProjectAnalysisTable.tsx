import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import * as XLSX from "xlsx";
import {
  enrichProjects, computeAdaptiveThresholds, fmtPct, fmtRatio,
  type ProjectAnalysisRow, type CompareMode, COMPARE_FILTER_LABEL,
} from "@/utils/analysisMetrics";
import { formatProjectName } from "@/lib/format";
import { tierOf } from "@/data/chartTheme";
import type { Caliber } from "@/components/filters/home-filters";

import { PANEL_CLS } from "../constants";
import { STAGE_LABEL, getProjectStage, type StageKey } from "../utils/stage";
import { getAnomalyReasons } from "../utils/anomaly";
import { TIER_CITY_MAP, cityOfProject } from "../utils/tier";
import { ProjectSearchInput } from "./ProjectSearchInput";
import { ScatterFilterGroup, ScatterSegmented } from "./SellThroughScatterChart";

/* ---------- Project Analysis Table (bottom) ---------- */
type SortKey =
  | "roomCount" | "onSaleRoomCount" | "snakeSellThroughRate" | "marketSellThroughRate"
  | "sellThroughCompetitiveness" | "salesFloorPrice" | "cmbValuationPrice" | "valuationSalesRatio"
  | "profitMargin" | "profitAmount";

// 与去化与利润九宫格保持一致的利润口径
const computeProfitMargin = (p: ProjectAnalysisRow): number => {
  if (!p.salesFloorPrice || p.salesFloorPrice <= 0) return 0;
  return (p.salesFloorPrice - p.marketAvgDealPrice * 0.85) / p.salesFloorPrice;
};
const computeProfitAmount = (p: ProjectAnalysisRow): number =>
  Math.max(0.01, p.remainingValue * Math.max(0.02, computeProfitMargin(p)));

type EnrichedRow = ProjectAnalysisRow & { profitMargin: number; profitAmount: number };

export function ProjectAnalysisTable({
  projects, highlightId, onPick, onHover, searchValue, onSearchChange, matchedIds,
  org, caliber, period,
}: {
  projects: ProjectAnalysisRow[];
  highlightId: string | null;
  onPick: (p: ProjectAnalysisRow) => void;
  onHover: (id: string | null) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  matchedIds?: Set<string> | null;
  org: string;
  caliber: Caliber;
  period: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("snakeSellThroughRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // 招商蛇口维度：模块内独立的城市群组 + 城市多选筛选（默认「一线城市」全选）
  const isGroup = org === "招商蛇口";
  type GKey = "all" | "t1" | "newT1" | "t2" | "t34";
  const G_LABEL: Record<GKey, string> = { all: "全部", t1: "一线城市", newT1: "新一线城市", t2: "二线城市", t34: "三四线城市" };
  const [tierGroup, setTierGroup] = useState<GKey>("t1");
  const [selectedCities, setSelectedCities] = useState<Set<string> | null>(null); // null 代表全选
  // 模块内独立筛选：对比基准 & 项目阶段
  const [tableCompareMode, setTableCompareMode] = useState<CompareMode>("street");
  const [tableStage, setTableStage] = useState<StageKey>("all");

  // 当前群组下候选城市（含项目数）
  const tierCityOptions = useMemo(() => {
    if (!isGroup) return [] as { city: string; count: number }[];
    const cnt = new Map<string, number>();
    for (const p of projects) {
      const city = cityOfProject(p);
      const t = TIER_CITY_MAP[city];
      if (tierGroup === "all" ? true : t === tierGroup) {
        cnt.set(city, (cnt.get(city) || 0) + 1);
      }
    }
    return Array.from(cnt.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
  }, [projects, tierGroup, isGroup]);

  // 切换群组时重置城市多选为「全部」
  useEffect(() => { setSelectedCities(null); }, [tierGroup]);

  const sorted = useMemo<EnrichedRow[]>(() => {
    let filtered: ProjectAnalysisRow[] = matchedIds ? projects.filter((p) => matchedIds.has(p.projectId)) : projects;
    if (isGroup) {
      const inTier = new Set(tierCityOptions.map((o) => o.city));
      filtered = filtered.filter((p) => {
        const city = cityOfProject(p);
        if (!inTier.has(city)) return false;
        if (selectedCities && !selectedCities.has(city)) return false;
        return true;
      });
    }
    if (tableStage !== "all") {
      filtered = filtered.filter((p) => getProjectStage(p.snakeSellThroughRate, p.projectId) === tableStage);
    }
    // 按模块内对比基准重算「有效市场去化率 / 去化竞争力 / 售估比」
    const rebased = enrichProjects(filtered, tableCompareMode);
    const enriched: EnrichedRow[] = rebased.map((p) => ({
      ...p,
      profitMargin: computeProfitMargin(p),
      profitAmount: computeProfitAmount(p),
    }));
    return enriched.sort((a, b) => {
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [projects, sortKey, sortDir, matchedIds, isGroup, tierCityOptions, selectedCities, tableStage, tableCompareMode]);

  // 去化竞争力档位：以当前筛选后的项目去化率 30/70 分位判定
  const compYT = useMemo(
    () => computeAdaptiveThresholds(sorted.map((p) => p.snakeSellThroughRate)),
    [sorted],
  );
  const tierOfRate = (rate: number) => tierOf(rate, compYT.low, compYT.high);


  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const Th = ({ k, label, align = "right" }: { k?: SortKey; label: string; align?: "left" | "right" }) => {
    const active = k && sortKey === k;
    return (
      <th
        onClick={() => k && toggleSort(k)}
        className={`py-2 px-2 font-normal whitespace-nowrap ${align === "right" ? "text-right" : "text-left"} ${
          k ? "cursor-pointer select-none" : ""
        } ${active ? "text-[var(--color-brand)]" : "text-muted-foreground"}`}
      >
        <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
          {label}
          {k && (
            <SortIcon active={!!active} dir={active ? sortDir : undefined} />
          )}
        </span>
      </th>
    );
  };

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [matchedIds]);
  // 联动选中：当外部气泡/图表选中或悬停某项目时，自动翻页到该行所在页
  useEffect(() => {
    if (!highlightId) return;
    const idx = sorted.findIndex((p) => p.projectId === highlightId);
    if (idx < 0) return;
    const target = Math.floor(idx / pageSize) + 1;
    setPage(target);
  }, [highlightId, sorted, pageSize]);

  const handleExport = () => {
    const headers = ["项目名称","区县","街道","房间数","在售房间数","项目去化率","市场去化率","去化竞争力","销售均价(万/㎡)","中介估值(万/㎡)","估值售价比","异常原因"];
    const rows = sorted.map((p) => {
      const hasMkt = typeof p.marketSellThroughRate === "number" && p.marketSellThroughRate > 0;
      const compText = hasMkt ? tierOfRate(p.snakeSellThroughRate).text : "-";
      return [
        formatProjectName(p.projectName), p.district, p.street, p.roomCount, p.onSaleRoomCount,
        p.snakeSellThroughRate, p.marketSellThroughRate, compText,
        p.salesFloorPrice, p.cmbValuationPrice, p.valuationSalesRatio,
        getAnomalyReasons(p).join("；") || "-",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "项目清单");
    const caliberLabel = caliber === "equity" ? "全口径-权益" : "全口径";
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const hms = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "");
    const filename = `${safe("项目清单")}_${safe(org)}_${safe(caliberLabel)}_${safe(period)}_${hms}.xlsx`;
    XLSX.writeFile(wb, filename);
  };



  return (
    <div className={`${PANEL_CLS} p-4`}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold whitespace-nowrap">项目清单</h3>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <ProjectSearchInput value={searchValue} onChange={onSearchChange} className="w-[220px]" />
          <ExportButton onClick={handleExport} />
          <span className="text-xs text-muted-foreground whitespace-nowrap">共 {sorted.length} 个项目</span>
        </div>
      </div>

      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mb-3">
        {isGroup && (
          <ScatterFilterGroup label="城市群组">
            <ScatterSegmented
              options={(Object.keys(G_LABEL) as GKey[]).map((k) => ({ k, label: G_LABEL[k] }))}
              value={tierGroup}
              onChange={setTierGroup}
            />
          </ScatterFilterGroup>
        )}
        <ScatterFilterGroup label="对比基准">
          <ScatterSegmented
            options={(["competitor", "street", "city", "nation"] as CompareMode[]).map((k) => ({
              k,
              label: COMPARE_FILTER_LABEL[k],
              disabled: k === "competitor",
              hint: k === "competitor" ? "暂无竞品数据" : undefined,
            }))}
            value={tableCompareMode}
            onChange={setTableCompareMode}
          />
        </ScatterFilterGroup>
        <ScatterFilterGroup label="项目阶段">
          <ScatterSegmented
            options={(["all", "new", "持销", "尾盘"] as StageKey[]).map((k) => ({
              k,
              label: STAGE_LABEL[k],
              hint: k === "new" ? "新盘定义：滚动 1 年（12 个月）内开盘的项目。"
                : k === "持销" ? "持销定义：项目开盘已超过 1 年，且当前整体去化率 < 95%。"
                : k === "尾盘" ? "尾盘定义：项目整体去化率 ≥ 95%。"
                : undefined,
            }))}
            value={tableStage}
            onChange={setTableStage}
          />
        </ScatterFilterGroup>
      </div>


      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F1F5F9] text-[#475569] border-b border-[#E2E8F0]">
              <Th label="项目名称" align="left" />
              <Th label="区县" align="left" />
              <Th label="街道" align="left" />
              <Th k="roomCount" label="房间数" />
              <Th k="onSaleRoomCount" label="在售房间数" />
              <Th k="snakeSellThroughRate" label="项目去化率" />
              <Th k="marketSellThroughRate" label="市场去化率" />
              <Th k="sellThroughCompetitiveness" label="去化竞争力" />
              <Th k="salesFloorPrice" label="销售均价(万/㎡)" />
              <Th k="cmbValuationPrice" label="中介估值(万/㎡)" />
              <Th k="valuationSalesRatio" label="估值售价比" />
              <Th label="异常原因" align="left" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => {
              const active = highlightId === p.projectId;
              const dash = <span className="text-muted-foreground">--</span>;
              const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
              const hasVal = isNum(p.cmbValuationPrice) && p.cmbValuationPrice > 0;
              const hasMkt = isNum(p.marketSellThroughRate) && p.marketSellThroughRate > 0;
              const hasRatio = hasVal && isNum(p.valuationSalesRatio) && p.valuationSalesRatio > 0;
              const hasComp = hasMkt && isNum(p.sellThroughCompetitiveness) && p.sellThroughCompetitiveness > 0;

              return (
                <tr
                  key={p.projectId}
                  onMouseEnter={() => onHover(p.projectId)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onPick(p)}
                  className={`border-b border-[#F1F5F9] cursor-pointer ${active ? "bg-[var(--color-brand-soft)]" : "hover:bg-[#F5F9FF]"}`}
                >
                  <td className="py-2.5 px-2 font-medium">{formatProjectName(p.projectName)}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{p.district}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{p.street}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums ${sortKey === "roomCount" ? "text-[var(--color-brand)] font-medium" : ""}`}>{p.roomCount}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums ${sortKey === "onSaleRoomCount" ? "text-[var(--color-brand)] font-medium" : ""}`}>{p.onSaleRoomCount}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums ${sortKey === "snakeSellThroughRate" ? "text-[var(--color-brand)] font-medium" : ""}`}>{fmtPct(p.snakeSellThroughRate, 2)}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums ${sortKey === "marketSellThroughRate" ? "text-[var(--color-brand)] font-medium" : ""}`}>{hasMkt ? fmtPct(p.marketSellThroughRate, 2) : dash}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-medium">
                    {hasComp ? (() => {
                      const t = tierOfRate(p.snakeSellThroughRate);
                      return <span style={{ color: t.color }}>{t.text}</span>;
                    })() : dash}
                  </td>
                  <td className={`py-2.5 px-2 text-right tabular-nums ${sortKey === "salesFloorPrice" ? "text-[var(--color-brand)] font-medium" : ""}`}>{isNum(p.salesFloorPrice) && p.salesFloorPrice > 0 ? (p.salesFloorPrice / 10000).toFixed(2) : dash}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums ${sortKey === "cmbValuationPrice" ? "text-[var(--color-brand)] font-medium" : ""}`}>{hasVal ? (p.cmbValuationPrice / 10000).toFixed(2) : dash}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums ${sortKey === "valuationSalesRatio" ? "text-[var(--color-brand)] font-medium" : ""}`}>{hasRatio ? fmtRatio(p.valuationSalesRatio) : dash}</td>
                  <td className="py-2.5 px-2 text-left">
                    {(() => {
                      const rs = getAnomalyReasons(p);
                      if (rs.length === 0) return <span className="text-muted-foreground">-</span>;
                      return (
                        <span className="inline-flex flex-wrap gap-1">
                          {rs.map((r) => (
                            <span key={r} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626] text-[11px] whitespace-nowrap">
                              {r}
                            </span>
                          ))}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-[#475569]">
        <div className="flex items-center gap-3">
          <span>共 {sorted.length} 条</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-7 px-2 rounded-md border border-[#E5E7EB] bg-white text-xs text-[#475569] hover:border-[#94A3B8] focus:outline-none"
          >
            {[10, 20, 50, 100].map((s) => (
              <option key={s} value={s}>{s}条/页</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#475569] hover:border-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
            const isActive = n === currentPage;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-7 min-w-7 px-2 rounded-md text-xs border ${isActive ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]" : "bg-white text-[#475569] border-[#E5E7EB] hover:border-[#94A3B8]"}`}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#475569] hover:border-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}


function SortIcon({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
  const upActive = active && dir === "asc";
  const downActive = active && dir === "desc";
  return (
    <span className="inline-flex flex-col leading-none ml-0.5">
      <svg width="8" height="5" viewBox="0 0 8 5" className="mb-[1px]">
        <path d="M4 0 L8 5 L0 5 Z" fill={upActive ? "var(--color-brand)" : "#CBD5E1"} />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5">
        <path d="M4 5 L0 0 L8 0 Z" fill={downActive ? "var(--color-brand)" : "#CBD5E1"} />
      </svg>
    </span>
  );
}
