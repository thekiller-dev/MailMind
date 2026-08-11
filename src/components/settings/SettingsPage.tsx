import { Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Send,
  RefreshCw,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FirstEmailGuideModal } from "@/components/FirstEmailGuideModal";
import { ProviderIcon } from "@/components/ProviderIcons";
import {
  useAccounts,
  useEmails,
  useUser,
  useUserSettings,
  type UserSettings,
} from "@/lib/data-hooks";
import { disconnectAccount, getGmailAuthUrl, syncMyAccount } from "@/lib/gmail.functions";
import { createForwardingInbox, getForwardingInbox } from "@/lib/forwarding.functions";
import { cleanupOldEmails } from "@/lib/email-cleanup.functions";
import { getMyPlan } from "@/lib/plan.functions";
import {
  getBillingSnapshot,
  openBillingPortal,
  startProCheckout,
  type BillingSnapshot,
} from "@/lib/billing.functions";
import { getMyChannelNotifyDiagnostics } from "@/lib/channel-notify-diagnostics.functions";
import type { ChannelNotifyDiagnostics } from "@/lib/channel-notify-diagnostics.server";
import {
  createTelegramLink,
  getTelegramConnection,
  unlinkTelegram,
  updateTelegramPreferences,
} from "@/lib/telegram.functions";
import {
  createWhatsAppLink,
  getWhatsAppConnection,
  unlinkWhatsApp,
  updateWhatsAppPreferences,
} from "@/lib/whatsapp.functions";
import {
  createKappelasLink,
  getKappelasConnection,
  unlinkKappelas,
  updateKappelasPreferences,
} from "@/lib/kappelas.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { UserPlan } from "@/lib/plan.server";

const tabs = [
  "Comptes",
  "Abonnement",
  "Préférences IA",
  "Listes",
  "Notifications",
  "Exports",
] as const;
type Tab = (typeof tabs)[number];

