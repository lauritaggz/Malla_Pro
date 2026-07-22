import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Plus, ChevronDown } from "lucide-react";
import { parseGrade } from "../utils/gradeUtils";
import DrawerPanel from "./DrawerPanel";
import { safeStorage } from "../utils/safeStorage";
import { LEGACY_KEYS } from "../utils/storageKeys";

export default function NotasModal({ curso, enCurso, aprobado, onClose, isOpen }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [nuevaEval, setNuevaEval] = useState({
    nombre: "",
    peso: "",
    nota: "",
  });
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Configuración de Eximición y Examen
  const [config, setConfig] = useState({
    notaEximicion: 5.0,
    ponderacionPresentacion: 70,
    ponderacionExamen: 30,
  });
  const [notaExamen, setNotaExamen] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  // Para manejar el panel de sub-notas (controles)
  const [openSubNotas, setOpenSubNotas] = useState([]); // ids de evaluaciones abiertas
  const [subNotaInputs, setSubNotaInputs] = useState({}); // { [evalId]: "valor" }

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

    const pesoTotal = evaluaciones.reduce((sum, e) => sum + e.peso, 0) + peso;
    if (pesoTotal > 100) {
      setError(`El porcentaje total excede 100% (actual: ${pesoTotal}%)`);
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
    guardarEvaluaciones(evaluaciones.filter((e) => e.id !== id));
    setOpenSubNotas((prev) => prev.filter((pid) => pid !== id));
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

  const pesoTotal = evaluaciones.reduce((sum, e) => sum + e.peso, 0);
  const pesoRestante = 100 - pesoTotal;

  const evaluacionesConNota = evaluaciones.filter(
    (e) => e.nota !== null && e.nota !== undefined
  );
  const pesoConNota = evaluacionesConNota.reduce((sum, e) => sum + e.peso, 0);
  const promedioPresentacion =
    pesoConNota > 0
      ? evaluacionesConNota.reduce((sum, e) => sum + e.nota * e.peso, 0) /
        pesoConNota
      : 0;

  // Calcular notas y estados
  let notaNecesariaPresentacion = null;
  let notaNecesariaExamen = null;
  let rindeExamen = false;
  let estado = aprobado ? "Aprobado" : enCurso ? "Cursando" : "Pendiente";
  let promedioFinal = promedioPresentacion;

  if (pesoTotal === 100) {
    if (promedioPresentacion >= config.notaEximicion) {
      estado = "Eximido (Aprobado)";
      promedioFinal = promedioPresentacion;
    } else {
      rindeExamen = true;
      estado = "Rinde Examen";
      
      const propPresentacion = config.ponderacionPresentacion / 100;
      const propExamen = config.ponderacionExamen / 100;
      
      // Calcular nota necesaria en examen para pasar con 4.0
      const ptsFaltantes = 4.0 - (promedioPresentacion * propPresentacion);
      const reqVal = propExamen > 0 ? (ptsFaltantes / propExamen) : 0;
      notaNecesariaExamen = Math.max(1.0, reqVal);
      
      const notaExamenNum = parseFloat(String(notaExamen).replace(",", "."));
      if (!isNaN(notaExamenNum) && notaExamenNum >= 1.0 && notaExamenNum <= 7.0) {
        promedioFinal = (promedioPresentacion * propPresentacion) + (notaExamenNum * propExamen);
        estado = promedioFinal >= 4.0 ? "Aprobado (Con Examen)" : "Reprobado (Examen)";
      }
    }
  } else if (pesoConNota > 0 && pesoRestante > 0) {
    // Calculo necesario para la nota de eximición en las evaluaciones que quedan
    const notaRequerida =
      (config.notaEximicion * 100 - promedioPresentacion * pesoConNota) / pesoRestante;
    notaNecesariaPresentacion = Math.max(1.0, Math.min(7.0, notaRequerida));
  }

  if (!isOpen || !curso) return null;

  const estadoColor =
    estado.includes("Aprobado") || estado.includes("Eximido")
      ? "text-emerald-500"
      : estado.includes("Reprobado")
        ? "text-red-500"
        : estado === "Rinde Examen"
          ? "text-amber-500"
          : estado === "Cursando"
            ? "text-primary"
            : "text-amber-500";

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title={curso.nombre}
      subtitle={`${curso.codigo} · ${curso.sct} SCT`}
      variant="modal"
    >
      <div className="flex flex-col h-full min-h-0 overflow-y-auto p-4 sm:p-5 gap-4">
        {/* Toolbar: config discreet */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-textSecondary m-0 font-medium">
            {evaluaciones.length} {evaluaciones.length === 1 ? "evaluación" : "evaluaciones"}
            {pesoRestante > 0 ? ` · ${pesoRestante}% libre` : pesoTotal === 100 ? " · 100% asignado" : ""}
          </p>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            aria-expanded={showConfig}
            aria-controls="notas-eximicion-config"
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 border cursor-pointer
              ${showConfig
                ? "bg-primary text-white border-primary"
                : "bg-transparent text-textSecondary hover:text-textPrimary border-borderColor hover:bg-bgPrimary"
              }`}
          >
            <Settings2 size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Eximición</span>
          </button>
        </div>

        {/* Config panel (collapsible, secondary) */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              id="notas-eximicion-config"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="bg-bgPrimary/60 border border-borderColor rounded-lg p-3">
                <p className="text-[11px] font-semibold text-textSecondary m-0 mb-2.5 uppercase tracking-wide">
                  Parámetros de evaluación final
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Nota eximición</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="notaEximicion"
                      value={config.notaEximicion}
                      onChange={handleConfigChange}
                      className="w-full px-2.5 py-1.5 rounded border border-borderColor bg-bgSecondary text-textPrimary text-sm font-semibold focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">% Presentación</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={config.ponderacionPresentacion}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value);
                          if (isNaN(val)) val = 0;
                          guardarConfig({ ...config, ponderacionPresentacion: val, ponderacionExamen: 100 - val });
                        }}
                        className="w-full pl-2.5 pr-6 py-1.5 rounded border border-borderColor bg-bgSecondary text-textPrimary text-sm font-semibold focus:border-primary outline-none"
                      />
                      <span className="absolute right-2 top-1.5 text-textSecondary text-xs">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">% Examen</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={config.ponderacionExamen}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value);
                          if (isNaN(val)) val = 0;
                          guardarConfig({ ...config, ponderacionExamen: val, ponderacionPresentacion: 100 - val });
                        }}
                        className="w-full pl-2.5 pr-6 py-1.5 rounded border border-borderColor bg-bgSecondary text-textPrimary text-sm font-semibold focus:border-primary outline-none"
                      />
                      <span className="absolute right-2 top-1.5 text-textSecondary text-xs">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact metrics strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0"
          role="group"
          aria-label="Resumen de notas"
        >
          <div className="rounded-lg border border-borderColor bg-bgPrimary/40 px-2.5 py-2 text-center">
            <p className="text-[9px] text-textSecondary uppercase tracking-wider m-0 mb-0.5">Estado</p>
            <p className={`text-xs sm:text-sm font-bold leading-tight m-0 ${estadoColor}`}>{estado}</p>
          </div>
          <div className="rounded-lg border border-borderColor bg-bgPrimary/40 px-2.5 py-2 text-center">
            <p className="text-[9px] text-textSecondary uppercase tracking-wider m-0 mb-0.5">% Evaluado</p>
            <p className="text-sm font-bold text-textPrimary m-0 tabular-nums">{pesoTotal}%</p>
          </div>
          <div className="rounded-lg border border-borderColor bg-bgPrimary/40 px-2.5 py-2 text-center">
            <p className="text-[9px] text-textSecondary uppercase tracking-wider m-0 mb-0.5">Presentación</p>
            <p className="text-sm font-bold text-textPrimary m-0 tabular-nums">
              {pesoConNota > 0 ? safeToFixed(promedioPresentacion, 2) : "—"}
            </p>
          </div>
          <div
            className={`rounded-lg border px-2.5 py-2 text-center ${
              rindeExamen ? "border-amber-500/45 bg-amber-500/5" : "border-borderColor bg-bgPrimary/40"
            }`}
          >
            <p className={`text-[9px] uppercase tracking-wider m-0 mb-0.5 ${rindeExamen ? "text-amber-600 font-bold" : "text-textSecondary"}`}>
              Nota final
            </p>
            <p className={`text-sm font-bold m-0 tabular-nums ${rindeExamen ? "text-amber-500" : "text-textPrimary"}`}>
              {pesoTotal === 100 || rindeExamen ? safeToFixed(promedioFinal, 2) : "—"}
            </p>
          </div>
        </div>

        {/* Projections */}
        {!rindeExamen && notaNecesariaPresentacion !== null && pesoRestante > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 text-sm shrink-0">
            <p className="text-textSecondary text-xs m-0 leading-relaxed">
              Para eximirte ({safeToFixed(config.notaEximicion, 1)}), necesitas promedio{" "}
              <strong className="text-primary font-bold">{safeToFixed(notaNecesariaPresentacion, 2)}</strong>{" "}
              en el {pesoRestante}% restante.
              {notaNecesariaPresentacion > 7.0 && (
                <span className="text-red-500 ml-1 font-medium">Matemáticamente inalcanzable; irás a examen.</span>
              )}
            </p>
          </div>
        )}

        {rindeExamen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex flex-col gap-2.5 shrink-0"
          >
            <p className="text-xs font-bold text-amber-600 dark:text-amber-500 m-0">Modo examen</p>
            <p className="text-textSecondary text-xs m-0 leading-relaxed">
              Presentación <strong className="text-textPrimary">{safeToFixed(promedioPresentacion, 2)}</strong> bajo
              eximición ({safeToFixed(config.notaEximicion, 1)}). Ponderación: {config.ponderacionPresentacion}% /{" "}
              {config.ponderacionExamen}% examen.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-bgPrimary/70 p-2.5 rounded-lg border border-borderColor/50">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-textSecondary font-medium m-0 mb-0.5">
                  Nota necesaria en examen para aprobar (4.0)
                </p>
                <p className={`text-xl font-bold m-0 tabular-nums ${notaNecesariaExamen > 7.0 ? "text-red-500" : "text-amber-500"}`}>
                  {safeToFixed(notaNecesariaExamen, 2)}
                </p>
              </div>
              <div className="shrink-0">
                <label className="block text-[10px] font-bold text-textSecondary mb-1 uppercase">Examen</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 5.5"
                  value={notaExamen}
                  onChange={handleNotaExamenChange}
                  className="w-full sm:w-24 px-2.5 py-1.5 rounded-md border border-amber-500/40 bg-bgSecondary focus:border-amber-500 text-textPrimary font-bold text-center outline-none text-sm"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Evaluations list */}
        <div className="flex flex-col gap-2.5 min-h-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-textPrimary m-0">Evaluaciones</h3>
            {!showAddForm && pesoRestante > 0 && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-xs font-bold text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border-0 bg-transparent cursor-pointer transition-colors"
              >
                <Plus size={14} aria-hidden="true" />
                Agregar
              </button>
            )}
          </div>

          {evaluaciones.length === 0 ? (
            <div className="text-center py-5 px-3 rounded-lg border border-dashed border-borderColor bg-bgPrimary/30">
              <p className="text-textSecondary text-xs m-0">Aún no hay evaluaciones.</p>
              {!showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-xs font-bold text-primary bg-transparent border-0 cursor-pointer hover:underline"
                >
                  Agregar la primera
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-borderColor">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-bgPrimary/50 border-b border-borderColor">
                    <th className="py-2 px-3 font-semibold text-textSecondary text-[11px] w-[36%]">Concepto</th>
                    <th className="py-2 px-2 font-semibold text-textSecondary text-[11px] text-center w-[16%]">%</th>
                    <th className="py-2 px-2 font-semibold text-textSecondary text-[11px] text-center w-[22%]">Nota</th>
                    <th className="py-2 px-2 font-semibold text-textSecondary text-[11px] text-right w-[26%]"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor/50">
                  {evaluaciones.map((evaluacion) => {
                    const tieneSubNotas = evaluacion.subNotas && evaluacion.subNotas.length > 0;

                    return (
                      <React.Fragment key={evaluacion.id}>
                        <tr className="hover:bg-bgPrimary/40 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-textPrimary text-xs sm:text-sm">
                            {evaluacion.nombre}
                            {tieneSubNotas && (
                              <span className="block text-[10px] text-textSecondary mt-0.5">Con sub-notas</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center text-textSecondary font-medium text-xs tabular-nums">
                            {evaluacion.peso}%
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={evaluacion.nota ?? ""}
                                onChange={(e) => actualizarNota(evaluacion.id, e.target.value)}
                                placeholder="—"
                                aria-label={`Nota de ${evaluacion.nombre}`}
                                className="w-14 px-1 py-1 rounded border border-borderColor bg-bgPrimary focus:border-primary text-textPrimary text-center text-sm font-semibold outline-none"
                              />
                              {tieneSubNotas && (
                                <span className="text-[10px] font-bold text-primary">
                                  Prom: {safeToFixed(evaluacion.nota, 2)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => toggleSubNotasPanel(evaluacion.id)}
                                className={`text-[10px] px-1.5 py-1 rounded transition-colors font-medium border-0 cursor-pointer ${
                                  openSubNotas.includes(evaluacion.id)
                                    ? "bg-primary text-white"
                                    : "text-textSecondary hover:bg-bgPrimary"
                                }`}
                              >
                                Sub
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarEvaluacion(evaluacion.id)}
                                className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 w-7 h-7 rounded transition-colors border-0 bg-transparent cursor-pointer text-sm"
                                aria-label={`Eliminar ${evaluacion.nombre}`}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>

                        {openSubNotas.includes(evaluacion.id) && (
                          <tr className="bg-bgPrimary/30">
                            <td colSpan="4" className="p-3">
                              <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Sub-nota"
                                    value={subNotaInputs[evaluacion.id] || ""}
                                    onChange={(e) => handleSubNotaInputChange(evaluacion.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") agregarSubNota(evaluacion.id);
                                    }}
                                    className="w-24 px-2 py-1.5 rounded border border-borderColor bg-bgSecondary text-textPrimary text-sm font-medium outline-none focus:border-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => agregarSubNota(evaluacion.id)}
                                    className="bg-primary text-white px-2.5 py-1.5 rounded text-sm font-medium hover:opacity-90 border-0 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="flex-1">
                                  {tieneSubNotas ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {evaluacion.subNotas.map((sub) => (
                                        <div
                                          key={sub.id}
                                          className="flex items-center gap-1.5 bg-bgSecondary border border-borderColor/80 rounded px-2 py-1 text-xs"
                                        >
                                          <span className="font-semibold text-textPrimary">{safeToFixed(sub.nota, 1)}</span>
                                          <button
                                            type="button"
                                            onClick={() => eliminarSubNota(evaluacion.id, sub.id)}
                                            className="text-textSecondary hover:text-red-500 border-0 bg-transparent cursor-pointer p-0 pl-1"
                                            aria-label="Eliminar sub-nota"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-textSecondary m-0">Sin sub-notas; la nota es directa.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add form (collapsed by default) */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="bg-bgPrimary/50 rounded-xl p-3.5 border border-borderColor">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError("");
                  }}
                  className="w-full flex items-center justify-between gap-2 mb-3 bg-transparent border-0 cursor-pointer p-0"
                >
                  <span className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <Plus size={14} className="text-primary" aria-hidden="true" />
                    Nueva evaluación
                  </span>
                  <ChevronDown size={16} className="text-textSecondary rotate-180" aria-hidden="true" />
                </button>

                {error && (
                  <div className="bg-red-500/10 border-l-2 border-red-500 p-2 mb-3 text-red-600 text-xs font-medium" role="alert">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-textSecondary mb-1 uppercase tracking-wider">
                      Concepto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Examen, Solemne 1"
                      value={nuevaEval.nombre}
                      onChange={(e) => setNuevaEval({ ...nuevaEval, nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-borderColor bg-bgSecondary focus:border-primary text-textPrimary text-sm outline-none"
                    />
                  </div>

                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-textSecondary mb-1 uppercase">
                        Porcentaje (%)
                      </label>
                      <input
                        type="number"
                        placeholder="0-100"
                        min="1"
                        max="100"
                        value={nuevaEval.peso}
                        onChange={(e) => setNuevaEval({ ...nuevaEval, peso: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-borderColor bg-bgSecondary focus:border-primary text-textPrimary text-sm outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-textSecondary mb-1 uppercase">
                        Calificación
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Opcional"
                        value={nuevaEval.nota}
                        onChange={(e) => setNuevaEval({ ...nuevaEval, nota: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-borderColor bg-bgSecondary focus:border-primary text-textPrimary text-sm outline-none"
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
                      className="flex-1 px-3 py-2 rounded-lg border border-borderColor text-textSecondary text-sm font-semibold hover:bg-bgSecondary bg-transparent cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={agregarEvaluacion}
                      disabled={pesoRestante === 0}
                      className="flex-[1.4] bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm border-0 cursor-pointer"
                    >
                      Registrar
                    </button>
                  </div>

                  {pesoRestante > 0 && (
                    <p className="text-[11px] text-textSecondary m-0 text-center">
                      Queda <strong className="text-textPrimary">{pesoRestante}%</strong> por distribuir.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DrawerPanel>
  );
}
