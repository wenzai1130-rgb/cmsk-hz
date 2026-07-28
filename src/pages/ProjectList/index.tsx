import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Home as HomeIcon, Building2, Store, BedDouble, Briefcase, Car, Package, Eraser, ArrowUp, ArrowDown, ArrowUpDown, Search, X, ChevronLeft, ChevronRight, ImageOff, Check, LayoutGrid, List as ListIcon, Hash, DoorOpen, Copy, History, CalendarDays } from "lucide-react";
import { OrgMultiPicker, DayPicker, CaliberPicker } from "@/components/filters/home-filters";
import { toast } from "sonner";

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}



import { HeaderNav } from "@/components/layout/HeaderNav";
import { groupProjectAnalysisData } from "@/data/groupProjectAnalysisData";
import { formatProjectName } from "@/lib/format";
import { TIER_CITY_MAP, TIER_LABEL } from "@/pages/Grading/utils/tier";
import { usePageRequirements, ModuleBadge } from "@/components/requirements";
import { PAGE_REQUIREMENTS } from "./config/pageRequirements";
import projectPhoto1 from "@/assets/project-photo-1.jpg";
import projectPhoto2 from "@/assets/project-photo-2.jpg";
import projectPhoto3 from "@/assets/project-photo-3.jpg";
import projectPlaceholder from "@/assets/project-placeholder.jpg";

const cityOf = (c: string) => (c || "").replace(/公司$/, "");

// 当前登录用户的城市公司权限：null = 集团全权限；否则仅可查看该城市公司
const CURRENT_USER_CITY: string | null = null;
const ALL_LABEL = "全部";

type PriceKey = "all" | "lt2" | "2to5" | "5to10" | "gt10";
type BizKey = "all" | "住宅" | "商业" | "公寓" | "写字楼" | "车位" | "配套及其他";
type StageKey = "all" | "notOpened" | "new" | "onSale" | "tail";
type SortKey = "default" | "sellRate" | "remaining" | "openDate";
type SortDir = "asc" | "desc";

const PRICE_LABEL: Record<PriceKey, string> = {
  all: "全部", lt2: "2W以下", "2to5": "2W~5W", "5to10": "5W~10W", gt10: "10W以上",
};
const BIZ_OPTS: BizKey[] = ["all", "住宅", "商业", "公寓", "写字楼", "车位", "配套及其他"];
const STAGE_LABEL: Record<StageKey, string> = { all: "全部", notOpened: "未开盘", new: "新盘", onSale: "持销", tail: "尾盘" };

const TIER_ORDER: (keyof typeof TIER_LABEL)[] = ["t1", "newT1", "t2", "t34", "other"];

function stageOf(p: { projectId: string; snakeSellThroughRate: number }): Exclude<StageKey, "all"> {
  // 未开盘：按 projectId 做稳定哈希，约 12% 项目判定为未开盘（演示数据）
  if (hashStr(p.projectId + "stage") % 100 < 12) return "notOpened";
  if (p.snakeSellThroughRate >= 0.95) return "tail";
  if (p.snakeSellThroughRate <= 0.3) return "new";
  return "onSale";
}
function stageBadgeClass(stageK: Exclude<StageKey, "all">) {
  if (stageK === "notOpened") return "text-[#B45309] bg-[#FFF7ED] border-[#FED7AA]";
  if (stageK === "tail") return "text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]";
  if (stageK === "new") return "text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]";
  return "text-[#1677FF] bg-[#EFF6FF] border-[#BFDBFE]";
}
function priceBucket(v: number): PriceKey {
  if (v < 20000) return "lt2";
  if (v < 50000) return "2to5";
  if (v < 100000) return "5to10";
  return "gt10";
}

// 简易稳定哈希（djb2 变体）
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

