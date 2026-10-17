import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // registration is handled by src/lib/pwaRegister.ts only
      devOptions: { enabled: false },
      filename: "sw.js",
      manifest: false, // manifest is served from public/manifest.webmanifest
      workbox: {
        // Never cache navigations, auth, or API/financial data.
        navigateFallback: null,
        runtimeCaching: [
          {
            // Same-origin hashed build assets only (Vite emits them under /assets/).
            urlPattern: /\/assets\/.+/,
            handler: "CacheFirst",
            options: {
              cacheName: "wealthora-static-assets",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        // Explicitly exclude any API/auth/supabase traffic from caching.
        navigateFallbackDenylist: [/^\/~oauth/, /supabase/, /functions/],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
