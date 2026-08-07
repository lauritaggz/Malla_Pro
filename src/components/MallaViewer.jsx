import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import {
  Eye, EyeOff, BookMarked, ChevronDown, Maximize2, X, AlertTriangle,
  Clock, Circle, CheckCircle2, NotebookPen, ListChecks
} from "lucide-react";
import Curso from "./Curso";
import CourseDrawer from "./CourseDrawer";
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
import { fetchMallaJson, mapMallaData } from "../utils/mallasLoader";

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
  const [courseDrawerOpen, setCourseDrawerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [paths, setPaths] = useState([]);
  const [shakeCursoId, setShakeCursoId] = useState(null);
  const shakeTimerRef = useRef(null);

  // Ref y estados para drag horizontal
  const scrollRef = useRef(null);
  const controlsRef = useRef(null);
  const fullscreenShellRef = useRef(null);
  const marcarHastaRef = useRef(null);
  const dragMovedRef = useRef(0);
  const loadIdRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreenMalla, setFullscreenMalla] = useState(false);
  const [marcarHastaOpen, setMarcarHastaOpen] = useState(false);
  const [marcarHastaFlash, setMarcarHastaFlash] = useState(false);
  const [marcarHastaPos, setMarcarHastaPos] = useState({ top: 0, left: 0, width: 200 });
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
        const data = await fetchMallaJson(mallaSeleccionada.url);
        if (loadId !== loadIdRef.current) return;

        const mallaData = mapMallaData(data);

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
        if (mallaData.isMencion && mallaData.mencionesDisponibles.length > 0) {
          const storedMencion = safeStorage.getRaw(
            `malla-mencion-${mallaData.nombre}`
          );
          if (
            storedMencion &&
            mallaData.mencionesDisponibles.some((m) => m.codigo === storedMencion)
          ) {
            setMencionActiva(storedMencion);
          } else {
            setMencionActiva(mallaData.mencionesDisponibles[0].codigo);
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

  // En desarrollo: al volver a la pestaña, recargar JSON por si se editó public/mallas
  useEffect(() => {
    if (!import.meta.env.DEV || !mallaSeleccionada?.url) return;

    const reloadOnFocus = () => {
      if (document.visibilityState !== "visible") return;
      loadIdRef.current += 1;
      const loadId = loadIdRef.current;
      fetchMallaJson(mallaSeleccionada.url)
        .then((data) => {
          if (loadId !== loadIdRef.current) return;
          setMalla(mapMallaData(data));
          setLoadStatus("success");
        })
        .catch(() => {
          /* silencioso en hot-reload de edición */
        });
    };

    document.addEventListener("visibilitychange", reloadOnFocus);
    window.addEventListener("focus", reloadOnFocus);
    return () => {
      document.removeEventListener("visibilitychange", reloadOnFocus);
      window.removeEventListener("focus", reloadOnFocus);
    };
  }, [mallaSeleccionada?.url]);

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

  const getCursoById = useCallback(
    (id) => getAllCursos().find((c) => Number(c.id) === Number(id)),
    [getAllCursos]
  );

  const getDescendientes = (id, todasLasMallas) => {
    const idNum = Number(id);
    const hijos = todasLasMallas.filter((c) =>
      (c.prerrequisitos || []).some((pre) => Number(pre) === idNum)
    );
    let descendientes = [...hijos.map((h) => h.id)];
    hijos.forEach((h) => {
      descendientes = [...descendientes, ...getDescendientes(h.id, todasLasMallas)];
    });
    return Array.from(new Set(descendientes));
  };

  // Mantener selectedCurso alineado con la malla cargada (prerreqs actualizados)
  useEffect(() => {
    if (!selectedCurso || !malla) return;
    const fresh = getAllCursos().find(
      (c) => Number(c.id) === Number(selectedCurso.id)
    );
    if (!fresh) {
      setSelectedCurso(null);
      setPaths([]);
      return;
    }
    const prevKey = JSON.stringify(selectedCurso.prerrequisitos || []);
    const nextKey = JSON.stringify(fresh.prerrequisitos || []);
    if (
      prevKey !== nextKey ||
      selectedCurso.nombre !== fresh.nombre ||
      selectedCurso.codigo !== fresh.codigo
    ) {
      setSelectedCurso(fresh);
    }
  }, [malla, selectedCurso, getAllCursos]);

  // Cumple prerrequisitos (IDs normalizados para evitar fallos string/number)
  const cumplePrereqs = useCallback((curso) => {
    if (!curso?.prerrequisitos?.length) return true;
    return curso.prerrequisitos.every((pre) => {
      const preId = Number(pre);
      return (
        aprobados.some((id) => Number(id) === preId) ||
        excepciones.some((id) => Number(id) === preId)
      );
    });
  }, [aprobados, excepciones]);

  const triggerBlockedShake = useCallback((cursoId) => {
    if (cursoId == null) return;
    if (shakeTimerRef.current) {
      window.clearTimeout(shakeTimerRef.current);
    }
    setShakeCursoId(cursoId);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([35, 45, 35]);
    }
    shakeTimerRef.current = window.setTimeout(() => {
      setShakeCursoId((current) => (current === cursoId ? null : current));
      shakeTimerRef.current = null;
    }, 420);
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const canMarkProgress = useCallback(
    (curso) => Boolean(modoExcepcional || cumplePrereqs(curso)),
    [modoExcepcional, cumplePrereqs]
  );

  // Aprobar o desmarcar ramo
  const aprobar = useCallback((id) => {
    const curso = getCursoById(id);
    const willApprove = !aprobados.includes(id);

    if (willApprove && curso && !canMarkProgress(curso)) {
      triggerBlockedShake(id);
      return false;
    }

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
    return true;
  }, [
    aprobados,
    canMarkProgress,
    getAllCursos,
    getCursoById,
    mallaSeleccionada,
    triggerBlockedShake,
  ]);

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
  const toggleCursando = useCallback((id) => {
    const curso = getCursoById(id);
    const willEnable = !cursando.includes(id);

    if (willEnable && curso && !canMarkProgress(curso)) {
      triggerBlockedShake(id);
      return false;
    }

    trackToggleCursoEstado(
      mallaSeleccionada,
      curso,
      willEnable ? "en_curso_on" : "en_curso_off"
    );

    setCursando((prevCursando) => {
      if (prevCursando.includes(id)) {
        return prevCursando.filter((c) => c !== id);
      }
      return [...prevCursando, id];
    });
    return true;
  }, [
    canMarkProgress,
    cursando,
    getCursoById,
    mallaSeleccionada,
    triggerBlockedShake,
  ]);

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

    // Siempre leer prerreqs desde la malla actual (no el snapshot viejo)
    const liveCurso = getCursoById(selectedCurso.id) || selectedCurso;
    const selectedId = Number(liveCurso.id);

    const containerEl = document.getElementById("malla-grid-container");
    const selectedEl = document.getElementById(`curso-card-${liveCurso.id}`);
    if (!containerEl || !selectedEl) return;

    const coordsS = getCardCoordinates(selectedEl, containerEl);
    if (!coordsS) return;

    const newPaths = [];

    // 1. Prerrequisitos (P -> S)
    (liveCurso.prerrequisitos || []).forEach((preId) => {
      const preEl =
        document.getElementById(`curso-card-${preId}`) ||
        document.getElementById(`curso-card-${Number(preId)}`);
      if (!preEl) return;
      const coordsP = getCardCoordinates(preEl, containerEl);
      if (!coordsP) return;

      newPaths.push({
        id: `pre-${preId}-${liveCurso.id}`,
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
      const unlocks = (c.prerrequisitos || []).some(
        (pre) => Number(pre) === selectedId
      );
      if (!unlocks) return;
      const unlockEl = document.getElementById(`curso-card-${c.id}`);
      if (!unlockEl) return;
      const coordsU = getCardCoordinates(unlockEl, containerEl);
      if (!coordsU) return;

      newPaths.push({
        id: `unlock-${liveCurso.id}-${c.id}`,
        type: "unlock",
        x1: coordsS.right + 2,
        y1: coordsS.centerY,
        x2: coordsU.left - 6,
        y2: coordsU.centerY,
      });
    });

    setPaths(newPaths);
  }, [selectedCurso, isMobileView, getAllCursos, getCursoById]);

  useEffect(() => {
    recalculatePaths();

    const timer = setTimeout(recalculatePaths, 150);

    window.addEventListener("resize", recalculatePaths);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", recalculatePaths);
    };
  }, [selectedCurso, malla, recalculatePaths]);

  // Cerrar el menú contextual al hacer clic en cualquier parte
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = (e) => {
      if (e?.target?.closest?.("[data-curso-context-menu]")) return;
      setContextMenu(null);
    };
    // Retraso: evita que el touchend/click sintético del long-press cierre el menú al instante
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClose);
      window.addEventListener("contextmenu", handleClose);
      window.addEventListener("touchstart", handleClose, { passive: true });
    }, 120);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClose);
      window.removeEventListener("contextmenu", handleClose);
      window.removeEventListener("touchstart", handleClose);
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

  // Manejar el cambio de estado de un curso desde el menú contextual / gestos
  const handleStatusChange = useCallback((curso, newStatus) => {
    const isAprobado = aprobados.includes(curso.id);
    const isCursando = cursando.includes(curso.id);
    const currentStatus = isAprobado ? "aprobado" : isCursando ? "cursando" : "pendiente";

    if (newStatus === currentStatus) return false;

    // Bloquear subir a aprobado/cursando si faltan prerrequisitos
    if (
      (newStatus === "aprobado" || newStatus === "cursando") &&
      !canMarkProgress(curso)
    ) {
      triggerBlockedShake(curso.id);
      return false;
    }

    if (newStatus === "aprobado") {
      if (currentStatus === "cursando") {
        toggleCursando(curso.id);
      }
      return aprobar(curso.id);
    }

    if (newStatus === "cursando") {
      if (currentStatus === "aprobado") {
        aprobar(curso.id);
      }
      return toggleCursando(curso.id);
    }

    if (newStatus === "pendiente") {
      if (currentStatus === "aprobado") {
        return aprobar(curso.id);
      }
      if (currentStatus === "cursando") {
        return toggleCursando(curso.id);
      }
    }

    return false;
  }, [aprobados, cursando, canMarkProgress, aprobar, toggleCursando, triggerBlockedShake]);

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

  // Aprobar hasta semestre (UI local + evento global por compatibilidad)
  const aprobarHastaSemestre = useCallback((semestreLimite) => {
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
    setMarcarHastaFlash(true);
    window.setTimeout(() => setMarcarHastaFlash(false), 700);
  }, [malla, mencionActiva]);

  useEffect(() => {
    const handler = (e) => aprobarHastaSemestre(e.detail);
    window.addEventListener("aprobarHastaSemestre", handler);
    return () => window.removeEventListener("aprobarHastaSemestre", handler);
  }, [aprobarHastaSemestre]);

  useEffect(() => {
    if (!marcarHastaOpen) return;

    const updatePos = () => {
      const el = marcarHastaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuWidth = Math.min(220, window.innerWidth - 16);
      let left = rect.left;
      // Evitar que el menú se corte por la izquierda o derecha
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      if (left < 8) left = 8;
      setMarcarHastaPos({
        top: rect.bottom + 8,
        left,
        width: menuWidth,
      });
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);

    const onPointerDown = (e) => {
      if (marcarHastaRef.current?.contains(e.target)) return;
      if (e.target?.closest?.("[data-marcar-hasta-menu]")) return;
      setMarcarHastaOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMarcarHastaOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [marcarHastaOpen]);

  // Drag horizontal (solo desktop; en móvil usamos scroll nativo del carrusel)
  const bind = useDrag(
    ({ first, last, event }) => {
      if (isMobileView) return;
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
      pointer: { touch: !isMobileView },
      eventOptions: { passive: true },
      preventDefault: false,
      enabled: !isMobileView,
    }
  );

  const handleClickCapture = (e) => {
    if (isMobileView) return;
    if (dragMovedRef.current > 3) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const openCourseRelations = useCallback(
    (cursoObj) => {
      if (!cursoObj) return;
      if (isMobileView) {
        setSelectedCurso(cursoObj);
        setCourseDrawerOpen(true);
        setContextMenu(null);
        return;
      }
      setSelectedCurso((prev) => (prev?.id === cursoObj.id ? null : cursoObj));
    },
    [isMobileView]
  );

  const closeCourseDrawer = useCallback(() => {
    setCourseDrawerOpen(false);
  }, []);

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

  // Path highlight status
  const getHighlightStatus = (cursoId) => {
    if (!selectedCurso) return "normal";
    // En móvil el panel PR reemplaza las flechas: no atenuamos ni bloqueamos ramos.
    if (isMobileView) return "normal";
    const liveSelected = getCursoById(selectedCurso.id) || selectedCurso;
    const selectedId = Number(liveSelected.id);
    const targetId = Number(cursoId);

    if (selectedId === targetId) return "selected";
    if (
      (liveSelected.prerrequisitos || []).some((pre) => Number(pre) === targetId)
    ) {
      return "prereq";
    }

    // Check if immediate unlock
    const isImmediateUnlock = (getCursoById(cursoId)?.prerrequisitos || []).some(
      (pre) => Number(pre) === selectedId
    );
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
              shake={shakeCursoId === c.id}
              onSelect={openCourseRelations}
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
            setLoadStatus("loading");
            setLoadError(null);
            loadIdRef.current += 1;
            const loadId = loadIdRef.current;
            const url = mallaSeleccionada?.url;
            if (!url) return;
            fetchMallaJson(url)
              .then((data) => {
                if (loadId !== loadIdRef.current) return;
                const mallaData = mapMallaData(data);
                setMalla(mallaData);
                setLoadStatus("success");
                onMallaDataLoaded?.(mallaData);
              })
              .catch((err) => {
                if (loadId !== loadIdRef.current) return;
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
        <div className="malla-toolbar overflow-visible flex flex-col gap-2 py-2 px-3 mb-3 border border-borderColor/60 bg-bgSecondary/30 rounded-2xl select-none shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2 sm:px-3.5">
          <div className="flex flex-col min-w-0 sm:max-w-[38%] lg:max-w-[42%]">
            <h1 className="text-sm sm:text-base font-bold text-textPrimary leading-none">Mi malla curricular</h1>
            <p className="text-[10px] text-textSecondary/80 font-bold mt-0.5 uppercase tracking-wide truncate">
              {/\([A-Za-z\s.]+\)$/.test(malla.nombre) ? malla.nombre : `${malla.nombre} (${uni})`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-xs text-textSecondary font-semibold sm:justify-end sm:flex-nowrap min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats.aprobados} aprobados
              </span>
              <span className="opacity-45">•</span>
              <span className="flex items-center gap-1 text-primary whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {stats.cursando} cursando
              </span>
              <span className="opacity-45">•</span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-borderColor" />
                {stats.pendientes} pendientes
              </span>
              <span className="opacity-45">•</span>
              <span className="text-textPrimary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                {stats.pct}% de avance
              </span>
            </div>

            {/* Actions: Marcar Hasta, Ocultar Completados, Pantalla Completa */}
            <div className="flex items-center gap-1.5 sm:ml-1 sm:pl-2.5 sm:border-l border-borderColor/60 shrink-0">
              {malla?.totalSemestres > 0 && (
                <div ref={marcarHastaRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMarcarHastaOpen((v) => !v)}
                    aria-expanded={marcarHastaOpen}
                    aria-haspopup="listbox"
                    aria-label="Marcar aprobados hasta un semestre"
                    className={`marcar-hasta-btn btn-interactive flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 cursor-pointer
                      ${marcarHastaOpen || marcarHastaFlash
                        ? "bg-primary text-white border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]"
                        : "bg-bgPrimary/60 text-textSecondary border-borderColor hover:text-primary hover:border-primary/40"}
                      ${marcarHastaFlash ? "marcar-hasta-flash" : ""}
                    `}
                    title="Marcar como aprobados todos los ramos hasta un semestre"
                  >
                    <ListChecks className={`w-3.5 h-3.5 transition-transform duration-300 ${marcarHastaOpen ? "scale-110" : ""}`} />
                    <span className="hidden md:inline">Marcar hasta</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ease-out ${marcarHastaOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {typeof document !== "undefined" &&
                    createPortal(
                      <AnimatePresence>
                        {marcarHastaOpen && (
                          <>
                            <motion.button
                              type="button"
                              aria-label="Cerrar menú marcar hasta"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.12 }}
                              className="fixed inset-0 z-[9998] bg-black/25 sm:bg-transparent"
                              onClick={() => setMarcarHastaOpen(false)}
                            />
                            <motion.div
                              data-marcar-hasta-menu
                              role="listbox"
                              aria-label="Semestres"
                              initial={{ opacity: 0, y: -8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.97 }}
                              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
                              style={{
                                top: marcarHastaPos.top,
                                left: marcarHastaPos.left,
                                width: marcarHastaPos.width,
                              }}
                              className="marcar-hasta-menu fixed z-[9999] max-h-[min(60vh,320px)] overflow-y-auto rounded-xl border border-borderColor/80 bg-bgSecondary shadow-[0_12px_32px_rgba(0,0,0,0.22)] py-1.5"
                            >
                              <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-textSecondary/70">
                                Aprobar hasta
                              </p>
                              {Array.from({ length: malla.totalSemestres }).map((_, i) => (
                                <motion.button
                                  key={i}
                                  type="button"
                                  role="option"
                                  initial={{ opacity: 0, x: 8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: Math.min(i * 0.025, 0.2), duration: 0.15 }}
                                  onClick={() => {
                                    aprobarHastaSemestre(i + 1);
                                    setMarcarHastaOpen(false);
                                  }}
                                  className="marcar-hasta-item group w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-textSecondary hover:text-textPrimary hover:bg-primary/10 active:bg-primary/15 transition-colors"
                                >
                                  <span className="font-medium">Semestre {i + 1}</span>
                                  <CheckCircle2 className="w-3.5 h-3.5 opacity-40 text-primary sm:opacity-0 sm:-translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
                                </motion.button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>,
                      document.body
                    )}
                </div>
              )}

              <button
                onClick={() => setOcultarCompletados(!ocultarCompletados)}
                className={`btn-interactive flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 cursor-pointer
                  ${ocultarCompletados
                    ? "bg-primary text-white border-primary"
                    : "bg-bgPrimary/60 text-textSecondary border-borderColor hover:text-primary hover:border-primary/40"}
                `}
                title={ocultarCompletados ? "Mostrar todos los semestres" : "Ocultar semestres completados"}
              >
                {ocultarCompletados ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{ocultarCompletados ? "Mostrar todo" : "Ocultar completados"}</span>
              </button>

              <button
                type="button"
                onClick={enterFullscreenMalla}
                className="btn-interactive flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-borderColor bg-bgPrimary/60 text-textSecondary hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
                title="Ver malla en pantalla completa"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pantalla completa</span>
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
          data-curso-context-menu
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
                : !canMarkProgress(contextMenu.curso)
                ? "text-textSecondary/70 hover:bg-bgPrimary"
                : "text-textPrimary hover:bg-bgPrimary"}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              Aprobado
              {!canMarkProgress(contextMenu.curso) && !aprobados.includes(contextMenu.curso.id)
                ? " (bloqueado)"
                : ""}
            </span>
          </button>

          <button
            onClick={() => {
              handleStatusChange(contextMenu.curso, "cursando");
              setContextMenu(null);
            }}
            className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer
              ${cursando.includes(contextMenu.curso.id)
                ? "bg-primary/10 text-primary"
                : !canMarkProgress(contextMenu.curso)
                ? "text-textSecondary/70 hover:bg-bgPrimary"
                : "text-textPrimary hover:bg-bgPrimary"}`}
          >
            <Circle className="w-2.5 h-2.5 fill-primary/30" />
            <span>
              Cursando
              {!canMarkProgress(contextMenu.curso) && !cursando.includes(contextMenu.curso.id)
                ? " (bloqueado)"
                : ""}
            </span>
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

      <CourseDrawer
        isOpen={courseDrawerOpen && !!selectedCurso}
        onClose={() => {
          closeCourseDrawer();
          setSelectedCurso(null);
        }}
        curso={selectedCurso}
        aprobado={selectedCurso ? aprobados.includes(selectedCurso.id) : false}
        excepcional={selectedCurso ? excepciones.includes(selectedCurso.id) : false}
        disponible={selectedCurso ? cumplePrereqs(selectedCurso) : true}
        modoExcepcional={modoExcepcional}
        enCurso={selectedCurso ? cursando.includes(selectedCurso.id) : false}
        aprobar={() => selectedCurso && aprobar(selectedCurso.id)}
        marcarExcepcional={() => selectedCurso && marcarExcepcional(selectedCurso.id)}
        toggleCursando={() => selectedCurso && toggleCursando(selectedCurso.id)}
        onBlockedAttempt={() => selectedCurso && triggerBlockedShake(selectedCurso.id)}
        onAbrirNotas={(c) =>
          onAbrirNotas?.(
            c,
            cursando.includes(c.id),
            aprobados.includes(c.id)
          )
        }
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
