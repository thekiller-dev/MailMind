import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import { useState } from "react";

const steps = [
  {
    title: "Ouvrez les Paramètres",
    description: "Allez dans l’onglet Comptes pour ajouter votre première boîte Gmail.",
  },
  {
    title: "Ajoutez un compte Gmail",
    description:
      "Cliquez sur « Ajouter un compte Gmail ». C’est la méthode recommandée via l’API Google.",
  },
  {
    title: "Autorisez MailMind",
    description:
      "Choisissez le compte Google et acceptez les permissions de lecture, classification et réponses.",
  },
  {
    title: "Attendez le premier scan",
    description: "MailMind synchronise automatiquement vos messages récents et lance l’analyse IA.",
  },
  {
    title: "Activez Telegram (optionnel)",
    description:
      "Dans Notifications, liez Telegram pour recevoir les alertes urgentes et de sécurité.",
  },
] as const;

export function FirstEmailGuideModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-background/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-email-guide-title"
        className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Guide première connexion
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Étape {step + 1}/{steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le guide"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-8 flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            {isLast ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <span className="font-display text-xl">{step + 1}</span>
            )}
          </div>
          <div>
            <h2 id="first-email-guide-title" className="font-display text-2xl tracking-tight">
              {current.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {current.description}
            </p>
          </div>
        </div>
        <div
          className="mt-8 flex gap-1.5"
          aria-label={`Progression : étape ${step + 1} sur ${steps.length}`}
        >
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted disabled:invisible"
          >
            <ArrowLeft className="size-4" /> Précédent
          </button>
          <button
            type="button"
            onClick={() => (isLast ? onClose() : setStep((value) => value + 1))}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {isLast ? "Commencer" : "Suivant"} {!isLast && <ArrowRight className="size-4" />}
          </button>
        </div>
      </section>
    </div>
  );
}
