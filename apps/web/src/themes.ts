export const THEME_STORAGE_KEY = "mf-theme";

export const themeCatalog = [
  { id: "light-s", label: "Claro", colorScheme: "light" },
  { id: "dark-s", label: "Oscuro", colorScheme: "dark" },
  { id: "hybrid-s", label: "Mixto", colorScheme: "light" },
  { id: "graphite-lime", label: "Grafito", colorScheme: "dark" },
  { id: "casa", label: "Casa", colorScheme: "light" },
] as const;

export type ThemeId = (typeof themeCatalog)[number]["id"];

export const DEFAULT_THEME: ThemeId = "dark-s";

export function isThemeId(value: unknown): value is ThemeId {
  return themeCatalog.some((theme) => theme.id === value);
}

export function currentTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const value = document.documentElement.getAttribute("data-theme");
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function applyTheme(theme: ThemeId) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The preference is optional; a blocked storage must not break the app.
  }
}
