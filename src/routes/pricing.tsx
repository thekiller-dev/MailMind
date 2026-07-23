import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Tarifs — MailMind AI" },
      {
        name: "description",
        content:
          "Free, Pro et Enterprise. Une tarification simple à l'échelle de votre messagerie.",
      },
      { property: "og:title", content: "Tarifs — MailMind AI" },
      {
        property: "og:description",
        content: "Free pour commencer. Pro à 19€/mois. Enterprise sur mesure.",
      },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Standard",
    price: "0€",
    period: "/mois",
    cta: "Gratuit pour toujours",
    primary: false,
    features: [
      "1 compte connecté",
      "100 analyses / jour",
      "Détection standard",
      "Digest hebdomadaire",
    ],
  },
  {
    name: "Professional",
    price: "19€",
    period: "/mois",
    cta: "Démarrer Pro",
    primary: true,
    features: [
      "5 comptes connectés",
      "Analyses illimitées",
      "Extraction d'entités avancée",
      "Détection phishing premium",
      "Suggestions de réponse IA",
      "Support prioritaire",
    ],
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    cta: "Parler aux ventes",
    primary: false,
    features: [
      "Comptes illimités",
      "SSO & conformité",
      "Modèles IA personnalisés",
      "Déploiement on-premise",
      "SLA dédié",
    ],
  },
];

function Pricing() {
  return (
    <>
      <SiteNav />
      <main className="bg-background">
        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              Pricing
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
              Une tarification simple, à votre échelle.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Démarrez gratuitement. Évoluez quand votre inbox grossit. Sans engagement.
            </p>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border bg-surface p-8 ${
                  p.primary
                    ? "border-primary ring-1 ring-primary shadow-xl shadow-primary/10"
                    : "border-border"
                }`}
              >
                {p.primary && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase text-primary-foreground">
                    Le plus populaire
                  </div>
                )}
                <span
                  className={`font-mono text-xs font-bold uppercase ${
                    p.primary ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {p.name}
                </span>
                <div className="mt-4 mb-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <ul className="mb-8 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.name === "Enterprise" ? "/" : "/auth"}
                  className={`w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-transform active:scale-95 ${
                    p.primary
                      ? "bg-primary text-primary-foreground"
                      : p.name === "Enterprise"
                        ? "bg-foreground text-background"
                        : "bg-surface-muted text-foreground"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
