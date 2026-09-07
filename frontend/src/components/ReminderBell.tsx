import { useT } from "../i18n";
import { useReminders } from "../reminders";

export default function ReminderBell() {
  const t = useT();
  const { reminders, panelOpen, setPanelOpen } = useReminders();
  const count = reminders.length;
  const label = count > 0 ? t("reminder.openTitle", { count }) : t("reminder.none");

  return (
    <button
      type="button"
      className={`reminder-bell${count > 0 ? " has-reminders" : ""}${panelOpen ? " active" : ""}`}
      onClick={() => setPanelOpen(!panelOpen)}
      title={label}
      aria-label={label}
    >
      🔔
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  );
}
