/**
 * 项目数据异常原因判定
 * --------------------------------------------------------------
 * 命中任一规则即被视为「数据异常」项目：
 *   - 明细表继续展示，并在「异常原因」列以红色标签罗列全部命中原因
 *   - 不进入九宫格 / 散点图 / 摘要计算
 */

import type { ProjectAnalysisRow } from "@/utils/analysisMetrics";

export function getAnomalyReasons(p: ProjectAnalysisRow): string[] {
  const reasons: string[] = [];
  if (!p.cmbValuationPrice || p.cmbValuationPrice <= 0) reasons.push("中介估值缺失");
  if (
    p.marketSellThroughRate == null ||
    Number.isNaN(p.marketSellThroughRate) ||
    p.marketSellThroughRate <= 0
  ) {
    reasons.push("竞品去化缺失");
  }
  const r = p.valuationSalesRatio;
  if (typeof r === "number" && (r < 0.3 || r > 2)) reasons.push("外部数据异常");
  return reasons;
}
