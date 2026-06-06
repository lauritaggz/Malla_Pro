import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { Eye, EyeOff, BookMarked, ChevronDown, Maximize2, X } from "lucide-react";
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
  const controlsRef = useRef(null);
  const fullscreenShellRef = useRef(null);
  const dragMovedRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreenMalla, setFullscreenMalla] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e) => setIsMobileView(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isMobileView) {
      document.documentElement.style.setProperty("--mobile-controls-h", "0px");
      return;
    }
    if (!controlsRef.current) return;
    const report = () => {
      const h = controlsRef.current?.offsetHeight || 0;
      document.documentElement.style.setProperty("--mobile-controls-h", `${h}px`);
    };
    report();
    const obs = new ResizeObserver(report);
    obs.observe(controlsRef.current);
    return () => obs.disconnect();
  }, [isMobileView, malla?.isMencion, malla?.mencionesDisponibles?.length]);

  const exitFullscreenMalla = () => {
    setFullscreenMalla(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const enterFullscreenMalla = () => {
    setFullscreenMalla(true);
    requestAnimationFrame(() => {
      fullscreenShellRef.current?.requestFullscreen?.().catch(() => {});
    });
  };

  useEffect(() => {
    if (!fullscreenMalla) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") exitFullscreenMalla();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreenMalla]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenMalla(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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

  // Desktop: rueda vertical → scroll horizontal animado (sin mezclar scroll de página)
  useEffect(() => {
    if (isMobileView) return;

    const el = scrollRef.current;
    if (!el) return;

    const animState = { rafId: null, target: 0 };

    const runAnimation = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      animState.target = Math.max(0, Math.min(maxScroll, animState.target));

      const step = () => {
        const diff = animState.target - el.scrollLeft;
        if (Math.abs(diff) < 0.5) {
          el.scrollLeft = animState.target;
          animState.rafId = null;
          return;
        }
        el.scrollLeft += diff * 0.34;
        animState.rafId = requestAnimationFrame(step);
      };

      if (animState.rafId) cancelAnimationFrame(animState.rafId);
      animState.rafId = requestAnimationFrame(step);
    };

    const handleWheel = (e) => {
      if (window.innerWidth < 768) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 1) return;

      e.preventDefault();
      e.stopPropagation();

      if (animState.rafId === null) {
        animState.target = el.scrollLeft;
      }
      animState.target += e.deltaY * 1.25;
      runAnimation();
    };

    el.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener("wheel", handleWheel, { capture: true });
      if (animState.rafId) cancelAnimationFrame(animState.rafId);
    };
  }, [isMobileView, malla]);

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

  const getVisibleSemesters = () => {
    const list = [];
    for (let num = 1; num <= malla.totalSemestres; num++) {
      const info = getSemestreInfo(num);
      if (!info) continue;
      if (info.tipo === "comun" && !info.data) continue;
      if (info.tipo === "mencion" && (!info.opciones || !info.opciones[mencionActiva])) continue;
      if (ocultarCompletados && isSemestreCompletado(info)) continue;
      list.push({ numero: num, info });
    }
    return list;
  };

  const renderSemestreCard = (info, semNumero, mobile = false) => {
    if (info.tipo === "comun" && info.data) {
      return (
        <motion.div
          key={`sem-${semNumero}`}
          className={
            mobile
              ? "mobile-semester-card"
              : `flex flex-col gap-3 w-[85vw] sm:w-[280px] md:w-[320px] shrink-0 snap-center sm:snap-align-none
                 bg-bgSecondary/70 rounded-2xl p-4 sm:p-5 border border-borderColor/40
                 shadow-md hover:shadow-lg transition-shadow duration-200 transform-gpu z-10`
          }
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          layout
        >
          <div className={mobile ? "mobile-semester-card__header" : "text-center sm:hidden mb-1"}>
            <span className={mobile ? "mobile-semester-card__title" : "text-xs font-bold text-textSecondary uppercase"}>
              Semestre {info.data.numero}
            </span>
          </div>
          <div className={mobile ? "mobile-semester-card__courses" : "flex flex-col gap-3"}>
            {info.data.cursos.map((c) => renderCurso(c))}
          </div>
        </motion.div>
      );
    }

    if (info.tipo === "mencion" && info.opciones?.[mencionActiva]) {
      const semData = info.opciones[mencionActiva];
      return (
        <motion.div
          key={`sem-${semNumero}`}
          className={
            mobile
              ? "mobile-semester-card mobile-semester-card--mencion"
              : `flex flex-col gap-3 w-[85vw] sm:w-[280px] md:w-[320px] shrink-0 snap-center sm:snap-align-none
                 bg-primary/5 rounded-2xl p-4 sm:p-5 border border-primary/20
                 shadow-md hover:shadow-lg transition-shadow duration-200 transform-gpu z-10 relative`
          }
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          layout
        >
          {mobile ? (
            <div className="mobile-semester-card__header border-primary/20">
              <span className="text-[9px] font-bold tracking-wider text-primary uppercase">Especialidad</span>
              <div className="mobile-semester-card__title mt-0.5">
                Semestre {semData.numero} · {semData.nombreMencion}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col mb-1 pb-3 border-b border-primary/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold tracking-wider text-primary">ESPECIALIDAD</span>
                  <span className="text-[10px] text-white bg-primary px-2 py-0.5 rounded-full opacity-90">
                    {semData.nombreMencion}
                  </span>
                </div>
                <div className="text-center sm:hidden mt-2">
                  <span className="text-xs font-bold text-textSecondary uppercase">Semestre {semData.numero}</span>
                </div>
              </div>
            </>
          )}
          <div className={mobile ? "mobile-semester-card__courses" : "flex flex-col gap-3"}>
            {semData.cursos.map((c) => renderCurso(c))}
          </div>
        </motion.div>
      );
    }

    return null;
  };

  if (!malla)
    return <p className="text-center text-textSecondary py-4">Cargando malla...</p>;

  const visibleSemesters = getVisibleSemesters();

  return (
    <div
      ref={fullscreenShellRef}
      className={
        fullscreenMalla
          ? "malla-fullscreen-shell fixed inset-0 z-[9999] flex flex-col bg-bgPrimary text-textPrimary h-[100dvh] w-full"
          : "mobile-malla-shell relative px-0 sm:px-2 md:px-6 pb-0 sm:pb-10 flex flex-col flex-1 min-h-0"
      }
    >
      {fullscreenMalla ? (
        <header className="malla-fullscreen-header flex items-center justify-between gap-3 px-3 sm:px-4 h-11 shrink-0 border-b border-borderColor bg-bgSecondary/80 backdrop-blur-sm">
          <span className="text-sm font-semibold text-textPrimary">Malla</span>
          <button
            type="button"
            onClick={exitFullscreenMalla}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-borderColor bg-bgPrimary text-textSecondary hover:text-primary hover:border-primary/40 transition-colors"
            aria-label="Salir de pantalla completa"
          >
            <X className="w-3.5 h-3.5" />
            Salir
          </button>
        </header>
      ) : null}
      
      {/* Controles Superiores de Visualización */}
      <div
        ref={controlsRef}
        className="mobile-malla-controls flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2 sm:gap-3 mb-2 sm:mb-4 px-2 sm:pr-4 max-sm:mb-1.5 max-sm:min-h-0 shrink-0"
      >
        
        {malla.isMencion && malla.mencionesDisponibles.length > 0 && (
          malla.mencionesDisponibles.length > 3 ? (
            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[280px] max-w-[min(100%,420px)]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textSecondary/90 px-0.5 max-sm:hidden">
                Especialidad / mención
              </span>
              <div
                className="group flex items-center gap-2 pl-2.5 pr-2 py-1.5 max-sm:py-1 rounded-xl max-sm:rounded-lg
                  border border-borderColor bg-bgPrimary
                  shadow-[0_1px_2px_rgba(0,0,0,0.06)]
                  hover:border-primary/35 transition-all duration-200
                  focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/50"
              >
                <div className="flex h-7 w-7 max-sm:h-6 max-sm:w-6 flex-shrink-0 items-center justify-center rounded-lg bg-primaryMuted text-primary">
                  <BookMarked className="w-3.5 h-3.5 max-sm:w-3 max-sm:h-3" strokeWidth={2} />
                </div>
                <select
                  value={mencionActiva || ""}
                  onChange={(e) => setMencionActiva(e.target.value)}
                  aria-label="Seleccionar especialidad o mención"
                  className="mencion-select w-full min-w-0 flex-1 cursor-pointer bg-transparent py-0.5 pl-0 pr-1
                    text-sm max-sm:text-xs font-semibold leading-snug text-textPrimary outline-none appearance-none truncate"
                >
                  {malla.mencionesDisponibles.map((m) => (
                    <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 flex-shrink-0 text-primary/70 pointer-events-none" strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <div className="flex bg-bgSecondary/80 backdrop-blur-md p-0.5 max-sm:p-0.5 rounded-full border border-borderColor/50 max-sm:w-full max-sm:overflow-x-auto">
              {malla.mencionesDisponibles.map((m) => (
                <button
                  key={m.codigo}
                  onClick={() => setMencionActiva(m.codigo)}
                  className={`px-3 max-sm:px-2.5 py-1 max-sm:py-0.5 rounded-full text-sm max-sm:text-xs font-medium transition-all duration-300 whitespace-nowrap ${
                    mencionActiva === m.codigo
                      ? "bg-primary text-white shadow-md"
                      : "text-textSecondary hover:text-textPrimary hover:bg-bgSecondary"
                  }`}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          )
        )}

        {!fullscreenMalla && (
        <button
          onClick={() => setOcultarCompletados(!ocultarCompletados)}
          className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
            ${ocultarCompletados
              ? "bg-primary text-white border-primary"
              : "bg-bgSecondary text-textSecondary border-borderColor hover:text-primary hover:border-primary/40"}
          `}
        >
          {ocultarCompletados
            ? <><Eye className="w-3.5 h-3.5" /> Mostrar todo</>
            : <><EyeOff className="w-3.5 h-3.5" /> Ocultar completados</>}
        </button>
        )}

        {!fullscreenMalla && (
        <button
          type="button"
          onClick={enterFullscreenMalla}
          className="flex items-center gap-1.5 px-3 py-1.5 max-sm:px-2.5 rounded-lg text-xs font-medium border border-borderColor bg-bgSecondary/90 hover:bg-bgSecondary text-textSecondary hover:text-primary shadow-sm transition-colors shrink-0"
          aria-label="Ver malla en pantalla completa"
        >
          <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Pantalla completa</span>
        </button>
        )}
      </div>

      {isMobileView ? (
        <div className={`mobile-malla-viewport flex flex-col flex-1 min-h-0 ${fullscreenMalla ? "malla-fullscreen-viewport" : ""}`}>
          <div
            ref={scrollRef}
            {...bind()}
            onScroll={handleScroll}
            onClickCapture={handleClickCapture}
            className={`mobile-semester-scroll scroll-container overscroll-x-contain snap-x snap-mandatory
              ${isDragging ? "dragging" : "cursor-grab"} active:cursor-grabbing`}
            style={{
              WebkitOverflowScrolling: "touch",
              willChange: "scroll-position",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="mobile-semester-carousel">
              <AnimatePresence mode="popLayout">
                {visibleSemesters.map(({ numero, info }) => renderSemestreCard(info, numero, true))}
              </AnimatePresence>
            </div>
          </div>
          <p className="mobile-scroll-hint">
            ← Desliza horizontalmente para ver más semestres →
          </p>
        </div>
      ) : (
      <div className={`flex flex-col flex-1 min-h-0 sm:rounded-3xl sm:border sm:border-borderColor/30 sm:shadow-[0_4px_24px_rgba(0,0,0,0.05)] bg-bgPrimary/95 sm:pb-6 sm:pt-4 overflow-hidden ${fullscreenMalla ? "!rounded-none !border-0 !shadow-none !pt-2 !pb-2 malla-fullscreen-viewport" : ""}`}
           style={{ contain: "content" }}>
        
        <div
          ref={scrollRef}
          {...bind()}
          onScroll={handleScroll}
          onClickCapture={handleClickCapture}
          className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden scroll-container malla-wheel-scroll overscroll-x-contain overscroll-contain
                px-4 sm:px-10 pb-6 snap-x snap-mandatory sm:snap-none
                ${isDragging ? "dragging" : "cursor-grab"} active:cursor-grabbing`}
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
                 transform: "translateZ(0)"
              }}
            >
              <AnimatePresence mode="popLayout">
              {Array.from({ length: Math.ceil(malla.totalSemestres / 2) }).map(
              (_, i) => {
                const year = i + 1;
                const semAInfo = getSemestreInfo(i * 2 + 1);
                const semBInfo = getSemestreInfo(i * 2 + 2);

                const isSemACompletado = isSemestreCompletado(semAInfo);
                const isSemBCompletado = isSemestreCompletado(semBInfo);

                const showA = semAInfo && (semAInfo.tipo !== "comun" || semAInfo.data) && (!ocultarCompletados || !isSemACompletado);
                const showB = semBInfo && (semBInfo.tipo !== "comun" || semBInfo.data) && (!ocultarCompletados || !isSemBCompletado);

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
                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    layout
                  >
                    <div className="text-center mb-3 sm:mb-4">
                      <span className="text-xs uppercase tracking-wide text-textSecondary/80">Año</span>
                      <div className="text-xl sm:text-2xl font-bold text-primary drop-shadow-[0_1px_0_rgba(255,255,255,0.04)]">
                        {year}
                      </div>
                    </div>

                    <div className="flex gap-4 sm:gap-8">
                      {[
                        { info: semAInfo, show: showA, num: i * 2 + 1 },
                        { info: semBInfo, show: showB, num: i * 2 + 2 }
                      ].map(
                        ({ info, show, num }) =>
                          show && info && renderSemestreCard(info, num, false)
                      )}
                    </div>
                  </motion.div>
                );
              }
            )}
              </AnimatePresence>
            </div>
        </div>
      </div>
      )}
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
