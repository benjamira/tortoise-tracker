import { useEffect, useState } from "react";
import { api } from "../api";
import { useT } from "../i18n";
import type { Settings } from "../types";

export default function SettingsPage() {
  const t = useT();
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(setS);
  }, []);

  if (!s) return <p className="muted">{t("action.loading")}</p>;

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
    setMsg(t("action.saved"));
  };

  return (
    <div>
      <h2>{t("settings.title")}</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("settings.telegramTitle")}</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("settings.telegramHint")}
        </p>
        <div className="field">
          <label>{t("settings.botToken")}</label>
          <input
            value={s.telegram_bot_token}
            onChange={str("telegram_bot_token")}
            placeholder="123456:ABC-…"
          />
        </div>
        <div className="field">
          <label>{t("settings.chatId")}</label>
          <input value={s.telegram_chat_id} onChange={str("telegram_chat_id")} />
        </div>
        <button
          onClick={async () => {
            setMsg(null);
            try {
              await api.saveSettings(s);
              await api.testTelegram();
              setMsg(t("settings.testSent"));
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        >
          {t("settings.sendTest")}
        </button>
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 0 }}>
          {t("settings.telegramNote")}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("settings.reminderPhotoTitle")}</h3>
        <label>
          <input
            type="checkbox"
            checked={s.reminder_fotodoku_aktiv}
            onChange={bool("reminder_fotodoku_aktiv")}
          />{" "}
          {t("settings.enabled")}
        </label>
        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="field">
            <label>{t("settings.intervalYoung")}</label>
            <input type="number" value={s.foto_intervall_jung_monate} onChange={num("foto_intervall_jung_monate")} />
          </div>
          <div className="field">
            <label>{t("settings.intervalOld")}</label>
            <input type="number" value={s.foto_intervall_alt_monate} onChange={num("foto_intervall_alt_monate")} />
          </div>
          <div className="field">
            <label>{t("settings.ageLimit")}</label>
            <input type="number" value={s.foto_alter_grenze_jahre} onChange={num("foto_alter_grenze_jahre")} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("settings.reminderChipTitle")}</h3>
        <label>
          <input type="checkbox" checked={s.reminder_chip_aktiv} onChange={bool("reminder_chip_aktiv")} />{" "}
          {t("settings.enabled")}
        </label>
        <div className="field" style={{ marginTop: 10, maxWidth: 260 }}>
          <label>{t("settings.weightThreshold")}</label>
          <input type="number" value={s.chip_gewicht_schwelle_g} onChange={num("chip_gewicht_schwelle_g")} />
        </div>
      </div>

      <button className="primary" onClick={save}>
        {t("action.save")}
      </button>
      {msg && <span style={{ marginLeft: 10 }}>{msg}</span>}
    </div>
  );
}
