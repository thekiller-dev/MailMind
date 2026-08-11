import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Database,
  Eye,
  FileText,
  FileScan,
  Fingerprint,
  Gauge,
  Inbox,
  Key,
  Layers,
  Lock,
  MailCheck,
  Minus,
  MousePointerClick,
  Radar,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { GmailIcon } from "@/components/ProviderIcons";

const heroCategoryLegend = [
  { name: "Finance", value: 42, color: "#60a5fa" },
  { name: "Collaboration", value: 31, color: "#42d392" },
  { name: "Sécurité", value: 12, color: "#f87171" },
  { name: "Autres", value: 15, color: "#737373" },
];

export function LandingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Logos />
        <ProductPurpose />
        <ProductTour />
        <Features />
        <UseCases />
        <Pipeline />
        <SecurityRGPD />
        <Stats />
        <PricingTable />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
    </>
  );
}

function ProductPurpose() {
  return (
    <section id="about" aria-labelledby="about-title" className="px-6 pb-20 pt-4 md:pb-28">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl glass p-7 sm:p-10 md:grid-cols-[0.8fr_1.2fr] md:items-center md:p-12">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            À propos de MailMind
          </span>
          <h2
            id="about-title"
            className="mt-3 font-display text-3xl leading-tight tracking-wide sm:text-4xl"
          >
            Votre assistant intelligent pour Gmail.
          </h2>
        </div>
        <div className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            MailMind est un assistant qui vous aide à comprendre et traiter vos e-mails. Connectez
            plusieurs comptes Gmail avec OAuth 2.0 ou utilisez un transfert privé sans donner accès
            à votre compte Google. MailMind résume les messages, les classe, détecte les signaux de
            risque et met en évidence les actions importantes.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-wider">
            {[
              "Résumés d’e-mails",
              "Classification",
              "Détection des risques",
              "Actions à traiter",
              "Plusieurs comptes",
              "Alertes Telegram",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-background/30 px-3 py-1.5 text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="animate-drift absolute -top-40 left-1/4 size-[600px] rounded-full opacity-40"
        style={{ background: "rgb(var(--glass-tint) / 0.04)", filter: "blur(80px)" }}
      />
      <div
        className="animate-drift absolute top-1/2 right-0 size-[500px] rounded-full opacity-40"
        style={{
          background: "rgb(var(--glass-tint) / 0.03)",
          filter: "blur(80px)",
          animationDelay: "6s",
        }}
      />
    </div>
  );
}

function useGsapReveal() {
  return undefined;
}

function Hero() {
  return (
    <section
      aria-labelledby="landing-title"
      className="relative px-6 pt-20 pb-16 text-center sm:pt-24 sm:pb-20"
    >
      <div className="mx-auto max-w-4xl">
        <div className="hero-pill mb-8 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5">
          <span
            className="size-1.5 rounded-full bg-safe"
            style={{ boxShadow: "0 0 10px currentColor" }}
          />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Pipeline IA actif · OAuth 2.0
          </span>
        </div>
        <h1
          id="landing-title"
          className="text-balance font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-8xl"
        >
          <span className="hero-line block">MailMind</span>
          <span className="hero-line block bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent">
            votre assistant Gmail.
          </span>
        </h1>
        <p className="hero-sub text-pretty mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          MailMind est un assistant intelligent pour Gmail : il résume vos e-mails, classe les
          messages, détecte les risques et extrait les actions à traiter.
        </p>
        <div className="hero-cta mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 font-semibold text-background transition-transform active:scale-95 sm:w-auto"
          >
            Connecter Gmail
            <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" />
          </Link>
          <Link
            to="/connect-email"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full glass px-7 font-semibold text-foreground transition-colors sm:w-auto"
          >
            Comment connecter un e-mail
          </Link>
        </div>
        <div className="hero-meta mt-8 flex items-center justify-center gap-4 opacity-70">
          <GmailIcon className="size-5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Gmail · OAuth 2.0
          </span>
        </div>
      </div>

      <div className="hero-preview mx-auto mt-16 max-w-6xl px-2 sm:mt-20">
        <div className="hero-dashboard-shell glow-ring relative rounded-3xl glass p-2 text-left">
          <HeroDashboard />
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>
      </div>
    </section>
  );
}

function HeroDashboard() {
  const messages = [
    {
      sender: "Sarah Jenkins",
      subject: "Contrat Northwind — validation finale",
      category: "Collaboration",
      risk: "safe",
      time: "09:42",
      initials: "SJ",
    },
    {
      sender: "Stripe Billing",
      subject: "Votre facture de juillet est disponible",
      category: "Finance",
      risk: "safe",
      time: "09:18",
      initials: "SB",
    },
    {
      sender: "Security Team",
      subject: "Action requise : vérifiez votre compte",
      category: "Phishing",
      risk: "danger",
      time: "08:56",
      initials: "ST",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-border bg-background shadow-2xl">
      <div className="flex h-10 items-center justify-between border-b border-border bg-surface/70 px-3 sm:h-12 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-danger/70" />
            <span className="size-2 rounded-full bg-warn/70" />
            <span className="size-2 rounded-full bg-safe/70" />
          </div>
          <div className="ml-2 hidden h-6 items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 sm:flex">
            <CircleDot className="size-3 text-muted-foreground" />
            <span className="font-mono text-[9px] text-muted-foreground">
              app.mailmind.ai/dashboard
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:inline">
            Synchronisé il y a 2 min
          </span>
          <span className="size-1.5 rounded-full bg-safe shadow-[0_0_10px_currentColor]" />
        </div>
      </div>

      <div className="grid min-h-[440px] lg:grid-cols-[148px_1fr]">
        <aside className="hidden border-r border-border bg-surface/25 p-3 lg:block">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="grid size-7 place-items-center rounded-lg bg-foreground text-background">
              <CircleDot className="size-3.5" />
            </div>
            <span className="font-display text-sm tracking-wide">MAILMIND</span>
          </div>
          <p className="mb-2 mt-6 px-2 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Workspace
          </p>
          <div className="space-y-1">
            {[
              { icon: BarChart3, label: "Dashboard", active: true },
              { icon: Inbox, label: "Inbox", active: false },
              { icon: AlertTriangle, label: "Alertes", active: false },
              { icon: Workflow, label: "Actions", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] ${item.active ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                <item.icon className="size-3.5" /> {item.label}
              </div>
            ))}
          </div>
          <p className="mb-2 mt-7 px-2 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Compte
          </p>
          <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] text-muted-foreground">
            <GmailIcon className="size-3.5" /> Gmail connecté
          </div>
          <div className="mt-16 rounded-xl glass-subtle p-2.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-safe" />
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                Protection active
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-safe/10">
              <div className="dashboard-progress h-full w-[88%] rounded-full bg-safe" />
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-3 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                Mercredi 22 juillet 2026
              </p>
              <h3 className="mt-1 font-display text-xl tracking-wide sm:text-2xl">
                Bonjour, Alex.
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Voici ce qui mérite votre attention aujourd'hui.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface/50 px-2.5 py-2 sm:flex">
              <GmailIcon className="size-3.5" />
              <span className="font-mono text-[9px] text-muted-foreground">alex@gmail.com</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { label: "E-mails analysés", value: "128", change: "+18%", icon: MailCheck },
              { label: "À traiter", value: "07", change: "-24%", icon: Clock3 },
              { label: "Score moyen", value: "92", change: "+6 pts", icon: Gauge },
              { label: "À risque", value: "03", change: "à vérifier", icon: AlertTriangle },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className={`dashboard-card dashboard-delay-${index} rounded-xl border border-border bg-surface/45 p-3 sm:p-3.5`}
              >
                <div className="flex items-center justify-between">
                  <stat.icon className="size-3.5 text-muted-foreground" />
                  <span
                    className={`font-mono text-[8px] ${index === 3 ? "text-danger" : "text-safe"}`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 truncate font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="dashboard-card dashboard-delay-4 rounded-xl border border-border bg-surface/45 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-sm tracking-wide">Flux de la boîte</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    Messages reçus et analysés cette semaine
                  </p>
                </div>
                <span className="rounded-md border border-border px-2 py-1 font-mono text-[8px] text-muted-foreground">
                  7 jours
                </span>
              </div>
              <div className="relative mt-5 h-28 sm:h-32">
                <Suspense fallback={<ChartFallback label="Chargement du graphique de flux" />}>
                  <HeroFlowChart />
                </Suspense>
              </div>
            </div>
            <div className="dashboard-card dashboard-delay-5 rounded-xl border border-border bg-surface/45 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-sm tracking-wide">Répartition</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">Catégories détectées</p>
                </div>
                <BarChart3 className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="relative size-24 shrink-0">
                  <Suspense
                    fallback={<ChartFallback label="Chargement du graphique des catégories" />}
                  >
                    <HeroCategoryChart />
                  </Suspense>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <span className="block font-display text-lg leading-none">128</span>
                      <span className="font-mono text-[7px] uppercase text-muted-foreground">
                        messages
                      </span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  {heroCategoryLegend.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between font-mono text-[8px] text-muted-foreground"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card dashboard-delay-6 mt-3 rounded-xl border border-border bg-surface/45 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-sm tracking-wide">Priorités du jour</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  Les messages classés par MailMind
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-foreground px-2 py-1 font-mono text-[8px] text-background">
                <Sparkles className="size-2.5" /> IA active
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {messages.map((message) => (
                <div
                  key={message.subject}
                  className="dashboard-message group flex min-w-0 items-center gap-2.5 rounded-lg border border-border/70 bg-background/45 p-2.5"
                >
                  <div
                    className={`grid size-7 shrink-0 place-items-center rounded-lg text-[8px] font-bold ${message.risk === "danger" ? "bg-danger/10 text-danger" : "bg-foreground/10 text-foreground"}`}
                  >
                    {message.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[10px] font-semibold">{message.sender}</p>
                      <span className="shrink-0 font-mono text-[8px] text-muted-foreground">
                        {message.time}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                      {message.subject}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[7px] text-muted-foreground">
                        {message.category}
                      </span>
                      <span
                        className={`size-1.5 rounded-full ${message.risk === "danger" ? "bg-danger" : "bg-safe"}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="dashboard-scanline pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-safe/60 to-transparent" />
    </div>
  );
}

function Logos() {
  return (
    <section className="px-6 py-12">
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Compatible avec votre stack actuelle
      </p>
      <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-5 opacity-70">
        <div className="flex items-center gap-2">
          <GmailIcon />
          <span className="font-display tracking-wide">Gmail</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <span className="font-display tracking-wide">OAuth 2.0</span>
        </div>
      </div>
    </section>
  );
}

const HeroFlowChart = lazy(() =>
  import("./LandingCharts").then((module) => ({ default: module.HeroFlowChart })),
);
const HeroCategoryChart = lazy(() =>
  import("./LandingCharts").then((module) => ({ default: module.HeroCategoryChart })),
);

function ChartFallback({ label }: { label: string }) {
  return <div className="h-full w-full" role="status" aria-label={label} />;
}

const appScreens: {
  icon: LucideIcon;
  number: string;
  label: string;
  title: string;
  desc: string;
  details: string[];
}[] = [
  {
    icon: BarChart3,
    number: "01",
    label: "Dashboard",
    title: "Comprendre votre charge en un coup d'œil.",
    desc: "Une vue synthétique de vos messages analysés, de vos urgences et des risques détectés.",
    details: ["Répartition par catégorie", "Analyses prioritaires", "Comptes synchronisés"],
  },
  {
    icon: Inbox,
    number: "02",
    label: "Inbox unifiée",
    title: "Passer du bruit à la décision.",
    desc: "Chaque message est présenté avec son résumé, son intention, son sentiment et son niveau de risque.",
    details: ["Recherche plein texte", "Filtres par catégorie", "MindPanel contextuel"],
  },
  {
    icon: AlertTriangle,
    number: "03",
    label: "Alertes sécurité",
    title: "Traiter les menaces avant les conséquences.",
    desc: "Les messages suspects sont regroupés et triés selon leur score afin de concentrer votre attention.",
    details: ["Score de 0 à 1", "Justification lisible", "Signalement Gmail"],
  },
];

function ProductTour() {
  const ref = useGsapReveal();
  return (
    <section ref={ref} id="app" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div data-reveal className="max-w-3xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Dans l'application
          </span>
          <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Une boîte de réception qui explique ce qui compte.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            MailMind ne se contente pas de déplacer vos messages. Il transforme chaque e-mail en
            information exploitable, puis vous laisse décider de la suite.
          </p>
        </div>

        <div data-stagger className="mt-12 grid gap-4 lg:grid-cols-3">
          {appScreens.map((screen, index) => {
            const Icon = screen.icon;
            return (
              <article
                key={screen.label}
                className={`relative rounded-3xl p-6 transition-transform hover:-translate-y-1 ${index === 1 ? "glass" : "glass-subtle"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="grid size-11 place-items-center rounded-2xl glass">
                    <Icon className="size-5" strokeWidth={1.6} />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {screen.number}
                  </span>
                </div>
                <p className="mt-7 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {screen.label}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight tracking-wide">
                  {screen.title}
                </h3>
                <p className="mt-3 min-h-14 text-sm leading-relaxed text-muted-foreground">
                  {screen.desc}
                </p>
                <div className="mt-5 space-y-2 border-t border-border pt-4">
                  {screen.details.map((detail) => (
                    <div key={detail} className="flex items-center gap-2 text-xs">
                      <Check className="size-3.5 text-safe" strokeWidth={2.2} />
                      {detail}
                    </div>
                  ))}
                </div>
                {index < appScreens.length - 1 && (
                  <ArrowUpRight className="absolute -right-3 top-1/2 hidden size-5 text-muted-foreground/40 lg:block" />
                )}
              </article>
            );
          })}
        </div>

        <NeuralBridge />

        <div data-reveal className="relative mt-2 rounded-3xl glass p-2 sm:p-3">
          <HeroDashboard />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 h-24 rounded-b-3xl bg-gradient-to-t from-background/70 to-transparent" />
        </div>
      </div>
    </section>
  );
}

function NeuralBridge() {
  return (
    <div className="neural-bridge relative mx-auto h-28 max-w-5xl overflow-hidden sm:h-36">
      <div className="absolute inset-x-0 top-7 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
        Les signaux convergent vers une lecture claire
      </div>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 140"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {[120, 300, 500, 700, 880].map((x, index) => (
          <g key={x} className={`neural-node neural-node-${index}`}>
            <path d={`M ${x} 0 C ${x} 48, 500 45, 500 124`} />
            <circle cx={x} cy="0" r="3" />
          </g>
        ))}
        <path className="neural-trunk" d="M500 45 L500 136" />
        <path className="neural-arrow" d="M493 128 L500 138 L507 128" />
      </svg>
      <div className="neural-core absolute bottom-0 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full border border-safe/50 bg-safe/10 text-safe">
        <BrainCircuit className="size-4" />
      </div>
    </div>
  );
}

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ShieldCheck,
    title: "Détection de phishing",
    desc: "L'IA repère les signaux suspects dans le contenu et fournit un score ainsi qu'une justification lisible.",
  },
  {
    icon: BrainCircuit,
    title: "Résumés sémantiques",
    desc: "Les messages longs sont ramenés à l'essentiel : décisions, demandes et prochaines étapes.",
  },
  {
    icon: Fingerprint,
    title: "Extraction d'entités",
    desc: "Dates, montants, numéros de suivi, contacts — convertis en fiches actionnables et exportables.",
  },
  {
    icon: Inbox,
    title: "Inbox Gmail",
    desc: "Une vue claire de vos messages Gmail, enrichie par les analyses et les scores de risque.",
  },
  {
    icon: Radar,
    title: "Détection d'intention",
    desc: "RDV, réclamation, facture, candidature : l'IA classe chaque message automatiquement.",
  },
  {
    icon: Workflow,
    title: "Actions contrôlées",
    desc: "Archivez, signalez ou préparez une réponse depuis le MindPanel, sans perdre le contrôle.",
  },
];

function Features() {
  const ref = useGsapReveal();
  return (
    <section ref={ref} id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-28">
      <div
        data-reveal
        className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
      >
        <div className="max-w-2xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Capacités
          </span>
          <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Un cerveau orchestré
            <br className="hidden sm:block" />
            pour chaque message.
          </h2>
        </div>
        <p className="max-w-sm text-muted-foreground">
          Six modules, un seul pipeline. Chaque e-mail est lu, classé, scoré et enrichi avant même
          d'atteindre votre attention.
        </p>
      </div>
      <div data-stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-2xl glass p-7 transition-transform hover:-translate-y-1"
          >
            <div className="mb-8 flex items-start justify-between">
              <div className="grid size-12 place-items-center rounded-xl glass-subtle">
                <f.icon className="size-5" strokeWidth={1.5} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="font-display text-xl tracking-wide">{f.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const useCases: {
  icon: LucideIcon;
  tag: string;
  title: string;
  desc: string;
  points: string[];
}[] = [
  {
    icon: BarChart3,
    tag: "Finance & opérations",
    title: "Ne plus laisser passer une facture ou une validation.",
    desc: "Centralisez les demandes entrantes et repérez rapidement les montants, dates et actions attendues.",
    points: [
      "Prioriser les demandes de paiement",
      "Repérer les échéances",
      "Exporter les entités utiles",
    ],
  },
  {
    icon: CalendarDays,
    tag: "Équipes & management",
    title: "Arriver préparé à chaque décision.",
    desc: "Les intentions et résumés donnent une lecture immédiate des demandes de rendez-vous, validations et suivis.",
    points: [
      "Identifier les demandes de rendez-vous",
      "Retrouver les décisions",
      "Préparer une réponse",
    ],
  },
  {
    icon: ShieldCheck,
    tag: "Sécurité & conformité",
    title: "Traiter les messages suspects avec méthode.",
    desc: "Les alertes sont isolées du flux principal, expliquées et accessibles depuis un espace de tri dédié.",
    points: ["Trier par niveau de risque", "Lire la justification IA", "Signaler dans Gmail"],
  },
];

function UseCases() {
  const ref = useGsapReveal();
  return (
    <section ref={ref} id="use-cases" className="bg-surface/20 px-6 py-24 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div
          data-reveal
          className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Cas d'usage
            </span>
            <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
              Moins de tri.
              <br className="hidden sm:block" /> Plus de décisions.
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            MailMind s'adapte à la façon dont votre équipe travaille déjà : Gmail reste votre outil,
            l'intelligence vient se poser au-dessus.
          </p>
        </div>

        <div data-stagger className="grid gap-4 lg:grid-cols-3">
          {useCases.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.tag}
                className={`rounded-3xl p-7 ${index === 1 ? "glass" : "glass-subtle"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="grid size-12 place-items-center rounded-2xl glass">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                </div>
                <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.tag}
                </p>
                <h3 className="mt-3 font-display text-2xl leading-tight tracking-wide">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                <ul className="mt-6 space-y-3 border-t border-border pt-5">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-safe" strokeWidth={2.2} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div data-reveal className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl glass p-7 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Du message à l'action
                </span>
                <h3 className="mt-3 font-display text-2xl tracking-wide">
                  Un MindPanel pour ne jamais perdre le contexte.
                </h3>
              </div>
              <MousePointerClick className="size-6 text-muted-foreground" strokeWidth={1.4} />
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileText, label: "Comprendre", text: "Résumé et intention" },
                { icon: Fingerprint, label: "Extraire", text: "Entités et échéances" },
                { icon: Archive, label: "Agir", text: "Répondre ou archiver" },
              ].map((step, index) => (
                <div key={step.label} className="relative rounded-2xl glass-subtle p-4">
                  <step.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
                  <p className="mt-5 font-display text-base tracking-wide">{step.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
                  {index < 2 && (
                    <ArrowUpRight className="absolute right-3 top-4 size-3 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-foreground p-7 text-background sm:p-8">
            <Sparkles className="size-5" strokeWidth={1.5} />
            <h3 className="mt-7 font-display text-2xl tracking-wide">
              Une lecture claire, même quand la boîte déborde.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-background/65">
              Chaque écran est pensé pour réduire le temps entre l'arrivée d'un message et la bonne
              action.
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-xs font-semibold text-foreground transition-transform active:scale-95"
            >
              Explorer mon espace <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const pipelineSteps = [
  {
    icon: Layers,
    title: "Ingestion",
    kicker: "Connexion sécurisée",
    desc: "MailMind récupère les nouveaux messages depuis votre compte Gmail avec OAuth 2.0. Aucun mot de passe n'est stocké.",
    signal: "Gmail · OAuth 2.0",
    progress: "100%",
    tone: "cyan",
  },
  {
    icon: FileScan,
    title: "Normalisation",
    kicker: "Nettoyage intelligent",
    desc: "Les doublons, signatures et éléments inutiles sont nettoyés avant l'analyse pour ne conserver que le signal utile.",
    signal: "Nettoyage · Déduplication",
    progress: "75%",
    tone: "violet",
  },
  {
    icon: BrainCircuit,
    title: "Analyse IA",
    kicker: "Compréhension du message",
    desc: "Le modèle identifie l'intention, le sentiment, les entités, les actions attendues et les informations importantes.",
    signal: "Intention · Entités · Résumé",
    progress: "50%",
    tone: "blue",
  },
  {
    icon: ShieldCheck,
    title: "Décision",
    kicker: "Scoring & restitution",
    desc: "Le résultat arrive dans votre inbox : score de risque expliqué, alerte, résumé et action contrôlée depuis le MindPanel.",
    signal: "Risque · Alerte · Action",
    progress: "25%",
    tone: "slate",
  },
];

function Pipeline() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section
      ref={ref}
      id="pipeline"
      className={`pipeline-scroll-reveal px-6 py-24 md:py-28 ${isVisible ? "is-visible" : ""}`}
    >
      <div className="mx-auto max-w-7xl">
        <div
          data-reveal
          className="mb-12 grid gap-6 md:mb-16 md:grid-cols-[1fr_0.7fr] md:items-end"
        >
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Architecture
            </span>
            <h2 className="mt-4 max-w-3xl font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
              Pipeline d'intelligence
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:justify-self-end">
            Chaque e-mail traverse quatre niveaux de compréhension avant de devenir une information
            claire et actionnable.
          </p>
        </div>

        <div className="pipeline-frame rounded-3xl glass p-3 sm:p-5 md:p-8">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-foreground text-background">
                <BrainCircuit className="size-4" />
              </div>
              <div>
                <p className="font-display text-base tracking-wide">De l'e-mail au signal</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Pipeline temps réel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-safe/20 bg-safe/5 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-safe">
              <span className="pipeline-live-dot size-1.5 rounded-full bg-safe" />
              Analyse active
            </div>
          </div>

          <div data-stagger className="pipeline-steps">
            {pipelineSteps.map((s, i) => (
              <div
                key={s.title}
                className={`pipeline-step pipeline-step-${i} pipeline-tone-${s.tone}`}
              >
                <div className="pipeline-folder relative z-10 shrink-0">
                  <div className="pipeline-folder-tab" />
                  <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <s.icon className="size-5" strokeWidth={1.5} />
                      <span className="font-mono text-[10px] font-bold tracking-[0.2em]">STEP</span>
                    </div>
                    <div>
                      <p className="mt-5 font-display text-4xl leading-none tracking-tight sm:text-5xl">
                        0{i + 1}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="font-mono text-[9px]">{s.progress}</span>
                        <span className="pipeline-hatch h-2 w-16 rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pipeline-detail relative flex min-h-[150px] flex-1 flex-col justify-center px-5 py-5 sm:px-8">
                  <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-current" />
                    {s.kicker}
                  </div>
                  <h3 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {s.desc}
                  </p>
                  <span className="mt-3 inline-flex w-fit rounded-full border border-border bg-background/30 px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                    {s.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function useScrollReveal() {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8%" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

const securityCards: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Key,
    title: "OAuth 2.0 strict",
    desc: "Aucun mot de passe Gmail n'est stocké. Les autorisations sont révocables depuis Google et le compte MailMind.",
  },
  {
    icon: Lock,
    title: "Tokens protégés",
    desc: "Les tokens Gmail sont chiffrés côté serveur avec AES-256-GCM avant leur stockage en base.",
  },
  {
    icon: Database,
    title: "Isolation par utilisateur",
    desc: "Les politiques RLS de Supabase empêchent un compte d'accéder aux e-mails ou paramètres d'un autre utilisateur.",
  },
  {
    icon: Eye,
    title: "IA avec justification",
    desc: "L'analyse enregistre un score de risque et une justification lisible dans le MindPanel.",
  },
  {
    icon: Trash2,
    title: "Contrôle des données",
    desc: "Vous pouvez déconnecter un compte et supprimer ses tokens depuis les paramètres.",
  },
  {
    icon: Server,
    title: "Traitement limité",
    desc: "Le corps transmis au modèle est limité à 6 000 caractères pour réduire l'exposition des données.",
  },
];

function SecurityRGPD() {
  const ref = useGsapReveal();
  return (
    <section ref={ref} id="security" className="px-6 py-24 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div data-reveal className="mb-14 grid gap-6 md:grid-cols-[2fr_1fr] md:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Sécurité & RGPD
            </span>
            <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
              Vos données ne quittent jamais
              <br className="hidden sm:block" />
              votre périmètre de confiance.
            </h2>
          </div>
          <p className="text-muted-foreground">
            Chaîne de confiance centrée sur OAuth, le chiffrement des tokens, l'isolation des
            données et une analyse IA accompagnée d'une justification.
          </p>
        </div>

        <div data-stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {securityCards.map((c) => (
            <div key={c.title} className="rounded-2xl glass p-6">
              <div className="mb-5 grid size-11 place-items-center rounded-xl glass-subtle">
                <c.icon className="size-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg tracking-wide">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl glass p-8">
            <h3 className="font-display text-xl tracking-wide">Vos droits RGPD, en un clic</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                "Droit d'accès : export JSON et CSV",
                "Droit à l'effacement : déconnexion et suppression des tokens",
                "Droit à la portabilité : analyses exportables",
                "Opposition : contrôle des connexions et du traitement",
                "Minimisation : corps limités avant analyse IA",
              ].map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-safe" strokeWidth={1.8} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl glass p-8">
            <h3 className="font-display text-xl tracking-wide">Transparence opérationnelle</h3>
            <div className="mt-5 space-y-3">
              {[
                { label: "Autorisation Gmail", value: "OAuth 2.0", icon: Key },
                { label: "Tokens stockés", value: "Chiffrés", icon: Lock },
                { label: "Accès aux données", value: "RLS", icon: ShieldCheck },
                { label: "Justification du risque", value: "Incluse", icon: Eye },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl glass-subtle px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <row.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                  </div>
                  <span className="font-display text-2xl tracking-wide">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const ref = useGsapReveal();
  const items = [
    { value: "01", label: "Connexion Gmail" },
    { value: "06", label: "Signaux d'analyse" },
    { value: "24/7", label: "Surveillance des nouveaux messages" },
    { value: "100%", label: "Contrôle utilisateur" },
  ];
  return (
    <section ref={ref} aria-labelledby="stats-title" className="px-6 py-20">
      <h2 id="stats-title" className="sr-only">
        MailMind en chiffres
      </h2>
      <div data-reveal className="mx-auto max-w-6xl rounded-3xl glass p-2">
        <div
          className="grid gap-px overflow-hidden rounded-2xl sm:grid-cols-2 md:grid-cols-4"
          style={{ background: "rgb(var(--glass-tint) / 0.06)" }}
        >
          {items.map((it) => (
            <div key={it.label} className="bg-background/60 p-8 text-center">
              <p className="font-display text-4xl tracking-tight md:text-5xl">{it.value}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {it.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Pricing comparison ----------
const pricingPlans = [
  { name: "Free", price: "0€", period: "/mois", cta: "Démarrer", primary: false },
  { name: "Pro", price: "19€", period: "/mois", cta: "Choisir Pro", primary: true },
];
type Cell = boolean | string;
const pricingMatrix: { group: string; rows: { label: string; values: [Cell, Cell] }[] }[] = [
  {
    group: "Comptes & volume",
    rows: [
      { label: "Comptes mail connectés", values: ["1", "5"] },
      { label: "Analyses IA / jour", values: ["100", "2 000"] },
      { label: "Rétention configurable", values: [true, true] },
    ],
  },
  {
    group: "Intelligence",
    rows: [
      { label: "Résumés sémantiques", values: [true, true] },
      { label: "Détection phishing", values: [true, true] },
      { label: "Suggestions de réponses IA", values: [false, true] },
      { label: "Commande /draft messagerie", values: [false, true] },
    ],
  },
  {
    group: "Canaux",
    rows: [
      { label: "Alertes Telegram", values: [false, true] },
      { label: "Alertes WhatsApp", values: [false, true] },
      { label: "Digests quotidiens", values: [false, true] },
    ],
  },
  {
    group: "Facturation",
    rows: [
      { label: "Checkout Stripe", values: [false, true] },
      { label: "Portail abonnement", values: [false, true] },
    ],
  },
];

function PricingTable() {
  const ref = useGsapReveal();
  return (
    <section ref={ref} id="pricing" className="px-6 py-24 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mb-12 text-center md:mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Tarifs
          </span>
          <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Simple. Transparent.
            <br className="hidden sm:block" />
            Sans engagement.
          </h2>
        </div>

        <div data-reveal className="overflow-hidden rounded-3xl glass">
          {/* Plan headers */}
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 border-b border-border bg-surface/50 px-4 py-5 sm:px-6 md:gap-4">
            <div className="hidden sm:block" />
            {pricingPlans.map((p) => (
              <div key={p.name} className="text-center">
                <span
                  className={`font-mono text-[10px] font-bold uppercase tracking-widest ${p.primary ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {p.name}
                </span>
                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="font-display text-2xl tracking-tight md:text-3xl">
                    {p.price}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.period}</span>
                </div>
                {p.primary && (
                  <span className="mt-1 inline-block rounded-full bg-foreground px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-background">
                    Populaire
                  </span>
                )}
              </div>
            ))}
          </div>

          {pricingMatrix.map((section) => (
            <div key={section.group}>
              <div className="border-b border-border bg-surface-muted/40 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:px-6">
                {section.group}
              </div>
              {section.rows.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 px-4 py-3 text-sm sm:px-6 md:gap-4 ${
                    i % 2 ? "" : "bg-background/40"
                  }`}
                >
                  <div className="text-foreground/90">{row.label}</div>
                  {row.values.map((v, j) => (
                    <div key={j} className="text-center text-sm">
                      {typeof v === "boolean" ? (
                        v ? (
                          <Check className="mx-auto size-4 text-safe" strokeWidth={2.5} />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/50" />
                        )
                      ) : (
                        <span className="font-mono text-xs">{v}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* CTA row */}
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 border-t border-border bg-surface/50 px-4 py-5 sm:px-6 md:gap-4">
            <div className="hidden sm:block" />
            {pricingPlans.map((p) => (
              <Link
                key={p.name}
                to="/auth"
                className={`w-full rounded-full py-2 text-center text-xs font-semibold transition-transform active:scale-95 ${
                  p.primary ? "bg-foreground text-background" : "glass-subtle text-foreground"
                }`}
              >
                {p.cta}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------
const faqItems = [
  {
    q: "MailMind lit-il vraiment tous mes e-mails ?",
    a: "MailMind synchronise les messages Gmail récents nécessaires à l'inbox et à l'analyse. Le corps envoyé au modèle est limité, et les préférences permettent de contrôler le traitement.",
  },
  {
    q: "Quel modèle d'IA est utilisé ?",
    a: "Le modèle est configurable côté serveur avec AI_ANALYSIS_MODEL. Le modèle reçoit le sujet, l'expéditeur et un extrait du corps pour produire une analyse structurée.",
  },
  {
    q: "Comment fonctionne l'authentification OAuth 2.0 ?",
    a: "Vous autorisez MailMind depuis l'écran officiel de Google. Votre mot de passe n'est jamais communiqué à MailMind et les tokens sont chiffrés côté serveur.",
  },
  {
    q: "Puis-je agir depuis MailMind ?",
    a: "Oui pour Gmail : vous pouvez archiver, signaler comme indésirable et générer puis envoyer une réponse. Ces actions nécessitent les autorisations Gmail correspondantes.",
  },
  {
    q: "Combien de temps mes e-mails sont-ils conservés ?",
    a: "Les messages synchronisés restent dans votre compte jusqu'à leur suppression ou leur archivage. Les exports peuvent être téléchargés depuis les paramètres.",
  },
  {
    q: "Comment les scores de risque sont-ils calculés ?",
    a: "L'IA évalue le contenu, l'expéditeur et le contexte fourni dans le message. Un score entre 0 et 1 ainsi qu'une justification sont affichés dans le MindPanel.",
  },
];

function FAQ() {
  const ref = useGsapReveal();
  return (
    <section ref={ref} id="faq" className="px-6 py-24 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div data-reveal className="mb-12 text-center md:mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            FAQ
          </span>
          <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Questions fréquentes
          </h2>
        </div>
        <div data-stagger className="space-y-2">
          {faqItems.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl glass-subtle px-5 py-4 transition-colors open:bg-surface-muted/40">
      <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
        <span className="font-display text-base tracking-wide">{q}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </details>
  );
}

function CTA() {
  const ref = useGsapReveal();
  return (
    <section ref={ref} aria-labelledby="cta-title" className="px-6 py-24 md:py-28">
      <div data-reveal className="mx-auto max-w-3xl rounded-3xl glass p-10 text-center md:p-14">
        <Sparkles className="mx-auto size-6 text-foreground" strokeWidth={1.5} />
        <h2
          id="cta-title"
          className="mt-6 font-display text-4xl tracking-tight sm:text-5xl md:text-6xl"
        >
          Prêt à transformer
          <br />
          votre messagerie ?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Démarrez en moins de 60 secondes. Free pour commencer, Pro pour libérer le pipeline.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-7 font-semibold text-background transition-transform active:scale-95"
          >
            Créer mon compte
          </Link>
          <Link
            to="/pricing"
            className="inline-flex h-12 items-center justify-center rounded-full glass px-7 font-semibold text-foreground"
          >
            Voir les plans
          </Link>
        </div>
      </div>
    </section>
  );
}
