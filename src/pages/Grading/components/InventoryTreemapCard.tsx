import { useMemo, useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatProjectName } from "@/lib/format";
import type { ProjectAnalysisRow } from "@/utils/analysisMetrics";
import { PANEL_CLS } from "../constants";
import { TreemapCanvas, type Tile } from "./TreemapCanvas";
import { TIER_COLOR, TIER_LABEL, cityOfProject, tierOfProject } from "../utils/tier";

// 低饱和度商务多色（马卡龙/冰淇淋色系）—— 按货值排序依次取色
const BLUE_RAMP = [
  "#A7F3D0", "#BAE6FD", "#E9D5FF", "#FFEDD5", "#FEF3C7",
  "#FBCFE8", "#C7D2FE", "#D1FAE5", "#E0E7FF", "#F0F4F8",
];

const TOP_N_TREEMAP = 30;

export function InventoryTreemapCard({
  projects, selectedId, hoveredId, onHover, onPick, businessType, matchedIds, colorByTier = false,
}: {
  projects: ProjectAnalysisRow[];
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onPick: (p: ProjectAnalysisRow) => void;
  businessType: string;
  matchedIds?: Set<string> | null;
  colorByTier?: boolean;
}) {
  const residential = useMemo(
    () => projects.filter((p) => p.businessType === "住宅" || businessType === "住宅"),
    [projects, businessType],
  );
  const highlightId = selectedId ?? hoveredId;

  const dataAll = useMemo(() => {
    const TAIL = BLUE_RAMP[BLUE_RAMP.length - 1];
    return residential
      .filter((p) => p.remainingValue > 0)
      .sort((a, b) => b.remainingValue - a.remainingValue)
      .map((p, i) => {
        const tier = tierOfProject(p);
        const color = colorByTier
          ? TIER_COLOR[tier]
          : i < BLUE_RAMP.length - 1 ? BLUE_RAMP[i] : TAIL;
        return {
          projectName: formatProjectName(p.projectName),
          projectId: p.projectId,
          value: p.remainingValue,
          itemStyle: { color },
          tier,
          city: cityOfProject(p),
        };
      });
  }, [residential, colorByTier]);

  const dataTop = useMemo(() => dataAll.slice(0, TOP_N_TREEMAP), [dataAll]);
  const hasMore = dataAll.length > TOP_N_TREEMAP;
  const [openAll, setOpenAll] = useState(false);

  const totalValue = useMemo(
    () => residential.reduce((s, r) => s + (r.remainingValue > 0 ? r.remainingValue : 0), 0),
    [residential],
  );

  const tiersInData = useMemo(() => {
    if (!colorByTier) return [] as (keyof typeof TIER_COLOR)[];
    const order: (keyof typeof TIER_COLOR)[] = ["t1", "newT1", "t2", "t34", "other"];
    const present = new Set(dataAll.map((d) => d.tier));
    return order.filter((t) => present.has(t));
  }, [dataAll, colorByTier]);

  const renderTile = (t: Tile, _data: typeof dataAll) => {
    const d = t.payload as typeof dataAll[number];
    const project = residential.find((p) => p.projectId === d.projectId);
    const isHi = highlightId === d.projectId;
    const isUnmatched = !!matchedIds && !matchedIds.has(d.projectId);
    const dim = !!highlightId && !isHi;
    const showLabel = t.w > 60 && t.h > 40;
    const share = totalValue > 0 ? (d.value / totalValue) * 100 : 0;
    const textColor = "#1E293B";
    return (
      <TooltipProvider key={d.projectId} delayDuration={80}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseEnter={() => onHover(d.projectId)}
              onMouseLeave={() => onHover(null)}
              onClick={() => project && onPick(project)}
              className="absolute flex flex-col items-center justify-center text-center px-2 transition-[filter,opacity] duration-150"
              style={{
                left: t.x, top: t.y, width: t.w, height: t.h,
                backgroundColor: d.itemStyle.color,
                border: "1px solid #FFFFFF",
                opacity: isUnmatched ? 0.55 : dim ? 0.55 : 1,
                color: textColor,
                cursor: "pointer",
                filter: isUnmatched ? "grayscale(0.6)" : isHi ? "brightness(0.95)" : "none",
              }}
            >
              {showLabel && (
                <>
                  <span className="text-[12px] leading-tight truncate max-w-full" style={{ color: textColor, fontWeight: 400 }}>
                    {d.projectName}
                  </span>
                  <span className="text-[12px] leading-tight tabular-nums mt-0.5" style={{ color: textColor, fontWeight: 400 }}>
                    {d.value.toFixed(2)}亿
                  </span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top" sideOffset={8}
            className="min-w-[220px] border border-[#E2E8F0] bg-white/95 backdrop-blur-sm text-[#1E293B] shadow-[0_4px_12px_rgba(0,0,0,0.08)] rounded-md px-3 py-2"
          >
            <div className="text-sm font-semibold text-[#1E293B] mb-1.5">{d.projectName}</div>
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px]">
              <span className="text-[#64748B]">住宅剩余货值</span>
              <span className="text-right tabular-nums font-medium text-[#1E293B]">{d.value.toFixed(2)} 亿</span>
              <span className="text-[#64748B]">占本城市住宅存货比例</span>
              <span className="text-right tabular-nums font-medium text-[#1E293B]">{share.toFixed(2)}%</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={`${PANEL_CLS} p-4 h-[700px] flex flex-col w-full`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            项目存货结构分析
            {hasMore && (
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                （TOP {TOP_N_TREEMAP} / 共 {dataAll.length}）
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {colorByTier ? "以项目为分析维度，颜色按城市能级区分" : "以项目为分析维度，展示当前城市品类的存货规模矩阵"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {colorByTier && tiersInData.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#475569]">
              {tiersInData.map((t) => (
                <span key={t} className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TIER_COLOR[t] }} />
                  {TIER_LABEL[t]}
                </span>
              ))}
            </div>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpenAll(true)}
              className="text-[11px] text-[#1677FF] hover:underline whitespace-nowrap"
            >
              查看更多 →
            </button>
          )}
        </div>
      </div>
      <TreemapCanvas data={dataTop} renderTile={renderTile} />

      <Dialog open={openAll} onOpenChange={setOpenAll}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">
              项目存货结构分析 · 全部项目（共 {dataAll.length}）
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <TreemapCanvas data={dataAll} renderTile={renderTile} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
