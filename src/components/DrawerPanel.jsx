/**
 * DrawerPanel — wrapper reutilizable para paneles superpuestos.
 * variant="drawer" (default): desktop desde la derecha; móvil bottom-sheet.
 * variant="modal": panel centrado (desktop y móvil).
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    let lastWidth = window.innerWidth;
    const handler = () => {
      const w = window.innerWidth;
      if (w !== lastWidth) {
        lastWidth = w;
        setIsMobile(w < 640);
      }
    };
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
  variant = "drawer",
  children,
}) {
  const isMobile = useIsMobile();
  const isModal = variant === "modal";

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (typeof document === "undefined" || !document.body) return null;

  const drawerInitial = isMobile ? { y: "100%" } : { x: "100%", opacity: 0 };
  const drawerAnimate = isMobile ? { y: 0 } : { x: 0, opacity: 1 };
  const drawerExit = isMobile ? { y: "100%" } : { x: "100%", opacity: 0 };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 95,
              background: isModal || isMobile ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.18)",
              backdropFilter: isModal || isMobile ? "blur(4px)" : "none",
            }}
          />

          {isModal ? (
            <motion.div
              key="modal-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "max(12px, env(safe-area-inset-top)) 16px max(12px, env(safe-area-inset-bottom))",
                pointerEvents: "none",
              }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ type: "spring", damping: 28, stiffness: 340 }}
                className="bg-bgSecondary border border-borderColor w-full"
                style={{
                  pointerEvents: "auto",
                  width: "min(100%, 40rem)",
                  maxHeight: "min(90dvh, 820px)",
                  borderRadius: 16,
                  boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="border-b border-borderColor shrink-0"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "14px 18px",
                  }}
                >
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-textPrimary m-0 truncate">{title}</h2>
                    {subtitle && (
                      <p className="text-xs text-textSecondary m-0 mt-0.5">{subtitle}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="text-textSecondary hover:text-textPrimary transition-colors shrink-0 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-bgPrimary border-0 bg-transparent cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  {children}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="panel"
              initial={drawerInitial}
              animate={drawerAnimate}
              exit={drawerExit}
              transition={
                isMobile
                  ? { type: "spring", damping: 32, stiffness: 300 }
                  : { type: "spring", damping: 30, stiffness: 280 }
              }
              className={`bg-bgSecondary border border-borderColor ${
                isMobile ? "w-full" : `w-full ${width}`
              }`}
              style={
                isMobile
                  ? {
                      position: "fixed",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "88dvh",
                      maxHeight: "100dvh",
                      borderRadius: "16px 16px 0 0",
                      boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
                      zIndex: 96,
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
                      zIndex: 96,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }
              }
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={(e) => e.stopPropagation()}
            >
              {isMobile && (
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
                  <div
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 99,
                      background: "var(--borderColor)",
                    }}
                  />
                </div>
              )}

              <div
                className="border-b border-borderColor shrink-0"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: isMobile ? "14px 18px" : "20px 24px",
                }}
              >
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-textPrimary m-0 truncate">{title}</h2>
                  {subtitle && (
                    <p className="text-xs text-textSecondary m-0 mt-0.5">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  className="text-textSecondary hover:text-textPrimary transition-colors shrink-0 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-bgPrimary border-0 bg-transparent cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : 0,
                }}
              >
                {children}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
