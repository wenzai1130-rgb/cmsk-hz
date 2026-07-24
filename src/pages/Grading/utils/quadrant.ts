import { cellKeyOf, type Band, type Thresholds } from "@/utils/analysisMetrics";

/** 根据 X/Y 数值与阈值分档，返回九宫格 key。 */
export function classifyNineGridLocal(x: number, y: number, xT: Thresholds, yT: Thresholds) {
  const xb = x < xT.low ? "L" : x > xT.high ? "H" : "M";
  const yb = y < yT.low ? "L" : y > yT.high ? "H" : "M";
  return cellKeyOf(xb as Band, yb as Band);
}
