import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import { useT } from "../i18n";
import type { Note } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

export default function NotesPage() {
  const t = useT();
  const [notes, setNotes] = useState<Note[]>([]);
  const [datum, setDatum] = useState(today());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");

  const load = () => api.listNotes().then(setNotes);
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      await api.createNote({ datum: datum || today(), text });
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
    <div>
      <h2>{t("notes.title")}</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("notes.add")}</h3>
        <form onSubmit={add}>
          <div className="field" style={{ maxWidth: 200 }}>
            <label>{t("common.date")}</label>
            <input
              type="date"
              required
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("notes.text")}</label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("notes.placeholder")}
            />
          </div>
          {err && <p className="danger" style={{ margin: "0 0 8px" }}>{err}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "…" : t("action.save")}
          </button>
        </form>
      </div>

      <div className="card">
        {notes.length === 0 && <p className="muted">{t("notes.none")}</p>}
        {notes.map((n) => (
          <div className="event" key={n.id}>
            <div className="when">{formatDate(n.datum)}</div>
            {editId === n.id ? (
              <>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{ width: "auto", marginBottom: 6 }}
                />
                <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    className="primary"
                    onClick={async () => {
                      setErr(null);
                      try {
                        await api.updateNote(n.id, { datum: editDate, text: editText });
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
                <p className="txt">{n.text}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setEditId(n.id);
                      setEditText(n.text);
                      setEditDate(n.datum.slice(0, 10));
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
                        await api.deleteNote(n.id);
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
    </div>
  );
}
