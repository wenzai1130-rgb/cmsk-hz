import { useState, type ReactNode } from "react";
import { Play, Pause } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Slider } from "@/components/ui/slider";

/**
 * 九宫格时间轴播放器 · 抽离自 Grading/index.tsx
 * 负责渲染:播放按钮、月度刻度、滑块以及 3/6/12 月快捷切换。
 */

function QuadrantSliderTicks({ maxFrame, sliderVal, onPick }: { maxFrame: number; sliderVal: number; onPick: (frame: number) => void }) {
  if (maxFrame <= 0) return null;
  const ticks = Array.from({ length: maxFrame + 1 }, (_, p) => p);
  return (
    <div className="relative h-5 select-none">
      {ticks.map((p) => {
        const leftPct = (p / maxFrame) * 100;
        const frame = maxFrame - p;
        const label = frame === 0 ? "当月" : `T-${frame}`;
        const active = p === sliderVal;
        const isFirst = p === 0;
        const isLast = p === maxFrame;
        const translate = isFirst ? "translate-x-0" : isLast ? "-translate-x-full" : "-translate-x-1/2";
        const tickAlign = isFirst ? "items-start" : isLast ? "items-end" : "items-center";
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPick(frame)}
            className={`absolute top-0 ${translate} flex flex-col ${tickAlign} gap-0.5 cursor-pointer`}
            style={{ left: `${leftPct}%` }}
          >
            <span className="w-px h-1 bg-[#CBD5E1]" />
            <span
              className="text-[11px] tabular-nums leading-none whitespace-nowrap transition-colors"
              style={{ color: active ? "#1677FF" : "#64748B" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function QuadrantQuickBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-md border text-[11px] transition-colors ${
        active
          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
          : "border-[#E2E8F0] bg-white text-foreground hover:border-[var(--color-brand)]"
      }`}
    >
      {children}
    </button>
  );
}

export function QuadrantTimelinePlayer({
  playing, canPlay = true, onTogglePlay, frame, maxFrame, onFrame, onQuickRange, dateRange, onDateRange,
}: {
  playing: boolean; canPlay?: boolean; onTogglePlay: () => void;
  frame: number; maxFrame: number; onFrame: (f: number) => void;
  onQuickRange: (months: number) => void;
  dateRange?: DateRange; onDateRange: (r?: DateRange) => void;
}) {
  // dateRange / onDateRange 目前未在此组件内部渲染日历,保留签名以兼容调用方后续扩展。
  const [, setCalendarOpen] = useState(false);
  void dateRange; void onDateRange; void setCalendarOpen;
  const sliderVal = maxFrame - frame;
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#EEF2F7]">
      <button
        type="button"
        disabled={!canPlay}
        onClick={(e) => {
          e.stopPropagation();
          if (!canPlay) return;
          onTogglePlay();
        }}
        className={`w-9 h-9 rounded-full text-white inline-flex items-center justify-center shadow-sm transition-opacity ${
          canPlay ? "bg-[var(--color-brand)] hover:opacity-90 cursor-pointer" : "bg-[#CBD5E1] cursor-not-allowed"
        }`}
        aria-label={!canPlay ? "请先选中气泡" : playing ? "暂停" : "播放"}
        title={!canPlay ? "请先在九宫格中选中一个项目气泡,再开始播放" : playing ? "暂停" : "播放"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <Slider
          value={[sliderVal]}
          min={0} max={maxFrame} step={1}
          onValueChange={(v) => onFrame(maxFrame - (v[0] ?? 0))}
          className="flex-1"
        />
        <QuadrantSliderTicks maxFrame={maxFrame} sliderVal={sliderVal} onPick={onFrame} />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <QuadrantQuickBtn active={maxFrame === 2} onClick={() => onQuickRange(3)}>3 个月</QuadrantQuickBtn>
        <QuadrantQuickBtn active={maxFrame === 5} onClick={() => onQuickRange(6)}>6 个月</QuadrantQuickBtn>
        <QuadrantQuickBtn active={maxFrame === 11} onClick={() => onQuickRange(12)}>1 年</QuadrantQuickBtn>
      </div>
    </div>
  );
}
