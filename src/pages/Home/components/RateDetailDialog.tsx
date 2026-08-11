import { ExportButton } from "@/components/ui/export-button";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  X, Download, Search, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ChevronRight as ChevR, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { HierarchyTag, type HierarchyType } from "@/components/HierarchyTag";

const LEVEL_TYPES: HierarchyType[] = ["cityGroup", "cityCompany", "businessType", "project"];

export type RateMode = "取证" | "达售";
export type RatePeriod = "月度" | "年度";

type Dim = "城市群组" | "城市公司" | "业态" | "项目";
const DIMS: Dim[] = ["城市群组", "城市公司", "业态", "项目"];
const DIM_LEVEL: Record<Dim, number> = { 城市群组: 0, 城市公司: 1, 业态: 2, 项目: 3 };
const BIZ_TYPES = ["住宅", "商业", "公寓", "写字楼", "车位", "配套及其他"] as const;
type BizType = (typeof BIZ_TYPES)[number];

import { formatNumber, formatPercent } from "@/lib/format";
const fmt2 = (n: number | null | undefined) => formatNumber(n, { thousand: false });
const pct = (n: number | null | undefined) => formatPercent(n);

// ---- Row type ----
type Metrics = {
  startStock: number;       // 年初库存
  newAdd: number;           // 本年新增
  soldNew: number;          // 本年已售-本年新供
  soldOld: number;          // 本年已售-年初库存
  remainNew: number;        // 剩余在售-本年新供
  remainOld: number;        // 剩余在售-年初库存
  rateYearTarget: number;   // 去化率-年度达售
  rateCurTarget: number;    // 去化率-当年达售
  rateOldStock: number;     // 去化率-年初库存
};

type Row = Metrics & {
  id: string;
  name: string;
  level: number; // 0..3
  bizType?: BizType;
  openDate?: string; // 开盘时间，仅项目级填充
  children?: Row[];
};

// 项目开盘时间映射（mock）
const PROJECT_OPEN_DATES: Record<string, string> = {
  "深湾玺园": "2026-03-16",
  "招商蛇口·璟悦": "2026-01-18",
  "海上世界公寓": "2024-09-22",
  "金山谷": "2023-05-10",
  "广州天玺": "2026-04-08",
  "佛山公园大道": "2025-11-09",
  "虹桥公馆": "2022-07-15",
  "前滩玺悦": "2026-02-26",
  "上海招商局大厦": "2021-10-12",
  "杭州雍景湾": "2025-06-30",
  "南京雍景府": "2026-03-25",
  "北京雍璟府": "2024-04-18",
  "北京臻悦公寓": "2026-05-12",
  "天津雍宁府": "2025-08-20",
  "武汉招商江湾国际": "2023-12-05",
  "武汉招商花园城": "2026-01-09",
  "长沙雍景华府": "2025-03-14",
  "成都招商大魔方": "2026-04-21",
  "重庆江湾城": "2024-11-28",
  "深圳湾车位资产": "2025-12-01",
  "广州配套中心": "2024-06-18",
  "上海前滩车位": "2026-01-20",
  "成都配套商业": "2025-09-06",
};

