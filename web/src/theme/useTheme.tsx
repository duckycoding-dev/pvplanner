import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "theme";

/** Logica pura: scelta salvata valida → usala; altrimenti preferenza di sistema. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

/** Tema iniziale leggendo localStorage + matchMedia (protetti per SSR/test). */
export function detectTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    /* localStorage non disponibile */
  }
  let prefersDark = false;
  try {
    prefersDark = typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    /* matchMedia non disponibile */
  }
  return resolveInitialTheme(stored, prefersDark);
}

function applyTheme(theme: Theme): void {
  try {
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    /* ignore (SSR/test) */
  }
}

interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setTheme] = useState<Theme>(detectTheme);

  // Riflette il tema su <html data-theme> anche al primo montaggio.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback((): void => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      applyTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeCtx>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme deve essere usato dentro <ThemeProvider>.");
  return ctx;
}
