/**
 * DrawerPanel — wrapper reutilizable para todos los modales tipo drawer.
 * Desktop: desliza desde la derecha.
 * Mobile: panel de pantalla completa desde abajo (slide-up).
 *
 * NOTA: Se usan inline styles para el posicionamiento mobile/desktop
 * porque max-sm: no está disponible en esta versión de Tailwind.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function DrawerPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  width = "max-w-xl",
  children,
}) {
  const isMobile = useIsMobile();

  /* Bloquear scroll del body cuando está abierto */
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  /* Cerrar con Escape */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  /* Animación: mobile desde abajo, desktop desde la derecha */
  const panelInitial    = isMobile ? { y: "100%" } : { x: "100%", opacity: 0 };
  const panelAnimate    = isMobile ? { y: 0 }       : { x: 0, opacity: 1 };
  const panelExit       = isMobile ? { y: "100%" }  : { x: "100%", opacity: 0 };
  const panelTransition = isMobile
    ? { type: "spring", damping: 32, stiffness: 300 }
    : { type: "spring", damping: 30, stiffness: 280 };

  /* Posicionamiento via inline style para evitar conflictos de versión Tailwind */
  const panelStyle = isMobile
    ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "96dvh",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
        zIndex: 85,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }
    : {
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        zIndex: 85,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 84,
              background: isMobile ? "rgba(0,0,0,0.52)" : "rgba(0,0,0,0.18)",
              backdropFilter: isMobile ? "blur(3px)" : "none",
            }}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={panelTransition}
            className={`bg-bgSecondary ${isMobile ? "w-full" : `w-full ${width}`}`}
            style={panelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — solo mobile */}
            {isMobile && (
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--borderColor)" }} />
              </div>
            )}

            {/* Header */}
            <div
              className="border-b border-borderColor"
              style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: isMobile ? "12px 20px" : "20px 24px", flexShrink: 0 }}
            >
              <div>
                <h2 className="text-base font-semibold text-textPrimary" style={{ margin: 0 }}>{title}</h2>
                {subtitle && <p className="text-xs text-textSecondary" style={{ margin: "2px 0 0" }}>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar panel"
                className="text-textSecondary hover:text-textPrimary transition-colors"
                style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "transparent", border: "none", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido — flex-1, cada hijo maneja su propio scroll */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
