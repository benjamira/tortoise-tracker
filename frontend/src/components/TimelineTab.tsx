import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import { useT } from "../i18n";
import type { EventTyp, TortoiseEvent } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

const EVENT_TYPES: EventTyp[] = [
  "einwinterung",
  "auswinterung",
  "tierarzt",
  "medikation",
  "sonstiges",
];

export default function TimelineTab({ tortoiseId }: { tortoiseId: number }) {
  const t = useT();
  const [events, setEvents] = useState<TortoiseEvent[]>([]);
  const [datum, setDatum] = useState(today());
  const [typ, setTyp] = useState<EventTyp>("tierarzt");
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.listEvents(tortoiseId).then(setEvents);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tortoiseId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.createEvent(tortoiseId, { datum: datum || today(), typ, text });
      setText("");
      setDatum(today());
      await load();
    } catch (ex) {
      setErr(t("action.saveFailed", { msg: (ex as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("timeline.addEvent")}</h3>
        <form onSubmit={add}>
          <div className="row">
            <div className="field">
              <label>{t("gewicht.date")}</label>
              <input
                type="date"
                required
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("timeline.type")}</label>
              <select value={typ} onChange={(e) => setTyp(e.target.value as EventTyp)}>
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {t(`eventType.${et}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>{t("timeline.note")}</label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("timeline.notePlaceholder")}
            />
          </div>
          {err && <p className="danger" style={{ margin: "0 0 8px" }}>{err}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "…" : t("timeline.submit")}
          </button>
        </form>
      </div>

      <div className="card">
        {events.length === 0 && <p className="muted">{t("timeline.noEvents")}</p>}
        {events.map((ev) => (
          <div className="event" key={ev.id}>
            <div className="when">
              {formatDate(ev.datum)} · <span className="pill">{t(`eventType.${ev.typ}`)}</span>
            </div>
            {editId === ev.id ? (
              <>
                <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    className="primary"
                    onClick={async () => {
                      setErr(null);
                      try {
                        await api.updateEvent(ev.id, { text: editText });
                        setEditId(null);
                        await load();
                      } catch (ex) {
                        setErr(t("action.saveFailed", { msg: (ex as Error).message }));
                      }
                    }}
                  >
                    {t("action.save")}
                  </button>
                  <button type="button" onClick={() => setEditId(null)}>
                    {t("action.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="txt">
                  {ev.text || <span className="muted">{t("timeline.noNote")}</span>}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setEditId(ev.id);
                      setEditText(ev.text);
                    }}
                  >
                    {t("action.edit")}
                  </button>
                  <button
                    type="button"
                    className="link danger"
                    onClick={async () => {
                      setErr(null);
                      try {
                        await api.deleteEvent(ev.id);
                        await load();
                      } catch (ex) {
                        setErr(t("action.deleteFailed", { msg: (ex as Error).message }));
                      }
                    }}
                  >
                    {t("action.delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
