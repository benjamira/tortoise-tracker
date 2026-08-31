import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { api } from "./api";
import type { Tortoise } from "./types";
import Sidebar from "./components/Sidebar";
import ReminderBanner from "./components/ReminderBanner";
import ThemeToggle from "./components/ThemeToggle";

export interface AppContext {
  tortoises: Tortoise[];
  reloadTortoises: () => Promise<void>;
}

export default function App() {
  const [tortoises, setTortoises] = useState<Tortoise[]>([]);
  const navigate = useNavigate();

  const reloadTortoises = useCallback(async () => {
    setTortoises(await api.listTortoises());
  }, []);

  useEffect(() => {
    reloadTortoises();
  }, [reloadTortoises]);

  const context: AppContext = { tortoises, reloadTortoises };

  return (
    <div className="app">
      <ThemeToggle />
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
      <ReminderBanner tortoises={tortoises} />
    </div>
  );
}
