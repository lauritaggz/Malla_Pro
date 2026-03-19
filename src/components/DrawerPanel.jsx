/**
 * DrawerPanel — wrapper reutilizable para todos los modales tipo drawer.
 * Desktop: desliza desde la derecha, sin oscurecer el fondo.
 * Mobile: panel de pantalla completa desde abajo.
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

  const panelInitial  = isMobile ? { y: "100%", opacity: 1 }   : { x: "100%", opacity: 0 };
  const panelAnimate  = isMobile ? { y: 0, opacity: 1 }         : { x: 0, opacity: 1 };
  const panelExit     = isMobile ? { y: "100%", opacity: 1 }    : { x: "100%", opacity: 0 };
  const panelTransition = isMobile
    ? { type: "spring", damping: 32, stiffness: 300 }
    : { type: "spring", damping: 30, stiffness: 280 };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop mobile */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[84] sm:hidden"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Backdrop desktop — muy sutil */}
          <motion.div
            key="backdrop-desk"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[84] hidden sm:block"
            style={{ background: "rgba(0,0,0,0.15)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={panelTransition}
            className={`
              fixed z-[85] bg-bgSecondary shadow-2xl
              sm:top-0 sm:right-0 sm:h-full sm:border-l sm:border-borderColor sm:flex sm:flex-col
              ${width} w-full
              max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:rounded-t-2xl max-sm:max-h-[96vh]
              sm:flex-col flex flex-col
            `}
            style={{ boxShadow: isMobile ? "0 -8px 40px rgba(0,0,0,0.18)" : "-8px 0 40px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — solo mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-borderColor" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 sm:py-5 border-b border-borderColor flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-textPrimary tracking-tight">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-textSecondary mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar panel"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-borderColor/40 transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
