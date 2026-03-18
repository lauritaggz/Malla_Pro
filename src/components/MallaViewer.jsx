import React, { useEffect, useRef, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import Curso from "./Curso";

const MallaViewer = ({
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
  ocultarCompletados,
  setOcultarCompletados
}) => {
  const [malla, setMalla] = useState(null);
  const [mencionActiva, setMencionActiva] = useState(null);

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
  const dragMovedRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // ✅ Cargar malla seleccionada
  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(mallaSeleccionada.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const isMencion = !!data.menciones;
        const mencionesDisponibles = data.menciones_disponibles || [];
        const totalSemestres = data.totalSemestres || data.semestres?.length || 0;

        const mallaData = {
          nombre: data.carrera || "Malla sin nombre",
          semestres: data.semestres || [],
          semestresComunes: data.semestres_comunes || [],
          menciones: data.menciones || {},
          isMencion,
          mencionesDisponibles,
          totalSemestres,
        };
        
        setMalla(mallaData);

        // Inicializar mención activa si aplica
        if (isMencion) {
          const savedMencion = localStorage.getItem(`malla-mencion-${data.carrera}`);
          if (savedMencion && mencionesDisponibles.some(m => m.codigo === savedMencion)) {
            setMencionActiva(savedMencion);
          } else if (mencionesDisponibles.length > 0) {
            setMencionActiva(mencionesDisponibles[0].codigo);
          }
        } else {
          setMencionActiva(null);
        }

        onSemestresLoaded?.(totalSemestres);
        onMallaDataLoaded?.(mallaData);

        // Auto-aprobar ramos conservados de la malla anterior al cambiar
        const conservadosJson = localStorage.getItem("malla-nombres-conservados");
        if (conservadosJson) {
          const nombresConservados = JSON.parse(conservadosJson);
          const idsAprobados = [];
          
          const checkCurso = (curso) => {
            if (nombresConservados.includes(curso.nombre.trim().toLowerCase())) {
              idsAprobados.push(curso.id);
            }
          };

          if (isMencion) {
            mallaData.semestresComunes.forEach(sem => sem.cursos.forEach(checkCurso));
            Object.values(mallaData.menciones).forEach(m => {
              m.semestres.forEach(sem => sem.cursos.forEach(checkCurso));
            });
          } else {
            mallaData.semestres.forEach(sem => sem.cursos.forEach(checkCurso));
          }
          
          if (idsAprobados.length > 0) {
            setAprobados((prev) => {
              const nuevos = new Set([...prev, ...idsAprobados]);
              return Array.from(nuevos);
            });
          }
          // Limpiar el guardado temporal para no activarlo accidentalmente en otro momento
          localStorage.removeItem("malla-nombres-conservados");
        }
      } catch (err) {
        console.error("Error al cargar malla:", err);
      }
    }
    cargar();
  }, [mallaSeleccionada, onSemestresLoaded, onMallaDataLoaded]);

  // Guardar Mencion Activa
  useEffect(() => {
    if (mencionActiva && malla) {
      localStorage.setItem(`malla-mencion-${malla.nombre}`, mencionActiva);
    }
  }, [mencionActiva, malla]);

  // ✅ Persistencia del Scroll
  const handleScroll = () => {
    if (scrollRef.current && malla) {
      localStorage.setItem(`malla-scroll-${malla.nombre}`, scrollRef.current.scrollLeft);
    }
  };

  useEffect(() => {
    if (malla && scrollRef.current) {
      const savedScroll = localStorage.getItem(`malla-scroll-${malla.nombre}`);
      if (savedScroll) {
        scrollRef.current.scrollLeft = parseFloat(savedScroll);
      }
    }
  }, [malla]);

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
    if (!malla || !onTotalCursosChange) return;

    let total = 0;
    const activeIds = new Set();

    if (!malla.isMencion) {
      malla.semestres.forEach((sem) => {
        total += sem.cursos.length;
        sem.cursos.forEach((c) => activeIds.add(c.id));
      });
    } else {
      malla.semestresComunes.forEach((sem) => {
        total += sem.cursos.length;
        sem.cursos.forEach((c) => activeIds.add(c.id));
      });

      if (mencionActiva && malla.menciones[mencionActiva]) {
        malla.menciones[mencionActiva].semestres.forEach((sem) => {
          total += sem.cursos.length;
          sem.cursos.forEach((c) => activeIds.add(c.id));
        });
      }
    }

    const aprobadosCount = aprobados.filter((id) => activeIds.has(id)).length;

    onTotalCursosChange({ total, aprobados: aprobadosCount });
  }, [malla, aprobados, excepciones, mencionActiva, onTotalCursosChange]);

  // ✅ Obtener todos los hijos (ramos que dependen de este) de forma recursiva
  const getDescendientes = (id, todasLasMallas) => {
    const hijos = todasLasMallas.filter(c => c.prerrequisitos?.includes(id));
    let descendientes = [...hijos.map(h => h.id)];
    hijos.forEach(h => {
      descendientes = [...descendientes, ...getDescendientes(h.id, todasLasMallas)];
    });
    return Array.from(new Set(descendientes));
  };

  // ✅ Aprobar o desmarcar ramo
  const aprobar = (id) => {
    setAprobados((prevAprobados) => {
      if (prevAprobados.includes(id)) {
        // Si estamos desmarcando, buscamos todos los que dependen de este
        const todosLosCursos = [];
        if (!malla.isMencion) {
          malla.semestres.forEach(s => todosLosCursos.push(...s.cursos));
        } else {
          malla.semestresComunes.forEach(s => todosLosCursos.push(...s.cursos));
          Object.values(malla.menciones).forEach(m => {
            m.semestres.forEach(s => todosLosCursos.push(...s.cursos));
          });
        }
        
        const aEliminar = getDescendientes(id, todosLosCursos);
        return prevAprobados.filter((a) => a !== id && !aEliminar.includes(a));
      } else {
        return [...prevAprobados, id];
      }
    });
    
    // Al aprobar, limpiamos el estado "en curso" si estaba activo
    setCursando((prevCursando) => {
      if (prevCursando.includes(id)) {
        return prevCursando.filter((c) => c !== id);
      }
      return prevCursando;
    });
  };

  // ✅ Marcar / desmarcar como excepcional
  const marcarExcepcional = (id) => {
    // Capturar la decisión ANTES de cualquier setState para evitar stale closures
    const isRemoving = excepciones.includes(id);

    setExcepciones((prev) =>
      isRemoving ? prev.filter((e) => e !== id) : [...prev, id]
    );

    setAprobados((prev) => {
      if (isRemoving) return prev.filter((a) => a !== id);
      if (!prev.includes(id)) return [...prev, id];
      return prev;
    });

    // Si se activa la excepción, quitar "en curso" si existía
    setCursando((prev) => {
      if (!isRemoving && prev.includes(id)) return prev.filter((c) => c !== id);
      return prev;
    });
  };

  // ✅ En curso (Ctrl + clic)
  const toggleCursando = (id) => {
    setCursando((prevCursando) => {
      if (prevCursando.includes(id)) {
        return prevCursando.filter((c) => c !== id);
      } else {
        return [...prevCursando, id];
      }
    });
  };

  // ✅ Aprobar hasta semestre (evento global desde Navbar)
  const aprobarHastaSemestre = (semestreLimite) => {
    if (!malla) return;
    const nuevosAprobados = [];
    
    if (!malla.isMencion) {
      malla.semestres.forEach((sem) => {
        if (sem.numero <= semestreLimite) {
          sem.cursos.forEach((curso) => nuevosAprobados.push(curso.id));
        }
      });
    } else {
      malla.semestresComunes.forEach((sem) => {
        if (sem.numero <= semestreLimite) {
          sem.cursos.forEach((curso) => nuevosAprobados.push(curso.id));
        }
      });
      if (mencionActiva && malla.menciones[mencionActiva]) {
        malla.menciones[mencionActiva].semestres.forEach((sem) => {
          if (sem.numero <= semestreLimite) {
            sem.cursos.forEach((curso) => nuevosAprobados.push(curso.id));
          }
        });
      }
    }

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
  }, [malla, mencionActiva]); // se agregó a las dependencias por si acaso

  // ✅ Drag horizontal tipo Trello
  const bind = useDrag(
    ({ first, last, event }) => {
      const el = scrollRef.current;
      if (!el) return;

      if (first) {
        setIsDragging(true);
        dragMovedRef.current = 0;
      }

      if (event?.deltaX) {
        el.scrollLeft -= event.deltaX;
        dragMovedRef.current += Math.abs(event.deltaX);
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

  const handleClickCapture = (e) => {
    if (dragMovedRef.current > 3) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // ---------------- Lógica de renderizado ----------------
  const getSemestreInfo = (num) => {
    if (!malla) return null;
    if (!malla.isMencion) {
      return { tipo: "comun", data: malla.semestres.find(s => s.numero === num) };
    }
    
    // Buscar en comunes
    const comun = malla.semestresComunes.find(s => s.numero === num);
    if (comun) return { tipo: "comun", data: comun };

    // Buscar en menciones
    const opciones = {};
    let hasData = false;
    malla.mencionesDisponibles.forEach(m => {
      const semMencion = malla.menciones[m.codigo]?.semestres?.find(s => s.numero === num);
      if (semMencion) {
        opciones[m.codigo] = { ...semMencion, nombreMencion: m.nombre };
        hasData = true;
      }
    });

    return hasData ? { tipo: "mencion", opciones } : { tipo: "comun", data: null };
  };

  const isSemestreCompletado = (info) => {
    if (!info) return true;
    if (info.tipo === "comun") {
      if (!info.data?.cursos.length) return true;
      return info.data.cursos.every((c) => aprobados.includes(c.id));
    } else {
      const dataMencion = info.opciones[mencionActiva];
      if (!dataMencion?.cursos?.length) return true;
      return dataMencion.cursos.every((c) => aprobados.includes(c.id));
    }
  };

  const renderCurso = (curso) => (
    <Curso
      key={curso.id}
      curso={curso}
      aprobado={aprobados.includes(curso.id)}
      excepcional={excepciones.includes(curso.id)}
      disponible={cumplePrereqs(curso)}
      modoExcepcional={modoExcepcional}
      aprobar={() => aprobar(curso.id)}
      marcarExcepcional={() => marcarExcepcional(curso.id)}
      enCurso={cursando.includes(curso.id)}
      toggleCursando={() => toggleCursando(curso.id)}
      onAbrirNotas={(c) => onAbrirNotas(c, cursando.includes(c.id), aprobados.includes(c.id))}
    />
  );

  if (!malla)
    return <p className="text-center text-textSecondary">Cargando malla...</p>;

  // ✅ Render principal
  return (
    <div className="pb-10 px-2 sm:px-4 md:px-6">
      
      {/* Controles Superiores de Visualización */}
      <div className="flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-3 mb-4 pr-0 sm:pr-4">
        
        {/* Selector de Especialidad si existe */}
        {malla.isMencion && malla.mencionesDisponibles.length > 0 && (
          <div className="flex bg-bgSecondary/80 backdrop-blur-md p-1 rounded-full border border-borderColor/50">
            {malla.mencionesDisponibles.map((m) => (
              <button
                key={m.codigo}
                onClick={() => setMencionActiva(m.codigo)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  mencionActiva === m.codigo
                    ? "bg-primary text-white shadow-md scale-105"
                    : "text-textSecondary hover:text-textPrimary hover:bg-bgSecondary"
                }`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setOcultarCompletados(!ocultarCompletados)}
          className={`hidden sm:flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-300 border
            ${ocultarCompletados 
              ? "bg-primary text-white border-primary shadow-[0_0_12px_var(--primary)] opacity-90 scale-105" 
              : "bg-bgSecondary/80 backdrop-blur-md text-textSecondary border-borderColor/50 hover:text-primary hover:border-primary/50"}
          `}
        >
          {ocultarCompletados ? "👁️ Mostrar todo" : "🫣 Ocultar semestres listos"}
        </button>
      </div>

      {/* Wrapper de Cristal Seguro - Optimizado para móvil (menos blur, más rendimiento) */}
      <div className="rounded-3xl border border-borderColor/30 shadow-[0_4px_24px_rgba(0,0,0,0.05)] bg-bgPrimary/95 pb-6 pt-4 overflow-hidden" 
           style={{ contain: "content" }}>
        
        {/* Scroll horizontal arrastrable invertido verticalmente (scrollbar arriba) */}
        <div
          ref={scrollRef}
          {...bind()}
          onScroll={handleScroll}
          onClickCapture={handleClickCapture}
          className={`overflow-x-auto scroll-container overscroll-x-contain px-4 sm:px-10 pb-6 snap-x snap-mandatory sm:snap-none
                ${
                  isDragging ? "dragging" : "cursor-grab"
                } active:cursor-grabbing`}
          style={{ 
            WebkitOverflowScrolling: "touch", 
            willChange: "scroll-position",
            backfaceVisibility: "hidden",
            contain: "content"
          }}
        >
          <div 
            className="flex gap-6 sm:gap-8 md:gap-10 min-w-max py-2 sm:py-3 md:py-4"
            style={{ 
               backfaceVisibility: "hidden",
               transform: "translateZ(0)" /* Force layer for the whole flex container */
            }}
          >
            {Array.from({ length: Math.ceil(malla.totalSemestres / 2) }).map(
            (_, i) => {
              const year = i + 1;
              const semAInfo = getSemestreInfo(i * 2 + 1);
              const semBInfo = getSemestreInfo(i * 2 + 2);

              const isSemACompletado = isSemestreCompletado(semAInfo);
              const isSemBCompletado = isSemestreCompletado(semBInfo);

              // Si ocultarCompletados está activo, determinamos qué mostrar
              const showA = semAInfo && (semAInfo.tipo !== "comun" || semAInfo.data) && (!ocultarCompletados || !isSemACompletado);
              const showB = semBInfo && (semBInfo.tipo !== "comun" || semBInfo.data) && (!ocultarCompletados || !isSemBCompletado);

              // Si ambos semestres de un año se ocultan (o no tienen datos), ocultar todo el contenedor del año
              if (!showA && !showB) return null;

              return (
                <motion.div
                  key={year}
                  className={`w-max sm:w-auto flex-shrink-0 transition-all duration-300 ${
                    showA && showB 
                      ? "sm:min-w-[592px] md:min-w-[680px]" 
                      : "sm:min-w-[280px] md:min-w-[320px]"
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
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
                    {[
                      { info: semAInfo, show: showA, key: `sem-${i * 2 + 1}` },
                      { info: semBInfo, show: showB, key: `sem-${i * 2 + 2}` }
                    ].map(
                      ({ info, show, key }) =>
                        show && info && (
                          <Fragment key={key}>
                                {/* SEMESTRE COMÚN */}
                            {info.tipo === "comun" && info.data && (
                               <motion.div
                                 className="flex flex-col gap-3 w-[85vw] sm:w-[280px] md:w-[320px] shrink-0 snap-center sm:snap-align-none 
                                            bg-bgSecondary/70 
                                            rounded-2xl p-4 sm:p-5 border border-borderColor/40 
                                            shadow-md hover:shadow-lg transition-shadow duration-200 transform-gpu z-10"
                                 initial={{ opacity: 0, y: 8 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ duration: 0.2, ease: "easeOut" }}
                               >
                                 <div className="text-center sm:hidden mb-1">
                                    <span className="text-xs font-bold text-textSecondary uppercase">Semestre {info.data.numero}</span>
                                 </div>
                                 {info.data.cursos.map((c) => renderCurso(c))}
                               </motion.div>
                            )}                             {/* SEMESTRE MENCIONES (SIMPLE CARD) */}
                            {info.tipo === "mencion" && info.opciones && info.opciones[mencionActiva] && (
                               <motion.div
                                 className="flex flex-col gap-3 w-[85vw] sm:w-[280px] md:w-[320px] shrink-0 snap-center sm:snap-align-none 
                                            bg-primary/5 
                                            rounded-2xl p-4 sm:p-5 border border-primary/20 
                                            shadow-md hover:shadow-lg 
                                            transition-shadow duration-200 transform-gpu z-10 relative"
                                 initial={{ opacity: 0, y: 8 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ duration: 0.2, ease: "easeOut" }}
                               >
                                  {/* Header especialidad */}
                                  <div className="flex flex-col mb-1 pb-3 border-b border-primary/20">
                                     <div className="flex justify-between items-center mb-1">
                                       <span className="text-[10px] font-bold tracking-wider text-primary">
                                          ESPECIALIDAD
                                       </span>
                                       <span className="text-[10px] text-white bg-primary px-2 py-0.5 rounded-full opacity-90">
                                         {info.opciones[mencionActiva].nombreMencion}
                                       </span>
                                     </div>
                                     <div className="text-center sm:hidden mt-2">
                                        <span className="text-xs font-bold text-textSecondary uppercase">Semestre {info.opciones[mencionActiva].numero}</span>
                                     </div>
                                  </div>

                                  {info.opciones[mencionActiva].cursos.map((c) => renderCurso(c))}
                               </motion.div>
                            )}
                          </Fragment>
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
    </div>
  );
};

export default React.memo(MallaViewer, (prev, next) => {
  return (
    prev.mallaSeleccionada?.nombre === next.mallaSeleccionada?.nombre &&
    prev.modoExcepcional === next.modoExcepcional &&
    prev.ocultarCompletados === next.ocultarCompletados
  );
});
