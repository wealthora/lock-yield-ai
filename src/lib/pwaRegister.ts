import { registerSW } from "virtual:pwa-register";

/**
 * Registers the app service worker ONLY in real production deployments.
 * Never registers in dev, Lovable preview, iframes, or when ?sw=off is set.
 * In refused contexts, any stale /sw.js registration is removed instead.
 */
export function setupPwa() {
  const hostname = window.location.hostname;
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (refused) {
    // Kill switch: unregister any stale app service worker in dev/preview.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
          if (url.endsWith("/sw.js")) reg.unregister();
        });
      });
    }
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every hour so the installed app stays fresh.
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });
}