// ---- Mock data builders ----
const CLUSTERS: { name: string; companies: { name: string; types: { name: BizType; projects: { name: string; phases: string[] }[] }[] }[] }[] = [
  {
    name: "南部城市群组",
    companies: [
      { name: "深圳公司", types: [
        { name: "住宅", projects: [
          { name: "深湾玺园", phases: ["一期", "二期"] },
          { name: "招商蛇口·璟悦", phases: ["一期"] },
        ]},
        { name: "公寓", projects: [{ name: "海上世界公寓", phases: ["A区", "B区"] }] },
        { name: "车位", projects: [{ name: "深圳湾车位资产", phases: ["地库"] }] },
      ]},
      { name: "广州公司", types: [
        { name: "住宅", projects: [{ name: "金山谷", phases: ["一期", "二期", "三期"] }] },
        { name: "商业", projects: [{ name: "广州天玺", phases: ["商业组团"] }] },
        { name: "配套及其他", projects: [{ name: "广州配套中心", phases: ["配套"] }] },
      ]},
      { name: "佛山公司", types: [
        { name: "住宅", projects: [{ name: "佛山公园大道", phases: ["一期"] }] },
      ]},
    ],
  },
  {
    name: "东部城市群组",
    companies: [
      { name: "上海公司", types: [
        { name: "住宅", projects: [
          { name: "虹桥公馆", phases: ["一期", "二期"] },
          { name: "前滩玺悦", phases: ["一期"] },
        ]},
        { name: "写字楼", projects: [{ name: "上海招商局大厦", phases: ["主楼"] }] },
        { name: "车位", projects: [{ name: "上海前滩车位", phases: ["地库"] }] },
      ]},
      { name: "杭州公司", types: [
        { name: "住宅", projects: [{ name: "杭州雍景湾", phases: ["一期", "二期"] }] },
      ]},
      { name: "南京公司", types: [
        { name: "住宅", projects: [{ name: "南京雍景府", phases: ["一期"] }] },
      ]},
    ],
  },
  {
    name: "北部城市群组",
    companies: [
      { name: "北京公司", types: [
        { name: "住宅", projects: [{ name: "北京雍璟府", phases: ["一期", "二期"] }] },
        { name: "公寓", projects: [{ name: "北京臻悦公寓", phases: ["一期"] }] },
      ]},
      { name: "天津公司", types: [
        { name: "住宅", projects: [{ name: "天津雍宁府", phases: ["一期"] }] },
      ]},
    ],
  },
  {
    name: "中部城市群组",
    companies: [
      { name: "武汉公司", types: [
        { name: "住宅", projects: [{ name: "武汉招商江湾国际", phases: ["一期", "二期"] }] },
        { name: "商业", projects: [{ name: "武汉招商花园城", phases: ["商业组团"] }] },
      ]},
      { name: "长沙公司", types: [
        { name: "住宅", projects: [{ name: "长沙雍景华府", phases: ["一期"] }] },
      ]},
    ],
  },
  {
    name: "西部城市群组",
    companies: [
      { name: "成都公司", types: [
        { name: "住宅", projects: [{ name: "成都招商大魔方", phases: ["一期", "二期"] }] },
        { name: "配套及其他", projects: [{ name: "成都配套商业", phases: ["配套"] }] },
      ]},
      { name: "重庆公司", types: [
        { name: "住宅", projects: [{ name: "重庆江湾城", phases: ["一期"] }] },
      ]},
    ],
  },
];

// pseudo-random based on string
function seedNum(s: string, base: number, span: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return +(base + (h % 1000) / 1000 * span).toFixed(2);
}

function leafMetrics(key: string): Metrics {
  const startStock = seedNum(key + "ss", 1.5, 8);
  const newAdd = seedNum(key + "na", 1, 6);
  const soldOld = +Math.min(startStock, seedNum(key + "so", 0.5, 4)).toFixed(2);
  const soldNew = +Math.min(newAdd, seedNum(key + "sn", 0.3, 3)).toFixed(2);
  const remainOld = +(startStock - soldOld).toFixed(2);
  const remainNew = +(newAdd - soldNew).toFixed(2);
  const totalSold = soldOld + soldNew;
  const totalAvail = startStock + newAdd;
  const rateYearTarget = +Math.min(99.99, (totalSold / Math.max(0.01, totalAvail)) * 100 + seedNum(key+"r1", -3, 6)).toFixed(2);
  const rateCurTarget = +Math.min(99.99, (soldNew / Math.max(0.01, newAdd)) * 100).toFixed(2);
  const rateOldStock = +Math.min(99.99, (soldOld / Math.max(0.01, startStock)) * 100).toFixed(2);
  return { startStock, newAdd, soldNew, soldOld, remainNew, remainOld, rateYearTarget, rateCurTarget, rateOldStock };
}

function aggregate(children: Metrics[]): Metrics {
  const sum = (k: keyof Metrics) => +children.reduce((a, c) => a + c[k], 0).toFixed(2);
  const startStock = sum("startStock");
  const newAdd = sum("newAdd");
  const soldNew = sum("soldNew");
  const soldOld = sum("soldOld");
  const remainNew = sum("remainNew");
  const remainOld = sum("remainOld");
  const totalSold = soldNew + soldOld;
  const totalAvail = startStock + newAdd;
  const rateYearTarget = +((totalSold / Math.max(0.01, totalAvail)) * 100).toFixed(2);
  const rateCurTarget = +((soldNew / Math.max(0.01, newAdd)) * 100).toFixed(2);
  const rateOldStock = +((soldOld / Math.max(0.01, startStock)) * 100).toFixed(2);
  return { startStock, newAdd, soldNew, soldOld, remainNew, remainOld, rateYearTarget, rateCurTarget, rateOldStock };
}

