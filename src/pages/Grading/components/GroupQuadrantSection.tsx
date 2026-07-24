import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, ChevronDown, Check, Calendar as CalendarIcon, HelpCircle, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DateRange } from "react-day-picker";
import { groupProjectAnalysisData } from "@/data/groupProjectAnalysisData";
import { formatProjectName } from "@/lib/format";


/* ============================== 类型 ============================== */
type GroupKey = "all" | "super" | "g1" | "g2";
type CompareBenchmark = "competitor" | "street" | "city" | "nation";
type StageKey = "all" | "new" | "持销" | "尾盘";

const GROUP_LABEL: Record<GroupKey, string> = {
  all: "全部", super: "超级城市", g1: "第一群组", g2: "第二群组",
};
const COMPARE_LABEL: Record<CompareBenchmark, string> = {
  competitor: "竞品", street: "区县", city: "城市", nation: "全国",
};
const COMPARE_FILTER_LABEL: Record<CompareBenchmark, string> = {
  competitor: "与竞品比", street: "与板块比", city: "与城市比", nation: "与全国比",
};
const STAGE_LABEL: Record<StageKey, string> = {
  all: "全部", new: "新盘", 持销: "持销", 尾盘: "尾盘",
};
const STAGE_HINT: Partial<Record<StageKey, string>> = {
  new: "新盘定义：滚动 1 年（12 个月）内开盘的项目。",
  持销: "持销定义：项目开盘已超过 1 年，且当前整体去化率 < 95%。",
  尾盘: "尾盘定义：项目整体去化率 ≥ 95%。",
};

const GROUP_CITY: Record<GroupKey, string[]> = {
  all: [],
  super: ["上海", "深圳"],
  g1: ["北京", "广州", "杭州", "南京", "苏州"],
  g2: ["成都", "武汉", "西安", "合肥", "长沙"],
};

const CITY_COLOR: Record<string, string> = {
  上海: "#1D4ED8", 深圳: "#10B981", 北京: "#7C3AED", 广州: "#F59E0B",
  杭州: "#0E9C8F", 南京: "#DB2777", 苏州: "#0EA5E9", 成都: "#EA580C",
  武汉: "#9333EA", 西安: "#CA8A04", 合肥: "#0891B2", 长沙: "#BE123C",
  佛山: "#16A34A",
};
function hashCityColor(city: string): string {
  let h = 2166136261;
  for (let i = 0; i < city.length; i++) { h ^= city.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hue = (h >>> 0) % 360;
  const sat = 55 + ((h >>> 8) % 25);
  const light = 42 + ((h >>> 16) % 12);
  return `hsl(${hue} ${sat}% ${light}%)`;
}
const colorOf = (city: string) => CITY_COLOR[city] || hashCityColor(city);

/* ============================== 数据派生 ============================== */
interface BubbleRow {
  id: string;
  name: string;
  city: string;
  cityCompany: string;
  district: string;
  street: string;
  roomCount: number;
  onSaleRoomCount: number;
  remainingValue: number;
  totalValue: number;
  salesFloorPrice: number;
  cmbValuationPrice: number;
  marketAvgDealPrice: number;
  snakeRate: number;
  marketRate: number;
  stage: StageKey;
}

// 由项目 id 派生稳定的“开盘距今月数”，模拟真实开盘时间字段。
function monthsSinceOpen(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  // 范围 1 ~ 36 个月
  return 1 + (h % 36);
}
function getStage(snakeRate: number, monthsOpen: number): StageKey {
  if (snakeRate >= 0.95) return "尾盘";
  if (monthsOpen <= 12) return "new";
  return "持销";
}

const ALL_BUBBLES: BubbleRow[] = groupProjectAnalysisData.map((p) => {
  const city = (p.cityCompany || "").replace(/公司$/, "");
  return {
    id: p.projectId,
    name: formatProjectName(p.projectName),
    city,
    cityCompany: p.cityCompany,
    district: p.district,
    street: p.street,
    roomCount: p.roomCount,
    onSaleRoomCount: p.onSaleRoomCount,
    remainingValue: p.remainingValue,
    totalValue: p.totalValue,
    salesFloorPrice: p.salesFloorPrice,
    cmbValuationPrice: p.cmbValuationPrice,
    marketAvgDealPrice: p.marketAvgDealPrice,
    snakeRate: p.snakeSellThroughRate,
    marketRate: p.marketSellThroughRate,
    stage: getStage(p.snakeSellThroughRate, monthsSinceOpen(p.projectId)),
  };
});

const ALL_CITIES_SORTED = Array.from(new Set(ALL_BUBBLES.map((b) => b.city))).sort();

/* 12 个月历史轨迹（基于当前快照确定性反推） */
function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}
interface Snapshot { x: number; y: number; r: number; snakeRate: number; remainingValue: number; }
function buildTrajectory(b: BubbleRow, benchmark: number): Snapshot[] {
  const rand = seeded(b.id);
  const snaps: Snapshot[] = [];
  let snake = b.snakeRate;
  let remaining = b.remainingValue;
  // 售估比 = 销售均价 / 中介估值（业务定义：>1 表示售价高于估值，存在高溢价）
  let xRatio = b.cmbValuationPrice > 0 ? b.salesFloorPrice / b.cmbValuationPrice : 0;
  for (let m = 0; m < 12; m++) {
    snaps.push({
      x: xRatio,
      y: benchmark > 0 ? snake / benchmark : 0,
      r: remaining,
      snakeRate: snake,
      remainingValue: remaining,
    });
    // 走向过去：去化率更低、剩余货值更大、价格波动
    snake = Math.max(0.02, snake - (0.01 + rand() * 0.025));
    remaining = remaining * (1 + 0.045 + rand() * 0.055);
    xRatio = xRatio * (1 + (rand() - 0.5) * 0.018);
  }
  return snaps; // [0] = 当前，[11] = 12 个月前
}

