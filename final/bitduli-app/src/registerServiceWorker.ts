export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("service worker registration failed", error);
    });
  });
}
