import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotasModal({ curso, onClose, isOpen }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [nuevaEval, setNuevaEval] = useState({
    nombre: "",
    peso: "",
    nota: "",
  });
  const [error, setError] = useState("");

  // Cargar evaluaciones del curso desde localStorage
  useEffect(() => {
    if (curso) {
      const notasGuardadas = JSON.parse(
        localStorage.getItem("malla-notas") || "{}"
      );
      setEvaluaciones(notasGuardadas[curso.id] || []);
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
  };

  // Agregar evaluación
  const agregarEvaluacion = () => {
    const peso = parseFloat(nuevaEval.peso);
    const nota = nuevaEval.nota ? parseFloat(nuevaEval.nota) : null;

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

    if (nota !== null && (isNaN(nota) || nota < 1.0 || nota > 7.0)) {
      setError("La nota debe estar entre 1.0 y 7.0");
      return;
    }

    const nuevaEvaluacion = {
      id: Date.now(),
      nombre: nuevaEval.nombre.trim(),
      peso: peso,
      nota: nota,
    };

    guardarEvaluaciones([...evaluaciones, nuevaEvaluacion]);
    setNuevaEval({ nombre: "", peso: "", nota: "" });
    setError("");
  };

  // Eliminar evaluación
  const eliminarEvaluacion = (id) => {
    guardarEvaluaciones(evaluaciones.filter((e) => e.id !== id));
  };

  // Actualizar nota de evaluación
  const actualizarNota = (id, nuevaNota) => {
    const nota = parseFloat(nuevaNota);
    if (isNaN(nota) || nota < 1.0 || nota > 7.0) return;

    const evals = evaluaciones.map((e) =>
      e.id === id ? { ...e, nota: nota } : e
    );
    guardarEvaluaciones(evals);
  };

  // Cálculos
  const pesoTotal = evaluaciones.reduce((sum, e) => sum + e.peso, 0);
  const pesoRestante = 100 - pesoTotal;

  const evaluacionesConNota = evaluaciones.filter((e) => e.nota !== null);
  const pesoConNota = evaluacionesConNota.reduce((sum, e) => sum + e.peso, 0);
  const promedioActual =
    pesoConNota > 0
      ? evaluacionesConNota.reduce((sum, e) => sum + e.nota * e.peso, 0) /
        pesoConNota
      : 0;

  // Calcular nota mínima necesaria para aprobar (4.0)
  let notaNecesaria = null;
  let estado = "Pendiente";

  if (pesoTotal === 100) {
    const promedioFinal =
      evaluaciones.reduce((sum, e) => sum + (e.nota || 0) * e.peso, 0) / 100;
    estado = promedioFinal >= 4.0 ? "Aprobado" : "Reprobado";
  } else if (pesoConNota > 0 && pesoRestante > 0) {
    // Calcular nota necesaria en el peso restante para llegar a 4.0
    const notaRequerida =
      (4.0 * 100 - promedioActual * pesoConNota) / pesoRestante;
    notaNecesaria = Math.max(1.0, Math.min(7.0, notaRequerida));
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] overflow-y-auto"
        onClick={onClose}
      >
        <div className="min-h-screen flex items-start justify-center p-4 py-8">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bgPrimary rounded-xl shadow-theme-xl max-w-4xl w-full border border-borderColor relative"
          >
            {/* Header - Fixed */}
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold">{curso.nombre}</h2>
                <p className="text-sm opacity-90">
                  {curso.codigo} • {curso.sct} SCT
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center text-xl font-bold shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-bgSecondary rounded-lg p-4 border border-borderColor">
                  <p className="text-xs text-textSecondary mb-1">
                    Promedio Actual
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {pesoConNota > 0 ? promedioActual.toFixed(2) : "--"}
                  </p>
                </div>
                <div className="bg-bgSecondary rounded-lg p-4 border border-borderColor">
                  <p className="text-xs text-textSecondary mb-1">Estado</p>
                  <p
                    className={`text-lg font-bold ${
                      estado === "Aprobado"
                        ? "text-green-500"
                        : estado === "Reprobado"
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                  >
                    {estado}
                  </p>
                </div>
                <div className="bg-bgSecondary rounded-lg p-4 border border-borderColor">
                  <p className="text-xs text-textSecondary mb-1">
                    Porcentaje Cubierto
                  </p>
                  <p className="text-2xl font-bold text-textPrimary">
                    {pesoTotal}%
                  </p>
                </div>
              </div>

              {/* Estimación de nota necesaria */}
              {notaNecesaria !== null && pesoRestante > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"
                >
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                    💡 Estimación para aprobar (4.0)
                  </p>
                  <p className="text-textPrimary">
                    Necesitas un promedio de{" "}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {notaNecesaria.toFixed(2)}
                    </strong>{" "}
                    en el {pesoRestante}% restante
                    {notaNecesaria > 7.0 && (
                      <span className="text-red-500 ml-2">
                        (⚠️ No alcanzable)
                      </span>
                    )}
                  </p>
                </motion.div>
              )}

              {/* Lista de evaluaciones */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-textPrimary">
                  Evaluaciones
                </h3>
                {evaluaciones.length === 0 ? (
                  <p className="text-textSecondary text-center py-8">
                    No hay evaluaciones registradas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {evaluaciones.map((evaluacion) => (
                      <motion.div
                        key={evaluacion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-bgSecondary rounded-lg p-3 border border-borderColor flex items-center gap-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-textPrimary">
                            {evaluacion.nombre}
                          </p>
                          <p className="text-xs text-textSecondary">
                            {evaluacion.peso}%
                          </p>
                        </div>
                        <input
                          type="number"
                          min="1.0"
                          max="7.0"
                          step="0.1"
                          value={evaluacion.nota || ""}
                          onChange={(e) =>
                            actualizarNota(evaluacion.id, e.target.value)
                          }
                          placeholder="Nota"
                          className="w-20 px-2 py-1 rounded border border-borderColor bg-bgPrimary text-textPrimary text-center"
                        />
                        <button
                          onClick={() => eliminarEvaluacion(evaluacion.id)}
                          className="text-red-500 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                        >
                          🗑️
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agregar evaluación */}
              <div className="bg-bgTertiary rounded-lg p-4 border border-borderColor">
                <h3 className="text-lg font-semibold mb-3 text-textPrimary">
                  Nueva Evaluación
                </h3>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Nombre (ej: Parcial 1)"
                    value={nuevaEval.nombre}
                    onChange={(e) =>
                      setNuevaEval({ ...nuevaEval, nombre: e.target.value })
                    }
                    className="px-3 py-2 rounded border border-borderColor bg-bgPrimary text-textPrimary"
                  />
                  <input
                    type="number"
                    placeholder="Peso %"
                    min="1"
                    max="100"
                    value={nuevaEval.peso}
                    onChange={(e) =>
                      setNuevaEval({ ...nuevaEval, peso: e.target.value })
                    }
                    className="px-3 py-2 rounded border border-borderColor bg-bgPrimary text-textPrimary"
                  />
                  <input
                    type="number"
                    placeholder="Nota (opcional)"
                    min="1.0"
                    max="7.0"
                    step="0.1"
                    value={nuevaEval.nota}
                    onChange={(e) =>
                      setNuevaEval({ ...nuevaEval, nota: e.target.value })
                    }
                    className="px-3 py-2 rounded border border-borderColor bg-bgPrimary text-textPrimary"
                  />
                </div>
                <button
                  onClick={agregarEvaluacion}
                  disabled={pesoRestante === 0}
                  className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  ➕ Agregar Evaluación
                </button>
                {pesoRestante === 0 && (
                  <p className="text-xs text-textSecondary mt-2 text-center">
                    Ya has asignado el 100% del porcentaje
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-bgSecondary px-6 py-4 border-t border-borderColor flex justify-end rounded-b-xl sticky bottom-0">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
