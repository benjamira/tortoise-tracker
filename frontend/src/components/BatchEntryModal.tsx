import { useState } from "react";
import { api } from "../api";
import { parseLengthCm, parseWeight } from "../format";
import { useT } from "../i18n";
import type { Tortoise } from "../types";
import Modal from "./Modal";

const today = () => new Date().toISOString().slice(0, 10);

interface BatchRow {
  tortoise: Tortoise;
  gewicht: string;
  laenge: string;
}

export default function BatchEntryModal({
  tortoises,
  onClose,
  onSaved,
}: {
  tortoises: Tortoise[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const t = useT();
  const [datum, setDatum] = useState(today());
  const [rows, setRows] = useState<BatchRow[]>(() =>
    tortoises
      .filter((x) => !x.archiviert)
      .map((tortoise) => ({ tortoise, gewicht: "", laenge: "" })),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const updateRow = (i: number, field: "gewicht" | "laenge", value: string) =>
    setRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  async function handleSave() {
    setErr(null);
    const candidates = rows
      .map((r, i) => ({
        i,
        r,
        g: parseWeight(r.gewicht),
        l: parseLengthCm(r.laenge),
      }))
      .filter(({ g, l }) => g != null || l != null);

    if (candidates.length === 0) {
      setErr(t("batch.nothingEntered"));
      return;
    }

    setBusy(true);
    const results = await Promise.all(
      candidates.map(async ({ i, r, g, l }) => {
        try {
          await api.createMeasurement(r.tortoise.id, {
            datum: datum || today(),
            gewicht_g: g,
            panzerlaenge_mm: l,
          });
          return { i, ok: true as const };
        } catch {
          return { i, ok: false as const, name: r.tortoise.name };
        }
      }),
    );

    const succeededIdx = new Set(results.filter((x) => x.ok).map((x) => x.i));
    const failed = results.filter((x) => !x.ok);

    if (succeededIdx.size > 0) await onSaved();

    if (failed.length === 0) {
      setBusy(false);
      onClose();
      return;
    }

    setRows((rows) => rows.map((r, i) => (succeededIdx.has(i) ? { ...r, gewicht: "", laenge: "" } : r)));
    setErr(t("batch.partialFailure", { names: failed.map((f) => f.name).join(", ") }));
    setBusy(false);
  }

  return (
    <Modal title={t("batch.title")} onClose={onClose} wide>
      <div className="field">
        <label>{t("common.date")}</label>
        <input
          type="date"
          required
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          disabled={busy}
        />
      </div>

      {rows.length === 0 ? (
        <p className="muted">{t("batch.noActive")}</p>
      ) : (
        <div className="batch-list">
          {rows.map((row, i) => (
            <div className="batch-row" key={row.tortoise.id}>
              <div className="batch-name-cell">
                {row.tortoise.titelbild_url ? (
                  <img className="avatar" src={row.tortoise.titelbild_url} alt="" />
                ) : (
                  <span className="avatar">🐢</span>
                )}
                <span>{row.tortoise.name}</span>
              </div>
              <div className="batch-fields">
                <label className="batch-field">
                  <span className="batch-field-label">{t("gewicht.weightG")}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={row.gewicht}
                    disabled={busy}
                    onChange={(e) => updateRow(i, "gewicht", e.target.value)}
                    aria-label={`${t("gewicht.weightG")} ${row.tortoise.name}`}
                  />
                </label>
                <label className="batch-field">
                  <span className="batch-field-label">{t("gewicht.lengthCm")}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={row.laenge}
                    disabled={busy}
                    onChange={(e) => updateRow(i, "laenge", e.target.value)}
                    aria-label={`${t("gewicht.lengthCm")} ${row.tortoise.name}`}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {err && <p className="danger" style={{ margin: "10px 0 0" }}>{err}</p>}

      <div className="modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>
          {t("action.cancel")}
        </button>
        {rows.length > 0 && (
          <button type="button" className="primary" onClick={handleSave} disabled={busy}>
            {busy ? "…" : t("action.save")}
          </button>
        )}
      </div>
    </Modal>
  );
}
