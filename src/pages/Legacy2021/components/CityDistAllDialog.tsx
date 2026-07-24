import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { getOrgLevel, buildProjectsForCompany } from "@/pages/Legacy2021/index";

export type CityDistRow = {
  name: string;
  group: string;
  综合型大盘: number;
  正常持销: number;
  公商办: number;
  滞销项目: number;
  车位尾盘: number;
  未分类: number;
  total: number;
  period: number;
};

export const CITY_DIST_ALL: CityDistRow[] = [
  { name: "上海公司", group: "东部城市群", 综合型大盘: 88.5, 正常持销: 22.4, 公商办: 18.6, 滞销项目: 14.5, 车位尾盘: 6.2, 未分类: 4.8, total: 155.0, period: 18.5 },
  { name: "深圳公司", group: "南部城市群", 综合型大盘: 76.4, 正常持销: 20.1, 公商办: 16.4, 滞销项目: 12.8, 车位尾盘: 5.6, 未分类: 4.2, total: 135.5, period: 19.8 },
  { name: "北京公司", group: "北部城市群", 综合型大盘: 64.2, 正常持销: 17.5, 公商办: 14.2, 滞销项目: 10.4, 车位尾盘: 4.8, 未分类: 3.6, total: 114.7, period: 22.4 },
  { name: "广州公司", group: "南部城市群", 综合型大盘: 52.3, 正常持销: 14.6, 公商办: 11.5, 滞销项目: 8.6, 车位尾盘: 3.8, 未分类: 3.0, total: 93.8, period: 24.6 },
  { name: "天津公司", group: "北部城市群", 综合型大盘: 38.1, 正常持销: 10.8, 公商办: 8.4, 滞销项目: 6.2, 车位尾盘: 2.6, 未分类: 2.2, total: 68.3, period: 26.8 },
  { name: "杭州公司", group: "东部城市群", 综合型大盘: 33.8, 正常持销: 10.1, 公商办: 7.2, 滞销项目: 4.8, 车位尾盘: 2.5, 未分类: 1.9, total: 60.3, period: 17.2 },
  { name: "南京公司", group: "东部城市群", 综合型大盘: 31.5, 正常持销: 9.4, 公商办: 6.8, 滞销项目: 4.4, 车位尾盘: 2.5, 未分类: 1.8, total: 56.4, period: 15.8 },
  { name: "成都公司", group: "西部城市群", 综合型大盘: 28.3, 正常持销: 8.6, 公商办: 6.1, 滞销项目: 4.0, 车位尾盘: 2.3, 未分类: 1.6, total: 50.9, period: 20.6 },
  { name: "武汉公司", group: "中部城市群", 综合型大盘: 26.9, 正常持销: 8.2, 公商办: 5.8, 滞销项目: 3.7, 车位尾盘: 2.2, 未分类: 1.5, total: 48.3, period: 19.4 },
  { name: "厦门公司", group: "东部城市群", 综合型大盘: 24.5, 正常持销: 7.4, 公商办: 5.2, 滞销项目: 3.4, 车位尾盘: 2.0, 未分类: 1.4, total: 43.9, period: 16.9 },
  { name: "苏州公司", group: "东部城市群", 综合型大盘: 23.1, 正常持销: 7.0, 公商办: 4.9, 滞销项目: 3.2, 车位尾盘: 1.9, 未分类: 1.3, total: 41.4, period: 16.2 },
  { name: "重庆公司", group: "西部城市群", 综合型大盘: 21.8, 正常持销: 6.6, 公商办: 4.6, 滞销项目: 3.2, 车位尾盘: 1.8, 未分类: 1.2, total: 39.2, period: 23.5 },
  { name: "西安公司", group: "西部城市群", 综合型大盘: 20.2, 正常持销: 6.1, 公商办: 4.3, 滞销项目: 2.9, 车位尾盘: 1.7, 未分类: 1.1, total: 36.3, period: 21.8 },
  { name: "青岛公司", group: "北部城市群", 综合型大盘: 18.8, 正常持销: 5.7, 公商办: 4.0, 滞销项目: 2.7, 车位尾盘: 1.6, 未分类: 1.1, total: 33.9, period: 25.2 },
  { name: "长沙公司", group: "中部城市群", 综合型大盘: 17.4, 正常持销: 5.3, 公商办: 3.7, 滞销项目: 2.5, 车位尾盘: 1.5, 未分类: 1.0, total: 31.4, period: 18.7 },
  { name: "郑州公司", group: "中部城市群", 综合型大盘: 16.0, 正常持销: 4.9, 公商办: 3.4, 滞销项目: 2.4, 车位尾盘: 1.4, 未分类: 0.9, total: 29.0, period: 22.0 },
  { name: "宁波公司", group: "东部城市群", 综合型大盘: 15.0, 正常持销: 4.6, 公商办: 3.2, 滞销项目: 2.2, 车位尾盘: 1.3, 未分类: 0.9, total: 27.2, period: 17.6 },
  { name: "佛山公司", group: "南部城市群", 综合型大盘: 14.0, 正常持销: 4.2, 公商办: 3.0, 滞销项目: 2.0, 车位尾盘: 1.2, 未分类: 0.8, total: 25.2, period: 20.1 },
  { name: "济南公司", group: "北部城市群", 综合型大盘: 13.0, 正常持销: 3.9, 公商办: 2.8, 滞销项目: 1.9, 车位尾盘: 1.1, 未分类: 0.8, total: 23.5, period: 24.3 },
  { name: "合肥公司", group: "中部城市群", 综合型大盘: 12.2, 正常持销: 3.7, 公商办: 2.6, 滞销项目: 1.8, 车位尾盘: 1.0, 未分类: 0.7, total: 22.0, period: 19.0 },
];

