import { Link, useLocation } from "react-router-dom";
import { Activity, Clock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { NAV_ITEMS, type NavItem } from "@/data/menuConfig";
import { RequirementsToggle } from "@/components/requirements";

// Re-export for backward compatibility with existing imports.
export { NAV_ITEMS } from "@/data/menuConfig";

function isItemActive(item: NavItem, pathname: string, activeKey?: string, activeLabel?: string) {
  if (activeKey) return item.key === activeKey;
  if (activeLabel) return item.label === activeLabel;
  if (!item.path) return false;
  if (item.path === "/") return pathname === "/";
  return pathname === item.path || pathname.startsWith(item.path + "/");
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function HeaderNav({
  active,
  activeKey,
  updatedAt = getYesterdayStr(),
}: {
  /** Backward-compat: active item label. Prefer `activeKey` or omit to auto-detect from route. */
  active?: string;
  activeKey?: string;
  updatedAt?: string;
}) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 h-16 bg-[var(--color-header)] border-b border-[var(--color-panel-border)] flex items-center px-8 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 pr-8 border-r border-[var(--color-panel-border)]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[oklch(0.7_0.18_240)] to-[oklch(0.55_0.22_255)] flex items-center justify-center text-white shadow-md">
          <Activity className="w-5 h-5" />
        </div>
        <span className="text-base font-semibold tracking-wide text-foreground">存货去化</span>
      </div>
      <nav className="flex items-center gap-1 ml-6 h-full">
        {NAV_ITEMS.map((item) => {
          const isActive = isItemActive(item, pathname, activeKey, active);
          const cls = `px-5 h-full inline-flex items-center text-sm transition-colors relative ${
            isActive
              ? "text-[var(--color-brand)] font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`;
          const indicator = isActive ? (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-[var(--color-brand)]" />
          ) : null;
          return item.path ? (
            <Link key={item.key} to={item.path} className={cls}>
              {item.label}
              {indicator}
            </Link>
          ) : (
            <button
              key={item.key}
              className={cls}
              onClick={() =>
                toast(`${item.label}正在开发中，敬请期待`, { duration: 2000 })
              }
            >
              {item.label}
              {indicator}
            </button>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
        <RequirementsToggle />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>数据更新至</span>
          <span className="px-3 py-1 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium">
            {updatedAt}
          </span>
        </div>
        <button
          type="button"
          onClick={() => toast("已退出登录", { duration: 2000 })}
          className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition-colors"
          aria-label="退出登录"
          title="退出登录"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

/**
 * Wrapper that makes its child filter bar sticky just below the HeaderNav.
 * Use as the immediate parent of any page-level filter row so it stays
 * pinned while the main content scrolls.
 */
export function StickyFilterBar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky top-16 z-30 bg-white border-b border-[#E2E8F0] ${className}`}
    >
      {children}
    </div>
  );
}
