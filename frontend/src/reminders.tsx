import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { Reminder } from "./types";

interface RemindersCtx {
  reminders: Reminder[];
  refresh: () => Promise<void>;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const Ctx = createContext<RemindersCtx | null>(null);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const seen = useRef<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    try {
      await api.evaluateReminders();
      const list = await api.listReminders();
      setReminders(list);
      const hasNewActive = list.some((r) => !r.snoozed && !seen.current.has(r.id));
      seen.current = new Set(list.map((r) => r.id));
      // Auto-open the panel when a not-yet-seen active reminder shows up.
      // Otherwise leave it to the user (the bell stays visible either way).
      if (hasNewActive) setPanelOpen(true);
    } catch {
      /* offline / backend not ready */
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <Ctx.Provider value={{ reminders, refresh, panelOpen, setPanelOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export function useReminders(): RemindersCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReminders must be used within <RemindersProvider>");
  return ctx;
}
