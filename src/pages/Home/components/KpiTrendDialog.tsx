import { useMemo, type ReactNode } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { formatNumber } from "@/lib/format";

/**
 * 首页 · 顶部核心卡片趋势浮窗（Popover）
 * ------------------------------------------------------------------
 * 点击指标名称/缩略趋势图触发，展示所选指标近 12 个月折线趋势。
 * 视觉：135° 渐变 header + 面积渐变 + 折线 + 每点标签 + 底部图例。
 * 颜色跟随所属卡片：总货值(蓝) / 阶段分布(橙) / 签约金额(紫)。
 */

export type KpiTrendMetric =
  | "未售总货值"
  | "新拿地货值"
  | "土储"
  | "在建"
  | "竣工"
  | "年累计签约"
  | "当月签约";

const COLOR_BY_METRIC: Record<KpiTrendMetric, string> = {
  未售总货值: "#1677FF",
  新拿地货值: "#1677FF",
  土储: "#F97316",
  在建: "#F97316",
  竣工: "#F97316",
  年累计签约: "#8B5CF6",
  当月签约: "#8B5CF6",
};

const UNIT_BY_METRIC: Record<KpiTrendMetric, string> = {
  未售总货值: "亿",
  新拿地货值: "亿",
  土储: "亿",
  在建: "亿",
  竣工: "亿",
  年累计签约: "亿",
  当月签约: "亿",
};

/** 近 12 个月 mock 序列（末月即当前时点值） */
const SERIES_BY_METRIC: Record<KpiTrendMetric, number[]> = {
  未售总货值: [149.09, 154.74, 162.76, 164.98, 177.78, 184.01, 183.15, 187.4, 204.04, 202.39, 209.98, 218.55],
  新拿地货值: [38.2, 41.6, 45.0, 52.8, 58.2, 61.4, 65.1, 70.8, 74.2, 79.6, 82.8, 86.42],
  土储: [172.3, 170.8, 168.5, 166.2, 164.1, 162.4, 160.9, 159.6, 158.2, 157.1, 156.2, 155.0],
  在建: [258.4, 262.1, 266.8, 268.9, 271.3, 274.6, 276.8, 279.2, 281.1, 283.0, 284.2, 285.0],
  竣工: [108.6, 112.3, 115.4, 118.2, 120.5, 122.6, 124.1, 125.3, 126.4, 127.2, 127.8, 128.0],
  年累计签约: [0, 12.4, 28.1, 45.2, 58.6, 68.4, 76.82, 96.5, 138.2, 178.6, 232.1, 286.4],
  当月签约: [8.2, 9.4, 7.8, 10.1, 11.6, 12.4, 10.9, 13.4, 15.8, 16.2, 18.6, 19.2],
};

/** 生成末月为当前月的 13 个月 X 轴标签（含去年同月），如 "4月"、"26年1月"。 */
function buildMonthLabels(current = new Date()) {
  const list: { key: string; label: string; isCurrent: boolean }[] = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const label = m === 1 ? `${String(y).slice(2)}年1月` : `${m}月`;
    list.push({ key: `${y}-${String(m).padStart(2, "0")}`, label, isCurrent: i === 0 });
  }
  return list;
}

function buildFromPreviousYearJanuary(current = new Date()) {
  const list: { key: string; label: string; isCurrent: boolean }[] = [];
  const start = new Date(current.getFullYear() - 1, 0, 1);
  const end = new Date(current.getFullYear(), current.getMonth(), 1);
  for (const d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    list.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: month === 1 ? `${String(year).slice(2)}年1月` : `${month}月`,
      isCurrent: year === end.getFullYear() && month === end.getMonth() + 1,
    });
  }
  return list;
}


