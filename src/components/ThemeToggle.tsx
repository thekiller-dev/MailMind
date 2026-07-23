import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={compact ? "size-9" : "h-9 w-28"} />;

  const options = [
    { v: "light", icon: Sun, label: "Light" },
    { v: "system", icon: Monitor, label: "System" },
    { v: "dark", icon: Moon, label: "Dark" },
  ] as const;

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full glass-subtle p-0.5">
      {options.map(({ v, icon: Icon, label }) => {
        const active = theme === v;
        return (
          <button
            key={v}
            onClick={() => setTheme(v)}
            aria-label={`Theme ${label}`}
            title={label}
            className={`grid size-7 place-items-center rounded-full transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
