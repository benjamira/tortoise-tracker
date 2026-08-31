import { useState } from "react";
import type { Tortoise } from "../types";

type Draft = Partial<Tortoise>;

const EMPTY: Draft = { name: "", geschlecht: "unbekannt" };

export default function TortoiseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Tortoise;
  submitLabel: string;
  onSubmit: (data: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set =
    (k: keyof Draft) =>
    (e: { target: { value: string } }) =>
      setDraft(
        (d) => ({ ...d, [k]: e.target.value === "" ? null : e.target.value }) as Draft,
      );

  // Filling a death/sale date pre-selects "archive"; clearing both undoes it.
  const setEndDate =
    (k: "sterbedatum" | "verkaufsdatum") =>
    (e: { target: { value: string } }) =>
      setDraft((d) => {
        const next = { ...d, [k]: e.target.value || null } as Draft;
        const hasEnd = Boolean(next.sterbedatum || next.verkaufsdatum);
        const hadEnd = Boolean(d.sterbedatum || d.verkaufsdatum);
        if (hasEnd && !hadEnd) next.archiviert = true;
        if (!hasEnd) next.archiviert = false;
        return next;
      });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name?.trim()) {
      setErr("Name ist erforderlich.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(draft);
    } catch (ex) {
      setErr((ex as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Name *</label>
        <input value={draft.name ?? ""} onChange={set("name")} autoFocus />
      </div>
      <div className="grid2">
        <div className="field">
          <label>Unterart</label>
          <input
            value={draft.unterart ?? ""}
            onChange={set("unterart")}
            placeholder="z.B. Testudo hermanni boettgeri"
          />
        </div>
        <div className="field">
          <label>Geschlecht</label>
          <select value={draft.geschlecht ?? "unbekannt"} onChange={set("geschlecht")}>
            <option value="unbekannt">unbekannt</option>
            <option value="weiblich">weiblich</option>
            <option value="maennlich">männlich</option>
          </select>
        </div>
        <div className="field">
          <label>Schlupfdatum</label>
          <input type="date" value={draft.schlupfdatum ?? ""} onChange={set("schlupfdatum")} />
        </div>
        <div className="field">
          <label>Erworben am</label>
          <input type="date" value={draft.erworben_am ?? ""} onChange={set("erworben_am")} />
        </div>
        <div className="field">
          <label>Sterbedatum</label>
          <input type="date" value={draft.sterbedatum ?? ""} onChange={setEndDate("sterbedatum")} />
        </div>
        <div className="field">
          <label>Verkaufsdatum</label>
          <input
            type="date"
            value={draft.verkaufsdatum ?? ""}
            onChange={setEndDate("verkaufsdatum")}
          />
        </div>
        <div className="field">
          <label>CITES-/EG-Bescheinigungsnummer</label>
          <input value={draft.cites_nummer ?? ""} onChange={set("cites_nummer")} />
        </div>
        <div className="field">
          <label>Transpondernummer</label>
          <input
            value={draft.transponder_nr ?? ""}
            onChange={set("transponder_nr")}
            placeholder="leer = noch nicht gechipt"
          />
        </div>
      </div>
      <div className="field">
        <label>Herkunft</label>
        <input value={draft.herkunft ?? ""} onChange={set("herkunft")} />
      </div>
      <div className="field">
        <label>Weitere Kennzeichen</label>
        <input value={draft.kennzeichnung ?? ""} onChange={set("kennzeichnung")} />
      </div>
      <div className="field">
        <label>Notizen</label>
        <textarea rows={3} value={draft.notizen ?? ""} onChange={set("notizen")} />
      </div>
      {(draft.sterbedatum || draft.verkaufsdatum) && (
        <div className="field" style={{ background: "var(--highlight-bg)", padding: "8px 10px", borderRadius: 7 }}>
          <label style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              style={{ width: "auto", marginRight: 6 }}
              checked={Boolean(draft.archiviert)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, archiviert: e.target.checked }) as Draft)
              }
            />
            Tier archivieren – wird in der Seitenleiste unter „Archiv“ einsortiert
          </label>
        </div>
      )}
      {err && <p className="danger">{err}</p>}
      <div className="modal-actions">
        <button type="button" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
