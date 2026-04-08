/**
 * Primera letra mayúscula, resto minúsculas (oración), locale es-CL.
 * Post-proceso: números romanos finales, siglas de mención, "Salud pública", Integrador I/II.
 */
function oracion(s) {
  if (s == null || s === "") return s;
  const t = String(s).trim();
  const lower = t.toLocaleLowerCase("es-CL");
  return lower.charAt(0).toLocaleUpperCase("es-CL") + lower.slice(1);
}

const MENCION_SIGLAS = {
  bacimet: "BACIMET",
  ifime: "IFIME",
  morfo: "MORFO",
  ofta: "OFTA",
  oto: "OTO",
};

function postNombreTM(s) {
  let t = oracion(s);
  t = t.replace(/^Integrador i:/, "Integrador I:");
  t = t.replace(/^Integrador ii:/, "Integrador II:");
  t = t.replace(/Salud publica/g, "Salud pública");
  t = t.replace(/\s+iv$/i, " IV");
  t = t.replace(/\s+iii$/i, " III");
  t = t.replace(/\s+ii$/i, " II");
  t = t.replace(/\s+i$/i, " I");
  for (const [low, up] of Object.entries(MENCION_SIGLAS)) {
    if (t.toLowerCase().endsWith(" " + low)) {
      t = t.slice(0, -(low.length + 1)) + " " + up;
      break;
    }
  }
  return t;
}

/** Códigos internos de mención TM; en UI/PDF la rama OTORRINO se muestra como OTO. */
const MENCION_CODIGOS = new Set(["BACIMET", "IFIME", "MORFO", "OFTA", "OTORRINO"]);

function nombreMencionDisplay(codigo) {
  return codigo === "OTORRINO" ? "OTO" : codigo;
}

function walk(obj) {
  if (obj == null) return;
  if (Array.isArray(obj)) {
    obj.forEach(walk);
    return;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (k === "nombre" && typeof obj[k] === "string") {
        if (obj.codigo && MENCION_CODIGOS.has(obj.codigo)) {
          obj[k] = nombreMencionDisplay(obj.codigo);
        } else {
          obj[k] = postNombreTM(obj[k]);
        }
      } else {
        walk(obj[k]);
      }
    }
  }
}

import fs from "fs";
const p = new URL("../public/mallas/TM.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(p, "utf8"));
walk(data);
data.carrera = "Tecnología médica (UNAB)";
fs.writeFileSync(p, JSON.stringify(data, null, 4) + "\n", "utf8");
console.log("OK", p.pathname);
