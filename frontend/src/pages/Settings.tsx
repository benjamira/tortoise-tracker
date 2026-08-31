import { useEffect, useState } from "react";
import { api } from "../api";
import type { Settings } from "../types";

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(setS);
  }, []);

  if (!s) return <p className="muted">Lädt …</p>;

  const num = (k: keyof Settings) => (e: { target: { value: string } }) =>
    setS({ ...s, [k]: Number(e.target.value) } as Settings);
  const str = (k: keyof Settings) => (e: { target: { value: string } }) =>
    setS({ ...s, [k]: e.target.value } as Settings);
  const bool = (k: keyof Settings) => (e: { target: { checked: boolean } }) =>
    setS({ ...s, [k]: e.target.checked } as Settings);

  const save = async () => {
    setMsg(null);
    const saved = await api.saveSettings(s);
    setS(saved);
    setMsg("Gespeichert.");
  };

  return (
    <div>
      <h2>Einstellungen</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Telegram-Benachrichtigung</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Bot bei @BotFather anlegen, Token unten eintragen. Chat-/Channel-ID des Ziels angeben
          (z.B. eigene numerische ID oder <code>@meinkanal</code>).
        </p>
        <div className="field">
          <label>Bot-Token</label>
          <input
            value={s.telegram_bot_token}
            onChange={str("telegram_bot_token")}
            placeholder="123456:ABC-…"
          />
        </div>
        <div className="field">
          <label>Chat-/Channel-ID</label>
          <input value={s.telegram_chat_id} onChange={str("telegram_chat_id")} />
        </div>
        <button
          onClick={async () => {
            setMsg(null);
            try {
              await api.saveSettings(s);
              await api.testTelegram();
              setMsg("Testnachricht gesendet.");
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        >
          Testnachricht senden
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Erinnerung: Fotodokumentation</h3>
        <label>
          <input
            type="checkbox"
            checked={s.reminder_fotodoku_aktiv}
            onChange={bool("reminder_fotodoku_aktiv")}
          />{" "}
          aktiv
        </label>
        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Intervall bis zur Altersgrenze (Monate)</label>
            <input type="number" value={s.foto_intervall_jung_monate} onChange={num("foto_intervall_jung_monate")} />
          </div>
          <div className="field">
            <label>Intervall danach (Monate)</label>
            <input type="number" value={s.foto_intervall_alt_monate} onChange={num("foto_intervall_alt_monate")} />
          </div>
          <div className="field">
            <label>Altersgrenze (Jahre)</label>
            <input type="number" value={s.foto_alter_grenze_jahre} onChange={num("foto_alter_grenze_jahre")} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Erinnerung: Chip-Kennzeichnung</h3>
        <label>
          <input type="checkbox" checked={s.reminder_chip_aktiv} onChange={bool("reminder_chip_aktiv")} />{" "}
          aktiv
        </label>
        <div className="field" style={{ marginTop: 10, maxWidth: 260 }}>
          <label>Gewichtsschwelle (g)</label>
          <input type="number" value={s.chip_gewicht_schwelle_g} onChange={num("chip_gewicht_schwelle_g")} />
        </div>
      </div>

      <button className="primary" onClick={save}>
        Speichern
      </button>
      {msg && <span style={{ marginLeft: 10 }}>{msg}</span>}
    </div>
  );
}
