import { test, expect } from "bun:test";
import { eur, formatAmount, formatDecimal } from "../src/format";

test("formatAmount conserva el cero explícito y agrupa miles", () => {
  expect(formatAmount("0.00")).toBe("0,00 €");
  expect(formatAmount("0", "EUR")).toBe("0,00 €");
  expect(formatAmount("1234567.89")).toBe("1.234.567,89 €");
});

test("formatAmount usa guion ASCII y no cambia el valor de los negativos", () => {
  expect(formatAmount("-1234.50")).toBe("-1.234,50 €");
  expect(formatAmount("-1234.50")).not.toContain("−");
  expect(formatAmount("-0.01")).toBe("-0,01 €");
});

test("formatAmount respeta meses y conteos sin añadir €", () => {
  expect(formatAmount("12.00", "meses")).toBe("12,00 meses");
  expect(formatAmount("5", "conteo")).toBe("5,00");
  expect(formatAmount("12.345", "EUR")).toBe("12,34 €");
});

test("eur y formatDecimal son wrappers del formateador canónico", () => {
  expect(eur(null)).toBe("Sin informar");
  expect(eur("-12.34")).toBe("-12,34 €");
  expect(formatDecimal("0.00")).toBe("0,00 €");
  expect(formatDecimal("-12.34", "meses")).toBe("-12,34 meses");
});
