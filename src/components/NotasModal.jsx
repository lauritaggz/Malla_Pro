import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseGrade } from "../utils/gradeUtils";

export default function NotasModal({ curso, enCurso, aprobado, onClose, isOpen }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [nuevaEval, setNuevaEval] = useState({
    nombre: "",
    peso: "",
    nota: "",
  });
  const [error, setError] = useState("");

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
      const notasGuardadas = JSON.parse(
        localStorage.getItem("malla-notas") || "{}"
      );
      const evals = notasGuardadas[curso.id] || [];
      setEvaluaciones(evals);
      setOpenSubNotas([]);
      setSubNotaInputs({});
      setError("");

      const configsGuardadas = JSON.parse(
        localStorage.getItem("malla-configs") || "{}"
      );
      setConfig(configsGuardadas[curso.id] || {
        notaEximicion: 5.0,
        ponderacionPresentacion: 70,
        ponderacionExamen: 30,
      });

      const examenesGuardados = JSON.parse(
        localStorage.getItem("malla-examenes") || "{}"
      );
      setNotaExamen(examenesGuardados[curso.id] || "");
    }
  }, [curso]);

  // Guardar evaluaciones en localStorage
  const guardarEvaluaciones = (evals) => {
    const notasGuardadas = JSON.parse(
      localStorage.getItem("malla-notas") || "{}"
    );
    notasGuardadas[curso.id] = evals;
    localStorage.setItem("malla-notas", JSON.stringify(notasGuardadas));
    setEvaluaciones(evals);
    window.dispatchEvent(new Event("notasModificadas"));
  };

  const guardarConfig = (newConfig) => {
    const configs = JSON.parse(localStorage.getItem("malla-configs") || "{}");
    configs[curso.id] = newConfig;
    localStorage.setItem("malla-configs", JSON.stringify(configs));
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
    const examenes = JSON.parse(localStorage.getItem("malla-examenes") || "{}");
    examenes[curso.id] = value;
    localStorage.setItem("malla-examenes", JSON.stringify(examenes));
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backfaceVisibility: "hidden" }}
    >
      <div className="w-full max-w-4xl" style={{ willChange: "transform, opacity" }}>
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{ backfaceVisibility: "hidden", willChange: "transform, opacity" }}
            className="bg-bgPrimary rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-borderColor/40 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="min-w-0 flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  {curso.nombre}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="ml-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center text-lg sm:text-xl font-bold shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* SubHeader / Stats Toolbar */}
            <div className="bg-bgTertiary border-b border-borderColor px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-inner">
               <div className="flex items-center gap-2 text-xs text-textSecondary font-medium">
                 <span>{curso.codigo}</span>
                 <span className="opacity-50">•</span>
                 <span>{curso.sct} SCT</span>
               </div>
               
               <button 
                  onClick={() => setShowConfig(!showConfig)}
                  className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-2 border
                    ${showConfig 
                      ? "bg-primary text-white border-primary" 
                      : "bg-bgPrimary text-textPrimary hover:bg-bgSecondary border-borderColor"
                    }`}
                >
                  ⚙️ <span className="hidden sm:inline">Configuración Eximición</span>
               </button>
            </div>

            {/* Contenido scrolleable analítico */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
              
              {/* Columna Izquierda: Métricas y Evaluaciones */}
              <div className="flex-1">
                
                {/* Panel de Configuración Animado */}
                <AnimatePresence>
                  {showConfig && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                      animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
                      exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <h4 className="font-bold text-primary mb-3 text-sm flex items-center gap-2">
                          Parámetros de Evaluación Final
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-textPrimary mb-1">Nota Eximición</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="notaEximicion"
                              value={config.notaEximicion}
                              onChange={handleConfigChange}
                              className="w-full px-3 py-1.5 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm font-semibold focus:border-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-textPrimary mb-1">% Presentación</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={config.ponderacionPresentacion}
                                onChange={(e) => {
                                  let val = parseFloat(e.target.value);
                                  if (isNaN(val)) val = 0;
                                  guardarConfig({ ...config, ponderacionPresentacion: val, ponderacionExamen: 100 - val });
                                }}
                                className="w-full pl-3 pr-7 py-1.5 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm font-semibold focus:border-primary outline-none"
                              />
                              <span className="absolute right-3 top-1.5 text-textSecondary text-xs">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-textPrimary mb-1">% Examen</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={config.ponderacionExamen}
                                onChange={(e) => {
                                  let val = parseFloat(e.target.value);
                                  if (isNaN(val)) val = 0;
                                  guardarConfig({ ...config, ponderacionExamen: val, ponderacionPresentacion: 100 - val });
                                }}
                                className="w-full pl-3 pr-7 py-1.5 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm font-semibold focus:border-primary outline-none"
                              />
                              <span className="absolute right-3 top-1.5 text-textSecondary text-xs">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Resumen */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="bg-bgSecondary rounded-lg p-3 border border-borderColor flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] sm:text-[11px] text-textSecondary uppercase tracking-wider mb-1">Estado</p>
                    <p
                      className={`text-sm sm:text-base md:text-lg font-bold leading-tight ${
                        estado.includes("Aprobado") || estado.includes("Eximido")
                          ? "text-emerald-500"
                          : estado.includes("Reprobado")
                          ? "text-red-500"
                          : estado === "Rinde Examen"
                          ? "text-amber-500"
                          : estado === "Cursando"
                          ? "text-primary"
                          : "text-amber-500"
                      }`}
                    >
                      {estado}
                    </p>
                  </div>
                  <div className="bg-bgSecondary rounded-lg p-3 border border-borderColor flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] sm:text-[11px] text-textSecondary uppercase tracking-wider mb-1">
                      % Evaluado
                    </p>
                    <p className="text-xl font-bold text-textPrimary">
                      {pesoTotal}%
                    </p>
                  </div>
                  <div className="bg-bgSecondary rounded-lg p-3 border border-borderColor flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] sm:text-[11px] text-textSecondary uppercase tracking-wider mb-1">Nota Presentación</p>
                    <p className="text-2xl font-bold text-textPrimary">
                       {pesoConNota > 0 ? safeToFixed(promedioPresentacion, 2) : "--"}
                    </p>
                  </div>
                  <div className={`bg-bgSecondary rounded-lg p-3 border flex flex-col justify-center items-center text-center ${rindeExamen ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20" : "border-borderColor"}`}>
                    <p className={`text-[10px] sm:text-[11px] uppercase tracking-wider mb-1 ${rindeExamen ? "text-amber-600 font-bold" : "text-textSecondary"}`}>Nota Final</p>
                    <p className={`text-2xl font-bold ${rindeExamen ? "text-amber-500" : "text-textPrimary"}`}>
                       {(pesoTotal === 100 || rindeExamen) ? safeToFixed(promedioFinal, 2) : "--"}
                    </p>
                  </div>
                </div>

                {/* Estimaciones Eximicion / Examen */}
                {!rindeExamen && notaNecesariaPresentacion !== null && pesoRestante > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div>
                      <p className="text-sm font-semibold text-textPrimary mb-0.5">
                        Proyección para Eximición
                      </p>
                      <p className="text-textSecondary text-sm">
                        Para eximirte ({safeToFixed(config.notaEximicion, 1)}), necesitas mantener un promedio de{" "}
                        <strong className="text-primary font-bold">
                          {safeToFixed(notaNecesariaPresentacion, 2)}
                        </strong>{" "}
                        en el {pesoRestante}% restante.
                        {notaNecesariaPresentacion > 7.0 && (
                          <span className="text-red-500 ml-1 font-medium block mt-1">
                            (⚠️ Matemáticamente inalcanzable. Irás a examen.)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {rindeExamen && (
                  <motion.div 
                    initial={{ scale: 0.98, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-500 mb-0.5">
                          Modo Examen Activado
                        </p>
                        <p className="text-textSecondary text-sm mb-3">
                          Tu presentación (<strong className="text-textPrimary">{safeToFixed(promedioPresentacion, 2)}</strong>) no alcanza para la eximición ({safeToFixed(config.notaEximicion, 1)}).
                          Tu nota calculada ahora equivale al <strong>{config.ponderacionPresentacion}%</strong> y el examen al <strong>{config.ponderacionExamen}%</strong>.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-bgPrimary p-3 rounded-lg border border-borderColor/50 shadow-sm">
                          <div className="flex-1 w-full border-r border-transparent sm:border-borderColor/50 pr-0 sm:pr-4">
                            <p className="text-xs text-textSecondary font-medium mb-1">
                              Nota necesaria en el Examen para aprobar (4.0):
                            </p>
                            <p className={`text-2xl font-bold tracking-tight ${notaNecesariaExamen > 7.0 ? "text-red-500" : "text-amber-500"}`}>
                              {safeToFixed(notaNecesariaExamen, 2)}
                              {notaNecesariaExamen > 7.0 && <span className="text-[10px] ml-2 uppercase text-red-500/80">(Ramo Irrecuperable)</span>}
                            </p>
                          </div>
                          <div className="w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-borderColor/50 sm:border-t-0 pl-0 sm:pl-2 shrink-0">
                            <label className="block text-[10px] font-bold text-textSecondary mb-1.5 uppercase text-center sm:text-left">Registrar Examen</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Ej: 5.5"
                              value={notaExamen}
                              onChange={handleNotaExamenChange}
                              className="w-full sm:w-28 px-3 py-2 rounded-md border-2 border-amber-500/40 bg-bgPrimary focus:border-amber-500 text-textPrimary font-bold text-center outline-none transition-colors mx-auto block"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Tabla de evaluaciones */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-4 text-textPrimary border-b border-borderColor/50 pb-2">
                    Registro de Evaluaciones
                  </h3>
                  
                  {evaluaciones.length === 0 ? (
                    <div className="text-center py-10 bg-bgSecondary/50 rounded-lg border border-dashed border-borderColor">
                      <p className="text-textSecondary text-sm">
                        No hay evaluaciones registradas en el sistema.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-borderColor">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-bgSecondary border-b border-borderColor">
                            <th className="py-2.5 px-4 font-semibold text-textSecondary w-1/3">Evaluación</th>
                            <th className="py-2.5 px-4 font-semibold text-textSecondary text-center w-1/6">Porcentaje</th>
                            <th className="py-2.5 px-4 font-semibold text-textSecondary text-center w-1/4">Calificación</th>
                            <th className="py-2.5 px-4 font-semibold text-textSecondary text-right w-1/4">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderColor/50">
                          {evaluaciones.map((evaluacion) => {
                            const tieneSubNotas = evaluacion.subNotas && evaluacion.subNotas.length > 0;
                            const promedioSub =
                              tieneSubNotas && typeof evaluacion.nota === "number"
                                ? evaluacion.nota.toFixed(2)
                                : null;

                            return (
                              <React.Fragment key={evaluacion.id}>
                                <tr className="hover:bg-bgPrimary transition-colors">
                                  <td className="py-3 px-4 font-medium text-textPrimary">
                                    {evaluacion.nombre}
                                    {tieneSubNotas && (
                                       <span className="block text-[10px] text-textSecondary mt-0.5 uppercase tracking-wide">
                                         Promediado por controles
                                       </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center text-textSecondary font-medium">
                                    {evaluacion.peso}%
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={evaluacion.nota ?? ""}
                                        onChange={(e) =>
                                          actualizarNota(evaluacion.id, e.target.value)
                                        }
                                        placeholder="-"
                                        className="w-16 px-1.5 py-1 rounded border border-borderColor bg-bgPrimary focus:bg-bgSecondary hover:border-primary/50 text-textPrimary text-center text-sm font-semibold transition-colors mx-auto"
                                      />
                                      {tieneSubNotas && (
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                          Prom: {safeToFixed(evaluacion.nota, 2)}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                                      <button
                                        onClick={() => toggleSubNotasPanel(evaluacion.id)}
                                        className={`text-xs px-2 py-1.5 rounded transition-colors font-medium ${
                                          openSubNotas.includes(evaluacion.id)
                                            ? "bg-primary text-white"
                                            : "text-textSecondary hover:bg-bgSecondary border border-transparent hover:border-borderColor"
                                        }`}
                                      >
                                        Sub-Notas
                                      </button>
                                      <button
                                        onClick={() => eliminarEvaluacion(evaluacion.id)}
                                        className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                                        title="Eliminar evaluación"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Fila expandible de Sub-notas */}
                                {openSubNotas.includes(evaluacion.id) && (
                                  <tr className="bg-bgTertiary/50 border-b border-borderColor/50">
                                    <td colSpan="4" className="p-4">
                                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                                        {/* Input agregador */}
                                        <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Ingresar nota"
                                            value={subNotaInputs[evaluacion.id] || ""}
                                            onChange={(e) =>
                                              handleSubNotaInputChange(evaluacion.id, e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") agregarSubNota(evaluacion.id);
                                            }}
                                            className="w-28 px-2.5 py-1.5 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm font-medium"
                                          />
                                          <button
                                            onClick={() => agregarSubNota(evaluacion.id)}
                                            className="bg-primary text-white px-3 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity"
                                          >
                                            +
                                          </button>
                                        </div>

                                        {/* Lista de subnotas actuales */}
                                        <div className="flex-1">
                                          {tieneSubNotas ? (
                                            <div className="flex flex-wrap gap-1.5">
                                              {evaluacion.subNotas.map((sub) => (
                                                <div
                                                  key={sub.id}
                                                  className="flex items-center gap-1.5 bg-bgPrimary border border-borderColor/80 shadow-sm rounded px-2.5 py-1 text-xs"
                                                >
                                                  <span className="font-semibold text-textPrimary">{safeToFixed(sub.nota, 1)}</span>
                                                  <button
                                                    onClick={() => eliminarSubNota(evaluacion.id, sub.id)}
                                                    className="text-textSecondary hover:text-red-500 border-l border-borderColor/50 pl-1.5"
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-textSecondary italic pt-2 sm:pt-0">
                                              No se han ingresado sub-notas. El promedio general es directo.
                                            </p>
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
              </div>

              {/* Columna Derecha: Agregar evaluación */}
              <div className="w-full md:w-72 shrink-0">
                <div className="bg-bgSecondary rounded-lg p-5 border border-borderColor sticky top-0 shadow-sm">
                  <h3 className="text-base font-bold mb-4 text-textPrimary flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-6 h-6 rounded flex items-center justify-center text-sm">+</span>
                    Agregar Item
                  </h3>
                  
                  {error && (
                    <div className="bg-red-500/10 border-l-2 border-red-500 p-2 mb-4 text-red-600 text-xs font-medium">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wider">Concepto</label>
                      <input
                        type="text"
                        placeholder="Ej: Examen, Solemne 1"
                        value={nuevaEval.nombre}
                        onChange={(e) =>
                          setNuevaEval({ ...nuevaEval, nombre: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded border border-borderColor bg-bgPrimary focus:border-primary text-textPrimary text-sm transition-colors outline-none"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-textSecondary mb-1 uppercase">Porcentaje (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0-100"
                            min="1"
                            max="100"
                            value={nuevaEval.peso}
                            onChange={(e) =>
                              setNuevaEval({ ...nuevaEval, peso: e.target.value })
                            }
                            className="w-full pl-3 pr-6 py-2 rounded border border-borderColor bg-bgPrimary focus:border-primary text-textPrimary text-sm transition-colors outline-none"
                          />
                          <span className="absolute right-2.5 top-2 text-textSecondary text-sm font-medium">%</span>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-textSecondary mb-1 uppercase">Calificación</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="(Opcional)"
                          value={nuevaEval.nota}
                          onChange={(e) =>
                            setNuevaEval({ ...nuevaEval, nota: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded border border-borderColor bg-bgPrimary focus:border-primary text-textPrimary text-sm transition-colors outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={agregarEvaluacion}
                      disabled={pesoRestante === 0}
                      className="w-full bg-primary text-white mt-2 px-4 py-2.5 rounded-lg hover:bg-primary-hover 
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm shadow-sm"
                    >
                      Registrar Evaluación
                    </button>
                    
                    {pesoRestante === 0 ? (
                      <p className="text-xs text-emerald-500 font-medium mt-3 text-center bg-emerald-500/10 py-1.5 rounded">
                        100% distribuido correctamente.
                      </p>
                    ) : (
                      <p className="text-[11px] text-textSecondary mt-3 text-center">
                        Queda un <strong className="text-textPrimary">{pesoRestante}%</strong> por distribuir en el curso.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-bgSecondary px-4 sm:px-6 py-3 sm:py-4 border-t border-borderColor flex justify-end rounded-b-xl">
              <button
                onClick={onClose}
                className="px-5 sm:px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm sm:text-base"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
  );
}
