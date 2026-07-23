import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useEmails } from "@/lib/data-hooks";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alertes sécurité — MailMind AI" },
      { name: "description", content: "Tous les e-mails à risque détectés par MailMind." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { emails, loading } = useEmails();
  const alerts = emails
    .filter(
      (e) => (e.risk_score ?? 0) >= 0.6 || e.category === "Phishing" || e.category === "Sécurité",
    )
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));

  if (!loading && alerts.length === 0) {
    return (
      <AppShell title="Alertes sécurité">
        <EmptyState
          icon={ShieldCheck}
          title="Aucune menace détectée"
          description="Le pare-feu anti-phishing surveille vos comptes en continu. Vous serez prévenu dès qu'un e-mail suspect arrive."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Alertes sécurité">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" />
            <div>
              <h2 className="font-display text-lg tracking-wide text-danger">
                {alerts.length} e-mail{alerts.length > 1 ? "s" : ""} à risque
              </h2>
              <p className="mt-1 text-sm text-danger/80">
                Score ≥ 0.60 ou catégorie phishing/sécurité. Examinez avant toute action.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl glass">
          {alerts.map((e) => (
            <Link
              key={e.id}
              to="/inbox"
              className="block border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-surface-muted/40 sm:px-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{e.sender}</span>
                    {e.category && (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-danger">
                        {e.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm">{e.subject}</p>
                  {e.summary && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{e.summary}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-danger/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-danger">
                  {(e.risk_score ?? 0).toFixed(2)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
