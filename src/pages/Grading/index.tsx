import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
  type ReactNode,
} from "react";
import {
  Sparkles,
  Building2,
  TrendingUp,
  Activity,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Info,
  Download,
  Search,
  HelpCircle,
  Play,
  Pause,
  Calendar as CalendarIcon,
} from "lucide-react";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
  Customized,
  LabelList,
} from "recharts";
import { HeaderNav } from "@/components/layout/HeaderNav";
import {
  CaliberPicker,
  DayPicker,
  ORG_TREE,
  type Caliber,
} from "@/components/filters/home-filters";
import { Building, MapPin, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
// GroupQuadrantSection 已由 GroupValueQuadrantSection 替代（共用 ProfitSellThroughQuadrant 代码）
import { ProfitSellThroughQuadrant } from "./components/ProfitSellThroughQuadrant";
import { GroupProfitQuadrantSection } from "./components/GroupProfitQuadrantSection";
import { GroupValueQuadrantSection } from "./components/GroupValueQuadrantSection";

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { shenzhenProjectAnalysisData } from "@/data/shenzhenProjectAnalysisData";
import { formatProjectName } from "@/lib/format";
import { shanghaiProjectAnalysisData } from "@/data/shanghaiProjectAnalysisData";
import { groupProjectAnalysisData } from "@/data/groupProjectAnalysisData";
import * as XLSX from "xlsx";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import {
  enrichProjects,
  NINE_GRID_META,
  CATEGORY_META,
  computeAdaptiveThresholds,
  bandOf,
  cellKeyOf,
  fmtPct,
  fmtRatio,
  // fmtMoney removed (now using fmtWan for 万/㎡ display)
  fmtWan,
  fmtYi,
  aggregateByCityCompany,
  type ProjectAnalysisRow,
  type Band,
  type Thresholds,
  type CompareMode,
  COMPARE_LABEL,
  COMPARE_FILTER_LABEL,
  type CityCompanyAggregate,
} from "@/utils/analysisMetrics";
import { usePageRequirements, ModuleBadge } from "@/components/requirements";
import { PAGE_REQUIREMENTS } from "./config/pageRequirements";
import { tierOf } from "@/data/chartTheme";

// StageKey / STAGE_LABEL / getProjectStage / monthsSinceOpen 已抽离到 utils/stage.ts
import { STAGE_LABEL, getProjectStage, type StageKey } from "./utils/stage";
import { getAnomalyReasons } from "./utils/anomaly";
import { PANEL_CLS, TOOLTIP_STYLE, BUBBLE_SIZE_META, type BubbleSizeKey } from "./constants";
import { ProjectTooltipContent } from "./components/ProjectTooltipContent";
import { MetricCards } from "./components/MetricCards";
import { TIER_COLOR, TIER_LABEL, TIER_CITY_MAP, cityOfProject, tierOfProject } from "./utils/tier";
import { CountUpText } from "./components/CountUpText";
import { QuadrantTimelinePlayer } from "./components/QuadrantTimelinePlayer";
import { TreemapCanvas, type Tile } from "./components/TreemapCanvas";
import { ProjectSearchInput } from "./components/ProjectSearchInput";
import { SellThroughScatterChart } from "./components/SellThroughScatterChart";
import { ProjectAnalysisTable } from "./components/ProjectAnalysisTable";
import { AiSummary } from "./components/AiSummary";
import { InventoryTreemapCard } from "./components/InventoryTreemapCard";
import { ProjectMiniDetailTable } from "./components/ProjectMiniDetailTable";
import { QuadrantChart } from "./components/QuadrantChart";
import { FilterPanel } from "./components/FilterPanel";

import { classifyNineGridLocal } from "./utils/quadrant";

export default function GradingPage() {
  usePageRequirements("分级分析", PAGE_REQUIREMENTS);

  const [org, setOrg] = useState("招商蛇口");
  const [caliber, setCaliber] = useState<Caliber>("equity");
  const [period, setPeriod] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [businessType, setBusinessType] = useState("住宅");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [bubbleSizeKey, setBubbleSizeKey] = useState<BubbleSizeKey>("remainingValue");
  const [compareMode, setCompareMode] = useState<CompareMode>("street");
  const [groupValueCompareMode, setGroupValueCompareMode] = useState<CompareMode>("street");
  const [stageFilter, setStageFilter] = useState<StageKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // 300ms debounce: 输入到图表/表格联动节流，避免 ECharts/Recharts 频繁重渲染
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);
  void caliber;
  void period;

  const isGroupView = org === "招商蛇口";
  // 集团视角下，从「城市公司汇总」下钻到某个城市公司的状态
  const [drillCityCompany, setDrillCityCompany] = useState<string | null>(null);
  const isGroupOverview = isGroupView && !drillCityCompany;

  // 顶部 org 切换时，清空下钻状态（下钻只在集团视角内部有意义）
  useEffect(() => {
    if (!isGroupView && drillCityCompany) setDrillCityCompany(null);
  }, [isGroupView, drillCityCompany]);

  // 集团总览下，按 cityCompany 分组只需构建一次 Map，enrich 时按需切换 compareMode 复用
  const groupByCity = useMemo(() => {
    if (!isGroupOverview) return null;
    const m = new Map<string, typeof groupProjectAnalysisData>();
    groupProjectAnalysisData.forEach((r) => {
      const arr = m.get(r.cityCompany) || [];
      arr.push(r);
      m.set(r.cityCompany, arr);
    });
    return m;
  }, [isGroupOverview]);

  const allProjects = useMemo(() => {
    if (isGroupOverview && groupByCity) {
      // 集团总览：按 cityCompany 分组分别 enrich，避免跨城共用 cityRate 失真
      const out: ProjectAnalysisRow[] = [];
      groupByCity.forEach((rows) => out.push(...enrichProjects(rows, compareMode)));
      return out;
    }
    const source = isGroupView
      ? groupProjectAnalysisData.filter((p) => p.cityCompany === drillCityCompany)
      : org === "上海公司"
        ? shanghaiProjectAnalysisData
        : shenzhenProjectAnalysisData;
    return enrichProjects(source, compareMode);
  }, [org, isGroupView, isGroupOverview, compareMode, drillCityCompany, groupByCity]);
  const projects = useMemo(() => {
    if (businessType === "全部业态") return allProjects;
    return allProjects.filter((p) => p.businessType === businessType);
  }, [allProjects, businessType]);

  // 九宫格统一以「项目」为单位（包括招商蛇口集团视角）
  const quadrantProjects = useMemo(() => {
    if (stageFilter === "all") return projects;
    return projects.filter(
      (p) => getProjectStage(p.snakeSellThroughRate, p.projectId) === stageFilter,
    );
  }, [projects, stageFilter]);
  const displayProjects = projects;
  const summaryProjects = useMemo(() => {
    if (!isGroupOverview || !groupByCity) return displayProjects;
    const out: ProjectAnalysisRow[] = [];
    groupByCity.forEach((rows) => out.push(...enrichProjects(rows, groupValueCompareMode)));
    return businessType === "全部业态" ? out : out.filter((p) => p.businessType === businessType);
  }, [isGroupOverview, groupByCity, displayProjects, groupValueCompareMode, businessType]);
  const quadrantTitle = isGroupOverview
    ? "招商蛇口 · 项目九宫格分析"
    : "项目去化与售估比九宫格分析";

  // 模糊匹配：集团总览按城市公司名，其它按项目名/编号/城市公司
  // 使用 useDeferredValue 让搜索输入保持流畅，过滤计算在低优先级中进行
  const deferredSearch = useDeferredValue(searchQuery);
  const matchedIds = useMemo<Set<string> | null>(() => {
    const q = deferredSearch.toLowerCase();
    if (!q) return null;
    const ids: string[] = [];
    for (const p of displayProjects) {
      if (
        p.projectName.toLowerCase().includes(q) ||
        p.projectId.toLowerCase().includes(q) ||
        (p.cityCompany ?? "").toLowerCase().includes(q)
      ) {
        ids.push(p.projectId);
      }
    }
    return new Set(ids);
  }, [displayProjects, deferredSearch]);

  const resetSelection = useCallback(() => {
    setSelectedId(null);
    setHoveredId(null);
  }, []);

  const highlightId = selectedId ?? hoveredId;
  const onPick = useCallback((p: ProjectAnalysisRow) => setSelectedId(p.projectId), []);
  const onHover = useCallback((id: string | null) => setHoveredId(id), []);

  const stats = useMemo(() => {
    const rows = displayProjects;
    const len = rows.length;
    const n = len || 1;
    let sumRatio = 0;
    let sumComp = 0;
    let sumSellRate = 0;
    let below = 0;
    for (let i = 0; i < len; i++) {
      const p = rows[i];
      sumRatio += p.valuationSalesRatio;
      sumComp += p.sellThroughCompetitiveness;
      sumSellRate += p.snakeSellThroughRate;
      if (p.snakeSellThroughRate < p.effectiveMarketSellThroughRate) below++;
    }
    return {
      count: len,
      avgRatio: sumRatio / n,
      avgComp: sumComp / n,
      avgSellRate: sumSellRate / n,
      below,
    };
  }, [displayProjects]);

  return (
    <div className="min-h-screen text-foreground bg-[#F5F7FB]">
      <HeaderNav active="多维分析" />
      <ModuleBadge
        moduleId="grading-filter-panel"
        className="block sticky top-16 z-30"
        badgeClassName="top-1 left-2 -translate-y-0 -translate-x-0"
      >
        <FilterPanel
          org={org}
          caliber={caliber}
          period={period}
          businessType={businessType}
          onOrg={(v) => {
            setOrg(v);
            setDrillCityCompany(null);
            resetSelection();
          }}
          onCaliber={(v) => {
            setCaliber(v);
            resetSelection();
          }}
          onPeriod={(v) => {
            setPeriod(v);
            resetSelection();
          }}
          onBusinessType={(v) => {
            setBusinessType(v);
            resetSelection();
          }}
        />
      </ModuleBadge>
      <main className="px-6 py-5 space-y-5">
        <ModuleBadge moduleId="grading-ai-summary" className="block">
          <AiSummary
            projects={summaryProjects}
            org={org}
            isGroupAggregate={false}
            yMetric={isGroupOverview ? "competitiveness" : "sellRate"}
            onPick={(id) => setSelectedId(id)}
            selectedId={selectedId}
          />
        </ModuleBadge>

        {isGroupOverview ? (
          <ModuleBadge moduleId="grading-group-value-quadrant" className="block">
            <GroupValueQuadrantSection
              selectedId={selectedId}
              onSelectedIdChange={setSelectedId}
              hoveredId={hoveredId}
              onHoveredIdChange={setHoveredId}
              compareMode={groupValueCompareMode}
              onCompareModeChange={setGroupValueCompareMode}
            />
          </ModuleBadge>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 [&>div>*]:w-full items-stretch">
            <div className="lg:col-span-7 flex flex-col gap-2">
              {isGroupView && drillCityCompany && (
                <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-white px-3 py-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setDrillCityCompany(null);
                      resetSelection();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] hover:underline"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    返回集团总览
                  </button>
                  <div className="text-xs text-muted-foreground">
                    当前：
                    <span className="font-medium text-foreground">
                      招商蛇口 › {drillCityCompany}
                    </span>
                    <span className="mx-1.5 text-[#CBD5E1]">·</span>
                    {projects.length} 个项目
                  </div>
                </div>
              )}
              <ModuleBadge moduleId="grading-quadrant" className="block">
                <QuadrantChart
                  org={org}
                  titleOverride={quadrantTitle}
                  projects={quadrantProjects}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onPick={(p) => setSelectedId(p.projectId)}
                  onHover={onHover}
                  onClearSelection={() => setSelectedId(null)}
                  selectedProject={quadrantProjects.find((p) => p.projectId === selectedId) ?? null}
                  bubbleSizeKey={bubbleSizeKey}
                  onBubbleSizeKeyChange={setBubbleSizeKey}
                  matchedIds={matchedIds}
                  compareMode={compareMode}
                  onCompareModeChange={setCompareMode}
                  isGroupView={isGroupView}
                  isGroupAggregate={false}
                  stageFilter={stageFilter}
                  onStageFilterChange={setStageFilter}
                  searchValue={searchInput}
                  onSearchChange={setSearchInput}
                />
              </ModuleBadge>
            </div>
            <div className="lg:col-span-5 flex">
              <ModuleBadge moduleId="grading-scatter" className="block w-full">
                <SellThroughScatterChart
                  projects={displayProjects}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHover={onHover}
                  onPick={onPick}
                  onClearSelection={() => setSelectedId(null)}
                  bubbleSizeKey={bubbleSizeKey}
                  matchedIds={matchedIds}
                  compareMode={compareMode}
                  isGroupAggregate={false}
                />
              </ModuleBadge>
            </div>
          </section>
        )}
        {isGroupOverview ? (
          <>
            <ModuleBadge moduleId="grading-profit-quadrant" className="block">
              <GroupProfitQuadrantSection
                selectedId={selectedId}
                onSelectedIdChange={setSelectedId}
                hoveredId={hoveredId}
                onHoveredIdChange={setHoveredId}
              />
            </ModuleBadge>
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 [&>div>*]:w-full items-stretch">
              <div className="lg:col-span-7 flex">
                <ModuleBadge moduleId="grading-scatter" className="block w-full">
                  <SellThroughScatterChart
                    projects={displayProjects}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    onHover={onHover}
                    onPick={onPick}
                    onClearSelection={() => setSelectedId(null)}
                    bubbleSizeKey={bubbleSizeKey}
                    onBubbleSizeKeyChange={setBubbleSizeKey}
                    matchedIds={matchedIds}
                    compareMode={compareMode}
                    isGroupAggregate={false}
                    groupFilterMode
                  />
                </ModuleBadge>
              </div>
              <div className="lg:col-span-5 flex">
                <ModuleBadge moduleId="grading-inventory-treemap" className="block w-full">
                  <InventoryTreemapCard
                    projects={displayProjects}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    onHover={onHover}
                    onPick={onPick}
                    businessType={businessType}
                    matchedIds={matchedIds}
                    colorByTier
                  />
                </ModuleBadge>
              </div>
            </section>
          </>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 [&>div>*]:w-full items-stretch">
            <div className="lg:col-span-7 flex">
              <ModuleBadge moduleId="grading-profit-quadrant" className="block w-full">
                <ProfitSellThroughQuadrant
                  mode="district"
                  yMetric="sellRate"
                  sizeMetric="snakeSellThroughRate"
                  projects={displayProjects}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onPick={onPick}
                  onHover={onHover}
                  onClearSelection={() => setSelectedId(null)}
                  matchedIds={matchedIds}
                />
              </ModuleBadge>
            </div>
            <div className="lg:col-span-5 flex">
              <ModuleBadge moduleId="grading-inventory-treemap" className="block w-full">
                <InventoryTreemapCard
                  projects={displayProjects}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHover={onHover}
                  onPick={onPick}
                  businessType={businessType}
                  matchedIds={matchedIds}
                />
              </ModuleBadge>
            </div>
          </section>
        )}

        <ModuleBadge moduleId="grading-project-table" className="block">
          <ProjectAnalysisTable
            projects={displayProjects}
            highlightId={isGroupView ? null : highlightId}
            onPick={onPick}
            onHover={onHover}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            matchedIds={matchedIds}
            org={org}
            caliber={caliber}
            period={period}
          />
        </ModuleBadge>
      </main>
    </div>
  );
}

// FilterPanel / GradingOrgPicker / BizTypeReadonly 已抽离到 ./components/FilterPanel

/* ---------- Summary ---------- */

/* ---------- Quadrant Chart ---------- */

// QuadrantChart 已抽离到 ./components/QuadrantChart

/* ---------- 九宫格时间沙盘播放器（与集团视图保持一致样式） ---------- */
// QuadrantSliderTicks / QuadrantTimelinePlayer / QuadrantQuickBtn 已抽离到 ./components/QuadrantTimelinePlayer

/* ---------- Project Mini Detail Table (right of quadrant) ---------- */
// ProjectMiniDetailTable 已抽离到 ./components/ProjectMiniDetailTable

/* SellThroughScatterChart 及 ScatterFilterGroup / ScatterSegmented / ScatterCityLegend
   已抽离到 ./components/SellThroughScatterChart */

/* ProjectAnalysisTable / SortIcon / computeProfitMargin / computeProfitAmount
   已抽离到 ./components/ProjectAnalysisTable */

/* ---------- Detail Drawer ---------- */
// InventoryTreemapCard 已抽离到 ./components/InventoryTreemapCard
