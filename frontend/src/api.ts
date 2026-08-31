import type {
  Attachment,
  Measurement,
  Reminder,
  Settings,
  Tortoise,
  TortoiseEvent,
} from "./types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    headers: init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...init,
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export const api = {
  listTortoises: () => req<Tortoise[]>("/api/tortoises"),
  getTortoise: (id: number) => req<Tortoise>(`/api/tortoises/${id}`),
  createTortoise: (data: Partial<Tortoise>) =>
    req<Tortoise>("/api/tortoises", { method: "POST", body: JSON.stringify(data) }),
  updateTortoise: (id: number, data: Partial<Tortoise>) =>
    req<Tortoise>(`/api/tortoises/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTortoise: (id: number) =>
    req<void>(`/api/tortoises/${id}`, { method: "DELETE" }),
  reorderTortoises: (ids: number[]) =>
    req<{ ok: boolean }>("/api/tortoises/order", {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),

  listMeasurements: (tid: number) =>
    req<Measurement[]>(`/api/tortoises/${tid}/measurements`),
  createMeasurement: (tid: number, data: Partial<Measurement>) =>
    req<Measurement>(`/api/tortoises/${tid}/measurements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteMeasurement: (id: number) =>
    req<void>(`/api/measurements/${id}`, { method: "DELETE" }),

  listEvents: (tid: number) => req<TortoiseEvent[]>(`/api/tortoises/${tid}/events`),
  createEvent: (tid: number, data: Partial<TortoiseEvent>) =>
    req<TortoiseEvent>(`/api/tortoises/${tid}/events`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateEvent: (id: number, data: Partial<TortoiseEvent>) =>
    req<TortoiseEvent>(`/api/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEvent: (id: number) => req<void>(`/api/events/${id}`, { method: "DELETE" }),

  listAttachments: (tid: number, art?: "foto" | "dokument") =>
    req<Attachment[]>(
      `/api/tortoises/${tid}/attachments${art ? `?art=${art}` : ""}`,
    ),
  uploadAttachments: (tid: number, files: File[], opts?: { art?: string; event_id?: number }) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (opts?.art) form.append("art", opts.art);
    if (opts?.event_id != null) form.append("event_id", String(opts.event_id));
    return req<Attachment[]>(`/api/tortoises/${tid}/attachments`, {
      method: "POST",
      body: form,
    });
  },
  setTitelbild: (tid: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<Attachment>(`/api/tortoises/${tid}/titelbild`, {
      method: "PUT",
      body: form,
    });
  },
  clearTitelbild: (tid: number) =>
    req<void>(`/api/tortoises/${tid}/titelbild`, { method: "DELETE" }),

  updateAttachment: (id: number, data: Partial<Attachment>) =>
    req<Attachment>(`/api/attachments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAttachment: (id: number) =>
    req<void>(`/api/attachments/${id}`, { method: "DELETE" }),

  listReminders: () => req<Reminder[]>("/api/reminders"),
  evaluateReminders: () =>
    req<{ neue_reminder: number }>("/api/reminders/evaluate", { method: "POST" }),
  ackReminder: (id: number) =>
    req<unknown>(`/api/reminders/${id}/ack`, { method: "POST" }),
  snoozeReminder: (id: number, tage: number) =>
    req<unknown>(`/api/reminders/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ tage }),
    }),

  getSettings: () => req<Settings>("/api/settings"),
  saveSettings: (data: Partial<Settings>) =>
    req<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
  testTelegram: () =>
    req<{ status: string }>("/api/settings/telegram/test", { method: "POST" }),
};
