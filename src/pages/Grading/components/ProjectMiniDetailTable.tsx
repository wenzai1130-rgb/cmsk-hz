import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatProjectName } from "@/lib/format";
import {
  fmtPct,
  fmtRatio,
  COMPARE_LABEL,
  type ProjectAnalysisRow,
  type CompareMode,
} from "@/utils/analysisMetrics";
import { PANEL_CLS, type BubbleSizeKey } from "../constants";
import { ProjectSearchInput } from "./ProjectSearchInput";

type MiniSortField = "remainingValue" | "salesFloorPrice" | "valuationSalesRatio" | "sellThroughCompetitiveness";

export function ProjectMiniDetailTable({
  projects, selectedId, highlightId, onPick, onHover, onClearSelection: _onClearSelection, bubbleSizeKey,
  searchValue, onSearchChange, matchedIds, compareMode,
}: {
  projects: ProjectAnalysisRow[];
  selectedId: string | null;
  highlightId: string | null;
  onPick: (p: ProjectAnalysisRow) => void;
  onHover: (id: string | null) => void;
  onClearSelection: () => void;
  bubbleSizeKey: BubbleSizeKey;
  searchValue: string;
  onSearchChange: (v: string) => void;
  matchedIds?: Set<string> | null;
  compareMode: CompareMode;
}) {
  const [sortField, setSortField] = useState<MiniSortField>(
    bubbleSizeKey === "remainingValue" ? "remainingValue" : "salesFloorPrice"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const defaultField = bubbleSizeKey === "remainingValue" ? "remainingValue" : "salesFloorPrice";
    setSortField(defaultField);
    setSortOrder("desc");
  }, [bubbleSizeKey]);

  const list = useMemo(() => {
    const filtered = matchedIds ? projects.filter((p) => matchedIds.has(p.projectId)) : projects;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sortField] as number;
      const vb = b[sortField] as number;
      return sortOrder === "desc" ? vb - va : va - vb;
    });
    return arr;
  }, [projects, sortField, sortOrder, matchedIds]);

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  useEffect(() => { setPage(1); }, [sortField, sortOrder, pageSize, projects, matchedIds]);
  useEffect(() => {
    if (!selectedId) return;
    const idx = list.findIndex((p) => p.projectId === selectedId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / pageSize) + 1;
    setPage((prev) => (prev === targetPage ? prev : targetPage));
  }, [selectedId, list, pageSize]);
  const currentPage = Math.min(page, totalPages);
  const pageList = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const COLS = "grid-cols-[1.2fr_0.85fr_0.95fr_0.8fr_0.85fr]";

  const sortLabel: Record<MiniSortField, string> = {
    remainingValue: "剩余货值",
    salesFloorPrice: "销售均价",
    valuationSalesRatio: "估值售价比",
    sellThroughCompetitiveness: "去化竞争力",
  };

  const toggleSort = (field: MiniSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const Th = ({ field, label }: { field: MiniSortField; label: string }) => {
    const active = sortField === field;
    const arrow = active ? (sortOrder === "desc" ? "↓" : "↑") : "";
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className={`text-right inline-flex items-center justify-end gap-0.5 cursor-pointer select-none whitespace-nowrap ${
          active ? "text-[var(--color-brand)] font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
        <span className={`${active ? "text-[var(--color-brand)]" : "text-[#CBD5E1]"} font-mono text-[10px] leading-none`}>
          {arrow || "↕"}
        </span>
      </button>
    );
  };

  return (
    <div className={`${PANEL_CLS} p-4 h-full min-h-[560px] flex flex-col w-full`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-sm font-semibold whitespace-nowrap">项目明细</h3>
          <span className="text-xs text-muted-foreground truncate hidden md:inline">
            按{sortLabel[sortField]}{sortOrder === "desc" ? "降序" : "升序"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ProjectSearchInput value={searchValue} onChange={onSearchChange} className="w-[180px]" />
        </div>
      </div>
      <div className={`text-[11px] text-muted-foreground grid ${COLS} gap-2 px-2 py-1.5 border-b border-[#EEF2F7]`}>
        <span>项目</span>
        <Th field="remainingValue" label="剩余货值(亿)" />
        <Th field="salesFloorPrice" label="销售均价(万/㎡)" />
        <Th field="valuationSalesRatio" label="估值售价比" />
        <Th field="sellThroughCompetitiveness" label="去化竞争力" />
      </div>
      <ul className="divide-y divide-[#F1F5F9] flex-1 min-h-0 overflow-y-auto">
        {pageList.map((p) => {
          const isSelected = selectedId === p.projectId;
          const isHover = !isSelected && highlightId === p.projectId;
          return (
            <li
              key={p.projectId}
              onMouseEnter={() => onHover(p.projectId)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onPick(p)}
              className={`relative grid ${COLS} gap-2 items-center px-2 py-2 text-xs cursor-pointer ${
                isSelected ? "bg-[var(--color-brand-soft)]" : isHover ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
              }`}
            >
              {isSelected && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[var(--color-brand)]" />}
              <div className="min-w-0">
                <div className="truncate font-medium">{formatProjectName(p.projectName)}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  项目 {fmtPct(p.snakeSellThroughRate, 2)} / {COMPARE_LABEL[compareMode]} {fmtPct(p.effectiveMarketSellThroughRate, 2)}
                </div>
              </div>
              <span className={`text-right tabular-nums ${sortField === "remainingValue" ? "font-medium text-[var(--color-brand)]" : "text-foreground/80"}`}>
                {p.remainingValue.toFixed(2)}
              </span>
              <span className={`text-right tabular-nums ${sortField === "salesFloorPrice" ? "font-medium text-[var(--color-brand)]" : "text-foreground/80"}`}>
                {(p.salesFloorPrice / 10000).toFixed(2)}
              </span>
              <span className={`text-right tabular-nums ${sortField === "valuationSalesRatio" ? "font-medium text-[var(--color-brand)]" : "text-foreground/80"}`}>
                {fmtRatio(p.valuationSalesRatio)}
              </span>
              <span className={`text-right tabular-nums ${sortField === "sellThroughCompetitiveness" ? "font-medium text-[var(--color-brand)]" : "text-foreground/80"}`}>
                {fmtRatio(p.sellThroughCompetitiveness)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#EEF2F7] text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>共 {list.length} 条</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
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
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-foreground/70 hover:border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded border text-[11px] ${
                n === currentPage
                  ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                  : "bg-white text-foreground/70 border-[#E2E8F0] hover:border-[#CBD5E1]"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-foreground/70 hover:border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
