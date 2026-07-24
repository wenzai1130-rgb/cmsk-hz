/**
 * 顶部 KPI 4 卡组件
 * --------------------------------------------------------------
 * 纯展示：分析项目数 / 平均估值售价比 / 平均项目去化率 / 弱于市场项目数。
 * 集团总览维度 (isGroupAggregate) 下切换为「城市公司」语义与文案。
 */

import { Building2, TrendingUp, Activity, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { fmtPct, fmtRatio } from "@/utils/analysisMetrics";
import { PANEL_CLS } from "../constants";

export function MetricCards({
  stats,
  isGroupAggregate,
}: {
  stats: { count: number; avgRatio: number; avgComp: number; avgSellRate: number; below: number };
  isGroupAggregate?: boolean;
}) {
  const cards = [
    {
      label: isGroupAggregate ? "分析城市公司数" : "分析项目数",
      value: stats.count.toString(),
      unit: isGroupAggregate ? "家" : "个",
      icon: Building2,
      tone: "#1677FF",
      soft: "#EFF6FF",
      desc: isGroupAggregate
        ? "纳入当前集团总览分析的城市公司数量。"
        : "纳入当前分级分析范围的项目数量。",
    },
    {
      label: isGroupAggregate ? "平均加权估值售价比" : "平均估值售价比",
      value: fmtRatio(stats.avgRatio),
      unit: "",
      icon: Activity,
      tone: "#10B981",
      soft: "#ECFDF5",
      desc: isGroupAggregate
        ? "城市公司估值售价比按房间数加权后的均值。"
        : "估值售价比 = 销售均价 / 中介估值\n平均估值售价比 = 纳入分析项目估值售价比之和 / 纳入分析项目数",
    },
    {
      label: isGroupAggregate ? "平均城市公司去化率" : "平均项目去化率",
      value: fmtPct(stats.avgSellRate, 2),
      unit: "",
      icon: TrendingUp,
      tone: "#F59E0B",
      soft: "#FFF4E6",
      desc: isGroupAggregate
        ? "各城市公司项目去化率按房间数加权后的均值。"
        : "项目去化率 = 已售房间数 / 总房间数\n平均项目去化率 = 纳入分析项目去化率之和 / 纳入分析项目数 × 100%",
    },
    {
      label: isGroupAggregate ? "弱于所属城市大盘的城市公司数" : "项目表现弱于市场项目数",
      value: stats.below.toString(),
      unit: isGroupAggregate ? "家" : "个",
      icon: AlertTriangle,
      tone: "#DC2626",
      soft: "#FEE2E2",
      desc: isGroupAggregate
        ? "去化竞争力 = 城市公司加权去化率 / 所属城市大盘去化率\n当去化竞争力 < 1 时，表示该城市公司整体去化弱于所属城市大盘。"
        : "去化竞争力 = 项目去化率 / 市场去化率\n当去化竞争力 < 1 时，表示项目去化表现弱于市场。",
    },
  ];
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${PANEL_CLS} p-4`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {c.label}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#64748B] cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={6}
                      className="max-w-[260px] rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.10)]"
                    >
                      <div className="text-xs leading-5 text-[#475569] whitespace-pre-line">{c.desc}</div>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: c.soft, color: c.tone }}
                >
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums" style={{ color: c.tone }}>
                  {c.value}
                </span>
                {c.unit && <span className="text-xs text-muted-foreground">{c.unit}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
