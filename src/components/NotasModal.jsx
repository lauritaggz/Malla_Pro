import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Plus, ChevronDown, Share2, Download } from "lucide-react";
import { parseGrade } from "../utils/gradeUtils";
import DrawerPanel from "./DrawerPanel";
import ShareCourseConfigModal from "./ShareCourseConfigModal";
import ImportCourseConfigModal from "./ImportCourseConfigModal";
import { safeStorage } from "../utils/safeStorage";
import { LEGACY_KEYS } from "../utils/storageKeys";
import { formatPeso, roundPeso } from "../utils/shareCourseConfig";

export default function NotasModal({
  curso,
  enCurso,
  aprobado,
  onClose,
  isOpen,
  mallaSeleccionada = null,
}) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [nuevaEval, setNuevaEval] = useState({
    nombre: "",
    peso: "",
    nota: "",
  });
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFeedback, setImportFeedback] = useState("");
  const shareOpenRef = useRef(false);
  const importOpenRef = useRef(false);
  const importFeedbackTimerRef = useRef(null);

  // Configuración de Eximición y Examen
  const [config, setConfig] = useState({
    notaEximicion: 5.0,
    ponderacionPresentacion: 70,
    ponderacionExamen: 30,
  });
  const [notaExamen, setNotaExamen] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [removed, setRemoved] = useState(null); // { ev, at } para poder deshacer
  const removedTimerRef = useRef(null);

  // Para manejar el panel de sub-notas (controles)
  const [openSubNotas, setOpenSubNotas] = useState([]); // ids de evaluaciones abiertas
  const [subNotaInputs, setSubNotaInputs] = useState({}); // { [evalId]: "valor" }

  useEffect(() => {
    return () => {
      if (importFeedbackTimerRef.current) {
        window.clearTimeout(importFeedbackTimerRef.current);
      }
      if (removedTimerRef.current) {
        window.clearTimeout(removedTimerRef.current);
      }
    };
  }, []);

  const openShare = () => {
    importOpenRef.current = false;
    setImportOpen(false);
    shareOpenRef.current = true;
    setShareOpen(true);
  };

  const openImport = () => {
    shareOpenRef.current = false;
    setShareOpen(false);
    importOpenRef.current = true;
    setImportOpen(true);
  };

  // Helper para mostrar decimales sin crashear si el valor no es número
  const safeToFixed = (val, dec = 2) => {
    const num = typeof val === "string" ? parseGrade(val) : val;
    return typeof num === "number" && !isNaN(num) ? num.toFixed(dec) : "--";
  };

  // Cargar evaluaciones del curso desde localStorage
  useEffect(() => {
    if (curso) {
      const notasGuardadas = safeStorage.get(LEGACY_KEYS.notas, {});
      const evals = notasGuardadas[curso.id] || [];
      setEvaluaciones(evals);
      setOpenSubNotas([]);
      setSubNotaInputs({});
      setError("");
      setShowAddForm(false);
      setShowConfig(false);
      setShareOpen(false);
      shareOpenRef.current = false;
      setImportOpen(false);
      importOpenRef.current = false;
      setImportFeedback("");
      setRemoved(null);
      if (importFeedbackTimerRef.current) {
        window.clearTimeout(importFeedbackTimerRef.current);
      }

      const configsGuardadas = safeStorage.get(LEGACY_KEYS.configs, {});
      setConfig(configsGuardadas[curso.id] || {
        notaEximicion: 5.0,
        ponderacionPresentacion: 70,
        ponderacionExamen: 30,
      });

      const examenesGuardados = safeStorage.get(LEGACY_KEYS.examenes, {});
      setNotaExamen(examenesGuardados[curso.id] || "");
    }
  }, [curso]);

  // Guardar evaluaciones en localStorage
  const guardarEvaluaciones = (evals) => {
    const notasGuardadas = safeStorage.get(LEGACY_KEYS.notas, {});
    notasGuardadas[curso.id] = evals;
    safeStorage.set(LEGACY_KEYS.notas, notasGuardadas);
    setEvaluaciones(evals);
    window.dispatchEvent(new Event("notasModificadas"));
  };

  const guardarConfig = (newConfig) => {
    const configs = safeStorage.get(LEGACY_KEYS.configs, {});
    configs[curso.id] = newConfig;
    safeStorage.set(LEGACY_KEYS.configs, configs);
    setConfig(newConfig);
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    if (name === "notaEximicion") {
      const parsedValue = parseGrade(value);
      const newConfig = { ...config, [name]: parsedValue ?? value };
      guardarConfig(newConfig);
    } else {
      const parsedValue = parseFloat(value);
      const newConfig = { ...config, [name]: isNaN(parsedValue) ? "" : parsedValue };
      guardarConfig(newConfig);
    }
  };

  const handleNotaExamenChange = (e) => {
    const value = e.target.value;
    const examenes = safeStorage.get(LEGACY_KEYS.examenes, {});
    examenes[curso.id] = value;
    safeStorage.set(LEGACY_KEYS.examenes, examenes);
    setNotaExamen(value);
    window.dispatchEvent(new Event("notasModificadas"));
  };

  // ---------- UTILIDADES PARA SUB-NOTAS (CONTROLES) ----------

  const toggleSubNotasPanel = (evalId) => {
    setOpenSubNotas((prev) =>
      prev.includes(evalId)
        ? prev.filter((id) => id !== evalId)
        : [...prev, evalId]
    );
  };

  const handleSubNotaInputChange = (evalId, value) => {
    setSubNotaInputs((prev) => ({ ...prev, [evalId]: value }));
  };

  const actualizarSubNotas = (evalId, nuevasSubNotas) => {
    const evalsActualizadas = evaluaciones.map((e) => {
      if (e.id !== evalId) return e;

      const subNotasNumericas = nuevasSubNotas.filter(
        (s) => typeof s.nota === "number" && !isNaN(s.nota)
      );
      const promedio =
        subNotasNumericas.length > 0
          ? subNotasNumericas.reduce((sum, s) => sum + s.nota, 0) /
            subNotasNumericas.length
          : null;

      // La nota de la evaluación pasa a ser el promedio de sub-notas
      return {
        ...e,
        subNotas: nuevasSubNotas,
        nota: promedio,
      };
    });

    guardarEvaluaciones(evalsActualizadas);
  };

  const agregarSubNota = (evalId) => {
    const valorRaw = subNotaInputs[evalId];
    if (!valorRaw) return;
    const nota = parseGrade(valorRaw);

    if (nota === null) return;

    const evalTarget = evaluaciones.find((e) => e.id === evalId);
    const subActuales = evalTarget?.subNotas || [];

    const nuevasSubNotas = [
      ...subActuales,
      { id: Date.now(), nota: parseFloat(nota.toFixed(1)) },
    ];

    actualizarSubNotas(evalId, nuevasSubNotas);
    setSubNotaInputs((prev) => ({ ...prev, [evalId]: "" }));
  };

  const eliminarSubNota = (evalId, subId) => {
    const evalTarget = evaluaciones.find((e) => e.id === evalId);
    if (!evalTarget) return;

    const nuevasSubNotas = (evalTarget.subNotas || []).filter(
      (s) => s.id !== subId
    );
    actualizarSubNotas(evalId, nuevasSubNotas);
  };

  // ---------- CRUD EVALUACIONES ----------

  // Agregar evaluación
  const agregarEvaluacion = () => {
    const peso = parseFloat(typeof nuevaEval.peso === 'string' ? nuevaEval.peso.replace(",", ".") : nuevaEval.peso);
    const nota = parseGrade(nuevaEval.nota);

    if (!nuevaEval.nombre.trim()) {
      setError("El nombre de la evaluación es requerido");
      return;
    }
    if (isNaN(peso) || peso <= 0 || peso > 100) {
      setError("El porcentaje debe ser entre 1 y 100");
      return;
    }

    const pesoTotalNuevo = roundPeso(
      evaluaciones.reduce((sum, e) => sum + e.peso, 0) + peso
    );
    if (pesoTotalNuevo > 100) {
      setError(`El porcentaje total excede 100% (actual: ${formatPeso(pesoTotalNuevo)}%)`);
      return;
    }

    if (nuevaEval.nota && nota === null) {
      setError("La nota debe estar entre 1.0 y 7.0");
      return;
    }

    const nuevaEvaluacion = {
      id: Date.now(),
      nombre: nuevaEval.nombre.trim(),
      peso: peso,
      nota: nota,
      subNotas: [], // siempre lo dejamos preparado para sub-notas
    };

    guardarEvaluaciones([...evaluaciones, nuevaEvaluacion]);
    setNuevaEval({ nombre: "", peso: "", nota: "" });
    setError("");
    setShowAddForm(false);
  };

  // Eliminar evaluación
  const eliminarEvaluacion = (id) => {
    const at = evaluaciones.findIndex((e) => e.id === id);
    if (at === -1) return;
    setRemoved({ ev: evaluaciones[at], at });
    if (removedTimerRef.current) window.clearTimeout(removedTimerRef.current);
    removedTimerRef.current = window.setTimeout(() => setRemoved(null), 7000);
    guardarEvaluaciones(evaluaciones.filter((e) => e.id !== id));
    setOpenSubNotas((prev) => prev.filter((pid) => pid !== id));
  };

  const deshacerEliminar = () => {
    if (!removed) return;
    const next = [...evaluaciones];
    next.splice(Math.min(removed.at, next.length), 0, removed.ev);
    guardarEvaluaciones(next);
    setRemoved(null);
    if (removedTimerRef.current) window.clearTimeout(removedTimerRef.current);
  };

  const actualizarNota = (id, nuevaNota) => {
    const nota = parseGrade(nuevaNota);
    if (nota === null && nuevaNota !== "") return;

    const evals = evaluaciones.map((e) => {
      if (e.id !== id) return e;
      return { ...e, nota: nota };
    });

    guardarEvaluaciones(evals);
  };

  // ---------- CÁLCULOS GENERALES ----------

  const pesoAsignadoRaw = evaluaciones.reduce(
    (sum, e) => sum + (typeof e.peso === "number" ? e.peso : 0),
    0
  );
  const pesoLibre = roundPeso(100 - pesoAsignadoRaw); // porcentaje sin asignar a ninguna evaluación

  const evaluacionesConNota = evaluaciones.filter(
    (e) => e.nota !== null && e.nota !== undefined
  );
  const pesoConNota = roundPeso(evaluacionesConNota.reduce((sum, e) => sum + e.peso, 0));
  // Lo que falta por calificar: evaluaciones sin nota más el porcentaje sin asignar
  const pesoPendiente = roundPeso(100 - pesoConNota);
  const completo = pesoConNota > 0 && pesoPendiente <= 0;
  const promedioPresentacion =
    pesoConNota > 0
      ? evaluacionesConNota.reduce((sum, e) => sum + e.nota * e.peso, 0) / pesoConNota
      : 0;

  let notaNecesariaExamen = null;
  let notaRequeridaRaw = null;
  let rindeExamen = false;
  let promedioFinal = promedioPresentacion;
  let resultadoExamen = null; // "aprobado" | "reprobado" | null

  if (completo) {
    if (promedioPresentacion >= config.notaEximicion) {
      promedioFinal = promedioPresentacion;
    } else {
      rindeExamen = true;
      const propPresentacion = config.ponderacionPresentacion / 100;
      const propExamen = config.ponderacionExamen / 100;
      const ptsFaltantes = 4.0 - promedioPresentacion * propPresentacion;
      const reqVal = propExamen > 0 ? ptsFaltantes / propExamen : 0;
      notaNecesariaExamen = Math.max(1.0, reqVal);

      const notaExamenNum = parseFloat(String(notaExamen).replace(",", "."));
      if (!isNaN(notaExamenNum) && notaExamenNum >= 1.0 && notaExamenNum <= 7.0) {
        promedioFinal = promedioPresentacion * propPresentacion + notaExamenNum * propExamen;
        resultadoExamen = promedioFinal >= 4.0 ? "aprobado" : "reprobado";
      }
    }
  } else if (pesoConNota > 0) {
    notaRequeridaRaw =
      (config.notaEximicion * 100 - promedioPresentacion * pesoConNota) / pesoPendiente;
  }

  // La respuesta que el alumno busca: qué necesita, o en qué quedó
  const fmt = (v, d = 1) => safeToFixed(v, d);
  let answerTone = "text-textPrimary";
  let answerContent = null;
  if (evaluaciones.length > 0) {
    if (pesoConNota === 0) {
      answerContent = <>Anota tu primera nota para ver cuánto necesitas.</>;
    } else if (completo && !rindeExamen) {
      answerTone = "text-approved";
      answerContent = (
        <>
          Eximido con <span className="tabular-nums">{fmt(promedioFinal, 2)}</span>
        </>
      );
    } else if (rindeExamen && resultadoExamen === "aprobado") {
      answerTone = "text-approved";
      answerContent = (
        <>
          Aprobado con examen: nota final <span className="tabular-nums">{fmt(promedioFinal, 2)}</span>
        </>
      );
    } else if (rindeExamen && resultadoExamen === "reprobado") {
      answerTone = "text-danger";
      answerContent = (
        <>
          Reprobado en el examen: nota final <span className="tabular-nums">{fmt(promedioFinal, 2)}</span>
        </>
      );
    } else if (rindeExamen) {
      answerTone = "text-exception";
      answerContent =
        notaNecesariaExamen > 7 ? (
          <>No alcanzas a aprobar con el examen.</>
        ) : (
          <>
            Rindes examen: necesitas <span className="tabular-nums">{fmt(notaNecesariaExamen, 1)}</span> para aprobar
          </>
        );
    } else if (notaRequeridaRaw <= 1) {
      answerTone = "text-approved";
      answerContent = (
        <>
          Ya estás eximido: aunque saques <span className="tabular-nums">1.0</span> en el{" "}
          <span className="tabular-nums">{formatPeso(pesoPendiente)}%</span> que falta
        </>
      );
    } else if (notaRequeridaRaw > 7) {
      answerTone = "text-exception";
      answerContent = <>No alcanzas la eximición: irás a examen.</>;
    } else {
      answerContent = (
        <>
          Necesitas <span className="tabular-nums">{fmt(notaRequeridaRaw, 1)}</span> en el{" "}
          <span className="tabular-nums">{formatPeso(pesoPendiente)}%</span> que falta para eximirte
        </>
      );
    }
  }

  if (!isOpen || !curso) return null;

  const subtitleEstado = aprobado ? "Aprobado" : enCurso ? "Cursando" : "Pendiente";

  const secondaryBtn =
    "inline-flex items-center gap-1.5 rounded-lg border border-borderColor bg-transparent px-3 py-2 text-[13px] font-medium text-textSecondary transition-colors hover:bg-borderColor/30 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer";

  return (
    <>
    <DrawerPanel
      isOpen={isOpen}
      onClose={() => {
        // Si un modal hijo está abierto, Escape/backdrop cierran solo ese
        if (shareOpenRef.current) {
          shareOpenRef.current = false;
          setShareOpen(false);
          return;
        }
        if (importOpenRef.current) {
          importOpenRef.current = false;
          setImportOpen(false);
          return;
        }
        onClose?.();
      }}
      title={curso.nombre}
      subtitle={`${curso.codigo} · ${curso.sct} SCT · ${subtitleEstado}`}
      variant="modal"
    >
      <div className="flex h-full min-h-0 flex-col overflow-y-auto">
        {importFeedback && (
          <div
            role="status"
            className="mx-5 mt-4 shrink-0 rounded-xl border border-approved/25 bg-approved/10 px-3.5 py-2.5 text-[13px] font-medium text-approved"
          >
            {importFeedback}
          </div>
        )}

        {/* Respuesta + barra de avance */}
        {evaluaciones.length > 0 && (
          <div className="shrink-0 px-5 pb-1 pt-5">
            <p
              className={`m-0 font-display text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px] ${answerTone}`}
              aria-live="polite"
            >
              {answerContent}
            </p>

            <div
              className="mt-4 flex h-9 gap-[3px]"
              role="img"
              aria-label={`Evaluado ${formatPeso(pesoConNota)} por ciento. Falta ${formatPeso(pesoPendiente)} por ciento.`}
            >
              {evaluaciones.map((ev) => {
                const graded = ev.nota !== null && ev.nota !== undefined;
                const tone = !graded
                  ? "border-dashed border-borderColor text-textSecondary"
                  : ev.nota < 4
                    ? "border-danger/40 bg-danger/15 text-textPrimary"
                    : "border-cursando/40 bg-cursando/15 text-textPrimary";
                return (
                  <div
                    key={ev.id}
                    title={ev.nombre}
                    style={{ flex: ev.peso }}
                    className={`num flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-md border px-1 text-[12px] ${tone}`}
                  >
                    {graded ? fmt(ev.nota, 1) : `${formatPeso(ev.peso)}%`}
                  </div>
                );
              })}
              {pesoLibre > 0 && (
                <div
                  style={{ flex: pesoLibre }}
                  title="Sin asignar"
                  className="num flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-md border border-dashed border-borderColor/60 px-1 text-[12px] text-textSecondary/70"
                >
                  {formatPeso(pesoLibre)}%
                </div>
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-[12px] text-textSecondary">
              <span>
                Evaluado <span className="num text-textPrimary">{formatPeso(pesoConNota)}%</span>
              </span>
              <span>
                Falta <span className="num text-textPrimary">{formatPeso(pesoPendiente)}%</span>
              </span>
            </div>
          </div>
        )}

        {evaluaciones.length > 0 && (
          <p className="m-0 flex shrink-0 flex-wrap gap-x-5 gap-y-1 px-5 pb-4 pt-3 text-[13px] text-textSecondary">
            <span>
              Promedio{" "}
              <span className="num text-textPrimary">{pesoConNota > 0 ? fmt(promedioPresentacion, 2) : "—"}</span>
            </span>
            <span>
              Eximición <span className="num text-textPrimary">{fmt(config.notaEximicion, 1)}</span>
            </span>
            <span>
              {evaluaciones.length} {evaluaciones.length === 1 ? "evaluación" : "evaluaciones"}
            </span>
          </p>
        )}

        {/* Modo examen */}
        {rindeExamen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-5 mb-4 flex shrink-0 flex-col gap-3 rounded-xl border border-exception/35 bg-exception/10 p-3.5"
          >
            <p className="m-0 text-[13px] leading-relaxed text-textSecondary">
              Tu presentación (<span className="num text-textPrimary">{fmt(promedioPresentacion, 2)}</span>) quedó bajo la
              eximición ({fmt(config.notaEximicion, 1)}). La nota final pondera {config.ponderacionPresentacion}%
              presentación y {config.ponderacionExamen}% examen.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="m-0 mb-0.5 text-[12px] text-textSecondary">Nota necesaria en el examen para aprobar (4.0)</p>
                <p className={`num m-0 text-xl ${notaNecesariaExamen > 7.0 ? "text-danger" : "text-exception"}`}>
                  {fmt(notaNecesariaExamen, 2)}
                </p>
              </div>
              <div className="shrink-0">
                <label htmlFor="nota-examen" className="mb-1 block text-[12px] font-medium text-textSecondary">
                  Nota del examen
                </label>
                <input
                  id="nota-examen"
                  type="text"
                  inputMode="decimal"
                  placeholder="5.5"
                  value={notaExamen}
                  onChange={handleNotaExamenChange}
                  className="num h-10 w-full rounded-lg border border-borderColor bg-bgPrimary px-2.5 text-center text-[15px] text-textPrimary outline-none focus:border-textPrimary sm:w-28"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Parámetros de eximición */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              id="notas-eximicion-config"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="mx-5 mb-4 rounded-xl border border-borderColor bg-bgPrimary/60 p-3.5">
                <p className="m-0 mb-3 text-[13px] font-semibold text-textPrimary">Parámetros de la nota final</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="cfg-exim" className="mb-1 block text-[12px] text-textSecondary">Nota de eximición</label>
                    <input
                      id="cfg-exim"
                      type="text"
                      inputMode="decimal"
                      name="notaEximicion"
                      value={config.notaEximicion}
                      onChange={handleConfigChange}
                      className="num h-10 w-full rounded-lg border border-borderColor bg-bgSecondary px-2.5 text-[15px] text-textPrimary outline-none focus:border-textPrimary"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-pres" className="mb-1 block text-[12px] text-textSecondary">% presentación</label>
                    <input
                      id="cfg-pres"
                      type="number"
                      value={config.ponderacionPresentacion}
                      onChange={(e) => {
                        let val = parseFloat(e.target.value);
                        if (isNaN(val)) val = 0;
                        guardarConfig({ ...config, ponderacionPresentacion: val, ponderacionExamen: 100 - val });
                      }}
                      className="num h-10 w-full rounded-lg border border-borderColor bg-bgSecondary px-2.5 text-[15px] text-textPrimary outline-none focus:border-textPrimary"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-exam" className="mb-1 block text-[12px] text-textSecondary">% examen</label>
                    <input
                      id="cfg-exam"
                      type="number"
                      value={config.ponderacionExamen}
                      onChange={(e) => {
                        let val = parseFloat(e.target.value);
                        if (isNaN(val)) val = 0;
                        guardarConfig({ ...config, ponderacionExamen: val, ponderacionPresentacion: 100 - val });
                      }}
                      className="num h-10 w-full rounded-lg border border-borderColor bg-bgSecondary px-2.5 text-[15px] text-textPrimary outline-none focus:border-textPrimary"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aviso para deshacer */}
        <AnimatePresence>
          {removed && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className="mx-5 mb-3 flex shrink-0 items-center justify-between gap-3 rounded-xl bg-primary px-3.5 py-2.5 text-[13px] text-[color:var(--on-ink)]"
            >
              <span>Quitaste «{removed.ev.nombre}».</span>
              <button
                type="button"
                onClick={deshacerEliminar}
                className="cursor-pointer border-0 bg-transparent p-0 font-semibold underline underline-offset-2"
              >
                Deshacer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Evaluaciones */}
        <div className="shrink-0">
          {evaluaciones.length === 0 ? (
            <div className="mx-5 my-5 rounded-xl border border-dashed border-borderColor px-4 py-8 text-center">
              <p className="m-0 text-[15px] font-medium text-textPrimary">Aún no hay evaluaciones</p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-textSecondary">
                Agrega tus solemnes, controles o tareas con su porcentaje, y te decimos cuánto necesitas para eximirte.
              </p>
              {!showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
                >
                  <Plus size={14} aria-hidden="true" />
                  Agregar la primera
                </button>
              )}
            </div>
          ) : (
            <div className="border-t border-borderColor">
              {evaluaciones.map((evaluacion) => {
                const tieneSubNotas = evaluacion.subNotas && evaluacion.subNotas.length > 0;
                return (
                  <div key={evaluacion.id} className="border-b border-borderColor">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_84px] items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_48px_84px_auto]">
                      <div className="min-w-0">
                        <p className="m-0 text-[14px] font-medium text-textPrimary">{evaluacion.nombre}</p>
                        {tieneSubNotas && (
                          <p className="m-0 text-[12px] text-textSecondary">
                            {evaluacion.subNotas.length} sub-notas · promedio{" "}
                            <span className="tabular-nums">{fmt(evaluacion.nota, 2)}</span>
                          </p>
                        )}
                      </div>
                      <span className="num text-right text-[13px] text-textSecondary">{formatPeso(evaluacion.peso)}%</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={evaluacion.nota ?? ""}
                        onChange={(e) => actualizarNota(evaluacion.id, e.target.value)}
                        placeholder="—"
                        aria-label={`Nota de ${evaluacion.nombre}`}
                        className="num h-10 w-full rounded-lg border border-borderColor bg-bgPrimary text-center text-[15px] text-textPrimary outline-none focus:border-textPrimary"
                      />
                      <div className="col-span-full flex items-center justify-end gap-0.5 sm:col-span-1">
                        <button
                          type="button"
                          onClick={() => toggleSubNotasPanel(evaluacion.id)}
                          aria-expanded={openSubNotas.includes(evaluacion.id)}
                          title="Desglosa esta evaluación en varias notas; la nota será su promedio"
                          className={`cursor-pointer rounded-lg border-0 px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                            openSubNotas.includes(evaluacion.id)
                              ? "bg-primary text-[color:var(--on-ink)]"
                              : "bg-transparent text-textSecondary hover:bg-borderColor/30 hover:text-textPrimary"
                          }`}
                        >
                          Desglosar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarEvaluacion(evaluacion.id)}
                          aria-label={`Quitar ${evaluacion.nombre}`}
                          className="cursor-pointer rounded-lg border-0 bg-transparent px-2.5 py-1.5 text-[13px] font-medium text-textSecondary transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>

                    {openSubNotas.includes(evaluacion.id) && (
                      <div className="flex flex-col gap-3 bg-bgPrimary/40 px-5 pb-3.5 pt-1 sm:flex-row sm:items-start">
                        <div className="flex shrink-0 gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Nueva sub-nota"
                            aria-label={`Nueva sub-nota de ${evaluacion.nombre}`}
                            value={subNotaInputs[evaluacion.id] || ""}
                            onChange={(e) => handleSubNotaInputChange(evaluacion.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") agregarSubNota(evaluacion.id);
                            }}
                            className="num h-9 w-32 rounded-lg border border-borderColor bg-bgSecondary px-2.5 text-[14px] text-textPrimary outline-none focus:border-textPrimary"
                          />
                          <button
                            type="button"
                            onClick={() => agregarSubNota(evaluacion.id)}
                            className="h-9 cursor-pointer rounded-lg border-0 bg-primary px-3 text-[14px] font-semibold text-[color:var(--on-ink)] hover:brightness-110"
                          >
                            Agregar
                          </button>
                        </div>
                        <div className="flex-1">
                          {tieneSubNotas ? (
                            <div className="flex flex-wrap gap-1.5">
                              {evaluacion.subNotas.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex items-center gap-1.5 rounded-md border border-borderColor bg-bgSecondary px-2 py-1 text-[13px]"
                                >
                                  <span className="num text-textPrimary">{fmt(sub.nota, 1)}</span>
                                  <button
                                    type="button"
                                    onClick={() => eliminarSubNota(evaluacion.id, sub.id)}
                                    className="cursor-pointer border-0 bg-transparent p-0 pl-1 text-textSecondary hover:text-danger"
                                    aria-label="Quitar sub-nota"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="m-0 text-[13px] text-textSecondary">Sin sub-notas: la nota es directa.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulario para agregar */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="mx-5 my-4 rounded-xl border border-borderColor bg-bgPrimary/50 p-4">
                <p className="m-0 mb-3 text-[14px] font-semibold text-textPrimary">Nueva evaluación</p>

                {error && (
                  <div className="mb-3 rounded-lg bg-danger/10 p-2.5 text-[13px] font-medium text-danger" role="alert">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label htmlFor="eval-nombre" className="mb-1 block text-[13px] font-medium text-textPrimary">Nombre</label>
                    <input
                      id="eval-nombre"
                      type="text"
                      placeholder="Solemne 1"
                      value={nuevaEval.nombre}
                      onChange={(e) => setNuevaEval({ ...nuevaEval, nombre: e.target.value })}
                      className="h-10 w-full rounded-lg border border-borderColor bg-bgSecondary px-3 text-[14px] text-textPrimary outline-none focus:border-textPrimary"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label htmlFor="eval-peso" className="mb-1 block text-[13px] font-medium text-textPrimary">Porcentaje</label>
                      <input
                        id="eval-peso"
                        type="number"
                        placeholder="25"
                        min="1"
                        max="100"
                        value={nuevaEval.peso}
                        onChange={(e) => setNuevaEval({ ...nuevaEval, peso: e.target.value })}
                        className="num h-10 w-full rounded-lg border border-borderColor bg-bgSecondary px-3 text-[14px] text-textPrimary outline-none focus:border-textPrimary"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="eval-nota" className="mb-1 block text-[13px] font-medium text-textPrimary">
                        Nota <span className="font-normal text-textSecondary">(opcional)</span>
                      </label>
                      <input
                        id="eval-nota"
                        type="text"
                        inputMode="decimal"
                        placeholder="5.5"
                        value={nuevaEval.nota}
                        onChange={(e) => setNuevaEval({ ...nuevaEval, nota: e.target.value })}
                        className="num h-10 w-full rounded-lg border border-borderColor bg-bgSecondary px-3 text-[14px] text-textPrimary outline-none focus:border-textPrimary"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setError("");
                      }}
                      className="flex-1 cursor-pointer rounded-lg border border-borderColor bg-transparent px-3 py-2.5 text-[14px] font-medium text-textSecondary hover:bg-borderColor/30"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={agregarEvaluacion}
                      disabled={pesoLibre === 0}
                      className="flex-[1.4] cursor-pointer rounded-lg border-0 bg-primary px-3 py-2.5 text-[14px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Registrar
                    </button>
                  </div>

                  {pesoLibre > 0 && (
                    <p className="m-0 text-center text-[12px] text-textSecondary">
                      Queda <span className="num text-textPrimary">{formatPeso(pesoLibre)}%</span> por distribuir.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Acciones: agregar a la izquierda, compartir a la derecha */}
        <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-borderColor px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {!showAddForm && evaluaciones.length > 0 && pesoLibre > 0 && (
              <button type="button" onClick={() => setShowAddForm(true)} className={secondaryBtn}>
                <Plus size={14} aria-hidden="true" />
                Agregar evaluación
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              aria-expanded={showConfig}
              aria-controls="notas-eximicion-config"
              className={`${secondaryBtn} ${showConfig ? "!border-textPrimary !text-textPrimary" : ""}`}
            >
              <Settings2 size={14} aria-hidden="true" />
              Eximición
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openImport} aria-label="Importar configuración" className={secondaryBtn}>
              <Download size={14} aria-hidden="true" />
              Importar
            </button>
            <button
              type="button"
              onClick={openShare}
              disabled={evaluaciones.length === 0}
              aria-label="Compartir configuración"
              title={
                evaluaciones.length === 0
                  ? "Configura al menos una evaluación para poder compartir."
                  : "Compartir configuración de evaluaciones"
              }
              className={`${secondaryBtn} disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <Share2 size={14} aria-hidden="true" />
              Compartir
            </button>
          </div>
        </div>
      </div>
    </DrawerPanel>

    <ShareCourseConfigModal
      isOpen={shareOpen}
      onClose={() => {
        shareOpenRef.current = false;
        setShareOpen(false);
      }}
      curso={curso}
      evaluations={evaluaciones}
      institutionSource={mallaSeleccionada}
    />
    <ImportCourseConfigModal
      isOpen={importOpen}
      onClose={() => {
        importOpenRef.current = false;
        setImportOpen(false);
      }}
      curso={curso}
      evaluations={evaluaciones}
      institutionSource={mallaSeleccionada}
      onApply={(newEvaluations) => {
        guardarEvaluaciones(newEvaluations);
        setOpenSubNotas([]);
        setSubNotaInputs({});
        setShowAddForm(false);
        setError("");
        const n = Array.isArray(newEvaluations) ? newEvaluations.length : 0;
        setImportFeedback(
          n === 1 ? "1 evaluación importada" : `${n} evaluaciones importadas`
        );
        if (importFeedbackTimerRef.current) {
          window.clearTimeout(importFeedbackTimerRef.current);
        }
        importFeedbackTimerRef.current = window.setTimeout(() => {
          setImportFeedback("");
        }, 2500);
      }}
    />
    </>
  );
}
