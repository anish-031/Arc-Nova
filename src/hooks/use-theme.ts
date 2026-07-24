import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "arcnova.theme";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(KEY) as Theme | null) ?? "light";
      setThemeState(saved);
      apply(saved);
    } catch {
      apply("light");
    }
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    apply(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  }

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
