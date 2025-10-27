// ✅ Método simple y confiable
export async function listarMallas() {
  const universidades = [
    {
      universidad: "Universidad Andrés Bello",
      mallas: [
        {
          nombre: "Ingeniería Civil Industrial",
          url: "/mallas/unab/Industrial.json",
        },
        {
          nombre: "Ingeniería en Computación e Informática",
          url: "/mallas/unab/Comp.json",
        },
        {
          nombre: "Geología",
          url: "/mallas/unab/Geo.json",
        },
      ],
    },
  ];

  return universidades;
}
