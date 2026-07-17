import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { Eye, EyeOff, BookMarked, ChevronDown, Maximize2, X, AlertTriangle } from "lucide-react";
import Curso from "./Curso";
import CourseDrawer from "./CourseDrawer";
import {
  trackFullscreenMalla,
  trackToggleCursoEstado,
} from "../utils/analytics";

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
    () => JSON.parse(localStorage.getItem("malla-aprobados")) || []
  );
  const [excepciones, setExcepciones] = useState(
    () => JSON.parse(localStorage.getItem("malla-excepciones")) || []
  );
  const [cursando, setCursando] = useState(
    () => JSON.parse(localStorage.getItem("malla-cursando")) || []
  );

  const [selectedCurso, setSelectedCurso] = useState(null);

  // Ref y estados para drag horizontal
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
    setFullscreenMalla((open) => {
      if (open) trackFullscreenMalla(mallaSeleccionada, false);
      return false;
    });
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const enterFullscreenMalla = () => {
    setFullscreenMalla(true);
    trackFullscreenMalla(mallaSeleccionada, true);
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
        setFullscreenMalla((open) => {
          if (open) trackFullscreenMalla(mallaSeleccionada, false);
          return false;
        });
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [mallaSeleccionada]);

  // Cargar malla seleccionada
  useEffect(() => {
    if (!mallaSeleccionada?.url) return;

    async function cargar() {
      setMalla(null);
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
        if (isMencion && mencionesDisponibles.length > 0) {
          const storedMencion = localStorage.getItem(`malla-mencion-${mallaData.nombre}`);
          if (storedMencion && mencionesDisponibles.some(m => m.codigo === storedMencion)) {
            setMencionActiva(storedMencion);
          } else {
            setMencionActiva(mencionesDisponibles[0].codigo);
          }
        }
        
        onMallaDataLoaded?.(data);
      } catch (err) {
        console.error("Error al cargar malla:", err);
      }
    }
    cargar();
  }, [mallaSeleccionada, onMallaDataLoaded]);

  // Guardar mención activa
  useEffect(() => {
    if (malla && mencionActiva) {
      localStorage.setItem(`malla-mencion-${malla.nombre}`, mencionActiva);
    }
  }, [mencionActiva, malla]);

  // Notificar semestres cargados
  useEffect(() => {
    if (malla && onSemestresLoaded) {
      onSemestresLoaded(malla.totalSemestres);
    }
  }, [malla, onSemestresLoaded]);

  // Persistencia del Scroll
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

  // Guardar en localStorage
  useEffect(() => {
    setExcepcionesActivas(excepciones.length);
    localStorage.setItem("malla-aprobados", JSON.stringify(aprobados));
    localStorage.setItem("malla-excepciones", JSON.stringify(excepciones));
    localStorage.setItem("malla-cursando", JSON.stringify(cursando));

    onCursandoChange?.(cursando.length);
    onAprobadosChange?.(aprobados);
    onExcepcionesChange?.(excepciones);
    onCursandoArrayChange?.(cursando);

    window.dispatchEvent(new CustomEvent("malla-progress-changed"));
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

  // Calcular progreso cada vez que cambia el estado
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

  const getAllCursos = useCallback(() => {
    if (!malla) return [];
    if (!malla.isMencion) {
      return malla.semestres.flatMap((s) => s.cursos);
    }
    const fromMenciones = Object.values(malla.menciones).flatMap((m) =>
      m.semestres.flatMap((s) => s.cursos)
    );
    return [...malla.semestresComunes.flatMap((s) => s.cursos), ...fromMenciones];
  }, [malla]);

  const getCursoById = useCallback((id) => getAllCursos().find((c) => c.id === id), [getAllCursos]);

  const getDescendientes = (id, todasLasMallas) => {
    const hijos = todasLasMallas.filter(c => c.prerrequisitos?.includes(id));
    let descendientes = [...hijos.map(h => h.id)];
    hijos.forEach(h => {
      descendientes = [...descendientes, ...getDescendientes(h.id, todasLasMallas)];
    });
    return Array.from(new Set(descendientes));
  };

  // Aprobar o desmarcar ramo
  const aprobar = (id) => {
    const curso = getCursoById(id);
    const willApprove = !aprobados.includes(id);
    trackToggleCursoEstado(mallaSeleccionada, curso, willApprove ? "aprobado" : "desaprobado");

    setAprobados((prevAprobados) => {
      if (prevAprobados.includes(id)) {
        const todosLosCursos = getAllCursos();
        const aEliminar = getDescendientes(id, todosLosCursos);
        return prevAprobados.filter((a) => a !== id && !aEliminar.includes(a));
      }
      return [...prevAprobados, id];
    });
    
    setCursando((prevCursando) => {
      if (prevCursando.includes(id)) {
        return prevCursando.filter((c) => c !== id);
      }
      return prevCursando;
    });
  };

  // Marcar / desmarcar como excepcional
  const marcarExcepcional = (id) => {
    const isRemoving = excepciones.includes(id);
    const curso = getCursoById(id);
    trackToggleCursoEstado(
      mallaSeleccionada,
      curso,
      isRemoving ? "excepcional_off" : "excepcional_on"
    );

    setExcepciones((prev) =>
      isRemoving ? prev.filter((e) => e !== id) : [...prev, id]
    );

    setAprobados((prev) => {
      if (isRemoving) return prev.filter((a) => a !== id);
      if (!prev.includes(id)) return [...prev, id];
      return prev;
    });

    setCursando((prev) => {
      if (!isRemoving && prev.includes(id)) return prev.filter((c) => c !== id);
      return prev;
    });
  };

  // En curso
  const toggleCursando = (id) => {
    const curso = getCursoById(id);
    const willEnable = !cursando.includes(id);
    trackToggleCursoEstado(
      mallaSeleccionada,
      curso,
      willEnable ? "en_curso_on" : "en_curso_off"
    );

    setCursando((prevCursando) => {
      if (prevCursando.includes(id)) {
        return prevCursando.filter((c) => c !== id);
      } else {
        return [...prevCursando, id];
      }
    });
  };

  // Aprobar hasta semestre (evento global desde Navbar)
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
    setCursando((prev) => prev.filter((id) => !aprobadosSet.has(id)));
  };

  useEffect(() => {
    const handler = (e) => aprobarHastaSemestre(e.detail);
    window.addEventListener("aprobarHastaSemestre", handler);
    return () => window.removeEventListener("aprobarHastaSemestre", handler);
  }, [malla, mencionActiva]);

  // Drag horizontal
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
        setTimeout(() => setIsDragging(false), 20);
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

  // Desktop: rueda vertical → scroll horizontal animado
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

  // Cumple prerrequisitos
  const cumplePrereqs = useCallback((curso) => {
    if (!curso.prerrequisitos?.length) return true;
    return curso.prerrequisitos.every(
      (pre) => aprobados.includes(pre) || excepciones.includes(pre)
    );
  }, [aprobados, excepciones]);

  // Path highlight status
  const getHighlightStatus = (cursoId) => {
    if (!selectedCurso) return "normal";
    if (selectedCurso.id === cursoId) return "selected";
    if (selectedCurso.prerrequisitos?.includes(cursoId)) return "prereq";
    
    // Check if immediate unlock
    const isImmediateUnlock = selectedCurso.id && getCursoById(cursoId)?.prerrequisitos?.includes(selectedCurso.id);
    if (isImmediateUnlock) return "unlock";
    
    return "fade";
  };

  const getStats = () => {
    if (!malla) return { total: 0, aprobados: 0, cursando: 0, pendientes: 0, pct: 0 };
    
    const activeIds = new Set();
    if (!malla.isMencion) {
      malla.semestres.forEach((sem) => {
        sem.cursos.forEach((c) => activeIds.add(c.id));
      });
    } else {
      malla.semestresComunes.forEach((sem) => {
        sem.cursos.forEach((c) => activeIds.add(c.id));
      });
      if (mencionActiva && malla.menciones[mencionActiva]) {
        malla.menciones[mencionActiva].semestres.forEach((sem) => {
          sem.cursos.forEach((c) => activeIds.add(c.id));
        });
      }
    }
    
    const total = activeIds.size;
    const aprobadosCount = aprobados.filter((id) => activeIds.has(id)).length;
    const cursandoCount = cursando.filter((id) => activeIds.has(id)).length;
    const pendientesCount = total - aprobadosCount - cursandoCount;
    const pct = total > 0 ? Math.round((aprobadosCount / total) * 100) : 0;
    
    return {
      total,
      aprobados: aprobadosCount,
      cursando: cursandoCount,
      pendientes: pendientesCount,
      pct
    };
  };

  const stats = getStats();

  const getSemestreInfo = (num) => {
    if (!malla) return null;
    if (!malla.isMencion) {
      return { tipo: "comun", data: malla.semestres.find(s => s.numero === num) };
    }
    
    const comun = malla.semestresComunes.find(s => s.numero === num);
    if (comun) return { tipo: "comun", data: comun };

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
    let cursosList = [];
    let labelExtra = "";

    if (info.tipo === "comun" && info.data) {
      cursosList = info.data.cursos;
    } else if (info.tipo === "mencion" && info.opciones?.[mencionActiva]) {
      cursosList = info.opciones[mencionActiva].cursos;
      labelExtra = ` · ${info.opciones[mencionActiva].nombreMencion}`;
    } else {
      return null;
    }

    return (
      <motion.div
        key={`sem-${semNumero}`}
        className="flex flex-col gap-3.5 w-[85vw] sm:w-[270px] md:w-[290px] shrink-0 snap-center sm:snap-align-none py-1 px-0.5"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        layout
      >
        <div className="flex items-baseline justify-between border-b border-borderColor/60 pb-2 mb-0.5 select-none">
          <span className="text-xs font-bold text-textPrimary leading-none">
            Semestre {semNumero}{labelExtra}
          </span>
          <span className="text-[10px] text-textSecondary font-semibold leading-none">
            {cursosList.length} ramos
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {cursosList.map((c) => (
            <Curso
              key={c.id}
              curso={c}
              aprobado={aprobados.includes(c.id)}
              excepcional={excepciones.includes(c.id)}
              disponible={cumplePrereqs(c)}
              enCurso={cursando.includes(c.id)}
              onSelect={(cursoObj) => setSelectedCurso(cursoObj)}
              highlightStatus={getHighlightStatus(c.id)}
            />
          ))}
        </div>
      </motion.div>
    );
  };

  if (!malla)
    return <p className="text-center text-textSecondary py-4">Cargando malla...</p>;

  const visibleSemesters = getVisibleSemesters();
  const uni = mallaSeleccionada?.url?.includes("uch") ? "Universidad de Chile" : "UNAB";

  return (
    <div
      ref={fullscreenShellRef}
      className={
        fullscreenMalla
          ? "malla-fullscreen-shell fixed inset-0 z-[9999] flex flex-col bg-bgPrimary text-textPrimary h-[100dvh] w-full"
          : "mobile-malla-shell relative px-0 sm:px-4 md:px-8 pb-0 sm:pb-8 flex flex-col flex-1 min-h-0"
      }
    >
      {fullscreenMalla ? (
        <header className="malla-fullscreen-header flex items-center justify-between gap-3 px-4 h-12 shrink-0 border-b border-borderColor bg-bgSecondary/80 backdrop-blur-sm">
          <span className="text-sm font-bold text-textPrimary">Visualización Curricular</span>
          <button
            type="button"
            onClick={exitFullscreenMalla}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-borderColor bg-bgPrimary text-textSecondary hover:text-primary hover:border-primary/40 transition-colors"
            aria-label="Salir de pantalla completa"
          >
            <X className="w-3.5 h-3.5" />
            Salir
          </button>
        </header>
      ) : null}
      
      {/* ── Compact Statistics & Title Header ── */}
      {!fullscreenMalla && (
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 mb-4 border border-borderColor/60 bg-bgSecondary/30 rounded-2xl select-none shrink-0">
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold text-textPrimary leading-none">Mi malla curricular</h1>
            <p className="text-[10px] text-textSecondary/80 font-bold mt-1 uppercase tracking-wide">
              {malla.nombre} ({uni})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-textSecondary font-semibold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {stats.aprobados} aprobados
            </span>
            <span className="opacity-45">•</span>
            <span className="flex items-center gap-1 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {stats.cursando} cursando
            </span>
            <span className="opacity-45">•</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-borderColor" />
              {stats.pendientes} pendientes
            </span>
            <span className="opacity-45">•</span>
            <span className="text-textPrimary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
              {stats.pct}% de avance
            </span>
          </div>
        </div>
      )}

      {/* Specialty and display filters bar */}
      <div
        ref={controlsRef}
        className="mobile-malla-controls flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2 sm:gap-3 mb-3 px-2 sm:pr-2 shrink-0 select-none"
      >
        {malla.isMencion && malla.mencionesDisponibles.length > 0 && (
          malla.mencionesDisponibles.length > 3 ? (
            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[240px] max-w-[min(100%,360px)]">
              <div
                className="group flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl border border-borderColor bg-bgPrimary shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:border-primary/35 transition-all duration-200"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-primaryMuted text-primary">
                  <BookMarked className="w-3 h-3" />
                </div>
                <select
                  value={mencionActiva || ""}
                  onChange={(e) => setMencionActiva(e.target.value)}
                  aria-label="Seleccionar especialidad o mención"
                  className="mencion-select w-full min-w-0 flex-1 cursor-pointer bg-transparent py-0.5 pl-0 pr-1 text-xs font-semibold text-textPrimary outline-none appearance-none truncate"
                >
                  {malla.mencionesDisponibles.map((m) => (
                    <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 flex-shrink-0 text-primary/70 pointer-events-none" strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <div className="flex bg-bgSecondary/60 p-0.5 rounded-xl border border-borderColor/40 max-sm:w-full max-sm:overflow-x-auto">
              {malla.mencionesDisponibles.map((m) => (
                <button
                  key={m.codigo}
                  onClick={() => setMencionActiva(m.codigo)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                    mencionActiva === m.codigo
                      ? "bg-primary text-white shadow-sm"
                      : "text-textSecondary hover:text-textPrimary"
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
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200
              ${ocultarCompletados
                ? "bg-primary text-white border-primary"
                : "bg-bgSecondary/85 text-textSecondary border-borderColor hover:text-primary hover:border-primary/40"}
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-borderColor bg-bgSecondary/85 text-textSecondary hover:text-primary hover:border-primary/40 shadow-sm transition-colors shrink-0"
            aria-label="Ver malla en pantalla completa"
          >
            <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Pantalla completa</span>
          </button>
        )}
      </div>

      {/* Main Grid Viewport */}
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
          <p className="mobile-scroll-hint select-none">
            ← Desliza horizontalmente para ver los semestres →
          </p>
        </div>
      ) : (
        <div className={`flex flex-col flex-1 min-h-0 rounded-3xl border border-borderColor/40 bg-bgPrimary/45 pb-6 pt-5 overflow-hidden ${fullscreenMalla ? "!rounded-none !border-0 !pt-2 !pb-2 malla-fullscreen-viewport" : ""}`}
             style={{ contain: "content" }}>
          
          <div
            ref={scrollRef}
            {...bind()}
            onScroll={handleScroll}
            onClickCapture={handleClickCapture}
            className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden scroll-container malla-wheel-scroll overscroll-x-contain overscroll-contain
                  px-6 sm:px-10 pb-6 snap-x snap-mandatory sm:snap-none
                  ${isDragging ? "dragging" : "cursor-grab"} active:cursor-grabbing`}
            style={{ 
              WebkitOverflowScrolling: "touch", 
              willChange: "scroll-position",
              backfaceVisibility: "hidden",
              contain: "content"
            }}
          >
            <div 
              className="flex gap-8 sm:gap-10 md:gap-12 min-w-max py-2"
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
                            ? "sm:min-w-[580px] md:min-w-[620px]" 
                            : "sm:min-w-[280px] md:min-w-[300px]"
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -8 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        layout
                      >
                        <div className="text-center mb-4 select-none">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-textSecondary/80">Año</span>
                          <div className="text-lg sm:text-xl font-extrabold text-primary">
                            {year}
                          </div>
                        </div>

                        <div className="flex gap-8">
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

      {/* Reusable Course Drawer Details Panel */}
      <CourseDrawer
        isOpen={!!selectedCurso}
        onClose={() => setSelectedCurso(null)}
        curso={selectedCurso}
        aprobado={selectedCurso ? aprobados.includes(selectedCurso.id) : false}
        excepcional={selectedCurso ? excepciones.includes(selectedCurso.id) : false}
        disponible={selectedCurso ? cumplePrereqs(selectedCurso) : false}
        modoExcepcional={modoExcepcional}
        enCurso={selectedCurso ? cursando.includes(selectedCurso.id) : false}
        aprobar={() => selectedCurso && aprobar(selectedCurso.id)}
        marcarExcepcional={() => selectedCurso && marcarExcepcional(selectedCurso.id)}
        toggleCursando={() => selectedCurso && toggleCursando(selectedCurso.id)}
        onAbrirNotas={(c) => {
          setSelectedCurso(null); // close drawer to display notes modal cleanly
          onAbrirNotas?.(c, cursando.includes(c.id), aprobados.includes(c.id));
        }}
        getCursoById={getCursoById}
        aprobados={aprobados}
        excepciones={excepciones}
        allCursos={getAllCursos()}
      />
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
