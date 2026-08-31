import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App";
import TortoiseDetail from "./pages/TortoiseDetail";
import Settings from "./pages/Settings";
import { ThemeProvider } from "./theme";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="tiere" replace /> },
      { path: "tiere", element: <TortoiseDetail /> },
      { path: "tiere/:id", element: <TortoiseDetail /> },
      { path: "einstellungen", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
