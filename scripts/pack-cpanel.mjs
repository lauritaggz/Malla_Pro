/**
 * Genera mallapro-cpanel-upload.zip con el contenido de dist/ (incluye .htaccess).
 * Windows: usa tar integrado. Otros: zip (instalar si hace falta: apt install zip).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const out = path.join(root, "mallapro-cpanel-upload.zip");

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("dist/ no listo. Ejecuta primero: npm run build");
  process.exit(1);
}

fs.rmSync(out, { force: true });

const win = os.platform() === "win32";
const result = win
  ? spawnSync("tar", ["-a", "-c", "-f", out, "-C", dist, "."], { stdio: "inherit" })
  : spawnSync("zip", ["-rq", out, "."], { cwd: dist, stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(
    win
      ? "No se pudo crear el zip con tar."
      : "No se pudo usar zip. Instálalo o comprime dist/ manualmente.",
  );
  process.exit(result.status ?? 1);
}

console.log("\nArchivo:", out);
console.log("cPanel: sube el zip → carpeta del dominio → Extraer, o sube el contenido de dist/.");
