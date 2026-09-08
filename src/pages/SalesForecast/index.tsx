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
  RefreshCw,
  FileDown,
} from "lucide-react";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { ORG_TREE } from "@/components/filters/home-filters";
import * as XLSX from "xlsx";
import { ModuleBadge, usePageRequirements, useRegisterModuleOpener } from "@/components/requirements";
import { PAGE_REQUIREMENTS } from "./config/pageRequirements";
import "./styles.css";
import "./layout-overrides.css";
import "./final-overrides.css";
import ProbabilityStackBar from "./components/ProbabilityStackBar";

type Model = "new" | "stock";
type Project = { name: string; area: string; open: string; rate: string; remaining: string };
type RecordStatus = "completed" | "running" | "failed";
type RecordProbabilities = {
  low: number;
  medium: number;
  high: number;
};
type RecordItem = {
  id: string;
  model: Model;
  project: string;
  created: string;
  result: string;
  params?: string;
  opening?: string;
  price?: string;
  status?: RecordStatus;
  failureReason?: string;
  probabilities?: RecordProbabilities;
};
type PredictionResultState = {
  visible: boolean;
  coreFeaturesExpanded: boolean;
};

const initialPredictionResultState: PredictionResultState = {
  visible: false,
  coreFeaturesExpanded: false,
};

const recordProbabilities = [
  { name: "低去化", percent: "32.35", className: "record-probability-low" },
  { name: "中去化", percent: "64.09", className: "record-probability-medium" },
  { name: "高去化", percent: "9.56", className: "record-probability-high" },
] as const;

function recordProbabilitiesOf(item: RecordItem): RecordProbabilities | undefined {
  if (item.model !== "new") return undefined;
  return item.probabilities ?? {
    low: Number(recordProbabilities[0].percent),
    medium: Number(recordProbabilities[1].percent),
    high: Number(recordProbabilities[2].percent),
  };
}

function probabilityText(probability?: number) {
  return probability === undefined ? "--" : `${probability.toFixed(2)}%`;
}
const stockForecastRange = "下月35-46套";

// 改动点：新盘历史记录同步展示三档去化概率，存盘记录仍展示原有套数结果。
function RecordProbabilityResult({ item }: { item: RecordItem }) {
  if (item.model !== "new") {
    return <span className="record-result-value">{displayRecordResult(item)}</span>;
  }

  return (
    <span className="record-probability-result">
      {recordProbabilities.map((probability) => (
        <span className="record-probability-item" key={probability.name}>
          <span className={probability.className}>{probability.name}</span>
          <strong>概率{probability.percent}%</strong>
          {probability !== recordProbabilities[recordProbabilities.length - 1] && <span className="record-probability-separator">，</span>}
        </span>
      ))}
    </span>
  );
}

// 改动点：历史数据缺少新字段时统一降级，避免旧记录渲染报错。
function recordStatus(item: RecordItem): RecordStatus {
  return item.status ?? "completed";
}

function recordStatusLabel(status: RecordStatus) {
  return status === "running" ? "运行中" : status === "failed" ? "失败" : "已完成";
}

function recordSnapshot(item: RecordItem) {
  if (item.params) return item.params;
  if (item.price) {
    const price = `${Number(item.price).toLocaleString()} 元/㎡`;
    return item.model === "new" && item.opening ? `销售单价 ${price} · 开盘 ${item.opening.replaceAll("-", "/")}` : `销售单价 ${price}`;
  }
  return "-";
}

function displayRecordResult(item: RecordItem) {
  if (item.model !== "new") {
    // 改动点：兼容旧历史记录，将原先的单值套数展示为mock区间。
    return item.result.replace(/下月\d+套/, stockForecastRange).replace(/\s*[·；]\s*区间.*$/, "");
  }
  if (item.result.includes("低去化")) return "低去化";
  if (item.result.includes("高去化")) return "高去化";
  return "中去化";
}