export function KpiTrendPopover({
  metric,
  children,
  side = "bottom",
  align = "start",
}: {
  metric: KpiTrendMetric;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const color = COLOR_BY_METRIC[metric];
  const unit = UNIT_BY_METRIC[metric];

  const data = useMemo(() => {
    const months = metric === "当月签约" ? buildFromPreviousYearJanuary() : buildMonthLabels();
    const series12 = SERIES_BY_METRIC[metric] ?? [];
    // 在最前面补一位"去年同月"值：由当前月值按确定性因子（0.72~0.92）推导，
    // 保证同一指标稳定复现，将序列拓展到 13 个月。
    const currentVal = series12[series12.length - 1] ?? 0;
    const seed = (metric.length * 11) % 100;
    const factor = 0.72 + (seed / 100) * 0.2;
    const lyValue = +(currentVal * factor).toFixed(2);
    const series13 = [lyValue, ...series12];
    return months.map((m, i) => {
      const value = metric === "当月签约"
        ? (series12[i % series12.length] ?? 0)
        : (series13[i] ?? 0);
      return {
        month: m.label,
        isCurrent: m.isCurrent,
        value: +value.toFixed(2),
        snapshotType: m.isCurrent ? "当前时点值" : "月末值",
      };
    });
  }, [metric]);


  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  /* 好看的 Y 轴刻度 */
  const { yMin, yMax, yTicks } = useMemo(() => {
    const span = rawMax - rawMin || Math.abs(rawMax) || 1;
    const rawStep = (span * 1.4) / 4;
    const pow = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
    const nice = [1, 2, 2.5, 5, 10];
    const step = nice.map((n) => n * pow).find((s) => s >= rawStep) ?? 10 * pow;
    const center = (rawMax + rawMin) / 2;
    const lo = Math.floor((center - step * 2) / step) * step;
    const hi = lo + step * 4;
    const _yMin = Math.min(lo, Math.floor(rawMin / step) * step);
    const _yMax = Math.max(hi, Math.ceil(rawMax / step) * step);
    const ticks: number[] = [];
    for (let v = _yMin; v <= _yMax + step / 2; v += step) ticks.push(+v.toFixed(4));
    return { yMin: _yMin, yMax: _yMax, yTicks: ticks };
  }, [rawMin, rawMax]);

  const last = values[values.length - 1] ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={10}
        className={`${metric === "当月签约" ? "w-[820px]" : "w-[720px]"} p-0 border-[#E2E8F0] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.25)] rounded-xl overflow-hidden`}
      >
        {/* Header —— 135° 渐变 */}
        <div
          className="px-5 pt-4 pb-3 border-b border-[#EEF1F6]"
          style={{ background: `linear-gradient(135deg, ${color}1f 0%, transparent 60%)` }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full" style={{ background: color }} />
            <span className="text-[13px] font-semibold text-slate-800">{metric}</span>
            <span className="text-[11px] text-slate-500">近 12 个月趋势</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2 ml-3">
            <span className="text-[26px] font-semibold tabular-nums leading-none" style={{ color }}>
              {formatNumber(last)}
            </span>
            <span className="text-[11px] text-slate-500">{unit}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-[240px] px-3 pt-4 pb-2 bg-white">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 28, right: 20, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`kpi-area-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EEF1F6" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                interval={0}
                padding={{ left: 12, right: 12 }}
                height={40}
                tick={(props: any) => {
                  const { x, y, payload, index } = props;
                  const isCur = index === data.length - 1;
                  return (
                    <g transform={`translate(${x},${y + 4})`}>
                      <text
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={isCur ? 600 : 400}
                        fill={isCur ? color : "#64748B"}
                        dy={10}
                      >
                        {payload.value}
                      </text>
                      {isCur && (
                        <text textAnchor="middle" fontSize={9} fill={color} dy={22}>
                          当前
                        </text>
                      )}
                    </g>
                  );
                }}
              />
              <YAxis
                domain={[yMin, yMax]}
                ticks={yTicks}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                }
              />
              <Tooltip
                cursor={{ stroke: color, strokeDasharray: "3 3" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 20px -6px rgba(15,23,42,0.15)",
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "#64748B", fontSize: 11, marginBottom: 4 }}
                formatter={(v: number, _n: string, p: any) => [
                  `${formatNumber(Number(v))} ${unit}`,
                  p?.payload?.snapshotType ?? "月末值",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill={`url(#kpi-area-${metric})`}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
                activeDot={false}
                tooltipType="none"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.2}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
                dot={(props: any) => {
                  const { cx = 0, cy = 0, index = 0 } = props;
                  const isCur = index === data.length - 1;
                  return (
                    <g key={`d-${index}`}>
                      {isCur && <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.15} />}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isCur ? 4.5 : 3.5}
                        fill={isCur ? color : "#fff"}
                        stroke={color}
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}
                activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}
                label={(props: any) => {
                  const { x = 0, y = 0, value = 0, index = 0 } = props;
                  const isCur = index === data.length - 1;
                  const above = index % 2 === 0;
                  return (
                    <text
                      x={x}
                      y={above ? y - 10 : y + 16}
                      fill={isCur ? color : "#1E293B"}
                      fontSize={isCur ? 11 : 10}
                      fontWeight={isCur ? 700 : 500}
                      textAnchor="middle"
                    >
                      {formatNumber(Number(value))}
                    </text>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Footer legend */}
        <div className="px-5 py-2 border-t border-[#EEF1F6] flex items-center gap-4 text-[11px] text-slate-500 bg-[#FAFBFD]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full border-2"
              style={{ borderColor: color, background: "#fff" }}
            />
            历史月末值
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            当前时点值
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
