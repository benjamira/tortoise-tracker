import { useT } from "../i18n";
import { useReminders } from "../reminders";

export default function ReminderBell() {
  const t = useT();
  const { reminders, panelOpen, setPanelOpen } = useReminders();
  const active = reminders.filter((r) => !r.snoozed).length;
  const label = active > 0 ? t("reminder.openTitle", { count: active }) : t("reminder.none");

  return (
    <button
      type="button"
      className={`reminder-bell${active > 0 ? " has-reminders" : ""}${panelOpen ? " active" : ""}`}
      onClick={() => setPanelOpen(!panelOpen)}
      title={label}
      aria-label={label}
    >
      🔔
      {active > 0 && <span className="badge">{active}</span>}
    </button>
  );
}
