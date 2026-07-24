/**
 * 九宫格气泡 Tooltip 展示组件
 * --------------------------------------------------------------
 * 纯展示组件，无本地状态；从 index.tsx 抽离以降低主文件行数。
 *
 * 支持两种数据形态：
 *   1. 单项目气泡（默认）：展示 4 组信息（基本面 / 去化 / 价格估值 / 货值定位）。
 *   2. 城市公司聚合"伪项目"（projectId 以 "city:" 前缀）：展示加权聚合口径。
 */

import { NINE_GRID_META, CATEGORY_META, COMPARE_LABEL, fmtPct, fmtRatio, fmtWan, fmtYi, type ProjectAnalysisRow } from "@/utils/analysisMetrics";
import { formatProjectName } from "@/lib/format";
import { TIER_COLOR as SEMANTIC_TIER } from "@/data/chartTheme";
import { TOOLTIP_STYLE, BUBBLE_SIZE_META, type BubbleSizeKey } from "../constants";

// 象限 key → X/Y 分带的映射（tooltip 中据此推出对应格子的分类色）
const QUAD_BANDS: Record<string, { x: "L" | "M" | "H"; y: "L" | "M" | "H" }> = {
  value_realization: { x: "H", y: "H" }, steady_sale: { x: "M", y: "H" }, price_up_watch: { x: "L", y: "H" },
  price_watch: { x: "H", y: "M" }, balanced: { x: "M", y: "M" }, price_repair: { x: "L", y: "M" },
  sale_improvement: { x: "H", y: "L" }, ops_improvement: { x: "M", y: "L" }, pressure: { x: "L", y: "L" },
};
const BAND_TO_CAT: Record<string, "advantage" | "watch" | "concern"> = {
  H: "advantage", M: "watch", L: "concern",
};