function recordResultClass(item: RecordItem) {
  if (item.model !== "new") return "";
  const result = displayRecordResult(item);
  return result === "低去化"
    ? "record-result-low"
    : result === "高去化"
      ? "record-result-high"
      : "record-result-medium";
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
  placeholder = "选择日期",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() => value ? new Date(`${value}T00:00:00`) : new Date());
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);
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
    <div ref={pickerRef} className="relative parameter-date-picker">
      <button
        type="button"
        className="parameter-date"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={!value ? "date-placeholder" : ""}>{value ? value.replaceAll("-", "/") : placeholder}</span>
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
    ? "低去化：去化率 < 30%\n中去化：30% ≦ 去化率 < 70%\n高去化：去化率 ≧ 70%"
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
        {label.includes("去化") ? (
          <span className="depletion-thresholds" style={{ color: "#1E293B" }}>
            <span><b style={{ color: "#DC2626" }}>低去化</b>：去化率 &lt; 30%</span>
            <span><b style={{ color: "#F59E0B" }}>中去化</b>：30% ≦ 去化率 &lt; 70%</span>
            <span><b style={{ color: "#10B981" }}>高去化</b>：去化率 ≧ 70%</span>
          </span>
        ) : (
          <span>{content}</span>
        )}
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
  const [resultStates, setResultStates] = useState<Record<string, PredictionResultState>>({});
  const [history, setHistory] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  // 改动点：预测记录抽屉筛选状态。
  const [recordKeyword, setRecordKeyword] = useState("");
  const [recordKeywordInput, setRecordKeywordInput] = useState("");
  const [recordModelFilter, setRecordModelFilter] = useState<"all" | Model>("all");
  const [recordModelOpen, setRecordModelOpen] = useState(false);
  const recordModelPickerRef = useRef<HTMLDivElement>(null);
  const [recordFrom, setRecordFrom] = useState("");
  const [recordTo, setRecordTo] = useState("");
  const features = useMemo(() => (model === "new" ? newFeatures : stockFeatures), [model]);
  const title = model === "new" ? "新盘去化分类预测" : "存盘短期销量预测";
  const resultKey = `${project.name}:${model}`;
  const resultState = resultStates[resultKey] ?? initialPredictionResultState;
  const resultVisible = resultState.visible;
  usePageRequirements("智能预测", PAGE_REQUIREMENTS);
  useRegisterModuleOpener("sales-forecast-records", () => setHistory(true), []);

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
    setRecordPage(1);
  }, [project.name]);
  useEffect(() => {
    if (resultVisible) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultVisible]);
  useEffect(() => {
    if (!projectOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!projectPickerRef.current?.contains(event.target as Node)) setProjectOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [projectOpen]);
  useEffect(() => {
    if (!recordModelOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!recordModelPickerRef.current?.contains(event.target as Node)) setRecordModelOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [recordModelOpen]);
  function saveRecord(item: RecordItem) {
    const next = [item, ...records].slice(0, 20);
    setRecords(next);
    localStorage.setItem("sales-forecast-records", JSON.stringify(next));
  }
  function updateResultState(
    projectName: string,
    targetModel: Model,
    update: (state: PredictionResultState) => PredictionResultState,
  ) {
    const resultKey = `${projectName}:${targetModel}`;
    setResultStates((current) => ({
      ...current,
      [resultKey]: update(current[resultKey] ?? initialPredictionResultState),
    }));
  }
  async function runPrediction() {
    setLoading(true);
    updateResultState(project.name, model, (state) => ({ ...state, visible: false }));
    await new Promise((resolve) => setTimeout(resolve, 650));
    setLoading(false);
    updateResultState(project.name, model, (state) => ({ ...state, visible: true }));
    const newRecordProbabilities = { low: 32.35, medium: 64.09, high: 9.56 };
    saveRecord({
      id: crypto.randomUUID(),
      model,
      project: project.name,
      created: new Date().toISOString(),
      result: model === "new" ? "中去化" : stockForecastRange,
      status: "completed",
      probabilities: model === "new" ? newRecordProbabilities : undefined,
      opening: model === "new" ? opening : undefined,
      price,
      params:
        model === "new"
          ? `销售单价 ${Number(price).toLocaleString()} 元/㎡ · 开盘 ${opening.replaceAll("-", "/")}`
          : `销售单价 ${Number(price).toLocaleString()} 元/㎡`,
    });
  }
  function exportResult() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const exportTime = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const salePrice = `${Number(price).toLocaleString()} 元/㎡`;
    const planOpening = opening.replaceAll("-", "/");
    const currentProbabilities = model === "new"
      ? recordProbabilitiesOf({
          id: "",
          model: "new",
          project: project.name,
          created: now.toISOString(),
          result: "中去化",
        })
      : undefined;
    const currentResult = currentProbabilities
      ? `低去化概率${currentProbabilities.low.toFixed(2)}%，中去化概率${currentProbabilities.medium.toFixed(2)}%，高去化概率${currentProbabilities.high.toFixed(2)}%`
      : stockForecastRange;
    const currentKeyParams = model === "new"
      ? `销售单价 ${salePrice} · 开盘 ${planOpening}`
      : `销售单价 ${salePrice}`;
    const modelJudgement = currentProbabilities
      ? Object.entries({
          低去化: currentProbabilities.low,
          中去化: currentProbabilities.medium,
          高去化: currentProbabilities.high,
        }).sort((first, second) => second[1] - first[1])[0][0]
      : "--";
    const summaryRows = [
      ["项目", project.name],
      ["盘类型", model === "new" ? "新盘" : "存盘"],
      ["预测时间", exportTime],
      ["关键参数", currentKeyParams],
      ["预测结果", currentResult],
      ["模型判定", modelJudgement],
    ];
    const sheet2Header = model === "new"
      ? ["预测时间", "销售单价", "计划开盘时间", "预测结果"]
      : ["预测时间", "销售单价", "预测结果"];
    const sheet2Rows = projectRecords.map((item) => {
      const salePrice = item.price ? `${Number(item.price).toLocaleString()} 元/㎡` : "--";
      const planOpening = item.opening ? item.opening.replaceAll("-", "/") : "--";
      const probabilities = recordProbabilitiesOf(item);
      const result = probabilities
        ? `低去化概率${probabilities.low.toFixed(2)}%，中去化概率${probabilities.medium.toFixed(2)}%，高去化概率${probabilities.high.toFixed(2)}%`
        : displayRecordResult(item);
      return model === "new"
        ? [new Date(item.created).toLocaleString("zh-CN"), salePrice, planOpening, result]
        : [new Date(item.created).toLocaleString("zh-CN"), salePrice, result];
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(summaryRows),
      "本次预测结果",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([sheet2Header, ...sheet2Rows]),
      "历史预测记录",
    );
    const timestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
    ].join("");
    const modelName = model === "new" ? "新盘" : "存盘";
    XLSX.writeFile(workbook, `${project.name}_${modelName}_预测结果_${timestamp}.xlsx`);
  }
  // 改动点：行内导出单条历史记录，不依赖详情页。
  function exportRecord(item: RecordItem) {
    const probabilities = recordProbabilitiesOf(item);
    const result = probabilities
      ? `低去化概率${probabilities.low.toFixed(2)}%，中去化概率${probabilities.medium.toFixed(2)}%，高去化概率${probabilities.high.toFixed(2)}%`
      : displayRecordResult(item);
    const modelJudgement = probabilities
      ? Object.entries({
          低去化: probabilities.low,
          中去化: probabilities.medium,
          高去化: probabilities.high,
        }).sort((first, second) => second[1] - first[1])[0][0]
      : "--";
    const rows = [
      ["项目", item.project],
      ["盘类型", item.model === "new" ? "新盘" : "存盘"],
      ["预测时间", new Date(item.created).toLocaleString("zh-CN")],
      ["关键参数", recordSnapshot(item)],
      ["预测结果", result],
      ["模型判定", modelJudgement],
    ];
    const recordTime = new Date(item.created);
    const pad = (value: number) => String(value).padStart(2, "0");
    const timestamp = [
      recordTime.getFullYear(),
      pad(recordTime.getMonth() + 1),
      pad(recordTime.getDate()),
      `_${pad(recordTime.getHours())}${pad(recordTime.getMinutes())}${pad(recordTime.getSeconds())}`,
    ].join("");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "本次预测结果");
    XLSX.writeFile(
      workbook,
      `${item.project}_${item.model === "new" ? "新盘" : "存盘"}_预测结果_${timestamp}.xlsx`,
    );
  }
  // 改动点：复用历史记录参数，回填主页面预测表单。
  function reuseRecord(item: RecordItem) {
    const recordProject = projects.find((projectItem) => projectItem.name === item.project);
    if (recordProject) setProject(recordProject);
    setModel(item.model);
    if (item.price) setPrice(item.price);
    if (item.opening) setOpening(item.opening);
    setHistory(false);
    updateResultState(item.project, item.model, (state) => ({ ...state, visible: false }));
  }
  const filtered = projects.filter((item) => item.name.includes(query.trim()));
  const resultMetrics =
    model === "new"
      ? [["前三月累计去化档位", "中去化", ""]]
      : [["下月销售套数", "35-46套", "置信度90%的预测销量的区间"]];
  const projectRecords = records.filter(
    (item) => item.project === project.name && item.model === model,
  );
  const recordPageCount = Math.max(1, Math.ceil(projectRecords.length / 10));
  const visibleProjectRecords = projectRecords.slice((recordPage - 1) * 10, recordPage * 10);
  // 改动点：抽屉记录按项目、盘类型、日期范围筛选。
  const drawerRecords = records.filter((item) => {
    const keywordMatch = !recordKeyword.trim() || item.project.toLowerCase().includes(recordKeyword.trim().toLowerCase());
    const modelMatch = recordModelFilter === "all" || item.model === recordModelFilter;
    const createdDate = item.created.slice(0, 10);
    return keywordMatch && modelMatch && (!recordFrom || createdDate >= recordFrom) && (!recordTo || createdDate <= recordTo);
  });

  return (
    <div className="forecast-page">
      <HeaderNav activeKey="sales-forecast" />
      <main className="forecast-layout">
        <aside className="forecast-sidebar">
          <ModuleBadge moduleId="sales-forecast-model" className="block">
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
          <ModuleBadge moduleId="sales-forecast-records" className="block">
          <button className="sidebar-history" onClick={() => setHistory(true)}>
            <History />
            预测记录 <b>{records.length || 12}</b>
          </button>
          </ModuleBadge>
          </ModuleBadge>
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
          <ModuleBadge moduleId="sales-forecast-filter" className="block">
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
          </ModuleBadge>
          <ModuleBadge moduleId="sales-forecast-filter" className="block">
          <section className="forecast-card forecast-info">
            <div className="forecast-card-title">
              <h2>
                <BarChart3 />
                项目基本信息
              </h2>
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
          </ModuleBadge>
          <div className="forecast-work">
            <ModuleBadge moduleId="sales-forecast-parameters" className="block">
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
            </ModuleBadge>
            <ModuleBadge moduleId="sales-forecast-model" className="block">
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
                    <span className="overview-metric-label">
                      AUC值 <MetricHelp label="AUC值" />
                    </span>
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
                  onClick={() => updateResultState(project.name, model, (state) => ({
                    ...state,
                    coreFeaturesExpanded: !state.coreFeaturesExpanded,
                  }))}
                >
                  {resultState.coreFeaturesExpanded ? "收起核心特征" : "展开核心特征"}
                </button>
              )}
              {resultState.coreFeaturesExpanded && (
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
            </ModuleBadge>
          </div>
          {resultVisible && (
            <ModuleBadge moduleId="sales-forecast-result" className="block">
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
                    className={`metric ${
                      model === "new"
                        ? value === "低去化"
                          ? "category-low"
                          : value === "高去化"
                            ? "category-high"
                            : "category-medium"
                        : index === 0
                          ? "primary"
                          : index === 1
                            ? "green"
                            : ""
                    }`}
                    key={label}
                  >
                    <span className="metric-label">
                      {label}
                      <MetricHelp label={label} />
                    </span>
                    {model === "new" ? (
                      <ProbabilityStackBar data={[
                        { name: "低去化", percent: 32.35, color: "#f53f3f", isMain: false },
                        { name: "中去化", percent: 64.09, color: "#EAB308", isMain: true },
                        { name: "高去化", percent: 9.56, color: "#00b42a", isMain: false },
                      ]} />
                    ) : <b>{value}</b>}
                    <em>{note}</em>
                  </article>
                ))}
              </div>
              <div className="analysis-grid analysis-grid-collapsed">
                <ModuleBadge moduleId="sales-forecast-records" className="block">
                <article className="forecast-card sales-card">
                  <div className="forecast-card-title">
                    <h2>
                      <History />
                      {project.name}预测记录
                    </h2>
                    <span>{projectRecords.length} 条</span>
                  </div>
                  {projectRecords.length === 0 ? (
                    <div className="project-record-empty">该项目暂无预测记录</div>
                  ) : (
                    <>
                      <div className="project-record-table-wrap">
                        <table className={`project-record-table project-record-table-${model}`}>
                          <thead>
                            <tr>
                              <th>预测时间</th>
                              {model === "new" ? (
                                <>
                                  <th>销售单价</th>
                                  <th>计划开盘时间</th>
                                </>
                              ) : (
                                <th>销售单价</th>
                              )}
                              <th>预测结果</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleProjectRecords.map((item) => (
                              <tr key={item.id}>
                                <td>{new Date(item.created).toLocaleString("zh-CN")}</td>
                                {model === "new" ? (
                                  <>
                                    <td>
                                      {item.price
                                        ? `${Number(item.price).toLocaleString()} 元/㎡`
                                        : "--"}
                                    </td>
                                    <td>
                                      {item.opening ? item.opening.replaceAll("-", "/") : "--"}
                                    </td>
                                  </>
                                ) : (
                                  <td>
                                    {item.price
                                      ? `${Number(item.price).toLocaleString()} 元/㎡`
                                      : "--"}
                                  </td>
                                )}
                                <td className={`record-result-cell ${recordResultClass(item)}`}>
                                  <RecordProbabilityResult item={item} />
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
                </ModuleBadge>
              </div>
            </section>
            </ModuleBadge>
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
            {/* 改动点：轻量筛选栏，不改变抽屉尺寸。 */}
            <div className="record-filters">
              <div className="record-search"><Search /><input value={recordKeywordInput} onChange={(event) => setRecordKeywordInput(event.target.value)} placeholder="搜索项目名称" /></div>
              <div ref={recordModelPickerRef} className="record-model-picker">
                <button type="button" className="record-model-trigger" onClick={() => setRecordModelOpen((open) => !open)} aria-expanded={recordModelOpen}>
                  {recordModelFilter === "all" ? "全盘" : recordModelFilter === "stock" ? "存盘" : "新盘"}<ChevronDown />
                </button>
                {recordModelOpen && <div className="record-model-menu">
                  {([['all', '全盘'], ['stock', '存盘'], ['new', '新盘']] as const).map(([value, label]) => (
                    <button key={value} type="button" className={recordModelFilter === value ? "active" : ""} onClick={() => { setRecordModelFilter(value); setRecordModelOpen(false); setRecordPage(1); }}>{label}</button>
                  ))}
                </div>}
              </div>
              <div className="record-date-range"><ForecastDatePicker value={recordFrom} onChange={(value) => { setRecordFrom(value); setRecordPage(1); }} placeholder="年 / 月 / 日" /><span>至</span><ForecastDatePicker value={recordTo} onChange={(value) => { setRecordTo(value); setRecordPage(1); }} placeholder="年 / 月 / 日" /></div>
              <div className="record-filter-actions"><button type="button" className="record-filter-search" onClick={() => { setRecordKeyword(recordKeywordInput); setRecordPage(1); }}><Search />搜索</button><button type="button" className="record-filter-reset" onClick={() => { setRecordKeyword(""); setRecordKeywordInput(""); setRecordModelFilter("all"); setRecordFrom(""); setRecordTo(""); setRecordModelOpen(false); setRecordPage(1); }}>重置</button></div>
            </div>
            {drawerRecords.length === 0 ? (
              <div className="drawer-empty">当天暂无预测记录</div>
            ) : (
              <div className="record-list">
                {drawerRecords.map((item) => (
                  <article key={item.id}>
                    <span className={`record-model-tag record-model-${item.model}`}>{item.model === "new" ? "新盘" : "存盘"}</span>
                    <time>{new Date(item.created).toLocaleString("zh-CN")}</time>
                    <h3>{item.project}</h3>
                    <p className={recordResultClass(item)}>
                      <span className="record-result-prefix">预测结果</span>
                      <RecordProbabilityResult item={item} />
                    </p>
                    {(item.params || item.price || item.opening) && <div className="record-snapshot" title={recordSnapshot(item)}><b>关键参数</b><span>{recordSnapshot(item)}</span></div>}
                    <div className="record-actions">
                    <button
                      onClick={() => {
                        const recordProject = projects.find(
                          (projectItem) => projectItem.name === item.project,
                        );
                        if (recordProject) setProject(recordProject);
                        setModel(item.model);
                        setHistory(false);
                        updateResultState(recordProject.name, item.model, (state) => ({
                          ...state,
                          visible: true,
                        }));
                      }}
                    >
                      打开结果
                    </button>
                    <button className="record-icon-button" title="复用" aria-label="复用" onClick={() => reuseRecord(item)}><RefreshCw /></button>
                    <button className="record-icon-button" title="导出" aria-label="导出" onClick={() => exportRecord(item)}><FileDown /></button>
                    </div>
                  </article>
                ))}
                {drawerRecords.length > 10 && <div className="record-pagination"><button disabled={recordPage === 1} onClick={() => setRecordPage((page) => page - 1)}>上一页</button><span>第 {recordPage} / {Math.ceil(drawerRecords.length / 10)} 页</span><button disabled={recordPage >= Math.ceil(drawerRecords.length / 10)} onClick={() => setRecordPage((page) => page + 1)}>下一页</button></div>}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
