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
import { formatDate } from "../format";
import { useTheme } from "../theme";
import type { Measurement } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

type Metric = "gewicht_g" | "panzerlaenge_mm" | "jackson_ratio";
const METRIC_LABEL: Record<Metric, string> = {
  gewicht_g: "Gewicht (g)",
  panzerlaenge_mm: "Panzerlänge (mm)",
  jackson_ratio: "Jackson-Ratio",
};

export default function GewichtTab({ tortoiseId, onChanged }: { tortoiseId: number; onChanged: () => void }) {
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
    if (!gewicht && !laenge) {
      setErr("Bitte Gewicht oder Panzerlänge eingeben.");
      return;
    }
    setBusy(true);
    try {
      await api.createMeasurement(tortoiseId, {
        datum: datum || today(),
        gewicht_g: gewicht ? Number(gewicht) : null,
        panzerlaenge_mm: laenge ? Number(laenge) : null,
      });
      setGewicht("");
      setLaenge("");
      setDatum(today());
      await load();
      onChanged();
    } catch (ex) {
      setErr(`Speichern fehlgeschlagen: ${(ex as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const chartData = rows
    .filter((r) => r[metric] != null)
    .map((r) => ({ datum: r.datum, wert: r[metric] as number }));

  const { theme } = useTheme();
  // Chart colours mirror the CSS palette (kept here so the SVG updates on toggle).
  const palette =
    theme === "dark"
      ? { accent: "#86a961", grid: "#3a3e32", muted: "#9ba18b", panel: "#24271f", ink: "#e7e5da" }
      : { accent: "#5c7a45", grid: "#dcd8cc", muted: "#6b7263", panel: "#ffffff", ink: "#23281f" };

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Neue Messung</h3>
        <form className="row" onSubmit={add}>
          <div className="field">
            <label>Datum</label>
            <input
              type="date"
              required
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Gewicht (g)</label>
            <input
              type="number"
              inputMode="numeric"
              value={gewicht}
              onChange={(e) => setGewicht(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label>Panzerlänge (mm)</label>
            <input
              type="number"
              inputMode="numeric"
              value={laenge}
              onChange={(e) => setLaenge(e.target.value)}
            />
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "…" : "Speichern"}
          </button>
        </form>
        {err && <p className="danger" style={{ margin: "8px 0 0" }}>{err}</p>}
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              className={metric === m ? "primary" : ""}
              onClick={() => setMetric(m)}
            >
              {METRIC_LABEL[m]}
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
                name={METRIC_LABEL[metric]}
                stroke={palette.accent}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">Mindestens zwei Messwerte für den Graphen nötig.</p>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Gewicht</th>
              <th>Panzerlänge</th>
              <th>Jackson-Ratio</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.datum)}</td>
                <td>{r.gewicht_g != null ? `${r.gewicht_g} g` : "–"}</td>
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
                        setErr(`Löschen fehlgeschlagen: ${(ex as Error).message}`);
                      }
                    }}
                  >
                    löschen
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Noch keine Messungen
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
