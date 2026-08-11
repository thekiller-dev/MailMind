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
          "Free pour démarrer, Pro à 19€/mois pour 5 comptes, Telegram, WhatsApp et plus d'analyses IA.",
      },
      { property: "og:title", content: "Tarifs — MailMind AI" },
      {
        property: "og:description",
        content: "Free pour commencer. Pro à 19€/mois avec canaux messagerie et 5 comptes.",
      },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Free",
    price: "0€",
    period: "/mois",
    cta: "Commencer gratuitement",
    href: "/auth" as const,
    primary: false,
    features: [
      "1 compte Gmail connecté",
      "100 analyses IA / jour",
      "Inbox unifiée + détection phishing",
      "Rétention configurable",
    ],
  },
  {
    name: "Pro",
    price: "19€",
    period: "/mois",
    cta: "Passer en Pro",
    href: "/auth" as const,
    primary: true,
    features: [
      "Jusqu’à 5 comptes Gmail",
      "2 000 analyses IA / jour",
      "Telegram & WhatsApp (alertes, digests, /draft)",
      "Suggestions de réponse IA",
      "Portail de facturation Stripe",
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
              Free pour démarrer. Pro quand vous scalez.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Les limites affichées correspondent exactement au produit. Paiement sécurisé via
              Stripe.
            </p>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
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
                    Recommandé
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
                  to={p.href}
                  className={`w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-transform active:scale-95 ${
                    p.primary
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-muted text-foreground"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
            Après inscription, l’upgrade Pro se fait depuis Paramètres → Abonnement. Besoin
            d’Enterprise (SSO, on-prem) ? Contactez-nous via le site.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
