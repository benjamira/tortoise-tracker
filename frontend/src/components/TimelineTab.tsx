import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import type { EventTyp, TortoiseEvent } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

const TYP_LABEL: Record<EventTyp, string> = {
  einwinterung: "Einwinterung",
  auswinterung: "Auswinterung",
  tierarzt: "Tierarztbesuch",
  medikation: "Medikation",
  sonstiges: "Sonstiges",
};

export default function TimelineTab({ tortoiseId }: { tortoiseId: number }) {
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
      setErr(`Speichern fehlgeschlagen: ${(ex as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ereignis hinzufügen</h3>
        <form onSubmit={add}>
          <div className="row">
            <div className="field">
              <label>Datum</label>
              <input
                type="date"
                required
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Typ</label>
              <select value={typ} onChange={(e) => setTyp(e.target.value as EventTyp)}>
                {(Object.keys(TYP_LABEL) as EventTyp[]).map((t) => (
                  <option key={t} value={t}>
                    {TYP_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Notiz (Freitext, optional)</label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="z.B. Kontrolle bei Dr. …, Panacur 1×, Kotprobe o.B."
            />
          </div>
          {err && <p className="danger" style={{ margin: "0 0 8px" }}>{err}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "…" : "Eintragen"}
          </button>
        </form>
      </div>

      <div className="card">
        {events.length === 0 && <p className="muted">Noch keine Ereignisse.</p>}
        {events.map((ev) => (
          <div className="event" key={ev.id}>
            <div className="when">
              {formatDate(ev.datum)} · <span className="pill">{TYP_LABEL[ev.typ]}</span>
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
                        setErr(`Speichern fehlgeschlagen: ${(ex as Error).message}`);
                      }
                    }}
                  >
                    Speichern
                  </button>
                  <button type="button" onClick={() => setEditId(null)}>
                    Abbrechen
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="txt">{ev.text || <span className="muted">(keine Notiz)</span>}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setEditId(ev.id);
                      setEditText(ev.text);
                    }}
                  >
                    bearbeiten
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
                        setErr(`Löschen fehlgeschlagen: ${(ex as Error).message}`);
                      }
                    }}
                  >
                    löschen
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
