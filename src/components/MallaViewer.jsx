import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import {
  Eye, EyeOff, BookMarked, ChevronDown, Maximize2, X, AlertTriangle,
  Clock, Circle, CheckCircle2, NotebookPen
} from "lucide-react";
import Curso from "./Curso";
import {
  trackFullscreenMalla,
  trackToggleCursoEstado,
} from "../utils/analytics";
import { safeStorage } from "../utils/safeStorage";
import {
  consumeConservedApprovedIds,
  readAcademicProgress,
  writeAcademicProgress,
} from "../utils/academicProgressStorage";
import { getUserSafeMessage, normalizeAppError } from "../utils/appErrors";

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
  const [loadStatus, setLoadStatus] = useState("loading"); // loading | success | error
  const [loadError, setLoadError] = useState(null);
  const [mencionActiva, setMencionActiva] = useState(null);

  const [aprobados, setAprobados] = useState(() => {
    try {
      return readAcademicProgress(mallaSeleccionada).aprobados;
    } catch {
      return [];
    }
  });
  const [excepciones, setExcepciones] = useState(() => {
    try {
      return readAcademicProgress(mallaSeleccionada).excepciones;
    } catch {
      return [];
    }
  });
  const [cursando, setCursando] = useState(() => {
    try {
      return readAcademicProgress(mallaSeleccionada).cursando;
    } catch {
      return [];
    }
  });

  const [selectedCurso, setSelectedCurso] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [paths, setPaths] = useState([]);

  // Ref y estados para drag horizontal
  const scrollRef = useRef(null);
  const controlsRef = useRef(null);
  const fullscreenShellRef = useRef(null);
  const dragMovedRef = useRef(0);
  const loadIdRef = useRef(0);
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

    const loadId = ++loadIdRef.current;

    async function cargar() {
      setMalla(null);
      setLoadStatus("loading");
      setLoadError(null);
      try {
        const res = await fetch(mallaSeleccionada.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (loadId !== loadIdRef.current) return;

        if (!data || typeof data !== "object") {
          throw new Error("Invalid malla JSON");
        }

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

        // Migrar / cargar progreso de esta carrera
        const progress = readAcademicProgress(mallaSeleccionada);
        let nextAprobados = progress.aprobados;
        const conserved = consumeConservedApprovedIds(mallaData);
        if (conserved.length) {
          nextAprobados = [...new Set([...nextAprobados, ...conserved])];
        }
        setAprobados(nextAprobados);
        setExcepciones(progress.excepciones);
        setCursando(progress.cursando);

        setMalla(mallaData);
        setLoadStatus("success");

        // Inicializar mención activa si aplica
        if (isMencion && mencionesDisponibles.length > 0) {
          const storedMencion = safeStorage.getRaw(
            `malla-mencion-${mallaData.nombre}`
          );
          if (storedMencion && mencionesDisponibles.some((m) => m.codigo === storedMencion)) {
            setMencionActiva(storedMencion);
          } else {
            setMencionActiva(mencionesDisponibles[0].codigo);
          }
        }

        onMallaDataLoaded?.(mallaData);
      } catch (err) {
        if (loadId !== loadIdRef.current) return;
        normalizeAppError(err, { context: "MallaViewer.cargar" });
        setLoadStatus("error");
        setLoadError(getUserSafeMessage("MALLA_LOAD_FAILED"));
        setMalla(null);
      }
    }
    cargar();
  }, [mallaSeleccionada, onMallaDataLoaded]);

  // Guardar mención activa
  useEffect(() => {
    if (malla && mencionActiva) {
      safeStorage.setRaw(`malla-mencion-${malla.nombre}`, mencionActiva);
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
      safeStorage.setRaw(
        `malla-scroll-${malla.nombre}`,
        String(scrollRef.current.scrollLeft)
      );
    }
  };

  useEffect(() => {
    if (malla && scrollRef.current) {
      const savedScroll = safeStorage.getRaw(`malla-scroll-${malla.nombre}`);
      if (savedScroll) {
        scrollRef.current.scrollLeft = parseFloat(savedScroll);
      }
    }
  }, [malla]);

  // Guardar en localStorage (namespace por carrera + dual-write legacy)
  useEffect(() => {
    setExcepcionesActivas(excepciones.length);
    writeAcademicProgress(mallaSeleccionada, {
      aprobados,
      excepciones,
      cursando,
    });

    onCursandoChange?.(cursando.length);
    onAprobadosChange?.(aprobados);
    onExcepcionesChange?.(excepciones);
    onCursandoArrayChange?.(cursando);

    window.dispatchEvent(new CustomEvent("malla-progress-changed"));
  }, [
    aprobados,
    excepciones,
    cursando,
    mallaSeleccionada,
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

  // Helper para obtener las coordenadas relativas de una tarjeta (soporta zoom del contenedor)
  const getCardCoordinates = (cardEl, containerEl) => {
    if (!cardEl || !containerEl) return null;
    const cardRect = cardEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    
    // Obtener factor de zoom del contenedor
    const zoomEl = document.querySelector('.main-content-zoom');
    const zoom = zoomEl ? parseFloat(window.getComputedStyle(zoomEl).zoom) || 1 : 1;
    
    return {
      left: (cardRect.left - containerRect.left) / zoom,
      top: (cardRect.top - containerRect.top) / zoom,
      width: cardRect.width / zoom,
      height: cardRect.height / zoom,
      right: ((cardRect.left - containerRect.left) + cardRect.width) / zoom,
      bottom: ((cardRect.top - containerRect.top) + cardRect.height) / zoom,
      centerX: ((cardRect.left - containerRect.left) + cardRect.width / 2) / zoom,
      centerY: ((cardRect.top - containerRect.top) + cardRect.height / 2) / zoom,
    };
  };

  // Recalcular las coordenadas de las líneas conectoras (SVG)
  const recalculatePaths = useCallback(() => {
    if (!selectedCurso || isMobileView) {
      setPaths([]);
      return;
    }

    const containerEl = document.getElementById("malla-grid-container");
    const selectedEl = document.getElementById(`curso-card-${selectedCurso.id}`);
    if (!containerEl || !selectedEl) return;

    const coordsS = getCardCoordinates(selectedEl, containerEl);
    if (!coordsS) return;

    const newPaths = [];

    // 1. Prerrequisitos (P -> S)
    (selectedCurso.prerrequisitos || []).forEach((preId) => {
      const preEl = document.getElementById(`curso-card-${preId}`);
      if (!preEl) return;
      const coordsP = getCardCoordinates(preEl, containerEl);
      if (!coordsP) return;

      newPaths.push({
        id: `pre-${preId}-${selectedCurso.id}`,
        type: "prereq",
        x1: coordsP.right + 2,
        y1: coordsP.centerY,
        x2: coordsS.left - 6,
        y2: coordsS.centerY,
      });
    });

    // 2. Asignaturas que desbloquea (S -> U)
    const todosLosCursos = getAllCursos();
    todosLosCursos.forEach((c) => {
      if (c.prerrequisitos?.includes(selectedCurso.id)) {
        const unlockEl = document.getElementById(`curso-card-${c.id}`);
        if (!unlockEl) return;
        const coordsU = getCardCoordinates(unlockEl, containerEl);
        if (!coordsU) return;

        newPaths.push({
          id: `unlock-${selectedCurso.id}-${c.id}`,
          type: "unlock",
          x1: coordsS.right + 2,
          y1: coordsS.centerY,
          x2: coordsU.left - 6,
          y2: coordsU.centerY,
        });
      }
    });

    setPaths(newPaths);
  }, [selectedCurso, isMobileView, getAllCursos]);

  useEffect(() => {
    recalculatePaths();

    const timer = setTimeout(recalculatePaths, 150);

    window.addEventListener("resize", recalculatePaths);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", recalculatePaths);
    };
  }, [selectedCurso, recalculatePaths]);

  // Cerrar el menú contextual al hacer clic en cualquier parte
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("contextmenu", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, [contextMenu]);

  // Manejar el clic derecho (evento ContextMenu) para abrir el menú
  const handleCursoContextMenu = useCallback((e, curso) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      curso,
    });
  }, []);

  // Manejar el cambio de estado de un curso desde el menú contextual
  const handleStatusChange = useCallback((curso, newStatus) => {
    const isAprobado = aprobados.includes(curso.id);
    const isCursando = cursando.includes(curso.id);
    const currentStatus = isAprobado ? "aprobado" : isCursando ? "cursando" : "pendiente";

    if (newStatus === currentStatus) return;

    if (newStatus === "aprobado") {
      if (currentStatus === "cursando") {
        toggleCursando(curso.id);
      }
      aprobar(curso.id);
    } else if (newStatus === "cursando") {
      if (currentStatus === "aprobado") {
        aprobar(curso.id);
      }
      toggleCursando(curso.id);
    } else if (newStatus === "pendiente") {
      if (currentStatus === "aprobado") {
        aprobar(curso.id);
      } else if (currentStatus === "cursando") {
        toggleCursando(curso.id);
      }
    }
  }, [aprobados, cursando, aprobar, toggleCursando]);

  // Alternar aprobado con clic izquierdo
  const handleCursoLeftClick = useCallback((curso) => {
    const isAprobado = aprobados.includes(curso.id);
    if (isAprobado) {
      handleStatusChange(curso, "pendiente");
    } else {
      handleStatusChange(curso, "aprobado");
    }
  }, [aprobados, handleStatusChange]);

  // Alternar cursando con clic largo (hold / long-press)
  const handleCursoLongPress = useCallback((curso) => {
    const isCursando = cursando.includes(curso.id);
    if (isCursando) {
      handleStatusChange(curso, "pendiente");
    } else {
      handleStatusChange(curso, "cursando");
    }
  }, [cursando, handleStatusChange]);

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

  const renderSemestreCard = (info, semNumero) => {
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
        className="flex flex-col gap-2.5 w-[80vw] sm:w-[210px] md:w-[220px] shrink-0 snap-center sm:snap-align-none py-1 px-0.5"
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

        <div className="flex flex-col gap-2">
          {cursosList.map((c) => (
            <Curso
              key={c.id}
              curso={c}
              aprobado={aprobados.includes(c.id)}
              excepcional={excepciones.includes(c.id)}
              disponible={cumplePrereqs(c)}
              enCurso={cursando.includes(c.id)}
              onSelect={(cursoObj) => setSelectedCurso((prev) => prev?.id === cursoObj.id ? null : cursoObj)}
              onLeftClick={handleCursoLeftClick}
              onLongPress={handleCursoLongPress}
              onContextMenu={handleCursoContextMenu}
              highlightStatus={getHighlightStatus(c.id)}
            />
          ))}
        </div>
      </motion.div>
    );
  };

  if (loadStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
        <p className="text-sm text-textSecondary">
          {loadError || getUserSafeMessage("MALLA_LOAD_FAILED")}
        </p>
        <button
          type="button"
          onClick={() => {
            // Re-trigger load by bumping effect via force state
            setLoadStatus("loading");
            setLoadError(null);
            loadIdRef.current += 1;
            const url = mallaSeleccionada?.url;
            if (!url) return;
            fetch(url)
              .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
              })
              .then((data) => {
                const isMencion = !!data.menciones;
                const mencionesDisponibles = data.menciones_disponibles || [];
                const totalSemestres =
                  data.totalSemestres || data.semestres?.length || 0;
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
                setLoadStatus("success");
                onMallaDataLoaded?.(mallaData);
              })
              .catch((err) => {
                normalizeAppError(err, { context: "MallaViewer.retry" });
                setLoadStatus("error");
                setLoadError(getUserSafeMessage("MALLA_LOAD_FAILED"));
              });
          }}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!malla || loadStatus === "loading") {
    return <p className="text-center text-textSecondary py-4">Cargando malla...</p>;
  }

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
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-textPrimary leading-none">Mi malla curricular</h1>
            <p className="text-[10px] text-textSecondary/80 font-bold mt-1 uppercase tracking-wide truncate">
              {/\([A-Za-z\s.]+\)$/.test(malla.nombre) ? malla.nombre : `${malla.nombre} (${uni})`}
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

            {/* Actions: Ocultar Completados and Pantalla Completa buttons */}
            <div className="flex items-center gap-1.5 ml-1.5 pl-2.5 border-l border-borderColor/60">
              <button
                onClick={() => setOcultarCompletados(!ocultarCompletados)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 cursor-pointer
                  ${ocultarCompletados
                    ? "bg-primary text-white border-primary"
                    : "bg-bgPrimary/60 text-textSecondary border-borderColor hover:text-primary hover:border-primary/40"}
                `}
                title={ocultarCompletados ? "Mostrar todos los semestres" : "Ocultar semestres completados"}
              >
                {ocultarCompletados ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{ocultarCompletados ? "Mostrar todo" : "Ocultar completados"}</span>
              </button>

              <button
                type="button"
                onClick={enterFullscreenMalla}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-borderColor bg-bgPrimary/60 text-textSecondary hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
                title="Ver malla en pantalla completa"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pantalla completa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specialty and display filters bar (only if menciones exist) */}
      {malla.isMencion && malla.mencionesDisponibles.length > 0 && (
        <div
          ref={controlsRef}
          className="mobile-malla-controls flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2 sm:gap-3 mb-3 px-2 sm:pr-2 shrink-0 select-none"
        >
          {malla.mencionesDisponibles.length > 3 ? (
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
          )}
        </div>
      )}

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
              id="malla-grid-container"
              onClick={(e) => {
                if (!e.target.closest(".curso-card-base")) {
                  setSelectedCurso(null);
                }
              }}
              className="flex gap-4 sm:gap-5 md:gap-6 min-w-max py-2 relative"
              style={{ 
                 backfaceVisibility: "hidden",
                 transform: "translateZ(0)",
                 position: "relative"
              }}
            >
              {/* Connection lines SVG overlay */}
              {paths.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full z-10 overflow-visible">
                  <defs>
                    <marker
                      id="arrow-prereq"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" className="opacity-80" />
                    </marker>
                    <marker
                      id="arrow-unlock"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" className="opacity-80" />
                    </marker>
                  </defs>

                  {paths.map((p) => {
                    const { x1, y1, x2, y2 } = p;
                    
                    // Camino más corto (curva Bezier directa)
                    // Para columnas adyacentes, controlamos la curvatura a la mitad de la separación para que baje por el canal vacío.
                    // Para columnas no adyacentes, trazamos un camino directo suave.
                    const dx = Math.abs(x2 - x1) < 100 
                      ? (x2 - x1) / 2 
                      : Math.max(Math.abs(x2 - x1) * 0.4, 30);
                      
                    const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                    
                    const strokeColor = p.type === "prereq" ? "#f59e0b" : "#10b981";
                    const markerId = p.type === "prereq" ? "url(#arrow-prereq)" : "url(#arrow-unlock)";

                    return (
                      <g key={p.id}>
                        {/* Glowing backdrop path */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="3.5"
                          className="opacity-25 blur-[1.5px]"
                        />
                        {/* Main path */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          markerEnd={markerId}
                          className="opacity-80 transition-all duration-300 neon-flow-path"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}
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
                            ? "sm:min-w-[440px] md:min-w-[464px]" 
                            : "sm:min-w-[210px] md:min-w-[220px]"
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

                        <div className="flex gap-4 sm:gap-5 md:gap-6">
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

      {/* Context Menu Portal */}
      {contextMenu && createPortal(
        <div
          className="fixed z-[99999] bg-bgSecondary/95 backdrop-blur-md border border-borderColor rounded-xl shadow-2xl p-1.5 min-w-[180px] flex flex-col gap-0.5"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-textSecondary uppercase tracking-wider select-none border-b border-borderColor/50 mb-1">
            {contextMenu.curso.nombre}
          </div>
          
          <button
            onClick={() => {
              handleStatusChange(contextMenu.curso, "aprobado");
              setContextMenu(null);
            }}
            className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer
              ${aprobados.includes(contextMenu.curso.id)
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "text-textPrimary hover:bg-bgPrimary"}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprobado</span>
          </button>

          <button
            onClick={() => {
              handleStatusChange(contextMenu.curso, "cursando");
              setContextMenu(null);
            }}
            className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer
              ${cursando.includes(contextMenu.curso.id)
                ? "bg-primary/10 text-primary"
                : "text-textPrimary hover:bg-bgPrimary"}`}
          >
            <Circle className="w-2.5 h-2.5 fill-primary/30" />
            <span>Cursando</span>
          </button>

          <button
            onClick={() => {
              handleStatusChange(contextMenu.curso, "pendiente");
              setContextMenu(null);
            }}
            className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer
              ${!aprobados.includes(contextMenu.curso.id) && !cursando.includes(contextMenu.curso.id)
                ? "bg-borderColor/20 text-textSecondary"
                : "text-textPrimary hover:bg-bgPrimary"}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pendiente</span>
          </button>

          {/* Exceptional status */}
          {modoExcepcional && (
            <button
              onClick={() => {
                marcarExcepcional(contextMenu.curso.id);
                setContextMenu(null);
              }}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer
                ${excepciones.includes(contextMenu.curso.id)
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "text-textPrimary hover:bg-bgPrimary"}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{excepciones.includes(contextMenu.curso.id) ? "Desmarcar Excepcional" : "Forzar Excepcional"}</span>
            </button>
          )}

          {/* Grade management */}
          {(cursando.includes(contextMenu.curso.id) || aprobados.includes(contextMenu.curso.id) || excepciones.includes(contextMenu.curso.id)) && (
            <>
              <div className="h-[1px] bg-borderColor/50 my-1" />
              <button
                onClick={() => {
                  setContextMenu(null);
                  onAbrirNotas?.(contextMenu.curso, cursando.includes(contextMenu.curso.id), aprobados.includes(contextMenu.curso.id));
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-semibold rounded-lg text-left text-textPrimary hover:bg-bgPrimary cursor-pointer"
              >
                <NotebookPen className="w-3.5 h-3.5" />
                <span>Gestionar notas</span>
              </button>
            </>
          )}
        </div>,
        document.body
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
