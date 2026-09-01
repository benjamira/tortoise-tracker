import { de } from "./messages/de";
import { en } from "./messages/en";

export type Lang = "de" | "en";
export type MessageKey = keyof typeof de;
export type Messages = Record<MessageKey, string>;

export const DEFAULT_LANG: Lang = "de";
export const STORAGE_KEY = "lang";

// To add a language: create messages/<code>.ts, add the code to `Lang`,
// import the catalogue here and add one entry to `LOCALES`.
export const LOCALES: Record<Lang, { label: string; messages: Messages }> = {
  de: { label: "Deutsch", messages: de },
  en: { label: "English", messages: en },
};
