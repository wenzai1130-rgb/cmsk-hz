import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Activity,
  Clock,
  Database,
  Network,
  Scale,
  Layers,
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUpDown,
  GripVertical,
  Plus,
  X,
  Check,
  Minus,
  Info,
  ListOrdered,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  MoreHorizontal,
  Copy,
  Star,
  FunctionSquare,
  Eye,
  Play,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Dashboard } from "@/pages/SelfQuery/components/Dashboard";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { formatNumber } from "@/lib/format";
import {
  DEFAULT_DERIVED_METRICS,
  FORMULA_FIELDS,
  FORMULA_OPERATORS,
  validateFormula,
  evalDerived,
  formatDerived,
  type DerivedMetric,
  type DerivedUnit,
  type DerivedCategory,
} from "@/lib/metric";

const CITY_GROUPS: { name: string; companies: string[] }[] = [
  { name: "南部城市群", companies: ["深圳公司", "广州公司", "佛山公司", "东莞公司", "珠海公司", "惠州公司", "中山公司", "江门公司"] },
  { name: "北部城市群", companies: ["北京公司", "天津公司", "济南公司", "青岛公司"] },
  { name: "东部城市群", companies: ["上海公司", "杭州公司", "南京公司", "苏州公司"] },
  { name: "中部城市群", companies: ["武汉公司", "长沙公司", "郑州公司"] },
  { name: "西部城市群", companies: ["成都公司", "重庆公司", "西安公司"] },
];

const ALL_COMPANIES = CITY_GROUPS.flatMap((g) => g.companies);
// 默认全选（招商蛇口集团口径）。后续可按用户角色覆盖：
// 集团 -> 招商蛇口；区域 -> 所属区域；城市公司 -> 所属城市公司；项目 -> 所属项目
const DEFAULT_SELECTED = ALL_COMPANIES;
const BIZ_TYPE_OPTIONS = ["住宅", "商业", "写字楼", "车位", "其他"];



const datasets = [
  { name: "房间维度货值明细表", desc: "按房间粒度的货值明细" },
  { name: "楼栋维度货值明细表", desc: "按楼栋粒度的货值明细" },
  { name: "项目维度货值明细表", desc: "按项目粒度的货值明细" },
];

// 组织树由顶部 CITY_GROUPS 提供，下方 OrgTree 组件负责完整交互

// 维度字段（围绕存货去化业务的 4 类核心维度）
type DimItem = { key: string; name: string; type: string; desc?: string };
const DIMENSION_GROUPS: { label: string; desc: string; items: DimItem[] }[] = [
  {
    label: "货值形成年份",
    desc: "按货值形成所属年份筛选，用于分析不同年份形成货值的去化情况。",
    items: [
      { key: "year_2021", name: "2021年及之前", type: "年份" },
      { key: "year_2022", name: "2022年", type: "年份" },
      { key: "year_2023", name: "2023年", type: "年份" },
      { key: "year_2024", name: "2024年", type: "年份" },
      { key: "year_2025", name: "2025年", type: "年份" },
      { key: "year_2026", name: "2026年", type: "年份" },
    ],
  },
  {
    label: "货龄",
    desc: "按货值进入当前未售状态后的持续时间进行分档，用于识别长期未去化库存。",
    items: [
      { key: "age_lt1", name: "小于1个月", type: "货龄" },
      { key: "age_1_3", name: "1-3个月", type: "货龄" },
      { key: "age_3_6", name: "3-6个月", type: "货龄" },
      { key: "age_6_12", name: "6-12个月", type: "货龄" },
      { key: "age_12_24", name: "12-24个月", type: "货龄" },
      { key: "age_gt24", name: "24个月以上", type: "货龄" },
    ],
  },
];
const ALL_DIMS: DimItem[] = DIMENSION_GROUPS.flatMap((g) => g.items);
const DEFAULT_DIM_KEYS = ALL_DIMS
  .filter((d) => d.key !== "caliber_equity" && d.key !== "caliber_manage")
  .map((d) => d.key);

// 分析维度：决定右侧表格按何种维度聚合展示（字段名，非取值；业态由"业态"面板单独控制，不在此处）
type DisplayDimItem = { key: string; name: string };
const DISPLAY_DIMS: DisplayDimItem[] = [
  { key: "ddim_city", name: "城市" },
  { key: "ddim_project", name: "项目" },
  { key: "ddim_year", name: "货值形成年份" },
];
const DEFAULT_DISPLAY_DIM_KEYS: string[] = [];
const BIZ_DIM: DisplayDimItem = { key: "ddim_biz_type", name: "业态" };

// 组织归属字段（由「组织范围」承接，不在分析维度选择器中，但表格默认展示，排序也可用）
const ORG_ATTR_DIMS: DisplayDimItem[] = [
  { key: "ddim_city_group", name: "城市群" },
  { key: "ddim_city_company", name: "城市公司" },
];

// 维度取值筛选可选项（不含 4 个层级维度，层级维度通过 CITY_HIERARCHY 联动生成）
const DIM_VALUE_OPTIONS: Record<string, string[]> = {
  ddim_year: ["2021年及之前", "2022年", "2023年", "2024年", "2025年", "2026年"],
  ddim_biz_type: ["住宅", "商业", "写字楼", "车位", "其他"],
};

// 城市群 → 城市公司 → 城市 → 项目 层级数据（用于维度取值筛选的级联）
type CityNode = { name: string; projects: string[] };
type CompanyNode = { name: string; cities: CityNode[] };
type GroupNode = { name: string; companies: CompanyNode[] };
const CITY_HIERARCHY: GroupNode[] = [
  {
    name: "南部城市群",
    companies: [
      { name: "深圳公司", cities: [{ name: "深圳", projects: ["深圳湾项目", "前海项目", "光明项目"] }] },
      { name: "广州公司", cities: [
        { name: "广州", projects: ["广州天河项目", "广州番禺项目"] },
        { name: "佛山", projects: ["佛山南海项目", "佛山顺德项目"] },
      ] },
      { name: "珠海公司", cities: [{ name: "珠海", projects: ["珠海横琴项目"] }] },
      { name: "惠州公司", cities: [{ name: "惠州", projects: ["惠州大亚湾项目"] }] },
    ],
  },
  {
    name: "华东城市群",
    companies: [
      { name: "上海公司", cities: [{ name: "上海", projects: ["上海浦东项目", "上海虹桥项目"] }] },
      { name: "南京公司", cities: [
        { name: "南京", projects: ["南京河西项目", "南京江宁项目"] },
        { name: "苏州", projects: ["苏州园区项目", "苏州吴中项目"] },
      ] },
      { name: "杭州公司", cities: [{ name: "杭州", projects: ["杭州未来科技城项目"] }] },
    ],
  },
  {
    name: "华北城市群",
    companies: [
      { name: "北京公司", cities: [{ name: "北京", projects: ["北京通州项目"] }] },
      { name: "天津公司", cities: [{ name: "天津", projects: ["天津滨海项目"] }] },
      { name: "青岛公司", cities: [{ name: "青岛", projects: ["青岛崂山项目"] }] },
    ],
  },
];

type HierarchyMaps = {
  groupOf: Record<string, string>; // company → group
  companyOfCity: Record<string, string>;
  cityOfProject: Record<string, string>;
};
const HIER_MAPS: HierarchyMaps = (() => {
  const groupOf: Record<string, string> = {};
  const companyOfCity: Record<string, string> = {};
  const cityOfProject: Record<string, string> = {};
  for (const g of CITY_HIERARCHY) for (const co of g.companies) {
    groupOf[co.name] = g.name;
    for (const c of co.cities) {
      companyOfCity[c.name] = co.name;
      for (const p of c.projects) cityOfProject[p] = c.name;
    }
  }
  return { groupOf, companyOfCity, cityOfProject };
})();

function getHierarchyOptions(selected: Record<string, string[]>) {
  const sel = (k: string) => selected[k] ?? [];
  const groupSel = sel("ddim_city_group");
  const companySel = sel("ddim_city_company");
  const citySel = sel("ddim_city");
  const groups = CITY_HIERARCHY;
  const companies = groups
    .filter((g) => groupSel.length === 0 || groupSel.includes(g.name))
    .flatMap((g) => g.companies);
  const cities = companies
    .filter((co) => companySel.length === 0 || companySel.includes(co.name))
    .flatMap((co) => co.cities);
  const projects = cities
    .filter((c) => citySel.length === 0 || citySel.includes(c.name))
    .flatMap((c) => c.projects);
  return {
    ddim_city_group: groups.map((g) => g.name),
    ddim_city_company: companies.map((c) => c.name),
    ddim_city: cities.map((c) => c.name),
    ddim_project: projects,
  };
}

// 根据下级选择回填上级，并清理超出可选范围的下级
function cascadeFilters(next: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = { ...next };
  // 下级 → 上级 自动带出
  const projects = out["ddim_project"] ?? [];
  if (projects.length) {
    const impliedCity = Array.from(new Set(projects.map((p) => HIER_MAPS.cityOfProject[p]).filter(Boolean)));
    out["ddim_city"] = Array.from(new Set([...(out["ddim_city"] ?? []), ...impliedCity]));
  }
  const cities = out["ddim_city"] ?? [];
  if (cities.length) {
    const impliedCo = Array.from(new Set(cities.map((c) => HIER_MAPS.companyOfCity[c]).filter(Boolean)));
    out["ddim_city_company"] = Array.from(new Set([...(out["ddim_city_company"] ?? []), ...impliedCo]));
  }
  const cos = out["ddim_city_company"] ?? [];
  if (cos.length) {
    const impliedG = Array.from(new Set(cos.map((c) => HIER_MAPS.groupOf[c]).filter(Boolean)));
    out["ddim_city_group"] = Array.from(new Set([...(out["ddim_city_group"] ?? []), ...impliedG]));
  }
  // 清理：清空上级时，下级中超出范围的项移除
  const opts = getHierarchyOptions(out);
  for (const k of ["ddim_city_company", "ddim_city", "ddim_project"] as const) {
    const allowed = new Set(opts[k]);
    if (out[k]) out[k] = out[k].filter((v) => allowed.has(v));
  }
  // 去掉空数组
  for (const k of Object.keys(out)) if (out[k] && out[k].length === 0) delete out[k];
  return out;
}

// 指标
type AggMode = "SUM" | "AVG" | "MAX" | "MIN" | "COUNT";
type MetricItem = { key: string; name: string; desc: string; defaultAgg: AggMode };
const AGG_OPTIONS: { value: AggMode; label: string }[] = [
  { value: "SUM", label: "求和（SUM）" },
  { value: "AVG", label: "平均（AVG）" },
  { value: "MAX", label: "最大（MAX）" },
  { value: "MIN", label: "最小（MIN）" },
  { value: "COUNT", label: "计数（COUNT）" },
];
const METRIC_GROUPS: { label: string; items: MetricItem[] }[] = [
  {
    label: "总量指标",
    items: [
      { key: "totalValue", name: "项目总货值", desc: "当前筛选范围内项目货值合计。", defaultAgg: "SUM" },
      { key: "unsold", name: "总未售货值", desc: "当前筛选范围内尚未销售的货值合计。", defaultAgg: "SUM" },
    ],
  },
  {
    label: "货值结构",
    items: [
      { key: "landReserve", name: "土地储备货值", desc: "处于土地储备阶段的货值。", defaultAgg: "SUM" },
      { key: "startUnsale", name: "开工未达预售货值", desc: "已开工但未达到预售条件的货值。", defaultAgg: "SUM" },
      { key: "buildingUncert", name: "在建达售未取证货值", desc: "在建且达到预售条件但未取得预售证的货值。", defaultAgg: "SUM" },
      { key: "buildingCertUnsold", name: "在建已取证未售货值", desc: "在建且已取得预售证但尚未销售的货值。", defaultAgg: "SUM" },
      { key: "doneUncert", name: "已竣工未取证货值", desc: "已竣工但尚未取得预售证的货值。", defaultAgg: "SUM" },
      { key: "doneCertUnsold", name: "已竣工已取证未售货值", desc: "已竣工且取得预售证但尚未销售的货值。", defaultAgg: "SUM" },
    ],
  },
  {
    label: "去化表现",
    items: [
      { key: "signed", name: "月度签约金额", desc: "当前周期月度签约金额合计。", defaultAgg: "SUM" },
      { key: "certDealRate", name: "取证去化率", desc: "月度签约金额 ÷（月度签约金额 + 已取证未售货值）。", defaultAgg: "AVG" },
    ],
  },
];
const ALL_METRICS: MetricItem[] = METRIC_GROUPS.flatMap((g) => g.items);
const DEFAULT_METRIC_KEYS = [
  "totalValue",
  "unsold",
  "landReserve",
  "startUnsale",
  "buildingUncert",
  "buildingCertUnsold",
  "doneUncert",
  "doneCertUnsold",
  "signed",
  "certDealRate",
];

type TemplateItem = {
  id: string;
  name: string;
  desc?: string;
  dataset: string;
  datasetTag: string;
  dimCount: number;
  metricCount: number;
  scope: string;
  metricsSummary: string;
  isDefault?: boolean;
  isRecent?: boolean;
  isFavorite?: boolean;
  detail: {
    数据集: string;
    组织范围: string;
    维度: string;
    指标: string;
    时间周期: string;
    过滤条件: string;
    排序: string;
  };
};

const INITIAL_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl001",
    name: "模板001",
    desc: "南部城市群 · 房间维度货值与签约总览",
    dataset: "房间维度货值明细表",
    datasetTag: "房间维度",
    dimCount: 4,
    metricCount: 3,
    scope: "南部城市群 / 本年至今",
    metricsSummary: "总未售货值、月度签约金额、去化周期",
    isDefault: true,
    isRecent: true,
    isFavorite: true,
    detail: {
      数据集: "房间维度货值明细表",
      组织范围: "南部城市群 / 8个城市公司",
      维度: "城市群、城市公司、项目、业态",
      指标: "总未售货值、达售未取证、签约金额",
      时间周期: "本年至今",
      过滤条件: "业态 = 住宅 / 取证状态 ≠ 已取证未售",
      排序: "签约金额 · 降序",
    },
  },
  {
    id: "tpl002",
    name: "模板002",
    desc: "项目维度签约金额对比",
    dataset: "项目维度货值明细表",
    datasetTag: "项目维度",
    dimCount: 3,
    metricCount: 4,
    scope: "全部城市群 / 近12个月",
    metricsSummary: "签约金额、签约面积、回款金额、去化率",
    isRecent: true,
    detail: {
      数据集: "项目维度货值明细表",
      组织范围: "全部城市群",
      维度: "城市群、城市公司、项目",
      指标: "签约金额、签约面积、回款金额、去化率",
      时间周期: "近12个月",
      过滤条件: "无",
      排序: "签约金额 · 降序",
    },
  },
  {
    id: "tpl003",
    name: "4月模板",
    desc: "楼栋维度风险库存监控",
    dataset: "楼栋维度货值明细表",
    datasetTag: "楼栋维度",
    dimCount: 5,
    metricCount: 3,
    scope: "南部、东部 / 本月",
    metricsSummary: "已竣未售、长库龄货值、长库龄占比",
    isFavorite: true,
    detail: {
      数据集: "楼栋维度货值明细表",
      组织范围: "南部城市群 + 东部城市群",
      维度: "城市群、城市公司、项目、楼栋、业态",
      指标: "已竣未售、长库龄货值、长库龄占比",
      时间周期: "本月",
      过滤条件: "库龄 ≥ 12 个月",
      排序: "长库龄货值 · 降序",
    },
  },
];

type PeriodType = "year" | "quarter" | "month";
export type Period = { type: PeriodType; value: string };
export type CustomRange = { enabled: boolean; start: string; end: string };

function yearLabel(y: string): string {
  return y === "2021" ? "2021年及之前" : `${y}年`;
}
function formatPeriodLabel(p: Period): string {
  if (!p.value) return "";
  if (p.type === "year") return yearLabel(p.value);
  if (p.type === "quarter") {
    const y = p.value.slice(0, 4);
    const q = p.value.slice(4);
    return `${yearLabel(y)}${q}`;
  }
  if (p.type === "month") {
    const [y, m] = p.value.split("-");
    return `${yearLabel(y)}${parseInt(m, 10)}月`;
  }
  return p.value;
}

