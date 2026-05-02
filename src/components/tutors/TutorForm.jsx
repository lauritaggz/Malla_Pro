import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import DrawerPanel from "../DrawerPanel";
import { registerTutor } from "../../data/tutorsStorage";

function normalizeDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** Chile / WhatsApp: al menos 9 dígitos móvil + código país */
function isValidPhone(raw) {
  const d = normalizeDigits(raw);
  if (d.length < 9) return false;
  const full = d.startsWith("56") ? d : `56${d}`;
  return full.length >= 11 && full.length <= 12;
}

function parseAsignaturas(text) {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function TutorForm({ isOpen, onClose, onSaved }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [asignaturasText, setAsignaturasText] = useState("");
  const [precio, setPrecio] = useState("");
  const [disponible, setDisponible] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setNombre("");
    setTelefono("");
    setAsignaturasText("");
    setPrecio("");
    setDisponible(true);
    setErrors({});
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!nombre.trim() || nombre.trim().length < 2) {
      next.nombre = "Ingresa tu nombre (mínimo 2 caracteres).";
    }
    if (!isValidPhone(telefono)) {
      next.telefono = "Número inválido. Usa formato móvil Chile (ej. +56 9 1234 5678).";
    }
    const asignaturas = parseAsignaturas(asignaturasText);
    if (asignaturas.length === 0) {
      next.asignaturas = "Indica al menos una asignatura (separadas por coma o salto de línea).";
    }
    let precioNum = null;
    if (precio.trim() !== "") {
      const n = Number(precio.replace(/\./g, "").replace(",", "."));
      if (Number.isNaN(n) || n < 0) {
        next.precio = "Precio no válido.";
      } else {
        precioNum = Math.round(n);
      }
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const list = registerTutor({
      nombre,
      telefono,
      asignaturas,
      precioPorSesion: precioNum,
      disponible,
    });
    onSaved(list);
    onClose();
  };

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Registro de tutor"
      subtitle="Tus datos se guardan solo en este dispositivo"
      width="max-w-lg"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-primary"
          >
            <UserPlus className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs text-textSecondary leading-snug">
              Aparecerás en la búsqueda cuando coincida una asignatura que dominas.
            </p>
          </motion.div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1">Nombre completo *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-borderColor bg-bgPrimary px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Ej. Ana Pérez"
              autoComplete="name"
            />
            {errors.nombre && <p className="text-[11px] text-red-500 mt-1">{errors.nombre}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1">WhatsApp (teléfono) *</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-xl border border-borderColor bg-bgPrimary px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="+56 9 1234 5678"
              inputMode="tel"
              autoComplete="tel"
            />
            {errors.telefono && <p className="text-[11px] text-red-500 mt-1">{errors.telefono}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1">Asignaturas que dominas *</label>
            <textarea
              value={asignaturasText}
              onChange={(e) => setAsignaturasText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-borderColor bg-bgPrimary px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Ej. Cálculo I, Física general, Programación"
            />
            {errors.asignaturas && <p className="text-[11px] text-red-500 mt-1">{errors.asignaturas}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1">Precio por sesión (opcional)</label>
            <input
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full rounded-xl border border-borderColor bg-bgPrimary px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Dejar vacío = a convenir"
              inputMode="decimal"
            />
            {errors.precio && <p className="text-[11px] text-red-500 mt-1">{errors.precio}</p>}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-borderColor bg-bgPrimary px-3 py-3">
            <div>
              <p className="text-sm font-medium text-textPrimary">Disponible para tutorías</p>
              <p className="text-[11px] text-textSecondary mt-0.5">
                Si está desactivado, no se mostrará el enlace de WhatsApp.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={disponible}
              onClick={() => setDisponible((v) => !v)}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                disponible ? "bg-primary" : "bg-textSecondary/30"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  disponible ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="border-t border-borderColor p-4 sm:px-6 flex gap-2 flex-shrink-0 bg-bgSecondary">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-borderColor text-sm font-medium text-textSecondary hover:bg-bgPrimary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all"
          >
            Guardar
          </button>
        </div>
      </form>
    </DrawerPanel>
  );
}
