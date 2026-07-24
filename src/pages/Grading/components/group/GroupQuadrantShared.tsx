import { useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { groupProjectAnalysisData } from "@/data/groupProjectAnalysisData";
import { enrichProjects, type ProjectAnalysisRow, type CompareMode } from "@/utils/analysisMetrics";

/* —— 城市群组配置 —— */
export type GroupKey = "all" | "t1" | "newT1" | "t2" | "t34";
export type StageKey = "all" | "new" | "持销" | "尾盘";

export const GROUP_LABEL: Record<GroupKey, string> = {
  all: "全部", t1: "一线城市", newT1: "新一线城市", t2: "二线城市", t34: "三四线城市",
};
export const STAGE_LABEL: Record<StageKey, string> = {
  all: "全部", new: "新盘", 持销: "持销", 尾盘: "尾盘",
};
export const STAGE_HINT: Partial<Record<StageKey, string>> = {
  new: "新盘定义：滚动 1 年（12 个月）内开盘的项目。",
  持销: "持销定义：项目开盘已超过 1 年，且当前整体去化率 < 95%。",
  尾盘: "尾盘定义：项目整体去化率 ≥ 95%。",
};
export const GROUP_CITY: Record<GroupKey, string[]> = {
  all: [],
  t1: ["上海", "北京", "深圳", "广州"],
  newT1: ["成都", "杭州", "重庆", "武汉", "苏州", "西安", "南京", "长沙", "郑州", "天津", "合肥", "青岛", "东莞"],
  t2: ["无锡", "济南", "厦门", "福州", "常州", "南通", "昆明", "南昌", "惠州"],
  t34: ["海口", "宜昌", "盐城", "赣州", "汕头", "湛江", "三亚"],
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
export const colorOf = (city: string) => CITY_COLOR[city] || hashCityColor(city);

function monthsSinceOpen(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  return 1 + (h % 36);
}
export function getStage(snakeRate: number, id: string): Exclude<StageKey, "all"> {
  if (snakeRate >= 0.95) return "尾盘";
  if (monthsSinceOpen(id) <= 12) return "new";
  return "持销";
}

export const CITY_OF = (p: { cityCompany?: string }) => (p.cityCompany || "").replace(/公司$/, "");
const TIER_CITIES = Array.from(new Set([...GROUP_CITY.t1, ...GROUP_CITY.newT1, ...GROUP_CITY.t2, ...GROUP_CITY.t34]));
export const ALL_CITIES_SORTED = Array.from(
  new Set(groupProjectAnalysisData.map((p) => CITY_OF(p)).filter((c) => TIER_CITIES.includes(c)))
).sort();

/* —— 通用 UI 子组件 —— */
export function CityLegend({
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

export function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      {children}
    </div>
  );
}

export function SegmentedSmall<T extends string>({
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

/* —— 共享状态 Hook：group/cities/stage/hidden-solo/search/受控 selected&hovered/enriched/filtered/counts/matchedIds —— */
export function useGroupQuadrantState({
  selectedIdProp,
  onSelectedIdChange,
  hoveredIdProp,
  onHoveredIdChange,
  compareMode,
}: {
  selectedIdProp?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
  hoveredIdProp?: string | null;
  onHoveredIdChange?: (id: string | null) => void;
  compareMode: CompareMode;
}) {
  const [group, setGroup] = useState<GroupKey>("t1");
  const [cities, setCities] = useState<string[]>(() => GROUP_CITY.t1.filter((c) => ALL_CITIES_SORTED.includes(c)));
  const [stage, setStage] = useState<StageKey>("all");
  const [hiddenCities, setHiddenCities] = useState<Set<string>>(new Set());
  const [soloCity, setSoloCity] = useState<string | null>(null);
  const [selectedIdInner, setSelectedIdInner] = useState<string | null>(null);
  const [hoveredIdInner, setHoveredIdInner] = useState<string | null>(null);
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : selectedIdInner;
  const hoveredId = hoveredIdProp !== undefined ? hoveredIdProp : hoveredIdInner;
  const setSelectedId = (v: string | null) => {
    if (onSelectedIdChange) onSelectedIdChange(v);
    else setSelectedIdInner(v);
  };
  const setHoveredId = (v: string | null) => {
    if (onHoveredIdChange) onHoveredIdChange(v);
    else setHoveredIdInner(v);
  };
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const citiesKey = cities.join(",");
  useEffect(() => { setHiddenCities(new Set()); setSoloCity(null); }, [group, citiesKey]);

  const lastGroupRef = useRef<GroupKey>(group);
  useEffect(() => {
    if (lastGroupRef.current === group) return;
    lastGroupRef.current = group;
    if (group === "all") setCities(ALL_CITIES_SORTED);
    else setCities(GROUP_CITY[group].filter((c) => ALL_CITIES_SORTED.includes(c)));
  }, [group]);

  const enrichedAll = useMemo<ProjectAnalysisRow[]>(() => {
    const byCity = new Map<string, typeof groupProjectAnalysisData>();
    groupProjectAnalysisData.forEach((r) => {
      const arr = byCity.get(r.cityCompany) || [];
      arr.push(r);
      byCity.set(r.cityCompany, arr);
    });
    const out: ProjectAnalysisRow[] = [];
    byCity.forEach((rows) => out.push(...enrichProjects(rows, compareMode)));
    return out;
  }, [compareMode]);

  const filtered = useMemo<ProjectAnalysisRow[]>(() => {
    return enrichedAll.filter((p) => {
      const city = CITY_OF(p);
      if (!cities.includes(city)) return false;
      if (soloCity ? soloCity !== city : hiddenCities.has(city)) return false;
      if (stage !== "all" && getStage(p.snakeSellThroughRate, p.projectId) !== stage) return false;
      return true;
    });
  }, [enrichedAll, cities, hiddenCities, soloCity, stage]);

  const counts = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    enrichedAll.forEach((p) => {
      const city = CITY_OF(p);
      if (!cities.includes(city)) return;
      if (stage !== "all" && getStage(p.snakeSellThroughRate, p.projectId) !== stage) return;
      acc[city] = (acc[city] || 0) + 1;
    });
    return acc;
  }, [enrichedAll, cities, stage]);

  const matchedIds = useMemo<Set<string> | null>(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return null;
    const ids = filtered
      .filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.projectId.toLowerCase().includes(q) ||
          (p.cityCompany ?? "").toLowerCase().includes(q),
      )
      .map((p) => p.projectId);
    return new Set(ids);
  }, [filtered, searchQuery]);

  return {
    group, setGroup, cities, stage, setStage,
    hiddenCities, setHiddenCities, soloCity, setSoloCity,
    selectedId, setSelectedId, hoveredId, setHoveredId,
    searchInput, setSearchInput,
    filtered, counts, matchedIds,
  };
}
