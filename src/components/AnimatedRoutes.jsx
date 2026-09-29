import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { TermsPage } from "../pages/TermsPage";

// Chunks separados: /portfolio-preview no debe descargar la app completa (PDF, horario, etc.).
const App = lazy(() => import("../App"));
const PortfolioPreviewPage = lazy(() =>
  import("../features/portfolioPreview/PortfolioPreviewPage")
);

const routeFallback = <div className="min-h-screen bg-bgPrimary" aria-busy="true" />;

export default function AnimatedRoutes() {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<App />} />
        <Route path="/programacion-academica" element={<App />} />
        <Route path="/portfolio-preview" element={<PortfolioPreviewPage />} />
        <Route path="/privacidad" element={<PrivacyPage />} />
        <Route path="/terminos" element={<TermsPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Suspense>
  );
}
