"use client";
import React, { useEffect } from "react";
import { useGame } from "../lib/store";
import Home from "./Home";
import LevelMap from "./LevelMap";
import GameScreen from "./GameScreen";

export default function Game() {
  const screen = useGame((s) => s.screen);
  const hydrate = useGame((s) => s.hydrate);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let raf = 0;
    let last = typeof performance !== "undefined" ? performance.now() : 0;
    const loop = (t: number) => {
      const dt = Math.min(120, t - last);
      last = t;
      tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  // prevent context menu / text selection on long-press for a native feel
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);

  // register the service worker so the game installs + works offline like an app
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  if (screen === "home") return <Home />;
  if (screen === "map") return <LevelMap />;
  return <GameScreen />;
}
