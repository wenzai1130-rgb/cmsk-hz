import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Minus,
  HelpCircle,
  MapPin,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


export type Caliber = "full" | "equity";

export const CALIBER_OPTIONS: { key: Caliber; label: string; factor: number; tip?: string }[] = [
  { key: "equity", label: "全口径-权益", factor: 0.51, tip: "全口径-权益 = 全口径货值 × 权益比例" },
  { key: "full", label: "全口径", factor: 1 },
];

type PickerStateProps = {
  disabled?: boolean;
  loading?: boolean;
};

function LoadingDot() {
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
      aria-hidden
    />
  );
}

const triggerStateClass =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--color-brand-soft)]";

export function CaliberPicker({
  value,
  onChange,
  disabled = false,
  loading = false,
}: { value: Caliber; onChange: (v: Caliber) => void } & PickerStateProps) {
  const [open, setOpen] = useState(false);
  const current = CALIBER_OPTIONS.find((c) => c.key === value)!;
  const inactive = disabled || loading;
  return (
    <div className="relative">
      <button
        onClick={() => {
          if (inactive) return;
          setOpen((v) => !v);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        disabled={inactive}
        aria-expanded={open}
        aria-busy={loading || undefined}
        className={`h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[110px] hover:bg-white transition-colors ${triggerStateClass}`}
      >
        <span className="flex-1 text-left">{loading ? "加载中" : current.label}</span>
        {loading ? <LoadingDot /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[200px] rounded-md border border-[#E2E8F0] bg-white shadow-xl z-30 py-1">
          {CALIBER_OPTIONS.map((c) => (
            <button
              key={c.key}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c.key);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[var(--color-brand-soft)] group ${
                value === c.key ? "text-[var(--color-brand)] font-medium" : "text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {value === c.key && <Check className="w-3.5 h-3.5" />}
                <span className={value === c.key ? "" : "ml-5"}>{c.label}</span>
              </span>
              {c.tip && (
                <span className="relative">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-1 rounded bg-foreground text-white text-[11px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    {c.tip}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const ORG_TREE: { name: string; children?: { name: string; children?: string[] }[] } = {
  name: "招商蛇口",
  children: [
    {
      name: "南部城市群",
      children: ["深圳公司", "广州公司", "佛山公司", "东莞公司", "珠海公司", "惠州公司", "中山公司", "江门公司"],
    },
    { name: "北部城市群", children: ["北京公司", "天津公司", "青岛公司", "济南公司"] },
    { name: "东部城市群", children: ["上海公司", "杭州公司", "南京公司", "苏州公司", "宁波公司"] },
    { name: "中部城市群", children: ["武汉公司", "长沙公司", "郑州公司", "合肥公司"] },
    { name: "西部城市群", children: ["成都公司", "重庆公司", "西安公司", "昆明公司"] },
    { name: "自贸投资", children: ["海南公司", "深圳前海"] },
    { name: "招商产园", children: ["产园华南", "产园华东"] },
  ],
};

export function OrgPicker({
  value,
  onChange,
  leafOnly = false,
  disabled = false,
  loading = false,
}: { value: string; onChange: (v: string) => void; leafOnly?: boolean } & PickerStateProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(["南部城市群"]);
  const inactive = disabled || loading;
  const toggle = (n: string) =>
    setExpanded((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]));
  return (
    <div className="relative">
      <button
        onClick={() => {
          if (inactive) return;
          setOpen((v) => !v);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        disabled={inactive}
        aria-expanded={open}
        aria-busy={loading || undefined}
        className={`h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[140px] hover:bg-white transition-colors ${triggerStateClass}`}
      >
        <Building className="w-3.5 h-3.5" />
        <span className="flex-1 text-left truncate">{loading ? "加载中" : value}</span>
        {loading ? <LoadingDot /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[260px] rounded-md border border-[#E2E8F0] bg-white shadow-xl z-30 py-1 max-h-[420px] overflow-auto">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onChange(ORG_TREE.name);
              setOpen(false);
            }}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-brand-soft)] ${
              value === ORG_TREE.name ? "text-[var(--color-brand)] font-medium" : ""
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>{ORG_TREE.name}</span>
          </button>
          {ORG_TREE.children?.map((g) => {
            const isOpen = expanded.includes(g.name);
            const isSel = value === g.name;
            return (
              <div key={g.name}>
                <div
                  className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between cursor-pointer ${
                    isSel ? "bg-[var(--color-brand-soft)]" : "hover:bg-[#F6F8FB]"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (leafOnly) {
                      toggle(g.name);
                    } else {
                      onChange(g.name);
                      setOpen(false);
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <span className={isSel ? "text-[var(--color-brand)] font-medium" : ""}>
                      {g.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(g.name);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/60"
                    aria-label={isOpen ? "收起" : "展开"}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  </button>
                </div>
                {isOpen &&
                  g.children?.map((c) => (
                    <button
                      key={c}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(c);
                        setOpen(false);
                      }}
                      className={`w-full pl-9 pr-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-brand-soft)] ${
                        value === c ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium" : "text-foreground"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{c}</span>
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 组织多选下拉：招商蛇口 → 城市群 → 城市公司（叶子多选）。
 * value：选中的城市公司名数组（空数组 = 全部）。
 */
export function OrgMultiPicker({
  value,
  onChange,
  allowedLeaves,
  disabled = false,
  loading = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  /** 可选：仅在此白名单内的城市公司显示；默认展示全部叶子 */
  allowedLeaves?: string[];
} & PickerStateProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(
    ORG_TREE.children?.map((g) => g.name) ?? [],
  );

  const allowSet = useMemo(
    () => (allowedLeaves ? new Set(allowedLeaves) : null),
    [allowedLeaves],
  );

  const groups = useMemo(
    () =>
      (ORG_TREE.children ?? [])
        .map((g) => ({
          name: g.name,
          children: (g.children ?? []).filter((c) => !allowSet || allowSet.has(c)),
        }))
        .filter((g) => g.children.length > 0),
    [allowSet],
  );

  const allLeaves = useMemo(() => groups.flatMap((g) => g.children), [groups]);
  const selected = useMemo(() => new Set(value), [value]);
  const selectedCount = value.length;
  const totalCount = allLeaves.length;

  const label = useMemo(() => {
    if (selectedCount === 0 || selectedCount === totalCount) return `招商局蛇口工业区控股股份有限公司`;
    // 完整命中某个城市群
    const fullGroup = groups.find(
      (g) =>
        g.children.length === selectedCount &&
        g.children.every((c) => selected.has(c)),
    );
    if (fullGroup) return fullGroup.name;
    if (selectedCount === 1) return value[0];
    return `已选 ${selectedCount} 个城市公司`;
  }, [selected, selectedCount, totalCount, groups, value]);

  const toggleExpand = (n: string) =>
    setExpanded((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]));

  const toggleLeaf = (c: string) => {
    const next = new Set(selected);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange(Array.from(next));
  };

  const toggleGroup = (children: string[]) => {
    const allOn = children.every((c) => selected.has(c));
    const next = new Set(selected);
    if (allOn) children.forEach((c) => next.delete(c));
    else children.forEach((c) => next.add(c));
    onChange(Array.from(next));
  };

  const toggleAll = () => {
    if (selectedCount === totalCount) onChange([]);
    else onChange(allLeaves);
  };

  const rootState: "none" | "some" | "all" =
    selectedCount === 0 ? "none" : selectedCount === totalCount ? "all" : "some";
  const inactive = disabled || loading;

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (inactive) return;
          setOpen((v) => !v);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        disabled={inactive}
        aria-expanded={open}
        aria-busy={loading || undefined}
        className={`h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[180px] hover:bg-white transition-colors ${triggerStateClass}`}
      >
        <Building className="w-3.5 h-3.5" />
        <span className="flex-1 text-left truncate">{loading ? "加载中" : label}</span>
        {selectedCount > 0 && selectedCount !== totalCount && (
          <span className="tabular-nums text-[11px] px-1.5 py-[1px] rounded bg-[var(--color-brand)] text-white">
            {selectedCount}
          </span>
        )}
        {loading ? <LoadingDot /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[280px] rounded-md border border-[#E2E8F0] bg-white shadow-xl z-30 flex flex-col max-h-[460px]">
          <div className="px-3 py-2 border-b border-[#F1F5F9] flex items-center justify-between">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); toggleAll(); }}
              className="flex items-center gap-2 text-sm"
            >
              <TriCheckbox state={rootState} />
              <Building className="w-3.5 h-3.5" />
              <span className="font-medium">{ORG_TREE.name}</span>
            </button>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {selectedCount}/{totalCount}
            </span>
          </div>
          <div className="flex-1 overflow-auto py-1">
            {groups.map((g) => {
              const groupSel = g.children.filter((c) => selected.has(c)).length;
              const state: "none" | "some" | "all" =
                groupSel === 0 ? "none" : groupSel === g.children.length ? "all" : "some";
              const isOpen = expanded.includes(g.name);
              return (
                <div key={g.name}>
                  <div className="flex items-center gap-1 px-2 py-1.5 mx-1 rounded hover:bg-[#F8FAFC]">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); toggleExpand(g.name); }}
                      className="w-5 h-5 flex items-center justify-center text-muted-foreground shrink-0"
                      aria-label={isOpen ? "收起" : "展开"}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                      />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); toggleGroup(g.children); }}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <TriCheckbox state={state} />
                      <span className="text-sm truncate">{g.name}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
                        {groupSel > 0 ? `${groupSel}/${g.children.length}` : g.children.length}
                      </span>
                    </button>
                  </div>
                  {isOpen &&
                    g.children.map((c) => {
                      const on = selected.has(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); toggleLeaf(c); }}
                          className={`w-full pl-9 pr-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-brand-soft)] ${
                            on ? "text-[var(--color-brand)] font-medium" : "text-foreground"
                          }`}
                        >
                          <TriCheckbox state={on ? "all" : "none"} />
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate">{c}</span>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-[#F1F5F9] flex items-center justify-between text-[12px]">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange([]); }}
              className="text-muted-foreground hover:text-[var(--color-brand)]"
            >
              清空
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); }}
              className="px-3 py-1 rounded bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TriCheckbox({ state }: { state: "none" | "some" | "all" }) {
  const active = state !== "none";
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border shrink-0 ${
        active
          ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
          : "border-[#CBD5E1] bg-white"
      }`}
    >
      {state === "all" && <Check className="w-3 h-3" strokeWidth={3} />}
      {state === "some" && <Minus className="w-3 h-3" strokeWidth={3} />}
    </span>
  );
}




export function MonthPicker({
  value,
  onChange,
  disabled = false,
  loading = false,
}: { value: string; onChange: (v: string) => void } & PickerStateProps) {
  const [open, setOpen] = useState(false);
  const [y, m] = value.split("-").map((x) => parseInt(x, 10));
  const [viewYear, setViewYear] = useState(y);
  const today = new Date();
  const inactive = disabled || loading;
  return (
    <div className="relative">
      <button
        onClick={() => {
          if (inactive) return;
          setOpen((v) => !v);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        disabled={inactive}
        aria-expanded={open}
        aria-busy={loading || undefined}
        className={`h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[110px] hover:bg-white transition-colors ${triggerStateClass}`}
      >
        <span className="flex-1 text-left tabular-nums">{loading ? "加载中" : value}</span>
        {loading ? <LoadingDot /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[300px] rounded-md border border-[#E2E8F0] bg-white shadow-xl z-30 p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onMouseDown={(e) => { e.preventDefault(); setViewYear((v) => v - 1); }}
              className="w-7 h-7 rounded hover:bg-[#F6F8FB] flex items-center justify-center text-muted-foreground"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-medium">{viewYear} 年</div>
            <button
              onMouseDown={(e) => { e.preventDefault(); setViewYear((v) => v + 1); }}
              className="w-7 h-7 rounded hover:bg-[#F6F8FB] flex items-center justify-center text-muted-foreground"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => {
              const isSel = viewYear === y && mm === m;
              const isFuture = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && mm > today.getMonth() + 1);
              return (
                <button
                  key={mm}
                  disabled={isFuture}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (isFuture) return;
                    onChange(`${viewYear}-${String(mm).padStart(2, "0")}`);
                    setOpen(false);
                  }}
                  className={`h-9 rounded text-sm transition-colors ${
                    isSel
                      ? "bg-[var(--color-brand)] text-white font-medium"
                      : isFuture
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "hover:bg-[var(--color-brand-soft)] text-foreground"
                  }`}
                >
                  {mm} 月
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-[#EEF2F7] text-center">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                const t = new Date();
                onChange(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
                setViewYear(t.getFullYear());
                setOpen(false);
              }}
              className="text-xs text-[var(--color-brand)] hover:underline"
            >
              回到本月
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DayPicker({
  value,
  onChange,
  portal = false,
  disabled = false,
  loading = false,
}: {
  value: string;
  onChange: (v: string) => void;
  portal?: boolean;
} & PickerStateProps) {
  const [open, setOpen] = useState(false);
  const [y, m, d] = value.split("-").map((x) => parseInt(x, 10));
  const [viewYear, setViewYear] = useState(y);
  const [viewMonth, setViewMonth] = useState(m); // 1-12
  const today = useMemo(() => new Date(), []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const inactive = disabled || loading;

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let dd = 1; dd <= daysInMonth; dd++) cells.push(dd);
  while (cells.length % 7 !== 0) cells.push(null);

  const stepMonth = (delta: number) => {
    let nm = viewMonth + delta;
    let ny = viewYear;
    if (nm < 1) { nm = 12; ny -= 1; }
    if (nm > 12) { nm = 1; ny += 1; }
    setViewMonth(nm);
    setViewYear(ny);
  };

  useLayoutEffect(() => {
    if (!portal || !open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const W = 280;
      const left = Math.min(r.left, window.innerWidth - W - 12);
      setPos({ left: Math.max(8, left), top: r.bottom + 6 });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [portal, open]);

  useEffect(() => {
    if (!portal || !open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [portal, open]);

  const popover = (
    <div className="w-[280px] rounded-md border border-[#E2E8F0] bg-white shadow-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onMouseDown={(e) => { e.preventDefault(); setViewYear((v) => v - 1); }}
          className="w-7 h-7 rounded hover:bg-[#F6F8FB] flex items-center justify-center text-muted-foreground"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); stepMonth(-1); }}
          className="w-7 h-7 rounded hover:bg-[#F6F8FB] flex items-center justify-center text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-medium tabular-nums">{viewYear} 年 {viewMonth} 月</div>
        <button
          onMouseDown={(e) => { e.preventDefault(); stepMonth(1); }}
          className="w-7 h-7 rounded hover:bg-[#F6F8FB] flex items-center justify-center text-muted-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setViewYear((v) => v + 1); }}
          className="w-7 h-7 rounded hover:bg-[#F6F8FB] flex items-center justify-center text-muted-foreground"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
        {["日","一","二","三","四","五","六"].map((w) => (
          <div key={w} className="h-6 flex items-center justify-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dd, i) => {
          if (dd === null) return <div key={i} className="h-7" />;
          const isSel = viewYear === y && viewMonth === m && dd === d;
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const cellDate = new Date(viewYear, viewMonth - 1, dd);
          const isFuture = cellDate > yesterday;
          return (
            <button
              key={i}
              disabled={isFuture}
              onMouseDown={(e) => {
                e.preventDefault();
                if (isFuture) return;
                onChange(`${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
                setOpen(false);
              }}
              className={`h-7 rounded text-[12px] tabular-nums transition-colors ${
                isSel
                  ? "bg-[var(--color-brand)] text-white font-medium"
                  : isFuture
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "hover:bg-[var(--color-brand-soft)] text-foreground"
              }`}
            >
              {dd}
            </button>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-[#EEF2F7] text-center">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const t = new Date();
            t.setDate(t.getDate() - 1);
            onChange(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`);
            setViewYear(t.getFullYear());
            setViewMonth(t.getMonth() + 1);
            setOpen(false);
          }}
          className="text-xs text-[var(--color-brand)] hover:underline"
        >
          回到最新
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => {
          if (inactive) return;
          setOpen((v) => !v);
        }}
        onBlur={portal ? undefined : () => setTimeout(() => setOpen(false), 180)}
        disabled={inactive}
        aria-expanded={open}
        aria-busy={loading || undefined}
        className={`h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[140px] hover:bg-white transition-colors ${triggerStateClass}`}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left tabular-nums">{loading ? "加载中" : value}</span>
        {loading ? <LoadingDot /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        portal
          ? pos && typeof document !== "undefined" && createPortal(
              <div
                ref={popRef}
                style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 1000 }}
              >
                {popover}
              </div>,
              document.body,
            )
          : <div className="absolute left-0 top-full mt-1 z-30">{popover}</div>
      )}
    </div>
  );
}
