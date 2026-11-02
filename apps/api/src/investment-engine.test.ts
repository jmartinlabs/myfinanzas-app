import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { openDatabase } from "./database";
import { positionsAtDate, positionsFor } from "./investment-engine";

/**
 * SPEC26 "Inversión a fecha Fin": the single investment engine must aggregate
 * end-of-day at any cutoff, including the cutoff day, without a parallel SQL.
 */

function fixture() {
  const db = openDatabase(":memory:");
  db.exec(`
    INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en) VALUES
      ('I0001','Fondo A','Activa',1,'f','f'),
      ('I0002','Fondo B','Activa',1,'f','f');
    INSERT INTO saldos(id,nombre,tipo,control,estado,finalidad,liquidez,bolsa,exterior,apertura,fecha_apertura,objetivo,manual,revision,creado,actualizado)
      VALUES('S006','Cartera 2','Inversión','Inversiones','Activa',NULL,0,0,0,0,NULL,NULL,NULL,1,'f','f');
  `);
  return db;
}

function operation(
  db: Database,
  id: string,
  clase: "Compra" | "Venta",
  fecha: string,
  cantidad: bigint,
  options: {
    instrumento?: string;
    saldoInversion?: string;
    estado?: "Vigente" | "Anulada";
  } = {},
) {
  db.run(
    `INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado)
     VALUES(?,?,?,?,?,?,?,1000,'EUR',NULL,1000,NULL,'Operación de prueba',NULL,?,1,'f','f')`,
    [
      id,
      clase,
      fecha,
      options.instrumento ?? "I0001",
      "S003",
      options.saldoInversion ?? "S004",
      cantidad,
      options.estado ?? "Vigente",
    ],
  );
}

test("positionsFor: sin corte conserva la vida completa y el contrato previo", () => {
  const db = fixture();
  try {
    operation(db, "1", "Compra", "2025-12-15", 100000000n);
    operation(db, "2", "Venta", "2026-01-15", 25000000n);
    operation(db, "3", "Compra", "2026-03-01", 200000000n);
    const positions = positionsFor(db, "I0001");
    expect(positions).toHaveLength(1);
    expect(positions[0].cantidad).toBe(275000000n);
    expect(positions[0]).toMatchObject({ compras: 2, ventas: 1 });
    expect(Object.keys(positions[0]).sort()).toEqual([
      "cantidad",
      "compras",
      "saldoInversion",
      "ultimaCompra",
      "ultimaOperacion",
      "ultimaVenta",
      "ventas",
    ]);
    expect(positionsFor(db, "I0001", "2026-01-31")[0].cantidad).toBe(75000000n);
  } finally {
    db.close();
  }
});

test("positionsFor: día de corte incluido y operaciones posteriores excluidas", () => {
  const db = fixture();
  try {
    operation(db, "1", "Compra", "2026-01-15", 100000000n);
    expect(positionsFor(db, "I0001", "2026-01-14")).toEqual([]);
    expect(positionsFor(db, "I0001", "2026-01-15")).toMatchObject([
      {
        cantidad: 100000000n,
        compras: 1,
        ventas: 0,
        ultimaCompra: "2026-01-15",
        ultimaOperacion: "2026-01-15",
      },
    ]);
    operation(db, "2", "Venta", "2026-01-16", 25000000n);
    expect(positionsFor(db, "I0001", "2026-01-15")[0].cantidad).toBe(100000000n);
    expect(positionsFor(db, "I0001", "2026-01-16")[0].cantidad).toBe(75000000n);
    expect(positionsFor(db, "I0001")[0].cantidad).toBe(75000000n);
  } finally {
    db.close();
  }
});

test("positionsFor: anuladas no suman ni cuentan y Compra/Venta futuras no alteran el corte", () => {
  const db = fixture();
  try {
    operation(db, "1", "Compra", "2025-11-01", 500000000n, {
      estado: "Anulada",
    });
    operation(db, "2", "Compra", "2025-12-15", 100000000n);
    operation(db, "3", "Venta", "2026-02-01", 50000000n);
    operation(db, "4", "Compra", "2026-02-02", 200000000n);
    expect(positionsFor(db, "I0001", "2026-01-31")).toMatchObject([
      {
        cantidad: 100000000n,
        compras: 1,
        ventas: 0,
        ultimaVenta: null,
        ultimaCompra: "2025-12-15",
        ultimaOperacion: "2025-12-15",
      },
    ]);
    expect(positionsFor(db, "I0001")[0]).toMatchObject({
      cantidad: 250000000n,
      compras: 2,
      ventas: 1,
    });
  } finally {
    db.close();
  }
});

test("positionsFor: conserva Saldos con solo operaciones anuladas (D5)", () => {
  const db = fixture();
  try {
    operation(db, "1", "Compra", "2025-11-01", 500000000n, {
      estado: "Anulada",
    });
    expect(positionsFor(db, "I0001", "2026-01-31")).toMatchObject([
      { cantidad: 0n, compras: 0, ventas: 0 },
    ]);
    expect(positionsFor(db, "I0001", "2025-10-31")).toEqual([]);
  } finally {
    db.close();
  }
});

test("positionsAtDate: agrega Saldo+Instrumento con vigentes hasta el corte", () => {
  const db = fixture();
  try {
    operation(db, "1", "Compra", "2025-12-15", 100000000n);
    operation(db, "2", "Compra", "2025-12-20", 200000000n, {
      saldoInversion: "S006",
    });
    operation(db, "3", "Venta", "2026-01-10", 200000000n, {
      saldoInversion: "S006",
    });
    operation(db, "4", "Compra", "2025-12-01", 900000000n, {
      instrumento: "I0002",
      estado: "Anulada",
    });
    operation(db, "5", "Compra", "2026-02-10", 500000000n, {
      instrumento: "I0002",
      saldoInversion: "S006",
    });
    const positions = positionsAtDate(db, "2026-01-31");
    expect(
      positions.map((position) => ({
        instrumento: position.instrumento,
        saldo: position.saldoInversion.id,
        cantidad: position.cantidad,
        compras: position.compras,
        ventas: position.ventas,
      })),
    ).toEqual([
      {
        instrumento: { id: "I0001", nombre: "Fondo A" },
        saldo: "S004",
        cantidad: 100000000n,
        compras: 1,
        ventas: 0,
      },
      {
        instrumento: { id: "I0001", nombre: "Fondo A" },
        saldo: "S006",
        cantidad: 0n,
        compras: 1,
        ventas: 1,
      },
    ]);
    expect(
      positionsAtDate(db, "2025-12-19").map((p) => p.saldoInversion.id),
    ).toEqual(["S004"]);
    expect(positionsAtDate(db, "2026-02-10")).toHaveLength(3);
  } finally {
    db.close();
  }
});

test("positionsAtDate: el corte es inclusivo y no asume datos posteriores", () => {
  const db = fixture();
  try {
    operation(db, "1", "Compra", "2026-01-31", 100000000n);
    expect(positionsAtDate(db, "2026-01-30")).toEqual([]);
    expect(positionsAtDate(db, "2026-01-31")).toMatchObject([
      {
        instrumento: { id: "I0001", nombre: "Fondo A" },
        saldoInversion: { id: "S004" },
        cantidad: 100000000n,
      },
    ]);
  } finally {
    db.close();
  }
});
