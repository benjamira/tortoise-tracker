import { useT } from "../i18n";
import { useTheme } from "../theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const t = useT();
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? t("controls.toLight") : t("controls.toDark")}
      aria-label={t("controls.toggleTheme")}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
