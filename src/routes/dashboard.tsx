import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Plus,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { ProviderIcon } from "@/components/ProviderIcons";
import { useAccounts, useEmails } from "@/lib/data-hooks";
import { getDashboardStats, type DashboardStats } from "@/lib/dashboard-stats.functions";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useState } from "react";

const DashboardFlowChart = lazy(() =>
  import("@/components/dashboard/DashboardCharts").then((module) => ({
    default: module.DashboardFlowChart,
  })),
);
const DashboardDistributionChart = lazy(() =>
  import("@/components/dashboard/DashboardCharts").then((module) => ({
    default: module.DashboardDistributionChart,
  })),
);
const TelegramMetricsChart = lazy(() =>
  import("@/components/TelegramMetricsChart").then((module) => ({
    default: module.TelegramMetricsChart,
  })),
);
const WhatsAppMetricsChart = lazy(() =>
  import("@/components/WhatsAppMetricsChart").then((module) => ({
    default: module.WhatsAppMetricsChart,
  })),
);

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MailMind AI" },
      {
        name: "description",
        content: "Vue d'ensemble de vos comptes mail analysés par MailMind AI.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { emails, loading } = useEmails();
  const { accounts } = useAccounts();
  const loadStats = useServerFn(getDashboardStats);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    void loadStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, [loadStats, emails.length]);

  const analyzed = stats?.analyzedTotal ?? emails.filter((e) => e.analyzed_at || e.summary).length;
  const urgent = stats?.urgentTotal ?? emails.filter((e) => e.category === "Urgent").length;
  const threats =
    stats?.threatsTotal ??
    emails.filter((e) => (e.risk_score ?? 0) >= 0.7 || e.category === "Phishing").length;
  const inboxTotal = stats?.inboxTotal ?? emails.length;
  const savedMin = Math.round(analyzed * 1.2);

  const distribution = [
    "Phishing",
    "Sécurité",
    "Finance",
    "Reporting",
    "Commercial",
    "Collaboration",
    "RH",
    "Notification",
    "Autre",
  ]
    .map((name) => ({ name, count: emails.filter((e) => e.category === name).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalCategorized = distribution.reduce((s, c) => s + c.count, 0);
  const priority = [...emails]
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, 5);
  const flowData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      day: date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      messages: emails.filter((email) => {
        const received = new Date(email.received_at);
        return received >= date && received < new Date(date.getTime() + 86_400_000);
      }).length,
    };
  });
  const categoryColors = ["#60a5fa", "#42d392", "#f87171", "#a78bfa", "#737373"];

  if (!loading && emails.length === 0 && accounts.length === 0) {
    return (
      <AppShell title="Dashboard">
        <EmptyState
          icon={Plus}
          title="Bienvenue sur MailMind AI"
          description="Connectez votre premier compte mail pour lancer le scan initial et alimenter votre dashboard."
          action={
            <Link
              to="/settings"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background"
            >
              Connecter un compte mail
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <StatCard
            label="E-mails analysés"
            value={analyzed.toLocaleString("fr-FR")}
            hint={`${inboxTotal.toLocaleString("fr-FR")} en inbox`}
            icon={Sparkles}
          />
          <StatCard label="Urgents" value={String(urgent)} hint="à traiter" icon={Zap} />
          <StatCard
            label="Menaces"
            value={String(threats)}
            hint="bloquées"
            tone="danger"
            icon={AlertTriangle}
          />
          <StatCard
            label="Temps gagné"
            value={`${(savedMin / 60).toFixed(1)} h`}
            hint="estimation"
            icon={Clock}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl glass p-6 sm:p-8 lg:col-span-2">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="font-display text-xl tracking-wide sm:text-2xl">Flux de la boîte</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Messages reçus sur les 7 derniers jours
                </p>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Temps réel
              </span>
            </div>
            <div className="h-64 w-full">
              <Suspense fallback={<ChartFallback />}>
                <DashboardFlowChart data={flowData} />
              </Suspense>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 lg:col-span-2 lg:grid-cols-2">
            <div className="rounded-3xl glass p-6 sm:p-8">
              <Suspense fallback={<ChartFallback />}>
                <TelegramMetricsChart compact />
              </Suspense>
            </div>
            <div className="rounded-3xl glass p-6 sm:p-8">
              <Suspense fallback={<ChartFallback />}>
                <WhatsAppMetricsChart compact />
              </Suspense>
            </div>
          </div>

          <div className="rounded-3xl glass p-6 sm:p-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-display text-xl tracking-wide sm:text-2xl">Répartition</h2>
                <p className="mt-1 text-xs text-muted-foreground">Catégories détectées</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {totalCategorized}
              </span>
            </div>
            {distribution.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Aucune catégorie.</p>
            ) : (
              <div className="h-56">
                <Suspense fallback={<ChartFallback />}>
                  <DashboardDistributionChart data={distribution} />
                </Suspense>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
              {distribution.slice(0, 5).map((entry, index) => (
                <span
                  key={entry.name}
                  className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: categoryColors[index % categoryColors.length] }}
                  />
                  {entry.name}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl glass p-6 sm:p-8">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-xl tracking-wide sm:text-2xl">Comptes</h2>
              <Link
                to="/settings"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Gérer
              </Link>
            </div>
            <div className="space-y-3">
              {accounts.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun compte connecté.</p>
              )}
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl glass-subtle p-3.5">
                  <ProviderIcon provider={a.provider} className="size-7" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.display_name ?? a.email}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {a.email}
                      {a.provider === "google"
                        ? " · Gmail API"
                        : a.provider === "forwarding"
                          ? " · Transfert"
                          : ""}
                    </p>
                  </div>
                  <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                    {a.last_synced_at
                      ? new Date(a.last_synced_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
              ))}
              <Link
                to="/settings"
                className="block w-full rounded-2xl border border-dashed border-border py-3 text-center text-xs font-semibold text-muted-foreground hover:bg-surface-muted"
              >
                + Ajouter un compte Gmail
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl glass">
          <div className="flex items-center justify-between border-b border-border px-6 py-5 sm:px-8">
            <h2 className="font-display text-xl tracking-wide sm:text-2xl">
              Analyses prioritaires
            </h2>
            <Link
              to="/inbox"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Tout voir <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {priority.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                Le scan initial alimentera cette liste sous peu.
              </p>
            )}
            {priority.map((e) => (
              <Link
                key={e.id}
                to="/inbox"
                className={`flex items-start justify-between gap-4 px-6 py-5 transition-colors hover:bg-surface-muted/40 sm:px-8 ${
                  e.category === "Phishing" ? "bg-danger/[0.04]" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.sender}</p>
                  <p className="mt-1 truncate text-sm">{e.subject}</p>
                  {e.summary && (
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{e.summary}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <RiskBadge risk={e.risk_score ?? 0} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(e.received_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ChartFallback() {
  return (
    <div
      className="h-full w-full animate-pulse rounded-2xl bg-surface-muted"
      role="status"
      aria-label="Chargement du graphique"
    />
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "danger";
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon
          className={`size-4 ${tone === "danger" ? "text-danger" : "text-muted-foreground"}`}
          strokeWidth={1.5}
        />
      </div>
      <p
        className={`mt-4 font-display text-3xl leading-none tracking-tight sm:text-4xl ${tone === "danger" ? "text-danger" : ""}`}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function RiskBadge({ risk }: { risk: number }) {
  if (risk >= 0.7)
    return (
      <span className="rounded-full bg-danger/15 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-danger">
        risque {risk.toFixed(2)}
      </span>
    );
  if (risk >= 0.3)
    return (
      <span className="rounded-full bg-warn/15 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-warn">
        risque {risk.toFixed(2)}
      </span>
    );
  return (
    <span className="rounded-full bg-safe/15 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-safe">
      sûr {risk.toFixed(2)}
    </span>
  );
}
