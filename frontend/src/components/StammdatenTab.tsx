import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import type { Attachment, Tortoise } from "../types";
import Modal from "./Modal";
import TortoiseForm from "./TortoiseForm";

const GESCHLECHT_LABEL: Record<string, string> = {
  weiblich: "weiblich",
  maennlich: "männlich",
  unbekannt: "unbekannt",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <th style={{ width: "42%" }}>{label}</th>
      <td>{value || <span className="muted">–</span>}</td>
    </tr>
  );
}

export default function StammdatenTab({
  tortoise,
  onChanged,
}: {
  tortoise: Tortoise;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [docs, setDocs] = useState<Attachment[]>([]);
  const [pbBusy, setPbBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pbInput = useRef<HTMLInputElement>(null);

  const loadDocs = () =>
    api.listAttachments(tortoise.id, "dokument").then(setDocs);

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tortoise.id]);

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Profilbild</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {tortoise.titelbild_url ? (
            <img
              src={tortoise.titelbild_url}
              alt=""
              style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }}
            />
          ) : (
            <span
              style={{ width: 90, height: 90, borderRadius: "50%", background: "var(--avatar-bg)", display: "grid", placeItems: "center", fontSize: "2rem" }}
            >
              🐢
            </span>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              ref={pbInput}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPbBusy(true);
                try {
                  await api.setTitelbild(tortoise.id, f);
                  if (pbInput.current) pbInput.current.value = "";
                  onChanged();
                } finally {
                  setPbBusy(false);
                }
              }}
            />
            <button onClick={() => pbInput.current?.click()} disabled={pbBusy}>
              {pbBusy ? "Lädt …" : tortoise.titelbild_url ? "Bild ändern" : "Bild hochladen"}
            </button>
            {tortoise.titelbild_url && (
              <button
                className="danger"
                disabled={pbBusy}
                onClick={async () => {
                  setPbBusy(true);
                  try {
                    await api.clearTitelbild(tortoise.id);
                    onChanged();
                  } finally {
                    setPbBusy(false);
                  }
                }}
              >
                Entfernen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Stammdaten</h3>
          <button onClick={() => setEditing(true)}>Bearbeiten</button>
        </div>
        <table>
          <tbody>
            <Row label="Name" value={tortoise.name} />
            <Row label="Unterart" value={tortoise.unterart} />
            <Row label="Geschlecht" value={GESCHLECHT_LABEL[tortoise.geschlecht]} />
            <Row label="Schlupfdatum" value={tortoise.schlupfdatum ? formatDate(tortoise.schlupfdatum) : ""} />
            <Row label="Erworben am" value={tortoise.erworben_am ? formatDate(tortoise.erworben_am) : ""} />
            <Row label="Sterbedatum" value={tortoise.sterbedatum ? formatDate(tortoise.sterbedatum) : ""} />
            <Row label="Verkaufsdatum" value={tortoise.verkaufsdatum ? formatDate(tortoise.verkaufsdatum) : ""} />
            <Row
              label="Status"
              value={tortoise.archiviert ? "archiviert" : "aktiv"}
            />
            <Row label="CITES-/EG-Bescheinigungsnummer" value={tortoise.cites_nummer} />
            <Row
              label="Transpondernummer"
              value={tortoise.transponder_nr || <span className="muted">noch nicht gechipt</span>}
            />
            <Row label="Herkunft" value={tortoise.herkunft} />
            <Row label="Weitere Kennzeichen" value={tortoise.kennzeichnung} />
            <Row label="Notizen" value={tortoise.notizen} />
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Dokumente</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          CITES-Bescheinigung, Herkunftsnachweis, Tierarztberichte … (PDF/Bild)
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="application/pdf,image/*"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) {
              await api.uploadAttachments(tortoise.id, files, { art: "dokument" });
              if (fileInput.current) fileInput.current.value = "";
              loadDocs();
            }
          }}
        />
        <ul style={{ marginBottom: 0 }}>
          {docs.map((d) => (
            <li key={d.id}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.originalname}
              </a>{" "}
              <button
                className="link danger"
                onClick={async () => {
                  await api.deleteAttachment(d.id);
                  loadDocs();
                }}
              >
                löschen
              </button>
            </li>
          ))}
          {docs.length === 0 && <li className="muted">Noch keine Dokumente</li>}
        </ul>
      </div>

      <div className="card">
        <button
          className="danger"
          onClick={async () => {
            if (confirm(`${tortoise.name} wirklich löschen? Alle Daten gehen verloren.`)) {
              await api.deleteTortoise(tortoise.id);
              onChanged();
            }
          }}
        >
          Schildkröte löschen
        </button>
      </div>

      {editing && (
        <Modal title={`${tortoise.name} bearbeiten`} onClose={() => setEditing(false)}>
          <TortoiseForm
            initial={tortoise}
            submitLabel="Speichern"
            onCancel={() => setEditing(false)}
            onSubmit={async (data) => {
              await api.updateTortoise(tortoise.id, data);
              setEditing(false);
              onChanged();
            }}
          />
        </Modal>
      )}
    </>
  );
}
