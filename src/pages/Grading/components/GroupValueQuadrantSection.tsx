import { useMemo, useState } from "react";

import {
  type CompareMode, COMPARE_FILTER_LABEL, enrichProjects,
} from "@/utils/analysisMetrics";
import { groupProjectAnalysisData } from "@/data/groupProjectAnalysisData";
import { ProfitSellThroughQuadrant } from "./ProfitSellThroughQuadrant";
import {
  GROUP_LABEL, STAGE_LABEL, STAGE_HINT,
  CityLegend, FilterGroup, SegmentedSmall,
  useGroupQuadrantState,
  type GroupKey, type StageKey,
} from "./group/GroupQuadrantShared";
import { ProjectListPanel } from "./group/ProjectListPanel";

export function GroupValueQuadrantSection({
  selectedId: selectedIdProp,
  onSelectedIdChange,
  hoveredId: hoveredIdProp,
  onHoveredIdChange,
  compareMode: compareModeProp,
  onCompareModeChange,
  hideProjectList = false,
  hideGroupFilter = false,
  focusProjectId,
}: {
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
  hoveredId?: string | null;
  onHoveredIdChange?: (id: string | null) => void;
  compareMode?: CompareMode;
  onCompareModeChange?: (mode: CompareMode) => void;
  hideProjectList?: boolean;
  hideGroupFilter?: boolean;
  focusProjectId?: string;
} = {}) {
  const [sizeMetric, setSizeMetric] = useState<"remainingValue" | "salesFloorPrice">("remainingValue");
  const [compareModeInner, setCompareModeInner] = useState<CompareMode>("street");
  const [rateRange, setRateRange] = useState<"cumulative" | "m12" | "m3">("cumulative");
  const compareMode = compareModeProp ?? compareModeInner;
  const setCompareMode = (mode: CompareMode) => {
    if (onCompareModeChange) onCompareModeChange(mode);
    else setCompareModeInner(mode);
  };


  const s = useGroupQuadrantState({
    selectedIdProp, onSelectedIdChange, hoveredIdProp, onHoveredIdChange,
    compareMode,
  });

  const focusProjects = useMemo(() => {
    if (!focusProjectId) return null;
    const row = groupProjectAnalysisData.find((p) => p.projectId === focusProjectId);
    if (!row) return [];
    return enrichProjects([row], compareMode);
  }, [focusProjectId, compareMode]);


  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 flex flex-col gap-4 w-full">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">项目去化与售估比九宫格分析</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            横轴是售估比（销售均价 / 中介估值），纵轴是将项目去化率分别与所在板块/所在城市/全国的所有项目进行排名，然后按照前30/后30分成3档，根据项目的去化竞争力和售估比，定位项目所在去化竞争力档位与售估比区间，气泡大小为剩余货值，左下角的项目去化弱价格也低，需要重点关注。
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">


          <FilterGroup label="对比基准">
            <SegmentedSmall
              options={(["competitor", "street", "city", "nation"] as CompareMode[]).map((k) => ({
                k,
                label: COMPARE_FILTER_LABEL[k],
                disabled: k === "competitor",
                hint: k === "competitor" ? "暂无竞品数据" : undefined,
              }))}
              value={compareMode}
              onChange={setCompareMode}
            />
          </FilterGroup>
          <FilterGroup label="项目去化率">
            <SegmentedSmall
              options={[
                { k: "cumulative" as const, label: "累计" },
                { k: "m12" as const, label: "近12个月" },
                { k: "m3" as const, label: "近3个月" },
              ]}
              value={rateRange}
              onChange={setRateRange}
            />
          </FilterGroup>
          <FilterGroup label="气泡大小">
            <SegmentedSmall
              options={[
                { k: "remainingValue" as const, label: "剩余货值" },
                { k: "salesFloorPrice" as const, label: "销售均价" },
              ]}
              value={sizeMetric}
              onChange={setSizeMetric}
            />
          </FilterGroup>

          <FilterGroup label="项目阶段">
            <SegmentedSmall
              options={(Object.keys(STAGE_LABEL) as StageKey[]).map((k) => ({ k, label: STAGE_LABEL[k], hint: STAGE_HINT[k] }))}
              value={s.stage}
              onChange={s.setStage}
            />
          </FilterGroup>
        </div>
      </div>

      {!focusProjectId && (
        <div className="flex items-center gap-5 w-full flex-wrap">
          {!hideGroupFilter && (
            <div className="shrink-0">
              <FilterGroup label="城市群组">
                <SegmentedSmall
                  options={(Object.keys(GROUP_LABEL) as GroupKey[]).map((k) => ({ k, label: GROUP_LABEL[k] }))}
                  value={s.group}
                  onChange={s.setGroup}
                />
              </FilterGroup>
            </div>
          )}
          <div className="flex-1 min-w-0 flex justify-start">
            <CityLegend
              cities={s.cities}
              counts={s.counts}
              hidden={s.hiddenCities}
              solo={s.soloCity}
              onToggle={(c) => {
                s.setSoloCity(null);
                s.setHiddenCities((prev) => {
                  const next = new Set(prev);
                  if (next.has(c)) next.delete(c); else next.add(c);
                  return next;
                });
              }}
              onSolo={(c) => {
                s.setHiddenCities(new Set());
                s.setSoloCity((prev) => (prev === c ? null : c));
              }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <ProfitSellThroughQuadrant
            bare
            colorByCity
            mode="value"
            yMetric="competitiveness"
            sizeMetric={sizeMetric}
            projects={focusProjects ?? (s.matchedIds ? s.filtered.filter((p) => s.matchedIds!.has(p.projectId)) : s.filtered)}
            selectedId={s.selectedId}
            hoveredId={s.hoveredId}
            onPick={(p) => s.setSelectedId(s.selectedId === p.projectId ? null : p.projectId)}
            onHover={s.setHoveredId}
            onClearSelection={() => s.setSelectedId(null)}
            matchedIds={s.matchedIds}
          />
        </div>
        {!hideProjectList && (
          <ProjectListPanel
            projects={s.filtered}
            selectedId={s.selectedId}
            hoveredId={s.hoveredId}
            onHover={s.setHoveredId}
            onSelect={(id) => s.setSelectedId(id)}
            query={s.searchInput}
            onQueryChange={s.setSearchInput}
          />
        )}
      </div>
    </div>
  );
}