/* ============================== 主组件 ============================== */
export function GroupQuadrantSection() {
  const [group, setGroup] = useState<GroupKey>("super");
  const [cities, setCities] = useState<string[]>(GROUP_CITY.super);
  const [benchmark, setBenchmark] = useState<CompareBenchmark>("competitor");
  const [stage, setStage] = useState<StageKey>("all");
  // 图例交互：隐藏的城市集合 + 单选城市（双击）
  const [hiddenCities, setHiddenCities] = useState<Set<string>>(new Set());
  const [soloCity, setSoloCity] = useState<string | null>(null);
  // 群组/城市变化时清空图例状态
  const citiesKey = cities.join(",");
  useEffect(() => { setHiddenCities(new Set()); setSoloCity(null); }, [group, citiesKey]);

  // 群组切换时联动默认城市
  const lastGroupRef = useRef<GroupKey>(group);
  useEffect(() => {
    if (lastGroupRef.current === group) return;
    lastGroupRef.current = group;
    if (group === "all") setCities(ALL_CITIES_SORTED);
    else setCities(GROUP_CITY[group].filter((c) => ALL_CITIES_SORTED.includes(c)));
  }, [group]);

  // 时间播放器：当前帧 0=当前，越大越早
  const [frame, setFrame] = useState(0);
  const [maxFrame, setMaxFrame] = useState(5); // 默认 6 个月范围 → 5 步
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    // 单次播放：总时长锁定 3.5s，从最早月份 → 当月，定格后自动停止（不循环）
    const TOTAL_DURATION = 3500;
    // cubic-bezier(0.4, 0, 0.2, 1) 缓动
    const easeInOut = (t: number) => {
      // 近似 cubic-bezier(0.4, 0, 0.2, 1)
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    // 启动时确保从最早一帧开始
    setFrame(maxFrame);
    const startTs = performance.now();
    const step = (ts: number) => {
      const k = Math.min(1, (ts - startTs) / TOTAL_DURATION);
      const e = easeInOut(k);
      // frame 从 maxFrame(最早) → 0(当月)
      const next = Math.round(maxFrame - e * maxFrame);
      setFrame(next);
      if (k < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // 完美定格在当月，按钮图标切回播放
        setFrame(0);
        setPlaying(false);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
  }, [playing, maxFrame]);

  // 过滤数据（基准/域计算使用，不受图例隐藏影响）
  const filtered = useMemo(() => {
    return ALL_BUBBLES.filter((b) =>
      cities.includes(b.city) && (stage === "all" || b.stage === stage),
    );
  }, [cities, stage]);

  // 经过图例显隐过滤后的可见数据
  const visibleFiltered = useMemo(() => {
    return filtered.filter((b) => {
      if (soloCity) return b.city === soloCity;
      return !hiddenCities.has(b.city);
    });
  }, [filtered, hiddenCities, soloCity]);

  // 基准 = 加权 marketRate（按 remainingValue 加权）
  const benchmarkRate = useMemo(() => {
    const pool = benchmark === "nation" ? ALL_BUBBLES : filtered;
    const w = pool.reduce((s, p) => s + p.remainingValue, 0);
    if (!w) return 0.2;
    const wr = pool.reduce((s, p) => s + p.marketRate * p.remainingValue, 0) / w;
    // 街道/竞品基准在城市/全国基准基础上做小幅偏移，体现切换差异
    if (benchmark === "street") return wr * 1.05;
    if (benchmark === "competitor") return wr * 0.95;
    return wr;
  }, [filtered, benchmark]);

  const trajectories = useMemo(() => {
    return visibleFiltered.map((b) => ({ row: b, snaps: buildTrajectory(b, benchmarkRate) }));
  }, [visibleFiltered, benchmarkRate]);

  // 当前帧坐标域
  const currentPoints = useMemo(() => {
    return trajectories.map((t) => ({ row: t.row, snap: t.snaps[Math.min(frame, t.snaps.length - 1)] }));
  }, [trajectories, frame]);

  // 域：以当前数据动态计算 + padding，并对称包含 1
  // X 轴固定业务口径：0 / 0.8 / 1.2 / 2 四刻度切分
  const xDomain = useMemo<[number, number]>(() => [0, 2], []);
  const yDomain = useMemo<[number, number]>(() => {
    if (!currentPoints.length) return [0, 2];
    const ys = currentPoints.map((p) => p.snap.y);
    const hi = Math.max(1.6, ...ys);
    return [0, +(hi + 0.2).toFixed(2)];
  }, [currentPoints]);

  // 自选月份
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const onQuickRange = (months: number) => {
    setMaxFrame(months - 1);
    setFrame(0);
    setDateRange(undefined);
  };

  // 项目搜索（实时匹配项目名称 / 项目编号）
  const [searchQuery, setSearchQuery] = useState("");
  const matchedIds = useMemo<Set<string> | null>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const ids = ALL_BUBBLES
      .filter((b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q))
      .map((b) => b.id);
    return new Set(ids);
  }, [searchQuery]);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 flex flex-col gap-4 w-full">
      {/* 第一层：标题 + 全局过滤（右对齐） */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">项目去化与货值九宫格分析</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            基于售估比与去化竞争力，动态支撑货值去化与策略定价。
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索项目名称 / 编号"
              className="h-8 w-full pl-8 pr-7 rounded-md border border-[#E2E8F0] bg-white text-xs text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1677FF] focus:ring-1 focus:ring-[#1677FF]/30"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="清除搜索"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#F1F5F9] text-[#94A3B8]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <FilterGroup label="对比基准">
            <SegmentedSmall
              options={(Object.keys(COMPARE_LABEL) as CompareBenchmark[]).map((k) => ({ k, label: COMPARE_FILTER_LABEL[k] }))}
              value={benchmark} onChange={setBenchmark}
            />
          </FilterGroup>
          <FilterGroup label="项目阶段">
            <SegmentedSmall
              options={(Object.keys(STAGE_LABEL) as StageKey[]).map((k) => ({ k, label: STAGE_LABEL[k], hint: STAGE_HINT[k] }))}
              value={stage} onChange={setStage}
            />
          </FilterGroup>
        </div>
      </div>

      {/* 第二层：城市群组（左） + 城市图例（右，铺满剩余空间） */}
      <div className="flex items-center gap-5 w-full flex-wrap">
        <div className="shrink-0">
          <FilterGroup label="城市群组">
            <SegmentedSmall
              options={(Object.keys(GROUP_LABEL) as GroupKey[]).map((k) => ({ k, label: GROUP_LABEL[k] }))}
              value={group} onChange={setGroup}
            />
          </FilterGroup>
        </div>
        <div className="flex-1 min-w-0 flex justify-start">
          <CityLegend
            cities={cities}
            counts={filtered.reduce<Record<string, number>>((acc, b) => {
              acc[b.city] = (acc[b.city] || 0) + 1;
              return acc;
            }, {})}
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

      {/* 图表 */}
      <NineGridSvg
        points={currentPoints}
        trajectories={trajectories}
        frame={frame}
        maxFrame={maxFrame}
        playing={playing}
        xDomain={xDomain}
        yDomain={yDomain}
        benchmark={benchmark}
        matchedIds={matchedIds}
      />



      {/* 时间沙盘 */}
      <TimelinePlayer
        playing={playing} onTogglePlay={() => setPlaying((v) => !v)}
        frame={frame} maxFrame={maxFrame} onFrame={(f) => { setFrame(f); setPlaying(false); }}
        onQuickRange={onQuickRange}
        dateRange={dateRange} onDateRange={(r) => { setDateRange(r); if (r?.from && r?.to) {
          const months = Math.max(1, Math.min(11, Math.round((+r.to - +r.from) / (30*86400*1000))));
          setMaxFrame(months); setFrame(0);
        } }}
      />
    </div>
  );
}

