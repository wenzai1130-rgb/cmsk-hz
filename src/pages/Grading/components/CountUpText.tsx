import { useEffect, useRef, useState } from "react";

/**
 * SVG 数值滚动动画组件。
 * 在 recharts 图表内以 <text> 呈现,数值变化时以三次缓动过渡到目标值。
 */
export function CountUpText({
  x, y, value, unit, color, fontSize, stroke, baseline = "auto",
}: {
  x: number; y: number; value: number; unit: string;
  color: string; fontSize: number; stroke?: string;
  baseline?: "auto" | "middle";
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (Math.abs(from - to) < 0.001) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const dur = 600;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setDisplay(from + (to - from) * e);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline={baseline === "middle" ? "central" : "auto"}
      fontSize={fontSize}
      fontWeight={700}
      fill={color}
      stroke={stroke}
      strokeWidth={stroke ? 0.6 : 0}
      paintOrder="stroke"
      style={{ fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}
    >
      {display.toFixed(2)} {unit}
    </text>
  );
}
