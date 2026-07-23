import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Zap } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useEmails } from "@/lib/data-hooks";

export const Route = createFileRoute("/actions")({
  head: () => ({
    meta: [
      { title: "Actions requises — MailMind AI" },
      { name: "description", content: "Les e-mails qui demandent une action de votre part." },
    ],
  }),
  component: ActionsPage,
});

const ACTION_INTENTS = [
  "action",
  "rdv",
  "rendez-vous",
  "facture",
  "demande",
  "réponse",
  "validation",
  "signature",
];

function ActionsPage() {
  const { emails, loading } = useEmails();
  const actions = emails.filter((e) => {
    if (e.category === "Urgent" || e.category === "Reporting" || e.category === "RH") return true;
    const intent = (e.intent ?? "").toLowerCase();
    return ACTION_INTENTS.some((i) => intent.includes(i));
  });

  if (!loading && actions.length === 0) {
    return (
      <AppShell title="Action requise">
        <EmptyState
          icon={CheckCircle2}
          title="Inbox zéro 🎉"
          description="Aucune action n'attend votre intervention pour le moment."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Action requise">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center gap-3 rounded-2xl glass p-5">
          <Zap className="size-5 shrink-0 text-foreground" />
          <div>
            <h2 className="font-display text-lg tracking-wide">
              {actions.length} action{actions.length > 1 ? "s" : ""} en attente
            </h2>
            <p className="text-xs text-muted-foreground">Trié par urgence détectée par l'IA.</p>
          </div>
        </div>

        <div className="space-y-3">
          {actions.map((e) => (
            <Link
              key={e.id}
              to="/inbox"
              className="block rounded-2xl glass p-5 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{e.sender}</span>
                    {e.intent && (
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-muted-foreground">
                        {e.intent}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{e.subject}</p>
                  {e.summary && <p className="mt-2 text-xs text-muted-foreground">{e.summary}</p>}
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
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
    </AppShell>
  );
}
