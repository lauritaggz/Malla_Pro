import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import App from "../App"; // Tu App REAL donde están las mallas

export default function AnimatedRoutes() {
  return (
    <Routes>
      {/* LANDING */}
      <Route path="/" element={<LandingPage />} />

      {/* APP DE MALLAS */}
      <Route path="/app" element={<App />} />

      {/* RUTA DESCONOCIDA */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
