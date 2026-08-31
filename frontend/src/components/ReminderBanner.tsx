import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Reminder, Tortoise } from "../types";

export default function ReminderBanner({ tortoises }: { tortoises: Tortoise[] }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await api.evaluateReminders();
      setReminders(await api.listReminders());
    } catch {
      /* offline / not ready */
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Re-check whenever the set of tortoises changes (new animal, weight, …).
  useEffect(() => {
    if (tortoises.length) refresh();
  }, [tortoises.length, refresh]);

  if (dismissed || reminders.length === 0) return null;

  return (
    <div className="reminder-banner">
      <h3>
        Offene Erinnerungen ({reminders.length}){" "}
        <button className="link" onClick={() => setDismissed(true)}>
          ausblenden
        </button>
      </h3>
      {reminders.map((r) => (
        <div key={r.id} className="reminder-item">
          <strong>{r.tier_name}</strong> — {r.text}
          <div className="actions">
            <button
              className="link"
              onClick={async () => {
                await api.ackReminder(r.id);
                refresh();
              }}
            >
              Erledigt
            </button>
            <button
              className="link"
              onClick={async () => {
                await api.snoozeReminder(r.id, 7);
                refresh();
              }}
            >
              7 Tage
            </button>
            <button
              className="link"
              onClick={async () => {
                await api.snoozeReminder(r.id, 30);
                refresh();
              }}
            >
              30 Tage
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
