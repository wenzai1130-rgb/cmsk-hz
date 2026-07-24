import { Download } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * 全站统一「导出」按钮
 * ------------------------------------------------------------
 * 视觉规范（所有页面须一致）：
 *  - 高度 h-8, 内边距 px-3, gap-1.5
 *  - 圆角 rounded-md, 白底, 边框 #E2E8F0
 *  - 字号 12px, 文字色 #1E293B
 *  - Hover: 边框与文字变主题色 var(--color-brand)
 *  - 图标 lucide Download, 尺寸 w-3.5 h-3.5
 */
export interface ExportButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export const ExportButton = forwardRef<HTMLButtonElement, ExportButtonProps>(
  ({ label = "导出", className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cn(
        "h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white text-[12px] text-[#1E293B] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors whitespace-nowrap cursor-pointer",
        className,
      )}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{children ?? label}</span>
    </button>
  ),
);
ExportButton.displayName = "ExportButton";
