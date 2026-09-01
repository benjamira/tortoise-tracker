import { DEFAULT_LANG, LOCALES, STORAGE_KEY, type Lang, type MessageKey } from "./config";

let current: Lang = DEFAULT_LANG;

function isLang(value: string | null): value is Lang {
  return value != null && value in LOCALES;
}

/** Resolve the initial language: stored choice → browser language → default. */
export function initLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) {
      current = saved;
      return current;
    }
  } catch {
    /* ignore */
  }
  try {
    const nav = (navigator.language || "").slice(0, 2);
    if (isLang(nav)) {
      current = nav;
      return current;
    }
  } catch {
    /* ignore */
  }
  current = DEFAULT_LANG;
  return current;
}

export function getLang(): Lang {
  return current;
}

export function setLangState(lang: Lang): void {
  current = lang;
}

export function translate(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let s = LOCALES[current].messages[key] ?? LOCALES[DEFAULT_LANG].messages[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

initLang();
