import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProviderIcon } from "@/components/ProviderIcons";
import { useAccounts, useEmails, useUserSettings } from "@/lib/data-hooks";
import { disconnectAccount, getGmailAuthUrl, syncMyAccount } from "@/lib/gmail.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/settings")({
  validateSearch: z.object({ gmail: z.string().optional() }).parse,
  head: () => ({
    meta: [
      { title: "Paramètres — MailMind AI" },
      { name: "description", content: "Gérez vos comptes, préférences IA, listes et exports." },
    ],
  }),
  component: SettingsPage,
});

const tabs = ["Comptes", "Préférences IA", "Listes", "Notifications", "Exports"] as const;
type Tab = (typeof tabs)[number];

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Comptes");
  const search = useSearch({ from: "/settings" });

  useEffect(() => {
    if (search.gmail?.startsWith("error:")) {
      toast.error(`Connexion Gmail échouée (${search.gmail.slice(6)})`);
    }
  }, [search.gmail]);

  return (
    <AppShell title="Paramètres">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative whitespace-nowrap px-3 py-2 text-sm transition-colors ${
                tab === t
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />}
            </button>
          ))}
        </div>

        {tab === "Comptes" && <AccountsTab />}
        {tab === "Préférences IA" && <PreferencesTab />}
        {tab === "Listes" && <ListsTab />}
        {tab === "Notifications" && <NotificationsTab />}
        {tab === "Exports" && <ExportsTab />}
      </div>
    </AppShell>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl glass p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccountsTab() {
  const { accounts, loading } = useAccounts();
  const getUrl = useServerFn(getGmailAuthUrl);
  const sync = useServerFn(syncMyAccount);
  const disconnect = useServerFn(disconnectAccount);
  const [pending, setPending] = useState<string | null>(null);

  async function connectGmail() {
    setPending("connect");
    try {
      const { url } = await getUrl({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      setPending(null);
    }
  }

  async function handleSync(id: string) {
    setPending(id);
    try {
      const r = await sync({ data: { accountId: id } });
      toast.success(`Sync OK — ${r.inserted} nouveaux, ${r.analyzed} analysés.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync échouée");
    } finally {
      setPending(null);
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm("Déconnecter ce compte et supprimer ses tokens ?")) return;
    setPending(id);
    try {
      await disconnect({ data: { accountId: id } });
      toast.success("Compte déconnecté");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card
      title="Comptes connectés"
      desc="Connectez Gmail via OAuth 2.0. Tokens chiffrés côté serveur — révocation immédiate."
    >
      <div className="space-y-3">
        {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {!loading && accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun compte mail connecté pour le moment.
          </p>
        )}
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl glass-subtle p-4">
            <ProviderIcon provider={a.provider} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{a.display_name ?? a.email}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {a.email} ·{" "}
                {a.last_synced_at
                  ? `sync ${new Date(a.last_synced_at).toLocaleString("fr-FR")}`
                  : "jamais synchronisé"}
                {a.status !== "connected" && ` · ${a.status}`}
              </p>
            </div>
            <button
              onClick={() => handleSync(a.id)}
              disabled={pending === a.id}
              title="Synchroniser"
              className="grid size-9 place-items-center rounded-md glass-subtle text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {pending === a.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </button>
            <button
              onClick={() => handleDisconnect(a.id)}
              disabled={pending === a.id}
              className="grid size-9 place-items-center rounded-md glass-subtle text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button
          onClick={connectGmail}
          disabled={pending === "connect"}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-white/[0.03] disabled:opacity-50"
        >
          {pending === "connect" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Connecter un compte Gmail
        </button>
      </div>
    </Card>
  );
}

function PreferencesTab() {
  const { settings, loading, updateSettings } = useUserSettings();
  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  return (
    <>
      <Card
        title="Sensibilité de la détection"
        desc="Plus la sensibilité est élevée, plus l'IA flagge agressivement."
      >
        <Slider
          label="Phishing"
          value={settings.phishingSensitivity}
          onChange={(value) => void updateSettings({ phishingSensitivity: value })}
        />
        <Slider
          label="Urgence"
          value={settings.urgencySensitivity}
          onChange={(value) => void updateSettings({ urgencySensitivity: value })}
        />
        <Slider
          label="Bruit (newsletters)"
          value={settings.noiseSensitivity}
          onChange={(value) => void updateSettings({ noiseSensitivity: value })}
        />
      </Card>
      <Card title="Résumés automatiques">
        <Toggle
          label="Résumer les threads de plus de 5 messages"
          on={settings.autoSummarizeThreads}
          onChange={(autoSummarizeThreads) => void updateSettings({ autoSummarizeThreads })}
        />
        <Toggle
          label="Générer un digest quotidien à 8h"
          on={settings.dailyDigest}
          onChange={(dailyDigest) => void updateSettings({ dailyDigest })}
        />
        <Toggle
          label="Suggérer des réponses IA"
          on={settings.aiReplies}
          onChange={(aiReplies) => void updateSettings({ aiReplies })}
        />
      </Card>
    </>
  );
}

function ListsTab() {
  const { settings, loading, updateSettings } = useUserSettings();
  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  return (
    <>
      <Card title="Whitelist" desc="Ces expéditeurs / domaines ne sont jamais flaggés.">
        <TagInput
          tags={settings.whitelist}
          onChange={(whitelist) => void updateSettings({ whitelist })}
        />
      </Card>
      <Card title="Blacklist" desc="Domaines surveillés de très près ou bloqués.">
        <TagInput
          tags={settings.blacklist}
          onChange={(blacklist) => void updateSettings({ blacklist })}
        />
      </Card>
    </>
  );
}

function NotificationsTab() {
  const { settings, loading, updateSettings } = useUserSettings();
  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  return (
    <>
      <Card title="Canaux">
        <Toggle
          label="Notifications push"
          on={settings.pushNotifications}
          onChange={(pushNotifications) => void updateSettings({ pushNotifications })}
        />
        <Toggle
          label="E-mail digest quotidien"
          on={settings.emailDigest}
          onChange={(emailDigest) => void updateSettings({ emailDigest })}
        />
        <Toggle
          label="Slack — alertes critiques"
          on={settings.slackAlerts}
          onChange={(slackAlerts) => void updateSettings({ slackAlerts })}
        />
      </Card>
      <Card title="Mode silencieux" desc="Aucune notification pendant ces plages horaires.">
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.quietStart}
            onChange={(e) => void updateSettings({ quietStart: e.target.value })}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="time"
            value={settings.quietEnd}
            onChange={(e) => void updateSettings({ quietEnd: e.target.value })}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>
      </Card>
    </>
  );
}

function ExportsTab() {
  const { emails } = useEmails();
  function download(kind: "summary" | "entities" | "json") {
    const rows = emails.map((email) => ({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      received_at: email.received_at,
      summary: email.summary,
      category: email.category,
      intent: email.intent,
      sentiment: email.sentiment,
      risk_score: email.risk_score,
      entities: email.entities,
    }));
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    let content = "";
    let type = "text/plain;charset=utf-8";
    let extension = "txt";
    if (kind === "json") {
      content = JSON.stringify(rows, null, 2);
      type = "application/json;charset=utf-8";
      extension = "json";
    } else {
      const selected =
        kind === "entities"
          ? rows.map((row) => ({ id: row.id, subject: row.subject, entities: row.entities }))
          : rows.map((row) => ({
              id: row.id,
              sender: row.sender,
              subject: row.subject,
              received_at: row.received_at,
              summary: row.summary,
              category: row.category,
              risk_score: row.risk_score,
            }));
      const headers = Object.keys(selected[0] ?? { id: "" });
      content = [
        headers.join(","),
        ...selected.map((row) =>
          headers.map((header) => escapeCsv(row[header as keyof typeof row])).join(","),
        ),
      ].join("\n");
      type = "text/csv;charset=utf-8";
      extension = "csv";
    }
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mailmind-${kind}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Card
      title="Exporter vos analyses"
      desc="Téléchargez vos résumés, entités et analyses au format CSV ou JSON."
    >
      <div className="flex flex-wrap gap-3">
        {[
          { label: "CSV — résumés", kind: "summary" },
          { label: "CSV — entités", kind: "entities" },
          { label: "JSON — complet", kind: "json" },
        ].map((f) => (
          <button
            key={f.kind}
            onClick={() => download(f.kind as "summary" | "entities" | "json")}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            <Download className="size-4" /> {f.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[color:var(--color-primary)]"
      />
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2 text-sm">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-background transition-transform ${
            on ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px]"
          >
            {t}
            <button
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="text-muted-foreground hover:text-danger"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="domaine.com ou personne@domaine.com"
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs"
        />
        <button
          onClick={() => {
            if (val.trim() && !tags.includes(val.trim())) {
              onChange([...tags, val.trim()]);
              setVal("");
            }
          }}
          className="rounded-md bg-foreground px-4 text-xs font-semibold text-background"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
