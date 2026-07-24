import { useMemo, useState } from "react";
import {
  NINE_GRID_META,
  CATEGORY_META,
  computeAdaptiveThresholds,
  fmtPct,
  fmtRatio,
  type ProjectAnalysisRow,
  type CityCompanyAggregate,
} from "@/utils/analysisMetrics";
import { PANEL_CLS } from "../constants";
import { classifyNineGridLocal } from "../utils/quadrant";
import { ProjectSearchInput } from "./ProjectSearchInput";

/* 集团总览：按 cityCompany 把项目聚合成"伪项目"行（projectId 以 city: 前缀标识） */
export function buildCityCompanyQuadrantRows(projects: ProjectAnalysisRow[]): ProjectAnalysisRow[] {
  const groups = new Map<string, ProjectAnalysisRow[]>();
  projects.forEach((p) => {
    const k = p.cityCompany || "未分类";
    const arr = groups.get(k) || [];
    arr.push(p);
    groups.set(k, arr);
  });
  const aggregated: ProjectAnalysisRow[] = [];
  groups.forEach((list, city) => {
    const totalRooms = list.reduce((s, p) => s + (p.roomCount || 0), 0) || 1;
    const w = (k: keyof ProjectAnalysisRow) =>
      list.reduce((s, p) => s + (Number(p[k]) || 0) * (p.roomCount || 0), 0) / totalRooms;
    const wSnake = w("snakeSellThroughRate");
    const wMarket = w("effectiveMarketSellThroughRate");
    const cityMarketRate = list[0].cityMarketSellThroughRate || wMarket;
    const competitiveness = cityMarketRate > 0 ? wSnake / cityMarketRate : 0;
    const totalRemainingValue = list.reduce((s, p) => s + (p.remainingValue || 0), 0);
    const totalValue = list.reduce((s, p) => s + (p.totalValue || 0), 0);
    aggregated.push({
      ...list[0],
      projectId: `city:${city}`,
      projectName: city,
      cityCompany: city,
      district: "",
      street: `${list.length}`,
      businessType: list[0].businessType,
      roomCount: list.reduce((s, p) => s + (p.roomCount || 0), 0),
      onSaleRoomCount: list.reduce((s, p) => s + (p.onSaleRoomCount || 0), 0),
      snakeSellThroughRate: wSnake,
      salesFloorPrice: w("salesFloorPrice"),
      cmbValuationPrice: w("cmbValuationPrice"),
      marketAvgDealPrice: w("marketAvgDealPrice"),
      marketSellThroughRate: cityMarketRate,
      remainingValue: totalRemainingValue,
      totalValue: totalValue,
      valuationSalesRatio: w("valuationSalesRatio"),
      sellThroughCompetitiveness: competitiveness,
      sellRateGap: wSnake - cityMarketRate,
      cityMarketSellThroughRate: cityMarketRate,
      effectiveMarketSellThroughRate: cityMarketRate,
      quadrant: list[0].quadrant,
    });
  });
  const xs = aggregated.map((p) => p.valuationSalesRatio);
  const ys = aggregated.map((p) => p.sellThroughCompetitiveness);
  const xT = computeAdaptiveThresholds(xs);
  const yT = computeAdaptiveThresholds(ys);
  return aggregated.map((p) => ({
    ...p,
    quadrant: classifyNineGridLocal(p.valuationSalesRatio, p.sellThroughCompetitiveness, xT, yT),
  }));
}

