import { useState } from "react";
import { formatProjectName } from "@/lib/format";
import {
  NINE_GRID_META,
  COMPARE_LABEL,
  computeAdaptiveThresholds,
  fmtYi,
  type ProjectAnalysisRow,
  type Thresholds,
} from "@/utils/analysisMetrics";
import { tierOf } from "@/data/chartTheme";
import { getAnomalyReasons } from "../utils/anomaly";
import { classifyNineGridLocal } from "../utils/quadrant";
import { PANEL_CLS } from "../constants";

/**
 * AI 总结摘要卡片
 * 依据当前筛选后的项目集合，按九宫格分类统计优势/观察/关注区数量，
 * 并把关注区项目按压力值（剩余货值 × (1-竞争力)) 降序展示为可点击的联动链接。
 */
export function AiSummary({
  projects,
  org,
  isGroupAggregate,
  yMetric = "sellRate",
  onPick,
  selectedId,
}: {
  projects: ProjectAnalysisRow[];
  org: string;
  isGroupAggregate?: boolean;
  yMetric?: "sellRate" | "competitiveness";
  onPick?: (id: string) => void;
  selectedId?: string | null;
}) {
  const shortName = (n: string) => formatProjectName(n);
  const unitMeasure = isGroupAggregate ? "家" : "个";

  const headerChip = (
    <div className="flex items-center gap-2 text-xs">
      <span className="px-2 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium">
        总结摘要
      </span>
      <span className="text-muted-foreground">基于当前分析结果自动生成</span>
    </div>
  );

  const analysable = projects.filter((p) => getAnomalyReasons(p).length === 0);
  const totalAll = projects.length;
  const abnormalCount = totalAll - analysable.length;

  const COLLAPSE_LIMIT = 3;
  const [expanded, setExpanded] = useState(false);

  if (!totalAll) {
    return (
      <div className={`${PANEL_CLS} p-4`}>
        {headerChip}
        <p className="mt-1.5 text-sm leading-6 text-foreground">
          当前筛选条件下暂无可分析{isGroupAggregate ? "的城市公司" : "项目"}，请调整组织、时间、业态或口径后查看。
        </p>
      </div>
    );
  }

  const xT: Thresholds = { low: 0.9, high: 1.1 };
  const chartSample = analysable.filter(
    (p) => p.valuationSalesRatio > 0 && p.valuationSalesRatio <= 2 && p.sellThroughCompetitiveness > 0,
  );
  const getSummaryYValue = (p: ProjectAnalysisRow) =>
    yMetric === "competitiveness" ? p.sellThroughCompetitiveness : p.snakeSellThroughRate;
  const yT: Thresholds = computeAdaptiveThresholds(
    chartSample.map(getSummaryYValue),
    yMetric === "competitiveness" ? { low: 0.9, high: 1.1 } : { low: 0.3, high: 0.7 },
  );
  const withQ = analysable.map((p) => ({ p, q: classifyNineGridLocal(p.valuationSalesRatio, getSummaryYValue(p), xT, yT) }));

  const cnt = { advantage: 0, watch: 0, concern: 0 };
  withQ.forEach(({ q }) => { cnt[NINE_GRID_META[q].category]++; });

  const concernList = withQ
    .filter(({ q }) => NINE_GRID_META[q].category === "concern")
    .map(({ p }) => p)
    .sort((a, b) => (b.remainingValue * (1 - b.sellThroughCompetitiveness)) - (a.remainingValue * (1 - a.sellThroughCompetitiveness)));

  const shouldCollapse = concernList.length > COLLAPSE_LIMIT;
  const visibleConcern = expanded || !shouldCollapse ? concernList : concernList.slice(0, COLLAPSE_LIMIT);
  const hiddenCount = concernList.length - visibleConcern.length;

  return (
    <div className={`${PANEL_CLS} p-4`}>
      {headerChip}
      <p className="mt-2 text-sm leading-7 text-foreground">
        当前{org}共 <b>{totalAll}</b> {unitMeasure}{isGroupAggregate ? "城市公司" : "住宅项目"}列入分析，
        对比{COMPARE_LABEL[analysable[0]?.compareMode ?? "street"]}<b className="text-[#10B981]"> {cnt.advantage}</b>{unitMeasure}处于优势区、
        <b className="text-[#EAB308]"> {cnt.watch}</b>{unitMeasure}处于观察区、
        <b className="text-[#DC2626]"> {cnt.concern}</b>{unitMeasure}处于关注区

        {concernList.length > 0 && (
          <>
            ，其中关注区分别为
            {visibleConcern.map((p, i) => (
              <span key={p.projectId}>
                {i > 0 ? "、" : ""}
                <button
                  type="button"
                  onClick={() => onPick?.(p.projectId)}
                  className={`mx-0.5 underline underline-offset-2 font-semibold text-[#DC2626] hover:text-[#B91C1C] ${selectedId === p.projectId ? "bg-[#FEF2F2] px-1 rounded" : ""}`}
                >
                  {shortName(p.projectName)}
                </button>
                {(() => {
                  const rate = getSummaryYValue(p);
                  const tier = tierOf(rate, yT.low, yT.high);
                  return (
                    <>
                      （去化竞争力 <span style={{ color: tier.color }} className="font-medium">{tier.text}</span> / 售估比 {p.valuationSalesRatio.toFixed(2)} / 剩余货值 {fmtYi(p.remainingValue)}）
                    </>
                  );
                })()}
              </span>
            ))}
            {shouldCollapse && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium text-[#1677FF] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-colors"
              >
                {expanded ? "收起" : `+${hiddenCount} 展开更多`}
              </button>
            )}
          </>
        )}
        。点击项目名称可在九宫格中高亮联动。
      </p>
      {abnormalCount > 0 && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          备注：其中 <b className="text-[#F59E0B] font-medium">{abnormalCount}</b> {unitMeasure}因数据质量问题未在九宫格中展示，仅保留于明细表。
        </p>
      )}
    </div>
  );
}
