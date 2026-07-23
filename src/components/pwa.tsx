"use client";
import React, { useEffect, useState } from "react";

/* Captures Chrome's beforeinstallprompt (stashed early by the inline script in
   layout.tsx) and offers an in-app "Instalar app" button. On iOS Safari, where
   there is no install prompt, it shows the manual "Añadir a pantalla de inicio"
   steps instead. Renders nothing when the app is already installed / running
   standalone, or when the platform can't install. */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const webkit = /webkit/i.test(ua);
  const notChromeOrFirefox = !/crios|fxios|edgios/i.test(ua);
  return ios && webkit && notChromeOrFirefox;
}

export function InstallButton() {
  const [mounted, setMounted] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosSheet, setIosSheet] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    // The inline capture in layout.tsx may have grabbed the event before React ran.
    if (window.__deferredInstallPrompt) setDeferred(window.__deferredInstallPrompt);

    const onInstallable = () => setDeferred(window.__deferredInstallPrompt ?? null);
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      window.__deferredInstallPrompt = null;
    };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mounted || installed) return null;

  const canPrompt = !!deferred;
  const ios = isIosSafari();
  if (!canPrompt && !ios) return null; // platform can't offer an install here

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    setDeferred(null);
    window.__deferredInstallPrompt = null;
  }

  return (
    <>
      <button
        className="btn install-btn"
        onClick={() => (canPrompt ? install() : setIosSheet(true))}
      >
        <span aria-hidden>📲</span> Instalar app
      </button>

      {iosSheet && (
        <div className="overlay" onClick={() => setIosSheet(false)}>
          <div className="modal install-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="install-sheet-ico">📲</div>
            <h2>Añadir a la pantalla de inicio</h2>
            <p>Para tenerla como una app, en Safari:</p>
            <ol className="install-steps">
              <li>
                Pulsa <b>Compartir</b> <span className="ios-share">⬆︎</span> en la barra de abajo.
              </li>
              <li>
                Elige <b>«Añadir a pantalla de inicio»</b>.
              </li>
              <li>
                Pulsa <b>«Añadir»</b> arriba a la derecha.
              </li>
            </ol>
            <button className="btn primary" onClick={() => setIosSheet(false)} style={{ width: "100%" }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
