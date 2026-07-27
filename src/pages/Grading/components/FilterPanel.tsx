import { useState } from "react";
import { Building, MapPin, Check, ChevronDown } from "lucide-react";
import { CaliberPicker, DayPicker, ORG_TREE, type Caliber } from "@/components/filters/home-filters";

/* 组织筛选：仅城市公司可选，不展示集团；城市群组仅作为分组标题（可展开收起） */
function GradingOrgPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(["南部城市群组"]);
  const toggle = (n: string) =>
    setExpanded((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]));
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        className="h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[140px] hover:bg-white transition-colors"
      >
        <Building className="w-3.5 h-3.5" />
        <span className="flex-1 text-left truncate">{value}</span>
        <ChevronDown className="w-4 h-4" />
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
              value === ORG_TREE.name ? "text-[var(--color-brand)] font-medium" : "text-foreground"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>{ORG_TREE.name}</span>
          </button>
          {ORG_TREE.children?.map((g) => {
            const isOpen = expanded.includes(g.name);
            return (
              <div key={g.name}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggle(g.name);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground flex items-center justify-between hover:bg-[#F6F8FB] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                    <span>{g.name}</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                </button>
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

function BizTypeReadonly({ value }: { value: string }) {
  const OPTIONS: { key: string; enabled: boolean }[] = [
    { key: "住宅", enabled: true },
    { key: "商业", enabled: false },
    { key: "公寓", enabled: false },
    { key: "写字楼", enabled: false },
    { key: "车位", enabled: false },
    { key: "全部业态", enabled: false },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        className="h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[110px] hover:bg-white transition-colors"
      >
        <span className="flex-1 text-left">{value}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[200px] rounded-md border border-[#E2E8F0] bg-white shadow-xl z-30 py-1">
          {OPTIONS.map((o) => {
            const active = o.key === value;
            if (!o.enabled) {
              return (
                <div
                  key={o.key}
                  className="w-full px-3 py-2 text-left text-sm flex items-center justify-between text-[#CBD5E1] cursor-not-allowed select-none"
                >
                  <span className="ml-5">{o.key}</span>
                  <span className="text-[11px] text-[#94A3B8]">暂不支持</span>
                </div>
              );
            }
            return (
              <button
                key={o.key}
                onMouseDown={(e) => e.preventDefault()}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[var(--color-brand-soft)] ${
                  active ? "text-[var(--color-brand)] font-medium" : "text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {active && <Check className="w-3.5 h-3.5" />}
                  <span className={active ? "" : "ml-5"}>{o.key}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FilterPanel({
  org, caliber, period, businessType,
  onOrg, onCaliber, onPeriod, onBusinessType: _onBusinessType,
}: {
  org: string; caliber: Caliber; period: string; businessType: string;
  onOrg: (v: string) => void;
  onCaliber: (v: Caliber) => void;
  onPeriod: (v: string) => void;
  onBusinessType: (v: string) => void;
}) {
  return (
    <div className="h-14 bg-white border-b border-[#E2E8F0] flex items-center px-6 gap-3">
      <GradingOrgPicker value={org} onChange={onOrg} />
      <CaliberPicker value={caliber} onChange={onCaliber} />
      <DayPicker value={period} onChange={onPeriod} />
      <BizTypeReadonly value={businessType} />
    </div>
  );
}
