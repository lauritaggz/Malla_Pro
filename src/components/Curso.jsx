import { useState, useRef, useEffect } from "react";
import { NotebookPen, Check, BookOpen } from "lucide-react";

export default function Curso({
  curso,
  aprobado,
  excepcional,
  disponible,
  modoExcepcional,
  aprobar,
  marcarExcepcional,
  enCurso,
  toggleCursando,
  onAbrirNotas,
}) {
  const [shake, setShake] = useState(false);
  const [promedio, setPromedio] = useState(null);
  
  useEffect(() => {
    const actualizarPromedio = () => {
      try {
        const notasGuardadas = JSON.parse(localStorage.getItem("malla-notas") || "{}");
        const evals = notasGuardadas[curso.id] || [];
        const conNota = evals.filter((e) => e.nota != null && !isNaN(e.nota));
        const pesoTotal = conNota.reduce((sum, e) => sum + (e.peso || 0), 0);
        if (pesoTotal > 0) {
          const sumPonderada = conNota.reduce((sum, e) => sum + e.nota * e.peso, 0);
          setPromedio(sumPonderada / pesoTotal);
        } else {
          setPromedio(null);
        }
      } catch (err) {
        setPromedio(null);
      }
    };
    
    actualizarPromedio();
    window.addEventListener("notasModificadas", actualizarPromedio);
    return () => window.removeEventListener("notasModificadas", actualizarPromedio);
  }, [curso.id]);
  
  // Custom Long Press Logic para móviles
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const startPressTimer = (e) => {
    isLongPressRef.current = false;
    // Si no está disponible y no está "en curso" (ej. para desmarcarlo), 
    // y no estamos en modo excepcional, no dejamos hacer long press
    if (!disponible && !modoExcepcional && !enCurso) return;
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // Vibración háptica en móviles si es compatible
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      toggleCursando();
    }, 500); // Medio segundo para activarse
  };

  const clearPressTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e) => {
    // Si fue un long press exitoso, cancelamos el click normal
    if (isLongPressRef.current) return;
    // Si no está disponible y no estamos en modo excepcional
    if (!disponible && !modoExcepcional) {
      // Permitimos quitarlo de "en curso" si por algún motivo ya lo estaba
      if (e.ctrlKey && enCurso) {
        toggleCursando();
        return;
      }
      
      // De lo contrario, no se puede hacer nada, solo vibra
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    // CTRL → marcar en curso (ahora seguro porque sabemos que está disponible o en modo excepcional)
    if (e.ctrlKey) {
      toggleCursando();
      return;
    }

    // Excepcional
    if (modoExcepcional) {
      marcarExcepcional();
      return;
    }

    // Aprobar normal
    aprobar();
  };

  return (
    <div
      onClick={handleClick}
      onPointerDown={startPressTimer}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      className={`relative cursor-pointer select-none p-3 text-[13px] rounded-2xl transition-all duration-300 border shadow-sm text-left group
        ${shake ? "shake" : ""}
        ${
          aprobado
            ? "bg-emerald-500/90 text-white border-emerald-400/50 shadow-md backdrop-blur-md"
            : excepcional
            ? "bg-amber-500/90 text-white border-amber-400/50 shadow-md backdrop-blur-md"
            : enCurso
            ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 transform scale-[1.02]"
            : !disponible
            ? "bg-bgSecondary/50 text-textSecondary opacity-70 border-dashed border-borderColor/80"
            : "bg-primary/10 backdrop-blur-md text-textPrimary shadow-sm hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_8px_16px_rgba(var(--primary),0.15)] border-primary/30"
        }
      `}
    >
      {/* Badge de Promedio en el Top Right */}
      {promedio !== null && (
        <div 
          className={`absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold rounded-md border flex items-center justify-center min-w-[30px] shadow-sm transition-all
            ${
              aprobado || excepcional || enCurso
                ? "bg-white/20 border-white/30 text-white" 
                : "bg-primary/15 border-primary/30 text-primary"
            }`}
        >
          {promedio.toFixed(1)}
        </div>
      )}

      {/* Nombre (agregamos pr-8 si hay promedio para no chocar con el badge) */}
      <div className={`font-semibold leading-tight mb-1.5 line-clamp-2 ${promedio !== null ? 'pr-8' : ''}`}>
        {curso.nombre}
      </div>

      {/* Código y SCT juntos */}
      <div className="text-[10.5px] font-medium opacity-75 flex items-center gap-1.5">
        <span>{curso.codigo}</span>
        <span className="opacity-50 text-[8px]">●</span>
        <span>{curso.sct} SCT</span>
      </div>

      {/* BOTÓN DE NOTAS */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Evita activar aprobar()
          onAbrirNotas(curso);
        }}
        className={`mt-2 w-full py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[11px] font-medium border
          ${
            enCurso || aprobado || excepcional
              ? "bg-black/15 hover:bg-black/25 text-white border-white/20"
              : "bg-bgPrimary/50 hover:bg-primary/10 text-textSecondary hover:text-primary border-borderColor/30 hover:border-primary/30"
          }
        `}
      >
        <NotebookPen className="w-3.5 h-3.5" /> Notas
      </button>
    </div>
  );
}