function formatRangeLabel(r: CustomRange): string {
  if (!r.enabled || !r.start || !r.end) return "";
  return `${r.start} 至 ${r.end}`;
}

type BusinessTemplate = {
  id: string;
  name: string;
  role: string;
  desc: string;
  dims: string;
  metrics: string;
  lastUpdate: string;
  recommended?: boolean;
  isDefault?: boolean;
  filtersSummary: string;
};

type TplLog = { time: string; user: string; action: string; change: string };
const TPL_ACTIONS = ["创建模板", "创建个人副本", "编辑基本信息", "修改配置", "删除模板", "设为默认"] as const;
type TplAction = typeof TPL_ACTIONS[number];
const DEFAULT_TPL_LOGS: Record<string, TplLog[]> = {
  "biz-default": [
    { time: "2026-05-15 09:48", user: "", action: "创建模板", change: "系统初始化推荐模板" },
  ],
  "biz-region": [
    { time: "2026-05-18 10:32", user: "", action: "修改配置", change: "修改统计周期默认值：2026年3月 → 2026年5月" },
  ],
  "biz-risk": [
    { time: "2026-05-16 15:20", user: "", action: "编辑基本信息", change: "修改模板说明" },
  ],
};


const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: "biz-default",
    name: "招商蛇口存货去化总览",
    role: "",
    desc: "全员通用默认模板，覆盖存货结构、签约表现与风险库存。",
    dims: "城市群 / 城市公司",
    metrics: "项目总货值、总未售货值、土地储备货值、开工未达预售货值、在建达售未取证货值、在建已取证未售货值、已竣工未取证货值、已竣工已取证未售货值、签约货值、取证去化率",
    lastUpdate: "2026-05",
    recommended: true,
    isDefault: true,
    filtersSummary: "招商蛇口｜2026年5月｜全口径-权益｜全部业态",
  },
  {
    id: "biz-region",
    name: "区域存货去化跟踪",
    role: "",
    desc: "区域 / 城市公司维度的存货结构、去化进度及风险库存跟踪。",
    dims: "城市群 / 城市公司",
    metrics: "项目总货值、总未售货值、签约货值、取证去化率、在建达售未取证货值、已竣工已取证未售货值",
    lastUpdate: "2026-05",
    filtersSummary: "按当前组织权限｜2026年5月｜全口径-权益｜全部业态",
  },
  {
    id: "biz-risk",
    name: "项目风险库存分析",
    role: "",
    desc: "聚焦项目层级的土地储备、未达预售、未取证、已竣未售等风险库存识别。",
    dims: "城市 / 项目",
    metrics: "总未售货值、土地储备货值、开工未达预售货值、在建达售未取证货值、已竣工未取证货值、已竣工已取证未售货值",
    lastUpdate: "2026-05",
    filtersSummary: "按当前组织权限｜2026年5月｜全口径-权益｜全部业态",
  },
  {
    id: "biz-trend",
    name: "月度签约与去化趋势",
    role: "",
    desc: "跟踪签约货值、取证去化率及存货去化变化。",
    dims: "城市 / 项目 / 月份",
    metrics: "项目总货值、总未售货值、签约货值、取证去化率",
    lastUpdate: "2026-05",
    filtersSummary: "按当前组织权限｜2026年5月｜全口径-权益｜全部业态",
  },
];

