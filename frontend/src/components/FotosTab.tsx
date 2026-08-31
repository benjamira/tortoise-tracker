import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import type { Attachment } from "../types";
import Lightbox from "./Lightbox";

export default function FotosTab({
  tortoiseId,
  onChanged,
}: {
  tortoiseId: number;
  onChanged: () => void;
}) {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [drag, setDrag] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

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
          "Lädt hoch …"
        ) : (
          <>
            Fotos hierher ziehen oder{" "}
            <label
              style={{ display: "inline", color: "var(--accent-dark)", textDecoration: "underline", cursor: "pointer" }}
            >
              auswählen
              <input
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={(e) => upload(Array.from(e.target.files ?? []))}
              />
            </label>
            . Das Aufnahmedatum wird aus den EXIF-Daten übernommen.
          </>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="muted" style={{ marginTop: 20 }}>
          Noch keine Fotos in der Dokumentation.
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
                <strong>{p.aufnahme_datum ? formatDate(p.aufnahme_datum) : "ohne Datum"}</strong>
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
