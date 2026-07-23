import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt?: string;
  badge?: string;
  sections: LegalSection[];
  notice?: string;
};

export function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt = "22 juillet 2026",
  badge = "Document public",
  sections,
  notice,
}: LegalPageProps) {
  return (
    <>
      <SiteNav />
      <main className="relative overflow-hidden bg-background">
        <div className="pointer-events-none absolute -top-40 left-1/4 size-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <header className="relative border-b border-border px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-5xl">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Retour à l'accueil
            </Link>
            <div className="mt-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                    {eyebrow}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {badge}
                  </span>
                </div>
                <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
                  {title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl glass-subtle px-4 py-3">
                <FileText className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    Dernière mise à jour
                  </p>
                  <p className="mt-1 text-sm font-medium">{updatedAt}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="relative mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-[190px_1fr] md:py-24">
          <aside className="hidden md:block">
            <div className="sticky top-28 rounded-2xl glass-subtle p-4">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Sommaire
              </p>
              <nav className="mt-4 space-y-2.5">
                {sections.map((section, index) => (
                  <a
                    key={section.title}
                    href={`#section-${index + 1}`}
                    className="block text-xs leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {String(index + 1).padStart(2, "0")} {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="min-w-0">
            {notice && (
              <div className="mb-8 flex gap-3 rounded-2xl border border-warn/20 bg-warn/5 p-5 text-sm leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warn" />
                <p>{notice}</p>
              </div>
            )}
            <div className="space-y-12">
              {sections.map((section, index) => (
                <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-28">
                  <div className="flex items-start gap-4">
                    <span className="mt-1 font-mono text-[10px] text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-2xl tracking-wide sm:text-3xl">
                        {section.title}
                      </h2>
                      {section.paragraphs?.map((paragraph) => (
                        <p
                          key={paragraph}
                          className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base"
                        >
                          {paragraph}
                        </p>
                      ))}
                      {section.bullets && (
                        <ul className="mt-5 space-y-3">
                          {section.bullets.map((bullet) => (
                            <li
                              key={bullet}
                              className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base"
                            >
                              <CheckCircle2
                                className="mt-0.5 size-4 shrink-0 text-safe"
                                strokeWidth={1.8}
                              />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-16 flex flex-col gap-5 rounded-3xl bg-foreground p-7 text-background sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="font-display text-xl tracking-wide">Une question sur ce document ?</p>
                <p className="mt-2 text-sm text-background/60">
                  Notre équipe peut vous aider à comprendre le fonctionnement de MailMind.
                </p>
              </div>
              <a
                href="mailto:legal@mailmind.ai"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-background px-5 py-2.5 text-xs font-semibold text-foreground transition-transform active:scale-95"
              >
                Contacter le juridique <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
