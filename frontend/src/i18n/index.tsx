import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALES, STORAGE_KEY, type Lang, type MessageKey } from "./config";
import { getLang, setLangState, translate } from "./state";

type TFn = (key: MessageKey, params?: Record<string, string | number>) => string;

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFn;
  locales: typeof LOCALES;
}

const I18nCtx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangS] = useState<Lang>(getLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next); // update module state synchronously so translate() is correct
    setLangS(next); // re-render consumers
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: translate, locales: LOCALES }),
    [lang, setLang],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export function useT(): TFn {
  return useI18n().t;
}
