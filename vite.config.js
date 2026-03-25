import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Base URL — cambiar a "/nombre-repo/" si se despliega en GitHub Pages en subcarpeta
  base: "/",

  build: {
    outDir: "dist",
    // Dividir chunks para mejor caché
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          motion: ["framer-motion"],
          icons: ["lucide-react"],
        },
      },
    },
    // Tamaño de advertencia de chunk
    chunkSizeWarningLimit: 600,
  },

  preview: {
    port: 4173,
    host: true,
  },

  server: {
    port: 5173,
    host: true,
  },
});
