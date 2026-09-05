import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App";
import TortoiseDetail from "./pages/TortoiseDetail";
import Settings from "./pages/Settings";
import Notes from "./pages/Notes";
import { ThemeProvider } from "./theme";
import { I18nProvider } from "./i18n";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="tiere" replace /> },
      { path: "tiere", element: <TortoiseDetail /> },
      { path: "tiere/:id", element: <TortoiseDetail /> },
      { path: "notizen", element: <Notes /> },
      { path: "einstellungen", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>,
);
