import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, MousePointerClick, BookOpen, Network } from "lucide-react";

export default function OnboardingTour({ isVisible, onClose }) {
  const [step, setStep] = useState(0);

  // Impide el scroll de fondo cuando el tour está abierto y reinicia el paso
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
      setStep(0); // Reiniciar el tour al paso 1 al abrir
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isVisible]);

  const steps = [
    {
      title: "¡Bienvenido a Malla Pro!",
      description: "Gestionar tu carrera nunca había sido tan fácil ni se había visto tan bien. Te daremos un recorrido rápido por las herramientas principales para que domines tu malla.",
      icon: <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />,
    },
    {
      title: "Ver Prerrequisitos y Desbloqueos",
      description: "Haz clic sobre el botón de relaciones PR (icono de conexiones) en la esquina superior derecha de cualquier asignatura. Esto la seleccionará, mostrando visualmente mediante líneas de flujo sus prerrequisitos (Amarillo) y ramos que desbloquea (Verde), sin alterar su estado.",
      icon: <Network className="w-12 h-12 text-amber-500 mx-auto mb-4" />,
    },
    {
      title: "Aprobar un Ramo",
      description: "Haz clic o toca sobre el cuerpo de cualquier ramo para marcarlo o desmarcarlo inmediatamente como Aprobado (Verde). Esto habilitará automáticamente los ramos que dependen de él.",
      icon: <MousePointerClick className="w-12 h-12 text-emerald-500 mx-auto mb-4" />,
    },
    {
      title: "Ramos en Curso",
      description: "Mantén presionada cualquier asignatura (clic largo en PC o pulsación táctil prolongada en móvil) por medio segundo para marcarla como Cursando (Azul).",
      icon: <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
    {
      title: "Calcula tus Notas",
      description: "Haz clic derecho sobre cualquier asignatura (o mantén presionado el botón PR en móvil) para abrir el menú de opciones y seleccionar 'Gestionar notas'. Esto abrirá la calculadora avanzada para ingresar tus evaluaciones y ponderaciones.",
      icon: <span className="text-5xl mx-auto mb-4 block">🧮</span>,
    },
    {
      title: "Promedio en Vivo",
      description: "Al ingresar notas en una asignatura, aparecerá una pequeña insignia en su esquina superior derecha indicando tu promedio actual calculado en tiempo real.",
      icon: <span className="text-5xl mx-auto mb-4 block">📈</span>,
    },
    {
      title: "Tema y Modo Excepcional",
      description: "En la barra superior puedes cambiar el tema visual de la página. También encontrarás el 'Modo Excepcional', el cual te permite forzar aprobaciones de asignaturas saltándote sus prerrequisitos bloqueados.",
      icon: <span className="text-5xl mx-auto mb-4 block">🎨</span>,
    }
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-bgPrimary w-full max-w-md rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-borderColor/50 overflow-hidden relative"
        >
          {/* Progress Indicators */}
          <div className="flex justify-center gap-1.5 pt-6 pb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-borderColor"
                }`}
              />
            ))}
          </div>

          <div className="p-8 sm:p-10 text-center">
            {steps[step].icon}
            
            <motion.h2
              key={`title-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-textPrimary mb-3"
            >
              {steps[step].title}
            </motion.h2>
            
            <motion.p
              key={`desc-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-textSecondary text-[15px] leading-relaxed"
            >
              {steps[step].description}
            </motion.p>
          </div>

          <div className="p-4 sm:p-6 bg-bgSecondary/50 border-t border-borderColor/30 flex justify-between items-center">
            <button
              onClick={onClose}
              className="text-sm font-semibold text-textSecondary hover:text-textPrimary transition-colors px-4 py-2"
            >
              Saltar Tour
            </button>
            
            <button
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(s => s + 1);
                } else {
                  onClose();
                }
              }}
              className="bg-primary text-white font-semibold py-2.5 px-6 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_var(--primary)] shadow-primary/30"
            >
              {step < steps.length - 1 ? "Siguiente" : "¡Comenzar!"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