const COLORS: Record<string, string> = {
  综合型大盘: "#2F7BF6",
  正常持销: "#38C2B0",
  公商办: "#8A63F6",
  滞销项目: "#F59E0B",
  车位尾盘: "#94A3B8",
  未分类: "#CBD5E1",
};

const GROUPS = ["全部城市群", "南部城市群", "北部城市群", "东部城市群", "西部城市群", "中部城市群"];
const fmt = (n: number) => n.toFixed(2);
const PAGE_SIZE = 10;

export function CityDistAllDialog({
  open,
  onOpenChange,
  org = "招商蛇口",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  org?: string;
}) {
  const [q, setQ] = useState("");
  const [grp, setGrp] = useState("全部城市群");
  const [sortBy, setSortBy] = useState<"total" | "period">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: "total" | "period") => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "period" ? "asc" : "desc");
    }
  };
  const [page, setPage] = useState(1);

  const level = getOrgLevel(org);
  const isCompany = level === "company";
  const showGroupFilter = !isCompany;
  const entityLabel = isCompany ? "项目" : "城市公司";
  const groupColLabel = isCompany ? "所属城市公司" : "所属城市群";

  // 数据源切换：公司 → 项目；否则 → 城市公司全集
  const sourceData = useMemo<CityDistRow[]>(() => {
    if (isCompany) {
      return buildProjectsForCompany(org).map((p) => ({ ...p }));
    }
    // 城市群 → 默认锁定到该城市群（仍展示下拉以便切换 / 全部）
    return CITY_DIST_ALL;
  }, [isCompany, org]);

  // 切换组织/打开时重置分页和筛选
  useEffect(() => {
    setPage(1);
    setQ("");
    setGrp(level === "group" ? org : "全部城市群");
  }, [org, level, open]);

  const rows = useMemo(() => {
    let r = sourceData.slice();
    if (showGroupFilter && grp !== "全部城市群") r = r.filter((x) => x.group === grp);
    if (q.trim()) r = r.filter((x) => x.name.includes(q.trim()));
    const sign = sortDir === "desc" ? -1 : 1;
    r.sort((a, b) => sign * ((a as any)[sortBy] - (b as any)[sortBy]));
    return r;
  }, [sourceData, q, grp, sortBy, sortDir, showGroupFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = rows.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q, grp, sortBy]);

  const maxTotal = rows.length ? Math.max(...rows.map((r) => r.total)) : 1;
  const segs = ["综合型大盘", "正常持销", "公商办", "滞销项目", "车位尾盘", "未分类"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[85vw] h-[80vh] p-0 gap-0 flex flex-col bg-white rounded-[14px] overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-[#EEF2F7] flex-shrink-0">
          <DialogTitle className="text-[16px] font-semibold text-[#0F172A]">
            {isCompany ? `${org} · 项目货值分布明细` : "各城市公司货值分布明细"}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-[#EEF2F7] flex items-center gap-3 flex-shrink-0 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isCompany ? "搜索项目" : "搜索城市公司"}
              className="h-8 pl-8 w-56 text-[12px]"
            />
          </div>
          {showGroupFilter && (
            <Select value={grp} onValueChange={setGrp}>
              <SelectTrigger className="h-8 w-36 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map((g) => (
                  <SelectItem key={g} value={g} className="text-[12px]">
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}




          {/* 顶部分页器 */}
          <div className="ml-auto flex items-center gap-2 text-[12px] text-[#64748B]">
            <span className="tabular-nums">
              共 <span className="text-[#1E293B] font-medium">{rows.length}</span> 条 · 第 {curPage}/{totalPages} 页
            </span>
            <div className="flex items-center rounded-md border border-[#E5EAF1] overflow-hidden">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={curPage <= 1}
                className="h-7 w-7 flex items-center justify-center text-[#475569] hover:bg-[#F6F8FB] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="上一页"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={curPage >= totalPages}
                className="h-7 w-7 flex items-center justify-center text-[#475569] hover:bg-[#F6F8FB] disabled:opacity-40 disabled:cursor-not-allowed border-l border-[#E5EAF1]"
                aria-label="下一页"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[900px]">
            <div className="sticky top-0 z-10 grid grid-cols-[60px_160px_140px_1fr_120px_120px] items-center gap-3 px-6 py-2.5 bg-[#F8FAFD] border-b border-[#EEF2F7] text-[11px] text-[#94A3B8]">
              <span>排名</span>
              <span>{entityLabel}</span>
              <span>{groupColLabel}</span>
              <span>货值结构</span>
              <button
                type="button"
                onClick={() => toggleSort("total")}
                className={`text-right inline-flex items-center justify-end gap-1 hover:text-[#1677FF] transition-colors ${sortBy === "total" ? "text-[#1677FF]" : ""}`}
              >
                总未售货值(亿)
                {sortBy === "total" ? (
                  sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                )}
              </button>
              <button
                type="button"
                onClick={() => toggleSort("period")}
                className={`text-right inline-flex items-center justify-end gap-1 hover:text-[#1677FF] transition-colors ${sortBy === "period" ? "text-[#1677FF]" : ""}`}
              >
                去化周期（月）
                {sortBy === "period" ? (
                  sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                )}
              </button>
            </div>
            <div>
              {pageRows.map((d, idx) => {
                const rank = (curPage - 1) * PAGE_SIZE + idx + 1;
                const rowPct = (d.total / maxTotal) * 100;
                return (
                  <div
                    key={d.name}
                    className="group grid grid-cols-[60px_160px_140px_1fr_120px_120px] items-center gap-3 px-6 min-h-[46px] border-b border-[#F1F5F9] hover:bg-[#F8FAFD] transition-colors"
                  >
                    <span className="text-[12px] font-semibold text-[#2F7BF6] tabular-nums">
                      TOP{rank}
                    </span>
                    <span className="text-[13px] font-medium text-[#1E293B] truncate">{d.name}</span>
                    <span className="text-[12px] text-[#64748B] truncate">{d.group}</span>
                    <div className="relative">
                      <div className="h-2.5 rounded-[3px] bg-[#E9EEF5] overflow-hidden">
                        {isCompany ? (
                          <div
                            className="h-full rounded-[3px]"
                            style={{ width: `${rowPct}%`, background: "#2F7BF6" }}
                          />
                        ) : (
                          <div className="h-full flex" style={{ width: `${rowPct}%` }}>
                            {segs.map((k, si) => {
                              const v = d[k];
                              const w = (v / d.total) * 100;
                              return (
                                <div
                                  key={k}
                                  style={{
                                    width: `${w}%`,
                                    background: COLORS[k],
                                    borderTopLeftRadius: si === 0 ? 3 : 0,
                                    borderBottomLeftRadius: si === 0 ? 3 : 0,
                                    borderTopRightRadius: si === segs.length - 1 ? 3 : 0,
                                    borderBottomRightRadius: si === segs.length - 1 ? 3 : 0,
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="pointer-events-none absolute left-0 top-full mt-2 z-20 hidden group-hover:block">
                        <div className="min-w-[240px] rounded-lg border border-[#E5EAF1] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-3">
                          <div className="text-[12px] font-semibold text-[#1E293B] mb-2">
                            {d.name}
                          </div>
                          {!isCompany && (
                            <div className="space-y-1">
                              {segs.map((k) => {
                                const v = d[k];
                                const pct = (v / d.total) * 100;
                                return (
                                  <div
                                    key={k}
                                    className="flex items-center justify-between text-[11.5px]"
                                  >
                                    <span className="inline-flex items-center gap-1.5 text-[#475569]">
                                      <span
                                        className="w-2 h-2 rounded-sm"
                                        style={{ background: COLORS[k] }}
                                      />
                                      {k}
                                    </span>
                                    <span className="tabular-nums text-[#1E293B]">
                                      {fmt(v)} 亿
                                      <span className="ml-1.5 text-[#94A3B8]">{fmt(pct)}%</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className={`${isCompany ? "" : "mt-2 pt-2 border-t border-[#F1F5F9]"} flex items-center justify-between text-[11.5px]`}>
                            <span className="text-[#64748B]">总未售货值</span>
                            <span className="tabular-nums font-semibold text-[#1E293B]">
                              {fmt(d.total)} 亿
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11.5px] mt-1">
                            <span className="text-[#64748B]">去化周期</span>
                            <span className="tabular-nums text-[#1E293B]">
                              {fmt(d.period)} 月
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <span className={`text-right text-[13px] tabular-nums ${sortBy === "total" ? "text-[#1677FF]" : "text-[#0F172A]"}`}>
                      {fmt(d.total)}
                    </span>
                    <span className={`text-right text-[12px] tabular-nums ${sortBy === "period" ? "text-[#1677FF]" : "text-[#0F172A]"}`}>
                      {fmt(d.period)}
                    </span>
                  </div>
                );
              })}
              {pageRows.length === 0 && (
                <div className="px-6 py-12 text-center text-[12px] text-[#94A3B8]">
                  暂无匹配数据
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
