import { useEffect, useRef, useState } from "react";
import { ClipboardList, Pencil, RotateCcw, X, Check } from "lucide-react";
import { useRequirements, type RegisteredRequirement } from "./RequirementsContext";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 340;

export function RequirementsDrawer() {
  const { open, setOpen, items, pageTitle, focusModule, highlightId } = useRequirements();
  const listRef = useRef<HTMLDivElement>(null);

  // 打开时：给 body 增加 padding-right 让常规流避让；同时设置 data-req-open + CSS 变量，
  // 让全局样式把 Radix 弹窗/Overlay 也向左偏移，避免被需求面板遮挡。
  useEffect(() => {
    if (!open) return;
    const prevPad = document.body.style.paddingRight;
    const prevVar = document.body.style.getPropertyValue("--req-drawer-w");
    document.body.style.paddingRight = `${PANEL_WIDTH}px`;
    document.body.style.setProperty("--req-drawer-w", `${PANEL_WIDTH}px`);
    document.body.setAttribute("data-req-open", "1");
    return () => {
      document.body.style.paddingRight = prevPad;
      if (prevVar) document.body.style.setProperty("--req-drawer-w", prevVar);
      else document.body.style.removeProperty("--req-drawer-w");
      document.body.removeAttribute("data-req-open");
    };
  }, [open]);

  // 高亮变化时，将抽屉内对应项滚动到可见区域
  useEffect(() => {
    if (!highlightId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-req-module="${highlightId}"]`,
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlightId]);

  return (
    <aside
      style={{ width: PANEL_WIDTH }}
      className={cn(
        "fixed top-0 right-0 h-full z-[40] bg-white border-l border-[#E2E8F0]",
        "shadow-[-8px_0_24px_rgba(15,23,42,0.06)] transition-transform duration-300 flex flex-col",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <header className="px-5 h-14 flex items-center justify-between border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#1677FF]" />
          <div className="text-sm font-semibold text-slate-800">需求说明</div>
          {pageTitle && <span className="text-xs text-slate-500">· {pageTitle}</span>}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-slate-100 text-slate-500"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
        <div className="text-[13px] text-slate-600">结构化需求清单（可编辑）</div>
        <div className="text-[11px] text-slate-400">{items.length} 项</div>
      </div>
      <div className="px-5 pb-2 text-[11px] text-slate-400 leading-relaxed">
        每条需求遵循：<span className="text-slate-500">【展示内容】【交互规则】【数据规则】【边界处理】</span>
      </div>


      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {items.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-12">
            当前页面暂未配置需求说明
          </div>
        )}
        {items.map((r) => (
          <RequirementCard key={r.code} item={r} active={highlightId === r.moduleId} onFocus={() => focusModule(r.moduleId)} />
        ))}
      </div>
    </aside>
  );
}

function RequirementCard({
  item,
  active,
  onFocus,
}: {
  item: RegisteredRequirement;
  active: boolean;
  onFocus: () => void;
}) {
  const { updateItem, resetItem } = useRequirements();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [desc, setDesc] = useState(item.desc ?? "");

  // 当外部值改变（切换页面或被重置时）同步
  useEffect(() => {
    if (!editing) {
      setTitle(item.title);
      setDesc(item.desc ?? "");
    }
  }, [item.title, item.desc, editing]);

  const save = () => {
    updateItem(item.code, { title: title.trim() || item.title, desc });
    setEditing(false);
  };
  const cancel = () => {
    setTitle(item.title);
    setDesc(item.desc ?? "");
    setEditing(false);
  };

  return (
    <div
      data-req-module={item.moduleId}
      className={cn(
        "rounded-lg border p-3 transition-all bg-white",
        active
          ? "border-[#1677FF] bg-[#F0F7FF] ring-2 ring-[#1677FF]/30"
          : "border-[#E2E8F0] hover:border-[#1677FF]/60",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <button
          type="button"
          onClick={onFocus}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#1677FF] text-white text-[11px] font-semibold">
            {item.index}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">{item.code}</span>
          {item.edited && (
            <span className="text-[10px] text-[#F59E0B] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
              已编辑
            </span>
          )}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          {editing ? (
            <>
              <button
                onClick={save}
                className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-emerald-50 text-emerald-600"
                title="保存"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={cancel}
                className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-slate-100 text-slate-500"
                title="取消"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {item.edited && (
                <button
                  onClick={() => resetItem(item.code)}
                  className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-slate-100 text-slate-500"
                  title="恢复默认"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-slate-100 text-slate-500"
                title="编辑"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-[13px] font-medium text-slate-800 px-2 py-1 border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1677FF]"
            placeholder="需求标题"
          />
          <textarea
            value={desc || DESC_TEMPLATE}
            onChange={(e) => setDesc(e.target.value)}
            rows={10}
            className="w-full text-[12px] leading-relaxed text-slate-600 px-2 py-1 border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1677FF] resize-y font-mono"
            placeholder={DESC_TEMPLATE}
          />
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-400">
              按【展示内容】【交互规则】【数据规则】【边界处理】组织内容
            </div>
            {!desc && (
              <button
                type="button"
                onClick={() => setDesc(DESC_TEMPLATE)}
                className="text-[10px] text-[#1677FF] hover:underline"
              >
                插入模板
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={onFocus} className="w-full text-left space-y-1.5">
          <div className="text-[13px] font-medium text-slate-800">{item.title}</div>
          {item.desc ? <DescBlocks text={item.desc} /> : null}
        </button>
      )}
    </div>
  );
}

const DESC_SECTIONS = ["展示内容", "交互规则", "数据规则", "边界处理"] as const;

const DESC_TEMPLATE = DESC_SECTIONS.map((s) => `【${s}】`).join("\n");

const SECTION_STYLE: Record<string, string> = {
  展示内容: "bg-[#EFF6FF] text-[#1677FF]",
  交互规则: "bg-[#ECFDF5] text-[#059669]",
  数据规则: "bg-[#FEF3C7] text-[#B45309]",
  边界处理: "bg-[#FEE2E2] text-[#DC2626]",
};

function DescBlocks({ text }: { text: string }) {
  // 解析【xxx】... 段落；如果没有任何【】，则原样渲染
  const re = /【([^】]+)】/g;
  const parts: { label?: string; body: string }[] = [];
  let lastIdx = 0;
  let lastLabel: string | undefined;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      const body = text.slice(lastIdx, m.index).trim();
      if (body || lastLabel) parts.push({ label: lastLabel, body });
    }
    lastLabel = m[1];
    lastIdx = m.index + m[0].length;
  }
  const tail = text.slice(lastIdx).trim();
  if (lastLabel || tail) parts.push({ label: lastLabel, body: tail });

  if (parts.length === 0 || (parts.length === 1 && !parts[0].label)) {
    return (
      <div className="text-[12px] leading-relaxed text-slate-500 whitespace-pre-wrap">
        {text}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {parts.map((p, i) => (
        <div key={i} className="text-[12px] leading-relaxed text-slate-600">
          {p.label && (
            <span
              className={cn(
                "inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10.5px] font-medium align-middle",
                SECTION_STYLE[p.label] ?? "bg-slate-100 text-slate-600",
              )}
            >
              {p.label}
            </span>
          )}
          <span className="whitespace-pre-wrap">{p.body}</span>
        </div>
      ))}
    </div>
  );
}

