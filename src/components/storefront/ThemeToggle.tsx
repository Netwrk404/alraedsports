"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const themeStorageKey = "alraed-color-theme";
const themeChangeEvent = "alraed-theme-change";

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeToThemeChanges(onChange: () => void) {
  window.addEventListener(themeChangeEvent, onChange);
  return () => window.removeEventListener(themeChangeEvent, onChange);
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToThemeChanges, getTheme, () => "light");

  useLayoutEffect(() => {
    try {
      document.documentElement.dataset.theme =
        window.localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
    } catch (error) {
      console.error("Could not restore the saved color theme.", error);
    }
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(themeChangeEvent));

    try {
      window.localStorage.setItem(themeStorageKey, nextTheme);
    } catch (error) {
      console.error("Could not save the selected color theme.", error);
    }
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  );
}
