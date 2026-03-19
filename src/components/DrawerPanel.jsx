/**
 * DrawerPanel — wrapper reutilizable para todos los modales tipo drawer.
 * Desktop: desliza desde la derecha, sin oscurecer el fondo.
 * Mobile: panel de pantalla completa desde abajo.
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function DrawerPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  width = "max-w-xl",
  children,
}) {
  /* Bloquear scroll del body en mobile cuando está abierto */
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — solo mobile */}
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

          {/* Semi-backdrop desktop — muy sutil */}
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
            /* Desktop: slide desde la derecha */
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className={`
              fixed z-[85] top-0 right-0 h-full ${width} w-full
              flex flex-col
              bg-bgSecondary border-l border-borderColor
              shadow-2xl
            `}
            style={{ boxShadow: "-8px 0 40px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-borderColor flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
