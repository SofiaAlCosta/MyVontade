import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { installApiClient } from "./utils/apiClient";
import "./index.css";

installApiClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
