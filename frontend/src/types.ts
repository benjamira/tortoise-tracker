export type Geschlecht = "maennlich" | "weiblich" | "unbekannt";

export interface Tortoise {
  id: number;
  name: string;
  unterart: string | null;
  schlupfdatum: string | null;
  geschlecht: Geschlecht;
  herkunft: string | null;
  cites_nummer: string | null;
  transponder_nr: string | null;
  kennzeichnung: string | null;
  erworben_am: string | null;
  sterbedatum: string | null;
  verkaufsdatum: string | null;
  archiviert: boolean;
  sortierung: number;
  titelbild_id: number | null;
  notizen: string | null;
  created_at: string;
  aktuelles_gewicht_g?: number | null;
  titelbild_url?: string | null;
}

export interface Measurement {
  id: number;
  tortoise_id: number;
  datum: string;
  gewicht_g: number | null;
  panzerlaenge_mm: number | null;
  notiz: string | null;
  jackson_ratio: number | null;
}

export type EventTyp =
  | "einwinterung"
  | "auswinterung"
  | "tierarzt"
  | "medikation"
  | "sonstiges";

export interface Attachment {
  id: number;
  tortoise_id: number;
  event_id: number | null;
  art: "foto" | "dokument";
  dateiname: string;
  originalname: string;
  mime: string;
  groesse_bytes: number;
  beschriftung: string | null;
  aufnahme_datum: string | null;
  hochgeladen_am: string;
  url: string;
  thumbnail_url: string | null;
}

export interface TortoiseEvent {
  id: number;
  tortoise_id: number;
  datum: string;
  typ: EventTyp;
  text: string;
  created_at: string;
  attachments: Attachment[];
}

export interface ReminderContext {
  letzte_doku?: string | null;
  intervall_monate?: number;
  gewicht_g?: number | null;
  schwelle_g?: number;
}

export interface Reminder {
  id: number;
  tortoise_id: number;
  typ: "fotodokumentation" | "chip";
  faellig_seit: string;
  status: string;
  tier_name: string | null;
  text: string;
  context: ReminderContext;
}

export interface Settings {
  telegram_bot_token: string;
  telegram_chat_id: string;
  foto_intervall_jung_monate: number;
  foto_intervall_alt_monate: number;
  foto_alter_grenze_jahre: number;
  chip_gewicht_schwelle_g: number;
  reminder_fotodoku_aktiv: boolean;
  reminder_chip_aktiv: boolean;
}