// 稳定伪造开盘时间：近 8 年内的某一天（由 projectId 决定），用于排序演示
// 约 1/6 的项目无开盘时间（返回 null，排序时统一放最后）
function openDateOf(projectId: string): number | null {
  const h = hashStr(projectId + "od");
  if (h % 6 === 0) return null;
  const now = Date.now();
  const eightYears = 8 * 365 * 24 * 3600 * 1000;
  return now - (h % eightYears);
}
// 稳定伪造拿地时间：开盘时间之前 6~36 个月；无开盘时间的项目也有拿地时间用于兜底排序
function landDateOf(projectId: string): number {
  const h = hashStr(projectId + "ld");
  const now = Date.now();
  const tenYears = 10 * 365 * 24 * 3600 * 1000;
  return now - (h % tenYears);
}
function fmtOpenDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function displayOpenDate(p: { projectId: string; snakeSellThroughRate: number }): string {
  const stageK = stageOf(p);
  if (stageK === "notOpened" || stageK === "tail") return "--";
  const t = openDateOf(p.projectId);
  return t ? fmtOpenDate(t) : "--";
}

// 部分项目具备真实照片；其余无照片项目使用按 projectId 哈希稳定分配的渐变色
const PROJECT_PHOTO_POOL = [projectPhoto1, projectPhoto2, projectPhoto3, projectPlaceholder];
// 约 55% 的项目分配到照片，其余走渐变（稳定：由哈希决定）
const hasRealPhoto = (id: string) => hashStr(id) % 100 < 55;
const getProjectPhoto = (id: string) =>
  PROJECT_PHOTO_POOL[hashStr(id + "p") % PROJECT_PHOTO_POOL.length];

const CARD_GRADIENTS: string[] = [
  "from-[#DBEAFE] via-[#BFDBFE] to-[#93C5FD]",
  "from-[#FCE7F3] via-[#FBCFE8] to-[#F9A8D4]",
  "from-[#DCFCE7] via-[#BBF7D0] to-[#86EFAC]",
  "from-[#FEF3C7] via-[#FDE68A] to-[#FCD34D]",
  "from-[#EDE9FE] via-[#DDD6FE] to-[#C4B5FD]",
  "from-[#FFE4E6] via-[#FECDD3] to-[#FDA4AF]",
  "from-[#CFFAFE] via-[#A5F3FC] to-[#67E8F9]",
  "from-[#FFEDD5] via-[#FED7AA] to-[#FDBA74]",
];
const getCardGradient = (id: string) => CARD_GRADIENTS[hashStr(id + "g") % CARD_GRADIENTS.length];

// 为了让业态更有辨识度：源数据几乎全部为"住宅"，此处按 projectId 稳定伪造一个显示业态，
// 让卡片/筛选/表格呈现多样化。分布权重：住宅 45% / 商业 15% / 公寓 12% / 写字楼 10% / 车位 12% / 配套 6%
// 业态展示顺序：住宅 → 公寓 → 商业 → 写字楼 → 其他（配套及其他）→ 车位
const BIZ_ORDER: Array<Exclude<BizKey, "all">> = ["住宅", "公寓", "商业", "写字楼", "配套及其他", "车位"];
const BIZ_BUCKETS: Array<Exclude<BizKey, "all">> = (() => {
  const arr: Array<Exclude<BizKey, "all">> = [];
  const push = (k: Exclude<BizKey, "all">, n: number) => { for (let i = 0; i < n; i++) arr.push(k); };
  push("住宅", 45); push("商业", 15); push("公寓", 12); push("写字楼", 10); push("车位", 12); push("配套及其他", 6);
  return arr;
})();
const displayBizList = (p: { projectId: string; businessType: string }): Array<Exclude<BizKey, "all">> => {
  const h1 = hashStr(p.projectId + "b");
  const h2 = hashStr(p.projectId + "n");
  // 大部分单业态、部分双业态、少量三业态
  const r = h2 % 10;
  const count = r < 6 ? 1 : r < 9 ? 2 : 3;
  const set = new Set<Exclude<BizKey, "all">>();
  let i = 0;
  while (set.size < count && i < 32) {
    set.add(BIZ_BUCKETS[(h1 + i * 7) % BIZ_BUCKETS.length]);
    i++;
  }
  return BIZ_ORDER.filter((k) => set.has(k));
};
const displayBizLabel = (p: { projectId: string; businessType: string }) => displayBizList(p).join(",");

