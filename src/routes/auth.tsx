import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Radar,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GmailIcon } from "@/components/ProviderIcons";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — MailMind AI" },
      { name: "description", content: "Créez votre compte ou connectez-vous à MailMind AI." },
    ],
  }),
  component: Auth,
});

type AuthMode = "signin" | "signup" | "forgot";

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      toast.error("Saisissez une adresse e-mail valide.");
      return;
    }

    if (mode === "forgot") {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Si ce compte existe, un lien de réinitialisation vient d'être envoyé.");
        changeMode("signin");
      } catch (error) {
        toast.error(getAuthError(error));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "signup" && fullName.trim().length < 2) {
      toast.error("Saisissez votre nom complet.");
      return;
    }

    if (password.length < 8) {
      toast.error("Votre mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Compte créé. Vérifiez votre e-mail pour confirmer l'inscription.");
          changeMode("signin");
          return;
        }
        toast.success("Compte créé.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(getAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(getAuthError(error));
      setLoading(false);
    }
  }

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  return (
    <main className="auth-page min-h-screen bg-background text-foreground">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12 xl:px-16">
          <Link to="/" className="flex w-fit items-center gap-2.5 rounded-full py-2 pr-4">
            <div className="grid size-8 place-items-center rounded-xl bg-foreground text-background shadow-lg shadow-foreground/10">
              <span className="size-2 rounded-full bg-background" />
            </div>
            <span className="font-display text-lg tracking-wider">MAILMIND</span>
          </Link>

          <div className="flex flex-1 items-center justify-center py-12 lg:justify-end lg:pr-16 xl:pr-24">
            <div className="w-full max-w-[430px]">
              <div className="mb-8 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-safe shadow-[0_0_12px_currentColor]" />
                Espace sécurisé
              </div>

              {isForgot ? (
                <>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                    Récupération
                  </p>
                  <h1 className="mt-3 font-display text-4xl leading-none tracking-tight sm:text-5xl">
                    Retrouvez votre accès.
                  </h1>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Nous vous enverrons un lien sécurisé pour définir un nouveau mot de passe.
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex rounded-full border border-border bg-surface/60 p-1">
                    <ModeButton active={isSignup} onClick={() => changeMode("signup")}>
                      Créer un compte
                    </ModeButton>
                    <ModeButton active={!isSignup} onClick={() => changeMode("signin")}>
                      Se connecter
                    </ModeButton>
                  </div>
                  <h1 className="mt-7 font-display text-4xl leading-none tracking-tight sm:text-5xl">
                    {isSignup ? "Votre inbox mérite mieux." : "Content de vous revoir."}
                  </h1>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {isSignup
                      ? "Un copilote calme, clair et intelligent pour les messages qui comptent."
                      : "Retrouvez vos analyses, vos alertes et vos actions en un seul endroit."}
                  </p>
                </>
              )}

              {!isForgot && (
                <button
                  onClick={signInWithGoogle}
                  disabled={loading}
                  className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface/70 text-sm font-semibold transition-all hover:border-foreground/20 hover:bg-surface-muted active:scale-[0.99] disabled:cursor-wait disabled:opacity-50"
                >
                  <span className="grid size-6 place-items-center rounded-md bg-white">
                    <span className="font-bold text-sm text-[#4285f4]">G</span>
                  </span>
                  Continuer avec Google
                  <GmailIcon className="ml-auto size-4" />
                </button>
              )}

              {!isForgot && <Divider />}

              <form onSubmit={handleSubmit} className={`${isForgot ? "mt-8" : ""} space-y-4`}>
                <Field label="Adresse e-mail" icon={Mail}>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="vous@entreprise.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>

                {isSignup && (
                  <Field label="Nom complet" icon={User}>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Alex Martin"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      minLength={2}
                      required
                    />
                  </Field>
                )}

                {!isForgot && (
                  <>
                    <Field label="Mot de passe" icon={Lock}>
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete={isSignup ? "new-password" : "current-password"}
                        placeholder="8 caractères minimum"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </Field>
                    {isSignup && (
                      <Field label="Confirmer le mot de passe" icon={KeyRound}>
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Saisissez-le à nouveau"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          minLength={8}
                          required
                        />
                      </Field>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition-all hover:shadow-xl hover:shadow-foreground/10 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />{" "}
                      Patientez…
                    </>
                  ) : isForgot ? (
                    "Recevoir le lien"
                  ) : isSignup ? (
                    "Créer mon espace"
                  ) : (
                    "Se connecter"
                  )}
                  {!loading && (
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  )}
                </button>
              </form>

              {!isForgot && !isSignup && (
                <button
                  onClick={() => changeMode("forgot")}
                  className="mt-4 block w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Mot de passe oublié ?
                </button>
              )}
              {isForgot && (
                <button
                  onClick={() => changeMode("signin")}
                  className="mt-5 block w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Retour à la connexion
                </button>
              )}
              {!isForgot && (
                <p className="mt-7 text-center text-xs text-muted-foreground">
                  {isSignup ? "Déjà un compte ?" : "Pas encore inscrit ?"}{" "}
                  <button
                    onClick={() => changeMode(isSignup ? "signin" : "signup")}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {isSignup ? "Se connecter" : "Créer un compte"}
                  </button>
                </p>
              )}

              <div className="mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-safe" /> OAuth 2.0
                </span>
                <span className="size-1 rounded-full bg-border" />
                <span className="flex items-center gap-1.5">
                  <Lock className="size-3" /> Tokens chiffrés
                </span>
                <span className="size-1 rounded-full bg-border" />
                <span>RGPD</span>
              </div>
              <p className="mt-5 text-center text-[10px] leading-relaxed text-muted-foreground">
                En continuant, vous acceptez nos{" "}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
                  conditions
                </Link>{" "}
                et notre{" "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                  politique de confidentialité
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <aside className="auth-showcase relative hidden overflow-hidden border-l border-border lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,oklch(0.25_0.04_220),transparent_36%),linear-gradient(145deg,oklch(0.12_0.02_240),oklch(0.06_0_0))]" />
          <div className="auth-orb auth-orb-one absolute -right-24 top-10 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="auth-orb auth-orb-two absolute bottom-12 left-10 size-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="max-w-xl">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-200/60">
                Le cockpit de votre messagerie
              </span>
              <h2 className="mt-5 font-display text-5xl leading-[0.92] tracking-tight xl:text-7xl">
                Moins de tri.
                <br />
                <span className="text-cyan-200">Plus de signal.</span>
              </h2>
              <p className="mt-7 max-w-md text-sm leading-relaxed text-white/55">
                MailMind transforme les messages entrants en résumés, alertes et actions claires.
                Votre boîte reste la même. Votre façon de la lire change.
              </p>
            </div>

            <AuthVisual />

            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
              <ShowcaseMetric value="128" label="messages analysés" />
              <ShowcaseMetric value="92" label="score de clarté" />
              <ShowcaseMetric value="03" label="alertes à vérifier" danger />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function AuthVisual() {
  return (
    <div className="auth-visual relative mx-auto my-12 w-full max-w-[520px]">
      <div className="absolute -left-4 top-10 h-px w-20 bg-gradient-to-r from-transparent to-cyan-300/50" />
      <div className="absolute -right-4 bottom-12 h-px w-20 bg-gradient-to-l from-transparent to-violet-300/50" />
      <div className="rounded-3xl border border-white/10 bg-black/25 p-3 shadow-2xl backdrop-blur-xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-white text-black">
                <Sparkles className="size-3.5" />
              </div>
              <span className="font-display text-sm tracking-wider text-white">MAILMIND</span>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-300" /> IA active
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Analysés", value: "128", tone: "text-cyan-200" },
              { label: "À traiter", value: "07", tone: "text-emerald-300" },
              { label: "À risque", value: "03", tone: "text-red-300" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <p className={`font-display text-2xl ${item.tone}`}>{item.value}</p>
                <p className="mt-1 font-mono text-[7px] uppercase tracking-wider text-white/35">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs text-white/80">Flux de la boîte</span>
              <span className="font-mono text-[8px] text-white/35">7 jours</span>
            </div>
            <div className="mt-4 flex h-20 items-end gap-1.5">
              {[22, 35, 28, 54, 42, 67, 50, 78, 62, 84, 70, 92].map((height, index) => (
                <div
                  key={index}
                  className="auth-bar flex-1 rounded-t-sm bg-gradient-to-t from-cyan-400/20 to-cyan-200/80"
                  style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-300/5 p-3">
            <Radar className="size-4 text-red-300" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white/80">
                Action requise : vérifiez votre compte
              </p>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-red-200/60">
                Score de risque · 0.86
              </p>
            </div>
            <ArrowRight className="ml-auto size-3 text-white/30" />
          </div>
        </div>
      </div>
      <div className="auth-float-card absolute -bottom-5 -right-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#111923]/90 px-3 py-2.5 shadow-xl backdrop-blur-xl sm:-right-8">
        <CheckCircle2 className="size-4 text-emerald-300" />
        <div>
          <p className="font-mono text-[8px] uppercase tracking-wider text-white/40">
            Dernière analyse
          </p>
          <p className="text-[10px] font-semibold text-white/80">Signal identifié</p>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      ou
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Mail;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}

function ShowcaseMetric({
  value,
  label,
  danger = false,
}: {
  value: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className={`font-display text-2xl ${danger ? "text-red-300" : "text-white"}`}>{value}</p>
      <p className="mt-1 max-w-24 font-mono text-[8px] uppercase leading-relaxed tracking-wider text-white/35">
        {label}
      </p>
    </div>
  );
}

function getAuthError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Une erreur d'authentification est survenue.";
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (normalized.includes("email not confirmed"))
    return "Confirmez votre adresse e-mail avant de vous connecter.";
  if (normalized.includes("user already registered"))
    return "Un compte existe déjà avec cette adresse e-mail.";
  if (normalized.includes("password should be at least"))
    return "Le mot de passe doit contenir au moins 8 caractères.";
  if (normalized.includes("rate limit"))
    return "Trop de tentatives. Réessayez dans quelques instants.";
  return message;
}