export function SettingsPage({ gmailStatus }: { gmailStatus?: string }) {
  const [tab, setTab] = useState<Tab>("Comptes");

  useEffect(() => {
    if (gmailStatus === "connected") {
      toast.success("Compte Gmail ajouté. Vous pouvez synchroniser ce compte depuis Paramètres.");
      return;
    }
    if (gmailStatus?.startsWith("error:")) {
      const code = gmailStatus.slice(6);
      const message =
        code === "redirect_uri_mismatch"
          ? "Google refuse l’URL OAuth. Ajoutez https://www.mailmind.me/api/gmail/callback dans Google Cloud Console."
          : code === "access_denied"
            ? "Autorisation Gmail refusée. Réessayez et acceptez les permissions demandées."
            : code === "missing_refresh_token" || code.includes("refresh")
              ? "Google n’a pas renvoyé de jeton de renouvellement. Déconnectez MailMind dans votre compte Google puis reconnectez."
              : code === "missing_params"
                ? "Google n’a pas renvoyé les paramètres nécessaires."
                : `Connexion Gmail échouée (${code})`;
      toast.error(message);
    }
  }, [gmailStatus]);

  return (
    <AppShell title="Paramètres">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div
          className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
          role="tablist"
          aria-label="Sections des paramètres"
        >
          {tabs.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTab(t)}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`settings-panel-${tabs.indexOf(t)}`}
              id={`settings-tab-${tabs.indexOf(t)}`}
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

        <div
          role="tabpanel"
          id={`settings-panel-${tabs.indexOf(tab)}`}
          aria-labelledby={`settings-tab-${tabs.indexOf(tab)}`}
        >
          {tab === "Comptes" && <AccountsTab />}
          {tab === "Abonnement" && <BillingTab />}
          {tab === "Préférences IA" && <PreferencesTab />}
          {tab === "Listes" && <ListsTab />}
          {tab === "Notifications" && <NotificationsTab />}
          {tab === "Exports" && <ExportsTab />}
        </div>
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
  const { user } = useUser();
  const { settings, loading: settingsLoading, updateSettings } = useUserSettings();
  const connectGmail = useServerFn(getGmailAuthUrl);
  const sync = useServerFn(syncMyAccount);
  const disconnect = useServerFn(disconnectAccount);
  const getInbox = useServerFn(getForwardingInbox);
  const createInbox = useServerFn(createForwardingInbox);
  const loadPlan = useServerFn(getMyPlan);
  const runCleanup = useServerFn(cleanupOldEmails);
  const [pending, setPending] = useState<string | null>(null);
  const [sourceEmail, setSourceEmail] = useState("");
  const [inboxes, setInboxes] = useState<Awaited<ReturnType<typeof getInbox>>>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showForwarding, setShowForwarding] = useState(false);
  const [plan, setPlan] = useState<UserPlan>("free");
  const [maxAccounts, setMaxAccounts] = useState(1);

  useEffect(() => {
    void loadPlan()
      .then((result) => {
        setPlan(result.plan);
        setMaxAccounts(result.maxEmailAccounts);
      })
      .catch(() => {
        setPlan("free");
        setMaxAccounts(1);
      });
  }, [loadPlan]);

  const atAccountLimit = accounts.length >= maxAccounts;

  useEffect(() => {
    if (!sourceEmail && user?.email) setSourceEmail(user.email);
  }, [sourceEmail, user?.email]);

  useEffect(() => {
    void getInbox()
      .then((result) => {
        setInboxes(result);
        if (result.length > 0) setShowForwarding(true);
      })
      .catch(() => undefined);
  }, [accounts, getInbox]);

  useEffect(() => {
    if (
      !loading &&
      accounts.length === 0 &&
      window.localStorage.getItem("mailmind:first-email-guide") === "1"
    ) {
      setShowGuide(true);
    }
  }, [accounts.length, loading]);

  function closeGuide() {
    window.localStorage.removeItem("mailmind:first-email-guide");
    setShowGuide(false);
  }

  async function setupGmail() {
    if (atAccountLimit) {
      toast.error(
        plan === "pro"
          ? "Limite de 5 comptes e-mail atteinte."
          : "Le plan Free permet un seul compte. Passez en Pro pour en ajouter jusqu’à 5.",
      );
      return;
    }
    setPending("google");
    try {
      const result = await connectGmail({ data: { origin: window.location.origin } });
      window.location.assign(result.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion Google impossible");
      setPending(null);
    }
  }

  async function handleCleanupNow() {
    setPending("cleanup");
    try {
      const days = settings.autoCleanupAfterDays || 5;
      const result = await runCleanup({ data: { days } });
      toast.success(
        result.deleted === 0
          ? "Aucun e-mail à nettoyer."
          : `${result.deleted} e-mail${result.deleted > 1 ? "s" : ""} nettoyé${result.deleted > 1 ? "s" : ""}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nettoyage impossible");
    } finally {
      setPending(null);
    }
  }

  async function setupForwarding() {
    setPending("forwarding");
    try {
      const result = await createInbox({ data: { sourceEmail } });
      setInboxes((current) =>
        current.some((inbox) => inbox.id === result.id) ? current : [...current, result],
      );
      toast.success("Adresse MailMind créée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setPending(null);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copié dans le presse-papiers");
  }

  async function handleSync(id: string) {
    setPending(id);
    try {
      const r = await sync({ data: { accountId: id } });
      const completed = r.processed.find((item) => item.runId === r.queued.id);
      toast.success(
        completed?.ok ? "Synchronisation terminée." : "Synchronisation ajoutée à la file durable.",
      );
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
    <>
      <Card
        title="Comptes Gmail"
        desc="Connectez vos boîtes via l’API Gmail (recommandé). Synchronisation, archive, spam et réponses restent disponibles."
      >
        <div className="space-y-3">
          {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
          {accounts
            .filter((account) => account.provider !== "forwarding")
            .map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl glass-subtle p-4">
                <ProviderIcon provider={a.provider} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.display_name ?? a.email}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {a.email} · Gmail API ·{" "}
                    {a.last_synced_at
                      ? `sync ${new Date(a.last_synced_at).toLocaleString("fr-FR")}`
                      : "jamais synchronisé"}
                    {a.status !== "connected" && ` · ${a.status}`}
                  </p>
                </div>
                {a.provider === "google" && (
                  <button
                    type="button"
                    onClick={() => handleSync(a.id)}
                    disabled={pending === a.id}
                    aria-busy={pending === a.id}
                    title="Synchroniser"
                    aria-label={`Synchroniser ${a.email}`}
                    className="flex h-9 items-center justify-center gap-2 rounded-md glass-subtle px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    {pending === a.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    <span className="hidden sm:inline">Synchroniser</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDisconnect(a.id)}
                  disabled={pending === a.id}
                  aria-busy={pending === a.id}
                  aria-label={`Déconnecter ${a.email}`}
                  className="grid size-9 place-items-center rounded-md glass-subtle text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={setupGmail}
              disabled={pending === "google" || atAccountLimit}
              aria-busy={pending === "google"}
              title={
                atAccountLimit
                  ? plan === "pro"
                    ? "Limite de 5 comptes atteinte"
                    : "Plan Free : 1 compte maximum"
                  : undefined
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
            >
              {pending === "google" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Ajouter un compte Gmail
            </button>
            <Link
              to="/connect-email"
              className="flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-muted"
            >
              Comment connecter un e-mail
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Plan {plan === "pro" ? "Pro" : "Free"} — {accounts.length}/{maxAccounts} compte
            {maxAccounts > 1 ? "s" : ""}
            {atAccountLimit && plan === "free"
              ? " · Ouvrez l’onglet Abonnement pour passer en Pro."
              : ""}
          </p>
        </div>
      </Card>

      <Card
        title="Rétention des e-mails"
        desc="Supprimez automatiquement les e-mails trop anciens de MailMind (pas de votre boîte Gmail)."
      >
        {settingsLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <div className="space-y-4">
            <Toggle
              label="Nettoyage auto après 5 jours"
              on={Boolean(settings.autoCleanupAfterDays && settings.autoCleanupAfterDays > 0)}
              onChange={(value) => void updateSettings({ autoCleanupAfterDays: value ? 5 : null })}
            />
            <button
              type="button"
              onClick={() => void handleCleanupNow()}
              disabled={pending === "cleanup"}
              aria-busy={pending === "cleanup"}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-muted disabled:opacity-50"
            >
              {pending === "cleanup" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Nettoyer maintenant
            </button>
          </div>
        )}
      </Card>

      <Card
        title="Méthode alternative : transfert"
        desc="Sans accès OAuth à votre compte Google. Les messages arrivent via une adresse MailMind privée."
      >
        <button
          type="button"
          onClick={() => setShowForwarding((value) => !value)}
          aria-expanded={showForwarding}
          aria-controls="forwarding-settings"
          className="text-sm font-semibold text-primary hover:underline"
        >
          {showForwarding ? "Masquer le transfert" : "Configurer un transfert Gmail"}
        </button>

        {showForwarding && (
          <div id="forwarding-settings" className="mt-5 space-y-3">
            {inboxes.map((inbox) => (
              <div key={inbox.id} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Transfert Gmail · {inbox.sourceEmail}
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold">
                      {inbox.address}
                    </p>
                  </div>
                  {inbox.address && (
                    <button
                      type="button"
                      onClick={() => copy(inbox.address!)}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted"
                    >
                      <Copy className="size-3.5" /> Copier
                    </button>
                  )}
                </div>

                <ol className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <li>
                    1. Ouvrez Gmail sur ordinateur, puis Paramètres → Voir tous les paramètres.
                  </li>
                  <li>2. Dans « Transfert et POP/IMAP », ajoutez l’adresse MailMind ci-dessus.</li>
                  <li>3. Revenez ici lorsque Google a envoyé le message de confirmation.</li>
                  <li>4. Saisissez le code dans Gmail, activez le transfert et enregistrez.</li>
                </ol>

                {inbox.confirmationCode && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-primary/10 p-3">
                    <CheckCircle2 className="size-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Code de confirmation Gmail</p>
                      <p className="font-mono text-lg font-bold tracking-wider">
                        {inbox.confirmationCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(inbox.confirmationCode!)}
                      aria-label="Copier le code de confirmation"
                      className="rounded-md border border-border p-2 hover:bg-background"
                      title="Copier le code"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                )}

                {inbox.confirmationUrl && (
                  <a
                    href={inbox.confirmationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                  >
                    Confirmer directement chez Google <ExternalLink className="size-3.5" />
                  </a>
                )}

                {inbox.status === "connected" && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-medium text-safe">
                    <CheckCircle2 className="size-4" /> Transfert actif
                  </p>
                )}
              </div>
            ))}

            <div className="rounded-xl border border-dashed border-border p-4">
              <label className="text-xs font-medium" htmlFor="forwarding-source-email">
                Adresse Gmail source pour le transfert
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="forwarding-source-email"
                  type="email"
                  value={sourceEmail}
                  onChange={(event) => setSourceEmail(event.target.value)}
                  placeholder="autre-compte@gmail.com"
                  className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={setupForwarding}
                  disabled={pending === "forwarding" || !sourceEmail || atAccountLimit}
                  aria-busy={pending === "forwarding"}
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
                >
                  {pending === "forwarding" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  Ajouter le transfert
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
      {showGuide && <FirstEmailGuideModal onClose={closeGuide} />}
    </>
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
          label="Résumer les threads de plus de 5 messages — bientôt disponible"
          on={false}
          onChange={() => undefined}
          disabled
        />
        <Toggle
          label="Générer un digest quotidien à 8h — bientôt disponible"
          on={false}
          onChange={() => undefined}
          disabled
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

function BillingTab() {
  const loadBilling = useServerFn(getBillingSnapshot);
  const checkout = useServerFn(startProCheckout);
  const portal = useServerFn(openBillingPortal);
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      toast.success("Abonnement Pro activé (ou en cours de confirmation Stripe).");
    }
  }, []);

  useEffect(() => {
    void loadBilling()
      .then(setBilling)
      .catch(() => setBilling(null));
  }, [loadBilling]);

  async function goCheckout() {
    setPending("checkout");
    try {
      const result = await checkout();
      window.location.assign(result.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout impossible");
      setPending(null);
    }
  }

  async function goPortal() {
    setPending("portal");
    try {
      const result = await portal();
      window.location.assign(result.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Portail impossible");
      setPending(null);
    }
  }

  if (!billing) {
    return <p className="text-sm text-muted-foreground">Chargement de l’abonnement…</p>;
  }

  return (
    <Card
      title="Abonnement"
      desc="Free ou Pro. L’upgrade Pro débloque 5 comptes, Telegram/WhatsApp et des quotas IA plus élevés."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider">
            Plan {billing.plan === "pro" ? "Pro" : "Free"}
          </span>
          {billing.stripeSubscriptionStatus ? (
            <span className="text-xs text-muted-foreground">
              Stripe : {billing.stripeSubscriptionStatus}
            </span>
          ) : null}
        </div>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Comptes e-mail : jusqu’à {billing.maxEmailAccounts}</li>
          <li>Analyses IA / jour : {billing.plan === "pro" ? "2 000" : "100"} (selon env)</li>
          <li>
            Canaux Telegram / WhatsApp : {billing.plan === "pro" ? "inclus" : "Pro uniquement"}
          </li>
        </ul>
        <div className="flex flex-wrap gap-3">
          {billing.plan !== "pro" ? (
            <button
              type="button"
              onClick={goCheckout}
              disabled={!billing.stripeConfigured || pending === "checkout"}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
            >
              {pending === "checkout" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Passer en Pro — 19€/mois"
              )}
            </button>
          ) : null}
          {billing.canManageBilling || billing.plan === "pro" ? (
            <button
              type="button"
              onClick={goPortal}
              disabled={!billing.stripeConfigured || pending === "portal"}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-50"
            >
              {pending === "portal" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Gérer l’abonnement"
              )}
            </button>
          ) : null}
          <Link
            to="/pricing"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold"
          >
            Voir les tarifs
          </Link>
        </div>
        {!billing.stripeConfigured ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Stripe n’est pas encore configuré côté serveur (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`,
            `STRIPE_WEBHOOK_SECRET`).
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function NotificationsTab() {
  const { settings, loading, updateSettings } = useUserSettings();
  const loadPlan = useServerFn(getMyPlan);
  const loadDiagnostics = useServerFn(getMyChannelNotifyDiagnostics);
  const [plan, setPlan] = useState<UserPlan>("free");
  const [diagnostics, setDiagnostics] = useState<ChannelNotifyDiagnostics | null>(null);

  useEffect(() => {
    void loadPlan()
      .then((result) => setPlan(result.plan))
      .catch(() => setPlan("free"));
  }, [loadPlan]);

  useEffect(() => {
    void loadDiagnostics()
      .then(setDiagnostics)
      .catch(() => setDiagnostics(null));
  }, [loadDiagnostics, plan]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  const isPro = plan === "pro";
  return (
    <>
      {diagnostics?.blockers.length ? (
        <Card
          title="Diagnostic alertes"
          desc="Pourquoi Telegram / WhatsApp / Kappelas peuvent rester silencieux."
        >
          <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
            {diagnostics.blockers.map((blocker) => (
              <li key={blocker}>• {blocker}</li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Plan {diagnostics.plan} · TG {diagnostics.telegram.linked ? "oui" : "non"} · WA{" "}
            {diagnostics.whatsapp.linked ? "oui" : "non"} · Kappelas{" "}
            {diagnostics.kappelas.linked ? "oui" : "non"} · bot TG{" "}
            {diagnostics.telegramBotConfigured ? "ok" : "—"} · OpenWA{" "}
            {diagnostics.openWaConfigured ? "ok" : "—"} · Kappelas SDK{" "}
            {diagnostics.kappelasConfigured ? "ok" : "—"}
          </p>
        </Card>
      ) : null}
      {isPro ? (
        <>
          <TelegramCard settings={settings} updateSettings={updateSettings} />
          <WhatsAppCard settings={settings} updateSettings={updateSettings} />
          <KappelasCard settings={settings} updateSettings={updateSettings} />
        </>
      ) : (
        <Card
          title="Canaux messagerie — Pro"
          desc="Telegram, WhatsApp et Kappelas sont réservés au plan Pro."
        >
          <p className="text-sm text-muted-foreground">
            Passez en Pro pour lier vos canaux, recevoir les récaps après chaque analyse et piloter
            MailMind par commandes.
          </p>
          <p className="mt-4 inline-flex rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Plan actuel : Free — onglet Abonnement pour upgrader
          </p>
        </Card>
      )}
      <Card title="Canaux">
        <Toggle
          label="Notifications push — bientôt disponible"
          on={false}
          onChange={() => undefined}
          disabled
        />
        <Toggle
          label="E-mail digest quotidien — bientôt disponible"
          on={false}
          onChange={() => undefined}
          disabled
        />
        <Toggle
          label="Slack — aucune intégration disponible"
          on={false}
          onChange={() => undefined}
          disabled
        />
      </Card>
      <Card title="Mode silencieux" desc="Aucune notification pendant ces plages horaires.">
        <div className="flex items-center gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Début
            <input
              type="time"
              value={settings.quietStart}
              onChange={(e) => void updateSettings({ quietStart: e.target.value })}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <span className="text-muted-foreground">→</span>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Fin
            <input
              type="time"
              value={settings.quietEnd}
              onChange={(e) => void updateSettings({ quietEnd: e.target.value })}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
        </div>
      </Card>
    </>
  );
}

function TelegramCard({
  settings,
  updateSettings,
}: {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const getConnection = useServerFn(getTelegramConnection);
  const createLink = useServerFn(createTelegramLink);
  const updatePreferences = useServerFn(updateTelegramPreferences);
  const unlink = useServerFn(unlinkTelegram);
  const [connection, setConnection] = useState<Awaited<ReturnType<typeof getConnection>> | null>(
    null,
  );
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void getConnection()
      .then(setConnection)
      .catch(() => setConnection(null));
  }, [getConnection]);

  async function generateLink() {
    setPending(true);
    try {
      const result = await createLink();
      setLink(result.botLink);
      toast.success("Lien Telegram généré pour 15 minutes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Telegram n'est pas disponible");
    } finally {
      setPending(false);
    }
  }

  async function changePreference(
    field: "urgentAlerts" | "phishingAlerts" | "summaryAlerts" | "summaryDigest" | "commandAccess",
    value: boolean,
  ) {
    try {
      const next = await updatePreferences({ data: { [field]: value } });
      setConnection(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible");
    }
  }

  async function removeTelegram() {
    if (!confirm("Retirer définitivement ce chat Telegram de MailMind ?")) return;
    setPending(true);
    try {
      await unlink();
      setConnection(null);
      setLink(null);
      toast.success("Telegram a été déconnecté.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Déconnexion impossible");
    } finally {
      setPending(false);
    }
  }

  const isLinked = connection?.status === "linked";
  return (
    <Card
      title="Telegram"
      desc="Recevez les alertes urgentes, les alertes phishing et vos résumés. Les commandes restent limitées à votre compte."
    >
      {!isLinked ? (
        <>
          <p className="text-sm text-muted-foreground">
            Générez un lien, ouvrez-le dans Telegram et appuyez sur Démarrer. Le lien expire après
            15 minutes.
          </p>
          <button
            type="button"
            onClick={generateLink}
            disabled={pending}
            aria-busy={pending}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            <Send className="size-4" />
            {pending ? "Génération…" : "Lier Telegram"}
          </button>
          {link && (
            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs font-semibold text-primary hover:underline"
              >
                Ouvrir le lien Telegram
              </a>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(link)}
                className="mt-2 block text-xs text-muted-foreground hover:text-foreground"
              >
                Copier le lien
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Connecté{connection.username ? ` à @${connection.username}` : ""}
            </p>
            <button
              type="button"
              onClick={() => void removeTelegram()}
              disabled={pending}
              aria-busy={pending}
              className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
            >
              Déconnecter
            </button>
          </div>
          <div className="mt-4 space-y-1">
            <Toggle
              label="Récap après chaque analyse"
              on={connection.summary_alerts !== false}
              onChange={(value) => void changePreference("summaryAlerts", value)}
            />
            <Toggle
              label="Alertes urgentes"
              on={connection.urgent_alerts}
              onChange={(value) => void changePreference("urgentAlerts", value)}
            />
            <Toggle
              label="Alertes phishing et sécurité"
              on={connection.phishing_alerts}
              onChange={(value) => void changePreference("phishingAlerts", value)}
            />
            <Toggle
              label="Digest quotidien des résumés"
              on={connection.summary_digest}
              onChange={(value) => void changePreference("summaryDigest", value)}
            />
            <Toggle
              label="Autoriser les commandes Telegram"
              on={connection.command_access}
              onChange={(value) => void changePreference("commandAccess", value)}
            />
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-semibold">Digest Telegram</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choisissez l’heure locale d’envoi de votre récapitulatif.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                Heure
                <input
                  type="time"
                  value={settings.telegramDigestTime}
                  onChange={(event) =>
                    void updateSettings({ telegramDigestTime: event.target.value })
                  }
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-[2] flex-col gap-1 text-xs text-muted-foreground">
                Fuseau horaire
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={(event) => void updateSettings({ timezone: event.target.value })}
                  placeholder="Europe/Paris"
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Commandes : /help, /status, /digest, /alerts et /unlink.
          </p>
        </>
      )}
    </Card>
  );
}

function WhatsAppCard({
  settings,
  updateSettings,
}: {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const getConnection = useServerFn(getWhatsAppConnection);
  const createLink = useServerFn(createWhatsAppLink);
  const updatePreferences = useServerFn(updateWhatsAppPreferences);
  const unlink = useServerFn(unlinkWhatsApp);
  const [connection, setConnection] = useState<Awaited<ReturnType<typeof getConnection>> | null>(
    null,
  );
  const [linkInfo, setLinkInfo] = useState<{
    deepLink: string | null;
    prefill: string;
    waNumber: string | null;
    expiresAt: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [awaitingLink, setAwaitingLink] = useState(false);

  useEffect(() => {
    void getConnection()
      .then(setConnection)
      .catch(() => setConnection(null));
  }, [getConnection]);

  // Après ouverture du deep link wa.me, interroger le statut jusqu’à liaison ou expiration.
  useEffect(() => {
    if (!awaitingLink || connection?.status === "linked") return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutes à 3 s
    const tick = async () => {
      attempts += 1;
      try {
        const next = await getConnection();
        if (cancelled) return;
        setConnection(next);
        if (next?.status === "linked") {
          setAwaitingLink(false);
          setLinkInfo(null);
          toast.success("WhatsApp est maintenant lié.");
          return;
        }
      } catch {
        /* ignore transient errors while polling */
      }
      if (attempts >= maxAttempts) {
        if (!cancelled) {
          setAwaitingLink(false);
          toast.message("Toujours en attente", {
            description:
              "Renvoie le message « LIEN … » puis actualise Paramètres, ou vérifie le webhook OpenWA.",
          });
        }
        return;
      }
      timer = window.setTimeout(() => void tick(), 3000);
    };
    let timer = window.setTimeout(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [awaitingLink, connection?.status, getConnection]);

  async function generateLink() {
    setPending(true);
    try {
      const result = await createLink();
      setLinkInfo({
        deepLink: result.deepLink,
        prefill: result.prefill,
        waNumber: result.waNumber,
        expiresAt: result.expiresAt,
      });
      const refreshed = await getConnection().catch(() => null);
      if (refreshed) setConnection(refreshed);
      setAwaitingLink(true);
      toast.success("Code WhatsApp généré pour 15 minutes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "WhatsApp n'est pas disponible");
    } finally {
      setPending(false);
    }
  }

  async function changePreference(
    field: "urgentAlerts" | "phishingAlerts" | "summaryAlerts" | "summaryDigest" | "commandAccess",
    value: boolean,
  ) {
    try {
      const next = await updatePreferences({ data: { [field]: value } });
      setConnection(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible");
    }
  }

  async function removeWhatsApp() {
    if (!confirm("Retirer définitivement ce chat WhatsApp de MailMind ?")) return;
    setPending(true);
    try {
      await unlink();
      setConnection(null);
      setLinkInfo(null);
      toast.success("WhatsApp a été déconnecté.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Déconnexion impossible");
    } finally {
      setPending(false);
    }
  }

  const isLinked = connection?.status === "linked";
  const isPendingLink =
    !isLinked && (awaitingLink || connection?.status === "pending" || Boolean(linkInfo));
  return (
    <Card
      title="WhatsApp"
      desc="Recevez les alertes urgentes, les alertes phishing et vos résumés via OpenWA. Les commandes restent limitées à votre compte."
    >
      {!isLinked ? (
        <>
          <p className="text-sm text-muted-foreground">
            Générez un code, ouvrez WhatsApp et envoyez le message prérempli au numéro MailMind. Le
            code expire après 15 minutes.
          </p>
          {isPendingLink && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              En attente du message « LIEN … » sur WhatsApp…
            </p>
          )}
          <button
            type="button"
            onClick={() => void generateLink()}
            disabled={pending}
            aria-busy={pending}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            <MessageCircle className="size-4" />
            {pending ? "Génération…" : linkInfo ? "Régénérer le code" : "Lier WhatsApp"}
          </button>
          {linkInfo && (
            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              {linkInfo.deepLink ? (
                <a
                  href={linkInfo.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setAwaitingLink(true)}
                  className="break-all text-xs font-semibold text-primary hover:underline"
                >
                  Ouvrir WhatsApp avec le message de liaison
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Envoyez ce message au numéro WhatsApp MailMind configuré côté OpenWA :
                </p>
              )}
              <p className="mt-2 break-all font-mono text-xs text-foreground">{linkInfo.prefill}</p>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(linkInfo.prefill)}
                className="mt-2 block text-xs text-muted-foreground hover:text-foreground"
              >
                Copier le message
              </button>
              {linkInfo.waNumber && (
                <p className="mt-2 text-xs text-muted-foreground">Numéro : +{linkInfo.waNumber}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Expire à{" "}
                {new Date(linkInfo.expiresAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . Après envoi, MailMind répond sur WhatsApp et cette carte passe à « Connecté ».
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Connecté
              {connection.phone
                ? ` au +${connection.phone}`
                : connection.display_name
                  ? ` (${connection.display_name})`
                  : ""}
            </p>
            <button
              type="button"
              onClick={() => void removeWhatsApp()}
              disabled={pending}
              aria-busy={pending}
              className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
            >
              Déconnecter
            </button>
          </div>
          <div className="mt-4 space-y-1">
            <Toggle
              label="Récap après chaque analyse"
              on={connection.summary_alerts !== false}
              onChange={(value) => void changePreference("summaryAlerts", value)}
            />
            <Toggle
              label="Alertes urgentes"
              on={connection.urgent_alerts}
              onChange={(value) => void changePreference("urgentAlerts", value)}
            />
            <Toggle
              label="Alertes phishing et sécurité"
              on={connection.phishing_alerts}
              onChange={(value) => void changePreference("phishingAlerts", value)}
            />
            <Toggle
              label="Digest quotidien des résumés"
              on={connection.summary_digest}
              onChange={(value) => void changePreference("summaryDigest", value)}
            />
            <Toggle
              label="Autoriser les commandes WhatsApp"
              on={connection.command_access}
              onChange={(value) => void changePreference("commandAccess", value)}
            />
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-semibold">Digest WhatsApp</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choisissez l’heure locale d’envoi de votre récapitulatif.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                Heure
                <input
                  type="time"
                  value={settings.whatsappDigestTime}
                  onChange={(event) =>
                    void updateSettings({ whatsappDigestTime: event.target.value })
                  }
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-[2] flex-col gap-1 text-xs text-muted-foreground">
                Fuseau horaire
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={(event) => void updateSettings({ timezone: event.target.value })}
                  placeholder="Europe/Paris"
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Commandes : /help, /status, /digest, /alerts et /unlink — ou le message « LIEN … » pour
            lier.
          </p>
        </>
      )}
    </Card>
  );
}

function KappelasCard({
  settings,
  updateSettings,
}: {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const getConnection = useServerFn(getKappelasConnection);
  const createLink = useServerFn(createKappelasLink);
  const updatePreferences = useServerFn(updateKappelasPreferences);
  const unlink = useServerFn(unlinkKappelas);
  const [connection, setConnection] = useState<Awaited<ReturnType<typeof getConnection>> | null>(
    null,
  );
  const [link, setLink] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void getConnection()
      .then(setConnection)
      .catch(() => setConnection(null));
  }, [getConnection]);

  async function generateLink() {
    setPending(true);
    try {
      const result = await createLink();
      setLink(result.botLink);
      setPrefill(result.prefill);
      toast.success("Lien Kappelas généré pour 15 minutes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kappelas n'est pas disponible");
    } finally {
      setPending(false);
    }
  }

  async function changePreference(
    field: "urgentAlerts" | "phishingAlerts" | "summaryAlerts" | "summaryDigest" | "commandAccess",
    value: boolean,
  ) {
    try {
      const next = await updatePreferences({ data: { [field]: value } });
      setConnection(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible");
    }
  }

  async function removeKappelas() {
    if (!confirm("Retirer définitivement ce chat Kappelas de MailMind ?")) return;
    setPending(true);
    try {
      await unlink();
      setConnection(null);
      setLink(null);
      setPrefill(null);
      toast.success("Kappelas a été déconnecté.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Déconnexion impossible");
    } finally {
      setPending(false);
    }
  }

  const isLinked = connection?.status === "linked";
  return (
    <Card
      title="Kappelas"
      desc="Recevez les alertes et récaps via le bot Kappelas (@kappelas/sdk)."
    >
      {!isLinked ? (
        <>
          <p className="text-sm text-muted-foreground">
            Générez un lien, ouvrez le bot Kappelas, puis envoyez le message{" "}
            <span className="font-mono text-xs">LIEN …</span> (ou{" "}
            <span className="font-mono text-xs">/start …</span>). Expire après 15 minutes.
          </p>
          <button
            type="button"
            onClick={generateLink}
            disabled={pending}
            aria-busy={pending}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            <Send className="size-4" />
            {pending ? "Génération…" : "Lier Kappelas"}
          </button>
          {link && (
            <div className="mt-4 space-y-2 rounded-lg border border-border bg-background p-3">
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs font-semibold text-primary hover:underline"
              >
                Ouvrir le bot Kappelas
              </a>
              {prefill ? (
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(prefill)}
                  className="block text-xs text-muted-foreground hover:text-foreground"
                >
                  Copier le message LIEN
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Connecté
              {connection.display_name
                ? ` — ${connection.display_name}`
                : connection.username
                  ? ` — @${connection.username}`
                  : ""}
            </p>
            <button
              type="button"
              onClick={() => void removeKappelas()}
              disabled={pending}
              aria-busy={pending}
              className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
            >
              Déconnecter
            </button>
          </div>
          <div className="mt-4 space-y-1">
            <Toggle
              label="Récap après chaque analyse"
              on={connection.summary_alerts !== false}
              onChange={(value) => void changePreference("summaryAlerts", value)}
            />
            <Toggle
              label="Alertes urgentes"
              on={connection.urgent_alerts}
              onChange={(value) => void changePreference("urgentAlerts", value)}
            />
            <Toggle
              label="Alertes phishing et sécurité"
              on={connection.phishing_alerts}
              onChange={(value) => void changePreference("phishingAlerts", value)}
            />
            <Toggle
              label="Digest quotidien des résumés"
              on={connection.summary_digest}
              onChange={(value) => void changePreference("summaryDigest", value)}
            />
            <Toggle
              label="Autoriser les commandes Kappelas"
              on={connection.command_access}
              onChange={(value) => void changePreference("commandAccess", value)}
            />
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-semibold">Digest Kappelas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Heure locale d’envoi du récapitulatif quotidien.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                Heure
                <input
                  type="time"
                  value={settings.kappelasDigestTime}
                  onChange={(event) =>
                    void updateSettings({ kappelasDigestTime: event.target.value })
                  }
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-[2] flex-col gap-1 text-xs text-muted-foreground">
                Fuseau horaire
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={(event) => void updateSettings({ timezone: event.target.value })}
                  placeholder="Europe/Paris"
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Commandes : /help, /status, /digest, /alerts, /urgences, /archive, /draft, /unlink.
          </p>
        </>
      )}
    </Card>
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
            type="button"
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
  const id = useId();
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs">
        <label className="font-medium" htmlFor={id}>
          {label}
        </label>
        <span className="font-mono text-muted-foreground" id={`${id}-value`}>
          {value}%
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        aria-describedby={`${id}-value`}
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
  disabled = false,
}: {
  label: string;
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${disabled ? "text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!on)}
        disabled={disabled}
        aria-label={label}
        aria-pressed={on}
        className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-background transition-transform ${
            on ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [val, setVal] = useState("");
  const inputId = useId();
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
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              aria-label={`Retirer ${t}`}
              className="text-muted-foreground hover:text-danger"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Domaine ou adresse e-mail à ajouter
        </label>
        <input
          id={inputId}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="domaine.com ou personne@domaine.com"
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs"
        />
        <button
          type="button"
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
