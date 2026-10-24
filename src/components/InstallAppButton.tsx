"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(isStandalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setHelpOpen(false);
      setMessage("OppositeLab is installed on this device.");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) {
      setHelpOpen((open) => !open);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setMessage("Installing OppositeLab...");
    setPromptEvent(null);
  };

  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Install OppositeLab</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Add the app to your home screen or desktop for a separate app window.</p>
        {installed && <p className="mt-2 text-xs text-positive">OppositeLab is installed on this device.</p>}
        {message && !installed && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
        {helpOpen && !promptEvent && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {isIOS
              ? "In Safari, tap Share, then choose Add to Home Screen."
              : "Open your browser menu and choose Install OppositeLab or Install app. The install option appears after the site is deployed over HTTPS."}
          </p>
        )}
      </div>
      {!installed && (
        <button type="button" onClick={install} className="mt-3 shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15 sm:mt-0">
          {promptEvent ? "Install app" : helpOpen ? "Hide instructions" : "Install / instructions"}
        </button>
      )}
    </section>
  );
}
