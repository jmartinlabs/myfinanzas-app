import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { prepareSchema } from "./database-schema";
import {
  coberturaDevoluciones,
  compararUniverso,
  huellaDe,
  huellaUniverso,
  impactoDeCandidatos,
  medirCandidatos,
  universoFinanciero,
  type UniversoFinanciero,
} from "./cierre-validacion-impacto";
import type { GreIntervalo } from "./devoluciones";

/**
 * SPEC38 · I2 — materialidad medida (§3.1–§3.3).
 *
 * La revisión de Álex detectó que la huella material hasheaba el universo
 * completo (incluida `atribucion[].revision` y `cobertura`) mientras el
 * comparador las excluía: una errata podía dar `material=true` con
 * `motivos=[]`. Estas pruebas fijan el contrato corregido con casos negativos y
 * positivos, y comprueban que `material` y `motivos` no pueden divergir.
 */

const t = "2026-01-01T00:00:00.000Z";

function store(): Database {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

function clasificacion(db: Database) {
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [t, t],
  );
  db.run(`INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`, [t, t]);
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0001','Ficticia','SUB0001','Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0002','Otra','SUB0001','Activa',1,?,?)`,
    [t, t],
  );
}

function ciclos(db: Database) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-01-01',0,?)", [t]);
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('2','2026-02-01',0,?)", [t]);
}

function gasto(
  db: Database,
  id = "1",
  importe = 1000,
  partida: string | null = "PAR0001",
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?, '2026-01-04','Gasto',?,'S001','S000',NULL,?,'Ficticio','',0,1,?,?)`,
    [id, importe, partida, t, t],
  );
}

/**
 * Abono de SPEC39: movimiento `Devolución de gasto` y, salvo huérfano, su fila
 * de atribución. La compra se crea con tope suficiente salvo que la prueba lo
 * reduzca después para representar un histórico excedido.
 */
function devolucion(
  db: Database,
  id: string,
  importe: number,
  opciones: {
    compra?: string | null;
    estado?: "Verificado" | "Revisar" | "Sin vínculo";
    elegibilidad?: "Acreditada" | "No acreditada";
    ciclo?: string | null;
    partida?: string | null;
    fecha?: string;
  } = {},
) {
  const compra = opciones.compra === undefined ? "1" : opciones.compra;
  const estado = opciones.estado ?? "Verificado";
  const elegibilidad = opciones.elegibilidad ?? "Acreditada";
  const ciclo = opciones.ciclo === undefined ? "1" : opciones.ciclo;
  const partida = opciones.partida === undefined ? "PAR0001" : opciones.partida;
  const fecha = opciones.fecha ?? "2026-01-10";
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?,?,'Devolución de gasto',?,'S000','S001',NULL,NULL,'Abono ficticio','',0,1,?,?)`,
    [id, fecha, importe, t, t],
  );
  if (estado === "Sin vínculo") return;
  db.run(
    `INSERT INTO movimiento_devolucion(movimiento,compra,partida,ciclo_origen,
       evidencia_relacion,evidencia_origen_temporal,elegibilidad,estado,
       revision_movimiento,revision,creado,actualizado)
     VALUES(?,?,?,?,'Evidencia ficticia','Documento ficticio',?,?,1,1,?,?)`,
    [id, compra, partida, ciclo, elegibilidad, estado, t, t],
  );
}

function base(): Database {
  const db = store();
  clasificacion(db);
  ciclos(db);
  gasto(db);
  return db;
}

/** Mide antes/después del mismo ciclo tras aplicar `mutar`. */
function impactoTras(db: Database, mutar: () => void) {
  const antes = medirCandidatos(db, ["1"]);
  mutar();
  const despues = medirCandidatos(db, ["1"]);
  const impactos = impactoDeCandidatos(antes, despues);
  expect(impactos.length).toBe(1);
  return impactos[0]!;
}

function clonar(universo: UniversoFinanciero): UniversoFinanciero {
  return structuredClone(universo);
}

