import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import { useT } from "../i18n";
import type { Attachment } from "../types";
import Lightbox from "./Lightbox";

export default function FotosTab({
  tortoiseId,
  onChanged,
}: {
  tortoiseId: number;
  onChanged: () => void;
}) {
  const t = useT();
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [drag, setDrag] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api.listAttachments(tortoiseId, "foto").then((list) => {
        list.sort((a, b) => (a.aufnahme_datum ?? "").localeCompare(b.aufnahme_datum ?? ""));
        setPhotos(list);
      }),
    [tortoiseId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (p: Attachment) => {
    setErr(null);
    setEditId(p.id);
    setEditDate(p.aufnahme_datum ? p.aufnahme_datum.slice(0, 10) : "");
  };

  const saveDate = async (id: number) => {
    if (!editDate) return;
    setErr(null);
    try {
      await api.updateAttachment(id, { aufnahme_datum: editDate });
      setEditId(null);
      await load();
      onChanged();
    } catch (ex) {
      setErr(t("action.saveFailed", { msg: (ex as Error).message }));
    }
  };

  const upload = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setBusy(true);
    try {
      await api.uploadAttachments(tortoiseId, imgs, { art: "foto" });
      await load();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className={`dropzone${drag ? " drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(Array.from(e.dataTransfer.files));
        }}
      >
        {busy ? (
          t("fotos.uploading")
        ) : (
          <>
            {t("fotos.dropPrefix")}
            <label
              style={{ display: "inline", color: "var(--accent-dark)", textDecoration: "underline", cursor: "pointer" }}
            >
              {t("fotos.browse")}
              <input
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={(e) => upload(Array.from(e.target.files ?? []))}
              />
            </label>
            {t("fotos.dropSuffix")}
          </>
        )}
      </div>

      {err && <p className="danger" style={{ marginTop: 12 }}>{err}</p>}

      {photos.length === 0 ? (
        <p className="muted" style={{ marginTop: 20 }}>
          {t("fotos.noPhotos")}
        </p>
      ) : (
        <div className="photo-timeline" style={{ marginTop: 22 }}>
          {photos.map((p, i) => (
            <div className="photo-row" key={p.id}>
              <span className="dot" />
              <img
                src={p.thumbnail_url ?? p.url}
                alt={p.beschriftung ?? ""}
                onClick={() => setLightbox(i)}
              />
              <div>
                {editId === p.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      style={{ width: "auto" }}
                      autoFocus
                    />
                    <button type="button" className="primary" onClick={() => saveDate(p.id)}>
                      {t("action.save")}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}>
                      {t("action.cancel")}
                    </button>
                  </div>
                ) : (
                  <strong>
                    {p.aufnahme_datum ? formatDate(p.aufnahme_datum) : t("fotos.noDate")}{" "}
                    <button
                      type="button"
                      className="link"
                      title={t("fotos.editDate")}
                      onClick={() => startEdit(p)}
                    >
                      {t("action.edit")}
                    </button>
                  </strong>
                )}
                <div className="muted" style={{ fontSize: "0.82rem" }}>
                  {p.originalname}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox != null && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
          onDelete={async (a) => {
            await api.deleteAttachment(a.id);
            setLightbox(null);
            await load();
            onChanged();
          }}
        />
      )}
    </>
  );
}