// 表格视图：将 projectName 拆分为「城市」和「项目名称」
// 派生数据格式为「城市·项目名」，原始数据则为「城市项目名」前缀
function splitProjectName(p: { projectId: string; projectName: string; cityCompany: string }) {
  const city = cityOf(p.cityCompany);
  if (p.projectName.includes("·")) {
    const [prefix, ...rest] = p.projectName.split("·");
    return { city: prefix, name: formatProjectName(rest.join("·")) };
  }
  const raw = formatProjectName(p.projectName);
  if (raw.startsWith(city)) {
    return { city, name: raw.slice(city.length).trim() };
  }
  return { city, name: raw };
}

// 业态图标 & 配色（图标 / 底色 / 阴影色）
const BIZ_ICON: Record<Exclude<BizKey, "all">, {
  Icon: typeof Building2; bg: string; fg: string; shadow: string;
}> = {
  "住宅":     { Icon: Building2,  bg: "#EFF6FF", fg: "#1677FF", shadow: "rgba(22,119,255,0.35)" },
  "商业":     { Icon: Store,      bg: "#FFF7E6", fg: "#D97706", shadow: "rgba(217,119,6,0.32)" },
  "公寓":     { Icon: BedDouble,  bg: "#ECFDF5", fg: "#059669", shadow: "rgba(5,150,105,0.32)" },
  "写字楼":   { Icon: Briefcase,  bg: "#F5F3FF", fg: "#7C3AED", shadow: "rgba(124,58,237,0.32)" },
  "车位":     { Icon: Car,        bg: "#FEF2F2", fg: "#DC2626", shadow: "rgba(220,38,38,0.30)" },
  "配套及其他": { Icon: Package,  bg: "#F1F5F9", fg: "#475569", shadow: "rgba(71,85,105,0.28)" },
};


