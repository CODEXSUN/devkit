import React from "react";
import { createRoot } from "react-dom/client";
import { DevkitApp } from "./app";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DevkitApp />
  </React.StrictMode>
);
