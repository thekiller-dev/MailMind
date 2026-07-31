import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Forward, Globe2, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { useUser } from "@/lib/data-hooks";

export const Route = createFileRoute("/connect-email")({
  head: () => ({
    meta: [
      { title: "Connecter un e-mail — MailMind" },
      {
        name: "description",
        content:
          "Découvrez les méthodes sécurisées pour connecter un ou plusieurs comptes e-mail à MailMind.",
      },
    ],
  }),
  component: ConnectEmailPage,
});

function ConnectEmailPage() {
  const { user } = useUser();

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            Connexion des comptes
          </p>
          <h1 className="mt-4 font-display text-5xl leading-none tracking-tight sm:text-7xl">
            Connectez vos e-mails en toute clarté.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            MailMind se connecte en priorité via l’API Gmail (OAuth). Un transfert vers une adresse
            privée reste disponible en alternative.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <GuideCard
            icon={Globe2}
            eyebrow="Méthode recommandée"
            title="Connexion Gmail avec Google"
            description="OAuth sécurisé pour synchroniser, analyser et agir sur vos messages (archive, spam, réponses)."
            steps={[
              "Cliquez sur « Ajouter un compte Gmail » dans les Paramètres.",
              "Choisissez le compte Google à connecter.",
              "Acceptez les autorisations Gmail affichées par Google.",
              "Revenez sur MailMind : le premier scan démarre automatiquement.",
            ]}
          />
          <GuideCard
            icon={Forward}
            eyebrow="Alternative"
            title="Transfert Gmail vers MailMind"
            description="Sans accès OAuth : les messages sont transférés vers une adresse privée MailMind."
            steps={[
              "Ouvrez « Méthode alternative : transfert » dans les Paramètres.",
              "Ajoutez l’adresse MailMind dans Gmail → Transfert et POP/IMAP.",
              "Validez l’e-mail de confirmation envoyé par Google.",
              "Activez le transfert et vérifiez le statut « Transfert actif ».",
            ]}
          />
        </div>

        <section className="mt-8 rounded-3xl glass p-7 sm:p-10">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-1 size-6 shrink-0 text-safe" />
            <div>
              <h2 className="font-display text-2xl">Ce que MailMind protège</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
                <li>Les tokens OAuth restent côté serveur et ne sont pas exposés au navigateur.</li>
                <li>Chaque compte est isolé par utilisateur dans la base de données.</li>
                <li>Un compte peut être supprimé à tout moment depuis les Paramètres.</li>
                <li>Les transferts utilisent des alias privés et uniques.</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {!user && (
            <Link
              to="/auth"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background"
            >
              Créer un compte <ArrowRight className="size-4" />
            </Link>
          )}
          <Link
            to="/settings"
            className={`inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold hover:bg-surface-muted ${
              user ? "bg-foreground text-background" : ""
            }`}
          >
            {user ? "Retour aux Paramètres" : "Voir les Paramètres"}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function GuideCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  steps,
}: {
  icon: typeof Globe2;
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
}) {
  return (
    <article className="rounded-3xl glass p-7 sm:p-8">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Icon className="size-5" />
      </div>
      <p className="mt-7 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <ol className="mt-7 space-y-4">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-7 flex items-center gap-2 text-xs font-medium text-safe">
        <CheckCircle2 className="size-4" /> Vous pouvez connecter plusieurs comptes
      </p>
    </article>
  );
}
