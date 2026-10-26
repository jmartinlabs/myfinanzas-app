import { openDatabase } from "../src/database";
import { createPurchase, rectifyPurchase } from "../src/compras";

const [path, action, instrumento, operation, amount, revision, key] =
  process.argv.slice(2);
try {
  const db = openDatabase(path);
  try {
    const result =
      action === "create"
        ? createPurchase(
            db,
            {
              fecha: "2026-02-10",
              instrumento,
              saldoEfectivo: "S003",
              saldoInversion: "S004",
              cantidad: "1",
              precio: "1.00",
              divisa: "EUR",
              cambio: null,
              importeEur: amount,
              comisionEur: null,
              concepto: "Carrera ficticia",
              nota: null,
            },
            key,
          )
        : rectifyPurchase(
            db,
            operation,
            {
              revision: Number(revision),
              motivo: "Carrera ficticia",
              fecha: "2026-02-10",
              cantidad: "1",
              precio: "1.00",
              divisa: "EUR",
              cambio: null,
              importeEur: amount,
              comisionEur: null,
              concepto: "Carrera ficticia",
              nota: null,
            },
            Date.parse("2026-10-26T12:00:00Z"),
          );
    console.log(
      JSON.stringify({
        ok: true,
        id: "compra" in result ? result.compra.id : null,
        revision: "compra" in result ? result.compra.revision : null,
      }),
    );
  } finally {
    db.close();
  }
} catch (error) {
  console.log(
    JSON.stringify({
      ok: false,
      code: (error as { code?: string }).code ?? null,
      status: (error as { status?: number }).status ?? null,
    }),
  );
}