function buildProjectTree(): Row[] {
  return CLUSTERS.flatMap((c) => {
    const companies: Row[] = c.companies.flatMap((co) => {
      const projects: Row[] = co.types.flatMap((t) =>
        t.projects.map((p) => {
          const k = `${c.name}/${co.name}/${t.name}/${p.name}`;
          return {
            id: k,
            name: p.name,
            level: 3,
            bizType: t.name,
            openDate: PROJECT_OPEN_DATES[p.name] ?? "",
            ...leafMetrics(k),
          };
        }),
      );
      if (!projects.length) return [];
      return [{ id: `${c.name}/${co.name}`, name: co.name, level: 1, children: projects, ...aggregate(projects) }];
    });
    if (!companies.length) return [];
    return [{ id: c.name, name: c.name, level: 0, children: companies, ...aggregate(companies) }];
  });
}

function buildBizRows(tree: Row[]): Row[] {
  return BIZ_TYPES.flatMap((biz) => {
    const projects: Row[] = [];
    const walk = (rows: Row[]) => {
      for (const r of rows) {
        if (r.level === 3 && r.bizType === biz) projects.push(r);
        if (r.children?.length) walk(r.children);
      }
    };
    walk(tree);
    if (!projects.length) return [];
    return [{ id: `业态/${biz}`, name: biz, level: 2, bizType: biz, ...aggregate(projects) }];
  });
}

// 收集所有 level 严格小于 targetLevel 的节点 id —— 用于"全局一键展开"
function collectIdsUpToLevel(rows: Row[], targetLevel: number, acc: string[] = []): string[] {
  for (const r of rows) {
    if (r.level < targetLevel && r.children?.length) {
      acc.push(r.id);
      collectIdsUpToLevel(r.children, targetLevel, acc);
    }
  }
  return acc;
}

// 关键字过滤：保留任何 name 命中或其后代命中的分支
function filterTree(rows: Row[], k: string): Row[] {
  if (!k) return rows;
  const out: Row[] = [];
  for (const r of rows) {
    const selfHit = r.name.includes(k) || (r.openDate ?? "").includes(k);
    const kids = r.children ? filterTree(r.children, k) : [];
    if (selfHit || kids.length) {
      out.push({ ...r, children: r.children ? (selfHit ? r.children : kids) : undefined });
    }
  }
  return out;
}

// ---- Sortable numeric columns ----
type SortKey = keyof Metrics | "openDate" | null;

const NUM_COLS: { key: keyof Metrics; label: string; group?: string }[] = [
  { key: "startStock", label: "年初库存" },
  { key: "newAdd", label: "本年新增" },
  { key: "soldNew", label: "本年新供", group: "本年已售" },
  { key: "soldOld", label: "年初库存", group: "本年已售" },
  { key: "remainNew", label: "本年新供", group: "剩余在售" },
  { key: "remainOld", label: "年初库存", group: "剩余在售" },
  { key: "rateYearTarget", label: "年度达售", group: "去化率" },
  { key: "rateCurTarget", label: "当年达售", group: "去化率" },
  { key: "rateOldStock", label: "年初库存", group: "去化率" },
];

