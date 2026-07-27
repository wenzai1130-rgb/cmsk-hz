import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 统一"分段切换（Segmented Tabs）"组件
 * ----------------------------------------------------------
 * 全站所有"在同一区域内切换视图"的场景（例：整体/已售/未售、年/月/累计、日/周/月/季/年、
 * 全部/综合型/滞销 ...）都应该使用本组件，禁止再自行拼样式，避免出现多套 tab 风格。
 *
 * 两档尺寸：
 *   - size="sm"  h-7   text-[11px]   用于卡片内 / 表格头 / 侧栏
 *   - size="md"  h-8   text-[12px]   用于模块标题右侧、模块内主要切换
 *
 * 视觉：浅灰底 + 选中白底 brand 色文字 + 轻阴影，不加粗。
 */
export type SegmentedTabItem<T extends string = string> = {
  value: T;
  label: React.ReactNode;
};

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: readonly SegmentedTabItem<T>[] | readonly T[];
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  items,
  size = "sm",
  className,
}: SegmentedTabsProps<T>) {
  const normalized: SegmentedTabItem<T>[] = (items as any[]).map((it) =>
    typeof it === "string" ? { value: it as T, label: it } : it,
  );

  const shell =
    size === "md"
      ? "h-8 rounded-md bg-[#F1F5F9] p-0.5 text-[12px]"
      : "h-7 rounded-md bg-[#F1F5F9] p-0.5 text-[11px]";

  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-0.5", shell, className)}
    >
      {normalized.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "px-2.5 h-full inline-flex items-center rounded-[4px] whitespace-nowrap transition-colors",
              active
                ? "bg-white text-[var(--color-brand)] shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}

    </div>
  );
}
