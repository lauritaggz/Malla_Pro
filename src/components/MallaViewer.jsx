import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import Curso from "./Curso";

export default function MallaViewer({
  mallaSeleccionada,
  modoExcepcional,
  setExcepcionesActivas,
  onTotalCursosChange,
  onSemestresLoaded,
  onCursandoChange,
  onMallaDataLoaded,
  onAprobadosChange,
  onExcepcionesChange,
  onCursandoArrayChange,
  onAbrirNotas,
}) {
  const [malla, setMalla] = useState(null);
  const [aprobados, setAprobados] = useState(
    JSON.parse(localStorage.getItem("malla-aprobados")) || []
  );
  const [excepciones, setExcepciones] = useState(
    JSON.parse(localStorage.getItem("malla-excepciones")) || []
  );
  const [cursando, setCursando] = useState(
    JSON.parse(localStorage.getItem("malla-cursando")) || []
  );

  // 🔹 Ref y estados para drag horizontal
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(0);

  // ✅ Cargar malla seleccionada
  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(mallaSeleccionada.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const totalSemestres = data.semestres?.length || 0;
        const mallaData = {
          nombre: data.carrera || "Malla sin nombre",
          semestres: data.semestres || [],
          totalSemestres,
        };
        setMalla(mallaData);
        onSemestresLoaded?.(totalSemestres);
        onMallaDataLoaded?.(mallaData);
      } catch (err) {
        console.error("Error al cargar malla:", err);
      }
    }
    cargar();
  }, [mallaSeleccionada, onSemestresLoaded, onMallaDataLoaded]);

  // Debugging logs to verify malla loading
  useEffect(() => {
    console.log("Fetching malla from:", mallaSeleccionada.url);
    console.log("Loaded malla:", malla);
  }, [mallaSeleccionada, malla]);

  // ✅ Guardar en localStorage
  useEffect(() => {
    setExcepcionesActivas(excepciones.length);
    localStorage.setItem("malla-aprobados", JSON.stringify(aprobados));
    localStorage.setItem("malla-excepciones", JSON.stringify(excepciones));
    localStorage.setItem("malla-cursando", JSON.stringify(cursando));

    // Notificar cambio en cursos cursando
    onCursandoChange?.(cursando.length);

    // Notificar arrays completos para el dashboard
    onAprobadosChange?.(aprobados);
    onExcepcionesChange?.(excepciones);
    onCursandoArrayChange?.(cursando);
  }, [
    aprobados,
    excepciones,
    cursando,
    setExcepcionesActivas,
    onCursandoChange,
    onAprobadosChange,
    onExcepcionesChange,
    onCursandoArrayChange,
  ]);

  // ✅ Calcular progreso cada vez que cambia el estado
  useEffect(() => {
    if (!malla?.semestres || !onTotalCursosChange) return;

    const total = malla.semestres.reduce(
      (acc, sem) => acc + sem.cursos.length,
      0
    );

    const aprobadosCount = aprobados.length;

    onTotalCursosChange({ total, aprobados: aprobadosCount });
  }, [malla, aprobados, excepciones, onTotalCursosChange]);

  // ✅ Aprobar o desmarcar ramo
  const aprobar = (id) => {
    if (aprobados.includes(id)) {
      setAprobados(aprobados.filter((a) => a !== id));
    } else {
      // Al aprobar, limpiamos el estado "en curso" si estaba activo
      setAprobados([...aprobados, id]);
      if (cursando.includes(id)) {
        setCursando(cursando.filter((c) => c !== id));
      }
    }
  };

  // ✅ Marcar / desmarcar como excepcional
  const marcarExcepcional = (id) => {
    if (excepciones.includes(id)) {
      setExcepciones(excepciones.filter((e) => e !== id));
      setAprobados(aprobados.filter((a) => a !== id));
    } else {
      setExcepciones([...excepciones, id]);
      if (!aprobados.includes(id)) {
        setAprobados([...aprobados, id]);
      }
      // Si queda aprobado por excepcional, quitamos "en curso" si existía
      if (cursando.includes(id)) {
        setCursando(cursando.filter((c) => c !== id));
      }
    }
  };

  // ✅ En curso (Ctrl + clic)
  const toggleCursando = (id) => {
    if (cursando.includes(id)) {
      setCursando(cursando.filter((c) => c !== id));
    } else {
      setCursando([...cursando, id]);
    }
  };

  // ✅ Aprobar hasta semestre (evento global desde Navbar)
  const aprobarHastaSemestre = (semestreLimite) => {
    if (!malla) return;
    const nuevosAprobados = [];
    malla.semestres.forEach((sem) => {
      if (sem.numero <= semestreLimite) {
        sem.cursos.forEach((curso) => nuevosAprobados.push(curso.id));
      }
    });
    const aprobadosSet = new Set(nuevosAprobados);
    setAprobados([...aprobadosSet]);
    setExcepciones([]);
    // Todos los que pasan a aprobados dejan de estar "en curso"
    setCursando((prev) => prev.filter((id) => !aprobadosSet.has(id)));
  };

  // ✅ Cumple prerrequisitos
  const cumplePrereqs = (curso) => {
    if (!curso.prerrequisitos?.length) return true;
    return curso.prerrequisitos.every(
      (pre) => aprobados.includes(pre) || excepciones.includes(pre)
    );
  };

  // ✅ Escucha evento global (desde Navbar)
  useEffect(() => {
    const handler = (e) => {
      aprobarHastaSemestre(e.detail);
    };
    window.addEventListener("aprobarHastaSemestre", handler);
    return () => window.removeEventListener("aprobarHastaSemestre", handler);
  }, [malla]);

  // ✅ Drag horizontal tipo Trello
  const bind = useDrag(
    ({ first, last, event }) => {
      const el = scrollRef.current;
      if (!el) return;

      if (first) {
        setIsDragging(true);
        setDragMoved(0);
      }

      if (event?.deltaX) {
        el.scrollLeft -= event.deltaX;
        setDragMoved((prev) => prev + Math.abs(event.deltaX));
      }

      if (last) {
        setTimeout(() => setIsDragging(false), 0);
      }
    },
    {
      axis: "x",
      pointer: { touch: true },
      eventOptions: { passive: true },
      preventDefault: false,
    }
  );

  // ✅ Evita clics falsos tras arrastrar
  const handleClickCapture = (e) => {
    if (dragMoved > 3) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (!malla)
    return <p className="text-center text-textSecondary">Cargando malla...</p>;

  // ✅ Render principal
  return (
    <div className="pb-10 px-2 sm:px-4 md:px-6">
      {/* Instrucción desktop: marcar "en curso" */}
      <div className="hidden md:flex items-center justify-center mb-4">
        <span
          className="text-sm text-textSecondary px-4 py-2 rounded-lg bg-bgSecondary/50 
                       border border-borderColor shadow-sm"
        >
          💡 <strong>Ctrl + clic</strong> para marcar como cursando
        </span>
      </div>

      {/* Instrucciones de scroll para móvil */}
      <div className="md:hidden text-center text-textSecondary text-xs mb-3">
        ← Desliza horizontalmente para ver más semestres →
        <br />
        <span className="text-xs mt-1 inline-block">
          Mantén presionado para marcar como cursando
        </span>
      </div>

      {/* Scroll horizontal arrastrable */}
      <div
        ref={scrollRef}
        {...bind()}
        onClickCapture={handleClickCapture}
        className={`overflow-x-auto scroll-container overscroll-x-contain rounded-xl p-6 
              glass-effect-strong shadow-theme-lg backdrop-blur-xl
              bg-gradient-to-br from-bgSecondary/80 to-bgTertiary/50 
              ${
                isDragging ? "dragging" : "cursor-grab"
              } active:cursor-grabbing`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-6 sm:gap-8 md:gap-10 min-w-max py-2 sm:py-3 md:py-4">
          {Array.from({ length: Math.ceil(malla.semestres.length / 2) }).map(
            (_, i) => {
              const year = i + 1;
              const semA = malla.semestres[i * 2];
              const semB = malla.semestres[i * 2 + 1];

              return (
                <motion.div
                  key={year}
                  className="min-w-[320px] sm:min-w-[380px] md:min-w-[460px] flex-shrink-0"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="text-center mb-3 sm:mb-4">
                    <span className="text-xs uppercase tracking-wide text-textSecondary/80">
                      Año
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-primary drop-shadow-[0_1px_0_rgba(255,255,255,0.04)]">
                      {year}
                    </div>
                  </div>

                  <div className="flex gap-4 sm:gap-8">
                    {[semA, semB].map(
                      (sem, idx) =>
                        sem && (
                          <motion.div
                            key={idx}
                            className="flex flex-col gap-2 sm:gap-3 min-w-[160px] sm:min-w-[210px] 
                                       bg-gradient-to-br from-bgSecondary/60 to-bgTertiary/30 
                                       rounded-xl p-3 sm:p-4 border border-borderColor/50 
                                       shadow-theme hover:shadow-theme-lg transition-shadow"
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.1 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                          >
                            {sem.cursos.map((curso) => (
                              <Curso
                                key={curso.id}
                                curso={curso}
                                aprobado={aprobados.includes(curso.id)}
                                excepcional={excepciones.includes(curso.id)}
                                disponible={cumplePrereqs(curso)}
                                modoExcepcional={modoExcepcional}
                                aprobar={() => aprobar(curso.id)}
                                marcarExcepcional={() =>
                                  marcarExcepcional(curso.id)
                                }
                                enCurso={cursando.includes(curso.id)}
                                toggleCursando={() => toggleCursando(curso.id)}
                                onAbrirNotas={onAbrirNotas}
                              />
                            ))}
                          </motion.div>
                        )
                    )}
                  </div>
                </motion.div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
