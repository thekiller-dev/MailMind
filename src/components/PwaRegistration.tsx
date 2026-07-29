import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("PWA service worker registration failed", error);
    });
  }, []);

  return null;
}
