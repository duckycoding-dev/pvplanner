import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dict, Lang } from "./types.ts";
import { it } from "./it.ts";
import { en } from "./en.ts";

const DICTS: Record<Lang, Dict> = { it, en };
const LANG_KEY = "lang";

/** Lingua iniziale: localStorage → navigator.language ("it…" → it, altrimenti en) → it. */
export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "it" || stored === "en") return stored;
  } catch {
    /* localStorage non disponibile */
  }
  try {
    const nav = typeof navigator !== "undefined" ? navigator.language : "";
    return nav.toLowerCase().startsWith("it") ? "it" : "en";
  } catch {
    /* navigator non disponibile */
  }
  return "it";
}

// Warn una sola volta per chiave mancante (evita spam in console durante il render).
const warned = new Set<string>();

/** Reset del set di warning: SOLO per i test. */
export function __resetI18nWarnings(): void {
  warned.clear();
}

/**
 * Risolve una chiave nel dizionario `lang`. Fallback: it → chiave stessa (mai throw).
 * `vars` interpola i segnaposto `{name}` nel template. Console.warn una volta per chiave
 * quando manca ovunque.
 */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let template = DICTS[lang][key];
  if (template === undefined) {
    template = DICTS.it[key];
    if (template === undefined) {
      if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[i18n] chiave mancante: ${key}`);
      }
      template = key;
    }
  }
  if (vars !== undefined) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replaceAll(`{${k}}`, String(v));
    }
  }
  return template;
}

interface LangCtx {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Lang>(detectLang);

  // Riflette la lingua attiva su <html lang> anche al primo montaggio (SEO/accessibilità).
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      /* ignore (SSR/test) */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang): void => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
    try {
      document.documentElement.lang = l;
    } catch {
      /* ignore (SSR/test) */
    }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT(): LangCtx {
  const ctx = useContext(LangContext);
  if (ctx === null) throw new Error("useT deve essere usato dentro <LangProvider>.");
  return ctx;
}

/** Etichette mesi localizzate (12 voci, Gen…Dic / Jan…Dec), dalla chiave `format.months`. */
export function useMonthLabels(): string[] {
  const { t } = useT();
  return t("format.months").split(",");
}
