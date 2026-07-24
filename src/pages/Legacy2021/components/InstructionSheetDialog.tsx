import { X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  projectName: string;
};

const HEADER_INFO = [
  ["项目权益比", "51.00%"],
  ["联合团队", "招商蛇口 + 合作方"],
  ["项目总经理", "张三"],
  ["营销负责人", "李四"],
  ["工程负责人", "王五"],
  ["设计负责人", "赵六"],
  ["采购负责人", "钱七"],
  ["成本负责人", "孙八"],
  ["品资负责人", "周九"],
  ["报建负责人", "吴十"],
  ["运营负责人", "郑十一"],
];

const PRODUCT_TYPES = ["一期高层", "一期小高层", "二期高层", "二期车位"];
const ROW_KINDS: ("权益签约货值（万元）" | "权益已回款额（万元）")[] = [
  "权益签约货值（万元）",
  "权益已回款额（万元）",
];

const MONTH_COLS = [
  { key: "y2025", label: "2025全年实际", group: "actual" },
  ...Array.from({ length: 12 }, (_, i) => ({
    key: `m${i + 1}`,
    label: `${i + 1}月`,
    group: "month" as const,
  })),
  { key: "q1", label: "一季度", group: "quarter" },
  { key: "q2", label: "二季度", group: "quarter" },
  { key: "q3", label: "三季度", group: "quarter" },
  { key: "q4", label: "四季度", group: "quarter" },
  { key: "ytd", label: "2026全年累计", group: "year" },
];

const ACTIONS = [
  {
    no: 1,
    item: "完成一期高层去化方案制定",
    owner: "李四",
    requirement: "形成完整的去化策略与价格体系，并报城市公司评审",
    deadline: "2026-3-31",
    level: "里程碑节点",
  },
  {
    no: 2,
    item: "推进二期车位营销资源到位",
    owner: "李四",
    requirement: "完成销售物料、样板间、车位包装设计与落地",
    deadline: "2026-4-30",
    level: "计划节点",
  },
  {
    no: 3,
    item: "二期高层首开节点保障",
    owner: "王五 / 赵六",
    requirement: "确保示范区、样板房、销售中心按节点交付",
    deadline: "2026-6-30",
    level: "里程碑节点",
  },
  {
    no: 4,
    item: "存量公商办去化谈判推进",
    owner: "李四",
    requirement: "锁定不少于 3 个意向客户，推进合作签约",
    deadline: "2026-6-30",
    level: "计划节点",
  },
];

export function InstructionSheetDialog({ open, onClose, projectName }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cellBase =
    "border border-[#E2E8F0] px-2 py-1.5 text-[12px] tabular-nums text-right text-[#1E293B]";
  const headBase =
    "border border-[#E2E8F0] px-2 py-1.5 text-[12px] font-medium text-center text-[#334155]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] border border-[#E2E8F0] w-[90vw] h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <span className="w-1 h-5 rounded-full bg-[var(--color-brand)]" />
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] text-[#64748B]">双城工作委员会减重工作小组</span>
              <span className="text-[18px] font-semibold text-[#1E293B]">
                {projectName}经营提升指令单
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md hover:bg-[#F1F5F9] text-[#64748B] flex items-center justify-center transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-6 bg-[#F8FAFC]">
          {/* Project meta */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] p-4">
            <div className="text-[14px] font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
              项目基础信息
            </div>
            <div className="grid grid-cols-4 gap-x-6 gap-y-2">
              {HEADER_INFO.map(([k, v]) => (
                <div key={k} className="flex items-center text-[12px]">
                  <span className="text-[#64748B] w-24 shrink-0">{k}</span>
                  <span className="text-[#1E293B] font-medium truncate">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Key Targets table */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] p-4">
            <div className="text-[14px] font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
              关键指标
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse min-w-full">
                <thead>
                  <tr>
                    <th className={`${headBase} bg-[#FFF7ED] sticky left-0 z-10 min-w-[120px]`}>
                      产品类型
                    </th>
                    <th className={`${headBase} bg-[#FFF7ED] sticky left-[120px] z-10 min-w-[160px]`}>
                      指标
                    </th>
                    {MONTH_COLS.map((c) => (
                      <th
                        key={c.key}
                        className={`${headBase} min-w-[78px] ${
                          c.group === "actual"
                            ? "bg-[#F0F9FF]"
                            : c.group === "quarter"
                            ? "bg-[#ECFDF5]"
                            : c.group === "year"
                            ? "bg-[#FEF3C7]"
                            : "bg-[#F8FAFC]"
                        }`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PRODUCT_TYPES.map((p) =>
                    ROW_KINDS.map((kind, ki) => (
                      <tr key={`${p}-${kind}`}>
                        {ki === 0 && (
                          <td
                            rowSpan={2}
                            className={`${headBase} bg-white sticky left-0 z-[1]`}
                          >
                            {p}
                          </td>
                        )}
                        <td className={`${cellBase} bg-white text-left sticky left-[120px] z-[1]`}>
                          {kind}
                        </td>
                        {MONTH_COLS.map((c) => (
                          <td
                            key={c.key}
                            className={`${cellBase} ${
                              c.group === "quarter"
                                ? "bg-[#F6FEFA]"
                                : c.group === "year"
                                ? "bg-[#FFFBEB]"
                                : c.group === "actual"
                                ? "bg-[#F0F9FF]"
                                : ""
                            }`}
                          >
                            0.00
                          </td>
                        ))}
                      </tr>
                    )),
                  )}
                  {/* 项目合计 */}
                  {ROW_KINDS.map((kind, ki) => (
                    <tr key={`total-${kind}`}>
                      {ki === 0 && (
                        <td
                          rowSpan={2}
                          className={`${headBase} bg-[#FFF7ED] font-semibold sticky left-0 z-[1]`}
                        >
                          项目合计
                        </td>
                      )}
                      <td
                        className={`${cellBase} bg-[#FFF7ED] text-left font-medium sticky left-[120px] z-[1]`}
                      >
                        {kind}
                      </td>
                      {MONTH_COLS.map((c) => (
                        <td
                          key={c.key}
                          className={`${cellBase} bg-[#FFF7ED] font-semibold`}
                        >
                          0.00
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Actions table */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] p-4">
            <div className="text-[14px] font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-[var(--color-brand)]" />
              经营动作
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["序号", "具体事项", "责任人", "具体要求", "完成节点时间", "节点分级"].map(
                    (h) => (
                      <th key={h} className={`${headBase} bg-[#F1F5F9]`}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {ACTIONS.map((a) => (
                  <tr key={a.no}>
                    <td className={`${cellBase} text-center w-12`}>{a.no}</td>
                    <td className={`${cellBase} text-left`}>{a.item}</td>
                    <td className={`${cellBase} text-center w-24`}>{a.owner}</td>
                    <td className={`${cellBase} text-left`}>{a.requirement}</td>
                    <td className={`${cellBase} text-center w-32`}>{a.deadline}</td>
                    <td className={`${cellBase} text-center w-28`}>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          a.level === "里程碑节点"
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-[#E0F2FE] text-[#0369A1]"
                        }`}
                      >
                        {a.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
