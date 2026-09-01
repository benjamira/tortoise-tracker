import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import { formatDate, formatWeight, parseWeight } from "../format";
import { useT } from "../i18n";
import { useTheme } from "../theme";
import type { Measurement } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

type Metric = "gewicht_g" | "panzerlaenge_mm" | "jackson_ratio";
const METRIC_KEY: Record<Metric, "gewicht.metricWeight" | "gewicht.metricLength" | "gewicht.metricRatio"> = {
  gewicht_g: "gewicht.metricWeight",
  panzerlaenge_mm: "gewicht.metricLength",
  jackson_ratio: "gewicht.metricRatio",
};

export default function GewichtTab({ tortoiseId, onChanged }: { tortoiseId: number; onChanged: () => void }) {
  const t = useT();
  const [rows, setRows] = useState<Measurement[]>([]);
  const [metric, setMetric] = useState<Metric>("gewicht_g");
  const [datum, setDatum] = useState(today());
  const [gewicht, setGewicht] = useState("");
  const [laenge, setLaenge] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.listMeasurements(tortoiseId).then(setRows);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tortoiseId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const g = parseWeight(gewicht);
    const l = laenge.trim() ? Number(laenge) : null;
    if (g == null && l == null) {
      setErr(t("gewicht.needWeightOrLength"));
      return;
    }
    setBusy(true);
    try {
      await api.createMeasurement(tortoiseId, {
        datum: datum || today(),
        gewicht_g: g,
        panzerlaenge_mm: l,
      });
      setGewicht("");
      setLaenge("");
      setDatum(today());
      await load();
      onChanged();
    } catch (ex) {
      setErr(t("action.saveFailed", { msg: (ex as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  const chartData = rows
    .filter((r) => r[metric] != null)
    .map((r) => ({ datum: r.datum, wert: r[metric] as number }));

  const { theme } = useTheme();
  const palette =
    theme === "dark"
      ? { accent: "#86a961", grid: "#3a3e32", muted: "#9ba18b", panel: "#24271f", ink: "#e7e5da" }
      : { accent: "#5c7a45", grid: "#dcd8cc", muted: "#6b7263", panel: "#ffffff", ink: "#23281f" };

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("gewicht.newMeasurement")}</h3>
        <form className="row" onSubmit={add}>
          <div className="field">
            <label>{t("gewicht.date")}</label>
            <input
              type="date"
              required
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("gewicht.weightG")}</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={gewicht}
              onChange={(e) => setGewicht(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label>{t("gewicht.lengthMm")}</label>
            <input
              type="number"
              inputMode="numeric"
              value={laenge}
              onChange={(e) => setLaenge(e.target.value)}
            />
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "…" : t("action.save")}
          </button>
        </form>
        {err && <p className="danger" style={{ margin: "8px 0 0" }}>{err}</p>}
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {(Object.keys(METRIC_KEY) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              className={metric === m ? "primary" : ""}
              onClick={() => setMetric(m)}
            >
              {t(METRIC_KEY[m])}
            </button>
          ))}
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
              <XAxis
                dataKey="datum"
                fontSize={12}
                tickFormatter={formatDate}
                stroke={palette.muted}
              />
              <YAxis fontSize={12} stroke={palette.muted} />
              <Tooltip
                labelFormatter={(v) => formatDate(String(v))}
                formatter={(v) =>
                  metric === "gewicht_g" ? formatWeight(Number(v)) : String(v)
                }
                contentStyle={{
                  background: palette.panel,
                  border: `1px solid ${palette.grid}`,
                  borderRadius: 8,
                  color: palette.ink,
                }}
              />
              <Line
                type="monotone"
                dataKey="wert"
                name={t(METRIC_KEY[metric])}
                stroke={palette.accent}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">{t("gewicht.needTwoPoints")}</p>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>{t("gewicht.date")}</th>
              <th>{t("gewicht.metricWeight")}</th>
              <th>{t("gewicht.metricLength")}</th>
              <th>{t("gewicht.metricRatio")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.datum)}</td>
                <td>{formatWeight(r.gewicht_g)}</td>
                <td>{r.panzerlaenge_mm != null ? `${r.panzerlaenge_mm} mm` : "–"}</td>
                <td>{r.jackson_ratio ?? "–"}</td>
                <td>
                  <button
                    type="button"
                    className="link danger"
                    onClick={async () => {
                      setErr(null);
                      try {
                        await api.deleteMeasurement(r.id);
                        await load();
                        onChanged();
                      } catch (ex) {
                        setErr(t("action.deleteFailed", { msg: (ex as Error).message }));
                      }
                    }}
                  >
                    {t("action.delete")}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  {t("gewicht.noMeasurements")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
