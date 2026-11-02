// Isolated fictional E4.2 source with real MFA. No fixture API or auth bypass.
// Fixture F-A of SPEC22 §2 plus two extra lots whose net is folded into the S003
// opening, a zero position, an inactive Instrument with quantity and a separate
// D2 cash pair. Every figure is synthetic and deterministic.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createSaldo, getSaldo, updateSaldo } from "../src/saldos";
import {
  changeInstrumentoState,
  createInstrumento,
} from "../src/instrumentos";
import { createPurchase } from "../src/compras";
import { annulSale, createSale } from "../src/ventas";
import { createClassification } from "../src/clasificacion";
import { previewMovement, writeMovement } from "../src/movimientos";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = ".local/e2e-ventas";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z");
const id = () => randomUUID();
// F-A: opening 1.000,00 + 2.500,00 entries − 300,00 exits = 3.200,00. The two
// extra fictional lots add 300,00 of purchases, so the stored opening is 3.280,00
// and the broker cash remains the documented 1.810,40 after the demo sale.
updateSaldo(db, "S003", {
  revision: getSaldo(db, "S003").revision,
  saldoApertura: "3280.00",
  fechaApertura: "2026-01-01",
  permiteSalidaExterior: true,
});
const s006 = createSaldo(
  db,
  {
    nombre: "Cartera secundaria demo",
    tipo: "Inversión",
    control: "Inversiones",
  },
  id(),
  now,
);
// Separate cash pair used only by the D2 preview: it keeps the S003 timeline of
// AC-32 untouched while allowing a real INSUFFICIENT_CASH annulment.
const s007 = createSaldo(
  db,
  {
    nombre: "Efectivo secundario demo",
    tipo: "Efectivo",
    control: "Inversiones",
    saldoApertura: "1000.00",
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  },
  id(),
  now,
);
const s008 = createSaldo(
  db,
  {
    nombre: "Cartera secundaria 2 demo",
    tipo: "Inversión",
    control: "Inversiones",
  },
  id(),
  now,
);
const i1001 = createInstrumento(
    db,
    {
      nombre: "Fondo índice demo",
      isin: "ES0000000001",
      isinEvidencia: "Extracto ficticio F-01 · 2026-01-10",
      divisaReferencia: "EUR",
    },
    id(),
    now,
  ).instrumento,
  i1002 = createInstrumento(
    db,
    { nombre: "Fondo inactivo demo", divisaReferencia: "EUR" },
    id(),
    now,
  ).instrumento,
  i1003 = createInstrumento(
    db,
    {
      nombre: "Fondo cerrado demo",
      isin: "ES0000000003",
      isinEvidencia: "Extracto ficticio F-03 · 2026-01-10",
      divisaReferencia: "EUR",
    },
    id(),
    now,
  ).instrumento;
db.run("UPDATE counters SET next=5001 WHERE name='operaciones_inversion'");
const purchase = (
  fecha: string,
  saldoEfectivo: string,
  saldoInversion: string,
  instrumento: string,
  cantidad: string,
  precio: string,
  divisa: string,
  cambio: string | null,
  importeEur: string,
  comisionEur: string | null,
  concepto: string,
) =>
  createPurchase(
    db,
    {
      fecha,
      instrumento,
      saldoEfectivo,
      saldoInversion,
      cantidad,
      precio,
      divisa,
      cambio,
      importeEur,
      comisionEur,
      concepto,
      nota: null,
    },
    id(),
    now,
  );
const sale = (
  fecha: string,
  saldoEfectivo: string,
  saldoInversion: string,
  instrumento: string,
  cantidad: string,
  precio: string,
  divisa: string,
  cambio: string | null,
  importeEur: string,
  concepto: string,
) =>
  createSale(
    db,
    {
      fecha,
      instrumento,
      saldoEfectivo,
      saldoInversion,
      cantidad,
      precio,
      divisa,
      cambio,
      importeEur,
      comisionEur: null,
      concepto,
      nota: null,
    },
    id(),
    now,
  );
// P1, P2 of F-A; P3/P4 open the zero position and the inactive quantity.
purchase(
  "2026-02-10",
  "S003",
  "S004",
  i1001.id,
  "12.5",
  "100.00",
  "USD",
  "0.900000",
  "1125.00",
  "5.00",
  "Compra P1 demo",
);
purchase(
  "2026-03-03",
  "S003",
  s006.id,
  i1001.id,
  "3",
  "98.00",
  "USD",
  "0.900000",
  "264.60",
  "0.00",
  "Compra P2 demo",
);
purchase(
  "2026-02-15",
  "S003",
  "S004",
  i1003.id,
  "2",
  "100.00",
  "EUR",
  null,
  "200.00",
  null,
  "Compra de la posición cero demo",
);
purchase(
  "2026-02-20",
  "S003",
  "S004",
  i1002.id,
  "1",
  "100.00",
  "EUR",
  null,
  "100.00",
  null,
  "Compra del Instrumento inactivo demo",
);
// V1-equivalent scenario: a vigente sale in S004 and one annulled sale in S006.
sale(
  "2026-03-10",
  "S003",
  "S004",
  i1003.id,
  "2",
  "110.00",
  "EUR",
  null,
  "220.00",
  "Venta que deja la posición a 0",
);
const annulled = sale(
  "2026-03-15",
  "S003",
  s006.id,
  i1001.id,
  "1",
  "105.00",
  "EUR",
  null,
  "105.00",
  "Venta anulada demo",
);
annulSale(
  db,
  annulled.venta.id,
  { revision: 1, motivo: "Anulación ficticia de listado" },
  now,
);
// D2: sell 500,00, spend 1.300,00, then annulling the sale would leave −400,00.
purchase(
  "2026-03-01",
  s007.id,
  s008.id,
  i1003.id,
  "1",
  "100.00",
  "EUR",
  null,
  "100.00",
  null,
  "Compra de la pareja D2 demo",
);
const d2Sale = sale(
  "2026-03-12",
  s007.id,
  s008.id,
  i1003.id,
  "1",
  "500.00",
  "EUR",
  null,
  "500.00",
  "Venta D2 demo",
);
void d2Sale;
const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría ventas demo",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    id(),
    now,
  ),
  sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ventas demo", padre: category.id },
    id(),
    now,
  ),
  partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ventas demo", padre: sub.id },
    id(),
    now,
  );
const gasto = {
  fecha: "2026-03-13",
  tipo: "Gasto" as const,
  importe: "1300.00",
  saldo: s007.id,
  partida: partida.id,
  concepto: "Gasto D2 demo",
  nota: "",
};
const preview = previewMovement(db, gasto, null, false, now);
writeMovement(
  db,
  {
    ...gasto,
    fingerprint: preview.fingerprint,
    contextRevision: preview.contextRevision,
  },
  id(),
  null,
  false,
  now,
);
// D3: inactive Instrument with quantity in S004 only.
changeInstrumentoState(
  db,
  i1002.id,
  { revision: 1, motivo: "Instrumento ficticio fuera de uso" },
  false,
  now,
);
writeFileSync(dir + "/bootstrap.txt", provision(db, now), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key, now: () => now })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3011 })),
    ),
  ),
);
