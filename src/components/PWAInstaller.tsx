"use client";

import { useEffect, useState } from "react";

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered:", registration);
          })
          .catch((error) => {
            console.log("SW registration failed:", error);
          });
      });
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show install button
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("App is running in standalone mode");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-zinc-900 p-4 shadow-lg border border-zinc-800">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white text-sm">Install OppositeLab</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Install our app for quick access and offline functionality
          </p>
        </div>
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="text-zinc-400 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="flex-1 rounded-md border border-zinc-700 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
