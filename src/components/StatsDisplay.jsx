import { motion } from "framer-motion";

export default function StatsDisplay({
  totalCursos,
  cursosAprobados,
  cursosCursando,
}) {
  const porcentajeAprobados =
    totalCursos > 0 ? Math.round((cursosAprobados / totalCursos) * 100) : 0;

  const porcentajeCursando =
    totalCursos > 0 ? Math.round((cursosCursando / totalCursos) * 100) : 0;

  // Variantes para animaciones suaves
  const cardAnimation = {
    initial: { opacity: 0, y: 10, scale: 0.97 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 140,
        damping: 18,
        mass: 0.8,
      },
    },
    whileHover: {
      scale: 1.05,
      transition: { type: "spring", stiffness: 300, damping: 15 },
    },
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-3">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
        {/* ===== APROBADOS ===== */}
        <motion.div
          variants={cardAnimation}
          initial="initial"
          animate="animate"
          whileHover="whileHover"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/90 
                     backdrop-blur-md border border-emerald-400/30 shadow-theme 
                     transition-all will-change-transform"
        >
          <div className="w-3 h-3 rounded-full bg-white/90"></div>
          <div className="flex flex-col leading-tight">
            <span className="text-white text-xs font-medium opacity-90">
              Aprobados
            </span>
            <motion.span
              key={cursosAprobados}
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              className="text-white text-lg font-bold"
            >
              {cursosAprobados}{" "}
              <span className="text-sm font-normal opacity-80">
                ({porcentajeAprobados}%)
              </span>
            </motion.span>
          </div>
        </motion.div>

        {/* ===== EN CURSO ===== */}
        <motion.div
          variants={cardAnimation}
          initial="initial"
          animate="animate"
          whileHover="whileHover"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/90 
                     backdrop-blur-md border border-blue-400/30 shadow-theme 
                     transition-all will-change-transform"
        >
          <div className="w-3 h-3 rounded-full bg-white/90"></div>
          <div className="flex flex-col leading-tight">
            <span className="text-white text-xs font-medium opacity-90">
              En Curso
            </span>
            <motion.span
              key={cursosCursando}
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              className="text-white text-lg font-bold"
            >
              {cursosCursando}{" "}
              <span className="text-sm font-normal opacity-80">
                ({porcentajeCursando}%)
              </span>
            </motion.span>
          </div>
        </motion.div>

        {/* ===== TOTAL ===== */}
        <motion.div
          variants={cardAnimation}
          initial="initial"
          animate="animate"
          whileHover="whileHover"
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card 
                     border border-borderColor shadow-theme transition-all 
                     backdrop-blur-lg will-change-transform"
        >
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <div className="flex flex-col leading-tight">
            <span className="text-textSecondary text-xs font-medium">
              Total
            </span>
            <motion.span
              key={totalCursos}
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              className="text-textPrimary text-lg font-bold"
            >
              {totalCursos}
            </motion.span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
