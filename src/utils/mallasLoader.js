// ✅ Método simple y confiable
export async function listarMallas() {
  const universidades = [
    {
      universidad: "UCH",
      mallas: [
        {
          nombre: "Química y Farmacia",
          url: "/mallas/uch/QyF.json",
        },
        {
          nombre: "Bioquímica",
          url: "/mallas/uch/BQ.json",
        },
      ],
    },
    {
      universidad: "UNAB",
      mallas: [
        {
          nombre: "Ingeniería Civil Industrial",
          url: "/mallas/unab/Industrial.json",
        },
        {
          nombre: "Ingeniería en Computación e Informática",
          url: "/mallas/unab/Comp.json",
        },
      ],
    },
  ];

  return universidades;
}
