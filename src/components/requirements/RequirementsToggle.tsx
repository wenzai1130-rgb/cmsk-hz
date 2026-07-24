import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequirements } from "./RequirementsContext";

export function RequirementsToggle({ className }: { className?: string }) {
  const { open, toggle, items } = useRequirements();
  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
        open
          ? "border-[#1677FF] bg-[#E6F0FF] text-[#1677FF]"
          : "border-[#E2E8F0] bg-white text-slate-600 hover:border-[#1677FF] hover:text-[#1677FF]",
        className,
      )}
      title={open ? "隐藏需求说明" : "显示需求说明"}
    >
      <ClipboardList className="w-3.5 h-3.5" />
      <span>{open ? "隐藏需求说明" : "显示需求说明"}</span>
      {items.length > 0 && (
        <span
          className={cn(
            "ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold",
            open ? "bg-[#1677FF] text-white" : "bg-slate-100 text-slate-500",
          )}
        >
          {items.length}
        </span>
      )}
    </button>
  );
}
