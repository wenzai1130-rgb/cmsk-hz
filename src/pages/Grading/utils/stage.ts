/**
 * 项目阶段（新盘 / 持销 / 尾盘）判定工具
 * --------------------------------------------------------------
 * 判定顺序：
 *  1. 开盘 12 个月以内 → 新盘（new）
 *  2. 去化率 ≥ 95%     → 尾盘
 *  3. 其他              → 持销
 *
 * monthsSinceOpen 采用 projectId 的 DJB 哈希 mod 36，
 * 保证同一项目在多次刷新之间稳定落到同一「已开盘月数」，
 * 便于演示环境下 stage 分布可预期。
 */

export type StageKey = "all" | "new" | "持销" | "尾盘";

export const STAGE_LABEL: Record<StageKey, string> = {
  all: "全部",
  new: "新盘",
  持销: "持销",
  尾盘: "尾盘",
};

export function monthsSinceOpen(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  return 1 + (h % 36);
}

export function getProjectStage(
  snakeRate: number,
  projectId: string,
): Exclude<StageKey, "all"> {
  if (monthsSinceOpen(projectId) <= 12) return "new";
  if (snakeRate >= 0.95) return "尾盘";
  return "持销";
}
