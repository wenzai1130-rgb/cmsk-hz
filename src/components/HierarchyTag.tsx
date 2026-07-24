/**
 * 统一的层级标签组件 HierarchyTag
 * --------------------------------------------------------------
 * 适用范围：首页 / 21年及之前 / 自助查询 / 各类弹窗明细表 /
 * 展开-收起明细表 / 树形下钻表格。
 *
 * 同一类型的层级标签在所有页面必须共用本组件，
 * 不允许在页面中再硬编码颜色 / 字号 / 圆角。
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type HierarchyType =
  | "cityGroup"     // 城市群
  | "cityCompany"   // 城市公司
  | "city"          // 城市
  | "businessType"  // 业态
  | "project"       // 项目
  | "phase"         // 分期
  | "building";     // 楼栋

const PRESET: Record<HierarchyType, { label: string; bg: string; color: string }> = {
  cityGroup:    { label: "城市群",   bg: "#EDE9FE", color: "#7C3AED" },
  cityCompany:  { label: "城市公司", bg: "#F1F5F9", color: "#64748B" },
  city:         { label: "城市",     bg: "#CCFBF1", color: "#0D9488" },
  businessType: { label: "业态",     bg: "#DCFCE7", color: "#16A34A" },
  project:      { label: "项目",     bg: "#DCFCE7", color: "#16A34A" },
  phase:        { label: "分期",     bg: "#FEF3C7", color: "#D97706" },
  building:     { label: "楼栋",     bg: "#FEF3C7", color: "#D97706" },
};

const LABEL_TO_TYPE: Record<string, HierarchyType> = {
  "城市群":   "cityGroup",
  "城市公司": "cityCompany",
  "城市":     "city",
  "业态":     "businessType",
  "项目":     "project",
  "分期":     "phase",
  "楼栋":     "building",
};

export function resolveHierarchyType(label: string): HierarchyType | null {
  return LABEL_TO_TYPE[label] ?? null;
}

interface Props {
  type?: HierarchyType;
  /** 当只有中文层级名时使用，自动映射到 type */
  label?: string;
  /** 覆盖默认显示文本（默认显示 PRESET[type].label） */
  text?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * 统一规范：
 *   height 24px / padding 0 8px / radius 6px
 *   font 12px / weight 500 / line-height 18px
 *   inline-flex 居中 / nowrap / 垂直居中
 */
export function HierarchyTag({ type, label, text, className, style }: Props) {
  const resolved: HierarchyType =
    type ?? (label ? LABEL_TO_TYPE[label] : undefined) ?? "cityGroup";
  const preset = PRESET[resolved];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap align-middle",
        "h-5 px-1.5 rounded text-[11px] font-normal leading-none",
        className,
      )}
      style={{ background: preset.bg, color: preset.color, ...style }}
    >
      {text ?? label ?? preset.label}
    </span>
  );
}

export default HierarchyTag;