export function ProjectTooltipContent({
  p,
  bubbleSizeKey,
  quadrantKey,
  yTier,
}: {
  p: ProjectAnalysisRow;
  bubbleSizeKey: BubbleSizeKey;
  quadrantKey?: keyof typeof NINE_GRID_META;
  yTier?: { text: string; color: string };
}) {
  const activeQuadrant = quadrantKey ?? p.quadrant;
  const m = NINE_GRID_META[activeQuadrant];
  const bm = BUBBLE_SIZE_META[bubbleSizeKey];
  const bubbleValue = bubbleSizeKey === "remainingValue" ? p.remainingValue : p.salesFloorPrice;
  const isCityAggregate = p.projectId.startsWith("city:");
  if (isCityAggregate) {
    return (
      <div style={TOOLTIP_STYLE} className="min-w-[240px]">
        <div className="font-semibold mb-0.5 text-foreground">{p.cityCompany}</div>
        <div className="text-[11px] text-muted-foreground mb-2">城市公司聚合 · 点击下钻查看项目明细</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
          <span className="text-muted-foreground">项目数</span>
          <span className="text-right tabular-nums">{p.street} 个</span>
          <span className="text-muted-foreground">加权项目去化率</span>
          <span className="text-right tabular-nums">{fmtPct(p.snakeSellThroughRate, 2)}</span>
          <span className="text-muted-foreground">所属城市大盘去化率</span>
          <span className="text-right tabular-nums">{fmtPct(p.effectiveMarketSellThroughRate, 2)}</span>
          <span className="text-muted-foreground">去化竞争力</span>
          <span className="text-right font-semibold" style={{ color: yTier?.color ?? (p.sellThroughCompetitiveness >= 1 ? SEMANTIC_TIER.advantage : SEMANTIC_TIER.concern) }}>{yTier?.text ?? fmtRatio(p.sellThroughCompetitiveness)}</span>
          <span className="text-muted-foreground">加权估值售价比</span>
          <span className="text-right tabular-nums">{fmtRatio(p.valuationSalesRatio)}</span>
          <span className="text-muted-foreground">剩余货值合计</span>
          <span className="text-right tabular-nums">{fmtYi(p.remainingValue)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-[#EEF2F7] text-[11px] flex items-center justify-between">
          <span className="text-muted-foreground">气泡大小口径：<span className="text-foreground">{bm.label}</span></span>
          <span className="tabular-nums font-medium text-[var(--color-brand)]">{bm.formatValue(bubbleValue)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-[#EEF2F7] text-[11px]">
          <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: m.soft, color: m.color }}>{m.label}</span>
        </div>
      </div>
    );
  }
  void bubbleValue;
  const competitiveness = p.sellThroughCompetitiveness;
  const priceRatio = p.valuationSalesRatio;
  const compLabel = COMPARE_LABEL[p.compareMode] + "去化率";
  const bands = QUAD_BANDS[activeQuadrant] ?? { x: "M", y: "M" };
  const priceRatioColor = CATEGORY_META[BAND_TO_CAT[bands.x]].color;
  const competitivenessColor = CATEGORY_META[BAND_TO_CAT[bands.y]].color;
  return (
    <div
      style={{
        ...TOOLTIP_STYLE,
        background: "rgba(255,255,255,0.97)",
        WebkitBackdropFilter: "saturate(140%) blur(6px)",
        backdropFilter: "saturate(140%) blur(6px)",
        fontFamily: '"Source Han Sans SC","Source Han Sans","Noto Sans SC",sans-serif',
      }}
      className="min-w-[280px] max-w-[320px] rounded-xl border border-[#E5E7EB] shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-3"
    >
      {/* 维度说明 */}
      <div className="flex items-center justify-end mb-1.5">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F8FAFC] text-[11px]"
          style={{ color: "#6B7280" }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: "#CBD5E1", border: "1px solid #94A3B8" }}
          />
          气泡大小：剩余货值
        </span>
      </div>

      {/* 分组 1：项目基本面 */}
      <div className="text-[13.5px] font-semibold leading-tight" style={{ color: "#111827" }}>
        {formatProjectName(p.projectName)}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">区域街道</span>
        <span className="text-right text-foreground truncate">
          {[p.district, p.street].filter(Boolean).join(" · ") || "—"}
        </span>
        <span className="text-muted-foreground">总房间数</span>
        <span className="text-right tabular-nums text-foreground">{p.roomCount}</span>
        <span className="text-muted-foreground">在售房间数</span>
        <span className="text-right tabular-nums text-foreground">{p.onSaleRoomCount}</span>
      </div>

      <div className="my-2.5 border-t border-[#F1F5F9]" />

      {/* 分组 2：去化效能评估 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">项目去化率</span>
        <span className="text-right tabular-nums text-foreground">{fmtPct(p.snakeSellThroughRate, 2)}</span>
        <span className="text-muted-foreground">{compLabel}</span>
        <span className="text-right tabular-nums text-foreground">{fmtPct(p.effectiveMarketSellThroughRate, 2)}</span>
        <span className="text-muted-foreground">去化竞争力</span>
        <span
          className="text-right font-semibold"
          style={{ color: yTier?.color ?? competitivenessColor }}
        >
          {yTier?.text ?? fmtRatio(competitiveness)}
        </span>
      </div>

      <div className="my-2.5 border-t border-[#F1F5F9]" />

      {/* 分组 3：价格与估值体系 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">销售均价</span>
        <span className="text-right tabular-nums text-foreground">{fmtWan(p.salesFloorPrice)}</span>
        <span className="text-muted-foreground">中介估值</span>
        <span className="text-right tabular-nums text-foreground">{fmtWan(p.cmbValuationPrice)}</span>
        <span className="text-muted-foreground">当前售估比</span>
        <span className="text-right tabular-nums font-semibold" style={{ color: priceRatioColor }}>
          {fmtRatio(priceRatio)}
        </span>
      </div>

      <div className="my-2.5 border-t border-[#F1F5F9]" />

      {/* 分组 4：货值与大盘定位 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">剩余货值</span>
        <span className="text-right tabular-nums font-semibold text-foreground">{fmtYi(p.remainingValue)}</span>
        <span className="text-muted-foreground">所属区域</span>
        <span className="text-right">
          <span
            className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-medium"
            style={{ background: m.soft, color: m.color }}
          >
            {m.label}
          </span>
        </span>
      </div>
    </div>
  );
}
