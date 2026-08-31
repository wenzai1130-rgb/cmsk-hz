import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Building,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  History,
  Info,
  MapPin,
  Search,
  Settings2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { ORG_TREE } from "@/components/filters/home-filters";
import "./styles.css";
import "./layout-overrides.css";

type Model = "new" | "stock";
type Project = { name: string; area: string; open: string; rate: string; remaining: string };
type RecordItem = {
  id: string;
  model: Model;
  project: string;
  created: string;
  result: string;
  params?: string;
};

function displayRecordResult(item: RecordItem) {
  if (item.model !== "new") return item.result.replace(/\s*[·；]\s*区间.*$/, "");
  if (item.result.includes("低去化")) return "低去化";
  if (item.result.includes("高去化")) return "高去化";
  return "中去化";
}

const projects: Project[] = [
  {
    name: "观潮府",
    area: "宝安区新安街道",
    open: "2026-10-18",
    rate: "0.00%",
    remaining: "28.60亿元",
  },
  {
    name: "四海名邸",
    area: "南山区招商街道",
    open: "2025-05-18",
    rate: "68.40%",
    remaining: "9.05亿元",
  },
  {
    name: "深圳三联",
    area: "龙华区龙华街道",
    open: "2026-03-12",
    rate: "31.20%",
    remaining: "16.80亿元",
  },
  {
    name: "雍云府",
    area: "龙岗区坂田街道",
    open: "2025-12-06",
    rate: "45.60%",
    remaining: "12.30亿元",
  },
  {
    name: "玺悦台",
    area: "光明区凤凰街道",
    open: "2026-06-22",
    rate: "18.20%",
    remaining: "21.40亿元",
  },
];
const newFeatures = [
  ["板块历史去化率中位", "板块能级", "0.160"],
  ["城市供销比", "供销压力", "0.090"],
  ["项目相对竞品价格差", "价格竞争", "0.050"],
  ["开盘前客户转化率", "蓄客效能", "0.044"],
];
const stockFeatures = [
  ["近三月签约套数趋势", "项目历史销售走势", "0.182"],
  ["到访转认购率", "项目蓄客转化效率", "0.126"],
  ["月份及淡旺季标识", "市场时间周期", "0.093"],
  ["全国及城市销售指数", "全国及城市楼市大盘行情", "0.071"],
  ["项目价格偏离度", "项目定价与估值匹配度", "0.058"],
];
const businessOptions = [
  { key: "住宅", enabled: true },
  { key: "商业", enabled: true },
  { key: "公寓", enabled: true },
  { key: "写字楼", enabled: true },
  { key: "车位", enabled: true },
];

function projectInfo(project: Project, model: Model) {
  const totalUnits = 1286;
  const unsoldUnits = 407;
  const soldRate = `${(((totalUnits - unsoldUnits) / totalUnits) * 100).toFixed(2)}%`;
  return [
    ["项目名称", project.name],
    ["项目类型", `住宅 · ${model === "new" ? "新盘" : "持销盘"}`],
    ["项目地址", `深圳市${project.area}`],
    ["装修标准", "精装"],
    ["开盘时间", project.open],
    ["项目去化率", soldRate],
    ["剩余货值", model === "new" ? project.remaining : "9.05亿元"],
    ["销售均价", "78,000元/㎡"],
    ["总套数", `${totalUnits.toLocaleString()}套`],
    ["未售套数", `${unsoldUnits}套`],
  ];
}

function ForecastDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(`${value}T00:00:00`));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from(
    { length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() },
    (_, i) => i + 1,
  );
  const leading = first.getDay();
  const selectDay = (day: number) => {
    const selected = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(selected);
    setOpen(false);
  };
  return (
    <div className="relative parameter-date-picker">
      <button
        type="button"
        className="parameter-date"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{value.replaceAll("-", "/")}</span>
        <CalendarDays className="w-4 h-4" />
      </button>
      {open && (
        <div className="forecast-calendar">
          <div className="calendar-head">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              <ChevronLeft />
            </button>
            <strong>
              {month.getFullYear()}年{month.getMonth() + 1}月
            </strong>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              <ChevronRight />
            </button>
          </div>
          <div className="calendar-week">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: leading }, (_, i) => (
              <span className="calendar-empty" key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const selected =
                value ===
                `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              return (
                <button
                  type="button"
                  className={selected ? "selected" : ""}
                  key={day}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="calendar-today"
            onClick={() => {
              const today = new Date();
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              selectDay(today.getDate());
            }}
          >
            今天
          </button>
        </div>
      )}
    </div>
  );
}

const infoMetricKeys = new Set([
  "项目名称",
  "项目去化率",
  "剩余货值",
  "销售均价",
  "总套数",
  "未售套数",
]);

function MetricHelp({ label }: { label: string }) {
  const content = label.includes("去化")
    ? "低去化：累计去化率 <20%；中去化：累计去化率 20%-80%；高去化：累计去化率 >=80%。"
    : label === "AUC值"
      ? "AUC：衡量模型整体区分正负样本能力，值域0-1，越接近1判别效果越好。"
      : "KS：衡量好坏样本最大分离度，值越大两类样本区分拉开程度越强。";
  return (
    <span className="metric-help">
      <button type="button" aria-label={`${label}说明`}>
        <HelpCircle />
      </button>
      <span className="metric-help-popover">
        <strong>{label}说明</strong>
        <span>{content}</span>
      </span>
    </span>
  );
}

export default function SalesForecast() {
  const [model, setModel] = useState<Model>("new");
  const [project, setProject] = useState(projects[0]);
  const [projectOpen, setProjectOpen] = useState(false);
  const projectPickerRef = useRef<HTMLLabelElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [orgExpanded, setOrgExpanded] = useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries((ORG_TREE.children ?? []).map((group) => [group.name, true])),
    深圳公司: true,
  }));
  const [businessType, setBusinessType] = useState("住宅");
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("78000");
  const [layout, setLayout] = useState("89㎡ 三房两厅");
  const [finish, setFinish] = useState("精装");
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [opening, setOpening] = useState("2026-10-18");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(false);
  const [coreFeaturesExpanded, setCoreFeaturesExpanded] = useState(false);
  const [history, setHistory] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  const features = useMemo(() => (model === "new" ? newFeatures : stockFeatures), [model]);
  const title = model === "new" ? "新盘去化分类预测" : "存盘短期销量预测";

  useEffect(() => {
    try {
      const storedRecords = JSON.parse(
        localStorage.getItem("sales-forecast-records") || "[]",
      ) as RecordItem[];
      setRecords(
        storedRecords.map((item) => ({
          ...item,
          result: displayRecordResult(item),
        })),
      );
    } catch {
      setRecords([]);
    }
  }, []);
  useEffect(() => {
    setResult(false);
    setCoreFeaturesExpanded(false);
  }, [model]);
  useEffect(() => {
    setRecordPage(1);
  }, [project.name]);
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);
  useEffect(() => {
    if (!projectOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!projectPickerRef.current?.contains(event.target as Node)) setProjectOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [projectOpen]);
  function saveRecord(item: RecordItem) {
    const next = [item, ...records].slice(0, 20);
    setRecords(next);
    localStorage.setItem("sales-forecast-records", JSON.stringify(next));
  }
  async function runPrediction() {
    setLoading(true);
    setResult(false);
    await new Promise((resolve) => setTimeout(resolve, 650));
    setLoading(false);
    setResult(true);
    saveRecord({
      id: crypto.randomUUID(),
      model,
      project: project.name,
      created: new Date().toISOString(),
      result: model === "new" ? "中去化" : "下月46套",
      params:
        model === "new"
          ? `销售单价 ${Number(price).toLocaleString()} 元/㎡ · 开盘 ${opening.replaceAll("-", "/")}`
          : `销售单价 ${Number(price).toLocaleString()} 元/㎡`,
    });
  }
  function exportResult() {
    const rows = [
      ["项目", project.name],
      ["模型", title],
      ["销售单价", price],
      ["预测结果", model === "new" ? "前三月累计中去化" : "下月46套"],
      ...features.map(([name, category, iv]) => [`影响特征-${name}`, `${category} / ${model === "new" ? "SHAP值" : "IV值"} ${iv}`]),
    ];
    const csv =
      "\uFEFF" +
      rows.map((row) => row.map((v) => `"${v.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name}-${title}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  const filtered = projects.filter((item) => item.name.includes(query.trim()));
  const resultMetrics =
    model === "new"
      ? [["前三月累计去化档位", "中去化", "中去化：累计去化率20%-80%"]]
      : [["下月销售套数", "46套", ""]];
  const projectRecords = records.filter((item) => item.project === project.name && item.model === model);
  const recordPageCount = Math.max(1, Math.ceil(projectRecords.length / 10));
  const visibleProjectRecords = projectRecords.slice((recordPage - 1) * 10, recordPage * 10);

  return (
    <div className="forecast-page">
      <HeaderNav activeKey="sales-forecast" />
      <main className="forecast-layout">
        <aside className="forecast-sidebar">
          <div className="forecast-sidebar-title">预测模型</div>
          <button
            className={`model-tab ${model === "new" ? "active" : ""}`}
            onClick={() => setModel("new")}
          >
            <span className="model-mark">新</span>
            <span>
              <b>新盘去化分类预测</b>
              <small>开盘前去化档位预判</small>
            </span>
          </button>
          <button
            className={`model-tab ${model === "stock" ? "active" : ""}`}
            onClick={() => setModel("stock")}
          >
            <span className="model-mark">存</span>
            <span>
              <b>存盘短期销量预测</b>
              <small>在售项目下月销量</small>
            </span>
          </button>
          <div className="sidebar-divider" />
          <button className="sidebar-history" onClick={() => setHistory(true)}>
            <History />
            预测记录 <b>{records.length || 12}</b>
          </button>
        </aside>
        <section className="forecast-content">
          <div className="forecast-heading">
            <div className="forecast-title-group">
              <span className="forecast-title-mark" aria-hidden="true" />
              <div>
                <h1>{title}</h1>
                <p>
                  {model === "new"
                    ? "通过项目定位与市场特征，预判前三月累计去化档位"
                    : "基于项目近期表现与市场周期，预测下一自然月签约套数"}
                </p>
              </div>
            </div>
            <span className="forecast-status">
              <i />
              模型服务正常
            </span>
          </div>
          <section className="forecast-card forecast-filter">
            <label className="forecast-biz-picker">
              <span>业态筛选</span>
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={businessTypeOpen}
                  onClick={() => setBusinessTypeOpen((open) => !open)}
                  onBlur={() => setTimeout(() => setBusinessTypeOpen(false), 180)}
                  className="h-9 px-3 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-sm font-medium flex items-center gap-2 min-w-[110px] hover:bg-white transition-colors"
                >
                  <span className="flex-1 text-left">{businessType}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {businessTypeOpen && (
                  <div className="absolute left-0 top-full mt-1 w-[200px] rounded-md border border-[#E2E8F0] bg-white shadow-xl z-30 py-1">
                    {businessOptions.map((option) => {
                      const active = option.key === businessType;
                      return (
                        <button
                          type="button"
                          key={option.key}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setBusinessType(option.key);
                            setBusinessTypeOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[var(--color-brand-soft)] ${active ? "text-[var(--color-brand)] font-medium" : "text-foreground"}`}
                        >
                          <span className="flex items-center gap-1.5">
                            {active && <Check className="w-3.5 h-3.5" />}
                            <span className={active ? "" : "ml-5"}>{option.key}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>
            <label ref={projectPickerRef} className="project-picker">
              <span>项目筛选</span>
              <button
                type="button"
                aria-expanded={projectOpen}
                onClick={() => setProjectOpen(!projectOpen)}
              >
                <span>招商蛇口　→　南部城市群组　→　深圳公司　→　{project.name}</span>
                <ChevronDown />
              </button>
              {projectOpen && (
                <div className="project-popover">
                  <div className="project-search">
                    <Search />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索项目名称"
                    />
                  </div>
                  <div className="org-tree-root">
                    <Building />
                    <span>{ORG_TREE.name}</span>
                  </div>
                  {ORG_TREE.children?.map((group) => {
                    const groupOpen = orgExpanded[group.name] ?? false;
                    return (
                      <div key={group.name}>
                        <div
                          className="org-tree-group"
                          onClick={() =>
                            setOrgExpanded((current) => ({ ...current, [group.name]: !groupOpen }))
                          }
                        >
                          <span>
                            {groupOpen ? <ChevronDown /> : <ChevronRight />}
                            <span className="org-tree-dot" />
                            {group.name}
                          </span>
                        </div>
                        {groupOpen &&
                          group.children?.map((company) => {
                            const companyName =
                              typeof company === "string" ? company : company.name;
                            const companyOpen = orgExpanded[companyName] ?? false;
                            const hasProjects = companyName === "深圳公司";
                            return (
                              <div key={companyName}>
                                <div
                                  className={`org-tree-company ${hasProjects ? "has-children" : ""}`}
                                  onClick={() =>
                                    hasProjects &&
                                    setOrgExpanded((current) => ({
                                      ...current,
                                      [companyName]: !companyOpen,
                                    }))
                                  }
                                >
                                  <span>
                                    {hasProjects ? (
                                      companyOpen ? (
                                        <ChevronDown />
                                      ) : (
                                        <ChevronRight />
                                      )
                                    ) : (
                                      <span className="org-tree-indent" />
                                    )}
                                    <span className="org-tree-dot" />
                                    {companyName}
                                  </span>
                                  {hasProjects && (
                                    <span className="org-tree-count">{filtered.length} 个项目</span>
                                  )}
                                </div>
                                {hasProjects && companyOpen && (
                                  <div className="org-tree-projects">
                                    {filtered.map((item) => (
                                      <button
                                        type="button"
                                        className={item.name === project.name ? "selected" : ""}
                                        key={item.name}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => {
                                          setProject(item);
                                          setOpening(item.open);
                                          setProjectOpen(false);
                                          setQuery("");
                                        }}
                                      >
                                        <MapPin />
                                        <span>{item.name}</span>
                                        {item.name === project.name && <Check />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              )}
            </label>
          </section>
          <section className="forecast-card forecast-info">
            <div className="forecast-card-title">
              <h2>
                <BarChart3 />
                项目基本信息
              </h2>
              <span>项目编码：SZ-{String(projects.indexOf(project) + 1).padStart(3, "0")}</span>
            </div>
            <div className="info-grid">
              {projectInfo(project, model).map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <b className={infoMetricKeys.has(key) ? "metric-value" : "static-value"}>
                    {value}
                  </b>
                </div>
              ))}
            </div>
          </section>
          <div className="forecast-work">
            <section className="forecast-card parameter-card">
              <div className="forecast-card-title">
                <div>
                  <h2>
                    <Settings2 />
                    预测参数调整
                  </h2>
                  <p>修改内容仅用于本次模拟，不影响项目主数据</p>
                </div>
                <em>* 必填</em>
              </div>
              <div className="parameter-grid">
                <label>
                  <span>销售单价（元/㎡）</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                </label>
                {model === "new" && (
                  <>
                    <label className="parameter-picker">
                      <span>主力户型</span>
                      <div className="relative">
                        <button
                          type="button"
                          aria-expanded={layoutOpen}
                          onClick={() => setLayoutOpen((open) => !open)}
                          onBlur={() => setTimeout(() => setLayoutOpen(false), 180)}
                          className="parameter-picker-trigger"
                        >
                          <span>{layout}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {layoutOpen && (
                          <div className="parameter-picker-menu">
                            {["89㎡ 三房两厅", "105㎡ 三房两厅", "125㎡ 四房两厅"].map((option) => (
                              <button
                                type="button"
                                key={option}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setLayout(option);
                                  setLayoutOpen(false);
                                }}
                                className={layout === option ? "active" : ""}
                              >
                                {layout === option && <Check className="w-3.5 h-3.5" />}
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                    <label className="parameter-picker">
                      <span>装修标准</span>
                      <div className="relative">
                        <button
                          type="button"
                          aria-expanded={finishOpen}
                          onClick={() => setFinishOpen((open) => !open)}
                          onBlur={() => setTimeout(() => setFinishOpen(false), 180)}
                          className="parameter-picker-trigger"
                        >
                          <span>{finish}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {finishOpen && (
                          <div className="parameter-picker-menu">
                            {["精装", "简装", "毛坯"].map((option) => (
                              <button
                                type="button"
                                key={option}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setFinish(option);
                                  setFinishOpen(false);
                                }}
                                className={finish === option ? "active" : ""}
                              >
                                {finish === option && <Check className="w-3.5 h-3.5" />}
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                    <label>
                      <span>计划开盘时间</span>
                      <ForecastDatePicker value={opening} onChange={setOpening} />
                    </label>
                  </>
                )}
              </div>
              <div className="forecast-tip">
                <Info /> 参数变化越大，预测不确定性可能越高，结果中将同步展示影响特征。
              </div>
              <button className="primary-button" disabled={loading} onClick={runPrediction}>
                <Sparkles />
                {loading ? "模型计算中…" : "开始预测"}
              </button>
            </section>
            <section className="forecast-card overview-card">
              <div className="forecast-card-title">
                <h2>
                  <Target />
                  模型概览
                </h2>
                <span className="ready-tag">已就绪</span>
              </div>
              {model === "new" ? (
                <div className="overview-metrics">
                  <div className="accuracy">
                    <span>模型综合准确率</span>
                    <b>92.7%</b>
                  </div>
                  <div className="accuracy overview-auc">
                    <span className="overview-metric-label">AUC值 <MetricHelp label="AUC值" /></span>
                    <b>0.85</b>
                  </div>
                </div>
              ) : (
                <div className="accuracy">
                  <span>模型综合准确率</span>
                  <b>95.0%</b>
                </div>
              )}
              <dl>
                <div>
                  <dt>应用场景</dt>
                  <dd>
                    {model === "new"
                      ? "项目开盘前去化档位预判，提前预测前三月累计去化水平"
                      : "已开盘存量项目，预测下月签约套数"}
                  </dd>
                </div>
                <div>
                  <dt>预测目标</dt>
                  <dd>{model === "new" ? "提前识别高 / 中 / 低去化项目" : "预测下月销售套数"}</dd>
                </div>
                <div>
                  <dt>模型方法</dt>
                  <dd>{model === "new" ? "多模型集成投票" : "XGBoost"}</dd>
                </div>
              </dl>
              {(model === "new" || model === "stock") && (
                <button
                  type="button"
                  className="feature-toggle-button"
                  onClick={() => setCoreFeaturesExpanded((expanded) => !expanded)}
                >
                  {coreFeaturesExpanded ? "收起核心特征" : "展开核心特征"}
                </button>
              )}
              {coreFeaturesExpanded && (
                <div className="overview-feature-section">
                  <div className="forecast-card-title">
                    <h2>
                      <BarChart3 />
                      影响结果的核心特征
                    </h2>
                    <span className="ready-tag">{model === "new" ? "SHAP值" : "IV值"}</span>
                  </div>
                  <div className="feature-table">
                    <div className="feature-head">
                      <span>序号</span>
                      <span>特征名称</span>
                      <span>特征分类</span>
                      <span>{model === "new" ? "SHAP值" : "IV值"}</span>
                    </div>
                    {features.map(([name, category, iv], index) => (
                      <div className="feature-row" key={name}>
                        <span className="rank">{index + 1}</span>
                        <b>{name}</b>
                        <span className={`feature-tag tag-${index % 4}`}>{category}</span>
                        <strong>{iv}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
          {result && (
            <section ref={resultRef} className="forecast-result">
              <div className="result-header">
                <div className="result-title-group">
                  <span className="forecast-title-mark" aria-hidden="true" />
                  <div>
                    <h2>预测结果与特征解释</h2>
                    <p>模型已根据本次参数完成计算，结果已自动保存</p>
                  </div>
                </div>
                <div>
                  <span>
                    <CalendarDays /> 预测时间 {new Date().toLocaleString("zh-CN")}
                  </span>
                  <button className="outline-button" onClick={exportResult}>
                    <Download />
                    导出结果
                  </button>
                </div>
              </div>
              <div className={`metric-grid metric-count-${resultMetrics.length}`}>
                {resultMetrics.map(([label, value, note], index) => (
                  <article
                    className={`metric ${index === 0 ? "primary" : index === 1 ? "green" : ""}`}
                    key={label}
                  >
                    <span className="metric-label">
                      {label}
                      <MetricHelp label={label} />
                    </span>
                    <b>{value}</b>
                    <em>{note}</em>
                  </article>
                ))}
              </div>
              <div className="analysis-grid analysis-grid-collapsed">
                <article className="forecast-card sales-card">
                  <div className="forecast-card-title">
                    <h2>
                      <History />
                      项目预测记录 · {project.name}
                    </h2>
                    <span>{projectRecords.length} 条</span>
                  </div>
                  {projectRecords.length === 0 ? (
                    <div className="project-record-empty">该项目暂无预测记录</div>
                  ) : (
                    <>
                      <div className="project-record-table-wrap">
                        <table className="project-record-table">
                          <thead>
                            <tr>
                              <th>预测时间</th>
                              <th>预测结果</th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleProjectRecords.map((item) => (
                              <tr key={item.id}>
                                <td>{new Date(item.created).toLocaleString("zh-CN")}</td>
                                <td className="record-result-cell">
                                  {displayRecordResult(item)}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModel(item.model);
                                      setResult(true);
                                    }}
                                  >
                                    查看
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {recordPageCount > 1 && (
                        <div className="record-pagination">
                          <button
                            type="button"
                            disabled={recordPage === 1}
                            onClick={() => setRecordPage((page) => page - 1)}
                          >
                            上一页
                          </button>
                          <span>
                            第 {recordPage} / {recordPageCount} 页
                          </span>
                          <button
                            type="button"
                            disabled={recordPage === recordPageCount}
                            onClick={() => setRecordPage((page) => page + 1)}
                          >
                            下一页
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </article>
              </div>
            </section>
          )}
        </section>
      </main>
      {history && (
        <div className="forecast-drawer-mask" onClick={() => setHistory(false)}>
          <aside className="forecast-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-title">
              <div>
                <h2>预测记录</h2>
                <p>查看、复用或导出历史预测</p>
              </div>
              <button onClick={() => setHistory(false)}>
                <X />
              </button>
            </div>
            {records.length === 0 ? (
              <div className="drawer-empty">当天暂无预测记录</div>
            ) : (
              <div className="record-list">
                {records.map((item) => (
                  <article key={item.id}>
                    <span>{item.model === "new" ? "新盘" : "存盘"}</span>
                    <time>{new Date(item.created).toLocaleString("zh-CN")}</time>
                    <h3>{item.project}</h3>
                    <p>{displayRecordResult(item)}</p>
                    <button
                      onClick={() => {
                        const recordProject = projects.find(
                          (projectItem) => projectItem.name === item.project,
                        );
                        if (recordProject) setProject(recordProject);
                        setModel(item.model);
                        setHistory(false);
                        setResult(true);
                      }}
                    >
                      打开结果
                    </button>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
