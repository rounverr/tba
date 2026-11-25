import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  integrations: [react()],
  output: "static",
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["terminal.local"],
      proxy: {
        "/api": { target: "http://127.0.0.1:8787", changeOrigin: false },
      },
    },
  },
});
