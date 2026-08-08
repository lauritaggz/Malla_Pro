/**
 * Genera mallapro-cpanel-upload.zip con el contenido de dist/ (incluye .htaccess).
 * Windows: usa tar integrado. Otros: zip (instalar si hace falta: apt install zip).
 *
 * Nota: el worker de pdf.js se carga desde CDN (no va en el zip) para evitar
 * falsos positivos de ClamAV (Html.Phishing.SVGDecryption) en cPanel.
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
  console.error("dist/ no listo. Ejecuta primero: npm run build:cpanel");
  process.exit(1);
}

// Por si un build antiguo dejó el worker embebido
for (const name of fs.readdirSync(path.join(dist, "assets"), { withFileTypes: true })) {
  if (!name.isFile()) continue;
  if (/pdf\.worker/i.test(name.name)) {
    const full = path.join(dist, "assets", name.name);
    fs.rmSync(full, { force: true });
    console.log("Omitido del deploy (CDN):", path.relative(root, full));
  }
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
console.log("pdf.worker se sirve desde jsDelivr (no incluido en el zip).");