function Index() {
  const [tab, setTab] = useState<"config" | "templates">("templates");
  const [caliber, setCaliber] = useState<"全口径-权益" | "全口径">("全口径-权益");
  const [valueMode, setValueMode] = useState<"金额" | "面积">("金额");
  const [bizTypes, setBizTypes] = useState<string[]>([]); // 空数组表示「全部」
  const [showBizDim, setShowBizDim] = useState(false); // 是否在结果表展示业态列并按业态拆分
  const [bizTemplates, setBizTemplates] = useState<BusinessTemplate[]>(BUSINESS_TEMPLATES);
  const [templateLogs, setTemplateLogs] = useState<Record<string, TplLog[]>>(DEFAULT_TPL_LOGS);
  const [activeBizTplId, setActiveBizTplId] = useState<string>("biz-default");
  const activeBizTpl = bizTemplates.find((t) => t.id === activeBizTplId) ?? bizTemplates[0];
  const userRole = activeBizTpl.role;
  const [editingConfigTplId, setEditingConfigTplId] = useState<string | null>(null);
  const editingConfigTpl = bizTemplates.find((t) => t.id === editingConfigTplId) ?? null;
  const [confirmSaveCfgOpen, setConfirmSaveCfgOpen] = useState(false);
  const [confirmCancelEditOpen, setConfirmCancelEditOpen] = useState(false);
  const [recommendedBlockTpl, setRecommendedBlockTpl] = useState<BusinessTemplate | null>(null);
  const appendLog = (id: string, log: TplLog) => {
    setTemplateLogs((p) => ({ ...p, [id]: [log, ...(p[id] ?? [])] }));
  };
  const startEditConfig = (t: BusinessTemplate) => {
    if (t.recommended) {
      setRecommendedBlockTpl(t);
      return;
    }
    setActiveBizTplId(t.id);
    setEditingConfigTplId(t.id);
    setConfigDirty(false);
    setTab("config");
  };
  const exitEditConfig = () => {
    setEditingConfigTplId(null);
    setConfigDirty(false);
  };
  const [focusMetric, setFocusMetric] = useState<string | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"detail" | "trend" | "composition">("detail");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(DEFAULT_SELECTED);
  const [selectedDataset, setSelectedDataset] = useState<string>(datasets[0].name);
  const [dimKeys, setDimKeys] = useState<string[]>(DEFAULT_DIM_KEYS);
  const [metricKeys, setMetricKeys] = useState<string[]>(DEFAULT_METRIC_KEYS);
  const [displayDimKeys, setDisplayDimKeys] = useState<string[]>(DEFAULT_DISPLAY_DIM_KEYS);
  const [dimValueFilters, setDimValueFilters] = useState<Record<string, string[]>>({});
  const [configDirty, setConfigDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [derivedMetrics, setDerivedMetrics] = useState<DerivedMetric[]>(DEFAULT_DERIVED_METRICS);
  const [selectedDerivedKeys, setSelectedDerivedKeys] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>(INITIAL_TEMPLATES);
  const [period, setPeriod] = useState<Period>({ type: "month", value: "2026-05" });
  const [customRange, setCustomRange] = useState<CustomRange>({ enabled: false, start: "", end: "" });
  const [hasQueried, setHasQueried] = useState(true);
  const [pinnedMetrics, setPinnedMetrics] = useState<string[]>([
    "totalValue", "unsold", "signed", "buildingUncert", "doneCertUnsold", "certDealRate",
  ]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [lastQuery, setLastQuery] = useState<{
    orgLabel: string;
    periodLabel: string;
    datasetName: string;
    dimCount: number;
    metricCount: number;
    summary: string;
    displayDimKeys: string[];
    metricKeys: string[];
    dimValueFilters: Record<string, string[]>;
    period: Period;
    customRange: CustomRange;
    selectedDerivedKeys: string[];
    showBizDim: boolean;
  } | null>(() => ({
    orgLabel: "招商蛇口",
    periodLabel: formatPeriodLabel({ type: "month", value: "2026-05" }),
    datasetName: datasets[0].name,
    dimCount: DEFAULT_DIM_KEYS.length,
    metricCount: DEFAULT_METRIC_KEYS.length,
    summary: `招商蛇口 / ${formatPeriodLabel({ type: "month", value: "2026-05" })} / ${datasets[0].name} / ${DEFAULT_DIM_KEYS.length}个维度 / ${DEFAULT_METRIC_KEYS.length}个指标`,
    displayDimKeys: [...DEFAULT_DISPLAY_DIM_KEYS],
    metricKeys: [...DEFAULT_METRIC_KEYS],
    dimValueFilters: {},
    period: { type: "month", value: "2026-05" },
    customRange: { enabled: false, start: "", end: "" },
    selectedDerivedKeys: [],
    showBizDim: false,
  }));

  // 组织摘要
  const orgGroupNames = useMemo(() => {
    const set = new Set<string>();
    CITY_GROUPS.forEach((g) => {
      if (g.companies.some((c) => selectedCompanies.includes(c))) set.add(g.name);
    });
    return Array.from(set);
  }, [selectedCompanies]);

  const orgLabel = useMemo(() => {
    if (selectedCompanies.length === 0) return "未选择组织";
    if (orgGroupNames.length > 1) return "招商蛇口";
    return orgGroupNames[0] || "招商蛇口";
  }, [orgGroupNames, selectedCompanies]);

  const periodLabel = formatPeriodLabel(period);

  const totalMetricCount = metricKeys.length + selectedDerivedKeys.length;
  const querySummary =
    `${orgLabel}` +
    ` / ${periodLabel || "未选择统计周期"}` +
    ` / ${selectedDataset}` +
    ` / ${dimKeys.length}个维度` +
    ` / ${totalMetricCount}个指标`;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleSelectedChange = (next: string[]) => {
    setSelectedCompanies(next);
    setConfigDirty(true);
  };

  const validateQuery = (): string | null => {
    if (selectedCompanies.length === 0) return "请选择组织范围";
    if (!period.value) return "请选择统计周期";
    if (customRange.enabled && (!customRange.start || !customRange.end)) return "请完善自定义时间范围后再查询。";
    if (metricKeys.length + selectedDerivedKeys.length === 0) return "请选择指标";
    return null;
  };

  const handleQuery = () => {
    const err = validateQuery();
    if (err) {
      showToast(err);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setConfigDirty(false);
      setHasQueried(true);
      setLastQuery({
        orgLabel,
        periodLabel,
        datasetName: selectedDataset,
        dimCount: dimKeys.length,
        metricCount: totalMetricCount,
        summary: querySummary,
        displayDimKeys: [...displayDimKeys],
        metricKeys: [...metricKeys],
        dimValueFilters: { ...dimValueFilters },
        period: { ...period },
        customRange: { ...customRange },
        selectedDerivedKeys: [...selectedDerivedKeys],
        showBizDim,
      });
      showToast("查询完成，已更新结果");
    }, 500);
  };

  const removeChip = (kind: "org" | "period" | "dim" | "metric" | "derived", key?: string) => {
    if (kind === "org") setSelectedCompanies([]);
    else if (kind === "period") setPeriod({ ...period, value: "" });
    else if (kind === "dim" && key) setDimKeys((prev) => (prev.length > 1 ? prev.filter((k) => k !== key) : prev));
    else if (kind === "metric" && key) setMetricKeys((prev) => prev.filter((k) => k !== key));
    else if (kind === "derived" && key) setSelectedDerivedKeys((prev) => prev.filter((k) => k !== key));
    setConfigDirty(true);
  };

  const resetFilters = () => {
    setSelectedCompanies(DEFAULT_SELECTED);
    setDimKeys(DEFAULT_DIM_KEYS);
    setMetricKeys(DEFAULT_METRIC_KEYS);
    setPeriod({ type: "month", value: "2026-05" });
    setSelectedDerivedKeys([]);
    setBizTypes([]);
    setShowBizDim(false);
    setConfigDirty(true);
    setHasQueried(false);
  };

  const fullReset = () => {
    setSelectedDataset(datasets[0].name);
    setSelectedCompanies(DEFAULT_SELECTED);
    setDimKeys(DEFAULT_DIM_KEYS);
    setMetricKeys(DEFAULT_METRIC_KEYS);
    setPeriod({ type: "month", value: "2026-05" });
    setSelectedDerivedKeys([]);
    setBizTypes([]);
    setShowBizDim(false);
    setPinnedMetrics(["totalValue", "unsold", "signed", "buildingUncert", "doneCertUnsold"]);
    setFocusMetric(null);
    setActiveAnalysisTab("detail");
    setHasQueried(true);
    setLastQuery({
      orgLabel: "招商蛇口",
      periodLabel: formatPeriodLabel({ type: "month", value: "2026-05" }),
      datasetName: datasets[0].name,
      dimCount: DEFAULT_DIM_KEYS.length,
      metricCount: DEFAULT_METRIC_KEYS.length,
      summary: `招商蛇口 / ${formatPeriodLabel({ type: "month", value: "2026-05" })} / ${datasets[0].name} / ${DEFAULT_DIM_KEYS.length}个维度 / ${DEFAULT_METRIC_KEYS.length}个指标`,
      displayDimKeys: [...DEFAULT_DISPLAY_DIM_KEYS],
      metricKeys: [...DEFAULT_METRIC_KEYS],
      dimValueFilters: {},
      period: { type: "month", value: "2026-05" },
      customRange: { enabled: false, start: "", end: "" },
      selectedDerivedKeys: [],
      showBizDim: false,
    });
    setConfigDirty(false);
    setResetConfirmOpen(false);
    showToast("查询条件已重置");
  };

  return (
    <div className="min-h-screen w-full">
      <HeaderNav active="自助查询" />

      <div className="flex h-[calc(100vh-64px)]">
        <aside
          className="bg-[var(--color-panel)] border-r border-[#EEF1F6] flex flex-col transition-[width] duration-200 ease-out overflow-hidden"
          style={{ width: sidebarCollapsed ? 60 : 420 }}
        >
          {sidebarCollapsed ? (
            <CollapsedSidebar onExpand={() => setSidebarCollapsed(false)} />
          ) : (
            <>
              <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {(["templates", "config"] as const).map((t) => {
                    const active = tab === t;
                    const label = t === "templates" ? "我的模板" : "配置查询";
                    return (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`h-9 rounded-md text-sm transition-all ${
                          active
                            ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold"
                            : "text-muted-foreground font-normal hover:text-foreground hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  title="收起侧边栏"
                  className="w-8 h-8 rounded-md text-muted-foreground hover:text-[var(--color-brand)] hover:bg-[#F8FAFC] flex items-center justify-center shrink-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-thin">
                {tab === "config" ? (
                  <ConfigPanel
                    selected={selectedCompanies}
                    onSelectedChange={handleSelectedChange}
                    onConfigChange={() => setConfigDirty(true)}
                    selectedDataset={selectedDataset}
                    setSelectedDataset={setSelectedDataset}
                    dimKeys={dimKeys}
                    setDimKeys={setDimKeys}
                    metricKeys={metricKeys}
                    setMetricKeys={setMetricKeys}
                    displayDimKeys={displayDimKeys}
                    setDisplayDimKeys={setDisplayDimKeys}
                    dimValueFilters={dimValueFilters}
                    setDimValueFilters={setDimValueFilters}
                    derivedMetrics={derivedMetrics}
                    setDerivedMetrics={setDerivedMetrics}
                    selectedDerivedKeys={selectedDerivedKeys}
                    setSelectedDerivedKeys={setSelectedDerivedKeys}
                    period={period}
                    setPeriod={(p) => { setPeriod(p); setConfigDirty(true); }}
                    caliber={caliber}
                    setCaliber={(v) => { setCaliber(v); setConfigDirty(true); }}
                    customRange={customRange}
                    setCustomRange={(r) => { setCustomRange(r); setConfigDirty(true); }}
                    bizTypes={bizTypes}
                    setBizTypes={(v) => { setBizTypes(v); setConfigDirty(true); }}
                    showBizDim={showBizDim}
                    setShowBizDim={(v) => { setShowBizDim(v); setConfigDirty(true); }}
                    showToast={showToast}
                  />
                ) : (
                  <MyTemplatePanel
                    bizTemplates={bizTemplates}
                    setBizTemplates={setBizTemplates}
                    templateLogs={templateLogs}
                    appendLog={appendLog}
                    showToast={showToast}
                    activeTpl={activeBizTpl}
                    onSelectTpl={(id) => setActiveBizTplId(id)}
                    selected={selectedCompanies}
                    onSelectedChange={handleSelectedChange}
                    period={period}
                    setPeriod={(p) => { setPeriod(p); setConfigDirty(true); }}
                    caliber={caliber}
                    setCaliber={(v) => { setCaliber(v); setConfigDirty(true); }}
                    valueMode={valueMode}
                    setValueMode={(v) => { setValueMode(v); setConfigDirty(true); }}
                    bizTypes={bizTypes}
                    setBizTypes={(v) => { setBizTypes(v); setConfigDirty(true); }}
                    onSwitchToConfig={() => setTab("config")}
                    onStartEditConfig={startEditConfig}
                    onResetActive={() => setResetConfirmOpen(true)}
                    onSaveAsCopy={(t) => { setActiveBizTplId(t.id); setSaveOpen(true); }}
                  />
                )}
              </div>

              {configDirty && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  查询配置已变更，请点击查询数据刷新结果。
                </div>
              )}

              <div className="border-t border-[#EEF1F6] p-4 flex gap-3 bg-card">
                {editingConfigTpl ? (
                  <>
                    <button
                      onClick={() => { if (configDirty) setConfirmCancelEditOpen(true); else exitEditConfig(); }}
                      className="px-3 h-10 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-[#F8FAFC]"
                    >
                      取消修改
                    </button>
                    <button
                      onClick={() => setConfirmSaveCfgOpen(true)}
                      className="px-4 h-10 rounded-md text-sm border border-[#E2E8F0] text-foreground hover:bg-[#F8FAFC] hover:border-[#93C5FD]"
                    >
                      保存配置
                    </button>
                    <button
                      onClick={handleQuery}
                      disabled={loading}
                      className="flex-1 h-10 rounded-md text-sm font-semibold bg-[var(--color-brand)] text-[var(--color-brand-foreground)] hover:opacity-90 shadow-[0_4px_12px_rgba(60,120,220,0.25)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      {loading && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                      {loading ? "查询中..." : "查询数据"}
                    </button>
                  </>
                ) : (
                  <>
                    {tab === "config" && (
                      <button
                        onClick={() => setSaveOpen(true)}
                        className="px-4 h-10 rounded-md text-sm border border-[#E2E8F0] text-foreground hover:bg-[#F8FAFC] hover:border-[#93C5FD]"
                      >
                        保存为新模板
                      </button>
                    )}
                    <button
                      onClick={handleQuery}
                      disabled={loading}
                      className="flex-1 h-10 rounded-md text-sm font-semibold bg-[var(--color-brand)] text-[var(--color-brand-foreground)] hover:opacity-90 shadow-[0_4px_12px_rgba(60,120,220,0.25)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      {loading && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                      {loading ? "查询中..." : "查询数据"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </aside>

        <main className="flex-1 overflow-auto bg-[#F6F8FB] relative">
          {loading && (
            <div className="absolute inset-0 z-30 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
              <div className="px-4 py-2 rounded-md bg-card border border-[var(--color-panel-border)] text-sm text-muted-foreground inline-flex items-center gap-2 shadow">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] animate-spin" />
                正在加载数据...
              </div>
            </div>
          )}

          {/* 页面标题 */}
          <div className="px-6 pt-5 pb-1">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 inline-block w-1 h-6 rounded bg-gradient-to-b from-[oklch(0.7_0.18_240)] to-[oklch(0.55_0.22_255)]" />
              <div>
                <h1 className="text-[22px] font-semibold leading-tight text-foreground">自助查询</h1>
                <p className="mt-1 text-[13px] text-[#64748B]">
                  支持按组织、时间、产品、状态等维度灵活组合查询，并自动生成重点指标与趋势分析。
                </p>
              </div>
            </div>
          </div>

          {/* 模板编辑提示条 */}
          {editingConfigTpl && (
            <div className="mx-6 mt-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-card px-4 py-2.5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-700">
                <Pencil className="w-3.5 h-3.5" />
              </span>
              <span className="text-[13px] text-amber-900">
                正在修改模板：<span className="font-semibold">{editingConfigTpl.name}</span>
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => { if (configDirty) setConfirmCancelEditOpen(true); else exitEditConfig(); }}
                  className="px-3 h-7 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-white border border-transparent hover:border-[var(--color-panel-border)]"
                >
                  取消修改
                </button>
                <button
                  onClick={() => setConfirmSaveCfgOpen(true)}
                  className="px-3 h-7 rounded text-xs bg-[var(--color-brand)] text-white hover:opacity-90"
                >
                  保存配置
                </button>
              </div>
            </div>
          )}

          {/* 模板说明条 */}
          {(() => {
            const bizLabel = bizTypes.length === 0 ? "全部业态" : bizTypes.join(" / ");
            const filtersSummary = `${orgLabel}｜${periodLabel}｜${caliber}｜${bizLabel}`;
            return (
              <div className="mx-6 mt-3 rounded-lg border border-[#E2E8F0] bg-gradient-to-r from-[#F8FBFF] to-card px-4 py-2.5 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[14px] font-semibold text-foreground truncate">{activeBizTpl.name}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                  {activeBizTpl.role}
                </span>
                <span className="text-[12px] text-[#64748B] truncate flex-1 min-w-0">
                  当前筛选：{filtersSummary}
                </span>
              </div>
            );
          })()}

          <Dashboard
            focusMetric={focusMetric}
            setFocusMetric={setFocusMetric}
            activeTab={activeAnalysisTab}
            setActiveTab={setActiveAnalysisTab}
            querySummary={hasQueried ? lastQuery?.summary ?? querySummary : querySummary}
            metricKeys={lastQuery?.metricKeys ?? metricKeys}
            derivedMetrics={derivedMetrics.filter((d) => (lastQuery?.selectedDerivedKeys ?? selectedDerivedKeys).includes(d.id))}
            periodLabel={hasQueried ? lastQuery?.periodLabel ?? periodLabel : periodLabel}
            orgLabel={hasQueried ? lastQuery?.orgLabel ?? orgLabel : orgLabel}
            datasetName={hasQueried ? lastQuery?.datasetName ?? selectedDataset : selectedDataset}
            caliberLabel={caliber}
            bizLabel={bizTypes.length === 0 ? "全部" : bizTypes.join(" / ")}
            dimCount={hasQueried ? (lastQuery?.displayDimKeys ?? displayDimKeys).length : displayDimKeys.length}
            metricCount={hasQueried ? lastQuery?.metricCount ?? totalMetricCount : totalMetricCount}
            appliedDimColumns={[
              ...ORG_ATTR_DIMS.map((d) => ({ key: d.key, name: d.name })),
              ...(hasQueried ? lastQuery?.displayDimKeys ?? displayDimKeys : displayDimKeys)
                .map((k) => DISPLAY_DIMS.find((d) => d.key === k))
                .filter(Boolean)
                .map((d) => ({ key: d!.key, name: d!.name })),
              ...((hasQueried ? lastQuery?.showBizDim ?? showBizDim : showBizDim) ? [{ key: BIZ_DIM.key, name: BIZ_DIM.name }] : []),
            ]}
            appliedMetricColumns={
              (hasQueried ? lastQuery?.metricKeys ?? metricKeys : metricKeys)
                .map((k) => ALL_METRICS.find((m) => m.key === k))
                .filter(Boolean)
                .map((m) => ({ key: m!.key, name: m!.name }))
            }
            appliedDimValueFilters={hasQueried ? lastQuery?.dimValueFilters ?? dimValueFilters : dimValueFilters}
            hasQueried={hasQueried}
            configDirty={configDirty}
            loading={loading}
            onRemoveChip={removeChip}
            onResetFilters={resetFilters}
            onQuery={handleQuery}
            pinned={pinnedMetrics}
            setPinned={setPinnedMetrics}
            onShowToast={showToast}
            onBackToDefault={() => setHasQueried(false)}
            period={lastQuery?.period ?? period}
            customRange={lastQuery?.customRange ?? customRange}
            onConfigChange={() => setConfigDirty(true)}
          />
        </main>
      </div>

      {saveOpen && (
        <SaveTemplateModal
          onClose={() => setSaveOpen(false)}
          onSaved={({ name, desc, isDefault }) => {
            const id = `biz-${Date.now()}`;
            const next: BusinessTemplate = {
              id,
              name,
              role: "",
              desc: desc || "用户保存的模板",
              dims: "城市群 / 城市公司",
              metrics: "总货值、未售货值、当月签约货值",
              lastUpdate: new Date().toISOString().slice(0, 7),
              isDefault,
              filtersSummary: `招商蛇口｜${periodLabel}｜${caliber}｜${bizTypes.length ? bizTypes.join("/") : "全部业态"}`,
            };
            setBizTemplates((p) => {
              const arr = isDefault ? p.map((x) => ({ ...x, isDefault: false })) : p;
              return [...arr, next];
            });
            appendLog(id, { time: nowStr(), user: "当前用户", action: "创建模板", change: `通过「保存为新模板」创建：${name}` });
            setSaveOpen(false);
            showToast("模板保存成功");
          }}
        />
      )}

      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center" onClick={() => setResetConfirmOpen(false)}>
          <div className="w-[420px] bg-card rounded-lg shadow-xl border border-[var(--color-panel-border)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">确认重置查询条件？</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              将恢复默认组织范围、周期、维度、指标和排序配置。
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground"
              >
                取消
              </button>
              <button
                onClick={fullReset}
                className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSaveCfgOpen && editingConfigTpl && (
        <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center" onClick={() => setConfirmSaveCfgOpen(false)}>
          <div className="w-[460px] bg-card rounded-lg shadow-xl border border-[var(--color-panel-border)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">确认保存模板配置？</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              本次将覆盖模板「{editingConfigTpl.name}」保存的组织范围、统计周期、统计口径、业态、分析维度、指标选择和排序配置。
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmSaveCfgOpen(false)} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">取消</button>
              <button
                onClick={() => {
                  const id = editingConfigTpl.id;
                  const filtersSummary = `招商蛇口｜${periodLabel}｜${caliber}｜${bizTypes.length ? bizTypes.join("/") : "全部业态"}`;
                  setBizTemplates((p) => p.map((x) => x.id === id ? { ...x, filtersSummary, lastUpdate: new Date().toISOString().slice(0, 7) } : x));
                  appendLog(id, { time: nowStr(), user: "当前用户", action: "修改配置", change: `保存模板配置：${filtersSummary}` });
                  setConfirmSaveCfgOpen(false);
                  exitEditConfig();
                  showToast("模板配置已保存");
                }}
                className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancelEditOpen && (
        <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center" onClick={() => setConfirmCancelEditOpen(false)}>
          <div className="w-[420px] bg-card rounded-lg shadow-xl border border-[var(--color-panel-border)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">放弃修改？</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">当前修改尚未保存，确认放弃修改？</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmCancelEditOpen(false)} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">继续编辑</button>
              <button
                onClick={() => { setConfirmCancelEditOpen(false); exitEditConfig(); showToast("已退出模板修改"); }}
                className="px-4 h-9 rounded-md bg-destructive/90 hover:bg-destructive text-white text-sm font-medium"
              >
                放弃修改
              </button>
            </div>
          </div>
        </div>
      )}

      {recommendedBlockTpl && (
        <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center" onClick={() => setRecommendedBlockTpl(null)}>
          <div className="w-[460px] bg-card rounded-lg shadow-xl border border-[var(--color-panel-border)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">系统推荐模板不可直接修改</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              该模板为系统预设模板，为保证模板口径统一，不能直接修改配置。你可以创建个人副本后，再调整组织范围、统计周期、分析维度和指标。
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setRecommendedBlockTpl(null)} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">取消</button>
              <button
                onClick={() => {
                  const src = recommendedBlockTpl;
                  const id = `biz-${Date.now()}`;
                  const dup: BusinessTemplate = { ...src, id, name: `${src.name} - 个人模板`, recommended: false, isDefault: false, lastUpdate: new Date().toISOString().slice(0, 7) };
                  setBizTemplates((p) => [...p, dup]);
                  appendLog(id, { time: nowStr(), user: "当前用户", action: "创建个人副本", change: `基于系统推荐模板「${src.name}」创建个人模板副本` });
                  setRecommendedBlockTpl(null);
                  setActiveBizTplId(id);
                  setEditingConfigTplId(id);
                  setConfigDirty(false);
                  setTab("config");
                }}
                className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90"
              >
                创建个人副本并修改
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-md bg-foreground text-card text-sm shadow-lg inline-flex items-center gap-2">
          <CheckCircle2 className="icon-md text-status-good" />
          {toast}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  count?: string;
  hint?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-3 mt-5">
      <div className="flex items-center gap-2 text-[var(--color-brand)] font-medium text-sm">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
        {hint && <Info className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      {count && <span className="text-xs text-muted-foreground">{count}</span>}
    </div>
  );
}

function CheckBox({ checked = false }: { checked?: boolean }) {
  return (
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
        checked
          ? "bg-[var(--color-brand)] border-[var(--color-brand)]"
          : "border-[var(--color-panel-border)] bg-card"
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );
}

function CollapsedSidebar({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="h-full flex flex-col items-center py-3">
      <button
        onClick={onExpand}
        title="展开自助查询"
        className="w-9 h-9 rounded-md text-[var(--color-brand)] hover:bg-[#F8FAFC] flex items-center justify-center"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  summary?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1 relative">
      {open && (
        <span className="absolute left-[-10px] top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--color-brand)]" />
      )}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 h-11 px-2 -mx-2 rounded-md text-left transition-colors ${
          open ? "bg-[#EAF4FF]" : "hover:bg-[#F8FAFC]"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
          <span className="text-[14px] font-semibold text-foreground">{title}</span>
        </span>
        <span className="flex items-center gap-2 min-w-0">
          {summary && (
            <span className="text-[12px] text-[#64748B] truncate max-w-[200px]">{summary}</span>
          )}
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pt-1 pb-3 pl-6 pr-1 border-b border-[#EEF1F6]">{children}</div>
        </div>
      </div>
    </div>
  );
}

type SortRule = { field: string; dir: "asc" | "desc" };


const PERIOD_YEARS = ["2026", "2025", "2024", "2023", "2022", "2021"];
const LATEST_YEAR = 2026;
const LATEST_MONTH = 5; // 2026年5月
const LATEST_QUARTER = 2; // 2026 Q2

const QUICK_MONTHS = ["2026-05", "2026-04", "2026-03"];
const QUICK_QUARTERS = ["2026Q2", "2026Q1", "2025Q4"];
const QUICK_YEARS = ["2026", "2025", "2024"];

function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [popYear, setPopYear] = useState<string>(() => {
    if (value.type === "month") return value.value.slice(0, 4);
    if (value.type === "quarter") return value.value.slice(0, 4);
    if (value.type === "year") return value.value;
    return "2026";
  });

  const types: { k: PeriodType; label: string }[] = [
    { k: "year", label: "年度" },
    { k: "quarter", label: "季度" },
    { k: "month", label: "月份" },
  ];
  const defaults: Record<PeriodType, string> = {
    month: "2026-05",
    quarter: "2026Q2",
    year: "2026",
  };
  const quickByType: Record<PeriodType, string[]> = {
    year: QUICK_YEARS,
    quarter: QUICK_QUARTERS,
    month: QUICK_MONTHS,
  };
  const moreLabel: Record<PeriodType, string> = {
    year: "更多年份",
    quarter: "更多季度",
    month: "更多月份",
  };

  const switchType = (k: PeriodType) => {
    onChange({ type: k, value: defaults[k] });
    setPopYear(defaults[k].slice(0, 4));
  };

  const fmtQuick = (v: string) => {
    if (value.type === "month") return v;
    if (value.type === "quarter") return v;
    return v;
  };

  const selectAndClose = (p: Period) => {
    onChange(p);
    setMoreOpen(false);
  };

  const isMonthDisabled = (y: string, m: number) => {
    const yi = parseInt(y, 10);
    return yi === LATEST_YEAR && m > LATEST_MONTH;
  };
  const isQuarterDisabled = (y: string, q: number) => {
    const yi = parseInt(y, 10);
    return yi === LATEST_YEAR && q > LATEST_QUARTER;
  };

  return (
    <div className="space-y-2">
      <div className="inline-flex p-0.5 rounded-md bg-[#F1F4F9] border border-[var(--color-panel-border)]">
        {types.map((t) => {
          const active = value.type === t.k;
          return (
            <button
              key={t.k}
              onClick={() => switchType(t.k)}
              className={`px-3 h-7 text-xs rounded transition-all ${active ? "bg-card text-[var(--color-brand)] font-medium shadow-[0_1px_2px_rgba(20,40,80,0.08)]" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-muted-foreground">
        当前选择：<span className="text-foreground font-medium">{formatPeriodLabel(value)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {quickByType[value.type].map((o) => {
          const active = value.value === o;
          return (
            <button
              key={o}
              onClick={() => onChange({ type: value.type, value: o })}
              className={`px-2.5 h-7 text-xs rounded border transition-colors ${active ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium" : "border-[var(--color-panel-border)] text-foreground hover:border-[var(--color-brand)]/50"}`}
            >
              {fmtQuick(o)}
            </button>
          );
        })}
        <Popover
          open={moreOpen}
          onOpenChange={(o) => {
            setMoreOpen(o);
            if (o) {
              const y =
                value.type === "year"
                  ? value.value
                  : value.value.slice(0, 4);
              setPopYear(y || "2026");
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              className="px-2.5 h-7 text-xs rounded border border-dashed border-[var(--color-panel-border)] text-muted-foreground hover:text-[var(--color-brand)] hover:border-[var(--color-brand)]/50 inline-flex items-center gap-1"
            >
              {moreLabel[value.type]}
              <ChevronDown className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[300px] p-3 space-y-3">
            {value.type === "year" ? (
              <div>
                <div className="text-[11px] text-muted-foreground mb-1.5">选择年份</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PERIOD_YEARS.map((y) => {
                    const active = value.value === y;
                    return (
                      <button
                        key={y}
                        onClick={() => selectAndClose({ type: "year", value: y })}
                        className={`h-8 text-xs rounded border transition-colors ${active ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium" : "border-[var(--color-panel-border)] text-foreground hover:border-[var(--color-brand)]/50"}`}
                      >
                        {yearLabel(y)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1.5">选择年份</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PERIOD_YEARS.map((y) => {
                      const active = popYear === y;
                      return (
                        <button
                          key={y}
                          onClick={() => setPopYear(y)}
                          className={`h-7 text-xs rounded border transition-colors ${active ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium" : "border-[var(--color-panel-border)] text-foreground hover:border-[var(--color-brand)]/50"}`}
                        >
                          {yearLabel(y)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="h-px bg-[var(--color-panel-border)]" />
                {value.type === "month" ? (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5">选择月份</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                        const mm = String(m).padStart(2, "0");
                        const v = `${popYear}-${mm}`;
                        const disabled = isMonthDisabled(popYear, m);
                        const active = value.value === v;
                        return (
                          <button
                            key={m}
                            disabled={disabled}
                            onClick={() => selectAndClose({ type: "month", value: v })}
                            className={`h-8 text-xs rounded border transition-colors ${
                              disabled
                                ? "border-[var(--color-panel-border)] text-muted-foreground/40 bg-[#F8FAFC] cursor-not-allowed"
                                : active
                                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
                                : "border-[var(--color-panel-border)] text-foreground hover:border-[var(--color-brand)]/50"
                            }`}
                          >
                            {mm}月
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5">选择季度</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((q) => {
                        const v = `${popYear}Q${q}`;
                        const disabled = isQuarterDisabled(popYear, q);
                        const active = value.value === v;
                        return (
                          <button
                            key={q}
                            disabled={disabled}
                            onClick={() => selectAndClose({ type: "quarter", value: v })}
                            className={`h-8 text-xs rounded border transition-colors ${
                              disabled
                                ? "border-[var(--color-panel-border)] text-muted-foreground/40 bg-[#F8FAFC] cursor-not-allowed"
                                : active
                                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
                                : "border-[var(--color-panel-border)] text-foreground hover:border-[var(--color-brand)]/50"
                            }`}
                          >
                            Q{q}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        统计周期用于确定当前查询数据所属期间，并影响趋势图展示粒度。
      </p>
    </div>
  );
}


function CustomRangePicker({ value, onChange }: { value: CustomRange; onChange: (r: CustomRange) => void }) {
  return (
    <div className="rounded-md bg-[#F5F8FC] border border-[var(--color-panel-border)] p-2.5 space-y-2.5">
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="text-xs text-foreground inline-flex items-center gap-1.5">
          自定义时间范围
          {value.enabled ? (
            <span className="inline-flex items-center h-4 px-1.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[10px]">已启用</span>
          ) : (
            <span className="inline-flex items-center h-4 px-1.5 rounded-full bg-[#EEF2F7] text-[#94A3B8] text-[10px]">未启用</span>
          )}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${value.enabled ? "bg-[var(--color-brand)]" : "bg-[#CBD5E1]"}`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value.enabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
        </button>
      </label>
      {value.enabled && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.start}
            placeholder="开始日期"
            className="flex-1 h-8 px-2 rounded border border-[var(--color-panel-border)] text-xs bg-card outline-none"
            onChange={(e) => onChange({ ...value, start: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">至</span>
          <input
            type="date"
            value={value.end}
            placeholder="结束日期"
            className="flex-1 h-8 px-2 rounded border border-[var(--color-panel-border)] text-xs bg-card outline-none"
            onChange={(e) => onChange({ ...value, end: e.target.value })}
          />
        </div>
      )}
      <p className="text-[11px] leading-relaxed" style={{ color: "#7B8AA1" }}>
        启用后，将覆盖上方快捷周期，并作为当前查询范围。
      </p>
    </div>
  );
}


function DimValuePicker({
  label,
  placeholder,
  unitLabel,
  options,
  selected,
  onToggle,
  onAll,
  searchable,
  emptyHint,
}: {
  label: string;
  placeholder: string;
  unitLabel: string; // 例如 "城市" / "项目" / "年份"
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onAll: () => void;
  searchable?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isAll = selected.length === 0;

  const summary = (() => {
    if (isAll) return placeholder;
    if (selected.length <= 3) return selected.join("、");
    return `${selected.slice(0, 3).join("、")}等 ${selected.length} 个${unitLabel}`;
  })();

  const filtered =
    searchable && search
      ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
      : options;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-20 shrink-0">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex-1 h-7 px-2 rounded border border-[var(--color-panel-border)] bg-card text-[11px] flex items-center justify-between gap-1 hover:border-[var(--color-brand)]/40 focus:outline-none focus:border-[var(--color-brand)]/60"
          >
            <span className={`truncate ${isAll ? "text-muted-foreground" : "text-foreground"}`}>
              {summary}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          {searchable && (
            <div className="px-2 pt-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`搜索${unitLabel}名称`}
                className="w-full h-7 px-2 rounded border border-[var(--color-panel-border)] bg-card text-[11px] focus:outline-none focus:border-[var(--color-brand)]/60"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                {emptyHint ?? "无可选项"}
              </div>
            ) : (
              <>
                <button
                  onClick={onAll}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-[12px] hover:bg-accent text-left"
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    {isAll && <Check className="h-3.5 w-3.5 text-[var(--color-brand)]" />}
                  </span>
                  <span className={isAll ? "text-[var(--color-brand)] font-medium" : "text-foreground"}>
                    全部
                  </span>
                </button>
                {filtered.map((o) => {
                  const active = selected.includes(o);
                  return (
                    <button
                      key={o}
                      onClick={() => onToggle(o)}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-[12px] hover:bg-accent text-left"
                    >
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        {active && <Check className="h-3.5 w-3.5 text-[var(--color-brand)]" />}
                      </span>
                      <span className={active ? "text-[var(--color-brand)]" : "text-foreground"}>
                        {o}
                      </span>
                    </button>
                  );
                })}
                {filtered.length === 0 && searchable && (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">无匹配{unitLabel}</div>
                )}
              </>
            )}
          </div>
          {!isAll && (
            <div className="border-t border-[var(--color-panel-border)] px-2 py-1.5 flex justify-end gap-2">
              <button
                onClick={onAll}
                className="h-6 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground"
              >
                清空
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-6 px-2.5 rounded text-[11px] bg-[var(--color-brand)] text-white hover:opacity-90"
              >
                确定
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ConfigPanel({

  selected,
  onSelectedChange,
  onConfigChange,
  selectedDataset,
  setSelectedDataset: _setSelectedDataset,
  dimKeys,
  setDimKeys,
  metricKeys,
  setMetricKeys,
  displayDimKeys,
  setDisplayDimKeys,
  dimValueFilters,
  setDimValueFilters,
  derivedMetrics,
  setDerivedMetrics,
  selectedDerivedKeys,
  setSelectedDerivedKeys,
  period,
  setPeriod,
  caliber,
  setCaliber,
  customRange,
  setCustomRange: _setCustomRange,
  bizTypes,
  setBizTypes,
  showBizDim,
  setShowBizDim,
  showToast,
}: {
  selected: string[];
  onSelectedChange: (v: string[]) => void;
  onConfigChange: () => void;
  selectedDataset: string;
  setSelectedDataset: (v: string) => void;
  dimKeys: string[];
  setDimKeys: React.Dispatch<React.SetStateAction<string[]>>;
  metricKeys: string[];
  setMetricKeys: React.Dispatch<React.SetStateAction<string[]>>;
  displayDimKeys: string[];
  setDisplayDimKeys: React.Dispatch<React.SetStateAction<string[]>>;
  dimValueFilters: Record<string, string[]>;
  setDimValueFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  derivedMetrics: DerivedMetric[];
  setDerivedMetrics: React.Dispatch<React.SetStateAction<DerivedMetric[]>>;
  selectedDerivedKeys: string[];
  setSelectedDerivedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  period: Period;
  setPeriod: (p: Period) => void;
  caliber: "全口径-权益" | "全口径";
  setCaliber: (v: "全口径-权益" | "全口径") => void;
  customRange: CustomRange;
  setCustomRange: (r: CustomRange) => void;
  bizTypes: string[];
  setBizTypes: (v: string[]) => void;
  showBizDim: boolean;
  setShowBizDim: (v: boolean) => void;
  showToast: (msg: string) => void;
}) {
  void _setSelectedDataset;
  void _setCustomRange;
  void customRange;

  const [displayMode, setDisplayMode] = useState<"summary" | "detail">("summary");
  const [detailGrain, setDetailGrain] = useState<"project" | "phase" | "building" | "room">("project");

  // 顶层一级模块：组织 / 周期 / 业态 / 更多配置（单一展开）
  const initialOpenKey = (() => {
    if (selected.length === 0) return "org";
    if (!period.value) return "period";
    return null;
  })();
  const [openKey, setOpenKey] = useState<string | null>(initialOpenKey);
  const openMap = {
    org: openKey === "org",
    period: openKey === "period",
    caliber: openKey === "caliber",
    biz: openKey === "biz",
    more: openKey === "more",
  };
  const toggleSection = (k: string) => setOpenKey((prev) => (prev === k ? null : k));

  // 「更多配置」内部分组：独立折叠
  const [moreOpen, setMoreOpen] = useState<{ dim: boolean; metric: boolean; sort: boolean }>(
    { dim: false, metric: false, sort: false },
  );
  const toggleMore = (k: keyof typeof moreOpen) => setMoreOpen((p) => ({ ...p, [k]: !p[k] }));



  const [aggMap, setAggMap] = useState<Record<string, AggMode>>(() => {
    const m: Record<string, AggMode> = {};
    DEFAULT_METRIC_KEYS.forEach((k) => {
      const it = ALL_METRICS.find((x) => x.key === k);
      if (it) m[k] = it.defaultAgg;
    });
    return m;
  });
  const [columnOrder, setColumnOrder] = useState<string[]>([
    ...DEFAULT_DISPLAY_DIM_KEYS,
    ...DEFAULT_METRIC_KEYS,
  ]);
  const [sortRules, setSortRules] = useState<SortRule[]>([{ field: "signed", dir: "desc" }]);

  const markDirty = onConfigChange;

  const toggleDim = (key: string) => {
    const caliberKeys = DIMENSION_GROUPS.find((g) => g.label === "统计口径")?.items.map((it) => it.key) ?? [];
    if (caliberKeys.includes(key)) {
      setDimKeys((prev) => {
        if (prev.includes(key)) return prev;
        return prev.filter((k) => !caliberKeys.includes(k)).concat(key);
      });
      markDirty();
      return;
    }
    setDimKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
    markDirty();
  };
  const toggleDimGroup = (g: { label: string; items: DimItem[] }) => {
    if (g.label === "统计口径") return;
    const all = g.items.every((it) => dimKeys.includes(it.key));
    if (all) {
      const remaining = dimKeys.filter((k) => !g.items.some((it) => it.key === k));
      const next = remaining.length ? remaining : [g.items[0].key];
      setDimKeys(next);
    } else {
      setDimKeys(Array.from(new Set([...dimKeys, ...g.items.map((it) => it.key)])));
    }
    markDirty();
  };

  const toggleDisplayDim = (key: string) => {
    setDisplayDimKeys((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        setColumnOrder((co) => co.filter((c) => c !== key));
        setSortRules((s) => s.filter((r) => r.field !== key));
        // 取消一级维度时，清空对应二级选择
        setDimValueFilters((p) => {
          if (!(key in p)) return p;
          const { [key]: _omit, ...rest } = p;
          return rest;
        });
        return next;
      }
      setColumnOrder((co) => {
        if (co.includes(key)) return co;
        let lastDimIdx = -1;
        co.forEach((c, i) => {
          if (DISPLAY_DIMS.some((d) => d.key === c)) lastDimIdx = i;
        });
        const next = [...co];
        next.splice(lastDimIdx + 1, 0, key);
        return next;
      });
      return [...prev, key];
    });
    markDirty();
  };

  // —— 二级选择：城市/项目/年份的具体值（默认"全部" = 未设置/空数组）——
  const orgCompanySet = useMemo(() => new Set(selected), [selected]);
  const cityValueOptions = useMemo(() => {
    const arr: string[] = [];
    CITY_HIERARCHY.forEach((g) =>
      g.companies.forEach((co) => {
        if (orgCompanySet.has(co.name)) co.cities.forEach((c) => arr.push(c.name));
      }),
    );
    return Array.from(new Set(arr));
  }, [orgCompanySet]);
  const projectValueOptions = useMemo(() => {
    const arr: string[] = [];
    CITY_HIERARCHY.forEach((g) =>
      g.companies.forEach((co) => {
        if (orgCompanySet.has(co.name))
          co.cities.forEach((c) => c.projects.forEach((p) => arr.push(p)));
      }),
    );
    return Array.from(new Set(arr));
  }, [orgCompanySet]);
  const yearValueOptions = DIM_VALUE_OPTIONS.ddim_year;

  const toggleDimValue = (dimKey: string, value: string) => {
    setDimValueFilters((prev) => {
      const cur = prev[dimKey] ?? [];
      const has = cur.includes(value);
      const next = has ? cur.filter((v) => v !== value) : [...cur, value];
      const out = { ...prev };
      if (next.length === 0) delete out[dimKey];
      else out[dimKey] = next;
      return out;
    });
    markDirty();
  };
  const selectDimAll = (dimKey: string) => {
    setDimValueFilters((prev) => {
      if (!(dimKey in prev)) return prev;
      const { [dimKey]: _omit, ...rest } = prev;
      return rest;
    });
    markDirty();
  };
  

  const toggleMetric = (key: string) => {
    setMetricKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((k) => k !== key);
        setColumnOrder((co) => co.filter((c) => c !== key));
        setAggMap((m) => {
          const { [key]: _omit, ...rest } = m;
          return rest;
        });
        setSortRules((s) => s.filter((r) => r.field !== key));
        return next;
      }
      const it = ALL_METRICS.find((x) => x.key === key);
      if (it) setAggMap((m) => ({ ...m, [key]: it.defaultAgg }));
      setColumnOrder((co) => (co.includes(key) ? co : [...co, key]));
      return [...prev, key];
    });
    markDirty();
  };
  const resetMetricsDefault = () => {
    setMetricKeys(DEFAULT_METRIC_KEYS);
    const m: Record<string, AggMode> = {};
    DEFAULT_METRIC_KEYS.forEach((k) => {
      const it = ALL_METRICS.find((x) => x.key === k);
      if (it) m[k] = it.defaultAgg;
    });
    setAggMap(m);
    setColumnOrder(Array.from(new Set([...displayDimKeys, ...DEFAULT_METRIC_KEYS])));
    markDirty();
  };
  const selectAllMetrics = () => {
    const keys = ALL_METRICS.map((m) => m.key);
    setMetricKeys(keys);
    setAggMap((prev) => {
      const next = { ...prev };
      ALL_METRICS.forEach((it) => {
        if (!next[it.key]) next[it.key] = it.defaultAgg;
      });
      return next;
    });
    setColumnOrder((co) => {
      const adds = keys.filter((k) => !co.includes(k));
      return [...co, ...adds];
    });
    markDirty();
  };
  const clearMetrics = () => {
    const first = ALL_METRICS[0].key;
    setMetricKeys([first]);
    setAggMap({ [first]: ALL_METRICS[0].defaultAgg });
    setColumnOrder((co) => co.filter((c) => displayDimKeys.includes(c) || c === first));
    setSortRules((s) => s.filter((r) => r.field === first || displayDimKeys.includes(r.field)));
    markDirty();
  };

  const setAgg = (key: string, mode: AggMode) => {
    setAggMap((m) => ({ ...m, [key]: mode }));
    markDirty();
  };
  const moveColumn = (idx: number, dir: -1 | 1) => {
    setColumnOrder((co) => {
      const next = [...co];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return co;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    markDirty();
  };
  const removeColumn = (key: string) => {
    if (DISPLAY_DIMS.some((d) => d.key === key)) toggleDisplayDim(key);
    else toggleMetric(key);
  };
  const addSortRule = () => {
    const allFields = [
      ...ALL_METRICS.map((m) => m.key),
      ...DISPLAY_DIMS.map((d) => d.key),
      ...ORG_ATTR_DIMS.map((d) => d.key),
    ].filter((f) => !sortRules.some((r) => r.field === f));
    if (!allFields.length) return;
    setSortRules((s) => [...s, { field: allFields[0], dir: "desc" }]);
    markDirty();
  };
  const updateSortRule = (idx: number, patch: Partial<SortRule>) => {
    setSortRules((s) => s.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    markDirty();
  };
  const removeSortRule = (idx: number) => {
    setSortRules((s) => s.filter((_, i) => i !== idx));
    markDirty();
  };

  const fieldName = (key: string) => {
    const dd = DISPLAY_DIMS.find((x) => x.key === key);
    if (dd) return dd.name;
    const org = ORG_ATTR_DIMS.find((x) => x.key === key);
    if (org) return org.name;
    const d = ALL_DIMS.find((x) => x.key === key);
    if (d) return d.name;
    const m = ALL_METRICS.find((x) => x.key === key);
    return m?.name ?? key;
  };

  // ---- 摘要文案 ----
  const orgSummary = (() => {
    if (selected.length === 0) return null;
    if (selected.length === ALL_COMPANIES.length) return "招商蛇口";
    const groups = CITY_GROUPS.filter((g) => g.companies.some((c) => selected.includes(c)));
    if (groups.length === 1) return groups[0].name;
    return `${groups.length} 个区域`;
  })();
  const bizRangeLabel = bizTypes.length === 0 ? "全部" : bizTypes.join(" / ");
  const bizSummary = showBizDim ? `${bizRangeLabel}｜展示业态` : bizRangeLabel;
  const moreSummary = "维度 / 指标 / 排序";

  const toggleBiz = (name: string) => {
    if (name === "__all__") {
      setBizTypes([]);
      markDirty();
      return;
    }
    const next = bizTypes.includes(name)
      ? bizTypes.filter((b) => b !== name)
      : [...bizTypes, name];
    setBizTypes(next);
    markDirty();
  };

  return (
    <div className="text-sm pt-2">
      {/* 组织范围 */}
      <CollapsibleSection
        icon={Network}
        title="组织范围"
        summary={
          orgSummary ?? (
            <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#FFF4E5] text-[#C2410C] text-[11px] border border-[#FED7AA]">待完善</span>
          )
        }
        open={openMap.org}
        onToggle={() => toggleSection("org")}
      >
        <OrgTree selected={selected} onChange={onSelectedChange} />
      </CollapsibleSection>

      {/* 统计周期 */}
      <CollapsibleSection
        icon={Calendar}
        title="统计周期"
        summary={
          period.value
            ? formatPeriodLabel(period)
            : <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#FFF4E5] text-[#C2410C] text-[11px] border border-[#FED7AA]">待完善</span>
        }
        open={openMap.period}
        onToggle={() => toggleSection("period")}
      >
        <PeriodPicker value={period} onChange={setPeriod} />
      </CollapsibleSection>

      {/* 统计口径 */}
      <CollapsibleSection
        icon={Scale}
        title="统计口径"
        summary={caliber}
        open={openMap.caliber}
        onToggle={() => toggleSection("caliber")}
      >
        <TooltipProvider delayDuration={100}>
          <div className="flex flex-wrap gap-1.5">
            {([
              { name: "全口径-权益", desc: "按公司权益比例折算后的货值统计。" },
              { name: "全口径", desc: "按项目全量货值统计。" },
            ] as const).map((c) => {
              const active = caliber === c.name;
              return (
                <Tooltip key={c.name}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setCaliber(c.name); markDirty(); }}
                      className={`h-7 px-3 rounded-full border text-xs inline-flex items-center gap-1 ${
                        active
                          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                          : "border-[var(--color-panel-border)] bg-card text-foreground hover:border-[var(--color-brand)]/40"
                      }`}
                    >
                      {c.name}
                      <Info className="w-3 h-3 opacity-60" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-[11px] leading-relaxed">
                    {c.desc}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CollapsibleSection>

      {/* 业态 */}
      <CollapsibleSection
        icon={Layers}
        title="业态"
        summary={bizSummary}
        open={openMap.biz}
        onToggle={() => toggleSection("biz")}
      >
        <div className="flex items-center gap-1.5 -mt-0.5 mb-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            用于筛选当前查询的业态范围。
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/70 hover:text-[var(--color-brand)]">
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-[11px] leading-relaxed">
                选择"全部"表示查询所有业态；如需在结果表中按业态拆分展示，请勾选下方"在结果中展示业态"。
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(() => {
            const allActive = bizTypes.length === 0;
            return (
              <button
                onClick={() => toggleBiz("__all__")}
                className={`h-7 px-3 rounded-full border text-xs ${
                  allActive
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                    : "border-[var(--color-panel-border)] bg-card text-foreground hover:border-[var(--color-brand)]/40"
                }`}
              >
                全部
              </button>
            );
          })()}
          {BIZ_TYPE_OPTIONS.map((name) => {
            const active = bizTypes.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleBiz(name)}
                className={`h-7 px-3 rounded-full border text-xs ${
                  active
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                    : "border-[var(--color-panel-border)] bg-card text-foreground hover:border-[var(--color-brand)]/40"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* 展示设置：是否在结果中展示业态 */}
        <div className="mt-3 pt-3 border-t border-[var(--color-panel-border)]">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-0.5 w-3.5 h-3.5 accent-[var(--color-brand)]"
              checked={showBizDim}
              onChange={(e) => setShowBizDim(e.target.checked)}
            />
            <span className="text-xs text-foreground leading-snug">
              在结果中展示业态
              <span className="block text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                勾选后，结果表格增加业态列，并按业态维度拆分展示。
              </span>
            </span>
          </label>
        </div>
      </CollapsibleSection>


      {/* 更多配置 */}
      <CollapsibleSection
        icon={Settings2}
        title="更多配置"
        summary={moreSummary}
        open={openMap.more}
        onToggle={() => toggleSection("more")}
      >
        <div className="space-y-1.5">
          {/* —— 分析维度 —— */}
          <SubGroup
            title="分析维度"
            count={`已选 ${displayDimKeys.length} 项`}
            open={moreOpen.dim}
            onToggle={() => toggleMore("dim")}
          >
            <div className="flex items-center gap-1 -mt-0.5 mb-2">
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                选择分析维度，并设置各维度的展示范围。
              </span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="说明"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[11px]">
                    业态拆分请在上方"业态"面板中控制。
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DISPLAY_DIMS.map((d) => {
                const active = displayDimKeys.includes(d.key);
                return (
                  <button
                    key={d.key}
                    onClick={() => toggleDisplayDim(d.key)}
                    className={`h-7 px-2.5 rounded-full border text-xs ${
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                        : "border-[var(--color-panel-border)] bg-card text-foreground hover:border-[var(--color-brand)]/40"
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>

            {/* —— 二级选择：当前维度的具体值 —— */}
            {displayDimKeys.length > 0 && (
              <div className="mt-3 space-y-3">
                {displayDimKeys.includes("ddim_city") && (
                  <DimValuePicker
                    label="城市范围"
                    placeholder="全部城市"
                    unitLabel="城市"
                    options={cityValueOptions}
                    selected={dimValueFilters["ddim_city"] ?? []}
                    onToggle={(v) => toggleDimValue("ddim_city", v)}
                    onAll={() => selectDimAll("ddim_city")}
                    emptyHint="当前组织范围内无城市"
                  />
                )}
                {displayDimKeys.includes("ddim_project") && (
                  <DimValuePicker
                    label="项目范围"
                    placeholder="全部项目"
                    unitLabel="项目"
                    options={projectValueOptions}
                    selected={dimValueFilters["ddim_project"] ?? []}
                    onToggle={(v) => toggleDimValue("ddim_project", v)}
                    onAll={() => selectDimAll("ddim_project")}
                    searchable
                    emptyHint="当前筛选条件下无项目"
                  />
                )}
                {displayDimKeys.includes("ddim_year") && (
                  <DimValuePicker
                    label="货值形成年份"
                    placeholder="全部年份"
                    unitLabel="年份"
                    options={yearValueOptions}
                    selected={dimValueFilters["ddim_year"] ?? []}
                    onToggle={(v) => toggleDimValue("ddim_year", v)}
                    onAll={() => selectDimAll("ddim_year")}
                  />
                )}
              </div>
            )}

            {displayDimKeys.length > 4 && (
              <div className="mt-2 px-2 py-1.5 rounded border border-amber-200 bg-amber-50 text-[11px] text-amber-700 leading-relaxed">
                已选择较多分析维度，表格行数可能增加，建议保留 2-4 个核心维度。
              </div>
            )}
          </SubGroup>

          {/* —— 指标选择 —— */}
          <SubGroup
            title="指标选择"
            count={`已选 ${metricKeys.length + selectedDerivedKeys.length} 项`}
            open={moreOpen.metric}
            onToggle={() => toggleMore("metric")}
          >
            <MetricPicker
              selected={metricKeys}
              onToggle={toggleMetric}
              onSelectAll={selectAllMetrics}
              onClear={clearMetrics}
              onReset={resetMetricsDefault}
              derivedMetrics={derivedMetrics}
              setDerivedMetrics={setDerivedMetrics}
              selectedDerivedKeys={selectedDerivedKeys}
              setSelectedDerivedKeys={setSelectedDerivedKeys}
              onAfterSave={() => {
                onConfigChange();
              }}
              showToast={showToast}
              datasetName={selectedDataset}
            />
          </SubGroup>


          {/* —— 排序配置 —— */}
          <SubGroup
            title="排序配置"
            count={`${sortRules.length} 条`}
            open={moreOpen.sort}
            onToggle={() => toggleMore("sort")}
          >
            <p className="text-[11px] text-muted-foreground -mt-0.5 mb-2">
              默认按签约货值降序展示，可按已选指标或分析维度调整排序。
            </p>
            <div className="space-y-2">
              {(() => {
                const r = sortRules[0] ?? { field: "signed", dir: "desc" as const };
                return (
                  <div className="flex items-center gap-2 p-2 rounded-md border border-[var(--color-panel-border)] bg-card">
                    <FieldSelect
                      value={r.field}
                      options={[
                        { value: "__header_metrics__", label: "指标字段", disabled: true },
                        ...ALL_METRICS.map((m) => ({ value: m.key, label: m.name })),
                        { value: "__header_dims__", label: "分析维度", disabled: true },
                        ...DISPLAY_DIMS.map((d) => ({ value: d.key, label: d.name })),
                        { value: "__header_org__", label: "组织归属字段", disabled: true },
                        ...ORG_ATTR_DIMS.map((d) => ({ value: d.key, label: d.name })),
                      ]}
                      onChange={(v) => updateSortRule(0, { field: v })}
                    />
                    <div className="inline-flex rounded-md border border-[var(--color-panel-border)] overflow-hidden shrink-0">
                      {(["asc", "desc"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => updateSortRule(0, { dir: d })}
                          className={`px-2 h-7 text-xs ${
                            r.dir === d
                              ? "bg-[var(--color-brand)] text-[var(--color-brand-foreground)]"
                              : "bg-card text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d === "asc" ? "升序" : "降序"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </SubGroup>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// 「更多配置」内部使用的轻量分组（独立折叠）
function SubGroup({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--color-panel-border)] bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 h-9 text-left transition-colors ${
          open ? "bg-[#EAF4FF]" : "hover:bg-[#F8FAFC]"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium text-foreground">{title}</span>
          {count && <span className="text-[11px] text-muted-foreground">{count}</span>}
        </span>
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-3 py-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function RadioCircle({ checked = false }: { checked?: boolean }) {
  return (
    <span
      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
        checked
          ? "border-[var(--color-brand)]"
          : "border-[var(--color-panel-border)] bg-card"
      }`}
    >
      {checked && (
        <span className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />
      )}
    </span>
  );
}

function DimensionPicker({
  selected,
  onToggle,
  onToggleGroup,
}: {
  selected: string[];
  onToggle: (k: string) => void;
  onToggleGroup: (g: { label: string; items: DimItem[] }) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    货值形成年份: true,
    统计口径: true,
    工程节点状态: true,
    货龄: true,
  });
  const groupState = (items: DimItem[]): "all" | "some" | "none" => {
    const n = items.filter((it) => selected.includes(it.key)).length;
    if (n === 0) return "none";
    if (n === items.length) return "all";
    return "some";
  };
  return (
    <div className="rounded-md border border-[var(--color-panel-border)] p-2 space-y-0.5">
      {DIMENSION_GROUPS.map((g) => {
        const open = expanded[g.label] ?? true;
        const state = groupState(g.items);
        const isSingle = g.label === "统计口径";
        return (
          <div key={g.label}>
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-brand-soft)]/40 cursor-pointer"
              onClick={() => setExpanded((p) => ({ ...p, [g.label]: !open }))}
            >
              {open ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              {!isSingle && (
                <span onClick={(e) => { e.stopPropagation(); onToggleGroup(g); }}>
                  <TriCheckBox state={state} />
                </span>
              )}
              {isSingle && <span className="w-4 h-4 shrink-0" />}
              <span className="text-foreground">{g.label}</span>
              <span
                className="inline-flex"
                title={g.desc}
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="w-3 h-3 text-muted-foreground hover:text-[var(--color-brand)]" />
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {isSingle ? "1 / 3" : `${g.items.filter((it) => selected.includes(it.key)).length} / ${g.items.length}`}
              </span>
            </div>
            {open &&
              g.items.map((it) => {
                const checked = selected.includes(it.key);
                return (
                  <div
                    key={it.key}
                    onClick={() => onToggle(it.key)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      checked ? "bg-[var(--color-brand-soft)]/50" : "hover:bg-[var(--color-brand-soft)]/20"
                    }`}
                    style={{ paddingLeft: 8 + 1 * 20 + 14 }}
                  >
                    {isSingle ? (
                      <RadioCircle checked={checked} />
                    ) : (
                      <CheckBox checked={checked} />
                    )}
                    <span className="text-foreground flex-1">{it.name}</span>
                    {isSingle && it.desc ? (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-help">
                              <Info className="w-3 h-3 text-muted-foreground hover:text-[var(--color-brand)]" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-[220px] bg-white text-[#1E293B] border border-[#E2E8F0] shadow-md text-[12px]"
                          >
                            <p>{it.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {it.type}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

function MetricPicker({
  selected,
  onToggle,
  onSelectAll,
  onClear,
  onReset,
  derivedMetrics,
  setDerivedMetrics,
  selectedDerivedKeys,
  setSelectedDerivedKeys,
  onAfterSave,
  showToast,
  datasetName,
}: {
  selected: string[];
  onToggle: (k: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onReset: () => void;
  derivedMetrics: DerivedMetric[];
  setDerivedMetrics: React.Dispatch<React.SetStateAction<DerivedMetric[]>>;
  selectedDerivedKeys: string[];
  setSelectedDerivedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  onAfterSave: () => void;
  showToast: (msg: string) => void;
  datasetName: string;
}) {
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    货值存量指标: true,
    销售流量指标: true,
    经营效能指标: false,
    风险预警指标: false,
    我的衍生指标: true,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DerivedMetric | null>(null);
  const [viewFormula, setViewFormula] = useState<DerivedMetric | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return METRIC_GROUPS.map((g) => ({ ...g, _items: g.items }));
    return METRIC_GROUPS
      .map((g) => ({ ...g, _items: g.items.filter((it) => it.name.toLowerCase().includes(kw)) }))
      .filter((g) => g._items.length > 0);
  }, [keyword]);

  const filteredDerived = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return derivedMetrics;
    return derivedMetrics.filter((d) => d.name.toLowerCase().includes(kw));
  }, [keyword, derivedMetrics]);

  const toggleDerived = (id: string) => {
    setSelectedDerivedKeys((prev) => {
      if (prev.includes(id)) {
        if (prev.length + selected.length <= 1) return prev;
        return prev.filter((k) => k !== id);
      }
      return [...prev, id];
    });
    onAfterSave();
  };

  const handleSave = (m: DerivedMetric, isEdit: boolean) => {
    setDerivedMetrics((prev) => {
      if (isEdit) return prev.map((x) => (x.id === m.id ? m : x));
      return [...prev, m];
    });
    if (!isEdit) {
      setSelectedDerivedKeys((p) => (p.includes(m.id) ? p : [...p, m.id]));
      showToast("衍生指标已创建并加入查询");
    } else {
      showToast("衍生指标已更新");
    }
    setDrawerOpen(false);
    setEditing(null);
    onAfterSave();
  };

  const handleCopy = (m: DerivedMetric) => {
    const dup: DerivedMetric = {
      ...m,
      id: `d_${Date.now()}`,
      name: `${m.name}_副本`,
      createdAt: Date.now(),
    };
    setDerivedMetrics((p) => [...p, dup]);
    setOpenMenuId(null);
    showToast("已复制衍生指标");
  };

  const handleDelete = (id: string) => {
    setDerivedMetrics((p) => p.filter((x) => x.id !== id));
    setSelectedDerivedKeys((p) => p.filter((k) => k !== id));
    setConfirmDeleteId(null);
    onAfterSave();
    showToast("衍生指标已删除");
  };

  return (
    <>
      <SearchInput placeholder="搜索指标名称" value={keyword} onChange={setKeyword} />
      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="flex items-center gap-3">
          <button onClick={onSelectAll} className="text-[var(--color-brand)] hover:underline">全选</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground">清空</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={onReset} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> 恢复默认
          </button>
        </div>
        <button
          onClick={() => { setEditing(null); setDrawerOpen(true); }}
          className="inline-flex items-center gap-1 px-2 h-7 rounded border border-dashed border-[var(--color-brand)]/60 text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
        >
          <Plus className="w-3 h-3" /> 衍生指标
        </button>
      </div>
      <div className="rounded-md border border-[var(--color-panel-border)] p-2 space-y-0.5 mt-2 max-h-[320px] overflow-auto">
        {filtered.length === 0 && filteredDerived.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">未找到匹配指标</div>
        ) : (
          <>
            {filtered.map((g) => {
              const open = expanded[g.label] ?? !!keyword;
              return (
                <div key={g.label}>
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-brand-soft)]/40 cursor-pointer"
                    onClick={() => setExpanded((p) => ({ ...p, [g.label]: !open }))}
                  >
                    {open ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-foreground">{g.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {g._items.filter((it) => selected.includes(it.key)).length} / {g._items.length}
                    </span>
                  </div>
                  {open &&
                    g._items.map((it) => {
                      const checked = selected.includes(it.key);
                      return (
                        <div
                          key={it.key}
                          onClick={() => onToggle(it.key)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            checked ? "bg-[var(--color-brand-soft)]/50" : "hover:bg-[var(--color-brand-soft)]/20"
                          }`}
                          style={{ paddingLeft: 8 + 14 + 4 }}
                        >
                          <CheckBox checked={checked} />
                          <span className="text-foreground flex-1">{highlightMatch(it.name, keyword)}</span>
                          <span className="relative shrink-0 group/info" onClick={(e) => e.stopPropagation()}>
                            <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-[var(--color-brand)]" />
                            <span className="hidden group-hover/info:block absolute right-0 top-5 z-30 w-56 p-2 rounded-md bg-foreground text-card text-[11px] leading-relaxed shadow-lg pointer-events-none">
                              {it.desc}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {/* 我的衍生指标 */}
            {(filteredDerived.length > 0 || !keyword) && (
              <div>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-brand-soft)]/40 cursor-pointer"
                  onClick={() => setExpanded((p) => ({ ...p, 我的衍生指标: !(expanded["我的衍生指标"] ?? true) }))}
                >
                  {(expanded["我的衍生指标"] ?? true) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-foreground">我的衍生指标</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {filteredDerived.filter((d) => selectedDerivedKeys.includes(d.id)).length} / {filteredDerived.length}
                  </span>
                </div>
                {(expanded["我的衍生指标"] ?? true) &&
                  filteredDerived.map((d) => {
                    const checked = selectedDerivedKeys.includes(d.id);
                    return (
                      <div
                        key={d.id}
                        className={`group/item relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                          checked ? "bg-[var(--color-brand-soft)]/50" : "hover:bg-[var(--color-brand-soft)]/20"
                        }`}
                        style={{ paddingLeft: 8 + 14 + 4 }}
                        onClick={() => toggleDerived(d.id)}
                      >
                        <CheckBox checked={checked} />
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold bg-[oklch(0.95_0.05_280)] text-[oklch(0.45_0.18_285)] shrink-0">fx</span>
                        <span className="text-foreground flex-1 truncate" title={`公式：${d.formula}`}>{highlightMatch(d.name, keyword)}</span>
                        <span className="relative shrink-0 group/fxinfo" onClick={(e) => e.stopPropagation()}>
                          <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-[var(--color-brand)]" />
                          <span className="hidden group-hover/fxinfo:block absolute right-0 top-5 z-30 w-56 p-2 rounded-md bg-foreground text-card text-[11px] leading-relaxed shadow-lg pointer-events-none">
                            <div className="font-semibold mb-1">{d.name}</div>
                            <div className="opacity-90">公式：{d.formula}</div>
                            {d.desc && <div className="opacity-70 mt-1">{d.desc}</div>}
                          </span>
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === d.id ? null : d.id); }}
                          className="w-6 h-6 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {openMenuId === d.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                            <div className="absolute right-1 top-8 z-20 w-32 rounded-md border border-[var(--color-panel-border)] bg-card shadow-lg overflow-hidden text-xs" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { setViewFormula(d); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"><Eye className="w-3 h-3" />查看公式</button>
                              <button onClick={() => { setEditing(d); setDrawerOpen(true); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"><Pencil className="w-3 h-3" />编辑指标</button>
                              <button onClick={() => handleCopy(d)} className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"><Copy className="w-3 h-3" />复制指标</button>
                              <button onClick={() => { setConfirmDeleteId(d.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-red-50 text-destructive inline-flex items-center gap-2"><Trash2 className="w-3 h-3" />删除指标</button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                {filteredDerived.length === 0 && !keyword && (
                  <div className="text-center text-[11px] text-muted-foreground py-3">
                    暂无衍生指标，点击右上角 <span className="text-[var(--color-brand)]">+ 衍生指标</span> 创建
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {drawerOpen && (
        <DerivedMetricDrawer
          initial={editing}
          datasetName={datasetName}
          onClose={() => { setDrawerOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {viewFormula && (
        <ViewFormulaModal metric={viewFormula} onClose={() => setViewFormula(null)} />
      )}

      {confirmDeleteId && (() => {
        const m = derivedMetrics.find((x) => x.id === confirmDeleteId);
        if (!m) return null;
        return (
          <ConfirmModal
            title="删除衍生指标"
            message={`确认删除衍生指标"${m.name}"？删除后不可恢复。`}
            confirmText="删除"
            danger
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={() => handleDelete(m.id)}
          />
        );
      })()}
    </>
  );
}

// ---------------- 衍生指标抽屉 ----------------
function DerivedMetricDrawer({
  initial,
  datasetName,
  onClose,
  onSave,
}: {
  initial: DerivedMetric | null;
  datasetName: string;
  onClose: () => void;
  onSave: (m: DerivedMetric, isEdit: boolean) => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<DerivedCategory>(initial?.category ?? "我的衍生指标");
  const [unit, setUnit] = useState<DerivedUnit>(initial?.unit ?? "%");
  const [decimals, setDecimals] = useState<0 | 1 | 2 | 4>(initial?.decimals ?? 2);
  const [desc, setDesc] = useState(initial?.desc ?? "");
  const [formula, setFormula] = useState(initial?.formula ?? "");
  const [validation, setValidation] = useState<{ ok: boolean; message?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const insert = (text: string) => {
    setFormula((f) => (f ? `${f} ${text}` : text));
    setValidation(null);
  };

  const doValidate = () => {
    const r = validateFormula(formula);
    setValidation(r.ok ? { ok: true, message: "公式校验通过" } : { ok: false, message: r.message });
  };

  const previewRows = useMemo(() => {
    if (!showPreview) return [];
    const r = validateFormula(formula);
    if (!r.ok) return [];
    const samples = [
      { city: "深圳公司", total: 199.96, signed: 16.23, subtotal: 99.4, achievedNoCert: 18, certNoSale: 42, doneNoSale: 39, signedArea: 8.4, unsoldArea: 50.2, avg12m: 4.5 },
      { city: "广州公司", total: 184.0, signed: 13.31, subtotal: 92.0, achievedNoCert: 15, certNoSale: 38, doneNoSale: 39, signedArea: 7.1, unsoldArea: 46.8, avg12m: 4.0 },
      { city: "佛山公司", total: 215.54, signed: 16.27, subtotal: 108.5, achievedNoCert: 19, certNoSale: 45, doneNoSale: 44, signedArea: 8.8, unsoldArea: 55.1, avg12m: 4.7 },
    ];
    return samples.map((s) => ({ ...s, derived: evalDerived(formula, s as any) }));
  }, [showPreview, formula]);

  const handleSave = () => {
    const r = validateFormula(formula);
    if (!r.ok) { setValidation({ ok: false, message: r.message }); return; }
    if (!name.trim()) { setValidation({ ok: false, message: "请填写指标名称" }); return; }
    const m: DerivedMetric = {
      id: initial?.id ?? `d_${Date.now()}`,
      name: name.trim(),
      category,
      dataset: datasetName,
      unit,
      decimals,
      desc: desc.trim() || undefined,
      formula,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    onSave(m, isEdit);
  };

  return (
    <div className="fixed inset-0 z-[55] flex" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div
        className="w-[560px] h-full bg-card border-l border-[var(--color-panel-border)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)] flex items-center justify-between">
          <h3 className="text-base font-semibold inline-flex items-center gap-2">
            <FunctionSquare className="w-4 h-4 text-[var(--color-brand)]" />
            {isEdit ? "编辑衍生指标" : "新建衍生指标"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* A. 基础信息 */}
          <section>
            <h4 className="text-sm font-semibold mb-3 text-foreground">基础信息</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="指标名称 *">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：货值去化率" className="w-full h-9 px-3 rounded-md border border-[var(--color-panel-border)] text-sm outline-none focus:border-[var(--color-brand)]" />
              </Field>
              <Field label="指标分类">
                <NativeSelect value={category} onChange={(v) => setCategory(v as DerivedCategory)} options={["经营效能指标", "风险预警指标", "我的衍生指标"]} />
              </Field>
              <Field label="适用数据集">
                <input disabled value={datasetName} className="w-full h-9 px-3 rounded-md border border-[var(--color-panel-border)] bg-secondary text-sm text-muted-foreground" />
              </Field>
              <Field label="单位">
                <NativeSelect value={unit} onChange={(v) => setUnit(v as DerivedUnit)} options={["亿元", "万㎡", "套", "%", "个月"]} />
              </Field>
              <Field label="小数位">
                <NativeSelect value={String(decimals)} onChange={(v) => setDecimals(Number(v) as any)} options={["0", "1", "2", "4"]} />
              </Field>
            </div>
            <Field label="指标说明" className="mt-3">
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="可选：描述该指标的业务含义" className="w-full px-3 py-2 rounded-md border border-[var(--color-panel-border)] text-sm outline-none focus:border-[var(--color-brand)] resize-none" />
            </Field>
          </section>

          {/* B. 公式编辑 */}
          <section>
            <h4 className="text-sm font-semibold mb-2 text-foreground">公式编辑</h4>
            <textarea
              value={formula}
              onChange={(e) => { setFormula(e.target.value); setValidation(null); }}
              rows={3}
              placeholder="例：签约金额 ÷ 总货值 × 100"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-panel-border)] text-sm font-mono outline-none focus:border-[var(--color-brand)] resize-none bg-[#FAFBFD]"
            />
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1.5">运算符</div>
              <div className="flex flex-wrap gap-1.5">
                {FORMULA_OPERATORS.map((op) => (
                  <button key={op} onClick={() => insert(op === "ROUND" ? "ROUND(" : op === "IF" ? "IF(" : op)} className="h-7 px-2.5 rounded-md border border-[var(--color-panel-border)] text-xs hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] bg-card">
                    {op}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1.5">可用指标（点击插入）</div>
              <div className="flex flex-wrap gap-1.5">
                {FORMULA_FIELDS.map((f) => (
                  <button key={f.key} onClick={() => insert(f.name)} className="h-7 px-2.5 rounded-md border border-[var(--color-panel-border)] text-xs hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] bg-card">
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* C. 校验 */}
          <section className="flex items-center gap-3">
            <button onClick={doValidate} className="h-8 px-3 rounded-md border border-[var(--color-panel-border)] text-xs hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 校验公式
            </button>
            {validation && (
              <span className={`text-xs inline-flex items-center gap-1 ${validation.ok ? "text-emerald-600" : "text-destructive"}`}>
                {validation.ok ? <CheckCircle2 className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                {validation.message}
              </span>
            )}
          </section>

          {/* D. 预览 */}
          <section>
            <button onClick={() => setShowPreview(true)} className="h-8 px-3 rounded-md border border-[var(--color-panel-border)] text-xs hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] inline-flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> 预览结果
            </button>
            {showPreview && previewRows.length > 0 && (
              <div className="mt-3 rounded-md border border-[var(--color-panel-border)] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#F1F5F9] text-[#475569]">
                    <tr>
                      <th className="text-left p-2">城市公司</th>
                      <th className="text-right p-2">总货值</th>
                      <th className="text-right p-2">签约金额</th>
                      <th className="text-right p-2 text-[var(--color-brand)]">{name || "衍生指标"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r) => (
                      <tr key={r.city} className="border-t border-[#EEF1F6]">
                        <td className="p-2">{r.city}</td>
                        <td className="p-2 text-right tabular-nums">{formatNumber(r.total, { thousand: false })}</td>
                        <td className="p-2 text-right tabular-nums">{formatNumber(r.signed, { thousand: false })}</td>
                        <td className="p-2 text-right tabular-nums text-[var(--color-brand)] font-semibold">{formatDerived(r.derived, unit, decimals)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showPreview && previewRows.length === 0 && (
              <div className="mt-3 text-xs text-destructive">公式校验未通过，请先修正公式</div>
            )}
          </section>
        </div>

        <div className="p-4 border-t border-[var(--color-panel-border)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">取消</button>
          <button onClick={handleSave} className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90">保存指标</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NativeSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 px-2 rounded-md border border-[var(--color-panel-border)] text-sm outline-none focus:border-[var(--color-brand)] bg-card">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ViewFormulaModal({ metric, onClose }: { metric: DerivedMetric; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[420px] bg-card rounded-xl border border-[var(--color-panel-border)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)] flex items-center justify-between">
          <h3 className="text-base font-semibold inline-flex items-center gap-2"><FunctionSquare className="w-4 h-4 text-[var(--color-brand)]" />查看公式</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div><span className="text-muted-foreground text-xs">指标名称</span><div className="text-foreground mt-0.5 font-medium">{metric.name}</div></div>
          <div><span className="text-muted-foreground text-xs">单位</span><div className="text-foreground mt-0.5">{metric.unit}</div></div>
          <div><span className="text-muted-foreground text-xs">公式</span><div className="mt-1 px-3 py-2 rounded-md bg-[#FAFBFD] border border-[var(--color-panel-border)] font-mono text-[13px]">{metric.formula}</div></div>
          {metric.desc && <div><span className="text-muted-foreground text-xs">说明</span><div className="text-foreground mt-0.5">{metric.desc}</div></div>}
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-panel-border)] flex justify-end">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm">关闭</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText = "确认", danger, onCancel, onConfirm }: { title: string; message: string; confirmText?: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[400px] bg-card rounded-xl border border-[var(--color-panel-border)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)]">
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <div className="p-5 text-sm text-foreground whitespace-pre-line">{message}</div>
        <div className="px-5 py-3 border-t border-[var(--color-panel-border)] flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm">取消</button>
          <button onClick={onConfirm} className={`px-4 h-9 rounded-md text-sm font-medium text-white ${danger ? "bg-destructive hover:opacity-90" : "bg-[var(--color-brand)] hover:opacity-90"}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function AggSelect({ value, onChange }: { value: AggMode; onChange: (v: AggMode) => void }) {
  const [open, setOpen] = useState(false);
  const cur = AGG_OPTIONS.find((o) => o.value === value) || AGG_OPTIONS[0];
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-7 px-2 rounded border border-[var(--color-panel-border)] text-xs flex items-center gap-1 text-foreground bg-card hover:border-[var(--color-brand)]"
      >
        {cur.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 min-w-[120px] rounded-md border border-[var(--color-panel-border)] bg-card shadow-lg overflow-hidden">
            {AGG_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-[var(--color-brand-soft)] ${
                  o.value === value ? "text-[var(--color-brand)]" : "text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FieldSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <div className="relative flex-1 min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full h-7 px-2 rounded border border-[var(--color-panel-border)] text-xs text-foreground bg-card hover:border-[var(--color-brand)] flex items-center justify-between"
      >
        <span className="truncate">{cur?.label ?? value}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 right-0 max-h-[260px] overflow-auto rounded-md border border-[var(--color-panel-border)] bg-card shadow-lg">
            {options.map((o) =>
              o.disabled ? (
                <div key={o.value} className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground bg-[#F8FAFC] sticky top-0">
                  {o.label}
                </div>
              ) : (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-[var(--color-brand-soft)] ${
                    o.value === value ? "text-[var(--color-brand)]" : "text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

function highlightMatch(text: string, keyword: string) {
  const kw = keyword.trim();
  if (!kw) return text;
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[var(--color-brand)] bg-[var(--color-brand-soft)] rounded px-0.5">
        {text.slice(idx, idx + kw.length)}
      </span>
      {text.slice(idx + kw.length)}
    </>
  );
}

function TreeRow({
  indent,
  expandable,
  expanded,
  children,
}: {
  indent: number;
  expandable?: boolean;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/60 cursor-pointer"
      style={{ paddingLeft: 8 + indent * 20 }}
    >
      {expandable ? (
        expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      {children}
    </div>
  );
}

function SearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full pl-9 pr-3 h-9 rounded-md border border-[var(--color-panel-border)] bg-card text-sm outline-none focus:border-[var(--color-brand)]"
      />
    </div>
  );
}

function MyTemplatePanel({
  bizTemplates,
  setBizTemplates,
  templateLogs,
  appendLog,
  showToast,
  activeTpl,
  onSelectTpl,
  onStartEditConfig,
  onResetActive,
  onSaveAsCopy,
}: {
  bizTemplates: BusinessTemplate[];
  setBizTemplates: React.Dispatch<React.SetStateAction<BusinessTemplate[]>>;
  templateLogs: Record<string, TplLog[]>;
  appendLog: (id: string, log: TplLog) => void;
  showToast: (msg: string) => void;
  activeTpl: BusinessTemplate;
  onSelectTpl: (id: string) => void;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  period: Period;
  setPeriod: (p: Period) => void;
  caliber: "全口径-权益" | "全口径";
  setCaliber: (v: "全口径-权益" | "全口径") => void;
  valueMode: "金额" | "面积";
  setValueMode: (v: "金额" | "面积") => void;
  bizTypes: string[];
  setBizTypes: (v: string[]) => void;
  onSwitchToConfig: () => void;
  onStartEditConfig: (t: BusinessTemplate) => void;
  onResetActive: () => void;
  onSaveAsCopy: (t: BusinessTemplate) => void;
}) {
  const otherTpls = bizTemplates.filter((t) => t.id !== activeTpl.id);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingTpl, setEditingTpl] = useState<BusinessTemplate | null>(null);
  const [deletingTpl, setDeletingTpl] = useState<BusinessTemplate | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const onDeleteRequest = (t: BusinessTemplate) => {
    if (t.recommended) {
      showToast("系统推荐模板不可删除。");
      return;
    }
    setDeletingTpl(t);
  };

  const CardMenu = ({ t, align = "right" }: { t: BusinessTemplate; align?: "right" | "left" }) => (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setMenuId(menuId === t.id ? null : t.id); }}
        className="w-7 h-7 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center"
        title="更多操作"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {menuId === t.id && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
          <div
            className={`absolute ${align === "right" ? "right-0" : "left-0"} top-8 z-20 w-36 rounded-md border border-[var(--color-panel-border)] bg-card shadow-lg overflow-hidden text-xs`}
            onClick={(e) => e.stopPropagation()}
          >
            {!t.recommended && (
              <button
                onClick={() => { setEditingTpl(t); setMenuId(null); }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"
              >
                <Pencil className="w-3 h-3" />编辑基本信息
              </button>
            )}
            <button
              onClick={() => { onStartEditConfig(t); setMenuId(null); }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"
            >
              <Settings2 className="w-3 h-3" />修改配置
            </button>
            <button
              onClick={() => { onSaveAsCopy(t); setMenuId(null); }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"
            >
              <Pencil className="w-3 h-3" />另存为新模板
            </button>
            {t.recommended && (
              <button
                onClick={() => { onResetActive(); setMenuId(null); }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"
              >
                <RotateCcw className="w-3 h-3" />恢复模板默认值
              </button>
            )}
            <button
              onClick={() => { onDeleteRequest(t); setMenuId(null); }}
              disabled={t.recommended}
              title={t.recommended ? "系统推荐模板不可删除" : ""}
              className="w-full text-left px-3 py-2 hover:bg-red-50 text-destructive inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Trash2 className="w-3 h-3" />删除模板
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="mt-2 text-sm space-y-4">
      {/* 当前选中模板卡片 */}
      <div className="relative rounded-lg border border-[var(--color-brand)]/40 bg-gradient-to-br from-[#F0F7FF] to-card p-4">
        <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r bg-[var(--color-brand)]" />
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {activeTpl.isDefault ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">默认</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium">当前模板</span>
            )}
          </div>
          <CardMenu t={activeTpl} />
        </div>
        <h3 className="mt-2 text-[15px] font-semibold text-foreground">{activeTpl.name}</h3>
        <dl className="mt-3 space-y-2 text-[12px]">
          <div className="grid grid-cols-[72px_1fr] gap-2">
            <dt className="text-muted-foreground pt-0.5">核心指标</dt>
            <dd className="text-foreground">
              {(() => {
                const tags = activeTpl.metrics.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
                const MAX = 6;
                const shown = tags.slice(0, MAX);
                const rest = tags.length - shown.length;
                return (
                  <div className="flex flex-wrap gap-1">
                    {shown.map((m) => (
                      <span key={m} className="text-[11px] leading-tight px-1.5 py-0.5 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)] whitespace-nowrap">{m}</span>
                    ))}
                    {rest > 0 && (
                      <span className="text-[11px] leading-tight px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap" title={tags.slice(MAX).join("、")}>+{rest}</span>
                    )}
                  </div>
                );
              })()}
            </dd>
          </div>
          <div className="grid grid-cols-[72px_1fr] gap-2">
            <dt className="text-muted-foreground">默认筛选</dt>
            <dd className="text-foreground">{activeTpl.filtersSummary}</dd>
          </div>
        </dl>
      </div>

      {/* 我的其他模板 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Layers className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            我的其他模板
          </div>
          <button
            onClick={() => setLogOpen(true)}
            className="text-[11px] text-muted-foreground hover:text-[var(--color-brand)] inline-flex items-center gap-1"
            title="查看我的模板操作日志"
          >
            <FileText className="w-3 h-3" />操作日志
          </button>
        </div>
        <div className="space-y-2">
          {otherTpls.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-md border border-[var(--color-panel-border)] bg-card p-3 hover:border-[var(--color-brand)]/60 hover:bg-[#F4F9FF] hover:shadow-sm transition-all cursor-pointer"
              onClick={() => onSelectTpl(t.id)}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)] shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate flex items-center gap-1.5">
                    {t.name}
                    {t.isDefault && <span className="text-[10px] px-1 rounded bg-amber-50 text-amber-700 border border-amber-200">默认</span>}
                    {t.recommended && <span className="text-[10px] px-1 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)]">推荐</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2" title={t.desc}>{t.desc}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground/80" title={t.metrics}>
                    核心指标 {t.metrics.split(/[、,，]/).filter(Boolean).length} 项
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <CardMenu t={t} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingTpl && (
        <EditBizTemplateModal
          tpl={editingTpl}
          onClose={() => setEditingTpl(null)}
          onSave={(patch) => {
            const prevDefault = !!editingTpl.isDefault;
            setBizTemplates((p) => p.map((x) => {
              if (x.id === editingTpl.id) return { ...x, ...patch };
              if (patch.isDefault) return { ...x, isDefault: false };
              return x;
            }));
            appendLog(editingTpl.id, { time: nowStr(), user: "当前用户", action: "编辑基本信息", change: `更新模板基本信息：${patch.name}` });
            if (patch.isDefault && !prevDefault) {
              appendLog(editingTpl.id, { time: nowStr(), user: "当前用户", action: "设为默认", change: `将「${patch.name}」设为默认模板` });
            }
            setEditingTpl(null);
            showToast("模板信息已更新");
          }}
        />
      )}

      {deletingTpl && (
        <ConfirmDeleteBizModal
          tpl={deletingTpl}
          onClose={() => setDeletingTpl(null)}
          onConfirm={() => {
            const id = deletingTpl.id;
            const name = deletingTpl.name;
            setBizTemplates((p) => p.filter((x) => x.id !== id));
            if (activeTpl.id === id) {
              const fallback = bizTemplates.find((x) => x.id !== id);
              if (fallback) onSelectTpl(fallback.id);
            }
            appendLog(id, { time: nowStr(), user: "当前用户", action: "删除模板", change: `删除模板：${name}` });
            setDeletingTpl(null);
            showToast("模板已删除");
          }}
        />
      )}

      {logOpen && (
        <TemplateLogDrawer
          templates={bizTemplates}
          logsByTpl={templateLogs}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  );
}


function nowStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function EditBizTemplateModal({
  tpl,
  onClose,
  onSave,
}: {
  tpl: BusinessTemplate;
  onClose: () => void;
  onSave: (patch: { name: string; desc: string; isDefault: boolean }) => void;
}) {
  const [name, setName] = useState(tpl.name);
  const [desc, setDesc] = useState(tpl.desc);
  const [isDefault, setIsDefault] = useState(!!tpl.isDefault);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[440px] bg-card rounded-xl border border-[var(--color-panel-border)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)] flex items-center justify-between">
          <h3 className="text-base font-semibold">编辑基本信息</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">模板名称 <span className="text-destructive">*</span></label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-[var(--color-panel-border)] bg-card text-sm outline-none focus:border-[var(--color-brand)]" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">模板说明</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--color-panel-border)] bg-card text-sm outline-none focus:border-[var(--color-brand)] resize-none" />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--color-brand)]" />
            设为默认模板
          </label>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-panel-border)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">取消</button>
          <button onClick={() => name.trim() && onSave({ name: name.trim(), desc, isDefault })} disabled={!name.trim()} className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40">保存</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteBizModal({ tpl, onClose, onConfirm }: { tpl: BusinessTemplate; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="w-[420px] bg-card rounded-lg shadow-xl border border-[var(--color-panel-border)] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground">确认删除模板？</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          将删除模板「{tpl.name}」。删除后不可恢复，但不会影响已查询的数据。
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">取消</button>
          <button onClick={onConfirm} className="px-4 h-9 rounded-md bg-destructive/90 hover:bg-destructive text-white text-sm font-medium">确认删除</button>
        </div>
      </div>
    </div>
  );
}

function TemplateLogDrawer({
  templates,
  logsByTpl,
  onClose,
}: {
  templates: BusinessTemplate[];
  logsByTpl: Record<string, TplLog[]>;
  onClose: () => void;
}) {
  const [tplFilter, setTplFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    templates.forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [templates]);
  const allLogs = useMemo(() => {
    const arr: Array<TplLog & { tplId: string; tplName: string }> = [];
    Object.entries(logsByTpl).forEach(([id, list]) => {
      list.forEach((l) => arr.push({ ...l, tplId: id, tplName: nameById[id] ?? id }));
    });
    return arr.sort((a, b) => (a.time < b.time ? 1 : -1));
  }, [logsByTpl, nameById]);
  const filtered = allLogs.filter((l) => {
    if (tplFilter !== "all" && l.tplId !== tplFilter) return false;
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    return true;
  });
  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute right-0 top-0 bottom-0 w-[460px] bg-card shadow-2xl border-l border-[var(--color-panel-border)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)] flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">我的模板操作日志</h3>
            <div className="mt-1 text-xs text-muted-foreground">查看当前账号下模板的创建、修改和删除记录</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-3 border-b border-[var(--color-panel-border)] grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground">模板</label>
            <select
              value={tplFilter}
              onChange={(e) => setTplFilter(e.target.value)}
              className="mt-1 w-full h-8 px-2 rounded-md border border-[var(--color-panel-border)] bg-card text-xs outline-none focus:border-[var(--color-brand)]"
            >
              <option value="all">我的全部模板</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">操作类型</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="mt-1 w-full h-8 px-2 rounded-md border border-[var(--color-panel-border)] bg-card text-xs outline-none focus:border-[var(--color-brand)]"
            >
              <option value="all">全部</option>
              {TPL_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">暂无操作日志</div>
          ) : (
            <ol className="relative border-l border-[#E2E8F0] ml-2 space-y-4">
              {filtered.map((l, i) => (
                <li key={i} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-[var(--color-brand)] border-2 border-card" />
                  <div className="text-[12px] text-muted-foreground tabular-nums">{l.time}</div>
                  <div className="mt-0.5 text-[13px] text-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[11px]">{l.action}</span>
                    <span className="text-foreground font-medium">{l.tplName}</span>
                  </div>
                  <div className="mt-1 text-[12px] text-[#475569] leading-relaxed">{l.change}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}



function TemplatesPanel({
  templates,
  setTemplates,
  showToast,
  onApply,
}: {
  templates: TemplateItem[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateItem[]>>;
  showToast: (msg: string) => void;
  onApply: (tpl: TemplateItem, query: boolean) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<"all" | "favorite">("all");
  const [expandedId, setExpandedId] = useState<string | null>(templates[0]?.id ?? null);
  const [activeId, setActiveId] = useState<string | null>(templates[0]?.id ?? null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameOf, setRenameOf] = useState<TemplateItem | null>(null);
  const [editingOf, setEditingOf] = useState<TemplateItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return templates.filter((t) => {
      if (category === "favorite" && !t.isFavorite) return false;
      if (!kw) return true;
      return (
        t.name.toLowerCase().includes(kw) ||
        t.dataset.toLowerCase().includes(kw) ||
        t.metricsSummary.toLowerCase().includes(kw)
      );
    });
  }, [templates, keyword, category]);

  return (
    <div className="mt-2 text-sm">
      <SearchInput placeholder="搜索模板名称 / 数据集 / 指标" value={keyword} onChange={setKeyword} />
      <div className="mt-3 inline-flex p-0.5 rounded-md bg-[#F1F4F9] border border-[var(--color-panel-border)] text-xs">
        {(["all", "favorite"] as const).map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 h-7 rounded ${active ? "bg-card text-[var(--color-brand)] font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c === "all" ? "全部" : "常用"}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5 mt-3">
        {list.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">未找到匹配模板</div>
        )}
        {list.map((t) => {
          const expanded = expandedId === t.id;
          const isActive = activeId === t.id;
          return (
            <div
              key={t.id}
              className={`relative rounded-md border bg-card transition-colors ${
                isActive
                  ? "border-[var(--color-brand)]/30 bg-[#F0F7FF]"
                  : "border-[#EEF1F6] hover:border-[var(--color-brand)]/30"
              }`}
            >
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-[var(--color-brand)]" />}
              <div
                className="px-4 py-3 cursor-pointer"
                onClick={() => { setActiveId(t.id); setExpandedId(expanded ? null : t.id); }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {expanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium text-foreground truncate">{t.name}</span>
                    {t.isDefault && <Pill color="brand">默认</Pill>}
                    {t.isRecent && <Pill color="amber">最近使用</Pill>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }}
                    className="w-6 h-6 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-1.5 ml-5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Pill color="slate">{t.datasetTag}</Pill>
                  <span>·</span>
                  <span>{t.dimCount}维 · {t.metricCount}标</span>
                  <span>·</span>
                  <span className="truncate">{t.scope}</span>
                </div>
                <div className="mt-1 ml-5 text-[12px] text-[#475569] truncate" title={t.metricsSummary}>
                  指标：{t.metricsSummary}
                </div>
              </div>

              {openMenuId === t.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                  <div className="absolute right-3 top-10 z-20 w-32 rounded-md border border-[var(--color-panel-border)] bg-card shadow-lg overflow-hidden text-xs" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setRenameOf(t); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"><Pencil className="w-3 h-3" />重命名</button>
                    <button onClick={() => {
                      const dup: TemplateItem = { ...t, id: `tpl_${Date.now()}`, name: `${t.name}_副本`, isDefault: false };
                      setTemplates((p) => [...p, dup]);
                      setOpenMenuId(null);
                      showToast("模板已复制");
                    }} className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"><Copy className="w-3 h-3" />复制模板</button>
                    <button onClick={() => {
                      setTemplates((p) => p.map((x) => ({ ...x, isDefault: x.id === t.id })));
                      setOpenMenuId(null);
                      showToast("已设为默认模板");
                    }} className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"><Star className="w-3 h-3" />设为默认</button>
                    <button onClick={() => { setEditingOf(t); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-soft)] inline-flex items-center gap-2"><Pencil className="w-3 h-3" />编辑模板</button>
                    <button onClick={() => { setConfirmDeleteId(t.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-red-50 text-destructive inline-flex items-center gap-2"><Trash2 className="w-3 h-3" />删除模板</button>
                  </div>
                </>
              )}

              {expanded && (
                <div className="px-4 pb-4 border-t border-[#EEF1F6] pt-3 ml-5 mr-2">
                  <dl className="space-y-1.5 text-[12px]">
                    {Object.entries(t.detail).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[64px_1fr] gap-2">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onApply(t, false)}
                      title="将该模板的数据集、组织范围、维度、指标等配置载入左侧查询配置区，但不会立即执行查询，便于你在查询前继续微调。"
                      className="flex-1 h-9 rounded-md border border-[var(--color-brand)] text-[var(--color-brand)] text-xs font-medium hover:bg-[var(--color-brand-soft)]"
                    >
                      应用配置
                    </button>
                    <button
                      onClick={() => onApply(t, true)}
                      title="载入该模板的全部配置，并立即执行一次查询，右侧重点指标、明细表格与趋势图表会同步刷新。"
                      className="flex-1 h-9 rounded-md bg-[var(--color-brand)] text-white text-xs font-medium hover:opacity-90"
                    >
                      应用并查询
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {renameOf && (
        <RenameModal
          initialName={renameOf.name}
          onCancel={() => setRenameOf(null)}
          onSave={(name) => {
            setTemplates((p) => p.map((x) => (x.id === renameOf.id ? { ...x, name } : x)));
            setRenameOf(null);
            showToast("已重命名");
          }}
        />
      )}

      {editingOf && (
        <EditTemplateModal
          template={editingOf}
          onCancel={() => setEditingOf(null)}
          onSave={(patch) => {
            setTemplates((p) => p.map((x) => (x.id === editingOf.id ? { ...x, ...patch } : (patch.isDefault ? { ...x, isDefault: false } : x))));
            setEditingOf(null);
            showToast("模板已更新");
          }}
        />
      )}

      {confirmDeleteId && (() => {
        const t = templates.find((x) => x.id === confirmDeleteId);
        if (!t) return null;
        return (
          <ConfirmModal
            title="删除模板"
            message={`确认删除模板"${t.name}"？\n删除后不可恢复。`}
            confirmText="删除"
            danger
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={() => {
              setTemplates((p) => p.filter((x) => x.id !== confirmDeleteId));
              setConfirmDeleteId(null);
              showToast("模板已删除");
            }}
          />
        );
      })()}
    </div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: "brand" | "amber" | "slate" }) {
  const cls = color === "brand"
    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
    : color === "amber"
    ? "bg-amber-50 text-amber-700 border border-amber-200"
    : "bg-secondary text-muted-foreground border border-[var(--color-panel-border)]";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${cls}`}>{children}</span>;
}

function RenameModal({ initialName, onCancel, onSave }: { initialName: string; onCancel: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(initialName);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[400px] bg-card rounded-xl border border-[var(--color-panel-border)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)]"><h3 className="text-base font-semibold">重命名模板</h3></div>
        <div className="p-5">
          <label className="text-xs text-muted-foreground">模板名称</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-[var(--color-panel-border)] text-sm outline-none focus:border-[var(--color-brand)]" />
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-panel-border)] flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm">取消</button>
          <button onClick={() => name.trim() && onSave(name.trim())} disabled={!name.trim()} className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium disabled:opacity-40">保存</button>
        </div>
      </div>
    </div>
  );
}

function EditTemplateModal({ template, onCancel, onSave }: { template: TemplateItem; onCancel: () => void; onSave: (patch: Partial<TemplateItem>) => void }) {
  const [name, setName] = useState(template.name);
  const [desc, setDesc] = useState(template.desc ?? "");
  const [isDefault, setIsDefault] = useState(!!template.isDefault);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[440px] bg-card rounded-xl border border-[var(--color-panel-border)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)]"><h3 className="text-base font-semibold">编辑模板</h3></div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">模板名称</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-[var(--color-panel-border)] text-sm outline-none focus:border-[var(--color-brand)]" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">模板说明</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--color-panel-border)] text-sm outline-none focus:border-[var(--color-brand)] resize-none" />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--color-brand)]" />
            设为默认模板
          </label>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-panel-border)] flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm">取消</button>
          <button onClick={() => name.trim() && onSave({ name: name.trim(), desc, isDefault })} disabled={!name.trim()} className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium disabled:opacity-40">保存</button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const steps = [
    { n: 1, title: "选择数据集", sub: "选择数据来源" },
    { n: 2, title: "配置查询", sub: "组织·维度·指标" },
    { n: 3, title: "运行查询", sub: "排序、分页、导出" },
  ];
  return (
    <div className="text-center max-w-3xl">
      <h1 className="text-2xl font-semibold text-foreground tracking-wide">
        请配置维度和指标，开始你的查询
      </h1>
      <p className="mt-4 text-muted-foreground text-sm">
        在左侧侧边栏选择数据集、组织范围、维度、指标，然后点击{" "}
        <span className="text-[var(--color-brand)] font-medium">查询数据</span> 即可在此处生成结果。
      </p>
      <div className="grid grid-cols-3 gap-5 mt-10">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-[var(--color-panel-border)] bg-card p-6 text-left shadow-[0_2px_12px_rgba(40,80,140,0.05)] hover:shadow-[0_4px_20px_rgba(40,80,140,0.1)] transition-shadow"
          >
            <div className="w-8 h-8 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold flex items-center justify-center text-sm">
              {s.n}
            </div>
            <div className="mt-4 font-semibold text-foreground">{s.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- 组织树（带交互） ----------------
function OrgTree({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    [CITY_GROUPS[0].name]: true,
  }));
  const [keyword, setKeyword] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [focusRow, setFocusRow] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return CITY_GROUPS.map((g) => {
      const companies = g.companies.filter((c) => {
        if (onlySelected && !selected.includes(c)) return false;
        if (!kw) return true;
        return c.toLowerCase().includes(kw) || g.name.toLowerCase().includes(kw);
      });
      const groupMatch = !kw || g.name.toLowerCase().includes(kw);
      return { name: g.name, companies, show: companies.length > 0 || (groupMatch && !onlySelected) };
    }).filter((g) => g.show);
  }, [keyword, onlySelected, selected]);

  const groupState = (g: { name: string; companies: string[] }): "all" | "some" | "none" => {
    const sel = g.companies.filter((c) => selected.includes(c)).length;
    if (sel === 0) return "none";
    if (sel === g.companies.length) return "all";
    return "some";
  };

  const toggleGroup = (g: { name: string; companies: string[] }) => {
    const state = groupState(g);
    if (state === "all") {
      onChange(selected.filter((c) => !g.companies.includes(c)));
    } else {
      const next = new Set(selected);
      g.companies.forEach((c) => next.add(c));
      onChange(Array.from(next));
    }
  };

  const toggleCompany = (c: string) => {
    if (selected.includes(c)) onChange(selected.filter((x) => x !== c));
    else onChange([...selected, c]);
  };

  const selectAll = () => onChange(ALL_COMPANIES);
  const clearAll = () => onChange([]);

  const highlight = (text: string) => {
    const kw = keyword.trim();
    if (!kw) return text;
    const idx = text.toLowerCase().indexOf(kw.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-[var(--color-brand)] bg-[var(--color-brand-soft)] rounded px-0.5">
          {text.slice(idx, idx + kw.length)}
        </span>
        {text.slice(idx + kw.length)}
      </>
    );
  };

  return (
    <>
      
      <SearchInput placeholder="搜索城市群 / 城市公司" value={keyword} onChange={setKeyword} />
      <div className="flex items-center gap-3 mt-2 text-xs">
        <button onClick={selectAll} className="text-[var(--color-brand)] hover:underline">全选</button>
        <span className="text-muted-foreground">·</span>
        <button onClick={clearAll} className="text-muted-foreground hover:text-foreground">清空</button>
        <span className="text-muted-foreground">·</span>
        <button
          onClick={() => setOnlySelected((v) => !v)}
          className={`hover:underline ${onlySelected ? "text-[var(--color-brand)] font-medium" : "text-muted-foreground"}`}
        >
          {onlySelected ? "✓ 仅看已选" : "仅看已选"}
        </button>
      </div>

      <div className="mt-2 rounded-md border border-[var(--color-panel-border)] p-2 space-y-0.5 max-h-[320px] overflow-auto">
        {(() => {
          const rootState: "all" | "some" | "none" =
            selected.length === 0
              ? "none"
              : selected.length === ALL_COMPANIES.length
                ? "all"
                : "some";
          const rootKey = "g:root";
          return (
            <div
              onMouseEnter={() => setFocusRow(rootKey)}
              onClick={() => {
                if (rootState === "all") clearAll();
                else selectAll();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                focusRow === rootKey ? "bg-[var(--color-brand-soft)]/60" : "hover:bg-[var(--color-brand-soft)]/40"
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span onClick={(e) => { e.stopPropagation(); if (rootState === "all") clearAll(); else selectAll(); }}>
                <TriCheckBox state={rootState} />
              </span>
              <span className="text-foreground text-sm font-medium">{highlight("招商蛇口")}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {selected.length} / {ALL_COMPANIES.length}
              </span>
            </div>
          );
        })()}
        {filteredGroups.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">未找到匹配组织</div>
        ) : (
          filteredGroups.map((g) => {
            const isExpanded = expanded[g.name] ?? false;
            const state = groupState(g);
            const rowKey = `g:${g.name}`;
            return (
              <div key={g.name}>
                <div
                  onMouseEnter={() => setFocusRow(rowKey)}
                  onClick={() => setExpanded((p) => ({ ...p, [g.name]: !isExpanded }))}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    focusRow === rowKey ? "bg-[var(--color-brand-soft)]/60" : "hover:bg-[var(--color-brand-soft)]/40"
                  }`}
                  style={{ paddingLeft: 8 + 20 }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span onClick={(e) => { e.stopPropagation(); toggleGroup(g); }}>
                    <TriCheckBox state={state} />
                  </span>
                  <span className="text-foreground text-sm">{highlight(g.name)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {g.companies.filter((c) => selected.includes(c)).length} / {g.companies.length}
                  </span>
                </div>
                {isExpanded &&
                  g.companies.map((c) => {
                    const checked = selected.includes(c);
                    const rk = `c:${c}`;
                    return (
                      <div
                        key={c}
                        onMouseEnter={() => setFocusRow(rk)}
                        onClick={() => toggleCompany(c)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                          checked
                            ? "bg-[var(--color-brand-soft)]/50"
                            : focusRow === rk
                              ? "bg-[var(--color-brand-soft)]/30"
                              : "hover:bg-[var(--color-brand-soft)]/20"
                        }`}
                        style={{ paddingLeft: 8 + 2 * 20 + 14 }}
                      >
                        <CheckBox checked={checked} />
                        <span className="text-foreground text-sm">{highlight(c)}</span>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function TriCheckBox({ state }: { state: "all" | "some" | "none" }) {
  return (
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
        state === "none"
          ? "border-[var(--color-panel-border)] bg-card"
          : "bg-[var(--color-brand)] border-[var(--color-brand)]"
      }`}
    >
      {state === "all" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      {state === "some" && <Minus className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );
}

// ---------------- 保存模板弹窗 ----------------
function SaveTemplateModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (data: { name: string; desc: string; isDefault: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-[440px] bg-card rounded-xl border border-[var(--color-panel-border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)] flex items-center justify-between">
          <h3 className="text-base font-semibold">保存为新模板</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">模板名称 <span className="text-destructive">*</span></label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：4月房间维度货值"
              className="mt-1 w-full h-9 px-3 rounded-md border border-[var(--color-panel-border)] bg-card text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">模板说明</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="可选：描述该模板的用途"
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--color-panel-border)] bg-card text-sm outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--color-brand)]" />
            设为默认模板
          </label>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-panel-border)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-[var(--color-panel-border)] text-sm text-muted-foreground hover:text-foreground">取消</button>
          <button
            onClick={() => name.trim() && onSaved({ name: name.trim(), desc, isDefault })}
            disabled={!name.trim()}
            className="px-4 h-9 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default Index;
