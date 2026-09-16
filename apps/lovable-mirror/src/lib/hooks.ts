"use client";

import { useEffect } from "react";

type HotkeyHandler = (event: KeyboardEvent) => void;

/**
 * Registers a global keydown listener. Returns a cleanup function.
 * Skips events when the user is typing in an input, textarea, or select,
 * or when a Radix dialog is open.
 */
export function useHotkeys(bindings: [string, HotkeyHandler][]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        target.closest("[role='dialog']") ||
        target.closest("[data-state='open']")
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const mods: string[] = [];
      if (event.ctrlKey || event.metaKey) mods.push("ctrl");
      if (event.shiftKey) mods.push("shift");
      if (event.altKey) mods.push("alt");

      for (const [combo, handler] of bindings) {
        const parts = combo.toLowerCase().split("+");
        const comboKey = parts[parts.length - 1];
        const comboMods = parts.slice(0, -1);

        if (key === comboKey && comboMods.every((m) => mods.includes(m))) {
          event.preventDefault();
          handler(event);
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [bindings]);
}
