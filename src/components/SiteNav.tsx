import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-4 z-50 mx-auto mt-4 w-[min(1180px,calc(100%-1.5rem))] rounded-full glass px-2 py-2">
      <div className="flex items-center justify-between gap-3 px-2">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-lg tracking-wide sm:text-xl">MAILMIND</span>
        </Link>
        <div className="hidden gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" hash="app" className="transition-colors hover:text-foreground">
            L'application
          </Link>
          <Link to="/" hash="features" className="transition-colors hover:text-foreground">
            Fonctionnalités
          </Link>
          <Link to="/" hash="use-cases" className="transition-colors hover:text-foreground">
            Cas d'usage
          </Link>
          <Link to="/" hash="security" className="transition-colors hover:text-foreground">
            Sécurité
          </Link>
          <Link to="/" hash="pipeline" className="transition-colors hover:text-foreground">
            Pipeline
          </Link>
          <Link to="/pricing" className="transition-colors hover:text-foreground">
            Tarifs
          </Link>
          <Link to="/" hash="faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Link
            to="/auth"
            className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            Connexion
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-transform active:scale-95"
          >
            Commencer
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="grid size-9 place-items-center rounded-full glass-subtle md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 space-y-1 rounded-2xl glass-subtle p-3 md:hidden">
          {[
            { to: "/", hash: "app", label: "L'application" },
            { to: "/", hash: "features", label: "Fonctionnalités" },
            { to: "/", hash: "use-cases", label: "Cas d'usage" },
            { to: "/", hash: "security", label: "Sécurité & RGPD" },
            { to: "/", hash: "pipeline", label: "Pipeline IA" },
            { to: "/pricing", label: "Tarifs" },
            { to: "/", hash: "faq", label: "FAQ" },
          ].map((i) => (
            <Link
              key={i.label}
              to={i.to}
              hash={i.hash}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              {i.label}
            </Link>
          ))}
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
}

export function Logo() {
  return (
    <div className="grid size-8 place-items-center rounded-lg glass">
      <div
        className="size-2 rounded-full bg-foreground"
        style={{ boxShadow: "0 0 12px currentColor" }}
      />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-border py-14">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-base tracking-wide">MAILMIND</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:gap-8">
          <Link to="/security">Security</Link>
          <Link to="/rgpd">RGPD</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/dpa">DPA</Link>
        </div>
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          © 2026 — Built with intelligence
        </p>
      </div>
    </footer>
  );
}
