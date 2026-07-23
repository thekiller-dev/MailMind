import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, Flag, Inbox as InboxIcon, Reply, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useEmails, type DbEmail } from "@/lib/data-hooks";
import { archiveEmail, reportEmail, sendEmailReply } from "@/lib/gmail.functions";
import { generateEmailReply } from "@/lib/email-analysis.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/inbox")({
  validateSearch: z.object({ q: z.string().optional() }).parse,
  head: () => ({
    meta: [
      { title: "Inbox — MailMind AI" },
      { name: "description", content: "Inbox unifiée avec fiche d'analyse IA en temps réel." },
    ],
  }),
  component: InboxPage,
});

const filters = ["Tous", "Urgent", "Phishing", "Finance", "Collaboration", "Notification"] as const;
type Filter = (typeof filters)[number];

function InboxPage() {
  const { emails, loading } = useEmails();
  const search = useSearch({ from: "/inbox" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Tous");
  const [query, setQuery] = useState(search.q ?? "");

  useEffect(() => setQuery(search.q ?? ""), [search.q]);

  const visible = useMemo(() => {
    return emails.filter((e) => {
      if (filter !== "Tous" && e.category !== filter) return false;
      if (
        query &&
        !`${e.sender} ${e.subject} ${e.summary ?? ""}`.toLowerCase().includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [emails, filter, query]);

  const selected = emails.find((e) => e.id === selectedId) ?? visible[0] ?? null;

  if (!loading && emails.length === 0) {
    return (
      <AppShell title="Inbox unifiée">
        <EmptyState
          icon={InboxIcon}
          title="Votre inbox est vide"
          description="Connectez un compte mail dans les paramètres pour lancer le scan initial et voir vos e-mails analysés ici."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Inbox unifiée">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
        {/* List */}
        <div className="flex w-full shrink-0 flex-col border-b border-border bg-background lg:w-96 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    filter === f
                      ? "bg-foreground text-background"
                      : "bg-surface-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {visible.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`block w-full p-4 text-left transition-colors ${
                  selected?.id === e.id
                    ? "bg-surface-muted"
                    : e.category === "Phishing"
                      ? "bg-danger/5 hover:bg-danger/10"
                      : "hover:bg-surface-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{e.sender}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {new Date(e.received_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm">{e.subject}</p>
                {e.summary && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{e.summary}</p>
                )}
                {e.category && (
                  <span className="mt-2 inline-block rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-muted-foreground">
                    {e.category}
                  </span>
                )}
              </button>
            ))}
            {visible.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Aucun résultat.</div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          {selected && <EmailDetail email={selected} />}
        </div>
      </div>
    </AppShell>
  );
}

function EmailDetail({ email }: { email: DbEmail }) {
  const entities = Array.isArray(email.entities)
    ? (email.entities as { type: string; value: string }[])
    : [];
  const risk = email.risk_score ?? 0;
  const archive = useServerFn(archiveEmail);
  const report = useServerFn(reportEmail);
  const generate = useServerFn(generateEmailReply);
  const send = useServerFn(sendEmailReply);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState<"archive" | "report" | "generate" | "send" | null>(null);

  async function handleArchive() {
    setPending("archive");
    try {
      await archive({ data: { emailId: email.id } });
      toast.success("E-mail archivé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archivage impossible");
    } finally {
      setPending(null);
    }
  }

  async function handleReport() {
    setPending("report");
    try {
      await report({ data: { emailId: email.id } });
      toast.success("E-mail signalé comme indésirable");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signalement impossible");
    } finally {
      setPending(null);
    }
  }

  async function handleGenerate() {
    setPending("generate");
    try {
      const result = await generate({
        data: {
          sender: email.sender,
          subject: email.subject,
          body: email.body ?? email.snippet ?? "",
        },
      });
      setReply(result.text);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Génération impossible");
    } finally {
      setPending(null);
    }
  }

  async function handleSend() {
    setPending("send");
    try {
      await send({ data: { emailId: email.id, body: reply } });
      toast.success("Réponse envoyée");
      setReply("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b border-border px-6 py-5 sm:px-8 sm:py-6">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            {email.subject}
          </h2>
          <p className="mt-2 text-sm font-medium">{email.sender}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {new Date(email.received_at).toLocaleString("fr-FR")}
          </p>
          <div className="mt-4 flex gap-2">
            <IconButton
              icon={Reply}
              label="Générer une réponse"
              onClick={handleGenerate}
              disabled={pending !== null}
            />
            <IconButton
              icon={Archive}
              label="Archiver"
              onClick={handleArchive}
              disabled={pending !== null}
            />
            <IconButton
              icon={Flag}
              label="Signaler"
              onClick={handleReport}
              disabled={pending !== null}
            />
          </div>
        </div>
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <p className="whitespace-pre-line text-sm leading-relaxed">{email.body}</p>
        </div>
      </div>

      <aside className="w-full shrink-0 border-t border-border bg-surface-muted/30 p-5 sm:p-6 xl:w-96 xl:border-l xl:border-t-0">
        <div className="mb-6 flex items-center gap-2">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="font-display text-xs font-bold uppercase tracking-widest">
            MindPanel
          </span>
        </div>
        <div className="space-y-6">
          {email.summary && (
            <Section title="Résumé">
              <p className="text-sm leading-relaxed">{email.summary}</p>
            </Section>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Intention" value={email.intent ?? "—"} />
            <Mini label="Sentiment" value={email.sentiment ?? "—"} />
          </div>
          {entities.length > 0 && (
            <Section title="Entités extraites">
              <div className="flex flex-wrap gap-2">
                {entities.map((e, i) => (
                  <span
                    key={i}
                    className="rounded border border-border bg-surface px-2 py-1 font-mono text-[10px]"
                    title={e.type}
                  >
                    {e.value}
                  </span>
                ))}
              </div>
            </Section>
          )}
          <RiskCard risk={risk} reason={email.risk_reason} />
          {reply ? (
            <div className="space-y-2">
              <label
                htmlFor="reply"
                className="font-mono text-[10px] font-bold uppercase text-muted-foreground"
              >
                Réponse proposée
              </label>
              <textarea
                id="reply"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                className="min-h-32 w-full rounded-lg border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={pending !== null || !reply.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground py-2.5 text-xs font-semibold text-background disabled:opacity-50"
                >
                  Envoyer
                </button>
                <button
                  onClick={() => setReply("")}
                  disabled={pending !== null}
                  className="rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={pending !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2.5 text-xs font-semibold text-background transition-transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />{" "}
              {pending === "generate" ? "Génération…" : "Générer une réponse IA"}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="font-mono text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
        {title}
      </h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function RiskCard({ risk, reason }: { risk: number; reason: string | null }) {
  const tone = risk >= 0.7 ? "danger" : risk >= 0.3 ? "warn" : "safe";
  const Icon = tone === "danger" ? Flag : ShieldCheck;
  const tc = tone === "danger" ? "danger" : tone === "warn" ? "warn" : "safe";
  return (
    <section
      className={`rounded-lg border p-4 border-${tc}/20 bg-${tc}/5`}
      style={{
        borderColor: `color-mix(in oklab, var(--color-${tc}) 20%, transparent)`,
        background: `color-mix(in oklab, var(--color-${tc}) 5%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between">
        <h4
          className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-tighter"
          style={{ color: `var(--color-${tc})` }}
        >
          <Icon className="size-3" /> Risk Score
        </h4>
        <span className="font-mono text-sm font-bold" style={{ color: `var(--color-${tc})` }}>
          {risk.toFixed(2)}
        </span>
      </div>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full"
        style={{ background: `color-mix(in oklab, var(--color-${tc}) 10%, transparent)` }}
      >
        <div
          className="h-full"
          style={{ width: `${risk * 100}%`, background: `var(--color-${tc})` }}
        />
      </div>
      {reason && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{reason}</p>}
    </section>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Reply;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
    >
      <Icon className="size-4" />
    </button>
  );
}
