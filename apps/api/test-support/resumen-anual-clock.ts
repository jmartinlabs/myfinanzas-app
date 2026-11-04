/**
 * Reloj fijo del servidor E2E de E4.7. La fixture cruza 2026/2027 y E4.4
 * rechaza cortes futuros; el test debe ejecutarse con un reloj posterior al
 * corte 2027-01-15 y usar el mismo instante para MFA y datos.
 */
export const RESUMEN_ANUAL_NOW = Date.parse("2027-02-01T10:00:00Z");
