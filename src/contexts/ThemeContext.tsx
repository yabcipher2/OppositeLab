"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type Size = "compact" | "comfortable" | "spacious";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  size: Size;
  setSize: (size: Size) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [size, setSize] = useState<Size>("comfortable");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const storedSize = localStorage.getItem("size") as Size | null;
    if (storedTheme) setTheme(storedTheme);
    if (storedSize) setSize(storedSize);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("theme", theme);
    const root = document.documentElement;
    let resolved: "light" | "dark";
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = theme;
    }
    setResolvedTheme(resolved);
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("size", size);
    const root = document.documentElement;
    root.classList.remove("compact", "comfortable", "spacious");
    root.classList.add(size);
  }, [size, mounted]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, size, setSize, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}