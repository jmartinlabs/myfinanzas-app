import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";

/**
 * E4.10 AC19/AC20 — contrato de los contadores de bloques de foto.
 *
 * `Cierre.tsx` no exporta `countList`/`countText`/`countPhrase` y este cambio
 * no modifica código de producción. Para ejercitar la implementación real sin
 * duplicarla, se extraen sus funciones del fuente y se transpilan con Bun. La
 * prueba fija el contrato que usa `PhotoComparison`: una lista ausente o
 * ilegible devuelve `null`/«No disponible», nunca `0`; solo una lista vacía
 * real cuenta `0`.
 */
type CountList = (value: unknown) => number | null;
type CountText = (value: unknown) => string;
type CountPhrase = (
  value: unknown,
  singular: string,
  plural: string,
) => string;

function extractFunction(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`No se encontró la función ${name}.`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    else if (source[index] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`La función ${name} no tiene un cierre válido.`);
}

function loadHelpers() {
  const source = readFileSync(
    new URL("../src/Cierre.tsx", import.meta.url),
    "utf8",
  );
  const code = ["countList", "countText", "countPhrase"]
    .map((name) => extractFunction(source, name))
    .join("\n");
  const javascript = new Bun.Transpiler({ loader: "ts" }).transformSync(code);
  return new Function(
    `${javascript}\nreturn { countList, countText, countPhrase };`,
  )() as {
    countList: CountList;
    countText: CountText;
    countPhrase: CountPhrase;
  };
}

test("E4.10 AC20: un bloque ausente se muestra «No disponible», nunca 0", () => {
  const { countList, countText, countPhrase } = loadHelpers();

  for (const absent of [undefined, null, {}, "0", 0])
    expect(countList(absent)).toBeNull();
  expect(countText(undefined)).toBe("No disponible");
  expect(countText(null)).toBe("No disponible");
  expect(countPhrase(undefined, "movimiento", "movimientos")).toBe(
    "No disponible",
  );
  expect(countPhrase(null, "línea", "líneas")).toBe("No disponible");

  // Una lista vacía sí es un cero real; la ausencia no se convierte en lista.
  expect(countList([])).toBe(0);
  expect(countText([])).toBe("0");
  expect(countPhrase([], "movimiento", "movimientos")).toBe("0 movimientos");
  expect(countPhrase([1], "movimiento", "movimientos")).toBe("1 movimiento");
  expect(countPhrase([1, 2], "movimiento", "movimientos")).toBe(
    "2 movimientos",
  );
});
