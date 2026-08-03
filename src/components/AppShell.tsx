import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Logo } from "./SiteNav";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAccounts, useEmails, useUser } from "@/lib/data-hooks";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badgeKind?: "danger" | "primary" | "muted";
}

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inbox", label: "Inbox unifiée", icon: Inbox, badgeKind: "muted" },
  { to: "/alerts", label: "Alertes sécurité", icon: ShieldAlert, badgeKind: "danger" },
  { to: "/actions", label: "Action requise", icon: Zap, badgeKind: "primary" },
  { to: "/settings", label: "Paramètres", icon: Settings },
];

const STORAGE_KEY = "mailmind:sidebar-collapsed";

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, loading: userLoading, error: userError } = useUser();
  const { emails, error: emailsError } = useEmails();
  const { accounts, error: accountsError } = useAccounts();

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!userLoading && !user) void navigate({ to: "/auth" });
  }, [navigate, user, userLoading]);
  useEffect(() => {
    const error = userError ?? emailsError ?? accountsError;
    if (error) toast.error("Impossible de charger les données", { description: error.message });
  }, [accountsError, emailsError, userError]);

  const counts = {
    inbox: emails.length,
    alerts: emails.filter((e) => (e.risk_score ?? 0) >= 0.6 || e.category === "Phishing").length,
    actions: emails.filter(
      (e) => e.category === "Urgent" || e.intent?.toLowerCase().includes("action"),
    ).length,
  };

  const getBadge = (label: string) => {
    if (label === "Inbox unifiée") return counts.inbox || null;
    if (label === "Alertes sécurité") return counts.alerts || null;
    if (label === "Action requise") return counts.actions || null;
    return null;
  };

  const initials =
    (user?.user_metadata?.full_name as string | undefined)
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "?";

  const sidebarWidth = collapsed ? "w-16" : "w-60";

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} shrink-0 border-r border-border bg-sidebar/95 backdrop-blur-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-sidebar-border px-4">
            <Link
              to="/"
              className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}
            >
              <Logo />
              {!collapsed && (
                <span className="font-display text-base tracking-wider">MAILMIND</span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden"
              aria-label="Fermer le menu"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              const badge = getBadge(item.label);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge != null && (
                        <span
                          className={`rounded px-1.5 font-mono text-[10px] font-bold ${
                            item.badgeKind === "danger"
                              ? "bg-danger/15 text-danger"
                              : item.badgeKind === "primary"
                                ? "bg-foreground/10 text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {String(badge).padStart(2, "0")}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground font-mono text-[11px] font-bold text-background">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    {(user?.user_metadata?.full_name as string | undefined) ??
                      user?.email?.split("@")[0]}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {accounts.length} compte{accounts.length > 1 ? "s" : ""} mail
                  </p>
                </div>
                <button
                  onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}
                  title="Se déconnecter"
                  className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}
                title="Se déconnecter"
                className="grid size-10 w-full place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mt-2 hidden w-full items-center justify-center gap-1.5 rounded-md py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-sidebar-accent md:flex"
            >
              {collapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <>
                  <ChevronLeft className="size-3.5" /> Réduire
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="truncate font-display text-base font-semibold">{title}</h1>
            {accounts.length > 0 && (
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground lg:inline">
                · {accounts.length} compte{accounts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <form
              className="relative hidden lg:block"
              onSubmit={(event) => {
                event.preventDefault();
                if (search.trim()) navigate({ to: "/inbox", search: { q: search.trim() } });
              }}
            >
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Recherche IA : factures > 100€…"
                className="h-8 w-72 rounded-md border border-border bg-surface pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </form>
            <ThemeToggle />
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center px-6 py-20">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl glass">
          <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="mt-6 font-display text-2xl tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
