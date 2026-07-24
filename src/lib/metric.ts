// 个人衍生指标 - 类型与工具
export type DerivedUnit = "亿元" | "万㎡" | "套" | "%" | "个月";
export type DerivedCategory = "经营效能指标" | "风险预警指标" | "我的衍生指标";

export type DerivedMetric = {
  id: string;
  name: string;
  category: DerivedCategory;
  dataset: string;
  unit: DerivedUnit;
  decimals: 0 | 1 | 2 | 4;
  desc?: string;
  formula: string;
  createdAt: number;
};

// 当前数据集可用的基础字段（用于公式编辑器）
export const FORMULA_FIELDS: { name: string; key: string }[] = [
  { name: "总货值", key: "total" },
  { name: "总未售货值", key: "subtotal" },
  { name: "达售未取证", key: "achievedNoCert" },
  { name: "取证未售", key: "certNoSale" },
  { name: "已竣未售", key: "doneNoSale" },
  { name: "月度签约金额", key: "signed" },
  { name: "签约面积", key: "signedArea" },
  { name: "剩余未售面积", key: "unsoldArea" },
  { name: "近12个月月均销售面积", key: "avg12m" },
];

export const FORMULA_OPERATORS = ["+", "-", "×", "÷", "(", ")", "ROUND", "IF"] as const;

export const DEFAULT_DERIVED_METRICS: DerivedMetric[] = [
  {
    id: "d_dealrate",
    name: "货值去化率",
    category: "经营效能指标",
    dataset: "房间维度货值明细表",
    unit: "%",
    decimals: 2,
    desc: "签约金额 占 总货值 比例",
    formula: "签约金额 ÷ 总货值 × 100",
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "d_unsoldratio",
    name: "未售占比",
    category: "我的衍生指标",
    dataset: "房间维度货值明细表",
    unit: "%",
    decimals: 2,
    desc: "未售货值占总货值的比例",
    formula: "总未售货值 ÷ 总货值 × 100",
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: "d_riskratio",
    name: "风险库存占比",
    category: "风险预警指标",
    dataset: "房间维度货值明细表",
    unit: "%",
    decimals: 2,
    desc: "已竣未售占总未售货值比例",
    formula: "已竣未售 ÷ 总未售货值 × 100",
    createdAt: Date.now() - 86400000 * 3,
  },
];

// 校验公式
export function validateFormula(
  formula: string,
): { ok: true } | { ok: false; message: string } {
  const f = formula.trim();
  if (!f) return { ok: false, message: "公式错误：请输入公式" };
  const fieldNames = FORMULA_FIELDS.map((f) => f.name);
  const usedField = fieldNames.some((n) => f.includes(n));
  if (!usedField) return { ok: false, message: "公式错误：请选择至少一个有效指标" };
  // 括号匹配
  let depth = 0;
  for (const ch of f) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) return { ok: false, message: "公式错误：括号不完整" };
  }
  if (depth !== 0) return { ok: false, message: "公式错误：括号不完整" };
  // 未识别字段：移除字段名/运算符/数字/空白后应为空
  let test = f;
  for (const n of fieldNames) test = test.split(n).join("");
  test = test.replace(/ROUND|IF/g, "");
  test = test.replace(/[+\-×÷*/().,\s\d]/g, "");
  if (test.length > 0) {
    return { ok: false, message: "公式错误：存在未识别字段" };
  }
  // 简单的除零提示：除号后紧跟 0
  if (/[÷/]\s*0(?!\d)/.test(f)) {
    return { ok: false, message: "公式错误：除数不能为 0" };
  }
  return { ok: true };
}

// 基于一行原始数据 + 公式，计算衍生指标值
export function evalDerived(
  formula: string,
  row: Record<string, number>,
): number {
  // 调用前先做白名单校验，防止任意代码执行
  const check = validateFormula(formula);
  if (!check.ok) return 0;
  let expr = formula;
  // 字段替换为对应数值
  for (const f of FORMULA_FIELDS) {
    const val = row[f.key];
    expr = expr.split(f.name).join(val == null ? "0" : String(val));
  }
  expr = expr.replace(/×/g, "*").replace(/÷/g, "/");
  // 简化的 ROUND/IF -> 使用安全的算术替换(不接受任意 JS)
  expr = expr.replace(/ROUND\s*\(([^,]+),\s*(\d+)\)/g, "(Math.round(($1) * Math.pow(10,$2)) / Math.pow(10,$2))");
  // 严格白名单：仅允许数字、算术运算符、括号、空白、逗号,
  // 以及替换后保留的 Math.round / Math.pow 标识符
  const sanitized = expr
    .replace(/Math\.round/g, "")
    .replace(/Math\.pow/g, "");
  if (!/^[0-9+\-*/().,\s]*$/.test(sanitized)) {
    return 0;
  }
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict"; return (${expr});`)();
    return typeof v === "number" && isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export function formatDerived(v: number, unit: DerivedUnit, decimals: number): string {
  const n = v.toFixed(decimals);
  switch (unit) {
    case "%":
      return `${n}%`;
    case "个月":
      return `${n} 个月`;
    case "亿元":
      return n;
    case "万㎡":
      return n;
    case "套":
      return Math.round(v).toString();
    default:
      return n;
  }
}
