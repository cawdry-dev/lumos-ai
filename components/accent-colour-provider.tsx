"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const DEFAULT_ACCENT = "#6366f1";
const LS_KEY = "accent-colour";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastForeground(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = relativeLuminance(r, g, b);
  const whiteContrast = contrastRatio(1, lum);
  const blackContrast = contrastRatio(lum, 0);
  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

function computeSecondary(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lighten = (c: number) => Math.round(c + (255 - c) * 0.3);
  return `#${[lighten(r), lighten(g), lighten(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbString(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

type AccentColourContextValue = {
  accentColour: string;
  setAccentColour: (hex: string) => void;
  getContrastForeground: (hex: string) => string;
};

const AccentColourContext = createContext<AccentColourContextValue>({
  accentColour: DEFAULT_ACCENT,
  setAccentColour: () => {},
  getContrastForeground,
});

function applyAccentVars(hex: string) {
  const style = document.documentElement.style;
  const secondary = computeSecondary(hex);
  const isDark = document.documentElement.classList.contains("dark");

  style.setProperty("--org-primary", hex);
  style.setProperty("--org-secondary", secondary);
  style.setProperty("--org-primary-rgb", rgbString(hex));
  style.setProperty("--org-secondary-rgb", rgbString(secondary));
  style.setProperty("--primary", hex);
  style.setProperty("--accent", hex);
  style.setProperty("--ring", hex);
  style.setProperty("--primary-foreground", getContrastForeground(hex));
  style.setProperty(
    "--accent-foreground",
    isDark ? "#ffffff" : getContrastForeground(hex),
  );
}

export function AccentColourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accentColour, setAccentColourState] = useState(DEFAULT_ACCENT);

  // Read from localStorage on mount, then try to fetch from profile
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && /^#[0-9a-fA-F]{6}$/.test(stored)) {
      setAccentColourState(stored);
      applyAccentVars(stored);
    } else {
      applyAccentVars(DEFAULT_ACCENT);
    }

    // Fetch accent colour from profile for cross-device sync
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.accentColour && /^#[0-9a-fA-F]{6}$/.test(data.accentColour)) {
          setAccentColourState(data.accentColour);
          localStorage.setItem(LS_KEY, data.accentColour);
          applyAccentVars(data.accentColour);
        }
      })
      .catch(() => {
        // Silently fall back to localStorage value
      });
  }, []);

  // Re-apply vars when accent changes
  useEffect(() => {
    applyAccentVars(accentColour);
  }, [accentColour]);

  // Watch for dark mode class changes to recompute foreground
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyAccentVars(accentColour);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [accentColour]);

  const setAccentColour = useCallback((hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    setAccentColourState(hex);
    localStorage.setItem(LS_KEY, hex);
  }, []);

  return (
    <AccentColourContext.Provider
      value={{ accentColour, setAccentColour, getContrastForeground }}
    >
      {children}
    </AccentColourContext.Provider>
  );
}

export function useAccentColour() {
  return useContext(AccentColourContext);
}