test("I2 impacto: una errata de Concepto que sólo sube la revisión no es material (AC-12)", () => {
  const db = base();
  try {
    const impacto = impactoTras(db, () =>
      db.run(
        "UPDATE movimientos SET concepto='Errata corregida',nota='Otra nota',revision=revision+1 WHERE id='1'",
      ),
    );
    expect(impacto.material).toBe(false);
    expect(impacto.motivos).toEqual([]);
    expect(impacto.huellaAntes).toBe(impacto.huellaDespues);
    expect(db.query("SELECT revision FROM movimientos WHERE id='1'").get()).toEqual({ revision: 2 });
  } finally {
    db.close();
  }
});

test("I2 impacto: subir sólo la revisión técnica tampoco marca ni mueve la huella", () => {
  const db = base();
  try {
    const impacto = impactoTras(db, () =>
      db.run("UPDATE movimientos SET revision=revision+1 WHERE id='1'"),
    );
    expect(impacto.material).toBe(false);
    expect(impacto.motivos).toEqual([]);
    expect(impacto.huellaAntes).toBe(impacto.huellaDespues);
  } finally {
    db.close();
  }
});

test("I2 impacto: un cambio real de importe marca FLUJO_CICLO y mueve la huella", () => {
  const db = base();
  try {
    const impacto = impactoTras(db, () =>
      db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    );
    expect(impacto.material).toBe(true);
    expect(impacto.motivos).toContain("FLUJO_CICLO");
    expect(impacto.huellaAntes).not.toBe(impacto.huellaDespues);
  } finally {
    db.close();
  }
});

test("I2 impacto: cambiar la Partida mueve la atribución (ATRIBUCION)", () => {
  const db = base();
  try {
    const impacto = impactoTras(db, () =>
      db.run("UPDATE movimientos SET partida='PAR0002',revision=revision+1 WHERE id='1'"),
    );
    expect(impacto.material).toBe(true);
    expect(impacto.motivos).toEqual(["ATRIBUCION"]);
  } finally {
    db.close();
  }
});

test("I2 impacto: Concepto y Partida en la misma operación es material (AC-12)", () => {
  const db = base();
  try {
    const impacto = impactoTras(db, () =>
      db.run(
        "UPDATE movimientos SET concepto='Reclasificado',partida='PAR0002',revision=revision+1 WHERE id='1'",
      ),
    );
    expect(impacto.material).toBe(true);
    expect(impacto.motivos).toContain("ATRIBUCION");
    expect(impacto.huellaAntes).not.toBe(impacto.huellaDespues);
  } finally {
    db.close();
  }
});

test("I2 impacto: un cambio de ventana o de S0 se mide con su propio motivo", () => {
  const db = base();
  try {
    // La corrección de Inicio/S0 pasa por el procedimiento revisado de §4, que
    // esta prueba no simula: se ejerce el comparador sobre la proyección, que
    // es lo que la materialidad mide.
    const antes = universoFinanciero(db, "1");
    const ventana = clonar(antes);
    ventana.ventana = { ...ventana.ventana, inicio: "2026-01-02" };
    expect(compararUniverso(antes, ventana).motivos).toEqual(["VENTANA_CICLO"]);
    const s0 = clonar(antes);
    s0.ventana = { ...s0.ventana, s0: "500" };
    expect(compararUniverso(antes, s0).motivos).toEqual(["S0_CICLO"]);
    expect(huellaUniverso(ventana)).not.toBe(huellaUniverso(antes));
    expect(huellaUniverso(s0)).not.toBe(huellaUniverso(antes));
  } finally {
    db.close();
  }
});

test("I2 impacto: un cambio sólo de cobertura no marca ni mueve la huella (AC-17)", () => {
  const db = base();
  try {
    const antes = universoFinanciero(db, "1");
    const despues = clonar(antes);
    despues.cobertura = despues.cobertura.map((entrada) =>
      entrada.fuente === "efectivo" || entrada.fuente === "posiciones"
        ? { ...entrada, estado: "NoDisponible", causas: ["FIN_NETA_NO_DISPONIBLE" as const] }
        : entrada,
    );
    const { motivos, noDisponible } = compararUniverso(antes, despues);
    expect(motivos).toEqual([]);
    expect(noDisponible.sort()).toEqual(["balance", "posicion"]);
    expect(huellaUniverso(despues)).toBe(huellaUniverso(antes));
    expect(huellaUniverso(despues)).toBe(huellaUniverso(antes));
    const [impacto] = impactoDeCandidatos(
      new Map([["1", antes]]),
      new Map([["1", despues]]),
    );
    expect(impacto?.material).toBe(false);
  } finally {
    db.close();
  }
});

