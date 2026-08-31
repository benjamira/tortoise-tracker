import { useEffect } from "react";
import { formatDate } from "../format";
import type { Attachment } from "../types";

export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  onDelete,
}: {
  photos: Attachment[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
  onDelete?: (a: Attachment) => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) onNavigate(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
        {onDelete && (
          <button className="danger" onClick={() => onDelete(photo)}>
            Löschen
          </button>
        )}
        <button onClick={onClose}>Schließen</button>
      </div>
      {index > 0 && (
        <button
          className="nav prev"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
        >
          ‹
        </button>
      )}
      <img src={photo.url} alt={photo.beschriftung ?? ""} onClick={(e) => e.stopPropagation()} />
      {index < photos.length - 1 && (
        <button
          className="nav next"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
        >
          ›
        </button>
      )}
      <div className="cap">
        {photo.aufnahme_datum ? formatDate(photo.aufnahme_datum) : "ohne Datum"}
        {photo.beschriftung ? ` · ${photo.beschriftung}` : ""}
      </div>
    </div>
  );
}
