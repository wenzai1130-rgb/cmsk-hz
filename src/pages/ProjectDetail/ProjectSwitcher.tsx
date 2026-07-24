import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { groupProjectAnalysisData, type GroupProjectRow } from "@/data/groupProjectAnalysisData";
import { formatProjectName } from "@/lib/format";
import { OrgMultiPicker } from "@/components/filters/home-filters";

type StageKey = "all" | "new" | "onSale" | "tail";
const STAGE_LABEL: Record<StageKey, string> = {
  all: "全部",
  new: "新盘",
  onSale: "持销",
  tail: "尾盘",
};
function stageOf(rate: number): Exclude<StageKey, "all"> {
  if (rate >= 0.95) return "tail";
  if (rate <= 0.3) return "new";
  return "onSale";
}

const BIZ_OPTS = ["all", "住宅", "商业", "公寓", "写字楼", "车位", "配套及其他"] as const;
type BizKey = (typeof BIZ_OPTS)[number];

// 与 ProjectList 中 displayBiz 保持一致的稳定映射
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}
const BIZ_BUCKETS: Exclude<BizKey, "all">[] = (() => {
  const arr: Exclude<BizKey, "all">[] = [];
  const push = (k: Exclude<BizKey, "all">, n: number) => { for (let i = 0; i < n; i++) arr.push(k); };
  push("住宅", 45); push("商业", 15); push("公寓", 12); push("写字楼", 10); push("车位", 12); push("配套及其他", 6);
  return arr;
})();
const displayBiz = (p: { projectId: string }): Exclude<BizKey, "all"> =>
  BIZ_BUCKETS[hashStr(p.projectId + "b") % BIZ_BUCKETS.length];

function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  width = 110,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { k: T; label: string }[];
  width?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full pl-3 pr-7 rounded-md border border-[#E2E8F0] bg-white text-[12.5px] text-foreground appearance-none focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/30 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.k} value={o.k}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
    </div>
  );

}

export function ProjectSwitcher({
  currentId,
  currentName,
  variant = "inline",
}: {
  currentId: string;
  currentName: string;
  variant?: "inline" | "header";
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [orgSelected, setOrgSelected] = useState<string[]>([]);
  const [biz, setBiz] = useState<BizKey>("all");
  const [stage, setStage] = useState<StageKey>("all");
  const [q, setQ] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // 组织树叶子白名单：与项目列表一致
  const allowedCityCompanies = useMemo(() => {
    const s = new Set<string>();
    groupProjectAnalysisData.forEach((p) => s.add(p.cityCompany));
    return Array.from(s);
  }, []);
  const orgSet = useMemo(() => new Set(orgSelected), [orgSelected]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const width = 680;
      const gutter = 16;
      const left = Math.min(Math.max(r.left, gutter), window.innerWidth - width - gutter);
      setPos({ left, top: r.bottom + 6 });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        popRef.current?.contains(t)
      ) return;
      // OrgMultiPicker 弹层也用 portal，需要放行
      const el = t as HTMLElement | null;
      if (el && el.closest?.("[data-org-multi-picker-pop]")) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return groupProjectAnalysisData.filter((p: GroupProjectRow) => {
      if (orgSet.size > 0 && !orgSet.has(p.cityCompany)) return false;
      if (biz !== "all" && displayBiz(p) !== biz) return false;
      if (stage !== "all" && stageOf(p.snakeSellThroughRate) !== stage) return false;
      if (kw && !p.projectName.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [orgSet, biz, stage, q]);

  function handlePick(id: string) {
    setOpen(false);
    if (id !== currentId) navigate(`/projects/${id}`);
  }

  return (
    <>
      {variant === "header" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 hover:bg-white transition-colors max-w-[240px]"
        >
          <span className="flex-1 text-left truncate">{formatProjectName(currentName)}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`group inline-flex items-start gap-1 rounded px-1.5 py-0.5 -mx-1.5 text-left transition-colors ${
            open
              ? "bg-[#F1F5F9] text-[var(--color-brand)]"
              : "hover:bg-[#F1F5F9]/70 hover:text-[var(--color-brand)]"
          }`}
        >
          <span className="text-[13px] font-semibold text-[var(--color-brand)] leading-snug break-all">
            {formatProjectName(currentName)}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 mt-[3px] shrink-0 text-[#64748B] group-hover:text-[var(--color-brand)] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {open && pos && portalContainer &&
        createPortal(
          <div
            ref={popRef}
            data-project-switcher-popover
            style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 2147483647 }}
            className="w-[680px] max-h-[450px] bg-white rounded-lg border border-[#E2E8F0] shadow-[0_16px_40px_-10px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden"
          >
            {/* 顶部筛选栏 */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#EEF2F7] bg-[#FAFBFD]">
              <div className="shrink-0">
                <OrgMultiPicker
                  value={orgSelected}
                  onChange={setOrgSelected}
                  allowedLeaves={allowedCityCompanies}
                />
              </div>
              <MiniSelect<BizKey>
                value={biz}
                onChange={setBiz}
                width={100}
                options={BIZ_OPTS.map((b) => ({
                  k: b,
                  label: b === "all" ? "全部业态" : b,
                }))}
              />
              <MiniSelect<StageKey>
                value={stage}
                onChange={setStage}
                width={100}
                options={(Object.keys(STAGE_LABEL) as StageKey[]).map((k) => ({
                  k,
                  label: k === "all" ? "全部阶段" : STAGE_LABEL[k],
                }))}
              />
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索项目名称"
                  className="h-9 w-full pl-8 pr-7 rounded-md border border-[#E2E8F0] bg-white text-[12.5px] text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/30"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#F1F5F9] text-[#94A3B8]"
                    aria-label="清除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-3 py-1.5 text-[11px] text-[#64748B] border-b border-[#F1F5F9] bg-white">
              共 <span className="text-[var(--color-brand)] font-medium">{list.length}</span> 个项目
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
              {list.length === 0 ? (
                <div className="py-10 text-center text-[12px] text-[#94A3B8]">
                  无匹配项目
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {list.map((p) => {
                    const isCur = p.projectId === currentId;
                    const st = stageOf(p.snakeSellThroughRate);
                    const b = displayBiz(p);
                    return (
                      <button
                        key={p.projectId}
                        type="button"
                        onClick={() => handlePick(p.projectId)}
                        className={`group relative flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all ${
                          isCur
                            ? "border-[var(--color-brand)] bg-[#EFF6FF]"
                            : "border-[#EEF2F7] bg-white hover:border-[#93C5FD] hover:bg-[#F0F7FF]"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-[12.5px] leading-snug break-all ${
                              isCur
                                ? "text-[var(--color-brand)] font-medium"
                                : "text-foreground group-hover:text-[var(--color-brand)]"
                            }`}
                            title={p.projectName}
                          >
                            {formatProjectName(p.projectName)}
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center rounded px-1 py-[1px] text-[10px] leading-none bg-[#F1F5F9] text-[#475569]">
                              {b}
                            </span>
                            <span
                              className={`inline-flex items-center rounded px-1 py-[1px] text-[10px] leading-none ${
                                st === "new"
                                  ? "bg-[#EFF6FF] text-[#1677FF]"
                                  : st === "tail"
                                    ? "bg-[#FEF2F2] text-[#DC2626]"
                                    : "bg-[#ECFDF5] text-[#059669]"
                              }`}
                            >
                              {STAGE_LABEL[st]}
                            </span>
                          </div>
                        </div>
                        {isCur && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-[var(--color-brand)] font-medium">
                            <Check className="w-3 h-3" />
                            当前
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          portalContainer,
        )}
    </>
  );
}