/* ============================== 筛选条 ============================== */
function FilterBar({
  group, onGroup, cities, onCities, benchmark, onBenchmark, stage, onStage,
}: {
  group: GroupKey; onGroup: (v: GroupKey) => void;
  cities: string[]; onCities: (v: string[]) => void;
  benchmark: CompareBenchmark; onBenchmark: (v: CompareBenchmark) => void;
  stage: StageKey; onStage: (v: StageKey) => void;
}) {
  const cityPool = group === "all"
    ? ALL_CITIES_SORTED
    : ALL_CITIES_SORTED.filter((c) => GROUP_CITY[group].includes(c));
  const visibleCities = cityPool.length ? cityPool : ALL_CITIES_SORTED;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-3 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#EEF2F7]">
      <FilterGroup label="城市群组">
        <SegmentedSmall
          options={(Object.keys(GROUP_LABEL) as GroupKey[]).map((k) => ({ k, label: GROUP_LABEL[k] }))}
          value={group} onChange={onGroup}
        />
      </FilterGroup>


      <FilterGroup label="对比基准">
        <SegmentedSmall
          options={(Object.keys(COMPARE_LABEL) as CompareBenchmark[]).map((k) => ({ k, label: COMPARE_FILTER_LABEL[k] }))}
          value={benchmark} onChange={onBenchmark}
        />
      </FilterGroup>

      <FilterGroup label="项目阶段">
        <SegmentedSmall
          options={(Object.keys(STAGE_LABEL) as StageKey[]).map((k) => ({ k, label: STAGE_LABEL[k], hint: STAGE_HINT[k] }))}
          value={stage} onChange={onStage}
        />
      </FilterGroup>
    </div>
  );
}

