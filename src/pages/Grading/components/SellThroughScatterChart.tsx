import { useMemo, useState, useEffect, useRef } from "react";
import { Search, X, HelpCircle } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine, ResponsiveContainer, Cell, Customized,
} from "recharts";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  enrichProjects, fmtPct, fmtYi,
  type ProjectAnalysisRow, type CompareMode,
  COMPARE_LABEL, COMPARE_FILTER_LABEL,
} from "@/utils/analysisMetrics";
import { formatProjectName } from "@/lib/format";
import { TIER_COLOR as SEMANTIC_TIER } from "@/data/chartTheme";

import { PANEL_CLS, TOOLTIP_STYLE, BUBBLE_SIZE_META, type BubbleSizeKey } from "../constants";
import { STAGE_LABEL, getProjectStage, type StageKey } from "../utils/stage";
import { getAnomalyReasons } from "../utils/anomaly";
import { TIER_COLOR, TIER_CITY_MAP, cityOfProject } from "../utils/tier";

/* ---------- Scatter Chart 内部筛选辅助组件（样式与九宫格 FilterGroup/SegmentedSmall/CityLegend 保持一致） ---------- */
export function ScatterFilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      {children}
    </div>
  );
}

export function ScatterSegmented<T extends string>({
  options, value, onChange,
}: { options: { k: T; label: string; hint?: string; disabled?: boolean }[]; value: T; onChange: (v: T) => void }) {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="inline-flex rounded-md border border-[#E2E8F0] bg-white p-0.5 text-[11px]">
        {options.map((o) => {
          const active = value === o.k;
          return (
            <div key={o.k} className="inline-flex items-center">
              <button
                type="button"
                disabled={o.disabled}
                title={o.disabled ? o.hint : undefined}
                onClick={() => { if (!o.disabled) onChange(o.k); }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  o.disabled
                    ? "text-[#CBD5E1] cursor-not-allowed"
                    : active
                    ? "bg-[#1677FF] text-white font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
              {o.hint && !o.disabled && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${o.label} 判定规则`}
                      className="ml-0.5 mr-1 text-[#94A3B8] hover:text-[#1677FF] transition-colors"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-[11px] leading-relaxed">
                    {o.hint}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function ScatterCityLegend({
  cities, counts, hidden, solo, onToggle, onSolo,
}: {
  cities: string[];
  counts: Record<string, number>;
  hidden: Set<string>;
  solo: string | null;
  onToggle: (c: string) => void;
  onSolo: (c: string) => void;
}) {
  const clickTimer = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  if (!cities.length) return null;
  const handleClick = (c: string) => {
    if (clickTimer.current[c]) {
      clearTimeout(clickTimer.current[c]!);
      clickTimer.current[c] = null;
      onSolo(c);
      return;
    }
    clickTimer.current[c] = setTimeout(() => {
      clickTimer.current[c] = null;
      onToggle(c);
    }, 220);
  };
  const colorFor = (c: string) => TIER_COLOR[TIER_CITY_MAP[c] || "other"];
  return (
    <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1.5">
      {cities.map((c) => {
        const isHidden = solo ? solo !== c : hidden.has(c);
        const isSolo = solo === c;
        const count = counts[c] || 0;
        return (
          <button
            key={c}
            type="button"
            onClick={() => handleClick(c)}
            className={`group inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[11px] leading-none transition-all duration-150 ${
              isHidden ? "opacity-40 hover:opacity-70" : "opacity-100"
            } ${isSolo ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"}`}
            title="单击 显/隐 · 双击 仅看该城市"
          >
            <span
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: isHidden ? "#CBD5E1" : colorFor(c) }}
            />
            <span className={`tracking-wide ${isHidden ? "text-muted-foreground" : "text-foreground"} ${isSolo ? "font-semibold" : "font-medium"}`}>
              {c}
              <span className="ml-0.5 text-muted-foreground font-normal">（{count}项目）</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Sell-through 2D Scatter Chart (项目去化 × 市场去化) ---------- */
export function SellThroughScatterChart({
  projects, selectedId, hoveredId, onHover, onPick, onClearSelection, bubbleSizeKey, matchedIds, compareMode, isGroupAggregate,
  groupFilterMode = false, onBubbleSizeKeyChange,
}: {
  projects: ProjectAnalysisRow[];
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onPick: (p: ProjectAnalysisRow) => void;
  onClearSelection: () => void;
  bubbleSizeKey: BubbleSizeKey;
  matchedIds?: Set<string> | null;
  compareMode: CompareMode;
  isGroupAggregate?: boolean;
  groupFilterMode?: boolean;
  onBubbleSizeKeyChange?: (k: BubbleSizeKey) => void;
}) {
  // 招商蛇口维度：模块内独立「对比基准」（默认沿用外部值）
  const [scatterCompareMode, setScatterCompareMode] = useState<CompareMode>(compareMode);
  const effectiveCompareMode: CompareMode = groupFilterMode ? scatterCompareMode : compareMode;
  const marketLabel = isGroupAggregate
    ? "所属城市大盘去化率"
    : COMPARE_LABEL[effectiveCompareMode] + "去化率";
  const yAxisLabel = isGroupAggregate ? "城市公司加权去化率" : "项目去化率";
  const benchmarkShort = isGroupAggregate ? "所属城市大盘" : (COMPARE_LABEL[effectiveCompareMode]);
  const titleText = isGroupAggregate
    ? "城市公司去化率与所属城市大盘二维对比"
    : `项目去化率与${marketLabel}二维对比`;
  const subtitleText = isGroupAggregate
    ? "通过城市公司加权去化率与所属城市大盘的位置关系，识别城市公司相对所在城市的表现。"
    : "结合售估比与板块能级，定位项目的市场层级与价格空间。";
  const bm = BUBBLE_SIZE_META[bubbleSizeKey];

  // 招商蛇口维度：模块内独立筛选（不影响其他模块），与九宫格保持一致
  type GroupKey = "all" | "t1" | "newT1" | "t2" | "t34";
  const GROUP_LABEL: Record<GroupKey, string> = { all: "全部", t1: "一线城市", newT1: "新一线城市", t2: "二线城市", t34: "三四线城市" };
  const STAGE_HINT: Partial<Record<StageKey, string>> = {
    new: "新盘定义：滚动 1 年（12 个月）内开盘的项目。",
    持销: "持销定义：项目开盘已超过 1 年，且当前整体去化率 < 95%。",
    尾盘: "尾盘定义：项目整体去化率 ≥ 95%。",
  };
  const GROUP_CITY_LIST: Record<GroupKey, string[]> = {
    all: [],
    t1: ["上海", "北京", "深圳", "广州"],
    newT1: ["成都", "杭州", "重庆", "武汉", "苏州", "西安", "南京", "长沙", "郑州", "天津", "合肥", "青岛", "东莞"],
    t2: ["无锡", "济南", "厦门", "福州", "常州", "南通", "昆明", "南昌", "惠州"],
    t34: ["海口", "宜昌", "盐城", "赣州", "汕头", "湛江", "三亚"],
  };
  const availableCityUniverse = useMemo(
    () => Array.from(new Set(projects.map((p) => cityOfProject(p)))),
    [projects],
  );
  const citiesOfGroup = (g: GroupKey) =>
    (g === "all"
      ? Array.from(new Set([...GROUP_CITY_LIST.t1, ...GROUP_CITY_LIST.newT1, ...GROUP_CITY_LIST.t2, ...GROUP_CITY_LIST.t34]))
      : GROUP_CITY_LIST[g]
    ).filter((c) => availableCityUniverse.includes(c));

  const [scatterCityGroup, setScatterCityGroup] = useState<GroupKey>("t1");
  const [scatterCities, setScatterCities] = useState<string[]>(() => citiesOfGroup("t1"));
  const [hiddenCities, setHiddenCities] = useState<Set<string>>(new Set());
  const [soloCity, setSoloCity] = useState<string | null>(null);
  const [scatterStage, setScatterStage] = useState<StageKey>("all");
  const [scatterSearch, setScatterSearch] = useState("");

  // 切换城市群组时重置城市清单与隐藏/独看态
  const lastGroupRef = useRef<GroupKey>(scatterCityGroup);
  useEffect(() => {
    if (!groupFilterMode) return;
    if (lastGroupRef.current === scatterCityGroup) return;
    lastGroupRef.current = scatterCityGroup;
    setScatterCities(citiesOfGroup(scatterCityGroup));
    setHiddenCities(new Set());
    setSoloCity(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scatterCityGroup, groupFilterMode]);

  // 每城项目数（不含 hidden/solo，仅受群组与阶段影响）
  const cityCounts = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    if (!groupFilterMode) return acc;
    projects.forEach((p) => {
      if (getAnomalyReasons(p).length > 0) return;
      const c = cityOfProject(p);
      if (!scatterCities.includes(c)) return;
      if (scatterStage !== "all" && getProjectStage(p.snakeSellThroughRate, p.projectId) !== scatterStage) return;
      acc[c] = (acc[c] || 0) + 1;
    });
    return acc;
  }, [projects, scatterCities, scatterStage, groupFilterMode]);

  // groupFilterMode 下按模块内 compareMode 重新计算基准与去化竞争力（不影响外部）
  const rescoredProjects = useMemo<ProjectAnalysisRow[]>(() => {
    if (!groupFilterMode || scatterCompareMode === compareMode) return projects;
    const byCity = new Map<string, ProjectAnalysisRow[]>();
    projects.forEach((r) => {
      const key = r.cityCompany || "";
      const arr = byCity.get(key) || [];
      arr.push(r);
      byCity.set(key, arr);
    });
    const out: ProjectAnalysisRow[] = [];
    byCity.forEach((rows) => out.push(...enrichProjects(rows, scatterCompareMode)));
    return out;
  }, [projects, groupFilterMode, scatterCompareMode, compareMode]);

  // 有异常原因的项目不参与二维散点渲染（保留在明细表中）
  const renderProjects = useMemo(() => {
    let arr = rescoredProjects.filter((p) => getAnomalyReasons(p).length === 0);
    if (groupFilterMode) {
      arr = arr.filter((p) => {
        const c = cityOfProject(p);
        if (!scatterCities.includes(c)) return false;
        if (soloCity ? soloCity !== c : hiddenCities.has(c)) return false;
        return true;
      });
      if (scatterStage !== "all") arr = arr.filter((p) => getProjectStage(p.snakeSellThroughRate, p.projectId) === scatterStage);
      const kw = scatterSearch.trim().toLowerCase();
      if (kw) arr = arr.filter((p) => (p.projectName || "").toLowerCase().includes(kw) || (p.projectId || "").toLowerCase().includes(kw));
    }
    return arr;
  }, [rescoredProjects, groupFilterMode, scatterCities, hiddenCities, soloCity, scatterStage, scatterSearch]);

  const xMin = 0;
  const xMax = 1.05;
  const yMin = 0;
  const yMax = 1.05;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const COLOR_BETTER = SEMANTIC_TIER.advantage;
  const COLOR_WORSE = SEMANTIC_TIER.concern;

  return (
    <div className={`${PANEL_CLS} p-4 h-[700px] flex flex-col w-full`}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 truncate">{titleText}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtitleText}</p>
        </div>
        {groupFilterMode && (
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap min-w-0">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
              <input
                type="text"
                value={scatterSearch}
                onChange={(e) => setScatterSearch(e.target.value)}
                placeholder="搜索项目名称 / 编号"
                className="h-8 w-full pl-8 pr-7 rounded-md border border-[#E2E8F0] bg-white text-xs text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1677FF] focus:ring-1 focus:ring-[#1677FF]/30"
              />
              {scatterSearch && (
                <button
                  type="button"
                  aria-label="清除搜索"
                  onClick={() => setScatterSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#F1F5F9] text-[#94A3B8]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <ScatterFilterGroup label="对比基准">
              <ScatterSegmented
                options={(["competitor", "street", "city", "nation"] as CompareMode[]).map((k) => ({
                  k,
                  label: COMPARE_FILTER_LABEL[k],
                  disabled: k === "competitor",
                  hint: k === "competitor" ? "暂无竞品数据" : undefined,
                }))}
                value={scatterCompareMode}
                onChange={setScatterCompareMode}
              />
            </ScatterFilterGroup>
            {onBubbleSizeKeyChange && (
              <ScatterFilterGroup label="气泡大小">
                <ScatterSegmented
                  options={(["remainingValue", "salesFloorPrice"] as BubbleSizeKey[]).map((k) => ({ k, label: BUBBLE_SIZE_META[k].label }))}
                  value={bubbleSizeKey}
                  onChange={onBubbleSizeKeyChange}
                />
              </ScatterFilterGroup>
            )}
            <ScatterFilterGroup label="项目阶段">
              <ScatterSegmented
                options={(["all", "new", "持销", "尾盘"] as StageKey[]).map((k) => ({ k, label: STAGE_LABEL[k], hint: STAGE_HINT[k] }))}
                value={scatterStage}
                onChange={setScatterStage}
              />
            </ScatterFilterGroup>
          </div>
        )}
      </div>


      {groupFilterMode && (
        <div className="flex items-center gap-5 w-full flex-wrap mb-2">
          <div className="shrink-0">
            <ScatterFilterGroup label="城市群组">
              <ScatterSegmented
                options={(Object.keys(GROUP_LABEL) as GroupKey[]).map((k) => ({ k, label: GROUP_LABEL[k] }))}
                value={scatterCityGroup}
                onChange={setScatterCityGroup}
              />
            </ScatterFilterGroup>
          </div>
          <div className="flex-1 min-w-0 flex justify-start">
            <ScatterCityLegend
              cities={scatterCities}
              counts={cityCounts}
              hidden={hiddenCities}
              solo={soloCity}
              onToggle={(c) => {
                setSoloCity(null);
                setHiddenCities((prev) => {
                  const next = new Set(prev);
                  if (next.has(c)) next.delete(c); else next.add(c);
                  return next;
                });
              }}
              onSolo={(c) => {
                setHiddenCities(new Set());
                setSoloCity((prev) => (prev === c ? null : c));
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_BETTER }} />优于{benchmarkShort}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_WORSE }} />弱于{benchmarkShort}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-[#334155]" />y = x 基准线</span>
      </div>




      <div
        className="relative flex-1 min-h-0 rounded-lg overflow-hidden flex flex-col"
        onClickCapture={(e) => {
          const el = e.target as Element | null;
          if (el && el.closest && el.closest(".recharts-scatter-symbol")) return;
          onClearSelection();
        }}
      >

        {/* Y 轴公式标签（与九宫格保持一致：左上方，与 Y 轴竖线左对齐） */}
        <div className="text-xs text-slate-800 font-semibold whitespace-nowrap leading-none pl-9 pb-1 pointer-events-none">
          Y · {yAxisLabel}
        </div>
        <div className="relative flex-1 min-h-0">
          {/* X 轴公式标签（紧贴 X 轴下方，右对齐） */}
          <div className="absolute bottom-0 right-3 text-xs text-slate-800 font-semibold z-10 pointer-events-none whitespace-nowrap leading-none">
            X · {marketLabel}
          </div>
          <div className="absolute inset-0">
        <ResponsiveContainer>
          <ScatterChart
            margin={{ top: 8, right: 24, bottom: 28, left: 36 }}
            onClick={(state: { activePayload?: { payload: ProjectAnalysisRow }[] } | null) => {
              if (!state || !state.activePayload || state.activePayload.length === 0) onClearSelection();
            }}
          >
            {/* 以 y=x 为分界的三角形弱提示色块（上绿/下红） */}
            {(() => {
              const TriBg = (props: { xAxisMap?: Record<string, { scale: (v: number) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }> }) => {
                const xAxis = props.xAxisMap && Object.values(props.xAxisMap)[0];
                const yAxis = props.yAxisMap && Object.values(props.yAxisMap)[0];
                if (!xAxis || !yAxis) return null;
                const d = Math.min(xMax, yMax);
                const sx = (v: number) => xAxis.scale(v);
                const sy = (v: number) => yAxis.scale(v);
                const upper = `${sx(xMin)},${sy(yMax)} ${sx(d)},${sy(d)} ${sx(xMin)},${sy(xMin)}`;
                const lower = `${sx(xMin)},${sy(yMin)} ${sx(xMax)},${sy(yMin)} ${sx(xMax)},${sy(d)} ${sx(d)},${sy(d)}`;
                return (
                  <g pointerEvents="none">
                    <polygon points={upper} fill="rgba(34,197,94,0.06)" />
                    <polygon points={lower} fill="rgba(239,68,68,0.05)" />
                  </g>
                );
              };
              const C = Customized as unknown as React.FC<{ component: React.ComponentType<object> }>;
              return <C component={TriBg as unknown as React.ComponentType<object>} />;
            })()}
            <CartesianGrid stroke="#E6EDF5" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="effectiveMarketSellThroughRate"
              name={marketLabel}
              domain={[xMin, xMax]}
              ticks={ticks}
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={{ stroke: "#CBD5E1" }}
              tickLine={{ stroke: "#CBD5E1" }}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
            />
            <YAxis
              type="number"
              dataKey="snakeSellThroughRate"
              name={yAxisLabel}
              domain={[yMin, yMax]}
              ticks={ticks}
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={{ stroke: "#CBD5E1" }}
              tickLine={{ stroke: "#CBD5E1" }}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
            />

            <ZAxis type="number" dataKey={bubbleSizeKey} range={bm.range} domain={bm.domain} name={bm.label} />

            {/* y=x 对角基准线 */}
            <ReferenceLine
              segment={[{ x: xMin, y: xMin }, { x: Math.min(xMax, yMax), y: Math.min(xMax, yMax) }]}
              stroke="#334155"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{ value: "y = x", position: "insideTopRight", fontSize: 11, fontWeight: 600, fill: "#334155" }}
            />
            <RTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={((props: { active?: boolean; payload?: Array<{ payload?: ProjectAnalysisRow }> }) => {
                const { active, payload } = props;
                if (!active || !payload?.length || !payload[0].payload) return null;
                const p = payload[0].payload;
                const gapPct = (p.snakeSellThroughRate - p.effectiveMarketSellThroughRate) * 100;
                return (
                  <div style={TOOLTIP_STYLE} className="min-w-[240px]">
                    <div className="flex justify-end mb-1">
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F8FAFC] text-[10.5px] text-[#6B7280]">
                        <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: "#94A3B8" }} />
                        气泡大小：{bm.label}
                      </span>
                    </div>
                    <div className="font-semibold text-foreground mb-1.5">{formatProjectName(p.projectName)}</div>


                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pb-1.5 mb-1.5 border-b border-slate-200">
                      <span className="text-muted-foreground">项目去化率</span>
                      <span className="text-right tabular-nums">{fmtPct(p.snakeSellThroughRate, 2)}</span>
                      <span className="text-muted-foreground">{marketLabel}</span>
                      <span className="text-right tabular-nums">{fmtPct(p.effectiveMarketSellThroughRate, 2)}</span>
                      <span className="text-muted-foreground">去化率差值</span>
                      <span className="text-right tabular-nums" style={{ color: gapPct >= 0 ? COLOR_BETTER : COLOR_WORSE }}>
                        {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(2)}pct
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                      <span className="text-muted-foreground">剩余货值</span>
                      <span className="text-right tabular-nums">{fmtYi(p.remainingValue)}</span>
                      <span className="text-muted-foreground">销售均价</span>
                      <span className="text-right tabular-nums">{(p.salesFloorPrice / 10000).toFixed(2)} 万/㎡</span>
                      <span className="text-muted-foreground">对标结论</span>
                      <span className="text-right font-medium" style={{ color: gapPct >= 0 ? COLOR_BETTER : COLOR_WORSE }}>
                        {gapPct >= 0 ? `优于${benchmarkShort}` : `弱于${benchmarkShort}`}
                      </span>
                    </div>
                  </div>
                );

              }) as unknown as React.ComponentProps<typeof RTooltip>["content"]}
            />

            <Scatter
              data={renderProjects}
              onMouseEnter={(d) => onHover((d as unknown as ProjectAnalysisRow).projectId)}
              onMouseLeave={() => onHover(null)}
              onClick={(d) => onPick(d as unknown as ProjectAnalysisRow)}
            >
              {renderProjects.map((p) => {
                const better = p.snakeSellThroughRate >= p.effectiveMarketSellThroughRate;
                const isSelected = selectedId === p.projectId;
                const isHover = !isSelected && hoveredId === p.projectId;
                const anyActive = !!(selectedId || hoveredId);
                const isUnmatched = !!matchedIds && !matchedIds.has(p.projectId);
                const dim = anyActive && !isSelected && !isHover;
                const stroke = isSelected || isHover ? "var(--color-brand)" : "#fff";
                const strokeWidth = isSelected ? 3 : isHover ? 1.5 : 1;
                const baseOpacity = isSelected ? 1 : isHover ? 0.9 : dim ? 0.2 : 0.8;
                const fillOpacity = isUnmatched ? 0.15 : baseOpacity;
                return (
                  <Cell
                    key={p.projectId}
                    fill={better ? COLOR_BETTER : COLOR_WORSE}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeOpacity={isUnmatched ? 0.3 : isSelected ? 1 : isHover ? 0.65 : 1}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>

  );
}
