import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { formatProjectName } from "@/lib/format";
import type { ProjectAnalysisRow } from "@/utils/analysisMetrics";

export function ProjectListPanel({
  projects,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
  query: queryProp,
  onQueryChange,
}: {
  projects: ProjectAnalysisRow[];
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  query?: string;
  onQueryChange?: (v: string) => void;
}) {
  const [qInner, setQInner] = useState("");
  const q = queryProp !== undefined ? queryProp : qInner;
  const setQ = (v: string) => {
    if (onQueryChange) onQueryChange(v);
    else setQInner(v);
  };
  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return projects;
    return projects.filter(
      (p) =>
        p.projectName.toLowerCase().includes(kw) ||
        p.projectId.toLowerCase().includes(kw),
    );
  }, [projects, q]);

  const scrollRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current[selectedId];
    const container = scrollRef.current;
    if (el && container) {
      // Center the item within the list container WITHOUT affecting page scroll
      const target =
        el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, target),
        behavior: "smooth",
      });
    }
  }, [selectedId]);

  return (
    <div className="w-[240px] shrink-0 h-[640px] flex flex-col border border-[#E2E8F0] rounded-lg bg-white overflow-hidden">

      <div className="p-2.5 border-b border-[#EEF2F7] space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索项目名称"
            className="h-7 w-full pl-7 pr-6 rounded-md border border-[#E2E8F0] bg-white text-[11px] text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1677FF] focus:ring-1 focus:ring-[#1677FF]/30"
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
        <div className="text-[11px] text-[#1677FF] font-medium">
          共 {list.length} 个项目 · 点击跳转详情
        </div>
      </div>
      <ul
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#F1F5F9]"
      >
        {list.map((p) => {
          const isSelected = selectedId === p.projectId;
          const isHover = !isSelected && hoveredId === p.projectId;
          return (
            <li
              key={p.projectId}
              ref={(el) => {
                itemRefs.current[p.projectId] = el;
              }}
              onMouseEnter={() => onHover(p.projectId)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(p.projectId)}
              className={`relative px-2.5 py-1.5 text-xs cursor-pointer ${
                isSelected
                  ? "bg-[#E6F0FF]"
                  : isHover
                    ? "bg-[#F1F5F9]"
                    : "hover:bg-[#F8FAFC]"
              }`}
            >
              {isSelected && (
                <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[#1677FF]" />
              )}
              <Link
                to={`/projects/${p.projectId}`}
                className="block truncate text-foreground hover:text-[#1677FF]"
                title={p.projectName}
              >
                {formatProjectName(p.projectName)}
              </Link>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="px-2.5 py-4 text-center text-[11px] text-muted-foreground">
            无匹配项目
          </li>
        )}
      </ul>
    </div>
  );
}
