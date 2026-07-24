import type { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * 全站统一的白色说明气泡（Design Tokens 一致）。
 * 触发元素默认是一个灰色的 Info 图标，也可通过 children 自定义。
 * 内容区域为白底 + 浅灰边框 + 深色文字，与首页各处 tooltip 保持一致。
 */
export function InfoTip({
  tip,
  side = "top",
  className,
  contentClassName,
  children,
  iconClassName,
}: {
  tip: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
  iconClassName?: string;
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <UITooltip>
        <TooltipTrigger asChild>
          {children ? (
            <span className={cn("inline-flex items-center", className)}>{children}</span>
          ) : (
            <button
              type="button"
              className={cn("inline-flex items-center cursor-help", className)}
              aria-label="说明"
            >
              <Info className={cn("w-3 h-3 text-[#94A3B8]", iconClassName)} />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className={cn(
            "max-w-[280px] rounded-md border border-[#E2E8F0] bg-white px-3 py-2",
            "text-[12px] leading-relaxed text-[#0F172A] whitespace-pre-line",
            "shadow-[0_4px_16px_rgba(15,23,42,0.08)]",
            contentClassName,
          )}
        >
          {tip}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}
