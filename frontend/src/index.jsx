import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import initTracing from "./tracing";

// initialize tracing as early as possible for the web app
try {
  initTracing();
} catch (e) {
  console.warn("Tracing init failed", e);
}

import App from "./App.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
