import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useRequirements } from "./RequirementsContext";

interface Props {
  /** 与 usePageRequirements 中的 moduleId 对应 */
  moduleId: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** 角标颜色风格 */
  tone?: "primary" | "warn" | "success";
  /** 角标容器额外类名（用于覆盖默认 -top-2 -left-2 定位） */
  badgeClassName?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-[#1677FF] hover:bg-[#0958d9]",
  warn: "bg-[#F59E0B] hover:bg-[#d97706]",
  success: "bg-[#10B981] hover:bg-[#059669]",
};

/**
 * 包裹一个页面模块/卡片，当需求说明开启时，在左上角显示数字角标，
 * 角标可点击：打开抽屉并定位/高亮对应需求项。
 */
export function ModuleBadge({ moduleId, children, className, style, onClick, tone = "primary", badgeClassName }: Props) {
  const { open, setOpen, items, registerModule, focusModule, highlightId } = useRequirements();
  const ref = useRef<HTMLDivElement>(null);
  const reqs = items.filter((i) => i.moduleId === moduleId);
  const isHighlight = highlightId === moduleId;

  useEffect(() => {
    registerModule(moduleId, ref.current);
    return () => registerModule(moduleId, null);
  }, [moduleId, registerModule]);

  return (
    <div
      ref={ref}
      data-module-id={moduleId}
      style={style}
      onClick={onClick}
      className={cn(
        "relative transition-shadow duration-300 rounded-[inherit]",
        isHighlight &&
          "ring-2 ring-[#1677FF] ring-offset-2 shadow-[0_0_0_4px_rgba(22,119,255,0.15)]",
        className,
      )}
    >
      {open && reqs.length > 0 && (
        <div className={cn("absolute -top-2 -left-2 z-20 flex gap-1", badgeClassName)}>
          {reqs.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!open) setOpen(true);
                focusModule(moduleId);
              }}
              className={cn(
                "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full",
                "text-[11px] font-semibold text-white shadow-md ring-2 ring-white cursor-pointer transition-colors",
                TONE[tone],
              )}
              title={`${r.code} ${r.title}`}
            >
              {r.index}
            </button>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
