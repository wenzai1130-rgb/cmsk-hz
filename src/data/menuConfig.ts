/**
 * Global navigation configuration.
 * All pages share this single source of truth for the top header nav.
 */
export type NavItem = {
  key: string;
  label: string;
  /** Route path; omit for items that are not yet routable (will show a toast). */
  path?: string;
  enabled?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "首页", path: "/" },
  { key: "legacy-2021", label: "21年及之前", path: "/legacy-2021" },
  { key: "grading", label: "多维分析", path: "/grading" },
  { key: "query", label: "自助查询", path: "/query" },
  { key: "map", label: "项目分析", path: "/projects" },
];
