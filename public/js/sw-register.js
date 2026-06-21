/**
 * SportlySocial cache cleanup.
 *
 * During active development, stale service-worker app-shell caches are more
 * harmful than useful. This file intentionally unregisters existing service
 * workers and clears SportlySocial caches so deployed builds always use fresh
 * HTML, CSS, and JS.
 */

(function () {
  "use strict";

  const BUILD = "sportlysocial-mobile-focus-v34";
  const CLEANUP_KEY = `gs.cacheCleanup.${BUILD}`;

  window.gs = window.gs || {};
  window.gs.cacheBuild = BUILD;

  if (!/^https?:$/.test(window.location.protocol)) {
    console.info("[SportlySocial Cache] No service worker on", window.location.protocol);
    return;
  }

  window.addEventListener("load", () => {
    cleanupServiceWorkerCaches().catch(error => {
      console.warn("[SportlySocial Cache] Cleanup failed:", error);
    });
  });

  async function cleanupServiceWorkerCaches() {
    const alreadyCleaned = localStorage.getItem(CLEANUP_KEY) === "true";
    const registrations = "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistrations()
      : [];

    await Promise.all(registrations.map(registration => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith("gs-") ||
            name.startsWith("roarline-") ||
            name.startsWith("sportlysocial-")
          )
          .map(name => caches.delete(name))
      );
    }

    localStorage.setItem(CLEANUP_KEY, "true");

    if (!alreadyCleaned && navigator.serviceWorker?.controller) {
      window.location.reload();
    }
  }
})();
