import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { api } from "./api";
import { useReminders } from "./reminders";
import type { Tortoise } from "./types";
import Sidebar from "./components/Sidebar";
import ReminderBanner from "./components/ReminderBanner";
import ReminderBell from "./components/ReminderBell";
import ThemeToggle from "./components/ThemeToggle";
import LanguageSelect from "./components/LanguageSelect";

export interface AppContext {
  tortoises: Tortoise[];
  reloadTortoises: () => Promise<void>;
}

export default function App() {
  const [tortoises, setTortoises] = useState<Tortoise[]>([]);
  const navigate = useNavigate();
  const { refresh: refreshReminders } = useReminders();

  const reloadTortoises = useCallback(async () => {
    setTortoises(await api.listTortoises());
    refreshReminders();
  }, [refreshReminders]);

  useEffect(() => {
    reloadTortoises();
  }, [reloadTortoises]);

  const context: AppContext = { tortoises, reloadTortoises };

  return (
    <div className="app">
      <div className="top-controls">
        <LanguageSelect />
        <ThemeToggle />
        <ReminderBell />
      </div>
      <Sidebar
        tortoises={tortoises}
        onCreated={async (t) => {
          await reloadTortoises();
          navigate(`/tiere/${t.id}`);
        }}
      />
      <div className="main">
        <Outlet context={context} />
      </div>
      <ReminderBanner />
    </div>
  );
}
