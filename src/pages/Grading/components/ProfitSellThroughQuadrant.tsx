import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Cell,
  Customized,
} from "recharts";
import { Play, Pause, HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatProjectName } from "@/lib/format";
import {
  NINE_GRID_META,
  CATEGORY_META,
  COMPARE_LABEL,
  fmtPct,
  fmtYi,
  cellKeyOf,
  computeAdaptiveThresholds,
  type ProjectAnalysisRow,
  type Band,
} from "@/utils/analysisMetrics";
import { TIER_COLOR as SEMANTIC_TIER, tierOf } from "@/data/chartTheme";

const NEGATIVE_PROFIT_COLOR = "#94A3B8";

// district 模式：格子分类映射（与图示保持一致）
const DISTRICT_CATEGORY_BY_KEY: Record<string, "advantage" | "watch" | "concern"> = {
  price_up_watch: "advantage",
  steady_sale: "advantage",
  value_realization: "watch",
  price_repair: "advantage",
  balanced: "watch",
  price_watch: "concern",
  pressure: "watch",
  ops_improvement: "concern",
  sale_improvement: "concern",
};
const districtCellColor = (key: string) =>
  CATEGORY_META[DISTRICT_CATEGORY_BY_KEY[key] || "watch"].color;

const PANEL_CLS =
  "bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-shadow";

