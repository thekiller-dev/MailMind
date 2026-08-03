import { ArrowRight, CheckCircle2, Radar, Sparkles } from "lucide-react";

export function AuthShowcase() {
  return (
    <aside
      aria-labelledby="auth-showcase-title"
      className="auth-showcase relative hidden overflow-hidden border-l border-border lg:block"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,oklch(0.25_0.04_220),transparent_36%),linear-gradient(145deg,oklch(0.12_0.02_240),oklch(0.06_0_0))]" />
      <div className="auth-orb auth-orb-one absolute -right-24 top-10 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="auth-orb auth-orb-two absolute bottom-12 left-10 size-64 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
        <div className="max-w-xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-200/60">
            Le cockpit de votre messagerie
          </span>
          <h2
            id="auth-showcase-title"
            className="mt-5 font-display text-5xl leading-[0.92] tracking-tight xl:text-7xl"
          >
            Moins de tri.
            <br />
            <span className="text-cyan-200">Plus de signal.</span>
          </h2>
          <p className="mt-7 max-w-md text-sm leading-relaxed text-white/55">
            MailMind transforme les messages entrants en résumés, alertes et actions claires. Votre
            boîte reste la même. Votre façon de la lire change.
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
