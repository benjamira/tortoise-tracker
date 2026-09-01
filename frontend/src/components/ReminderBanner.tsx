import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { formatDate, formatWeight } from "../format";
import { useT } from "../i18n";
import type { Reminder, Tortoise } from "../types";

function useReminderText() {
  const t = useT();
  return (r: Reminder): { title: string; detail: string } => {
    if (r.typ === "fotodokumentation") {
      const detail = r.context.letzte_doku
        ? t("reminder.photoContext", {
            date: formatDate(r.context.letzte_doku),
            months: r.context.intervall_monate ?? 0,
          })
        : t("reminder.photoContextNone");
      return { title: t("reminder.photoDue"), detail };
    }
    return {
      title: t("reminder.chipDue"),
      detail: t("reminder.chipContext", {
        weight: r.context.gewicht_g != null ? formatWeight(r.context.gewicht_g).replace(" g", "") : "?",
        threshold: r.context.schwelle_g ?? "?",
      }),
    };
  };
}

export default function ReminderBanner({ tortoises }: { tortoises: Tortoise[] }) {
  const t = useT();
  const reminderText = useReminderText();
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

  useEffect(() => {
    if (tortoises.length) refresh();
  }, [tortoises.length, refresh]);

  if (dismissed || reminders.length === 0) return null;

  return (
    <div className="reminder-banner">
      <h3>
        {t("reminder.openTitle", { count: reminders.length })}{" "}
        <button className="link" onClick={() => setDismissed(true)}>
          {t("reminder.hide")}
        </button>
      </h3>
      {reminders.map((r) => {
        const { title, detail } = reminderText(r);
        return (
          <div key={r.id} className="reminder-item">
            <strong>{r.tier_name}</strong> — {title}
            <div className="muted" style={{ fontSize: "0.82rem" }}>
              {detail}
            </div>
            <div className="actions">
              <button
                className="link"
                onClick={async () => {
                  await api.ackReminder(r.id);
                  refresh();
                }}
              >
                {t("reminder.done")}
              </button>
              {[7, 30].map((days) => (
                <button
                  key={days}
                  className="link"
                  onClick={async () => {
                    await api.snoozeReminder(r.id, days);
                    refresh();
                  }}
                >
                  {t("reminder.snoozeDays", { days })}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
