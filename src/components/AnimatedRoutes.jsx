import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import App from "../App";
import { PrivacyPage } from "../pages/PrivacyPage";
import { TermsPage } from "../pages/TermsPage";

export default function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<App />} />
      <Route path="/programacion-academica" element={<App />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
