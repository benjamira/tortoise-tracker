import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api";
import { formatDate } from "../format";
import type { Tortoise } from "../types";
import Modal from "./Modal";
import TortoiseForm from "./TortoiseForm";

function subline(t: Tortoise): string {
  if (t.archiviert) {
    if (t.sterbedatum) return `† ${formatDate(t.sterbedatum)}`;
    if (t.verkaufsdatum) return `verkauft ${formatDate(t.verkaufsdatum)}`;
    return "archiviert";
  }
  return t.aktuelles_gewicht_g != null ? `${t.aktuelles_gewicht_g} g` : "kein Gewicht";
}

function TierLink({
  t,
  drag,
}: {
  t: Tortoise;
  drag?: {
    onStart: (e: React.DragEvent) => void;
    onEnter: () => void;
    onEnd: () => void;
    active: boolean;
  };
}) {
  return (
    <NavLink
      to={`/tiere/${t.id}`}
      draggable={!!drag}
      onDragStart={drag?.onStart}
      onDragEnter={drag?.onEnter}
      onDragOver={drag ? (e) => e.preventDefault() : undefined}
      onDragEnd={drag?.onEnd}
      className={({ isActive }) =>
        `tier-item${isActive ? " active" : ""}${drag?.active ? " dragging" : ""}`
      }
    >
      {drag && (
        <span className="drag-handle" title="Zum Sortieren ziehen">
          ⠿
        </span>
      )}
      {t.titelbild_url ? (
        <img className="avatar" src={t.titelbild_url} alt="" />
      ) : (
        <span className="avatar">🐢</span>
      )}
      <span className="meta">
        <span className="nm">{t.name}</span>
        <span className="sub">{subline(t)}</span>
      </span>
    </NavLink>
  );
}

export default function Sidebar({
  tortoises,
  onCreated,
}: {
  tortoises: Tortoise[];
  onCreated: (t: Tortoise) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const archived = tortoises.filter((t) => t.archiviert);

  // Local, reorderable copy of the active tortoises.
  const [order, setOrder] = useState<Tortoise[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    setOrder(tortoises.filter((t) => !t.archiviert));
  }, [tortoises]);

  const onEnter = (index: number) => {
    const from = dragFrom.current;
    if (from === null || from === index) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragFrom.current = index;
  };

  const onEnd = async () => {
    dragFrom.current = null;
    setDraggingId(null);
    try {
      await api.reorderTortoises(order.map((t) => t.id));
    } catch {
      /* keep local order; a later reload reconciles */
    }
  };

  return (
    <nav className="sidebar">
      <h1>🐢 Schildkröten-Doku</h1>

      {order.map((t, i) => (
        <TierLink
          key={t.id}
          t={t}
          drag={{
            active: draggingId === t.id,
            onStart: (e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(t.id));
              dragFrom.current = i;
              setDraggingId(t.id);
            },
            onEnter: () => onEnter(i),
            onEnd,
          }}
        />
      ))}

      <button className="tier-item" onClick={() => setShowCreate(true)}>
        <span className="avatar">＋</span>
        <span className="meta">
          <span className="nm">Schildkröte hinzufügen</span>
        </span>
      </button>

      {archived.length > 0 && (
        <div className="archive-block">
          <button className="archive-toggle" onClick={() => setArchiveOpen((v) => !v)}>
            {archiveOpen ? "▾" : "▸"} Archiv ({archived.length})
          </button>
          {archiveOpen && archived.map((t) => <TierLink key={t.id} t={t} />)}
        </div>
      )}

      <div className="spacer" />
      <NavLink
        to="/einstellungen"
        className={({ isActive }) => `tier-item${isActive ? " active" : ""}`}
      >
        <span className="avatar">⚙️</span>
        <span className="meta">
          <span className="nm">Einstellungen</span>
        </span>
      </NavLink>

      {showCreate && (
        <Modal title="Neue Schildkröte" onClose={() => setShowCreate(false)}>
          <TortoiseForm
            submitLabel="Anlegen"
            onCancel={() => setShowCreate(false)}
            onSubmit={async (data) => {
              const created = await api.createTortoise(data);
              setShowCreate(false);
              onCreated(created);
            }}
          />
        </Modal>
      )}
    </nav>
  );
}
