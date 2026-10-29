import { test, expect } from "bun:test";
import { hasNextComidaPage } from "../../web/src/cycle-pagination";

test("07 B2: paginación de Comida usa el máximo de los dos totales, no la suma", () => {
  expect(hasNextComidaPage(1, { vigentes: 105, historicas: 105 })).toBe(true);
  expect(hasNextComidaPage(2, { vigentes: 105, historicas: 105 })).toBe(false);
  expect(hasNextComidaPage(1, { vigentes: 105, historicas: 0 })).toBe(true);
  expect(hasNextComidaPage(2, { vigentes: 105, historicas: 0 })).toBe(false);
  expect(hasNextComidaPage(1, { vigentes: 0, historicas: 105 })).toBe(true);
  expect(hasNextComidaPage(2, { vigentes: 0, historicas: 105 })).toBe(false);
  expect(hasNextComidaPage(2, { vigentes: 0, historicas: 0 })).toBe(false);
});