export function RateDetailDialog({
  open,
  onOpenChange,
  initialMode: _m,
  initialPeriod: _initialPeriod,
  unit = "亿",
  org = "",
  caliberLabel = "",
  date = "",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialMode?: RateMode;
  initialPeriod?: RatePeriod;
  unit?: string;
  org?: string;
  caliberLabel?: string;
  date?: string;
}) {
  const [dim, setDim] = useState<Dim>("城市群组");
  const [mode, setMode] = useState<RateMode>("取证");
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("rateOldStock");
  const [sortColumn, setSortColumn] = useState("yearRateOldStock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { if (open && _m) setMode(_m); }, [open, _m]);

  // 达售口径整体略低于取证口径（mock 差异）
  const RATE_KEYS: (keyof Metrics)[] = ["rateYearTarget", "rateCurTarget", "rateOldStock"];
  const adjustRate = (v: number) => mode === "达售" ? +Math.max(0, v * 0.88).toFixed(2) : v;
  const adjustRow = <T extends Metrics>(r: T): T => {
    if (mode === "取证") return r;
    const out: any = { ...r };
    for (const k of RATE_KEYS) out[k] = adjustRate(r[k] as number);
    return out;
  };

  const u = `(${unit})`;
  const L = {
    startStock: `年初库存${u}`,
    newAdd: `本年新增${u}`,
    monthSold: `本月已售${u}`,
    monthRemain: `本月剩余在售${u}`,
    monthRate: "本月去化率",
    yearSold: `本年已售${u}`,
    yearRemain: `本年剩余在售${u}`,
    yearRate: "本年去化率",
  };

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // dim 切换 = 重设全局展开深度（保留用户后续单行手动操作）
  useEffect(() => {
    const ids = collectIdsUpToLevel(buildProjectTree(), DIM_LEVEL[dim]);
    setExpanded(new Set(ids));
    setPage(1);
    setSortKey("rateOldStock");
    setSortColumn("yearRateOldStock");
    setSortDir("desc");
  }, [dim]);
  useEffect(() => { setPage(1); }, [keyword, pageSize, sortKey, sortDir]);

  const topRows = useMemo(() => {
    const fullTree = buildProjectTree();
    let tree: Row[];
    if (dim === "业态") {
      tree = buildBizRows(fullTree);
    } else if (dim === "城市公司") {
      tree = fullTree.flatMap((cluster) =>
        (cluster.children ?? []).map((company) => ({
          ...company,
          children: (company.children ?? []).map((project) => ({
            ...project,
            cityGroup: cluster.name,
            cityCompany: company.name,
          } as Row & { cityGroup: string; cityCompany: string })),
        })),
      );
    } else if (dim === "项目") {
      const projects: Row[] = [];
      fullTree.forEach((cluster) => {
        cluster.children?.forEach((company) => {
          company.children?.forEach((project) => {
            projects.push({
              ...project,
              children: undefined,
              level: 3,
              cityGroup: cluster.name,
              cityCompany: company.name,
            } as Row & { cityGroup: string; cityCompany: string });
          });
        });
      });
      tree = projects;
    } else {
      tree = fullTree;
    }
    if (mode === "取证") return tree;
    const mapRow = (r: Row): Row => ({ ...adjustRow(r), children: r.children?.map(mapRow) });
    return tree.map(mapRow);
  }, [mode, dim]);

  const filtered = useMemo(() => filterTree(topRows, keyword.trim()), [topRows, keyword]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    if (sortKey === "openDate") {
      // 仅在"上一层级内"对子项排序：项目级兄弟节点按开盘时间排序，
      // 其他层级保持原有顺序，递归下钻。
      const cmpDate = (a: Row, b: Row) => {
        const av = a.openDate ?? "";
        const bv = b.openDate ?? "";
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      };
      const sortRec = (rows: Row[]): Row[] => {
        const mapped = rows.map((r) =>
          r.children ? { ...r, children: sortRec(r.children) } : r,
        );
        // 仅当本层兄弟节点为项目级时才重新排序
        const allProjects = mapped.length > 0 && mapped.every((r) => r.level === 3);
        return allProjects ? [...mapped].sort(cmpDate) : mapped;
      };
      return sortRec(filtered);
    }
    const cmp = (a: Row, b: Row) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      const aEmpty = av == null || Number.isNaN(av);
      const bEmpty = bv == null || Number.isNaN(bv);
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    };
    const sortRec = (rows: Row[]): Row[] =>
      [...rows]
        .map((r) => (r.children ? { ...r, children: sortRec(r.children) } : r))
        .sort(cmp);
    return sortRec(filtered);
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const curPage = Math.min(page, pageCount);
  const pageStart = (curPage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);




  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSort = (k: NonNullable<SortKey>, columnId = String(k)) => {
    if (sortKey === k && sortColumn === columnId) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortColumn(columnId);
      setSortDir("desc");
    }
  };

  const onExport = () => {
    const targetLevel = DIM_LEVEL[dim];

    // 收集到 targetLevel 的所有节点，并带上祖先路径
    const rows: { path: string[]; row: Row }[] = [];
    const walk = (list: Row[], path: string[]) => {
      for (const r of list) {
        const np = [...path, r.name];
        if (r.level === targetLevel) {
          rows.push({ path: np, row: r });
        } else if (r.children?.length) {
          walk(r.children, np);
        }
      }
    };
    walk(topRows, []);

    // 关键字过滤（按路径或名称匹配）
    const k = keyword.trim();
    const filteredRows = k
      ? rows.filter((x) => x.path.some((p) => p.includes(k)) || (x.row.openDate ?? "").includes(k))
      : rows;

    const header = [
      "序号",
      ...(dim === "项目" ? ["城市群组", "城市公司", "项目", "开盘时间"] : [dim]),
      L.startStock,
      L.newAdd,
      L.monthSold,
      L.monthRemain,
      `${L.monthRate}(%)`,
      L.yearSold,
      L.yearRemain,
      `${L.yearRate}(%)`,
    ];

    const aoa: (string | number)[][] = [header];
    filteredRows.forEach((x, i) => {
      const r = x.row;
      const extra = r as Row & { cityGroup?: string; cityCompany?: string };
      aoa.push([
        i + 1,
        ...(dim === "项目" ? [extra.cityGroup ?? "", extra.cityCompany ?? "", r.name, r.openDate ?? ""] : [r.name]),
        r.startStock,
        r.newAdd,
        r.soldNew,
        r.remainNew,
        r.rateCurTarget,
        +(r.soldOld + r.soldNew).toFixed(2),
        +(r.remainOld + r.remainNew).toFixed(2),
        r.rateYearTarget,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "去化率明细");

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = (date || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`).replace(/-/g, "");
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const parts = ["去化率明细表", org, caliberLabel, `${dateStr}${timeStr}`, dim].filter(Boolean);
    const fileName = `${parts.join("_")}.xlsx`;

    XLSX.writeFile(wb, fileName);
    toast.success(`已导出 ${fileName}`, { description: `${dim}维度 · 共 ${filteredRows.length} 条` });
  };

  // 搜索命中时：自动展开所有命中节点的祖先链路，呈现完整的树
  const effectiveExpanded = useMemo(() => {
    if (!keyword.trim()) return expanded;
    const next = new Set(expanded);
    const walk = (rows: Row[]) => {
      for (const r of rows) {
        if (r.children?.length) {
          next.add(r.id);
          walk(r.children);
        }
      }
    };
    walk(pageRows);
    return next;
  }, [expanded, keyword, pageRows]);

  // visible (flatten with expansion) for current page rows
  const visibleRows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const walk = (rows: Row[]) => {
      for (const r of rows) {
        out.push(r);
        if (r.children && r.children.length && effectiveExpanded.has(r.id)) walk(r.children);
      }
    };
    walk(pageRows);
    return out;
  }, [pageRows, effectiveExpanded]);


  if (!open) return null;

  // Sticky column widths
  const W_IDX = 56;
  const W_NAME = 190;
  const NAME_LEFT = W_IDX;

  const isSortColumn = (columnId: string) => sortColumn === columnId;
  const sortIcon = (k: SortKey, columnId = String(k)) => {
    if (sortKey !== k || !isSortColumn(columnId)) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-[#1677FF]" />
      : <ArrowDown className="w-3 h-3 text-[#1677FF]" />;
  };

  const numCell = (v: number, isPct = false, active = false) => (
    <td className={`px-2 py-2.5 text-right tabular-nums border-b border-[#F1F5F9] whitespace-nowrap ${active ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>
      {isPct ? pct(v) : fmt2(v)}
    </td>
  );

  const monthSold = (r: Row) => r.soldNew;
  const monthRemain = (r: Row) => r.remainNew;
  const monthRate = (r: Row) => r.rateCurTarget;
  const yearSold = (r: Row) => +(r.soldOld + r.soldNew).toFixed(2);
  const yearRemain = (r: Row) => +(r.remainOld + r.remainNew).toFixed(2);
  const projectExtra = (r: Row) => r as Row & { cityGroup?: string; cityCompany?: string };
  const groupTh = "sticky top-0 z-20 bg-[#F1F5F9] border-b border-l border-[#E2E8F0] px-2 py-2 text-center font-medium text-[#475569] whitespace-nowrap";
  const subTh = "sticky top-[33px] z-20 bg-[#F8FAFC] border-b border-l border-[#E2E8F0] px-2 py-1.5 text-center font-medium text-[#475569] whitespace-nowrap";
  const leafTh = "sticky top-[64px] z-20 bg-white border-b border-l border-[#EEF2F7] px-2 py-1.5 text-right font-normal text-[#64748B] whitespace-nowrap";
  const subSortable = (key: NonNullable<SortKey>, label: ReactNode, columnId = String(key)) => (
    <th
      rowSpan={2}
      onClick={() => onSort(key, columnId)}
      className={`${subTh} cursor-pointer select-none ${isSortColumn(columnId) ? "text-[var(--color-brand)] font-medium" : ""}`}
      style={{ minWidth: 82 }}
    >
      <span className="inline-flex items-center justify-center gap-1">
        {label}
        {sortIcon(key, columnId)}
      </span>
    </th>
  );
  const leafSortable = (key: NonNullable<SortKey>, label: ReactNode, bordered = true, columnId = String(key)) => (
    <th
      onClick={() => onSort(key, columnId)}
      className={`${leafTh} cursor-pointer select-none ${isSortColumn(columnId) ? "text-[var(--color-brand)] font-medium" : ""} ${bordered ? "" : "border-l-0"}`}
      style={{ minWidth: 82 }}
    >
      <span className="inline-flex items-center justify-end gap-1">
        {label}
        {sortIcon(key, columnId)}
      </span>
    </th>
  );
  const metricCells = (r: Row) => (
    <>
      {numCell(r.startStock, false, isSortColumn("monthStartStock"))}
      {numCell(r.newAdd, false, isSortColumn("monthNewAdd"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-l border-[#F1F5F9] whitespace-nowrap ${isSortColumn("monthSoldOld") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{fmt2(r.soldOld)}</td>
      {numCell(r.soldNew, false, isSortColumn("monthSoldNew"))}
      {numCell(monthSold(r), false, isSortColumn("monthSoldTotal"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-l border-[#F1F5F9] whitespace-nowrap ${isSortColumn("monthRemainOld") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{fmt2(r.remainOld)}</td>
      {numCell(r.remainNew, false, isSortColumn("monthRemainNew"))}
      {numCell(monthRemain(r), false, isSortColumn("monthRemainTotal"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-l border-[#F1F5F9] whitespace-nowrap ${isSortColumn("monthRateOldStock") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{pct(r.rateOldStock)}</td>
      {numCell(r.rateCurTarget, true, isSortColumn("monthRateCur"))}
      {numCell(monthRate(r), true, isSortColumn("monthRateTotal"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-l border-[#F1F5F9] whitespace-nowrap ${isSortColumn("yearStartStock") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{fmt2(r.startStock)}</td>
      {numCell(r.newAdd, false, isSortColumn("yearNewAdd"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-l border-[#F1F5F9] whitespace-nowrap ${isSortColumn("yearSoldOld") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{fmt2(r.soldOld)}</td>
      {numCell(r.soldNew, false, isSortColumn("yearSoldNew"))}
      {numCell(yearSold(r), false, isSortColumn("yearSoldTotal"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-l border-[#F1F5F9] whitespace-nowrap ${isSortColumn("yearRemainOld") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{fmt2(r.remainOld)}</td>
      {numCell(r.remainNew, false, isSortColumn("yearRemainNew"))}
      {numCell(yearRemain(r), false, isSortColumn("yearRemainTotal"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-l border-[#F1F5F9] whitespace-nowrap ${isSortColumn("yearRateOldStock") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{pct(r.rateOldStock)}</td>
      {numCell(r.rateCurTarget, true, isSortColumn("yearRateCur"))}
      <td className={`px-2 py-2.5 text-right tabular-nums border-b border-[#F1F5F9] whitespace-nowrap ${isSortColumn("yearRateTotal") ? "text-[var(--color-brand)] font-medium" : "text-[#475569]"}`}>{pct(r.rateYearTarget)}</td>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => onOpenChange(false)} />
      <div
        className="relative bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col"
        style={{ width: "90vw", height: "88vh", maxWidth: 1600 }}
      >
        {/* Title bar */}
        <div className="h-[60px] px-6 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="block w-1 h-5 rounded bg-[#1677FF]" />
            <span className="text-[20px] font-semibold text-slate-800">去化率明细表</span>
          </div>
          <button
            className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
            onClick={() => onOpenChange(false)}
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 h-[56px] flex items-center justify-between border-b border-slate-100 gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex p-0.5 rounded-md bg-slate-100 shrink-0">
              {DIMS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDim(d)}
                  className={`px-3 h-8 rounded text-[13px] transition ${
                    dim === d
                      ? "bg-white text-[#1677FF] shadow-sm font-medium"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-md bg-slate-100">
              {(["取证", "达售"] as RateMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 h-8 rounded text-[13px] transition ${
                    mode === m
                      ? "bg-white text-[#1677FF] shadow-sm font-medium"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="请输入关键字搜索"
                className="h-8 w-[220px] pl-7 pr-3 rounded-md border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <ExportButton onClick={onExport} />
          </div>
        </div>

        {/* Table area */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="min-w-full text-[12.5px] border-separate border-spacing-0">
            <thead className="t-table-header">
              <tr className="bg-[#F1F5F9]">
                <th
                  rowSpan={3}
                  className="sticky left-0 top-0 z-30 bg-[#F1F5F9] border-b border-[#E2E8F0] px-3 py-2 text-center font-medium align-middle"
                  style={{ width: W_IDX, minWidth: W_IDX }}
                >序号</th>
                {dim === "项目" ? (
                  <>
                    <th
                      rowSpan={3}
                      className="sticky top-0 z-20 bg-[#F1F5F9] border-b border-[#E2E8F0] px-3 py-2 text-left font-medium align-middle whitespace-nowrap"
                      style={{ minWidth: 110 }}
                    >城市群组</th>
                    <th
                      rowSpan={3}
                      className="sticky top-0 z-20 bg-[#F1F5F9] border-b border-[#E2E8F0] px-3 py-2 text-left font-medium align-middle whitespace-nowrap"
                      style={{ minWidth: 110 }}
                    >城市公司</th>
                    <th
                      rowSpan={3}
                      className="sticky top-0 z-20 bg-[#F1F5F9] border-b border-[#E2E8F0] px-3 py-2 text-left font-medium align-middle whitespace-nowrap"
                      style={{ minWidth: 160 }}
                    >项目</th>
                    <ThSortable
                      rowSpan={3}
                      onClick={() => onSort("openDate")}
                      sortIcon={sortIcon("openDate")}
                      align="left"
                    >开盘时间</ThSortable>
                  </>
                ) : (
                  <th
                    rowSpan={3}
                    className="sticky top-0 z-30 bg-[#F1F5F9] border-b border-r border-[#E2E8F0] px-3 py-2 text-left font-medium align-middle"
                    style={{ width: W_NAME, minWidth: W_NAME, left: NAME_LEFT, position: "sticky" }}
                  >{dim}</th>
                )}
                <th className={groupTh} colSpan={11}>月度</th>
                <th className={groupTh} colSpan={11}>年度</th>
              </tr>
              <tr>
                {subSortable("startStock", `月初库存${u}`, "monthStartStock")}
                {subSortable("newAdd", `本月新增${u}`, "monthNewAdd")}
                <th className={subTh} colSpan={3}>本月已售</th>
                <th className={subTh} colSpan={3}>剩余在售</th>
                <th className={subTh} colSpan={3}>去化率</th>
                {subSortable("startStock", `年初库存${u}`, "yearStartStock")}
                {subSortable("newAdd", `本年新增${u}`, "yearNewAdd")}
                <th className={subTh} colSpan={3}>本年已售</th>
                <th className={subTh} colSpan={3}>剩余在售</th>
                <th className={subTh} colSpan={3}>去化率</th>
              </tr>
              <tr>
                {leafSortable("soldOld", `月初库存${u}`, true, "monthSoldOld")}
                {leafSortable("soldNew", `本月新供${u}`, true, "monthSoldNew")}
                {leafSortable("soldNew", `小计${u}`, true, "monthSoldTotal")}
                {leafSortable("remainOld", `月初库存${u}`, true, "monthRemainOld")}
                {leafSortable("remainNew", `本月新供${u}`, true, "monthRemainNew")}
                {leafSortable("remainNew", `小计${u}`, true, "monthRemainTotal")}
                {leafSortable("rateOldStock", "月度取证", true, "monthRateOldStock")}
                {leafSortable("rateCurTarget", "本月取证", true, "monthRateCur")}
                {leafSortable("rateCurTarget", "月初库存", true, "monthRateTotal")}
                {leafSortable("soldOld", `年初库存${u}`, true, "yearSoldOld")}
                {leafSortable("soldNew", `本年新供${u}`, true, "yearSoldNew")}
                {leafSortable("soldNew", `小计${u}`, true, "yearSoldTotal")}
                {leafSortable("remainOld", `年初库存${u}`, true, "yearRemainOld")}
                {leafSortable("remainNew", `本年新供${u}`, true, "yearRemainNew")}
                {leafSortable("remainNew", `小计${u}`, true, "yearRemainTotal")}
                {leafSortable("rateOldStock", "年度取证", true, "yearRateOldStock")}
                {leafSortable("rateCurTarget", "当年取证", true, "yearRateCur")}
                {leafSortable("rateYearTarget", "年初库存", true, "yearRateTotal")}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r, idx) => {

                const targetLevel = DIM_LEVEL[dim];
                const isTop = r.level === targetLevel;
                const indent = dim === "业态" ? 0 : r.level * 20;
                const hasChildren = !!(r.children && r.children.length);
                const isExpanded = effectiveExpanded.has(r.id);
                // 序号仅在当前维度行渲染
                const indexLabel = isTop
                  ? String(pageStart + visibleRows.slice(0, idx + 1).filter((row) => row.level === targetLevel).length).padStart(2, "0")
                  : "";
                return (
                  <tr
                    key={r.id + "-" + idx}
                    className={`group ${isTop ? "bg-white" : "bg-[#FAFBFC]"} hover:bg-[#F5F9FF]`}
                  >
                    <td
                      className="sticky left-0 z-10 bg-inherit group-hover:bg-[#F5F9FF] border-b border-[#F1F5F9] px-3 py-2.5 text-center text-[#64748B] tabular-nums"
                      style={{ width: W_IDX, minWidth: W_IDX }}
                    >{indexLabel}</td>
                    {dim === "项目" ? (
                      <>
                        <td className="px-3 py-2.5 text-left text-[#475569] border-b border-[#F1F5F9] whitespace-nowrap">{projectExtra(r).cityGroup ?? "--"}</td>
                        <td className="px-3 py-2.5 text-left text-[#475569] border-b border-[#F1F5F9] whitespace-nowrap">{projectExtra(r).cityCompany ?? "--"}</td>
                        <td className="px-3 py-2.5 text-left text-[#1E293B] border-b border-[#F1F5F9] whitespace-nowrap font-medium">{r.name}</td>
                        <td className="px-3 py-2.5 text-left text-[#475569] border-b border-[#F1F5F9] whitespace-nowrap tabular-nums" style={{ minWidth: 120 }}>
                          {r.openDate || "--"}
                        </td>
                      </>
                    ) : (
                      <td
                        className="sticky z-10 bg-inherit group-hover:bg-[#F5F9FF] border-b border-r border-[#F1F5F9] px-3 py-2.5 text-[#1E293B]"
                        style={{ width: W_NAME, minWidth: W_NAME, left: NAME_LEFT }}
                      >
                        <div className="flex items-center" style={{ paddingLeft: indent }}>
                          {hasChildren ? (
                            <button
                              onClick={() => toggleExpand(r.id)}
                              className="icon-sm mr-2 inline-flex items-center justify-center text-token-tertiary hover:text-[var(--color-brand)] cursor-pointer"
                              aria-label={isExpanded ? "收起" : "展开"}
                            >
                              {isExpanded ? <ChevronDown className="icon-sm" /> : <ChevronRight className="icon-sm" />}
                            </button>
                          ) : (
                            <span className="icon-sm mr-2 inline-block" />
                          )}
                          <HierarchyTag type={LEVEL_TYPES[r.level] ?? "cityGroup"} />
                          <span className={isTop ? "font-medium text-[#1E293B] ml-2.5" : "text-[#475569] ml-2.5"}>{r.name}</span>
                        </div>
                      </td>
                    )}
                    {metricCells(r)}
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={dim === "项目" ? 27 : 24} className="px-3 py-16 text-center text-[#94A3B8]">暂无数据</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* Pager */}
        <div className="h-[48px] px-6 flex items-center justify-between border-t border-slate-200 bg-white">
          <div className="text-[13px] text-slate-500">共 {total} 条</div>
          <div className="flex items-center gap-3 text-[13px] text-slate-600">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-7 px-2 rounded border border-slate-200 bg-white"
            >
              <option value={10}>10 条 / 页</option>
              <option value={20}>20 条 / 页</option>
              <option value={50}>50 条 / 页</option>
            </select>
            <PagerControls
              page={curPage}
              pageCount={pageCount}
              onChange={setPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// LevelTag 已迁移到 @/components/HierarchyTag，统一全站层级标签规范

function ThSortable({
  children, onClick, sortIcon, rowSpan, bordered, hidden, align = "right",
}: {
  children: ReactNode;
  onClick: () => void;
  sortIcon: ReactNode;
  rowSpan?: number;
  bordered?: boolean;
  hidden?: boolean;
  align?: "left" | "right";
}) {
  if (hidden) return null;
  const isSub = !rowSpan;
  const alignClass = align === "left" ? "text-left" : "text-right";
  const justifyClass = align === "left" ? "justify-start" : "justify-end";
  return (
    <th
      rowSpan={rowSpan}
      onClick={onClick}
      className={`sticky top-0 z-20 ${isSub ? "bg-[#F8FAFC] py-1.5 font-normal text-[#64748B]" : "bg-[#F1F5F9] py-2 font-medium text-[#64748B]"} border-b border-[#EEF2F7] px-3 ${alignClass} cursor-pointer select-none whitespace-nowrap ${bordered ? "border-l border-[#E2E8F0]" : ""}`}
    >
      <span className={`inline-flex items-center gap-1 ${justifyClass}`}>
        {children}
        {sortIcon}
      </span>
    </th>
  );
}

function PagerControls({
  page, pageCount, onChange,
}: { page: number; pageCount: number; onChange: (p: number) => void }) {
  const list = useMemo(() => {
    const out: (number | "...")[] = [];
    const push = (v: number | "...") => out.push(v);
    if (pageCount <= 7) {
      for (let i = 1; i <= pageCount; i++) push(i);
    } else {
      push(1);
      const left = Math.max(2, page - 1);
      const right = Math.min(pageCount - 1, page + 1);
      if (left > 2) push("...");
      for (let i = left; i <= right; i++) push(i);
      if (right < pageCount - 1) push("...");
      push(pageCount);
    }
    return out;
  }, [page, pageCount]);

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      {list.map((v, i) =>
        v === "..." ? (
          <span key={"e" + i} className="px-1 text-slate-400">…</span>
        ) : (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`min-w-[28px] h-7 px-2 rounded text-[13px] ${
              v === page
                ? "bg-[#1677FF] text-white"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >{v}</button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
