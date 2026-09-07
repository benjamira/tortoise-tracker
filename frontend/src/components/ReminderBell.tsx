import { useT } from "../i18n";
import { useReminders } from "../reminders";

export default function ReminderBell() {
  const t = useT();
  const { reminders, panelOpen, setPanelOpen } = useReminders();

  if (reminders.length === 0) return null;

  const label = t("reminder.openTitle", { count: reminders.length });
  return (
    <button
      type="button"
      className={`reminder-bell${panelOpen ? " active" : ""}`}
      onClick={() => setPanelOpen(!panelOpen)}
      title={label}
      aria-label={label}
    >
      🔔
      <span className="badge">{reminders.length}</span>
    </button>
  );
}
