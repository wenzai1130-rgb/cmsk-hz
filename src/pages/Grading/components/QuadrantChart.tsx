import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine, ResponsiveContainer,
  Cell, ReferenceArea, Customized,
} from "recharts";
import { HelpCircle, Search, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  NINE_GRID_META, CATEGORY_META, computeAdaptiveThresholds, cellKeyOf,
  type ProjectAnalysisRow, type Band, type Thresholds, type CompareMode, COMPARE_LABEL,
} from "@/utils/analysisMetrics";
import { tierOf } from "@/data/chartTheme";
import { STAGE_LABEL, type StageKey } from "../utils/stage";
import { PANEL_CLS, BUBBLE_SIZE_META, type BubbleSizeKey } from "../constants";
import { ProjectTooltipContent } from "./ProjectTooltipContent";
import { CountUpText } from "./CountUpText";
import { QuadrantTimelinePlayer } from "./QuadrantTimelinePlayer";

export function QuadrantChart({
  org, titleOverride, projects, selectedId, hoveredId, onPick, onHover, onClearSelection, selectedProject, bubbleSizeKey, onBubbleSizeKeyChange, matchedIds, compareMode, onCompareModeChange, isGroupView, isGroupAggregate, stageFilter, onStageFilterChange, searchValue, onSearchChange,
}: {
  org: string;
  titleOverride?: string;
  projects: ProjectAnalysisRow[];
  selectedId: string | null;
  hoveredId: string | null;
  onPick: (p: ProjectAnalysisRow) => void;
  onHover: (id: string | null) => void;
  onClearSelection: () => void;
  selectedProject: ProjectAnalysisRow | null;
  bubbleSizeKey: BubbleSizeKey;
  onBubbleSizeKeyChange: (k: BubbleSizeKey) => void;
  matchedIds?: Set<string> | null;
  compareMode: CompareMode;
  onCompareModeChange: (m: CompareMode) => void;
  isGroupView?: boolean;
  isGroupAggregate?: boolean;
  stageFilter?: StageKey;
  onStageFilterChange?: (s: StageKey) => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
}) {
  void isGroupView;
  const bm = BUBBLE_SIZE_META[bubbleSizeKey];
  // 售估比 > 2 视为外部数据异常，不参与九宫格气泡渲染（仍在下方明细表中展示并标注异常原因）
  const projectsForChart = projects.filter((p) => p.valuationSalesRatio > 0 && p.valuationSalesRatio <= 2 && p.sellThroughCompetitiveness > 0);
  const xValues = projectsForChart.map((p) => p.valuationSalesRatio);
  // Y 轴统一采用「项目去化率」（0~100%），按 30 / 70 分位动态切分
  const yValues = projectsForChart.map((p) => p.snakeSellThroughRate);
  // X 轴：固定业务口径 0 / 0.9 / 1.1 / 2 四刻度切分
  // Y 轴：0、30 分位（后 30 分位最大值）、70 分位（前 30 分位最小值）、100%
  const xT: Thresholds = { low: 0.9, high: 1.1 };
  const yT: Thresholds = computeAdaptiveThresholds(yValues, { low: 0.3, high: 0.7 });
  const xMin = 0;
  const xMaxReal = 2;
  const yMin = 0;
  const yMaxReal = 1;

  // 分段线性映射：3 个区间分别映射到 [0,1] / [1,2] / [2,3]，让 3 列/3 行在物理上等宽等高
  const piece = (v: number, lo: number, mid1: number, mid2: number, hi: number) => {
    const c = Math.max(lo, Math.min(hi, v));
    if (c <= mid1) return mid1 === lo ? 0 : (c - lo) / (mid1 - lo);
    if (c <= mid2) return mid2 === mid1 ? 1.5 : 1 + (c - mid1) / (mid2 - mid1);
    return hi === mid2 ? 3 : 2 + (c - mid2) / (hi - mid2);
  };
  const xTransform = (v: number) => piece(v, xMin, xT.low, xT.high, xMaxReal);
  const yTransform = (v: number) => piece(v, yMin, yT.low, yT.high, yMaxReal);
  const displayBandOf = (v: number): Band => {
    if (v < 1) return "L";
    if (v > 2) return "H";
    return "M";
  };
  const displayQuadrantOf = (p: { xDisp: number; yDisp: number }) =>
    cellKeyOf(displayBandOf(p.xDisp), displayBandOf(p.yDisp));

  const baseDisplayData = projectsForChart.map((p) => ({
    ...p,
    xDisp: xTransform(p.valuationSalesRatio),
    yDisp: yTransform(p.snakeSellThroughRate),
  }));

  // 时间轴沙盘：frame 0 = 当月，越大表示越早期；给每个气泡注入确定性历史偏移
  const [frame, setFrame] = useState(0);
  const [maxFrame, setMaxFrame] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playSession, setPlaySession] = useState(0);
  useEffect(() => { if (playing) { setHasPlayed(true); setPlaySession((n) => n + 1); } }, [playing]);
  useEffect(() => { if (!selectedId) { setHasPlayed(false); setPlaying(false); setFrame(0); } }, [selectedId]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const rafRef = useRef<number | null>(null);

  // 选中气泡数值标签：直接在 Recharts 同一 SVG 坐标系内渲染（custom shape），与招商蛇口口径一致


  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const TOTAL = 3500;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    setFrame(maxFrame);
    const start = performance.now();
    const step = (ts: number) => {
      const k = Math.min(1, (ts - start) / TOTAL);
      const e = ease(k);
      const next = Math.round(maxFrame - e * maxFrame);
      setFrame(next);
      if (k < 1) rafRef.current = requestAnimationFrame(step);
      else { setFrame(0); setPlaying(false); }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, maxFrame]);

  const hashStr = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  };
  const displayData = baseDisplayData.map((p) => {
    // 未选中项目：保持当月静态位置与数值，不参与动效
    if (frame === 0 || !selectedId || p.projectId !== selectedId) {
      return { ...p, dynRemaining: p.remainingValue, dynPrice: p.salesFloorPrice };
    }
    const h1 = hashStr(p.projectId + ":x");
    const h2 = hashStr(p.projectId + ":y");
    const hv = hashStr(p.projectId + ":v");
    const hp = hashStr(p.projectId + ":p");
    const vJitter = ((((hv % 1000) / 1000) - 0.5) * 0.12) * frame;
    const pJitter = ((((hp % 1000) / 1000) - 0.5) * 0.08) * frame;
    const dynRemaining = Math.max(0.05, p.remainingValue * (1 + vJitter));
    const dynPrice = Math.max(1000, p.salesFloorPrice * (1 + pJitter));
    const dx = (((h1 % 1000) / 1000) - 0.5) * 0.45 * frame;
    const dy = (((h2 % 1000) / 1000) - 0.5) * 0.35 * frame;
    return {
      ...p,
      xDisp: Math.max(0.02, Math.min(2.98, p.xDisp + dx)),
      yDisp: Math.max(0.02, Math.min(2.98, p.yDisp + dy)),
      dynRemaining,
      dynPrice,
    };
  });


  // 选中气泡的历史轨迹点（T-maxFrame 月 → 当月）
  const selectedBaseIdx = selectedId ? baseDisplayData.findIndex((p) => p.projectId === selectedId) : -1;
  const selectedBase = selectedBaseIdx >= 0 ? baseDisplayData[selectedBaseIdx] : null;
  const trajectoryPoints = (() => {
    if (!selectedBase) return [] as Array<{ xDisp: number; yDisp: number; frame: number }>;
    const p = selectedBase;
    const h1 = hashStr(p.projectId + ":x");
    const h2 = hashStr(p.projectId + ":y");
    const pts: Array<{ xDisp: number; yDisp: number; frame: number }> = [];
    for (let f = maxFrame; f >= 0; f--) {
      const dx = (((h1 % 1000) / 1000) - 0.5) * 0.45 * f;
      const dy = (((h2 % 1000) / 1000) - 0.5) * 0.35 * f;
      pts.push({
        xDisp: Math.max(0.02, Math.min(2.98, p.xDisp + dx)),
        yDisp: Math.max(0.02, Math.min(2.98, p.yDisp + dy)),
        frame: f,
      });
    }
    return pts;
  })();




  // x=1 / y=1 中位线在显示空间中的位置（精准落在中间格内对应比例处）
  const xOneDisp = xTransform(1);
  const yOneDisp = yTransform(1); // = 1（y 中位线即下分界线）

  // 9 个区域单元（显示空间下等宽等高）
  const bands: Band[] = ["L", "M", "H"];
  const cells = bands.flatMap((yb, yi) =>
    bands.map((xb, xi) => {
      const cellKey = cellKeyOf(xb, yb);
      const meta = NINE_GRID_META[cellKey];
      return {
        key: cellKey,
        x1: xi, x2: xi + 1, y1: yi, y2: yi + 1,
        cx: xi + 0.5, cy: yi + 0.5,
        label: meta.label,
        color: meta.color,
        soft: meta.soft,
        category: meta.category,
        categoryLabel: CATEGORY_META[meta.category].label,
      };
    })
  );


  // 招商蛇口（集团聚合）视角：按城市公司着色
  const GROUP_CITY_COLOR: Record<string, string> = {
    上海: "#1D4ED8", 深圳: "#059669", 北京: "#7C3AED", 广州: "#F59E0B",
    杭州: "#0E9C8F", 南京: "#DB2777", 苏州: "#0EA5E9", 成都: "#EA580C",
    武汉: "#9333EA", 西安: "#CA8A04", 合肥: "#0891B2", 长沙: "#BE123C",
    天津: "#475569", 重庆: "#B45309", 青岛: "#2563EB", 佛山: "#16A34A", 东莞: "#65A30D",
  };
  const groupFallbackPalette = ["#1D4ED8", "#059669", "#7C3AED", "#F59E0B", "#0E9C8F", "#DB2777", "#0EA5E9", "#EA580C"];
  const cityColorOf = (name: string, idx: number) => {
    const key = (name || "").replace(/公司$/, "").replace(/[（(].*/, "").trim();
    return GROUP_CITY_COLOR[key] || groupFallbackPalette[idx % groupFallbackPalette.length];
  };
  const selectedColor = selectedBase
    ? (isGroupAggregate
        ? cityColorOf(selectedBase.cityCompany || selectedBase.projectName, selectedBaseIdx)
        : NINE_GRID_META[displayQuadrantOf(selectedBase)].color)
    : "#3B82F6";

  // 选中气泡数值标签：稳定组件实例 + ref 同步最新参数，保证 600ms 滚动动画与招商蛇口一致；
  // 同时处理顶部气泡外部标签裁剪问题（自动翻转到气泡下方）
  const selLabelRef = useRef<{
    selectedId: string;
    xDisp: number;
    yDisp: number;
    rPx: number;
    showInside: boolean;
    remainingValue: number;
    floorPrice: number;
    bubbleFill: string;
  } | null>(null);
  {
    const sel = selectedBase ? displayData.find((d) => d.projectId === selectedId) : null;
    if (sel) {
      const dom = bm.domain, rng = bm.range;
      const zVal = bubbleSizeKey === "remainingValue" ? sel.dynRemaining : sel.dynPrice;
      const t = Math.max(0, Math.min(1, (zVal - dom[0]) / (dom[1] - dom[0] || 1)));
      const size = rng[0] + t * (rng[1] - rng[0]);
      const rPx = Math.sqrt(size / Math.PI);
      const bubbleFill = isGroupAggregate
        ? cityColorOf(sel.cityCompany || sel.projectName, displayData.findIndex((d) => d.projectId === selectedId))
        : NINE_GRID_META[displayQuadrantOf(sel)].color;
      selLabelRef.current = {
        selectedId: sel.projectId,
        xDisp: sel.xDisp,
        yDisp: sel.yDisp,
        rPx,
        // 单行标签的内嵌阈值（气泡半径足够容纳文字即可内嵌）
        showInside: rPx >= 18,
        remainingValue: sel.dynRemaining,
        floorPrice: sel.dynPrice / 10000,
        bubbleFill,
      };
    } else {
      selLabelRef.current = null;
    }
  }
  const StableSelectedLabel = useMemo(() => {
    const Comp = (props: { xAxisMap?: Record<string, { scale: (v: number) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }>; offset?: { top?: number } }) => {
      const s = selLabelRef.current;
      if (!s) return null;
      const xAxis = props.xAxisMap ? Object.values(props.xAxisMap)[0] : null;
      const yAxis = props.yAxisMap ? Object.values(props.yAxisMap)[0] : null;
      if (!xAxis || !yAxis) return null;
      const cx = xAxis.scale(s.xDisp);
      const cy = yAxis.scale(s.yDisp);
      const top = props.offset?.top ?? 0;
      // 数值口径跟随顶部「气泡大小」选择：剩余货值 / 销售均价
      const useRemaining = bubbleSizeKey === "remainingValue";
      const value = useRemaining ? s.remainingValue : s.floorPrice;
      const unit = useRemaining ? "亿" : "万/㎡";
      let y: number;
      let baseline: "auto" | "middle";
      if (s.showInside) {
        y = cy;
        baseline = "middle";
      } else if (cy - s.rPx - 8 < top + 12) {
        y = cy + s.rPx + 14;
        baseline = "auto";
      } else {
        y = cy - s.rPx - 6;
        baseline = "auto";
      }
      const color = s.showInside ? "#FFFFFF" : "#0F172A";
      const stroke = s.showInside ? s.bubbleFill : "#FFFFFF";
      const fontSize = s.showInside ? 12 : 11;
      return (
        <g pointerEvents="none">
          <CountUpText key={`${s.selectedId}-${bubbleSizeKey}-${playSession}`} x={cx} y={y} value={value} unit={unit} color={color} fontSize={fontSize} stroke={stroke} baseline={baseline} />
        </g>
      );
    };
    return Comp;
  }, [bubbleSizeKey, playSession]);


  return (

    <div className={`${PANEL_CLS} p-4 h-[700px] flex flex-col w-full`}>
      {/* 第一行：标题 + 副标题（左）+ 搜索框（右） */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold whitespace-nowrap">{titleOverride ?? `${org}项目九宫格分析`}</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {isGroupAggregate
              ? "按城市公司聚合：气泡 = 城市公司，气泡大小 = 该城市公司剩余货值，点击气泡可下钻至该城市公司项目。"
              : `横轴是售估比（销售均价 / 中介估值），纵轴是将项目去化率分别与所在板块/所在城市/全国的所有项目进行排名，然后按照前30/后30分成3档，根据项目的去化竞争力和售估比，定位项目所在去化竞争力档位与售估比区间，气泡大小为剩余货值，左下角的项目去化弱价格也低，需要重点关注。`}
          </p>
        </div>
        {onSearchChange && (
          <div className="relative shrink-0 w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索项目名称 / 编号"
              className="h-8 w-full pl-8 pr-7 rounded-md border border-[#E2E8F0] bg-white text-xs text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1677FF] focus:ring-1 focus:ring-[#1677FF]/30"
            />
            {searchValue && (
              <button
                type="button"
                aria-label="清除搜索"
                onClick={() => onSearchChange("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#F1F5F9] text-[#94A3B8]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>


      {/* 第二行：控制操作区（对比基准 / 项目阶段 / 气泡大小 水平铺开） */}
      <div className="flex items-center flex-wrap gap-x-8 gap-y-2 mb-3 pb-3 border-b border-[#F1F5F9]">
        {!isGroupAggregate && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">对比基准</span>
            <div role="radiogroup" aria-label="对比基准" className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white p-1 text-xs">
              {([
                { k: "competitor", label: "与竞品比", disabled: true, tip: "暂无竞品数据" },
                { k: "street", label: "与板块比" },
                { k: "city", label: "与城市比" },
                { k: "nation", label: "与全国比" },
              ] as { k: CompareMode; label: string; disabled?: boolean; tip?: string }[]).map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  role="radio"
                  aria-checked={compareMode === opt.k}
                  aria-disabled={opt.disabled || undefined}
                  disabled={opt.disabled}
                  title={opt.tip}
                  onClick={() => { if (!opt.disabled) onCompareModeChange(opt.k); }}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    opt.disabled
                      ? "text-[#CBD5E1] cursor-not-allowed"
                      : compareMode === opt.k
                      ? "bg-[#1677FF] text-white font-medium"
                      : "text-[#475569] hover:text-[#0F172A]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isGroupAggregate && onStageFilterChange && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">项目阶段</span>
            <div role="radiogroup" aria-label="项目阶段" className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white p-1 text-xs">
              <TooltipProvider delayDuration={150}>
                {([
                  { k: "all" as StageKey, tip: "" },
                  { k: "new" as StageKey, tip: "开盘 12 个月以内的项目" },
                  { k: "持销" as StageKey, tip: "开盘超过 12 个月、去化率 < 95% 的项目" },
                  { k: "尾盘" as StageKey, tip: "去化率 ≥ 95% 的项目" },
                ]).map(({ k, tip }) => {
                  const active = stageFilter === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onStageFilterChange(k)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                        active
                          ? "bg-[#1677FF] text-white font-medium"
                          : "text-[#475569] hover:text-[#0F172A]"
                      }`}
                    >
                      <span>{STAGE_LABEL[k]}</span>
                      {tip && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle
                              className={`w-3 h-3 ${active ? "text-white/80" : "text-[#94A3B8]"}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{tip}</TooltipContent>
                        </Tooltip>
                      )}
                    </button>
                  );
                })}
              </TooltipProvider>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#64748B]">气泡大小</span>
          <div role="radiogroup" aria-label="气泡大小" className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white p-1 text-xs">
            {(["remainingValue", "salesFloorPrice"] as BubbleSizeKey[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={bubbleSizeKey === k}
                onClick={() => onBubbleSizeKeyChange(k)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  bubbleSizeKey === k
                    ? "bg-[#1677FF] text-white font-medium"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                {BUBBLE_SIZE_META[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="relative flex-1 min-h-0 flex flex-col"
      >

        {/* Y 轴公式标签（图表左上方平铺小标题，与 Y 轴竖线左对齐） */}
        <div className="text-xs text-slate-800 font-semibold whitespace-nowrap leading-none pl-9 pb-1 pointer-events-none">
          Y · 去化竞争力（项目去化率 VS {COMPARE_LABEL[compareMode]}去化率）
        </div>
        <div
          className="relative flex-1 min-h-0"
          onClickCapture={(e) => {
            // 仅图表区域点击空白才清空选中；播放条/刻度/筛选控件不应触发清空
            if (playing) return;
            const el = e.target as Element | null;
            if (el && el.closest && el.closest(".recharts-scatter-symbol")) return;
            onClearSelection();
          }}
        >
        {/* X 轴公式标签（紧贴 X 轴刻度下方，右对齐） */}
        <div className="absolute bottom-0 right-3 text-xs text-slate-800 font-semibold z-10 pointer-events-none whitespace-nowrap leading-none">
          X · 售估比（销售均价 / 中介估值）
        </div>
        <div className="absolute inset-0">
        <ResponsiveContainer>

          <ScatterChart
            margin={{ top: 8, right: 24, bottom: 28, left: 36 }}
            onClick={(state: { activePayload?: { payload: ProjectAnalysisRow }[] } | null) => {
              if (playing) return;
              if (!state || !state.activePayload || state.activePayload.length === 0) onClearSelection();
            }}
          >
            <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="xDisp"
              name="估值售价比"
              domain={[0, 3]}
              ticks={[0, 1, 2, 3]}
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickFormatter={(v: number) => {
                if (v === 0) return xMin.toFixed(2);
                if (v === 1) return xT.low.toFixed(2);
                if (v === 2) return xT.high.toFixed(2);
                if (v === 3) return xMaxReal.toFixed(2);
                return v.toFixed(2);
              }}
            />

            <YAxis
              type="number"
              dataKey="yDisp"
              name="去化竞争力"
              domain={[0, 3]}
              ticks={[0, 1, 2, 3]}
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickFormatter={(v: number) => {
                const fy = (x: number) => `${(x * 100).toFixed(2)}%`;
                if (v === 0) return fy(yMin);
                if (v === 1) return fy(yT.low);
                if (v === 2) return fy(yT.high);
                if (v === 3) return fy(yMaxReal);
                return `${(v * 100).toFixed(0)}%`;
              }}
            />


            <ZAxis type="number" dataKey={bubbleSizeKey} range={bm.range} domain={bm.domain} name={bm.label} />

            {/* 9 宫格背景：招商蛇口视角纯白；其余视角按 3 类分色 */}
            {cells.map((c) => (
              <ReferenceArea
                key={`bg-${c.key}`}
                x1={c.x1} x2={c.x2} y1={c.y1} y2={c.y2}
                fill={isGroupAggregate ? "#FFFFFF" : c.color}
                fillOpacity={isGroupAggregate ? 1 : 0.07}
                stroke="none"
              />
            ))}

            {/* 九宫格分隔线：等宽分段后位于显示空间的 1 和 2 处（即 0.90/1.10 与 1.00/1.80） */}
            <ReferenceLine x={1} stroke={isGroupAggregate ? "#E2E8F0" : "#94A3B8"} strokeWidth={1} />
            <ReferenceLine x={2} stroke={isGroupAggregate ? "#E2E8F0" : "#94A3B8"} strokeWidth={1} />
            <ReferenceLine y={1} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 4"
              label={{ value: "y=1", position: "right", fontSize: 10, fill: "#64748B" }} />
            <ReferenceLine y={2} stroke={isGroupAggregate ? "#E2E8F0" : "#94A3B8"} strokeWidth={1} />

            {/* x=1 业务基准参考线（虚线，落在中间格内 0.9~1.1 的真实比例处） */}
            <ReferenceLine
              x={xOneDisp}
              stroke={isGroupAggregate ? "#475569" : "#94A3B8"}
              strokeDasharray="5 4"
              strokeWidth={isGroupAggregate ? 1.5 : 1}
              label={{ value: "x=1", position: "top", fontSize: 10, fill: isGroupAggregate ? "#475569" : "#64748B" }}
            />
            {/* y=1 中位线提示（与下分界线重合） */}
            <ReferenceLine y={yOneDisp} stroke="transparent" />

            {/* 区域命名标签：居中铺放在每个等宽格子内 */}
            {cells.map((c) => (
              <ReferenceArea
                key={`lbl-${c.key}`}
                x1={c.x1} x2={c.x2} y1={c.y1} y2={c.y2}
                fill="transparent"
                label={
                  isGroupAggregate
                    ? { value: c.categoryLabel, position: "center", fontSize: 10, fill: "#CBD5E1", fontWeight: 400 }
                    : { value: c.label, position: "insideTopLeft", offset: 6, fontSize: 10, fill: c.color, fontWeight: 500 }
                }
              />
            ))}

            <RTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={((props: { active?: boolean; payload?: Array<{ payload?: ProjectAnalysisRow }> }) => {
                const { active, payload } = props;
                if (!active || !payload?.length || !payload[0].payload) return null;
                const p = payload[0].payload as ProjectAnalysisRow & { xDisp?: number; yDisp?: number };
                const quadrantKey = typeof p.xDisp === "number" && typeof p.yDisp === "number"
                  ? displayQuadrantOf({ xDisp: p.xDisp, yDisp: p.yDisp })
                  : undefined;
                // 去化竞争力档位：按当前数据集 30 / 70 分位（yT）判定，展示「在前30分位 / 中间40分位 / 在后30分位」
                const yTier = tierOf(p.snakeSellThroughRate, yT.low, yT.high);
                return <ProjectTooltipContent p={p} bubbleSizeKey={bubbleSizeKey} quadrantKey={quadrantKey} yTier={yTier} />;
              }) as unknown as React.ComponentProps<typeof RTooltip>["content"]}
            />

            {/* 选中气泡的历史轨迹：虚线 + 节点圆点（图层在气泡之下） */}
            {!!selectedId && trajectoryPoints.length > 1 && (
              <Scatter
                data={trajectoryPoints}
                isAnimationActive={false}
                legendType="none"
                line={{ stroke: selectedColor, strokeDasharray: "4 4", strokeWidth: 1.2, strokeOpacity: 0.7 } as never}
                lineType="joint"

                shape={(props: { cx?: number; cy?: number }) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={3.5}
                    fill={selectedColor}
                    fillOpacity={0.65}
                    stroke="#FFFFFF"
                    strokeOpacity={0.7}
                    strokeWidth={1.2}
                    style={{ pointerEvents: "none" }}
                  />
                )}
              />
            )}

            <Scatter
              data={displayData}
              isAnimationActive={false}
              onMouseEnter={(d) => onHover((d as unknown as ProjectAnalysisRow).projectId)}
              onMouseLeave={() => onHover(null)}
              onClick={(d) => onPick(d as unknown as ProjectAnalysisRow)}
            >
              {displayData.map((p, idx) => {
                const isSelected = selectedId === p.projectId;
                const isHover = !isSelected && hoveredId === p.projectId;
                const anyActive = !!(selectedId || hoveredId);
                const isUnmatched = !!matchedIds && !matchedIds.has(p.projectId);
                const dim = anyActive && !isSelected && !isHover;
                const stroke = isSelected ? "var(--color-brand)" : isHover ? "var(--color-brand)" : "#fff";
                const strokeWidth = isSelected ? 3 : isHover ? 1.5 : 1;
                const baseOpacity = isSelected ? 1 : isHover ? 0.9 : dim ? 0.25 : 0.82;
                const fillOpacity = isUnmatched ? 0.08 : baseOpacity;
                  const cellQuadrant = displayQuadrantOf(p);
                 const fill = isGroupAggregate
                   ? cityColorOf(p.cityCompany || p.projectName, idx)
                   : NINE_GRID_META[cellQuadrant].color;
                return (
                  <Cell
                    key={p.projectId}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeOpacity={isUnmatched ? 0.15 : isSelected ? 1 : isHover ? 0.65 : 1}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </Scatter>

            {/* 选中气泡数值标签：通过 Customized 拿到 chart 内部 scale；
                StableSelectedLabel 组件实例 + CountUpText key 在同一 selectedId 下保持稳定，
                与招商蛇口口径一致，保证 600ms 滚动动画生效 */}
            {(() => {
              const C = Customized as unknown as React.FC<{ component: React.ComponentType<object> }>;
              return <C component={StableSelectedLabel as unknown as React.ComponentType<object>} />;
            })()}
            </ScatterChart>

        </ResponsiveContainer>

        </div>

        {matchedIds && matchedIds.size === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-3 py-1.5 rounded-md bg-white/90 border border-[#E2E8F0] text-xs text-muted-foreground shadow-sm">
              未找到匹配的项目
            </div>
          </div>
        )}
      </div>



      {/* 时间沙盘：气泡动态演变时间轴 */}
      <div className="mt-3">
        <QuadrantTimelinePlayer
          playing={playing}
          canPlay={!!selectedId}
          onTogglePlay={() => { if (!selectedId) return; setPlaying((v) => !v); }}

          frame={frame}
          maxFrame={maxFrame}
          onFrame={(f) => { setFrame(f); setPlaying(false); }}
          onQuickRange={(months) => { setMaxFrame(months - 1); setFrame(0); setDateRange(undefined); }}
          dateRange={dateRange}
          onDateRange={(r) => {
            setDateRange(r);
            if (r?.from && r?.to) {
              const months = Math.max(1, Math.min(11, Math.round((+r.to - +r.from) / (30 * 86400 * 1000))));
              setMaxFrame(months); setFrame(0);
            }
          }}
        />
      </div>
    </div>
    </div>


  );

}
