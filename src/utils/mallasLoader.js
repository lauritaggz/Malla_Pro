// ✅ Método simple y confiable
export async function listarMallas() {
  const universidades = [
    {
      universidad: "Universidad Andrés Bello",
      mallas: [
        {
          nombre: "Ingeniería Civil Industrial",
          url: "/mallas/Industrial.json",
        },
        {
          nombre: "Ingeniería en Computación e Informática",
          url: "/mallas/Comp.json",
        },
        {
          nombre: "Geología",
          url: "/mallas/Geo.json",
        },
        {
          nombre: "Ingeniería en Marina Mercante",
          url: "/mallas/MM.json",
        },
        {
          nombre: "Ingenería Civil Informática",
          url: "/mallas/CInf.json",
        },
        {
          nombre: "Ingeniería Civil en Minas",
          url: "/mallas/Minas.json",
        },
        {
          nombre: "Medicina",
          url: "/mallas/med.json",
        },
        {
          nombre: "Tecnología Médica",
          url: "/mallas/TM.json",
        },
        {
          nombre: "Psicología",
          url: "/mallas/Psicologia.json",
        },
      ],
    },
  ];

  return universidades;
}

/**
 * Carga un JSON de malla sin caché del navegador,
 * para que ediciones en public/mallas/*.json se reflejen al recargar.
 * @param {string} url
 * @returns {Promise<object>}
 */
export async function fetchMallaJson(url) {
  if (!url) throw new Error("URL de malla vacía");

  const separator = url.includes("?") ? "&" : "?";
  const bustUrl = `${url}${separator}t=${Date.now()}`;

  const res = await fetch(bustUrl, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || typeof data !== "object") {
    throw new Error("Invalid malla JSON");
  }
  return data;
}

/**
 * Normaliza el shape del JSON de malla al usado por la UI.
 * @param {object} data
 */
export function mapMallaData(data) {
  const isMencion = !!data.menciones;
  const mencionesDisponibles = data.menciones_disponibles || [];
  const totalSemestres = data.totalSemestres || data.semestres?.length || 0;

  return {
    nombre: data.carrera || "Malla sin nombre",
    semestres: data.semestres || [],
    semestresComunes: data.semestres_comunes || [],
    menciones: data.menciones || {},
    courseCodeAliases: data.courseCodeAliases || data.course_code_aliases || {},
    isMencion,
    mencionesDisponibles,
    totalSemestres,
  };
}