test("I2 impacto: una fuente NoDisponible no se declara igualdad y no aporta motivo", () => {
  const db = base();
  try {
    const antes = universoFinanciero(db, "1");
    const despues = clonar(antes);
    despues.cobertura = despues.cobertura.map((entrada) =>
      entrada.fuente === "efectivo"
        ? { ...entrada, estado: "NoDisponible", causas: ["FIN_NETA_NO_DISPONIBLE" as const] }
        : entrada,
    );
    // Una cifra cambia mientras su fuente no es medible: no es evidencia.
    despues.stock.efectivo = "999";
    const [impacto] = impactoDeCandidatos(
      new Map([["1", antes]]),
      new Map([["1", despues]]),
    );
    expect(impacto?.motivos).toEqual([]);
    expect(impacto?.noDisponible).toContain("balance");
    expect(impacto?.material).toBe(false);
  } finally {
    db.close();
  }
});

test("I2 impacto: material y motivos nunca divergen", () => {
  const db = base();
  try {
    const mutaciones: (() => void)[] = [
      () => db.run("UPDATE movimientos SET revision=revision+1 WHERE id='1'"),
      () => db.run("UPDATE movimientos SET nota='x',revision=revision+1 WHERE id='1'"),
      () => db.run("UPDATE movimientos SET importe=importe+1,revision=revision+1 WHERE id='1'"),
      () => db.run("UPDATE movimientos SET partida='PAR0002',revision=revision+1 WHERE id='1'"),
    ];
    for (const mutar of mutaciones) {
      const impacto = impactoTras(db, mutar);
      expect(impacto.material).toBe(impacto.motivos.length > 0);
      expect(impacto.material).toBe(impacto.huellaAntes !== impacto.huellaDespues);
    }
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * SPEC39 §3.3 · fuente propia `devoluciones` en la cobertura
 * ================================================================== */

const fuenteDevoluciones = (universo: UniversoFinanciero) =>
  universo.cobertura.find((entrada) => entrada.fuente === "devoluciones")!;

const casosDeCausa: {
  codigo: string;
  crear: () => Database;
  gre: string;
}[] = [
  {
    codigo: "SIN_VINCULO",
    crear: () => {
      const db = base();
      devolucion(db, "9", 300, { estado: "Sin vínculo" });
      return db;
    },
    gre: "1000",
  },
  {
    codigo: "REVISAR",
    crear: () => {
      const db = base();
      devolucion(db, "9", 300, { estado: "Revisar" });
      return db;
    },
    gre: "1000",
  },
  {
    codigo: "SIN_ACREDITACION",
    crear: () => {
      const db = base();
      devolucion(db, "9", 300, { elegibilidad: "No acreditada" });
      return db;
    },
    gre: "1000",
  },
  {
    codigo: "SIN_CLASIFICACION",
    crear: () => {
      const db = base();
      devolucion(db, "9", 300);
      // Histórico incoherente: la compra pierde la Partida que exige hoy el
      // CHECK del ledger. Se simula con la comprobación de CHECK desactivada,
      // nunca por una vía de escritura soportada.
      db.run("PRAGMA ignore_check_constraints=ON");
      db.run("UPDATE movimientos SET partida=NULL WHERE id='1'");
      db.run("PRAGMA ignore_check_constraints=OFF");
      return db;
    },
    gre: "700",
  },
  {
    codigo: "COMPRA_INVALIDA",
    crear: () => {
      const db = base();
      devolucion(db, "9", 300);
      // Histórico incoherente: la compra vinculada pasa a ser Terminal.
      db.run("UPDATE movimientos SET origen='S002' WHERE id='1'");
      return db;
    },
    gre: "1000",
  },
];

for (const caso of casosDeCausa)
  test(`devoluciones: causa ${caso.codigo} → Parcial con su código exacto y GRE medible`, () => {
    const db = caso.crear();
    try {
      const universo = universoFinanciero(db, "1");
      expect(fuenteDevoluciones(universo)).toEqual({
        fuente: "devoluciones",
        estado: "Parcial",
        causas: [caso.codigo as never],
      });
      expect(universo.flujo.gre).toBe(caso.gre);
      expect(
        universo.cobertura.find((entrada) => entrada.fuente === "movimientos"),
      ).toEqual({ fuente: "movimientos", estado: "Disponible", causas: [] });
    } finally {
      db.close();
    }
  });

test("devoluciones: PERIODO_NO_RESOLUBLE se expone 1:1 (defensivo de la proyección)", () => {
  // Una compra de la ventana siempre resuelve ciclo en un maestro contiguo; la
  // causa se ejerce en la derivación pura para fijar que no se sustituye por un
  // código genérico si la proyección la devuelve.
  const gre: GreIntervalo = {
    bruto: 1000n,
    descuentoEconomico: 0n,
    gre: 1000n,
    exceso: false,
    cobertura: "Parcial",
    causas: ["periodoNoResoluble"],
    eligibleIds: [],
    sinVinculoEnIntervalo: [],
    descuentos: new Map(),
  };
  expect(coberturaDevoluciones(gre, 1)).toEqual({
    fuente: "devoluciones",
    estado: "Parcial",
    causas: ["PERIODO_NO_RESOLUBLE"],
  });
});

test("devoluciones: EXCESO histórico → NoDisponible, gre/neto null y flujo no medible", () => {
  const db = base();
  try {
    devolucion(db, "9", 300);
    // Descuento (300) > compra (200): histórico incoherente, sin max(0).
    db.run("UPDATE movimientos SET importe=200 WHERE id='1'");
    const universo = universoFinanciero(db, "1");
    expect(fuenteDevoluciones(universo)).toEqual({
      fuente: "devoluciones",
      estado: "NoDisponible",
      causas: ["EXCESO"],
    });
    expect(universo.flujo.gre).toBeNull();
    expect(universo.flujo.neto).toBeNull();
    // Un grupo con fuente NoDisponible no se declara igual ni material.
    const { motivos, noDisponible } = compararUniverso(universo, universo);
    expect(motivos).toEqual([]);
    expect(noDisponible).toContain("flujo");
  } finally {
    db.close();
  }
});

test("devoluciones: ciclo sin compras sin incidencias → Disponible con GRE null", () => {
  const db = base();
  try {
    const universo = universoFinanciero(db, "2");
    expect(fuenteDevoluciones(universo)).toEqual({
      fuente: "devoluciones",
      estado: "Disponible",
      causas: [],
    });
    expect(universo.flujo.gre).toBeNull();
    expect(universo.flujo.neto).toBeNull();
  } finally {
    db.close();
  }
});

test("devoluciones: ciclo sin compras con abono huérfano → Parcial SIN_VINCULO y GRE null", () => {
  const db = base();
  try {
    devolucion(db, "9", 300, { estado: "Sin vínculo", fecha: "2026-02-10" });
    const universo = universoFinanciero(db, "2");
    expect(fuenteDevoluciones(universo)).toEqual({
      fuente: "devoluciones",
      estado: "Parcial",
      causas: ["SIN_VINCULO"],
    });
    expect(universo.flujo.gre).toBeNull();
    expect(universo.flujo.neto).toBeNull();
  } finally {
    db.close();
  }
});

test("devoluciones: un cambio sólo de cobertura no marca ni mueve la huella material, pero sí el token estructural", () => {
  const db = base();
  try {
    const antes = universoFinanciero(db, "1");
    const despues = clonar(antes);
    despues.cobertura = despues.cobertura.map((entrada) =>
      entrada.fuente === "devoluciones"
        ? { fuente: "devoluciones", estado: "NoDisponible", causas: ["EXCESO" as const] }
        : entrada,
    );
    expect(compararUniverso(antes, despues).motivos).toEqual([]);
    expect(compararUniverso(antes, despues).noDisponible).toContain("flujo");
    expect(huellaUniverso(despues)).toBe(huellaUniverso(antes));
    // La huella de estado completo es la que alimenta `impactRevision`: sí cambia.
    expect(huellaDe(despues)).not.toBe(huellaDe(antes));
    const [impacto] = impactoDeCandidatos(
      new Map([["1", antes]]),
      new Map([["1", despues]]),
    );
    expect(impacto?.material).toBe(false);
    expect(impacto?.motivos).toEqual([]);
  } finally {
    db.close();
  }
});