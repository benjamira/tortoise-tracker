import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api";
import { formatDate, formatWeight } from "../format";
import { useT } from "../i18n";
import type { Tortoise } from "../types";
import Modal from "./Modal";
import TortoiseForm from "./TortoiseForm";

function TierLink({
  tortoise: tt,
  drag,
}: {
  tortoise: Tortoise;
  drag?: {
    onStart: (e: React.DragEvent) => void;
    onEnter: () => void;
    onEnd: () => void;
    active: boolean;
  };
}) {
  const t = useT();
  let sub: string;
  if (tt.archiviert) {
    if (tt.sterbedatum) sub = t("sidebar.died", { date: formatDate(tt.sterbedatum) });
    else if (tt.verkaufsdatum) sub = t("sidebar.sold", { date: formatDate(tt.verkaufsdatum) });
    else sub = t("sidebar.archived");
  } else {
    sub = tt.aktuelles_gewicht_g != null ? formatWeight(tt.aktuelles_gewicht_g) : t("sidebar.noWeight");
  }

  return (
    <NavLink
      to={`/tiere/${tt.id}`}
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
        <span className="drag-handle" title={t("sidebar.dragToSort")}>
          ⠿
        </span>
      )}
      {tt.titelbild_url ? (
        <img className="avatar" src={tt.titelbild_url} alt="" />
      ) : (
        <span className="avatar">🐢</span>
      )}
      <span className="meta">
        <span className="nm">{tt.name}</span>
        <span className="sub">{sub}</span>
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
  const t = useT();
  const [showCreate, setShowCreate] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const archived = tortoises.filter((x) => x.archiviert);

  // Local, reorderable copy of the active tortoises.
  const [order, setOrder] = useState<Tortoise[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    setOrder(tortoises.filter((x) => !x.archiviert));
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
      await api.reorderTortoises(order.map((x) => x.id));
    } catch {
      /* keep local order; a later reload reconciles */
    }
  };

  return (
    <nav className="sidebar">
      <h1>🐢 {t("app.title")}</h1>

      {order.map((tortoise, i) => (
        <TierLink
          key={tortoise.id}
          tortoise={tortoise}
          drag={{
            active: draggingId === tortoise.id,
            onStart: (e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(tortoise.id));
              dragFrom.current = i;
              setDraggingId(tortoise.id);
            },
            onEnter: () => onEnter(i),
            onEnd,
          }}
        />
      ))}

      <button className="tier-item" onClick={() => setShowCreate(true)}>
        <span className="avatar">＋</span>
        <span className="meta">
          <span className="nm">{t("sidebar.addTortoise")}</span>
        </span>
      </button>

      {archived.length > 0 && (
        <div className="archive-block">
          <button className="archive-toggle" onClick={() => setArchiveOpen((v) => !v)}>
            {archiveOpen ? "▾" : "▸"} {t("sidebar.archive")} ({archived.length})
          </button>
          {archiveOpen &&
            archived.map((tortoise) => <TierLink key={tortoise.id} tortoise={tortoise} />)}
        </div>
      )}

      <div className="spacer" />
      <NavLink
        to="/notizen"
        className={({ isActive }) => `tier-item${isActive ? " active" : ""}`}
      >
        <span className="avatar">📝</span>
        <span className="meta">
          <span className="nm">{t("sidebar.notes")}</span>
        </span>
      </NavLink>
      <NavLink
        to="/einstellungen"
        className={({ isActive }) => `tier-item${isActive ? " active" : ""}`}
      >
        <span className="avatar">⚙️</span>
        <span className="meta">
          <span className="nm">{t("sidebar.settings")}</span>
        </span>
      </NavLink>

      {showCreate && (
        <Modal title={t("modal.newTortoise")} onClose={() => setShowCreate(false)}>
          <TortoiseForm
            submitLabel={t("action.create")}
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
