import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./lib/icons";
import "./styles/global.css";
import "./styles/projects.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
