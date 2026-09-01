import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import type { AppContext } from "../App";
import { api } from "../api";
import { formatDate } from "../format";
import { useT } from "../i18n";
import type { Tortoise } from "../types";
import StammdatenTab from "../components/StammdatenTab";
import GewichtTab from "../components/GewichtTab";
import FotosTab from "../components/FotosTab";
import TimelineTab from "../components/TimelineTab";

const TABS = ["stammdaten", "gewicht", "fotos", "timeline"] as const;
type TabKey = (typeof TABS)[number];

export default function TortoiseDetail() {
  const t = useT();
  const { id } = useParams();
  const { tortoises, reloadTortoises } = useOutletContext<AppContext>();
  const [tab, setTab] = useState<TabKey>("stammdaten");
  const [tortoise, setTortoise] = useState<Tortoise | null>(null);

  const reload = async () => {
    if (id) setTortoise(await api.getTortoise(Number(id)));
    await reloadTortoises();
  };

  useEffect(() => {
    setTortoise(null);
    if (id) api.getTortoise(Number(id)).then(setTortoise).catch(() => setTortoise(null));
  }, [id]);

  if (!id) {
    return (
      <div className="card">
        <h2>{t("detail.welcome")}</h2>
        <p className="muted">
          {tortoises.length ? t("detail.selectHint") : t("detail.createHint")}
        </p>
      </div>
    );
  }

  if (!tortoise) return <p className="muted">{t("action.loading")}</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {tortoise.titelbild_url ? (
          <img
            src={tortoise.titelbild_url}
            alt=""
            style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }}
          />
        ) : (
          <span
            style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--avatar-bg)", display: "grid", placeItems: "center", fontSize: "1.5rem" }}
          >
            🐢
          </span>
        )}
        <div>
          <h2 style={{ margin: "0 0 2px" }}>
            {tortoise.name}
            {tortoise.archiviert && (
              <span className="pill" style={{ marginLeft: 10, verticalAlign: "middle" }}>
                {t("status.archived")}
              </span>
            )}
          </h2>
          <div className="muted">
            {tortoise.unterart ?? t("detail.subspeciesUnknown")}
            {tortoise.schlupfdatum
              ? ` · ${t("detail.hatched", { date: formatDate(tortoise.schlupfdatum) })}`
              : ""}
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((k) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {t(`tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === "stammdaten" && <StammdatenTab tortoise={tortoise} onChanged={reload} />}
      {tab === "gewicht" && <GewichtTab tortoiseId={tortoise.id} onChanged={reload} />}
      {tab === "fotos" && <FotosTab tortoiseId={tortoise.id} onChanged={reload} />}
      {tab === "timeline" && <TimelineTab tortoiseId={tortoise.id} />}
    </div>
  );
}
