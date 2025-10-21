import Curso from "./Curso";

export default function Semestre({
  numero,
  cursos,
  aprobados,
  excepciones,
  modoExcepcional,
  aprobar,
  marcarExcepcional,
  cumplePrereqs,
}) {
  return (
    <div className="bg-bgSecondary rounded-lg p-3 shadow-md min-w-[220px] border border-borderColor">
      <h3 className="font-semibold text-primary mb-2 text-center">
        Semestre {numero}
      </h3>
      <div className="flex flex-col gap-2">
        {cursos.map((curso) => {
          const esAprobado = aprobados.includes(curso.id);
          const esExcepcional = excepciones.includes(curso.id);
          const desbloqueado = cumplePrereqs(curso);

          return (
            <Curso
              key={curso.id}
              curso={curso}
              aprobado={esAprobado}
              excepcional={esExcepcional}
              disponible={desbloqueado}
              modoExcepcional={modoExcepcional}
              aprobar={() => aprobar(curso.id)}
              marcarExcepcional={() => marcarExcepcional(curso.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