/* ============================== 城市动态图例 ============================== */
function CityLegend({
  cities, counts, hidden, solo, onToggle, onSolo,
}: {
  cities: string[];
  counts: Record<string, number>;
  hidden: Set<string>;
  solo: string | null;
  onToggle: (c: string) => void;
  onSolo: (c: string) => void;
}) {
  // 双击检测
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
              isHidden
                ? "opacity-40 hover:opacity-70"
                : "opacity-100"
            } ${isSolo ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"}`}
            title="单击 显/隐 · 双击 仅看该城市"
          >
            <span
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: isHidden ? "#CBD5E1" : colorOf(c) }}
            />
            <span
              className={`tracking-wide ${isHidden ? "text-muted-foreground" : "text-foreground"} ${isSolo ? "font-semibold" : "font-medium"}`}
            >
              {c}
              <span className="ml-0.5 text-muted-foreground font-normal">（{count}项目）</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}



function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      {children}
    </div>
  );
}

function SegmentedSmall<T extends string>({
  options, value, onChange,
}: { options: { k: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="inline-flex rounded-md border border-[#E2E8F0] bg-white p-0.5 text-[11px]">
        {options.map((o) => {
          const active = value === o.k;
          return (
            <div key={o.k} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => onChange(o.k)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  active
                    ? "bg-[#1677FF] text-white font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
              {o.hint && (
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

function CityMultiSelect({
  all, value, onChange,
}: { all: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (c: string) => {
    if (value.includes(c)) onChange(value.filter((x) => x !== c));
    else onChange([...value, c]);
  };
  const allSelected = all.length > 0 && all.every((c) => value.includes(c));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-7 min-w-[160px] px-2.5 inline-flex items-center justify-between gap-2 rounded-md border border-[#E2E8F0] bg-white text-[11px] text-foreground hover:border-[var(--color-brand)] transition-colors"
        >
          <span className="truncate text-left">
            {value.length === 0 ? "请选择城市" : value.length === all.length ? "全部城市" : value.join("、")}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-1.5">
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : all)}
          className="w-full px-2 py-1.5 text-left text-[11px] rounded hover:bg-[#F1F5F9] flex items-center justify-between"
        >
          <span className="text-muted-foreground">{allSelected ? "清空" : "全选"}</span>
          <span className="text-[10px] text-muted-foreground">{value.length}/{all.length}</span>
        </button>
        <div className="h-px bg-[#EEF2F7] my-1" />
        <div className="max-h-[260px] overflow-auto">
          {all.map((c) => {
            const checked = value.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className="w-full px-2 py-1.5 text-left text-[12px] rounded hover:bg-[#F1F5F9] flex items-center gap-2"
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    checked ? "bg-[var(--color-brand)] border-[var(--color-brand)]" : "border-[#CBD5E1] bg-white"
                  }`}
                >
                  {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </span>
                <span className="flex-1 truncate">{c}</span>
                <span className="w-2 h-2 rounded-full" style={{ background: colorOf(c) }} />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ============================== 九宫格 SVG ============================== */
function NineGridSvg({
  points, trajectories, playing, maxFrame, xDomain, yDomain, benchmark, matchedIds,
}: {
  points: { row: BubbleRow; snap: Snapshot }[];
  trajectories?: { row: BubbleRow; snaps: Snapshot[] }[];
  frame?: number;
  maxFrame?: number;
  playing?: boolean;
  xDomain: [number, number];
  yDomain: [number, number];
  benchmark?: CompareBenchmark;
  matchedIds?: Set<string> | null;
}) {
  // 容器自适应：W 跟随容器宽度，H 固定，文字与气泡保持真实像素，不随放大而变大
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(1080);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(560, Math.floor(entries[0].contentRect.width));
      setW(w);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const H = 480;
  const M = { top: 28, right: 32, bottom: 44, left: 64 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  // ====== X 轴分段映射（multi-grid 拼接的等价实现） ======
  // 业务边界：0.80 / 1.20。把 [0, 0.8] / [0.8, 1.2] / [1.2, 2] 三段
  // 强制映射到物理 innerW 的三等份，保持各分区等宽。
  const X_BREAK_LO = 0.8;
  const X_BREAK_HI = 1.2;
  const segW = innerW / 3;
  const segX0 = M.left;                // 第一段起点
  const segX1 = M.left + segW;         // 0.90 对应位置
  const segX2 = M.left + segW * 2;     // 1.10 对应位置
  const segX3 = M.left + innerW;       // 右端
  const sx = (x: number) => {
    if (x <= X_BREAK_LO) {
      const span = X_BREAK_LO - xDomain[0] || 1;
      return segX0 + ((x - xDomain[0]) / span) * segW;
    }
    if (x <= X_BREAK_HI) {
      const span = X_BREAK_HI - X_BREAK_LO || 1;
      return segX1 + ((x - X_BREAK_LO) / span) * segW;
    }
    const span = xDomain[1] - X_BREAK_HI || 1;
    return segX2 + ((x - X_BREAK_HI) / span) * segW;
  };
  const sy = (y: number) => M.top + innerH - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * innerH;

  // 气泡半径：pow(remainingValue, 0.75) → [4, 40]，放大动态视觉差异
  const maxR = Math.max(1, ...points.map((p) => p.snap.r));
  const radius = (r: number) => 4 + (Math.pow(Math.max(0, r), 0.75) / Math.pow(maxR, 0.75)) * 36;

  // 排序：大在底层，小在上层
  const ordered = [...points].sort((a, b) => b.snap.r - a.snap.r);

  // Y 方向 3 等分辅助线（X 方向不再用三等分，由 0.90/1.10 两条主线切割）
  const yThirds = [yDomain[0] + (yDomain[1] - yDomain[0]) / 3, yDomain[0] + (2 * (yDomain[1] - yDomain[0])) / 3];

  // 9 格语义：row 0=去化强(Y高)，row 2=去化弱(Y低)；col 0=售估比低(X低)，col 2=售估比高
  // 配色与"项目去化与利润九宫格分析"保持一致：
  // 绿 #10B981 (优势区 advantage)、蓝 #1677FF (观察区 watch)、红 #F43F5E (关注区 concern)
  const CELL_LABELS: { text: string; color: string; bg: string }[][] = [
    [
      { text: "去化强，售估比低", color: "#1677FF", bg: "#EAF3FF" },
      { text: "去化强，售估比正常", color: "#10B981", bg: "#ECFDF5" },
      { text: "去化强，售估比高", color: "#10B981", bg: "#ECFDF5" },
    ],
    [
      { text: "去化正常，售估比低", color: "#F43F5E", bg: "#FEF2F2" },
      { text: "去化正常，售估比正常", color: "#1677FF", bg: "#EAF3FF" },
      { text: "去化正常，售估比高", color: "#10B981", bg: "#ECFDF5" },
    ],
    [
      { text: "去化弱，售估比低", color: "#F43F5E", bg: "#FEF2F2" },
      { text: "去化弱，售估比正常", color: "#F43F5E", bg: "#FEF2F2" },
      { text: "去化弱，售估比高", color: "#1677FF", bg: "#EAF3FF" },
    ],
  ];

  const [hover, setHover] = useState<{ row: BubbleRow; snap: Snapshot; sx: number; sy: number } | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedPoint = focusedId ? points.find((p) => p.row.id === focusedId) ?? null : null;
  const [hasPlayed, setHasPlayed] = useState(false);
  useEffect(() => { if (playing) setHasPlayed(true); }, [playing]);
  useEffect(() => { if (!focusedId) setHasPlayed(false); }, [focusedId]);
  const focusedTraj = focusedId ? trajectories?.find((t) => t.row.id === focusedId) : null;
  const showTrail = !!focusedTraj && (playing || hasPlayed);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width={W}
        height={H}
        className="block"
        onClick={(e) => {
          // 点击 SVG 空白区域 → 退出聚焦
          if (e.target === e.currentTarget) setFocusedId(null);
        }}
      >

        {/* 背景 纯白（点击清除聚焦） */}
        <rect
          x={M.left} y={M.top} width={innerW} height={innerH}
          fill="#FFFFFF" stroke="#9CA3AF" strokeWidth={1}
          onClick={() => setFocusedId(null)}
          style={{ cursor: focusedId ? "pointer" : "default" }}
        />

        {/* 9 格背景填色（与"项目去化与利润九宫格分析"一致：分类色 + 极淡透明度） */}
        {CELL_LABELS.map((row, ri) =>
          row.map((cell, ci) => (
            <rect
              key={`bg-${ri}-${ci}`}
              x={M.left + ci * segW}
              y={M.top + (ri * innerH) / 3}
              width={segW}
              height={innerH / 3}
              fill={cell.color}
              fillOpacity={0.07}
              style={{ pointerEvents: "none" }}
            />
          ))
        )}

        {/* X 方向 splitLine：仅由 0.90 / 1.10 两条核心业务边界切割（关闭默认 splitLine） */}
        <line x1={segX1} x2={segX1} y1={M.top} y2={M.top + innerH} stroke="#CBD5E1" strokeWidth={1} />
        <line x1={segX2} x2={segX2} y1={M.top} y2={M.top + innerH} stroke="#CBD5E1" strokeWidth={1} />
        {/* Y 方向 3 等分辅助线 —— 极淡 */}
        {yThirds.map((y, i) => (
          <line key={`yt-${i}`} x1={M.left} x2={M.left + innerW} y1={sy(y)} y2={sy(y)} stroke="#E5E7EB" strokeWidth={1} />
        ))}

        {/* 9 格区域文字：精准锚定在新分段（左 / 中 / 右）+ Y 三等分的物理单元格左上角 */}
        {CELL_LABELS.map((row, ri) =>
          row.map((cell, ci) => {
            const cellLeft = M.left + ci * segW;          // 与 0.90/1.10 切线完全对齐
            const cellTop = M.top + (ri * innerH) / 3;
            return (
              <text
                key={`lbl-${ri}-${ci}`}
                x={cellLeft + 8}
                y={cellTop + 16}
                fontSize={11}
                fill={cell.color}
                fillOpacity={0.6}
                fontWeight={400}
                style={{ pointerEvents: "none" }}
              >
                {cell.text}
              </text>
            );
          })
        )}

        {/* y=1 基准虚线（去化强弱中央基准，保持不变） */}
        <line x1={M.left} x2={M.left + innerW} y1={sy(1)} y2={sy(1)} stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 4" />

        {/* 坐标轴文字 */}
        <text x={M.left} y={M.top - 10} fontSize={12} fill="#111827" fontWeight={600}>Y · 去化竞争力（项目去化率 VS {COMPARE_LABEL[benchmark ?? "street"]}去化率）</text>
        <text x={M.left + innerW} y={M.top + innerH + 32} fontSize={12} fill="#111827" fontWeight={600} textAnchor="end">X · 售估比（销售均价 / 中介估值）</text>
        {/* X 轴刻度：锁死核心业务点 [0, 0.8, 1.2, 2] */}
        {(() => {
          const core = [0, 0.8, 1.2, 2];
          const ticks = Array.from(new Set([...core, +xDomain[1].toFixed(2)]))
            .filter((v) => v >= xDomain[0] && v <= xDomain[1])
            .sort((a, b) => a - b);
          return ticks.map((v, i) => {
            const isCore = v === 0.8 || v === 1.2 || v === 2;
            return (
              <g key={`xa-${i}`}>
                <line x1={sx(v)} x2={sx(v)} y1={M.top + innerH} y2={M.top + innerH + 4}
                  stroke={isCore ? "#475569" : "#94A3B8"} strokeWidth={1} />
                <text x={sx(v)} y={M.top + innerH + 16} textAnchor="middle"
                  fontSize={12} fill={isCore ? "#111827" : "#6B7280"}
                  fontWeight={isCore ? 600 : 400}>
                  {v.toFixed(2)}
                </text>
              </g>
            );
          });
        })()}
        {/* Y 轴刻度 */}
        {[yDomain[0], 1, yDomain[1]].map((v, i) => (
          <text key={`ya-${i}`} x={M.left - 8} y={sy(v) + 3} textAnchor="end" fontSize={12} fill="#6B7280">
            {v.toFixed(2)}
          </text>
        ))}

        {/* 选中气泡历史轨迹：虚线 + 节点圆点（图层在气泡之下，仅播放过后显示） */}
        {showTrail && focusedTraj && (() => {
          const stroke = colorOf(focusedTraj.row.city);
          const count = (maxFrame ?? focusedTraj.snaps.length - 1) + 1;
          const pts = focusedTraj.snaps.slice(0, count).map((s) => ({ x: sx(s.x), y: sy(s.y) }));
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          return (
            <g style={{ pointerEvents: "none" }}>
              <path d={d} fill="none" stroke={stroke} strokeOpacity={0.7} strokeWidth={1.2} strokeDasharray="4 4" />
              {pts.map((p, i) => (
                <circle key={`tp-${i}`} cx={p.x} cy={p.y} r={3.5}
                  fill={stroke} fillOpacity={0.65} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.2} />
              ))}
            </g>
          );
        })()}

        {/* 气泡：大在下，小在上 —— 通透感 + 细边框 + Hover/Focus 高亮 */}
        {ordered.map((p) => {
          const cx = sx(p.snap.x);
          const cy = sy(p.snap.y);
          const r = radius(p.snap.r);
          const fill = colorOf(p.row.city);
          const isHover = hover?.row.id === p.row.id;
          const isFocused = focusedId === p.row.id;
          // 聚焦模式优先于 Hover：未聚焦的气泡淡化至 10%
          const dim = focusedId
            ? !isFocused
            : !!(hover && !isHover);
          const highlight = isFocused || isHover;
          const isUnmatched = !!matchedIds && !matchedIds.has(p.row.id);
          return (
            <circle
              key={p.row.id}
              cx={cx} cy={cy} r={r}
              fill={fill}
              fillOpacity={isUnmatched ? 0.08 : highlight ? 0.9 : dim ? 0.1 : 0.35}
              stroke={fill}
              strokeOpacity={isUnmatched ? 0.12 : highlight ? 1 : dim ? 0.15 : 0.8}
              strokeWidth={isFocused ? 2 : 1}
              style={{
                transition: "cx 700ms cubic-bezier(0.22,1,0.36,1), cy 700ms cubic-bezier(0.22,1,0.36,1), r 700ms cubic-bezier(0.22,1,0.36,1), fill-opacity 200ms ease, stroke-opacity 200ms ease, filter 200ms ease",
                filter: highlight && !isUnmatched ? `drop-shadow(0 2px 6px ${fill}66)` : "none",
                cursor: isUnmatched ? "default" : "pointer",
                pointerEvents: isUnmatched ? "none" : "auto",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFocusedId((prev) => (prev === p.row.id ? null : p.row.id));
              }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                setHover({
                  row: p.row,
                  snap: p.snap,
                  sx: rect.left + rect.width / 2,
                  sy: rect.top + rect.height / 2,
                });
              }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}

        {/* 聚焦项目圆心剩余货值（动态跳动） */}
        {focusedPoint && (() => {
          const cx = sx(focusedPoint.snap.x);
          const cy = sy(focusedPoint.snap.y);
          const r = radius(focusedPoint.snap.r);
          const showInside = r >= 22;
          const labelY = showInside ? cy : cy - r - 8;
          return (
            <g style={{ pointerEvents: "none" }}>
              <CountUpText
                x={cx}
                y={labelY}
                value={focusedPoint.snap.remainingValue}
                color={showInside ? "#FFFFFF" : "#0F172A"}
                fontSize={showInside ? 13 : 12}
                stroke={showInside ? colorOf(focusedPoint.row.city) : "#FFFFFF"}
                baseline={showInside ? "middle" : "auto"}
              />
            </g>
          );
        })()}
      </svg>

      {/* Tooltip — Portal 挂载到 body，自动翻转，永不被截断 */}
      {hover && <QuadrantTooltip hover={hover} benchmark={benchmark ?? "city"} cellLabels={CELL_LABELS} xDomain={xDomain} yDomain={yDomain} />}

      {matchedIds && matchedIds.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-3 py-1.5 rounded-md bg-white/90 border border-[#E2E8F0] text-xs text-muted-foreground shadow-sm">
            未找到匹配的项目
          </div>
        </div>
      )}
    </div>
  );
}

/* CountUp 数字滚动跳动：在 value 变化时，600ms 内平滑过渡 */
function CountUpText({
  x, y, value, color, fontSize, stroke, baseline = "auto",
}: {
  x: number; y: number; value: number; color: string; fontSize: number; stroke?: string;
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
      // cubic-bezier(0.4, 0, 0.2, 1) 近似
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
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {display.toFixed(2)} 亿
    </text>
  );
}

/* ============================== Tooltip（Portal · 分组 · 防截断） ============================== */
const BENCHMARK_LABEL: Record<CompareBenchmark, string> = {
  competitor: "竞品去化率",
  street: "区县去化率",
  city: "城市去化率",
  nation: "全国去化率",
};

function QuadrantTooltip({
  hover, benchmark, cellLabels, xDomain, yDomain,
}: {
  hover: { row: BubbleRow; snap: Snapshot; sx: number; sy: number };
  benchmark: CompareBenchmark;
  cellLabels: { text: string; color: string; bg: string }[][];
  xDomain: [number, number];
  yDomain: [number, number];
}) {
  const r = hover.row;
  const s = hover.snap;
  const wan = (v: number) => (v / 10000).toFixed(2);

  // 去化竞争力 = 项目去化率 / 基准去化率（y 即此比值）
  const competitiveness = s.y;
  // 售估比 = 销售均价 / 中介估值（与气泡 X 坐标一致）
  const priceRatio = s.x;
  // 项目去化率 / y = 基准
  const benchmarkRate = competitiveness > 0 ? s.snakeRate / competitiveness : 0;

  // 所属区域 6 分区判定（Y 切分线 1.00；X 切分线 0.80 / 1.20），与气泡物理坐标完全对齐
  const yPart = competitiveness >= 1 ? "去化强" : "去化弱";
  const xPart = priceRatio < 0.8 ? "售估比低" : priceRatio > 1.2 ? "售估比高" : "售估比正常";
  const cellText = `${yPart}，${xPart}`;
  const cellPalette: Record<string, { color: string; bg: string }> = {
    "去化强，售估比低":   { color: "#3B82F6", bg: "#EFF6FF" },
    "去化强，售估比正常": { color: "#10B981", bg: "#ECFDF5" },
    "去化强，售估比高":   { color: "#10B981", bg: "#ECFDF5" },
    "去化弱，售估比低":   { color: "#EF4444", bg: "#FEF2F2" },
    "去化弱，售估比正常": { color: "#EF4444", bg: "#FEF2F2" },
    "去化弱，售估比高":   { color: "#3B82F6", bg: "#EFF6FF" },
  };
  const cell = cellPalette[cellText];

  // 防截断：根据视口边界自动翻转
  const TT_W = 280;
  const TT_H = 460;
  const GAP = 14;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const placeRight = hover.sx + GAP + TT_W <= vw - 8;
  const left = placeRight ? hover.sx + GAP : hover.sx - GAP - TT_W;
  let top = hover.sy - TT_H / 2;
  if (top + TT_H > vh - 8) top = vh - 8 - TT_H;
  if (top < 8) top = 8;

  const node = (
    <div
      className="fixed z-[9999] pointer-events-none rounded-xl border border-[#E5E7EB] shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-3"
      style={{
        left,
        top,
        width: TT_W,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "saturate(140%) blur(6px)",
        WebkitBackdropFilter: "saturate(140%) blur(6px)",
        fontFamily: '"Source Han Sans SC","Source Han Sans","Noto Sans SC",sans-serif',
      }}
    >
      {/* 维度说明 */}
      <div className="flex items-center justify-end mb-1.5">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F8FAFC] text-[11px]"
          style={{ color: "#6B7280" }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: "#CBD5E1", border: "1px solid #94A3B8" }}
          />
          气泡大小：剩余货值
        </span>
      </div>

      {/* 分组 1：项目基本面 */}
      <div>
        <div className="text-[13.5px] font-semibold leading-tight" style={{ color: "#111827" }}>
          {r.name}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <span className="text-muted-foreground">区域街道</span>
          <span className="text-right text-foreground truncate">{r.district} · {r.street}</span>
          <span className="text-muted-foreground">总房间数</span>
          <span className="text-right tabular-nums text-foreground">{r.roomCount}</span>
          <span className="text-muted-foreground">在售房间数</span>
          <span className="text-right tabular-nums text-foreground">{r.onSaleRoomCount}</span>
        </div>
      </div>

      <div className="my-2.5 border-t border-[#F1F5F9]" />

      {/* 分组 2：去化效能评估 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">项目去化率</span>
        <span className="text-right tabular-nums text-foreground">{(s.snakeRate * 100).toFixed(2)}%</span>
        <span className="text-muted-foreground">{BENCHMARK_LABEL[benchmark]}</span>
        <span className="text-right tabular-nums text-foreground">{(benchmarkRate * 100).toFixed(2)}%</span>
        <span className="text-muted-foreground">去化竞争力</span>
        <span
          className="text-right tabular-nums font-semibold"
          style={{ color: competitiveness >= 1 ? "#10B981" : "#DC2626" }}
        >
          {competitiveness.toFixed(2)}
        </span>
      </div>

      <div className="my-2.5 border-t border-[#F1F5F9]" />

      {/* 分组 3：价格与估值体系 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">销售均价</span>
        <span className="text-right tabular-nums text-foreground">{wan(r.salesFloorPrice)} 万/㎡</span>
        <span className="text-muted-foreground">中介估值</span>
        <span className="text-right tabular-nums text-foreground">{wan(r.cmbValuationPrice)} 万/㎡</span>
        <span className="text-muted-foreground">当前售估比</span>
        <span
          className="text-right tabular-nums font-semibold"
          style={{
            color:
              priceRatio > 1.20
                ? "#10B981"
                : priceRatio < 0.80
                ? "#EF4444"
                : "#3B82F6",
          }}
        >
          {priceRatio.toFixed(2)}
        </span>
      </div>

      <div className="my-2.5 border-t border-[#F1F5F9]" />

      {/* 分组 4：货值与大盘定位 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">剩余货值</span>
        <span className="text-right tabular-nums font-semibold text-foreground">{s.remainingValue.toFixed(2)} 亿</span>
        <span className="text-muted-foreground">所属区域</span>
        <span className="text-right">
          <span
            className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-medium"
            style={{ background: cell.bg, color: cell.color }}
          >
            {cellText}
          </span>
        </span>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}


/* ============================== 时间沙盘 ============================== */
function SliderTicks({ maxFrame, sliderVal, onPick }: { maxFrame: number; sliderVal: number; onPick: (frame: number) => void }) {
  if (maxFrame <= 0) return null;
  const ticks = Array.from({ length: maxFrame + 1 }, (_, p) => p);
  return (
    <div className="relative h-5 select-none">
      {ticks.map((p) => {
        const leftPct = (p / maxFrame) * 100;
        const frame = maxFrame - p;
        const label = frame === 0 ? "当月" : `T-${frame}`;
        const active = p === sliderVal;
        const isFirst = p === 0;
        const isLast = p === maxFrame;
        const translate = isFirst ? "translate-x-0" : isLast ? "-translate-x-full" : "-translate-x-1/2";
        const tickAlign = isFirst ? "items-start" : isLast ? "items-end" : "items-center";
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPick(frame)}
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
  );
}


function TimelinePlayer({
  playing, onTogglePlay, frame, maxFrame, onFrame, onQuickRange, dateRange, onDateRange,
}: {
  playing: boolean; onTogglePlay: () => void;
  frame: number; maxFrame: number; onFrame: (f: number) => void;
  onQuickRange: (months: number) => void;
  dateRange?: DateRange; onDateRange: (r?: DateRange) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const monthsAgo = frame;
  // 滑块语义反转：左=最早（T-max），右=当月（T-0），与正向时间播放保持一致
  const sliderVal = maxFrame - frame;
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-[#F8FAFC] border border-[#EEF2F7]">
      <button
        type="button"
        onClick={onTogglePlay}
        className="w-9 h-9 rounded-full bg-[var(--color-brand)] text-white inline-flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
        aria-label={playing ? "暂停" : "播放"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <Slider
          value={[sliderVal]}
          min={0} max={maxFrame} step={1}
          onValueChange={(v) => onFrame(maxFrame - (v[0] ?? 0))}
          className="flex-1"
        />
        <SliderTicks maxFrame={maxFrame} sliderVal={sliderVal} onPick={onFrame} />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <QuickBtn active={maxFrame === 2} onClick={() => onQuickRange(3)}>3 个月</QuickBtn>
        <QuickBtn active={maxFrame === 5} onClick={() => onQuickRange(6)}>6 个月</QuickBtn>
        <QuickBtn active={maxFrame === 11} onClick={() => onQuickRange(12)}>1 年</QuickBtn>
      </div>
    </div>
  );
}

function QuickBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-md border text-[11px] transition-colors ${
        active
          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
          : "border-[#E2E8F0] bg-white text-foreground hover:border-[var(--color-brand)]"
      }`}
    >
      {children}
    </button>
  );
}
