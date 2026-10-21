// Validate before acquiring SQLite or creating any local state.
export function apiBindHost(value = process.env.API_BIND_HOST): "127.0.0.1" | "0.0.0.0" {
  if (value === undefined) return "127.0.0.1";
  if (value === "127.0.0.1" || value === "0.0.0.0") return value;
  throw new Error("API_BIND_HOST debe ser 127.0.0.1 o 0.0.0.0 explícito.");
}
