import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CityQuest",
        short_name: "CityQuest",
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

