import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface RequirementItem {
  /** 业务编码，例如 REQ-001。如未提供，会按声明顺序自动生成。 */
  code?: string;
  /** 绑定模块 id（与 <ModuleBadge moduleId=... /> 对应）。 */
  moduleId: string;
  /** 需求标题 */
  title: string;
  /** 需求描述 */
  desc?: string;
}

export interface RegisteredRequirement extends RequirementItem {
  /** 自动分配的角标序号（1,2,3...） */
  index: number;
  /** 最终编码 */
  code: string;
  /** 是否被本地编辑覆盖 */
  edited?: boolean;
}

type OverrideMap = Record<string, { title?: string; desc?: string }>;

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  pageTitle: string;
  setPage: (title: string, items: RequirementItem[]) => void;
  items: RegisteredRequirement[];
  /** 模块 dom 注册 */
  registerModule: (id: string, el: HTMLElement | null) => void;
  /** 注册"打开模块所在容器"的回调（例如打开弹窗）。多次注册时仅保留最新一次。 */
  registerOpener: (id: string, opener: (() => void) | null) => void;
  /** 滚动并高亮模块；若模块在未打开的弹窗里，会先触发对应 opener 再定位。 */
  focusModule: (id: string) => void;
  /** 当前高亮 moduleId */
  highlightId: string | null;
  /** 更新某条需求（本地持久化） */
  updateItem: (code: string, patch: { title?: string; desc?: string }) => void;
  /** 重置某条需求覆盖，回到代码默认值 */
  resetItem: (code: string) => void;
}

const RequirementsContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "lov.requirements.overrides.v1";

function loadOverrides(): Record<string, OverrideMap> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(data: Record<string, OverrideMap>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function RequirementsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [rawItems, setRawItems] = useState<RequirementItem[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [allOverrides, setAllOverrides] = useState<Record<string, OverrideMap>>(() => loadOverrides());
  const modulesRef = useRef<Map<string, HTMLElement>>(new Map());
  const openersRef = useRef<Map<string, () => void>>(new Map());
  const highlightTimer = useRef<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const setPage = useCallback((title: string, items: RequirementItem[]) => {
    setPageTitle(title);
    setRawItems(items);
  }, []);

  const registerModule = useCallback((id: string, el: HTMLElement | null) => {
    if (el) modulesRef.current.set(id, el);
    else modulesRef.current.delete(id);
    setRefreshTick((v) => v + 1);
  }, []);

  const registerOpener = useCallback((id: string, opener: (() => void) | null) => {
    if (opener) openersRef.current.set(id, opener);
    else openersRef.current.delete(id);
  }, []);

  const doHighlight = useCallback((id: string) => {
    const el = modulesRef.current.get(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 2600);
    return true;
  }, []);

  const focusModule = useCallback((id: string) => {
    if (doHighlight(id)) return;
    // 模块尚未挂载（多半在未打开的弹窗里）：先触发 opener，再轮询等待挂载
    const opener = openersRef.current.get(id);
    if (opener) opener();
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (doHighlight(id) || tries > 30) window.clearInterval(timer);
    }, 80);
  }, [doHighlight]);


  const pageOverrides = allOverrides[pageTitle] ?? {};

  const items = useMemo<RegisteredRequirement[]>(() => {
    // 按 DOM 文档流先后顺序排序，实现“从上到下自动排序”
    const sorted = [...rawItems].sort((a, b) => {
      const elA = modulesRef.current.get(a.moduleId);
      const elB = modulesRef.current.get(b.moduleId);
      if (!elA && !elB) return 0;
      if (!elA) return 1;
      if (!elB) return -1;
      if (elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      return 1;
    });

    return sorted.map((it, i) => {
      const code = it.code ?? `REQ-${String(i + 1).padStart(3, "0")}`;
      const ov = pageOverrides[code];
      return {
        ...it,
        code,
        index: i + 1,
        title: ov?.title ?? it.title,
        desc: ov?.desc ?? it.desc,
        edited: !!ov && (ov.title !== undefined || ov.desc !== undefined),
      };
    });
  }, [rawItems, pageOverrides, refreshTick]);

  const updateItem = useCallback(
    (code: string, patch: { title?: string; desc?: string }) => {
      setAllOverrides((prev) => {
        const next = { ...prev };
        const page = { ...(next[pageTitle] ?? {}) };
        page[code] = { ...(page[code] ?? {}), ...patch };
        next[pageTitle] = page;
        saveOverrides(next);
        return next;
      });
    },
    [pageTitle],
  );

  const resetItem = useCallback(
    (code: string) => {
      setAllOverrides((prev) => {
        const next = { ...prev };
        const page = { ...(next[pageTitle] ?? {}) };
        delete page[code];
        next[pageTitle] = page;
        saveOverrides(next);
        return next;
      });
    },
    [pageTitle],
  );

  // 同步多个 tab 之间的修改
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setAllOverrides(loadOverrides());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      pageTitle,
      setPage,
      items,
      registerModule,
      registerOpener,
      focusModule,
      highlightId,
      updateItem,
      resetItem,
    }),
    [open, pageTitle, setPage, items, registerModule, registerOpener, focusModule, highlightId, updateItem, resetItem],
  );

  return <RequirementsContext.Provider value={value}>{children}</RequirementsContext.Provider>;
}

export function useRequirements() {
  const ctx = useContext(RequirementsContext);
  if (!ctx) throw new Error("useRequirements must be used within RequirementsProvider");
  return ctx;
}

export function useRegisterModuleOpener(moduleId: string, opener: () => void, deps: ReadonlyArray<unknown> = []) {
  const { registerOpener } = useRequirements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useCallback(opener, deps);
  useEffect(() => {
    registerOpener(moduleId, stable);
    return () => registerOpener(moduleId, null);
  }, [moduleId, stable, registerOpener]);
}

/**
 * 页面顶层调用：声明本页的需求清单。
 * 用法：
 *   usePageRequirements("首页", [
 *     { moduleId: "filters", title: "全局筛选", desc: "..." },
 *     { moduleId: "total-value", title: "总货值卡片", desc: "..." },
 *   ]);
 */
export function usePageRequirements(title: string, items: RequirementItem[]) {
  const { setPage } = useRequirements();
  // 使用 JSON.stringify 作为依赖 key，避免每次渲染都触发；
  // 在 effect 中调用 setPage，避免在渲染阶段更新父级 Provider state 触发 React 警告。
  const key = JSON.stringify({ title, items });
  useEffect(() => {
    setPage(title, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setPage]);
}
