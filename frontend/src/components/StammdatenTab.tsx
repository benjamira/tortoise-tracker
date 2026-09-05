import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import { useT } from "../i18n";
import type { Attachment, Tortoise } from "../types";
import Modal from "./Modal";
import TortoiseForm from "./TortoiseForm";

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
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [docs, setDocs] = useState<Attachment[]>([]);
  const [pbBusy, setPbBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pbInput = useRef<HTMLInputElement>(null);

  const loadDocs = () => api.listAttachments(tortoise.id, "dokument").then(setDocs);

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tortoise.id]);

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("stammdaten.profilePicture")}</h3>
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
              {pbBusy
                ? t("action.loading")
                : tortoise.titelbild_url
                  ? t("stammdaten.changeImage")
                  : t("stammdaten.uploadImage")}
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
                {t("action.remove")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{t("stammdaten.masterData")}</h3>
          <button onClick={() => setEditing(true)}>{t("action.edit")}</button>
        </div>
        <table>
          <tbody>
            <Row label={t("field.name")} value={tortoise.name} />
            <Row label={t("field.subspecies")} value={tortoise.unterart} />
            <Row label={t("field.sex")} value={t(`sex.${tortoise.geschlecht}`)} />
            <Row label={t("field.hatchDate")} value={tortoise.schlupfdatum ? formatDate(tortoise.schlupfdatum) : ""} />
            <Row label={t("field.acquiredDate")} value={tortoise.erworben_am ? formatDate(tortoise.erworben_am) : ""} />
            <Row label={t("field.deathDate")} value={tortoise.sterbedatum ? formatDate(tortoise.sterbedatum) : ""} />
            <Row label={t("field.saleDate")} value={tortoise.verkaufsdatum ? formatDate(tortoise.verkaufsdatum) : ""} />
            <Row
              label={t("field.status")}
              value={tortoise.archiviert ? t("status.archived") : t("status.active")}
            />
            <Row label={t("field.citesNumber")} value={tortoise.cites_nummer} />
            <Row
              label={t("field.transponderNumber")}
              value={tortoise.transponder_nr || <span className="muted">{t("form.notChipped")}</span>}
            />
            <Row label={t("field.origin")} value={tortoise.herkunft} />
            <Row
              label={t("field.ownBreeding")}
              value={tortoise.eigene_nachzucht ? t("common.yes") : t("common.no")}
            />
            <Row label={t("field.marks")} value={tortoise.kennzeichnung} />
            <Row label={t("field.notes")} value={tortoise.notizen} />
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("stammdaten.documents")}</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("stammdaten.documentsHint")}
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
                {t("action.delete")}
              </button>
            </li>
          ))}
          {docs.length === 0 && <li className="muted">{t("stammdaten.noDocuments")}</li>}
        </ul>
      </div>

      <div className="card">
        <button
          className="danger"
          onClick={async () => {
            if (confirm(t("stammdaten.deleteConfirm", { name: tortoise.name }))) {
              await api.deleteTortoise(tortoise.id);
              onChanged();
            }
          }}
        >
          {t("stammdaten.deleteTortoise")}
        </button>
      </div>

      {editing && (
        <Modal title={t("modal.editTortoise", { name: tortoise.name })} onClose={() => setEditing(false)}>
          <TortoiseForm
            initial={tortoise}
            submitLabel={t("action.save")}
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
