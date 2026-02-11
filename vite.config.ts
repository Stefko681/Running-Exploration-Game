import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "City Fog of War",
        short_name: "FogRun",
        description: "Gamified exploration for runners (Sofia).",
        theme_color: "#030712",
        background_color: "#030712",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa.svg", sizes: "any", type: "image/svg+xml" }
        ]
      }
    })
  ],
  server: {
    host: true
  }
});

