import { useTheme } from "../theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? "Zu hellem Design wechseln" : "Zu dunklem Design wechseln"}
      aria-label="Design umschalten"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
