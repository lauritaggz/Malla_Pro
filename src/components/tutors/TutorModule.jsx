import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles, X, PlayCircle } from "lucide-react";
import TutorModuleDemo from "./TutorModuleDemo";

export default function TutorModule({ onVolver }) {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return (
      <TutorModuleDemo
        onVolver={onVolver}
        onSalirDemo={() => setShowDemo(false)}
      />
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-[60vh] sm:min-h-[65vh] px-4 pb-28 sm:pb-12 pt-4">
      <button
        type="button"
        onClick={onVolver}
        className="absolute top-3 right-3 sm:top-4 sm:right-6 flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-600 shadow-sm backdrop-blur-sm transition-colors z-10"
        aria-label="Volver a la malla"
      >
        <X className="w-4 h-4" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md text-center rounded-2xl border border-borderColor bg-bgSecondary/80 p-8 sm:p-10 shadow-lg"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          Próximamente
        </span>

        <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
          Tutorías Connect
        </h1>

        <p className="mt-3 text-sm text-textSecondary leading-relaxed">
          Estamos preparando un espacio para conectar con tutores por asignatura, contactar por WhatsApp y compartir experiencias.
        </p>

        <p className="mt-4 text-xs text-textSecondary/70">
          Esta función aún no está disponible. Vuelve pronto.
        </p>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDemo(true)}
          className="mt-6 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:brightness-110 transition-all"
        >
          <PlayCircle className="w-4 h-4" />
          Ver demo
        </motion.button>
      </motion.div>
    </div>
  );
}