export function CityCompanyAggregateTable({
  projects, searchValue, onSearchChange, onPickCity,
}: {
  projects: ProjectAnalysisRow[];
  searchValue: string;
  onSearchChange: (v: string) => void;
  onPickCity: (name: string) => void;
}) {
  type SortField = "competitiveness" | "weightedSellThroughRate" | "totalRemainingValue" | "projectCount";
  const [sortField, setSortField] = useState<SortField>("competitiveness");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const rows = useMemo<CityCompanyAggregate[]>(() => {
    const aggRows = buildCityCompanyQuadrantRows(projects);
    const aggregates: CityCompanyAggregate[] = aggRows.map((r) => ({
      cityCompany: r.cityCompany || r.projectName,
      projectCount: Number(r.street) || 0,
      totalRemainingValue: r.remainingValue,
      weightedSellThroughRate: r.snakeSellThroughRate,
      weightedMarketSellThroughRate: r.cityMarketSellThroughRate,
      competitiveness: r.sellThroughCompetitiveness,
      category: NINE_GRID_META[r.quadrant].category,
    }));
    const q = searchValue.trim().toLowerCase();
    const filtered = q
      ? aggregates.filter((r) => r.cityCompany.toLowerCase().includes(q))
      : aggregates;
    return [...filtered].sort((a, b) => {
      const va = a[sortField] as number;
      const vb = b[sortField] as number;
      return sortOrder === "desc" ? vb - va : va - vb;
    });
  }, [projects, searchValue, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder((p) => (p === "desc" ? "asc" : "desc"));
    else { setSortField(field); setSortOrder("desc"); }
  };

  const COLS = "grid-cols-[1.2fr_0.55fr_0.85fr_0.95fr_0.85fr]";
  const sortLabel: Record<SortField, string> = {
    competitiveness: "竞争力",
    weightedSellThroughRate: "加权去化率",
    totalRemainingValue: "剩余货值",
    projectCount: "项目数",
  };

  const Th = ({ field, label }: { field: SortField; label: string }) => {
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
    <div className={`${PANEL_CLS} p-4 h-[560px] flex flex-col w-full`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-sm font-semibold whitespace-nowrap">城市公司明细</h3>
          <span className="text-xs text-muted-foreground truncate hidden md:inline">
            按{sortLabel[sortField]}{sortOrder === "desc" ? "降序" : "升序"}
          </span>
        </div>
        <ProjectSearchInput value={searchValue} onChange={onSearchChange} className="w-[180px]" />
      </div>
      <div className={`text-[11px] text-muted-foreground grid ${COLS} gap-2 px-2 py-1.5 border-b border-[#EEF2F7]`}>
        <span>城市公司</span>
        <Th field="projectCount" label="项目数" />
        <Th field="totalRemainingValue" label="剩余货值(亿)" />
        <Th field="weightedSellThroughRate" label="加权去化率 / 对比城市" />
        <Th field="competitiveness" label="竞争力" />
      </div>
      <ul className="divide-y divide-[#F1F5F9] flex-1 min-h-0 overflow-y-auto">
        {rows.length === 0 && (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground">无匹配数据</li>
        )}
        {rows.map((r) => {
          const cat = CATEGORY_META[r.category];
          return (
            <li
              key={r.cityCompany}
              onClick={() => onPickCity(r.cityCompany)}
              className={`relative grid ${COLS} gap-2 items-center px-2 py-2 text-xs cursor-pointer hover:bg-[#F8FAFC]`}
              title={`点击下钻到 ${r.cityCompany}`}
            >
              <div className="min-w-0">
                <div className="truncate font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                  {r.cityCompany}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  <span className="px-1 py-px rounded" style={{ background: cat.soft, color: cat.color }}>{cat.label}</span>
                </div>
              </div>
              <span className="text-right tabular-nums text-foreground/80">{r.projectCount}</span>
              <span className={`text-right tabular-nums ${sortField === "totalRemainingValue" ? "font-medium text-[var(--color-brand)]" : "text-foreground/80"}`}>
                {r.totalRemainingValue.toFixed(2)}
              </span>
              <span className="text-right tabular-nums text-foreground/80">
                {fmtPct(r.weightedSellThroughRate, 1)} <span className="text-muted-foreground">/</span> {fmtPct(r.weightedMarketSellThroughRate, 1)}
              </span>
              <span className={`text-right tabular-nums font-medium ${r.competitiveness > 1 ? "text-green-700" : r.competitiveness < 1 ? "text-red-700" : "text-foreground/80"}`}>
                {fmtRatio(r.competitiveness)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 pt-2 border-t border-[#EEF2F7] text-[11px] text-muted-foreground flex items-center justify-between">
        <span>共 {rows.length} 个城市公司</span>
        <span>点击行下钻至该城市公司视角</span>
      </div>
    </div>
  );
}
