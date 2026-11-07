import { describe, expect, test } from "bun:test";
import {
  catalogoCiclosUrl,
  comparacionVersionUrl,
  comparacionVigente,
  contextoComparacion,
  contrasteUrl,
  fotoCicloUrl,
  periodoUrl,
  versionesUrl,
} from "../src/fotos/requests";

describe("URLs de consulta de /fotos", () => {
  test("el catálogo pagina con estado vacío", () => {
    expect(catalogoCiclosUrl(1)).toBe("/ciclos?estado=&page=1");
    expect(catalogoCiclosUrl(100)).toBe("/ciclos?estado=&page=100");
  });

  test("versiones y foto de ciclo codifican el id y la versión", () => {
    expect(versionesUrl("1")).toBe("/fotos/ciclos/1/versiones");
    expect(versionesUrl("Ciclo 1/2")).toBe(
      "/fotos/ciclos/Ciclo%201%2F2/versiones",
    );
    expect(fotoCicloUrl("1", "")).toBe("/fotos/ciclos/1");
    expect(fotoCicloUrl("1", "2")).toBe("/fotos/ciclos/1?version=2");
    expect(fotoCicloUrl("Ciclo 1", "3")).toBe(
      "/fotos/ciclos/Ciclo%201?version=3",
    );
  });

  test("contraste y comparación conservan las rutas publicadas", () => {
    expect(contrasteUrl("1")).toBe("/fotos/contraste?ciclo=1");
    expect(contrasteUrl("Ciclo 1/2")).toBe(
      "/fotos/contraste?ciclo=Ciclo%201%2F2",
    );
    expect(comparacionVersionUrl("1", 1)).toBe(
      "/fotos/ciclos/1?version=1",
    );
    expect(comparacionVersionUrl("Ciclo 1", 12)).toBe(
      "/fotos/ciclos/Ciclo%201?version=12",
    );
  });

  test("el periodo por identidad codifica el id e ignora filtros", () => {
    expect(periodoUrl("Trimestre", "9", "2026", "3", "A1")).toBe(
      "/fotos/periodos/9",
    );
    expect(periodoUrl("Anio", "A/1", "2026", "3", "A1")).toBe(
      "/fotos/periodos/A%2F1",
    );
  });

  test("el periodo por consulta respeta modo, trimestre y versión", () => {
    expect(periodoUrl("Trimestre", "", "2026", "3", "A1")).toBe(
      "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=3&version=A1",
    );
    expect(periodoUrl("Trimestre", "", "2026", "3", "")).toBe(
      "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=3",
    );
    expect(periodoUrl("Anio", "", "2027", "3", "")).toBe(
      "/fotos/periodos?tipo=Anio&ejercicio=2027",
    );
    expect(periodoUrl("Anio", "", "2027", "3", "A2")).toBe(
      "/fotos/periodos?tipo=Anio&ejercicio=2027&version=A2",
    );
  });
});

describe("guardas puras de la comparación", () => {
  const versiones = [{ version: 3 }, { version: 1 }, { version: 2 }];

  test("contextoComparacion distingue null, lista vacía y orden", () => {
    expect(contextoComparacion("1", null)).toBe("1|null");
    expect(contextoComparacion("1", [])).toBe("1|");
    expect(contextoComparacion("1", versiones)).toBe("1|3,1,2");
    expect(contextoComparacion("2", versiones)).toBe("2|3,1,2");
  });

  test("comparacionVigente exige token y contexto actuales", () => {
    expect(comparacionVigente(2, 2, "1|3,1,2", "1|3,1,2")).toBe(true);
    expect(comparacionVigente(1, 2, "1|3,1,2", "1|3,1,2")).toBe(false);
    expect(comparacionVigente(2, 2, "1|3,1,2", "2|3,1,2")).toBe(false);
    expect(comparacionVigente(2, 2, "1|null", "1|")).toBe(false);
  });
});