export default function ProjectList() {
  usePageRequirements("项目分析", PAGE_REQUIREMENTS);
  const [keyword, setKeyword] = useState<string>("");
  // 城市公司多选（组织树叶子）：空数组 = 全部
  const [selectedCityCompanies, setSelectedCityCompanies] = useState<string[]>([]);
  const [biz, setBiz] = useState<BizKey>("all");
  const [caliber, setCaliber] = useState<"equity" | "full">("equity");
  const [dataDate, setDataDate] = useState<string>(getYesterdayStr());

  

  const [price, setPrice] = useState<PriceKey>("all");
  const [stage, setStage] = useState<StageKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("openDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // 数据集里实际出现过的城市公司（限定组织树叶子的可选范围）
  const allowedCityCompanies = useMemo(() => {
    const s = new Set<string>();
    groupProjectAnalysisData.forEach((p) => {
      if (CURRENT_USER_CITY && cityOf(p.cityCompany) !== CURRENT_USER_CITY) return;
      s.add(p.cityCompany);
    });
    return Array.from(s);
  }, []);

  const cityCompanySet = useMemo(
    () => new Set(selectedCityCompanies),
    [selectedCityCompanies],
  );

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = groupProjectAnalysisData.filter((p) => {
      const cn = cityOf(p.cityCompany);
      if (CURRENT_USER_CITY && cn !== CURRENT_USER_CITY) return false;
      if (cityCompanySet.size > 0 && !cityCompanySet.has(p.cityCompany)) return false;
      if (biz !== "all" && !displayBizList(p).includes(biz)) return false;
      if (price !== "all" && priceBucket(p.salesFloorPrice) !== price) return false;
      if (stage !== "all" && stageOf(p) !== stage) return false;
      if (kw) {
        if (!p.projectName.toLowerCase().includes(kw)) return false;
      }
      return true;
    });
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "sellRate") arr.sort((a, b) => (a.snakeSellThroughRate - b.snakeSellThroughRate) * dir);
    else if (sortKey === "remaining") arr.sort((a, b) => (a.remainingValue - b.remainingValue) * dir);
    else if (sortKey === "openDate") arr.sort((a, b) => {
      const da = openDateOf(a.projectId);
      const db = openDateOf(b.projectId);
      // 都无开盘时间：按拿地时间排序（同方向）
      if (da === null && db === null) {
        return (landDateOf(a.projectId) - landDateOf(b.projectId)) * dir;
      }
      // 有开盘时间的优先；无开盘时间的统一置底
      if (da === null) return 1;
      if (db === null) return -1;
      return (da - db) * dir;
    });
    else {
      arr.sort((a, b) => {
        const ta = TIER_ORDER.indexOf(TIER_CITY_MAP[cityOf(a.cityCompany)] || "other");
        const tb = TIER_ORDER.indexOf(TIER_CITY_MAP[cityOf(b.cityCompany)] || "other");
        if (ta !== tb) return ta - tb;
        return b.remainingValue - a.remainingValue;
      });
    }
    return arr;
  }, [keyword, cityCompanySet, biz, price, stage, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageList = useMemo(
    () => list.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [list, currentPage, pageSize],
  );

  useEffect(() => { setPage(1); }, [keyword, cityCompanySet, biz, price, stage, sortKey, sortDir, pageSize]);

  const activeFilterCount = [
    selectedCityCompanies.length > 0, biz !== "all", price !== "all", stage !== "all",
  ].filter(Boolean).length;

  const clearAll = () => {
    setSelectedCityCompanies([]);
    setBiz("all"); setPrice("all"); setStage("all");
  };

  const handleSortClick = (k: SortKey) => {
    if (k === "default") { setSortKey("default"); return; }
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "sellRate" ? "asc" : "desc"); }
  };



  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <HeaderNav activeKey="map" />

      {/* Hero 搜索区 —— 长条居中搜索框 */}
      <ModuleBadge moduleId="project-list-header" className="block">
        <div className="relative overflow-hidden border-b border-[#DDE5F0] bg-gradient-to-b from-[#E7EEF8] via-[#EEF3FA] to-[#F2F5FA]">
          <div
            className="absolute inset-0 pointer-events-none opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 20%, rgba(22,119,255,0.10) 0, transparent 45%), radial-gradient(circle at 82% 80%, rgba(103,232,249,0.12) 0, transparent 42%)",
            }}
          />
          <div className="relative px-6 py-5 flex flex-col items-center">
            <div className="relative w-full max-w-[720px] group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94A3B8] group-focus-within:text-[var(--color-brand)] pointer-events-none transition-colors" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索项目名称"
                className="h-11 w-full pl-12 pr-12 rounded-full border border-[#DCE4F0] bg-white text-[14px] text-foreground placeholder:text-[#94A3B8] shadow-[0_4px_16px_-8px_rgba(30,58,138,0.18)] hover:border-[#BFD3EE] focus:outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/12 transition-all"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-[#94A3B8] hover:text-foreground hover:bg-[#F1F5F9]"
                  aria-label="清除搜索"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <RecentProjects />
          </div>
        </div>
      </ModuleBadge>


      <div className="px-6 py-5">
        {/* Filter card */}
        <ModuleBadge moduleId="project-list-filter" className="block">
        <div className="bg-white rounded-xl border border-[var(--color-panel-border)] shadow-sm px-5 py-2">
          <div className="flex items-center gap-2 flex-wrap py-1.5 border-b border-[#F1F5F9]">
            <OrgMultiPicker
              value={selectedCityCompanies}
              onChange={setSelectedCityCompanies}
              allowedLeaves={allowedCityCompanies}
            />
            <CaliberPicker value={caliber} onChange={setCaliber} />
            <DayPicker value={dataDate} onChange={setDataDate} />
          </div>

              <FilterRow label="业态类型">
                <ChipGroup
                  options={BIZ_OPTS.map((k) => ({ k, label: k === "all" ? "全部" : k }))}
                  value={biz}
                  onChange={setBiz}
                />
              </FilterRow>
              <FilterRow label="项目阶段">
                <ChipGroup
                  options={(Object.keys(STAGE_LABEL) as StageKey[]).map((k) => ({ k, label: STAGE_LABEL[k] }))}
                  value={stage}
                  onChange={setStage}
                />
              </FilterRow>
            </div>
            </ModuleBadge>


        {/* Sort bar */}
        <ModuleBadge moduleId="project-list-sort" className="block">
        <div className="flex items-center justify-between mt-3 px-2">
          <div className="flex items-center gap-5 text-sm">
            <SortItem
              label="开盘时间"
              active={sortKey === "openDate"}
              dir={sortKey === "openDate" ? sortDir : undefined}
              onClick={() => handleSortClick("openDate")}
            />
            <SortItem
              label="剩余货值"
              active={sortKey === "remaining"}
              dir={sortKey === "remaining" ? sortDir : undefined}
              onClick={() => handleSortClick("remaining")}
            />
            <SortItem
              label="项目去化率"
              active={sortKey === "sellRate"}
              dir={sortKey === "sellRate" ? sortDir : undefined}
              onClick={() => handleSortClick("sellRate")}
            />

          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--color-brand)] transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                清空条件
              </button>
            )}
            <div className="inline-flex items-center rounded-md border border-[#E2E8F0] bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`inline-flex items-center gap-1 px-2.5 h-7 text-xs transition-colors ${viewMode === "card" ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="卡片视图"
              >
                <LayoutGrid className="w-3.5 h-3.5" />卡片
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1 px-2.5 h-7 text-xs transition-colors border-l border-[#E2E8F0] ${viewMode === "table" ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="表格视图"
              >
                <ListIcon className="w-3.5 h-3.5" />表格
              </button>
            </div>
          </div>
        </div>
        </ModuleBadge>

        <div className="text-sm text-muted-foreground mt-3 mb-2">
          为您找到 <span className="text-[var(--color-brand)] font-semibold">{list.length}</span> 个项目
        </div>





        {/* Cards / Table */}
        <ModuleBadge moduleId="project-list-cards" className="block">
        {viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pageList.map((p) => {
            const stageK = stageOf(p);
            const stageTxt = STAGE_LABEL[stageK];
            const stageColor = stageBadgeClass(stageK);
            const remainingUnits = Math.max(
              0,
              Math.round((p.remainingValue * 1e8) / Math.max(p.salesFloorPrice, 1) / 100),
            );
            const totalUnits = Math.max(
              remainingUnits,
              Math.round(remainingUnits / Math.max(1 - p.snakeSellThroughRate, 0.01)),
            );
            const sellPct = Math.min(100, p.snakeSellThroughRate * 100);
            return (
              <Link
                key={p.projectId}
                to={`/projects/${p.projectId}`}
                style={{ fontFamily: '"Source Han Sans SC","Source Han Sans CN","Noto Sans SC","PingFang SC",sans-serif' }}
                className="group bg-white rounded-lg border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[var(--color-brand)] hover:shadow-[0_8px_24px_-10px_rgba(22,119,255,0.28)] hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col gap-3.5"
              >
                <div className="flex gap-3 min-w-0 items-start">
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-[15px] font-semibold text-foreground truncate tracking-tight">
                        {splitProjectName(p).name}
                      </h2>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const name = splitProjectName(p).name;
                          navigator.clipboard?.writeText(name);
                          toast("复制成功", { duration: 1500 });
                        }}
                        title="复制项目名称"
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-[2px] rounded text-[11px] font-medium border ${stageColor}`}>
                        {stageTxt}
                      </span>
                      <span className="px-1.5 py-[2px] rounded text-[11px] font-medium text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0]">
                        {displayBizLabel(p)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="text-foreground/80 truncate">
                        {cityOf(p.cityCompany)} · {p.district} · {p.street}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground min-w-0">
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      <span className="text-foreground/80 truncate">
                        开盘时间：{displayOpenDate(p)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 w-[150px] rounded-lg px-3 py-2 bg-[#F8FBFF] border border-[#E5EDF9]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#475569] leading-none">项目去化率</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-0.5 tabular-nums leading-none">
                      <span className="text-[22px] font-bold text-[var(--color-brand)]">
                        {sellPct.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-[var(--color-brand)]/70 font-medium ml-0.5">%</span>
                    </div>
                    <div className="mt-2 w-full h-1.5 rounded-full bg-[#E5EDF9] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#1677FF] transition-all duration-500"
                        style={{ width: `${sellPct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[#F1F5F9]">
                  <div className="flex items-start justify-between gap-4 px-1">
                    <MetricCell label="剩余货值" value={p.remainingValue.toFixed(2)} unit="亿" />
                    <MetricCell label="销售均价" value={Math.round(p.salesFloorPrice).toLocaleString()} unit="元/㎡" align="center" />
                    <MetricCell label="总套数" value={totalUnits.toLocaleString()} unit="套" align="center" />
                    <MetricCell label="未售套数" value={remainingUnits.toLocaleString()} unit="套" accent align="right" />
                  </div>
                </div>
              </Link>
            );
          })}

          {list.length === 0 && (
            <div className="col-span-full bg-white rounded-lg border border-[#EEF2F7] p-16 text-center text-muted-foreground">
              当前筛选下暂无项目
            </div>
          )}
        </div>
        ) : (
        <div className="bg-white rounded-lg border border-[#EEF2F7] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] text-muted-foreground text-[12.5px]">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">项目名称</th>
                  <th className="text-left font-medium px-3 py-2.5">城市公司</th>
                  <th className="text-left font-medium px-3 py-2.5">开盘时间</th>
                  <th className="text-left font-medium px-3 py-2.5">业态</th>
                  <th className="text-left font-medium px-3 py-2.5">阶段</th>
                  <th className="text-right font-medium px-3 py-2.5">均价(元/㎡)</th>
                  <th className="text-right font-medium px-3 py-2.5">去化率</th>
                  <th className="text-right font-medium px-4 py-2.5">剩余货值(亿)</th>
                </tr>
              </thead>
              <tbody>
                {pageList.map((p) => {
                  const stageK = stageOf(p);
                  const { city, name } = splitProjectName(p);
                  return (
                    <tr key={p.projectId} className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link to={`/projects/${p.projectId}`} className="text-foreground hover:text-[var(--color-brand)] font-medium">
                          {name}
                        </Link>
                        <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
                          {city} · {p.district} · {p.street}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-foreground/80">{cityOf(p.cityCompany)}</td>
                      <td className="px-3 py-2.5 text-foreground/80 tabular-nums whitespace-nowrap">{displayOpenDate(p)}</td>
                      <td className="px-3 py-2.5 text-foreground/80">{displayBizLabel(p)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${stageBadgeClass(stageK)}`}>
                          {STAGE_LABEL[stageK]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-brand)] font-medium">
                        {Math.round(p.salesFloorPrice).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {(p.snakeSellThroughRate * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {p.remainingValue.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      当前筛选下暂无项目
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
        </ModuleBadge>


        {list.length > 0 && (
          <ModuleBadge moduleId="project-list-pagination" className="block">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={list.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          </ModuleBadge>
        )}

      </div>
    </div>

  );
}

const RECENT_PROJECTS: { displayName: string; match: string[] }[] = [
  { displayName: "上海徐汇东安2项目", match: ["东安", "徐汇"] },
  { displayName: "深圳会展湾雍境名邸", match: ["会展湾雍境"] },
  { displayName: "上海招商序", match: ["招商序"] },
];

function RecentProjects() {
  const recent = useMemo(() => {
    return RECENT_PROJECTS.map((item) => {
      const p =
        groupProjectAnalysisData.find((x) =>
          item.match.some((m) => x.projectName.includes(m)),
        ) ?? groupProjectAnalysisData.find((x) => x.projectName.includes(item.displayName.slice(0, 4)));
      if (!p) return null;
      return { id: p.projectId, name: item.displayName };
    }).filter((x): x is { id: string; name: string } => Boolean(x));
  }, []);




  return (
    <div className="w-full max-w-[720px] flex items-center gap-2 mt-3 ml-4">
      <span className="text-xs text-gray-400 whitespace-nowrap">最近浏览：</span>
      {recent.length === 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-gray-50 text-xs text-gray-400 border border-dashed border-gray-200">
          <History className="w-3 h-3 text-gray-300" />
          <span>暂无最近浏览记录，点击项目卡片查看后将自动记录</span>
        </span>
      ) : (
        recent.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors"
          >
            <History className="w-3 h-3 text-gray-400" />
            <span>{p.name}</span>
          </Link>
        ))
      )}
    </div>
  );
}



function MetricCell({ label, value, unit, accent, align = "left" }: { label: string; value: string; unit: string; accent?: boolean; align?: "left" | "center" | "right" }) {
  const alignCls = align === "center" ? "text-center justify-center" : align === "right" ? "text-right justify-end" : "text-left justify-start";
  const [textCls, flexCls] = alignCls.split(" ");
  return (
    <div className={`min-w-0 ${textCls}`}>
      <div className="text-[11px] text-[#6B7280] leading-none truncate">{label}</div>
      <div className={`mt-1.5 flex items-baseline gap-1 min-w-0 ${flexCls}`}>
        <span
          className={`text-[15px] font-semibold tabular-nums leading-none truncate ${
            accent ? "text-[#F59E0B]" : "text-foreground"
          }`}
        >
          {value}
        </span>
        <span className="text-xs text-[#6B7280] font-normal shrink-0">{unit}</span>
      </div>
    </div>
  );
}

function FilterRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5 border-b border-[#F1F5F9] last:border-b-0">
      <span className="text-[13px] text-muted-foreground w-16 shrink-0 pt-1">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
      {hint && <div className="shrink-0 pt-1.5">{hint}</div>}
    </div>
  );
}

function ChipGroup<T extends string>({
  options, value, onChange,
}: { options: { k: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {options.map((o) => {
        const active = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              active
                ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium border border-[var(--color-brand)]/40"
                : "text-foreground/80 hover:bg-[#F8FAFC] border border-transparent"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MultiChipGroup({
  options, values, onToggle, disabled,
}: {
  options: { k: string; label: string }[];
  values: string[];
  onToggle: (k: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {options.map((o) => {
        const active = values.includes(o.k);
        const isDisabled = disabled && o.k !== values[0];
        return (
          <button
            key={o.k}
            type="button"
            disabled={isDisabled}
            onClick={() => onToggle(o.k)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-colors ${
              active
                ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium border border-[var(--color-brand)]/40"
                : "text-foreground/80 hover:bg-[#F8FAFC] border border-transparent"
            } ${isDisabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}`}
          >
            {o.k !== "__all__" && (
              <span
                className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm border transition-colors ${
                  active
                    ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                    : "border-[#CBD5E1] bg-white"
                }`}
              >
                {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
              </span>
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SortItem({
  label, active, onClick, dir, title,
}: { label: string; active: boolean; onClick: () => void; dir?: SortDir; title?: string }) {
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 transition-colors ${
        active ? "text-[var(--color-brand)] font-medium" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {dir !== undefined && <Icon className="w-3.5 h-3.5" />}
      {dir === undefined && label !== "默认排序" && <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
    </button>
  );
}


function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

function Pagination({
  page, pageSize, total, totalPages, onPageChange, onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const nums = getPageNumbers(page, totalPages);
  const btn = "min-w-8 h-8 px-2 rounded-md border border-[#E2E8F0] bg-white text-sm text-foreground/80 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#E2E8F0] disabled:hover:text-foreground/80";
  return (
    <div className="flex items-center justify-between mt-6 mb-2 text-sm">
      <div className="text-muted-foreground tabular-nums">
        第 {start}-{end} 条 / 共 <span className="text-foreground font-medium">{total}</span> 条
      </div>
      <div className="flex items-center gap-2">
        <button className={btn} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="上一页">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {nums.map((n, i) =>
          n === "..." ? (
            <span key={`e${i}`} className="px-1 text-muted-foreground">···</span>
          ) : (
            <button
              key={n}
              onClick={() => onPageChange(n)}
              className={`min-w-8 h-8 px-2 rounded-md text-sm inline-flex items-center justify-center tabular-nums transition-colors ${
                n === page
                  ? "bg-[var(--color-brand)] text-white font-medium border border-[var(--color-brand)]"
                  : "border border-[#E2E8F0] bg-white text-foreground/80 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
              }`}
            >
              {n}
            </button>
          ),
        )}
        <button className={btn} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="下一页">
          <ChevronRight className="w-4 h-4" />
        </button>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 px-2 rounded-md border border-[#E2E8F0] bg-white text-sm text-foreground focus:outline-none focus:border-[var(--color-brand)]"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>{n} 条/页</option>
          ))}
        </select>
      </div>
    </div>
  );
}
