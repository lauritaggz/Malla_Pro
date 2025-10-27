import { useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import Curso from "./Curso";

export default function MallaViewer({
  mallaSeleccionada,
  modoExcepcional,
  setExcepcionesActivas,
  onTotalCursosChange,
  onSemestresLoaded,
}) {
  const [malla, setMalla] = useState(null);
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(0);

  // ✅ Cargar malla seleccionada
  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(mallaSeleccionada.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const totalSemestres = data.semestres?.length || 0;
        setMalla({
          nombre: data.carrera || "Malla sin nombre",
          semestres: data.semestres || [],
          totalSemestres,
        });
        onSemestresLoaded?.(totalSemestres);
      } catch (err) {
        console.error("Error al cargar malla:", err);
      }
    }
    cargar();
  }, [mallaSeleccionada, onSemestresLoaded]);

  // ✅ Guardar en localStorage
  useEffect(() => {
    setExcepcionesActivas(excepciones.length);
    localStorage.setItem("malla-aprobados", JSON.stringify(aprobados));
    localStorage.setItem("malla-excepciones", JSON.stringify(excepciones));
    localStorage.setItem("malla-cursando", JSON.stringify(cursando));
  }, [aprobados, excepciones, cursando, setExcepcionesActivas]);

  // ✅ Calcular progreso cada vez que cambia el estado
  useEffect(() => {
    if (!malla?.semestres || !onTotalCursosChange) return;

    const total = malla.semestres.reduce(
      (acc, sem) => acc + sem.cursos.length,
      0
    );

    const aprobadosCount = aprobados.length;

    onTotalCursosChange({ total, aprobados: aprobadosCount });
  }, [malla, aprobados, excepciones, onTotalCursosChange]);

  // ✅ Aprobar o desmarcar ramo
  const aprobar = (id) => {
    if (aprobados.includes(id)) {
      setAprobados(aprobados.filter((a) => a !== id));
    } else {
      setAprobados([...aprobados, id]);
    }
  };

  // ✅ Marcar / desmarcar como excepcional
  const marcarExcepcional = (id) => {
    if (excepciones.includes(id)) {
      setExcepciones(excepciones.filter((e) => e !== id));
      setAprobados(aprobados.filter((a) => a !== id));
    } else {
      setExcepciones([...excepciones, id]);
      if (!aprobados.includes(id)) setAprobados([...aprobados, id]);
    }
  };

  // ✅ En curso (Ctrl + clic)
  const toggleCursando = (id) => {
    if (cursando.includes(id)) {
      setCursando(cursando.filter((c) => c !== id));
    } else {
      setCursando([...cursando, id]);
    }
  };

  // ✅ Aprobar hasta semestre (evento global desde Navbar)
  const aprobarHastaSemestre = (semestreLimite) => {
    if (!malla) return;
    const nuevosAprobados = [];
    malla.semestres.forEach((sem) => {
      if (sem.numero <= semestreLimite) {
        sem.cursos.forEach((curso) => nuevosAprobados.push(curso.id));
      }
    });
    setAprobados([...new Set(nuevosAprobados)]);
    setExcepciones([]);
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
  }, [malla]);

  // ✅ Drag horizontal tipo Trello
  const bind = useDrag(
    ({ first, last, event }) => {
      const el = scrollRef.current;
      if (!el) return;

      if (first) {
        setIsDragging(true);
        setDragMoved(0);
      }

      if (event?.deltaX) {
        el.scrollLeft -= event.deltaX;
        setDragMoved((prev) => prev + Math.abs(event.deltaX));
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

  // ✅ Evita clics falsos tras arrastrar
  const handleClickCapture = (e) => {
    if (dragMoved > 3) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (!malla)
    return <p className="text-center text-textSecondary">Cargando malla...</p>;

  // ✅ Render principal
  return (
    <div className="pb-10 px-2 sm:px-4 md:px-6">
      {/* Instrucciones de scroll para móvil */}
      <div className="md:hidden text-center text-textSecondary text-xs mb-3">
        ← Desliza horizontalmente para ver más semestres →
      </div>

      {/* Scroll horizontal arrastrable */}
      <div
        ref={scrollRef}
        {...bind()}
        onClickCapture={handleClickCapture}
        className={`overflow-x-auto scroll-container overscroll-x-contain glass-effect rounded-lg p-4 ${
          isDragging ? "dragging" : "cursor-grab"
        } active:cursor-grabbing`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-3 sm:gap-6 md:gap-8 min-w-max py-2 sm:py-3 md:py-4">
          {Array.from({ length: Math.ceil(malla.semestres.length / 2) }).map(
            (_, i) => {
              const year = i + 1;
              const semA = malla.semestres[i * 2];
              const semB = malla.semestres[i * 2 + 1];

              return (
                <div
                  key={year}
                  className="min-w-[320px] sm:min-w-[380px] md:min-w-[460px] flex-shrink-0"
                >
                  <div className="text-center text-textSecondary font-semibold mb-3 sm:mb-4">
                    Año {year}
                  </div>

                  <div className="flex gap-4 sm:gap-8">
                    {[semA, semB].map(
                      (sem, idx) =>
                        sem && (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 sm:gap-3 min-w-[160px] sm:min-w-[210px]"
                          >
                            {sem.cursos.map((curso) => (
                              <Curso
                                key={curso.id}
                                curso={curso}
                                aprobado={aprobados.includes(curso.id)}
                                excepcional={excepciones.includes(curso.id)}
                                disponible={cumplePrereqs(curso)}
                                modoExcepcional={modoExcepcional}
                                aprobar={() => aprobar(curso.id)}
                                marcarExcepcional={() =>
                                  marcarExcepcional(curso.id)
                                }
                                enCurso={cursando.includes(curso.id)}
                                toggleCursando={() => toggleCursando(curso.id)}
                              />
                            ))}
                          </div>
                        )
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
