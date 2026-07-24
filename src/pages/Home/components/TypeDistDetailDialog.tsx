import { useEffect, useMemo, useState } from "react";
import { X, ArrowUpDown, ArrowUp, ArrowDown, PieChart as PieIcon } from "lucide-react";

export type TypeDistRow = {
  name: string;
  value: number; // 亿
  pct: number; // %
  sellRate?: number; // %
};

type SortKey = "value" | "pct" | "sellRate";

const COLOR_MAP: Record<string, string> = {
  住宅: "#5B8DEF",
  公寓: "#2DBDA8",
  车位: "#F08A8A",
  商业: "#F4B042",
  写字楼: "#A78BFA",
  其他: "#94A3B8",
};
const colorOf = (name: string, i: number) =>
  COLOR_MAP[name] ?? ["#5B8DEF", "#2DBDA8", "#F08A8A", "#F4B042", "#A78BFA", "#94A3B8"][i % 6];

export function TypeDistDetailDialog({
  open,
  onOpenChange,
  rows,
  totalValue,
  overallRate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: TypeDistRow[];
  totalValue: number;
  overallRate: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [active, setActive] = useState<string | null>(null);

  const onClose = () => onOpenChange(false);

  // ESC + lock body scroll，对齐其他详情弹窗交互
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  if (!open) return null;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-[#94A3B8] inline" />;
    return sortDir === "desc"
      ? <ArrowDown className="w-3 h-3 text-[var(--color-brand)] inline" />
      : <ArrowUp className="w-3 h-3 text-[var(--color-brand)] inline" />;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "min(720px, 92vw)", maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-[#EEF1F6] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
              <PieIcon className="w-4 h-4" />
            </span>
            <span className="text-[18px] font-semibold text-[#1E293B]">
              总货值业态分布详情
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 bg-[#FAFBFD]">
          {/* Summary */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-6 py-5">
            <div className="flex items-center gap-10">
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] text-[#64748B]">总货值</span>
                <span className="text-[22px] font-semibold tabular-nums text-[#1E293B]">
                  {totalValue.toFixed(2)}
                </span>
                <span className="text-[12px] text-[#64748B]">亿</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] text-[#64748B]">整体去化率</span>
                <span className="text-[18px] font-semibold tabular-nums text-[var(--color-brand)]">
                  {overallRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
              <span className="text-[15px] font-semibold text-[#1E293B]">业态明细</span>
            </div>
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] text-[12px] text-[#64748B] bg-[#F8FAFC] h-10 items-center px-4 border-b border-[#E2E8F0]">
                <span>业态</span>
                <button
                  onClick={() => toggleSort("value")}
                  className="text-right hover:text-[var(--color-brand)] flex items-center justify-end gap-1"
                >
                  货值（亿） <SortIcon k="value" />
                </button>
                <button
                  onClick={() => toggleSort("pct")}
                  className="text-right hover:text-[var(--color-brand)] flex items-center justify-end gap-1"
                >
                  占比 <SortIcon k="pct" />
                </button>
                <button
                  onClick={() => toggleSort("sellRate")}
                  className="text-right hover:text-[var(--color-brand)] flex items-center justify-end gap-1"
                >
                  去化率 <SortIcon k="sellRate" />
                </button>
              </div>
              {sorted.map((r, i) => {
                const isActive = active === r.name;
                return (
                  <div
                    key={r.name}
                    onMouseEnter={() => setActive(r.name)}
                    onMouseLeave={() => setActive(null)}
                    className={`grid grid-cols-[1.5fr_1fr_1fr_1fr] text-[13px] h-11 items-center px-4 border-b border-[#F1F5F9] last:border-b-0 transition-colors ${
                      isActive ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[#1E293B]">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: colorOf(r.name, i) }}
                      />
                      {r.name}
                    </span>
                    <span className="text-right tabular-nums text-[#1E293B]">
                      {r.value.toFixed(2)}
                    </span>
                    <span className="text-right tabular-nums text-[#334155]">
                      {r.pct.toFixed(2)}%
                    </span>
                    <span className="text-right tabular-nums text-[#334155]">
                      {r.sellRate != null ? `${r.sellRate.toFixed(2)}%` : "--"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
