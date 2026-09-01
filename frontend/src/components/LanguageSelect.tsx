import { useI18n } from "../i18n";
import { type Lang } from "../i18n/config";

export default function LanguageSelect() {
  const { lang, setLang, locales, t } = useI18n();
  return (
    <select
      className="lang-select"
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      aria-label={t("controls.language")}
      title={t("controls.language")}
    >
      {(Object.entries(locales) as [Lang, { label: string }][]).map(([code, l]) => (
        <option key={code} value={code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
