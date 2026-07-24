import { Search, X } from "lucide-react";

export function ProjectSearchInput({
  value, onChange, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入项目名称/编号检索..."
        className="h-7 w-full pl-7 pr-7 rounded-md border border-[#E2E8F0] bg-white text-[11px] text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/30 whitespace-nowrap"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 inline-flex items-center justify-center rounded-sm text-[#94A3B8] hover:text-foreground hover:bg-[#F1F5F9]"
          aria-label="清除搜索"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
