// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AnimatedRoutes from "./components/AnimatedRoutes.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("No existe el elemento #root en index.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary context="app-root">
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);