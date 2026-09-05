import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import Modal from "./Modal";

const VIEWPORT = 280; // px
const OUTPUT = 600; // px – stored square image
const MAX_ZOOM = 4;

type Pos = { x: number; y: number };

export default function ProfilePictureEditor({
  file,
  onCancel,
  onSave,
}: {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
}) {
  const t = useT();
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<Pos | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // Size of the image at zoom 1 so that it just covers the round viewport.
  const base = nat
    ? (() => {
        const s = Math.max(VIEWPORT / nat.w, VIEWPORT / nat.h);
        return { w: nat.w * s, h: nat.h * s };
      })()
    : null;

  const clamp = (x: number, y: number, w: number, h: number): Pos => ({
    x: Math.min(0, Math.max(VIEWPORT - w, x)),
    y: Math.min(0, Math.max(VIEWPORT - h, y)),
  });

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const s = Math.max(VIEWPORT / w, VIEWPORT / h);
    setNat({ w, h });
    setZoom(1);
    setPos({ x: (VIEWPORT - w * s) / 2, y: (VIEWPORT - h * s) / 2 });
  };

  const changeZoom = (next: number) => {
    if (!base) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    setPos((p) => {
      const oldW = base.w * zoom;
      const oldH = base.h * zoom;
      const newW = base.w * z;
      const newH = base.h * z;
      const cx = (VIEWPORT / 2 - p.x) / oldW;
      const cy = (VIEWPORT / 2 - p.y) / oldH;
      return clamp(VIEWPORT / 2 - cx * newW, VIEWPORT / 2 - cy * newH, newW, newH);
    });
    setZoom(z);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !base) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setPos((p) => clamp(p.x + dx, p.y + dy, base.w * zoom, base.h * zoom));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const save = async () => {
    const img = imgRef.current;
    if (!base || !img) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const k = OUTPUT / VIEWPORT;
      ctx.drawImage(img, pos.x * k, pos.y * k, base.w * zoom * k, base.h * zoom * k);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.9),
      );
      if (blob) await onSave(blob);
    } finally {
      setBusy(false);
    }
  };

  const w = base ? base.w * zoom : VIEWPORT;
  const h = base ? base.h * zoom : VIEWPORT;

  return (
    <Modal title={t("profilePicture.editTitle")} onClose={onCancel}>
      <div
        className="pp-viewport"
        style={{ width: VIEWPORT, height: VIEWPORT }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <img
          ref={imgRef}
          src={url}
          alt=""
          draggable={false}
          onLoad={onImgLoad}
          style={{ position: "absolute", left: pos.x, top: pos.y, width: w, height: h }}
        />
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>{t("profilePicture.zoom")}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => changeZoom(zoom - 0.25)} aria-label="−">
            −
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={() => changeZoom(zoom + 0.25)} aria-label="+">
            +
          </button>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" onClick={onCancel}>
          {t("action.cancel")}
        </button>
        <button type="button" className="primary" disabled={busy || !base} onClick={save}>
          {busy ? "…" : t("action.save")}
        </button>
      </div>
    </Modal>
  );
}
