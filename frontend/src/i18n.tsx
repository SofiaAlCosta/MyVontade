import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "pt" | "en";

const LANGUAGE_KEY = "myvontade-language";

// O texto português é a chave; o dicionário abaixo dá a tradução inglesa.
// Quando o idioma é PT, devolve-se a própria chave (o texto original).
// Placeholders no formato {nome} são substituídos pelos params passados a t().
const englishDictionary: Record<string, string> = {};

export function registerTranslations(entries: Record<string, string>) {
  Object.assign(englishDictionary, entries);
}

type TranslateParams = Record<string, string | number>;

function applyParams(text: string, params?: TranslateParams) {
  if (!params) {
    return text;
  }

  let output = text;

  for (const [key, value] of Object.entries(params)) {
    output = output.split(`{${key}}`).join(String(value));
  }

  return output;
}

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readInitialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);

    if (stored === "pt" || stored === "en") {
      return stored;
    }
  } catch {
    // Ignorar: sem localStorage assume português.
  }

  return "pt";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);

    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Ignorar.
    }
  }, []);

  const t = useCallback(
    (text: string, params?: TranslateParams) => {
      const base =
        language === "en" ? englishDictionary[text] ?? text : text;
      return applyParams(base, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n tem de ser usado dentro de I18nProvider.");
  }

  return context;
}