const CITY_COLOR: Record<string, string> = {
  上海: "#1D4ED8", 深圳: "#10B981", 北京: "#7C3AED", 广州: "#F59E0B",
  杭州: "#0E9C8F", 南京: "#DB2777", 苏州: "#0EA5E9", 成都: "#EA580C",
  武汉: "#9333EA", 西安: "#CA8A04", 合肥: "#0891B2", 长沙: "#BE123C",
  佛山: "#16A34A",
};
const cityOf = (p: { cityCompany?: string }) => (p.cityCompany || "").replace(/公司$/, "");
function hashCityColor(city: string): string {
  let h = 2166136261;
  for (let i = 0; i < city.length; i++) { h ^= city.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hue = (h >>> 0) % 360;
  const sat = 60 + ((h >>> 8) % 20); // 60-79%
  const light = 44 + ((h >>> 16) % 10); // 44-53%
  return `hsl(${hue} ${sat}% ${light}%)`;
}
const colorByCityOf = (p: { cityCompany?: string }) => {
  const c = cityOf(p);
  return CITY_COLOR[c] || (c ? hashCityColor(c) : "#64748B");
};

// 利润率合成口径：相对市场均价的溢价比例（销售均价 vs 市场成交均价）
function computeProfitMargin(p: ProjectAnalysisRow): number {
  if (!p.salesFloorPrice || p.salesFloorPrice <= 0) return 0;
  return (p.salesFloorPrice - p.marketAvgDealPrice * 0.85) / p.salesFloorPrice;
}
function computeProfitAmount(p: ProjectAnalysisRow): number {
  return Math.max(0.01, p.remainingValue * Math.max(0.02, computeProfitMargin(p)));
}
// 售估比：销售均价 / 中介估值
function computePriceRatio(p: ProjectAnalysisRow): number {
  if (!p.cmbValuationPrice || p.cmbValuationPrice <= 0) return 1;
  return p.salesFloorPrice / p.cmbValuationPrice;
}

export type QuadrantMode = "profit" | "value" | "district";

const PROFIT_X_THRESH = { low: 0, high: 0.1 };
// 与城市公司口径保持一致：X 轴 0 / 0.9 / 1.1 / 2 四刻度切分
const VALUE_X_THRESH = { low: 0.9, high: 1.1 };
// Y 轴使用 30 / 70 分位动态切分（默认兜底 = 项目去化率的 30% / 70%）
const VALUE_Y_THRESH = { low: 0.3, high: 0.7 };
// 区县能级 X 轴：30 / 70 分位动态切分（默认兜底 30% / 70%）
const DISTRICT_X_FALLBACK = { low: 0.3, high: 0.7 };


type Row = ProjectAnalysisRow & {
  profitMargin: number;
  profitAmount: number;
  priceRatio: number;
  sellRate: number;
  benchmarkRate: number;
  yValue: number;
  xMetric: number;
  bubbleValue: number;
  bubbleSize: number;
  xDisp: number;
  yDisp: number;
};

export type YMetric = "sellRate" | "competitiveness";
export type SizeMetric = "remainingValue" | "salesFloorPrice" | "snakeSellThroughRate";

type StageKey = "all" | "new" | "持销" | "尾盘";
const STAGE_LABEL: Record<StageKey, string> = { all: "全部", new: "新盘", 持销: "持销", 尾盘: "尾盘" };
const STAGE_HINT: Partial<Record<StageKey, string>> = {
  new: "新盘定义：滚动 1 年（12 个月）内开盘的项目。",
  持销: "持销定义：项目开盘已超过 1 年，且当前整体去化率 < 95%。",
  尾盘: "尾盘定义：项目整体去化率 ≥ 95%。",
};
function monthsSinceOpen(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  return 1 + (h % 36);
}
function getStage(snakeRate: number, monthsOpen: number): StageKey {
  if (snakeRate >= 0.95) return "尾盘";
  if (monthsOpen <= 12) return "new";
  return "持销";
}

export function ProfitSellThroughQuadrant({
  projects,
  selectedId,
  hoveredId,
  onPick,
  onHover,
  onClearSelection,
  matchedIds,
  bare = false,
  colorByCity = false,
  mode = "profit",
  yMetric = "sellRate",
  sizeMetric = "remainingValue",
}: {
  projects: ProjectAnalysisRow[];
  selectedId: string | null;
  hoveredId: string | null;
  onPick: (p: ProjectAnalysisRow) => void;
  onHover: (id: string | null) => void;
  onClearSelection: () => void;
  matchedIds?: Set<string> | null;
  bare?: boolean;
  colorByCity?: boolean;
  mode?: QuadrantMode;
  yMetric?: YMetric;
  sizeMetric?: SizeMetric;
}) {

  const isValue = mode === "value";
  const isDistrict = mode === "district";
  const useCompetitiveness = yMetric === "competitiveness";
  const useValueSize = isValue || isDistrict;
  // 内部维持一份 sizeMetric 状态，非受控模式下（例如城市公司维度直接使用 non-bare 组件）
  // 可通过组件自身的 toolbar 切换气泡大小口径。
  const [internalSize, setInternalSize] = useState<SizeMetric>(sizeMetric);
  useEffect(() => { setInternalSize(sizeMetric); }, [sizeMetric]);
  const currentSize = internalSize;
  // 城市公司维度：模块内独立的「项目阶段」筛选（全部/新盘/持销/尾盘）
  const [stage, setStage] = useState<StageKey>("all");
  const isFloorPrice = useValueSize && currentSize === "salesFloorPrice";
  const isRateSize = useValueSize && currentSize === "snakeSellThroughRate";
  const sizeLabel = useValueSize
    ? (isFloorPrice ? "销售均价" : isRateSize ? "去化率" : "剩余货值")
    : "利润";
  const sizeUnit = isFloorPrice ? "万/㎡" : isRateSize ? "%" : "亿";
  const formatSizeValue = (v: number) =>
    isFloorPrice ? v / 10000 : isRateSize ? v * 100 : v;


  const enriched: Row[] = useMemo(
    () => {
      const raw: Row[] = projects
        .map((p) => {
          const profitMargin = computeProfitMargin(p);
          const profitAmount = computeProfitAmount(p);
          const priceRatio = computePriceRatio(p);
          const sellRate = p.snakeSellThroughRate;
          const benchmark = p.effectiveMarketSellThroughRate || p.marketSellThroughRate || 0;
          const competitiveness = benchmark > 0 ? sellRate / benchmark : 0;
          const yValue = isDistrict ? (p.marketSellThroughRate || 0) : useCompetitiveness ? competitiveness : sellRate;
          const xMetric = isValue ? priceRatio : isDistrict ? priceRatio : profitMargin;
          const valueSize = currentSize === "salesFloorPrice"
            ? p.salesFloorPrice
            : currentSize === "snakeSellThroughRate"
              ? p.snakeSellThroughRate
              : p.remainingValue;
          const bubbleValue = useValueSize ? Math.max(0.001, valueSize) : profitAmount;
          return {
            ...p,
            profitMargin,
            profitAmount,
            priceRatio,
            sellRate,
            benchmarkRate: benchmark,
            effectiveMarketSellThroughRate: benchmark,
            sellThroughCompetitiveness: competitiveness,
            yValue,
            xMetric,
            bubbleValue,
            bubbleSize: bubbleValue,
            xDisp: 0,
            yDisp: 0,
          };
        })
        .filter((p) => {
          const passBase = isValue
            ? p.priceRatio > 0 && p.priceRatio <= 2
            : isDistrict
              ? p.priceRatio > 0 && p.priceRatio <= 2 && p.yValue > 0
              : true;
          if (!passBase) return false;
          if (isDistrict && stage !== "all") {
            return getStage(p.snakeSellThroughRate, monthsSinceOpen(p.projectId)) === stage;
          }
          return true;
        });

      // district 模式：气泡大小离散为 5 档（左闭右开：[0,0.2)/[0.2,0.4)/[0.4,0.6)/[0.6,0.8)/[0.8,1.0]）
      if (!isDistrict || raw.length === 0) return raw;
      const vals = raw.map((r) => r.bubbleValue);
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      return raw.map((r) => {
        const n = mx > mn ? (r.bubbleValue - mn) / (mx - mn) : 0;
        const clamped = Math.min(0.9999, Math.max(0, n));
        const tier = Math.floor(clamped * 5); // 0..4
        const sizeMid = (tier * 2 + 1) / 10; // 0.1 / 0.3 / 0.5 / 0.7 / 0.9
        return { ...r, bubbleSize: sizeMid };
      });
    },
    [projects, isValue, isDistrict, useValueSize, useCompetitiveness, currentSize, stage]
  );

  const yFallback = useMemo(
    () => (isDistrict ? { low: 0.3, high: 0.7 } : VALUE_Y_THRESH),
    [isDistrict]
  );
  const yT = useMemo(
    () => {
      if (isDistrict) {
        // 板块能级：按「板块」维度对去化率排序后取 30 / 70 分位（每个板块只计 1 次，
        // 避免大板块多项目重复拉高分位），据此判定项目所在板块的高/中/低能级。
        const byBlock = new Map<string, number>();
        projects.forEach((p) => {
          const key = `${p.district || ""}::${p.street || ""}`;
          const rate = p.marketSellThroughRate || 0;
          if (rate > 0 && !byBlock.has(key)) byBlock.set(key, rate);
        });
        return computeAdaptiveThresholds(Array.from(byBlock.values()), yFallback);
      }
      return computeAdaptiveThresholds(enriched.map((p) => p.yValue), yFallback);
    },
    [isDistrict, projects, enriched, yFallback]
  );
  const districtYT = useMemo(
    () => computeAdaptiveThresholds(enriched.map((p) => p.yValue), DISTRICT_X_FALLBACK),
    [enriched]
  );
  void districtYT;
  const xT = isValue ? VALUE_X_THRESH : isDistrict ? VALUE_X_THRESH : PROFIT_X_THRESH;

  const xMin = isValue ? 0 : isDistrict ? 0 : -0.1;
  const xMax = isValue
    ? 2
    : isDistrict
      ? 2
      : Math.max(0.6, ...enriched.map((p) => p.xMetric + 0.05));
  const yMin = 0;
  // Y 轴上限：
  // - district / sellRate（去化率口径）: 固定 100%
  // - competitiveness（去化竞争力 = 项目去化率 / 基准去化率）: 无界比率，按数据自适应，
  //   至少覆盖到「前30分位 * 1.1」与最大值，且不低于 2.0（=200%）以保持刻度稳定。
  const yMax = useCompetitiveness
    ? Math.max(2.0, (yT.high || 0) * 1.1, ...enriched.map((p) => p.yValue))
    : 1.0;




  const piece = (v: number, lo: number, m1: number, m2: number, hi: number) => {
    const c = Math.max(lo, Math.min(hi, v));
    const PAD = 0.15;
    const span = 1 - 2 * PAD;
    if (c <= m1) {
      const t = m1 === lo ? 0.5 : (c - lo) / (m1 - lo);
      return PAD + t * span;
    }
    if (c <= m2) {
      const t = m2 === m1 ? 0.5 : (c - m1) / (m2 - m1);
      return 1 + PAD + t * span;
    }
    const t = hi === m2 ? 0.5 : (c - m2) / (hi - m2);
    return 2 + PAD + t * span;
  };
  const xTransform = (v: number) => piece(v, xMin, xT.low, xT.high, xMax);
  const yTransform = (v: number) => piece(v, yMin, yT.low, yT.high, yMax);
  const displayBandOf = (v: number): Band => {
    if (v < 1) return "L";
    if (v > 2) return "H";
    return "M";
  };
  const displayCellKeyOf = (p: Pick<Row, "xDisp" | "yDisp">) =>
    cellKeyOf(displayBandOf(p.xDisp), displayBandOf(p.yDisp));

  const base: Row[] = enriched.map((p) => ({
    ...p,
    xDisp: xTransform(p.xMetric),
    yDisp: yTransform(p.yValue),
  }));

  const baseSignature = base
    .map((p) => `${p.projectId}:${p.xDisp.toFixed(4)}:${p.yDisp.toFixed(4)}:${p.yValue.toFixed(4)}:${p.benchmarkRate.toFixed(4)}:${p.bubbleValue.toFixed(4)}`)
    .join("|");
  const previousBaseRef = useRef<Row[] | null>(null);
  const motionSourceRef = useRef<Map<string, Row>>(new Map());
  const motionRafRef = useRef<number | null>(null);
  const [motionProgress, setMotionProgress] = useState(1);

  useLayoutEffect(() => {
    const previous = previousBaseRef.current;
    if (!previous) {
      previousBaseRef.current = base;
      setMotionProgress(1);
      return;
    }

    const previousById = new Map(previous.map((p) => [p.projectId, p]));
    const changed =
      previous.length !== base.length ||
      base.some((p) => {
        const old = previousById.get(p.projectId);
        if (!old) return true;
        return (
          Math.abs(old.xDisp - p.xDisp) > 0.001 ||
          Math.abs(old.yDisp - p.yDisp) > 0.001 ||
          Math.abs(old.yValue - p.yValue) > 0.001 ||
          Math.abs(old.benchmarkRate - p.benchmarkRate) > 0.0001 ||
          Math.abs(old.bubbleValue - p.bubbleValue) > 0.001
        );
      });

    if (!changed) {
      previousBaseRef.current = base;
      setMotionProgress(1);
      return;
    }

    motionSourceRef.current = previousById;
    if (motionRafRef.current) cancelAnimationFrame(motionRafRef.current);
    setMotionProgress(0);
    const start = performance.now();
    const duration = 650;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      const k = Math.min(1, (ts - start) / duration);
      setMotionProgress(easeOutCubic(k));
      if (k < 1) {
        motionRafRef.current = requestAnimationFrame(step);
      } else {
        motionRafRef.current = null;
        previousBaseRef.current = base;
        setMotionProgress(1);
      }
    };
    motionRafRef.current = requestAnimationFrame(step);
    return () => {
      if (motionRafRef.current) cancelAnimationFrame(motionRafRef.current);
      motionRafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animation triggers on baseSignature change; adding `base` would re-run on every render
  }, [baseSignature]);

  const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
  const motionBase: Row[] = motionProgress >= 1
    ? base
    : base.map((p) => {
        const old = motionSourceRef.current.get(p.projectId);
        if (!old) return p;
        return {
          ...p,
          xDisp: lerp(old.xDisp, p.xDisp, motionProgress),
          yDisp: lerp(old.yDisp, p.yDisp, motionProgress),
          yValue: lerp(old.yValue, p.yValue, motionProgress),
          benchmarkRate: lerp(old.benchmarkRate, p.benchmarkRate, motionProgress),
          effectiveMarketSellThroughRate: lerp(old.effectiveMarketSellThroughRate || old.benchmarkRate, p.effectiveMarketSellThroughRate || p.benchmarkRate, motionProgress),
          sellThroughCompetitiveness: lerp(old.sellThroughCompetitiveness || old.yValue, p.sellThroughCompetitiveness || p.yValue, motionProgress),
          bubbleValue: lerp(old.bubbleValue, p.bubbleValue, motionProgress),
        };
      });

  // Time playback
  const [frame, setFrame] = useState(0);
  const [maxFrame, setMaxFrame] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playSession, setPlaySession] = useState(0);
  useEffect(() => {
    if (playing) {
      setHasPlayed(true);
      setPlaySession((n) => n + 1);
    }
  }, [playing]);
  useEffect(() => { if (!selectedId) { setHasPlayed(false); setPlaying(false); setFrame(0); } }, [selectedId]);
  const rafRef = useRef<number | null>(null);

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
      else {
        setFrame(0);
        setPlaying(false);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, maxFrame]);

  const hashStr = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  };

  const displayData = motionBase.map((p) => {
    // 仅选中气泡参与动态位移与数值跳变，其余项目保持当月静态位置
    if (frame === 0 || !selectedId || p.projectId !== selectedId) return p;
    const hx = hashStr(p.projectId + ":px");
    const hy = hashStr(p.projectId + ":py");
    const dx = (((hx % 1000) / 1000) - 0.5) * 0.4 * frame;
    const dy = (((hy % 1000) / 1000) - 0.5) * 0.3 * frame;
    const marginDelta = (((hx % 1000) / 1000) - 0.5) * 0.04 * frame;
    const priceDelta = (((hx % 1000) / 1000) - 0.5) * 0.06 * frame;
    const rateDelta = (((hy % 1000) / 1000) - 0.5) * 0.05 * frame;
    const newProfitMargin = p.profitMargin + marginDelta;
    const newPriceRatio = Math.max(0.01, p.priceRatio + priceDelta);
    const newSellRate = Math.max(0, Math.min(1, p.sellRate + rateDelta));
    const benchmark = p.benchmarkRate || p.effectiveMarketSellThroughRate || p.marketSellThroughRate || 0;
    const newCompetitiveness = benchmark > 0 ? newSellRate / benchmark : 0;
      const newYValue = useCompetitiveness ? newCompetitiveness : newSellRate;
    const newProfitAmount = Math.max(0.01, p.remainingValue) * newProfitMargin;
    // 播放时气泡大小口径也应随帧变化：
    // - 剩余货值：按 dy 比例微幅波动，反映月度存货增减；
    // - 销售均价：按 priceDelta 缩放，反映价格调整。
    const valueSizeDelta = currentSize === "salesFloorPrice"
      ? p.bubbleValue * (1 + priceDelta * 0.5)
      : Math.max(0.01, p.bubbleValue * (1 + dy * 0.15));
    const newBubbleValue = useValueSize ? Math.max(0.01, valueSizeDelta) : Math.max(0.01, newProfitAmount);
    return {
      ...p,
      xDisp: Math.max(0.02, Math.min(2.98, p.xDisp + dx)),
      yDisp: Math.max(0.02, Math.min(2.98, p.yDisp + dy)),
      profitMargin: newProfitMargin,
      priceRatio: newPriceRatio,
      sellRate: newSellRate,
      sellThroughCompetitiveness: newCompetitiveness,
      yValue: newYValue,
      profitAmount: newProfitAmount,
      bubbleValue: newBubbleValue,
    };
  });


  // 选中气泡的历史轨迹点（T-maxFrame → 当月）
  const selectedBase = selectedId ? motionBase.find((p) => p.projectId === selectedId) ?? null : null;
  const trajectoryPoints = (() => {
    if (!selectedBase) return [] as Array<{ xDisp: number; yDisp: number; frame: number }>;
    const p = selectedBase;
    const hx = hashStr(p.projectId + ":px");
    const hy = hashStr(p.projectId + ":py");
    const pts: Array<{ xDisp: number; yDisp: number; frame: number }> = [];
    for (let f = maxFrame; f >= 0; f--) {
      const dx = (((hx % 1000) / 1000) - 0.5) * 0.4 * f;
      const dy = (((hy % 1000) / 1000) - 0.5) * 0.3 * f;
      pts.push({
        xDisp: Math.max(0.02, Math.min(2.98, p.xDisp + dx)),
        yDisp: Math.max(0.02, Math.min(2.98, p.yDisp + dy)),
        frame: f,
      });
    }
    return pts;
  })();
  const selectedColor = (() => {
    if (!selectedBase) return "#3B82F6";
    if (!isValue && selectedBase.profitAmount < 0) return NEGATIVE_PROFIT_COLOR;
    if (colorByCity) return colorByCityOf(selectedBase);
    if (isDistrict) return districtCellColor(displayCellKeyOf(selectedBase));
    return NINE_GRID_META[displayCellKeyOf(selectedBase)].color;
  })();

  // 9 grid cells
  const bands: Band[] = ["L", "M", "H"];
  const PROFIT_LABEL_MAP: Record<string, string> = {
    value_realization: "去化强，利润高",
    steady_sale: "去化强，利润正常",
    price_up_watch: "去化强，利润低",
    price_watch: "去化正常，利润高",
    balanced: "去化正常，利润正常",
    price_repair: "去化正常，利润低",
    sale_improvement: "去化弱，利润高",
    ops_improvement: "去化弱，利润正常",
    pressure: "去化弱，利润低",
  };
  const DISTRICT_LABEL_MAP: Record<string, string> = {
    value_realization: "板块强，售估比高",
    steady_sale: "板块强，售估比正常",
    price_up_watch: "板块强，售估比低",
    price_watch: "板块正常，售估比高",
    balanced: "板块正常，售估比正常",
    price_repair: "板块正常，售估比低",
    sale_improvement: "板块弱，售估比高",
    ops_improvement: "板块弱，售估比正常",
    pressure: "板块弱，售估比低",
  };
  const nonValueLabelMap = isDistrict ? DISTRICT_LABEL_MAP : PROFIT_LABEL_MAP;
  const cells = bands.flatMap((yb, yi) =>
    bands.map((xb, xi) => {
      const key = cellKeyOf(xb, yb);
      const meta = NINE_GRID_META[key];
      // value 模式：保留原九宫格"售估比"叙述；profit 模式：使用利润叙述；district 模式：使用区县能级叙述
      const label = isValue ? meta.label : nonValueLabelMap[key];
      const category = isDistrict ? (DISTRICT_CATEGORY_BY_KEY[key] || "watch") : meta.category;
      const catMeta = CATEGORY_META[category];
      return {

        key,
        x1: xi,
        x2: xi + 1,
        y1: yi,
        y2: yi + 1,
        label,
        color: isDistrict ? catMeta.color : meta.color,
        soft: isDistrict ? catMeta.soft : meta.soft,
        category,
        categoryLabel: catMeta.label,
      };
    })
  );

  // Bubble size by 利润 / 剩余货值 / 去化率（district 模式：气泡大小已离散为 5 档，pMin/pMax 固定 [0,1]）
  const bubbleSizes = enriched.map((p) => p.bubbleSize);
  const pMin = isDistrict
    ? 0
    : isRateSize
      ? (bubbleSizes.length ? Math.min(...bubbleSizes) : 0)
      : Math.min(0.1, ...bubbleSizes);
  const pMax = isDistrict
    ? 1
    : isRateSize
      ? (bubbleSizes.length ? Math.max(...bubbleSizes) : 1)
      : Math.max(2, ...bubbleSizes);
  const zRange: [number, number] = isDistrict ? [120, 2400] : isRateSize ? [40, 2400] : [120, 1600];

  const sliderVal = maxFrame - frame;
  const ticks = Array.from({ length: maxFrame + 1 }, (_, p) => p);

  // 选中气泡数值标签：使用 ref 同步最新参数，组件实例稳定，保证 CountUp 动画
  const selLabelRef = useRef<{
    selectedId: string;
    xDisp: number;
    yDisp: number;
    rPx: number;
    showInside: boolean;
    displayValue: number;
    unitStr: string;
    bubbleFill: string;
  } | null>(null);
  {
    const sel = selectedBase ? displayData.find((d) => d.projectId === selectedId) : null;
    if (sel) {
      const [rngLo, rngHi] = zRange;
      const t = Math.max(0, Math.min(1, (sel.bubbleSize - pMin) / (pMax - pMin || 1)));
      const size = rngLo + t * (rngHi - rngLo);
      const rPx = Math.sqrt(size / Math.PI);
      const bubbleFill = !isValue && sel.profitAmount < 0
        ? NEGATIVE_PROFIT_COLOR
        : colorByCity ? colorByCityOf(sel)
        : isDistrict ? districtCellColor(displayCellKeyOf(sel))
        : NINE_GRID_META[displayCellKeyOf(sel)].color;
      selLabelRef.current = {
        selectedId: sel.projectId,
        xDisp: sel.xDisp,
        yDisp: sel.yDisp,
        rPx,
        showInside: rPx >= 22,
        displayValue: formatSizeValue(sel.bubbleValue),
        unitStr: sizeUnit,
        bubbleFill,
      };
    } else {
      selLabelRef.current = null;
    }
  }
  const SelectedLabel = useMemo(() => {
    const Comp = (props: { xAxisMap?: Record<string, { scale: (v: number) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }>; offset?: { top?: number } }) => {
      const s = selLabelRef.current;
      if (!s) return null;
      const xAxis = props.xAxisMap ? Object.values(props.xAxisMap)[0] : null;
      const yAxis = props.yAxisMap ? Object.values(props.yAxisMap)[0] : null;
      if (!xAxis || !yAxis) return null;
      const cx = xAxis.scale(s.xDisp);
      const cy = yAxis.scale(s.yDisp);
      const top = props.offset?.top ?? 0;
      let labelY: number;
      let baseline: "auto" | "middle";
      if (s.showInside) {
        labelY = cy;
        baseline = "middle";
      } else if (cy - s.rPx - 8 < top + 12) {
        labelY = cy + s.rPx + 14;
        baseline = "auto";
      } else {
        labelY = cy - s.rPx - 8;
        baseline = "auto";
      }
      return (
        <g pointerEvents="none">
          <CountUpText
            key={`${s.selectedId}-${mode}-${playSession}`}
            x={cx}
            y={labelY}
            value={s.displayValue}
            unit={s.unitStr}
            color={s.showInside ? "#FFFFFF" : "#0F172A"}
            fontSize={s.showInside ? 13 : 12}
            stroke={s.showInside ? s.bubbleFill : "#FFFFFF"}
            baseline={baseline}
          />
        </g>
      );
    };
    return Comp;
  }, [mode, playSession]);


  return (
    <div className={bare ? "flex flex-col w-full h-[640px]" : `${PANEL_CLS} p-4 h-[700px] flex flex-col w-full`}>
      {!bare && (
        <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-[#F1F5F9]">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold whitespace-nowrap">
              {isValue ? "项目去化与货值九宫格分析" : isDistrict ? "板块能级与售估比九宫格分析" : "项目去化与利润九宫格分析"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {isValue
                ? "横轴是售估比（销售均价 / 中介估值），纵轴是将项目去化率分别与所在板块/所在城市/全国的所有项目进行排名，然后按照前30/后30分成3档，根据项目的去化竞争力和售估比，定位项目所在去化竞争力档位与售估比区间，气泡大小为剩余货值，左下角的项目去化弱价格也低，需要重点关注。"
                : isDistrict
                  ? "横轴是售估比（销售均价 / 中介估值），纵轴将全国的板块进行排名，然后按照前30/后30分成3档，根据项目所在板块的去化率和售估比，定位项目所在板块能级与售估比区间，气泡大小为项目去化率，可以从右下角中去化高的项目找经验，从左上角中去化低的项目找原因。"
                  : "基于利润率与去化流速，动态支撑营销定价与经营决策。"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isDistrict && (
              <div className="flex items-center gap-4 flex-wrap justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">项目阶段</span>
                  <TooltipProvider delayDuration={120}>
                    <div className="inline-flex rounded-md border border-[#E2E8F0] bg-white p-0.5 text-[11px]">
                      {(Object.keys(STAGE_LABEL) as StageKey[]).map((k) => {
                        const active = stage === k;
                        const hint = STAGE_HINT[k];
                        return (
                          <div key={k} className="inline-flex items-center">
                            <button
                              type="button"
                              onClick={() => setStage(k)}
                              className={`px-2.5 py-1 rounded transition-colors ${
                                active
                                  ? "bg-[#1677FF] text-white font-medium shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {STAGE_LABEL[k]}
                            </button>
                            {hint && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={`${STAGE_LABEL[k]} 判定规则`}
                                    className="ml-0.5 mr-1 text-[#94A3B8] hover:text-[#1677FF] transition-colors"
                                  >
                                    <HelpCircle className="w-3 h-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px] text-[11px] leading-relaxed">
                                  {hint}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">气泡大小</span>
                  <div className="inline-flex rounded-md border border-[#E2E8F0] bg-white p-0.5 text-[11px]">
                    {[
                      { k: "snakeSellThroughRate" as SizeMetric, label: "去化率" },
                      { k: "remainingValue" as SizeMetric, label: "剩余货值" },
                    ].map((opt) => {
                      const active = currentSize === opt.k;
                      return (
                        <button
                          key={opt.k}
                          type="button"
                          onClick={() => setInternalSize(opt.k)}
                          className={`px-2.5 py-1 rounded transition-colors ${
                            active
                              ? "bg-[#1677FF] text-white font-medium shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {!isDistrict && (
              <div className="text-[11px] text-muted-foreground leading-5 text-right">
                {isValue
                  ? `横轴：售估比｜纵轴：${useCompetitiveness ? "去化竞争力（项目去化率 VS 基准去化率）" : "项目去化率"}｜气泡大小：${sizeLabel}`
                  : "横轴：项目利润率｜纵轴：项目去化率｜气泡大小：利润"}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="relative flex-1 min-h-0 flex flex-col"
        onClickCapture={(e) => {
          const el = e.target as Element | null;
          if (el && el.closest && el.closest(".recharts-scatter-symbol")) return;
          onClearSelection();
        }}
      >
        <div className="text-xs text-slate-800 font-semibold whitespace-nowrap leading-none pl-9 pb-1 pointer-events-none">
          {isDistrict ? "Y · 板块能级（区县去化率 VS 全国所有板块去化率）" : useCompetitiveness ? `Y · 去化竞争力（项目去化率 VS ${COMPARE_LABEL[projects[0]?.compareMode ?? "street"]}去化率）` : "Y · 项目去化率"}
        </div>
        <div className="relative flex-1 min-h-0">
          <div className="absolute bottom-0 right-3 text-xs text-slate-800 font-semibold z-10 pointer-events-none whitespace-nowrap leading-none">
            {isValue ? "X · 售估比（销售均价 / 中介估值）" : isDistrict ? "X · 售估比（销售均价 / 中介估值）" : "X · 项目利润率"}
          </div>
          <div className="absolute inset-0">
            <ResponsiveContainer>
              <ScatterChart
                margin={{ top: 8, right: 24, bottom: 28, left: 36 }}
              >
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="xDisp"
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickFormatter={(v: number) => {
                    const fmt = (x: number) => (isValue || isDistrict ? x.toFixed(2) : fmtPct(x, 0));
                    if (v === 0) return fmt(xMin);
                    if (v === 1) return fmt(xT.low);
                    if (v === 2) return fmt(xT.high);
                    if (v === 3) return fmt(xMax);
                    return "";
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="yDisp"
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  width={96}
                  tickFormatter={(v: number) => {
                    const fy = (x: number) => fmtPct(x, 2);
                    if (isValue && useCompetitiveness) {
                      if (v === 0) return "0%";
                      if (v === 1) return "30%";
                      if (v === 2) return "70%";
                      if (v === 3) return "100%";
                      return "";
                    }
                    if (v === 0) return fy(yMin);
                    if (v === 1) return `(后30分位)${fy(yT.low)}`;
                    if (v === 2) return `(前30分位)${fy(yT.high)}`;
                    if (v === 3) return fy(yMax);
                    return "";
                  }}
                />
                <ZAxis
                  type="number"
                  dataKey="bubbleSize"
                  range={zRange}
                  domain={[pMin, pMax]}
                  name={sizeLabel}
                />

                {cells.map((c) => (
                  <ReferenceArea
                    key={`bg-${c.key}`}
                    x1={c.x1}
                    x2={c.x2}
                    y1={c.y1}
                    y2={c.y2}
                    fill={c.color}
                    fillOpacity={0.07}
                    stroke="none"
                  />
                ))}
                <ReferenceLine x={1} stroke="#94A3B8" strokeWidth={1} />
                <ReferenceLine x={2} stroke="#94A3B8" strokeWidth={1} />
                <ReferenceLine y={1} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 4" />
                <ReferenceLine y={2} stroke="#94A3B8" strokeWidth={1} />

                {cells.map((c) => (
                  <ReferenceArea
                    key={`lbl-${c.key}`}
                    x1={c.x1}
                    x2={c.x2}
                    y1={c.y1}
                    y2={c.y2}
                    fill="transparent"
                    label={{
                      value: c.label,
                      position: "insideTopLeft",
                      offset: 6,
                      fontSize: 10,
                      fill: c.color,
                      fontWeight: 500,
                    }}
                  />
                ))}

                <RTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={((props: { active?: boolean; payload?: Array<{ payload?: Row }> }) => {
                    const { active, payload } = props;
                    if (!active || !payload?.length || !payload[0].payload) return null;
                    const p = payload[0].payload;
                    const meta = NINE_GRID_META[displayCellKeyOf(p)];
                    const regionLabel = isValue ? meta.label : (nonValueLabelMap[meta.key] ?? meta.label);
                    const districtCat = isDistrict ? CATEGORY_META[DISTRICT_CATEGORY_BY_KEY[meta.key] || "watch"] : null;
                    const regionColor = districtCat ? districtCat.color : meta.color;
                    const regionSoft = districtCat ? districtCat.soft : meta.soft;
                    const wan = (v: number) => (v / 10000).toFixed(2);
                    if (isValue) {
                      const benchmarkRate = p.benchmarkRate || p.effectiveMarketSellThroughRate || p.marketSellThroughRate || 0;
                      const benchmarkLabel = `${COMPARE_LABEL[p.compareMode] ?? "基准"}去化率`;
                      // 去化竞争力：不再展示项目去化率 / 基准去化率的比值，
                      // 改为根据当前数据集 30 / 70 分位（yT.low / yT.high）判定项目所在能级档位。
                      // 使用当前 Y 轴指标（sellRate 或 competitiveness）对应的 yT 30/70 分位判定档位，
                      // 保证招商蛇口维度（yMetric=sellRate）与城市公司维度（yMetric=competitiveness）都能正确联动。
                      const tier = tierOf(p.yValue, yT.low, yT.high);
                      const tierText = tier.text;
                      const tierColor = tier.color;
                      const priceRatioColor =
                        p.priceRatio > 1.2
                          ? "#10B981"
                          : p.priceRatio < 0.8
                          ? "#EF4444"
                          : "#3B82F6";
                      return (
                        <div
                          className="rounded-xl bg-white border border-[#E5E7EB] shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-3 min-w-[280px]"
                          style={{ fontFamily: '"Source Han Sans SC","Source Han Sans","Noto Sans SC",sans-serif' }}
                        >
                          <div className="flex items-center justify-end mb-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F8FAFC] text-[11px] text-[#6B7280]">
                              <span
                                className="inline-block rounded-full"
                                style={{ width: 8, height: 8, background: "#CBD5E1", border: "1px solid #94A3B8" }}
                              />
                              气泡大小：{sizeLabel}
                            </span>
                          </div>

                          <div className="text-[13.5px] font-semibold leading-tight text-[#111827]">
                            {formatProjectName(p.projectName)}
                          </div>
                          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-muted-foreground">区域街道</span>
                            <span className="text-right text-foreground truncate">{p.district} · {p.street}</span>
                            <span className="text-muted-foreground">总房间数</span>
                            <span className="text-right tabular-nums text-foreground">{p.roomCount}</span>
                            <span className="text-muted-foreground">在售房间数</span>
                            <span className="text-right tabular-nums text-foreground">{p.onSaleRoomCount}</span>
                          </div>

                          <div className="my-2.5 border-t border-[#F1F5F9]" />

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-muted-foreground">项目去化率</span>
                            <span className="text-right tabular-nums text-foreground">{(p.sellRate * 100).toFixed(2)}%</span>
                            <span className="text-muted-foreground">{benchmarkLabel}</span>
                            <span className="text-right tabular-nums text-foreground">{(benchmarkRate * 100).toFixed(2)}%</span>
                            <span className="text-muted-foreground">去化竞争力</span>
                            <span
                              className="text-right font-semibold"
                              style={{ color: tierColor }}
                            >
                              {tierText}
                            </span>
                          </div>

                          <div className="my-2.5 border-t border-[#F1F5F9]" />

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-muted-foreground">销售均价</span>
                            <span className="text-right tabular-nums text-foreground">{wan(p.salesFloorPrice)}万/㎡</span>
                            <span className="text-muted-foreground">中介估值</span>
                            <span className="text-right tabular-nums text-foreground">{wan(p.cmbValuationPrice)}万/㎡</span>
                            <span className="text-muted-foreground">当前售估比</span>
                            <span className="text-right tabular-nums font-semibold" style={{ color: priceRatioColor }}>
                              {p.priceRatio.toFixed(2)}
                            </span>
                          </div>

                          <div className="my-2.5 border-t border-[#F1F5F9]" />

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-muted-foreground">剩余货值</span>
                            <span className="text-right tabular-nums font-semibold text-foreground">{p.remainingValue.toFixed(2)}亿</span>
                            <span className="text-muted-foreground">所属区域</span>
                            <span className="text-right">
                              <span
                                className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-medium"
                                style={{ background: regionSoft, color: regionColor }}
                              >
                                {regionLabel}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    }
                    if (isDistrict) {
                      const wan = (v: number) => (v / 10000).toFixed(2);
                      const tierText =
                        p.marketSellThroughRate > yT.high
                          ? "板块强"
                          : p.marketSellThroughRate < yT.low
                          ? "板块弱"
                          : "板块正常";
                      const tierColor =
                        p.marketSellThroughRate > yT.high
                          ? SEMANTIC_TIER.concern
                          : p.marketSellThroughRate < yT.low
                          ? SEMANTIC_TIER.advantage
                          : SEMANTIC_TIER.normal;
                      const priceRatioColor =
                        p.priceRatio > 1.1
                          ? "#10B981"
                          : p.priceRatio < 0.9
                          ? "#EF4444"
                          : "#3B82F6";
                      return (
                        <div
                          className="rounded-xl bg-white border border-[#E5E7EB] shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-3 min-w-[280px]"
                          style={{ fontFamily: '"Source Han Sans SC","Source Han Sans","Noto Sans SC",sans-serif' }}
                        >
                          <div className="flex items-center justify-end mb-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F8FAFC] text-[11px] text-[#6B7280]">
                              <span
                                className="inline-block rounded-full"
                                style={{ width: 8, height: 8, background: "#CBD5E1", border: "1px solid #94A3B8" }}
                              />
                              气泡大小：{sizeLabel}
                            </span>
                          </div>
                          <div className="text-[13.5px] font-semibold leading-tight text-[#111827]">
                            {formatProjectName(p.projectName)}
                          </div>

                          <div className="my-2.5 border-t border-[#F1F5F9]" />

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-muted-foreground">销售均价</span>
                            <span className="text-right tabular-nums text-foreground">{wan(p.salesFloorPrice)}万/㎡</span>
                            <span className="text-muted-foreground">中介估值</span>
                            <span className="text-right tabular-nums text-foreground">{wan(p.cmbValuationPrice)}万/㎡</span>
                            <span className="text-muted-foreground">售估比</span>
                            <span className="text-right tabular-nums font-semibold" style={{ color: priceRatioColor }}>
                              {p.priceRatio.toFixed(2)}
                            </span>
                          </div>

                          <div className="my-2.5 border-t border-[#F1F5F9]" />

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-muted-foreground">项目去化率</span>
                            <span className="text-right tabular-nums text-foreground">{fmtPct(p.sellRate, 2)}</span>
                            <span className="text-muted-foreground">区县去化率</span>
                            <span className="text-right tabular-nums text-foreground">{fmtPct(p.marketSellThroughRate || 0, 2)}</span>
                            <span className="text-muted-foreground">板块能级</span>
                            <span className="text-right font-semibold" style={{ color: tierColor }}>{tierText}</span>
                          </div>

                          <div className="my-2.5 border-t border-[#F1F5F9]" />

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-muted-foreground">所属区域</span>
                            <span className="text-right">
                              <span
                                className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-medium"
                                style={{ background: regionSoft, color: regionColor }}
                              >
                                {regionLabel}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-lg bg-white border border-[#E2E8F0] shadow-[0_6px_18px_rgba(15,23,42,0.10)] text-xs px-3 py-2 min-w-[240px]">
                        <div className="flex items-center justify-end mb-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F8FAFC] text-[11px] text-[#6B7280]">
                            <span
                              className="inline-block rounded-full"
                              style={{ width: 8, height: 8, background: "#CBD5E1", border: "1px solid #94A3B8" }}
                            />
                            气泡大小：{sizeLabel}
                          </span>
                        </div>
                        <div className="font-semibold text-foreground mb-1.5">{formatProjectName(p.projectName)}</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pb-1.5 mb-1.5 border-b border-slate-200">
                          <span className="text-muted-foreground">项目利润率</span>
                          <span className="text-right tabular-nums font-medium text-foreground">{fmtPct(p.profitMargin, 1)}</span>
                          <span className="text-muted-foreground">项目去化率</span>
                          <span className="text-right tabular-nums font-medium text-foreground">{fmtPct(p.sellRate, 1)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pb-1.5 mb-1.5 border-b border-slate-200">
                          <span className="text-muted-foreground">利润</span>
                          <span className="text-right tabular-nums font-medium text-foreground">{fmtYi(p.profitAmount)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                          <span className="text-muted-foreground">所属区域</span>
                          <span className="text-right font-medium" style={{ color: regionColor }}>{regionLabel}</span>
                        </div>
                      </div>
                    );
                  }) as unknown as React.ComponentProps<typeof RTooltip>["content"]}
                />


                {/* 选中气泡的历史轨迹：虚线 + 节点圆点（图层在气泡之下） */}
                {!isDistrict && selectedId && trajectoryPoints.length > 1 && (
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

                  {displayData.map((p) => {
                    const isSelected = selectedId === p.projectId;
                    const isHover = !isSelected && hoveredId === p.projectId;
                    const anyActive = !!(selectedId || hoveredId);
                    const isUnmatched = !!matchedIds && !matchedIds.has(p.projectId);
                    const dim = anyActive && !isSelected && !isHover;
                    // Color by city (group view) or by quadrant
                    const key = displayCellKeyOf(p);
                    const fill = !isValue && p.profitAmount < 0
                      ? NEGATIVE_PROFIT_COLOR
                      : colorByCity ? colorByCityOf(p)
                      : isDistrict ? districtCellColor(key)
                      : NINE_GRID_META[key].color;
                    return (
                      <Cell
                        key={p.projectId}
                        fill={fill}
                        fillOpacity={isUnmatched ? 0.08 : isSelected ? 1 : isHover ? 0.9 : dim ? 0.25 : 0.82}
                        stroke={isSelected || isHover ? "var(--color-brand)" : "#fff"}
                        strokeWidth={isSelected ? 3 : isHover ? 1.5 : 1}
                        strokeOpacity={isUnmatched ? 0.15 : 1}
                        style={{ cursor: isUnmatched ? "default" : "pointer", pointerEvents: isUnmatched ? "none" : "auto" }}
                      />
                    );
                  })}
                </Scatter>

                {/* 选中气泡数值标签 */}
                {(() => {
                  const C = Customized as unknown as React.FC<{ component: React.ComponentType<object> }>;
                  return <C component={SelectedLabel as unknown as React.ComponentType<object>} />;
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
      </div>

      {/* 时间沙盘：板块能级模块隐藏 */}
      {!isDistrict && (
        <div className="mt-3">
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#EEF2F7]">
            <button
              type="button"
              disabled={!selectedId}
              onClick={(e) => {
                e.stopPropagation();
                if (!selectedId) return;
                setPlaying((v) => !v);
              }}
              className={`w-9 h-9 rounded-full text-white inline-flex items-center justify-center shadow-sm transition-opacity ${
                selectedId ? "bg-[var(--color-brand)] hover:opacity-90 cursor-pointer" : "bg-[#CBD5E1] cursor-not-allowed"
              }`}
              aria-label={!selectedId ? "请先选中气泡" : playing ? "暂停" : "播放"}
              title={!selectedId ? "请先在九宫格中选中一个项目气泡，再开始播放" : playing ? "暂停" : "播放"}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <Slider
                value={[sliderVal]}
                min={0}
                max={maxFrame}
                step={1}
                onValueChange={(v) => {
                  setFrame(maxFrame - (v[0] ?? 0));
                  setPlaying(false);
                }}
                className="flex-1"
              />
              <div className="relative h-5 select-none">
                {ticks.map((p) => {
                  const leftPct = (p / maxFrame) * 100;
                  const fr = maxFrame - p;
                  const label = fr === 0 ? "当月" : `T-${fr}`;
                  const active = p === sliderVal;
                  const isFirst = p === 0;
                  const isLast = p === maxFrame;
                  const translate = isFirst ? "translate-x-0" : isLast ? "-translate-x-full" : "-translate-x-1/2";
                  const tickAlign = isFirst ? "items-start" : isLast ? "items-end" : "items-center";
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setFrame(fr);
                        setPlaying(false);
                      }}
                      className={`absolute top-0 ${translate} flex flex-col ${tickAlign} gap-0.5 cursor-pointer`}
                      style={{ left: `${leftPct}%` }}
                    >
                      <span className="w-px h-1 bg-[#CBD5E1]" />
                      <span
                        className="text-[11px] tabular-nums leading-none whitespace-nowrap transition-colors"
                        style={{ color: active ? "#1677FF" : "#64748B" }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { m: 3, label: "3 个月" },
                { m: 6, label: "6 个月" },
                { m: 12, label: "1 年" },
              ].map((opt) => {
                const active = maxFrame === opt.m - 1;
                return (
                  <button
                    key={opt.m}
                    type="button"
                    onClick={() => {
                      setMaxFrame(opt.m - 1);
                      setFrame(0);
                    }}
                    className={`h-7 px-2.5 rounded-md border text-[11px] transition-colors ${
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
                        : "border-[#E2E8F0] bg-white text-foreground hover:border-[var(--color-brand)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* CountUp 数字滚动跳动 */
function CountUpText({
  x, y, value, unit, color, fontSize, stroke, baseline = "auto",
}: {
  x: number; y: number; value: number; unit: string;
  color: string; fontSize: number; stroke?: string;
  baseline?: "auto" | "middle";
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (Math.abs(from - to) < 0.001) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const dur = 600;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setDisplay(from + (to - from) * e);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline={baseline === "middle" ? "central" : "auto"}
      fontSize={fontSize}
      fontWeight={700}
      fill={color}
      stroke={stroke}
      strokeWidth={stroke ? 0.6 : 0}
      paintOrder="stroke"
      style={{ fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}
    >
      {display.toFixed(2)} {unit}
    </text>
  );
}
