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
          url: "/mallas/Geo.json",
        },
        {
          nombre: "Ingenería Civil Informática",
          url: "/mallas/Geo.json",
        },
        {
          nombre: "Ingeniería Civil en Minas",
          url: "/mallas/Geo.json",
        },
      ],
    },
  ];

  return universidades;
}
