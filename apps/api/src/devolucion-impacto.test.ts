import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { proyectarValidacion } from "./cierre-validacion-estado";
import { huellaDe, huellaUniverso, universoFinanciero, VERSION_CONJUNTO } from "./cierre-validacion-impacto";
import { createClassification } from "./clasificacion";
import { openDatabase } from "./database";
import {
  devolucionIntegracionDisponible,
  gateProduccion,
  type DevolucionGate,
} from "./devolucion-gate";
import {
  confirmarDevolucionImpacto,
  previewDevolucionImpacto,
  type EntradaDevolucionImpacto,
} from "./devolucion-impacto";
import { previewMovement, writeMovement } from "./movimientos";
import { Problem } from "./problem";
import { createSaldo } from "./saldos";

const GATE_ABIERTO: DevolucionGate = Object.freeze({ disponible: true });
const temps: string[] = [];

afterEach(() => {
  while (temps.length) {
    const dir = temps.pop()!;
    rmSync(dir, { recursive: true, force: true });
  }
});

function setupDb(filePath?: string) {
  const db = openDatabase(filePath ?? ":memory:");
  const cat = createClassification(
    db,
    "categorias",
    { nombre: "Gastos F4", anual: "Gasto", mensual: "Gasto", referencia: false },
    "setup-cat-f4-0001",
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub F4", padre: cat.id },
    "setup-sub-f4-0001",
  );
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida F4", padre: sub.id },
    "setup-par-f4-0001",
  );

  // Saldo operativo (S000 ya viene sembrado como Terminal por el esquema)
  const s1 = createSaldo(
    db,
    {
      nombre: "Cuenta Principal",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500.00",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    "setup-saldo-s001-0001",
  );
  const saldoId = s1.id;

  // Dos ciclos: ciclo 1 (2026-01-01..2026-01-31) y ciclo 2 (2026-02-01..)
  db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado)
     VALUES('1','2026-01-01',0,'2026-01-01T00:00:00.000Z'),
           ('2','2026-02-01',0,'2026-02-01T00:00:00.000Z')`,
  );

  function addMov(body: Record<string, unknown>, key: string) {
    const p = previewMovement(db, body, null, false);
    return writeMovement(
      db,
      { ...body, fingerprint: p.fingerprint, contextRevision: p.contextRevision },
      key,
    );
  }

  // Compra de 120.00 EUR en ciclo 1
  const compra = addMov(
    {
      tipo: "Gasto",
      fecha: "2026-01-15",
      importe: "120.00",
      saldo: saldoId,
      concepto: "Compra prueba F4",
      nota: "",
      partida: partida.id,
    },
    "setup-compra-f4-0001",
  );

  return { db, compraId: compra.movimiento.id, saldoId, partidaId: partida.id };
}

function validarCiclo(db: Database, ciclo: string) {
  const universo = universoFinanciero(db, ciclo);
  const huella = huellaUniverso(universo);
  const now = "2026-01-31T23:59:59.000Z";
  db.run(
    `INSERT INTO cierre_validacion(
       ciclo,revision,revision_actor,revision_instante,huella_validacion,version_conjunto,cobertura,dirty
     ) VALUES(?,1,'usuario-unico',?,?,?,?,0)`,
    [ciclo, now, huella, VERSION_CONJUNTO, JSON.stringify(universo.cobertura)],
  );
}

function snapCounts(db: Database) {
  const count = (table: string) =>
    (db.query(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
  return {
    movimientos: count("movimientos"),
    devoluciones: count("movimiento_devolucion"),
    audit: count("cierre_validacion_audit"),
    attemptsMov: count("movement_attempts"),
    attemptsDev: count("comida_devolucion_attempts"),
  };
}

function codigoDe(fn: () => unknown): { status?: number; code?: string; message: string } {
  try {
    fn();
  } catch (error) {
    const problema = error as Partial<Problem> & { message?: string };
    return {
      status: problema.status,
      code: problema.code,
      message: String(problema.message ?? ""),
    };
  }
  return { message: "" };
}

/** Compra adicional por SQL, para separar la compra con exceso de la destino válida. */
function sembrarCompra(db: Database, id: string, importe: number, partida: string) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?,'2026-01-20','Gasto',?,'S001','S000',NULL,?,'Compra ficticia','',0,1,?,?)`,
    [id, importe, partida, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
  );
}

/** Devolución por SQL: con vínculo Verificado/Acreditado, u huérfana si `compra` es null. */
function sembrarDevolucion(
  db: Database,
  id: string,
  opciones: { compra: string | null; importe: number; partida: string },
) {
  const t = "2026-01-01T00:00:00.000Z";
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?,'2026-01-20','Devolución de gasto',?,'S000','S001',NULL,NULL,'Abono ficticio','',0,1,?,?)`,
    [id, opciones.importe, t, t],
  );
  if (opciones.compra === null) return;
  db.run(
    `INSERT INTO movimiento_devolucion(movimiento,compra,partida,ciclo_origen,
       evidencia_relacion,evidencia_origen_temporal,elegibilidad,estado,
       revision_movimiento,revision,creado,actualizado)
     VALUES(?,?,?,'1','Evidencia ficticia','Documento ficticio','Acreditada','Verificado',1,1,?,?)`,
    [id, opciones.compra, opciones.partida, t, t],
  );
}

/**
 * Compra A con exceso histórico (descuento 30 > compra 1.00) y compra B con
 * capacidad suficiente en el mismo ciclo. La cobertura `devoluciones` del ciclo
 * 1 queda `NoDisponible` aunque la operación sobre B sea bancariamente válida.
 */
function conExcesoEnCiclo() {
  const base = setupDb();
  sembrarCompra(base.db, "90", 12000, base.partidaId);
  sembrarDevolucion(base.db, "91", {
    compra: base.compraId,
    importe: 3000,
    partida: base.partidaId,
  });
  sembrarDevolucion(base.db, "92", {
    compra: null,
    importe: 3000,
    partida: base.partidaId,
  });
  base.db.run("UPDATE movimientos SET importe=100 WHERE id=?", [base.compraId]);
  return { ...base, compraB: "90", devolucionConExceso: "91", huerfana: "92" };
}

describe("DEV #598 · F4 · Preview, impacto y cierres de devoluciones", () => {
  test("Gate #572 permanece cerrado por defecto: preview disponible, confirmación 503", () => {
    expect(devolucionIntegracionDisponible).toBe(false);
    expect(gateProduccion.disponible).toBe(false);

    const { db, compraId } = setupDb();
    const entrada: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: "S001",
        nota: "",
        concepto: "Devolución parcial",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };

    const preview = previewDevolucionImpacto(db, entrada);
    expect(preview.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.contextRevision).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.impactRevision).toMatch(/^[a-f0-9]{64}$/);

    expect(() =>
      confirmarDevolucionImpacto(
        db,
        {
          ...entrada,
          fingerprint: preview.fingerprint,
          contextRevision: preview.contextRevision,
          impactRevision: preview.impactRevision,
          key: "confirm-gate-cerrado-0001",
        },
        gateProduccion,
      ),
    ).toThrow(Problem);

    try {
      confirmarDevolucionImpacto(
        db,
        {
          ...entrada,
          fingerprint: preview.fingerprint,
          contextRevision: preview.contextRevision,
          impactRevision: preview.impactRevision,
          key: "confirm-gate-cerrado-0001",
        },
        gateProduccion,
      );
    } catch (err) {
      const p = err as Problem;
      expect(p.status).toBe(503);
      expect(p.code).toBe("DEVOLUTION_INTEGRATION_UNAVAILABLE");
    }
    db.close();
  });

  test("AC-D06 / AC-D35 · Preview sin escritura; confirmar sobre ciclo A validado marca dirty sin HISTORY_LOCKED", () => {
    const { db, compraId, saldoId } = setupDb();
    validarCiclo(db, "1");
    const antes = snapCounts(db);

    const entrada: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución parcial",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };

    // Preview no escribe nada (cancelar = sin efectos)
    const preview = previewDevolucionImpacto(db, entrada);
    expect(snapCounts(db)).toEqual(antes);
    expect(proyectarValidacion(db, "1").estado).toBe("Validada");

    // Shape completo de devolucionImpacto (ANEXO §2)
    const imp = preview.devolucionImpacto;
    expect(imp.compra).toBe(compraId);
    expect(imp.compraFecha).toBe("2026-01-15");
    expect(imp.cicloAtribucion).toBe("1");
    expect(imp.anioAtribucion).toBe("2026");
    expect(imp.bruto).toBe("120.00");
    expect(imp.devueltoAntes).toBe("0.00");
    expect(imp.devueltoDespues).toBe("30.00");
    expect(imp.restanteAntes).toBe("120.00");
    expect(imp.restanteDespues).toBe("90.00");
    expect(imp.receptor.saldo).toBe(saldoId);
    expect(imp.receptor.saldoAntes).toBe("380.00");
    expect(imp.receptor.saldoDespues).toBe("410.00");
    expect(imp.magnitudes.gastoRealEconomicoAntes).toBe("120.00");
    expect(imp.magnitudes.gastoRealEconomicoDespues).toBe("90.00");
    expect(imp.magnitudes.descuentoEconomicoAntes).toBe("0.00");
    expect(imp.magnitudes.descuentoEconomicoDespues).toBe("30.00");
    expect(imp.magnitudes.flujoBancarioImporte).toBe("30.00");
    expect(imp.magnitudes.flujoBancarioFecha).toBe("2026-02-10");

    const ciclo1Afectado = imp.ciclosAfectados.find((c) => c.ciclo === "1");
    expect(ciclo1Afectado).toBeDefined();
    expect(ciclo1Afectado!.material).toBe(true);
    expect(ciclo1Afectado!.signoGasto).toBe("baja");
    expect(ciclo1Afectado!.estadoValidacion).toBe("Validada");
    expect(ciclo1Afectado!.validado).toBe(true);
    expect(ciclo1Afectado!.dirtyPrevio).toBe(false);

    // Confirmación con gate abierto (sin HISTORY_LOCKED)
    const recibo = confirmarDevolucionImpacto(
      db,
      {
        ...entrada,
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        key: "confirm-acd06-0001",
      },
      GATE_ABIERTO,
    );

    expect(recibo.operacionId).toMatch(/^OP-/);
    expect(recibo.auditIds.length).toBeGreaterThan(0);
    expect(recibo.cierresDirty).toEqual([
      {
        ciclo: "1",
        rango: { desde: "2026-01-01", hasta: "2026-01-31" },
        estadoValidacion: "Pendiente",
        validado: true,
        dirtyPrevio: false,
      },
    ]);
    expect(proyectarValidacion(db, "1").estado).toBe("Pendiente");

    // Idempotencia: misma clave y mismo payload reproduce el recibo incluso con gate cerrado
    const repetido = confirmarDevolucionImpacto(
      db,
      {
        ...entrada,
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        key: "confirm-acd06-0001",
      },
      gateProduccion,
    );
    expect(repetido).toEqual(recibo);
    db.close();
  });

  test("AC-D36 · Confirmación con huella/contexto/impacto cambiado devuelve 409 IMPACT_CHANGED sin escritura", () => {
    const { db, compraId, saldoId, partidaId } = setupDb();
    validarCiclo(db, "1");

    const entrada: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: "S001",
        nota: "",
        concepto: "Devolución parcial",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };

    const preview = previewDevolucionImpacto(db, entrada);

    // Mutación concurrente entre preview y confirmación: otro gasto en ciclo 1
    const pConc = previewMovement(
      db,
      {
        tipo: "Gasto",
        fecha: "2026-01-20",
        importe: "10.00",
        saldo: saldoId,
        nota: "",
        concepto: "Otro gasto concurrente",
        partida: partidaId,
      },
      null,
      false,
    );
    writeMovement(
      db,
      {
        tipo: "Gasto",
        fecha: "2026-01-20",
        importe: "10.00",
        saldo: saldoId,
        nota: "",
        concepto: "Otro gasto concurrente",
        partida: partidaId,
        fingerprint: pConc.fingerprint,
        contextRevision: pConc.contextRevision,
      },
      "setup-concurrente-0001",
    );

    const antesConfirm = snapCounts(db);
    let caught: Problem | null = null;
    try {
      confirmarDevolucionImpacto(
        db,
        {
          ...entrada,
          fingerprint: preview.fingerprint,
          contextRevision: preview.contextRevision,
          impactRevision: preview.impactRevision,
          key: "confirm-impact-changed-0001",
        },
        GATE_ABIERTO,
      );
    } catch (err) {
      caught = err as Problem;
    }

    expect(caught).toBeInstanceOf(Problem);
    expect(caught!.status).toBe(409);
    expect(caught!.code).toBe("IMPACT_CHANGED");
    expect(snapCounts(db)).toEqual(antesConfirm);
    db.close();
  });

  test("AC-D35 · Validador común: mismos códigos de error en preview y confirmación", () => {
    const { db, compraId } = setupDb();

    // 1. Falta compra → DEVOLUTION_LINK_REQUIRED
    const sinCompra: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: "S001",
        nota: "",
        concepto: "Sin compra",
      },
    };
    try {
      previewDevolucionImpacto(db, sinCompra);
      expect.unreachable();
    } catch (err) {
      expect((err as Problem).status).toBe(422);
      expect((err as Problem).code).toBe("DEVOLUTION_LINK_REQUIRED");
    }

    // 2. Exceso sobre capacidad → DEVOLUTION_EXCESS
    const exceso: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "121.00",
        saldo: "S001",
        nota: "",
        concepto: "Exceso",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket",
          evidenciaOrigenTemporal: "Enero",
        },
      },
    };
    try {
      previewDevolucionImpacto(db, exceso);
      expect.unreachable();
    } catch (err) {
      expect((err as Problem).status).toBe(422);
      expect((err as Problem).code).toBe("DEVOLUTION_EXCESS");
    }
    db.close();
  });

  test("AC-D36 / AC-D45 · Dirty solo por materialidad: edición textual no marca dirty; reversión no limpia", () => {
    const { db, compraId } = setupDb();
    validarCiclo(db, "1");

    // 1. Alta de devolución de 30 EUR (material → marca dirty en ciclo 1)
    const alta: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: "S001",
        nota: "",
        concepto: "Devolución inicial",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };
    const pAlta = previewDevolucionImpacto(db, alta);
    confirmarDevolucionImpacto(
      db,
      {
        ...alta,
        fingerprint: pAlta.fingerprint,
        contextRevision: pAlta.contextRevision,
        impactRevision: pAlta.impactRevision,
        key: "confirm-mat-alta-0001",
      },
      GATE_ABIERTO,
    );

    const devMov = db
      .query("SELECT id,revision FROM movimientos WHERE tipo='Devolución de gasto'")
      .get() as { id: string; revision: number };
    const auditAntesTexto = (
      db.query("SELECT COUNT(*) n FROM cierre_validacion_audit").get() as { n: number }
    ).n;

    // 2. Rectificación puramente textual (cambia solo concepto) → no material, no reitera dirty
    const rectTexto: EntradaDevolucionImpacto = {
      accion: "rectificar",
      id: devMov.id,
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: "S001",
        nota: "",
        concepto: "Devolución inicial corregida en texto",
        revision: devMov.revision,
        motivo: "Corrección ortográfica",
      },
    };
    const pTexto = previewDevolucionImpacto(db, rectTexto);
    expect(pTexto.devolucionImpacto.ciclosAfectados).toEqual([]);

    const rTexto = confirmarDevolucionImpacto(
      db,
      {
        ...rectTexto,
        fingerprint: pTexto.fingerprint,
        contextRevision: pTexto.contextRevision,
        impactRevision: pTexto.impactRevision,
        key: "confirm-mat-texto-0001",
      },
      GATE_ABIERTO,
    );
    expect(rTexto.auditIds).toEqual([]);
    const auditDespuesTexto = (
      db.query("SELECT COUNT(*) n FROM cierre_validacion_audit").get() as { n: number }
    ).n;
    expect(auditDespuesTexto).toBe(auditAntesTexto);

    // 3. Reversión (anular la devolución) → ciclo 1 sigue Pendiente (nunca se limpia automáticamente)
    const devMov2 = db
      .query("SELECT id,revision FROM movimientos WHERE id=?")
      .get(devMov.id) as { id: string; revision: number };
    const anular: EntradaDevolucionImpacto = {
      accion: "anular",
      id: devMov2.id,
      body: {
        revision: devMov2.revision,
        motivo: "Reversión de prueba",
      },
    };
    const pAnular = previewDevolucionImpacto(db, anular);
    const c1Anular = pAnular.devolucionImpacto.ciclosAfectados.find((c) => c.ciclo === "1");
    expect(c1Anular?.signoGasto).toBe("sube");

    const rAnular = confirmarDevolucionImpacto(
      db,
      {
        ...anular,
        fingerprint: pAnular.fingerprint,
        contextRevision: pAnular.contextRevision,
        impactRevision: pAnular.impactRevision,
        key: "confirm-mat-anular-0001",
      },
      GATE_ABIERTO,
    );
    expect(proyectarValidacion(db, "1").estado).toBe("Pendiente");
    expect(rAnular.cierresDirty[0]?.dirtyPrevio).toBe(true);
    db.close();
  });

  test("Concurrencia · Dos conexiones simultáneas excediendo capacidad: una gana, la otra falla sin superar tope", () => {
    const dir = mkdtempSync(join(tmpdir(), "mf-f4-conc-"));
    temps.push(dir);
    const dbPath = join(dir, "test.sqlite");
    const { db: db1, compraId } = setupDb(dbPath);
    const db2 = openDatabase(dbPath);

    const entrada1: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "80.00",
        saldo: "S001",
        nota: "",
        concepto: "Devolución concurrente 1",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #A",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };
    const entrada2: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-11",
        importe: "80.00",
        saldo: "S001",
        nota: "",
        concepto: "Devolución concurrente 2",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #B",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };

    // Ambos previsualizan sobre el mismo snapshot inicial (capacidad 120)
    const p1 = previewDevolucionImpacto(db1, entrada1);
    const p2 = previewDevolucionImpacto(db2, entrada2);

    // Conexión 1 confirma primero (80 <= 120)
    confirmarDevolucionImpacto(
      db1,
      {
        ...entrada1,
        fingerprint: p1.fingerprint,
        contextRevision: p1.contextRevision,
        impactRevision: p1.impactRevision,
        key: "confirm-conc-0001",
      },
      GATE_ABIERTO,
    );

    // Conexión 2 intenta confirmar con su preview ahora obsoleto (80 + 80 > 120)
    let err2: Problem | null = null;
    try {
      confirmarDevolucionImpacto(
        db2,
        {
          ...entrada2,
          fingerprint: p2.fingerprint,
          contextRevision: p2.contextRevision,
          impactRevision: p2.impactRevision,
          key: "confirm-conc-0002",
        },
        GATE_ABIERTO,
      );
    } catch (err) {
      err2 = err as Problem;
    }

    expect(err2).toBeInstanceOf(Problem);
    expect([409, 422]).toContain(err2!.status);
    expect(["IMPACT_CHANGED", "DEVOLUTION_EXCESS"]).toContain(err2!.code);

    // Suma total verificada nunca supera la compra (12000 céntimos)
    const suma = db1
      .query(
        `SELECT COALESCE(SUM(m.importe),0) total
           FROM movimientos m
           JOIN movimiento_devolucion d ON d.movimiento=m.id
          WHERE m.anulado=0 AND d.compra=? AND d.estado='Verificado'`,
      )
      .get(compraId) as { total: number };
    expect(suma.total).toBe(8000);

    db2.close();
    db1.close();
  });

  test("SPEC38 §3.1/§3.2 · Reatribución entre ciclos sin cambio bancario marca ambos ciclos con huellas distintas y motivos coherentes", () => {
    const { db, compraId, saldoId, partidaId } = setupDb();
    // Añadir ciclo 3 para alojar la devolución y una segunda compra en ciclo 2
    db.run(
      `INSERT INTO ciclos(id,inicio,saldo_comida,creado)
       VALUES('3','2026-03-01',0,'2026-03-01T00:00:00.000Z')`,
    );
    const pC2 = previewMovement(
      db,
      {
        tipo: "Gasto",
        fecha: "2026-02-15",
        importe: "100.00",
        saldo: saldoId,
        concepto: "Compra ciclo 2",
        nota: "",
        partida: partidaId,
      },
      null,
      false,
    );
    const compra2 = writeMovement(
      db,
      {
        tipo: "Gasto",
        fecha: "2026-02-15",
        importe: "100.00",
        saldo: saldoId,
        concepto: "Compra ciclo 2",
        nota: "",
        partida: partidaId,
        fingerprint: pC2.fingerprint,
        contextRevision: pC2.contextRevision,
      },
      "setup-compra-c2-0001",
    );

    // Alta de devolución (en ciclo 3) inicialmente vinculada a compra del ciclo 1
    const alta: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-03-05",
        importe: "30.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución reatribuible",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };
    const pAlta = previewDevolucionImpacto(db, alta);
    confirmarDevolucionImpacto(
      db,
      {
        ...alta,
        fingerprint: pAlta.fingerprint,
        contextRevision: pAlta.contextRevision,
        impactRevision: pAlta.impactRevision,
        key: "confirm-reatrib-ciclos-alta-01",
      },
      GATE_ABIERTO,
    );

    // Validar ciclos 1 y 2 tras el alta
    validarCiclo(db, "1");
    validarCiclo(db, "2");
    const h1Antes = huellaUniverso(universoFinanciero(db, "1"));
    const h2Antes = huellaUniverso(universoFinanciero(db, "2"));

    const dev = db
      .query(
        `SELECT m.id,m.revision,d.revision devRev
           FROM movimientos m JOIN movimiento_devolucion d ON d.movimiento=m.id
          WHERE m.tipo='Devolución de gasto'`,
      )
      .get() as { id: string; revision: number; devRev: number };

    // Reatribuir de compra en ciclo 1 a compra en ciclo 2 (sin cambio bancario)
    const reatrib: EntradaDevolucionImpacto = {
      accion: "atribuir",
      id: dev.id,
      body: {
        revision: dev.revision,
        devolucionRevision: dev.devRev,
        compraAnterior: compraId,
        compra: compra2.movimiento.id,
        estado: "Verificado",
        elegibilidad: "Acreditada",
        cicloOrigen: "2",
        evidenciaRelacion: "Ticket #2 corregido",
        evidenciaOrigenTemporal: "Factura febrero",
        motivo: "Reatribución entre ciclos",
      },
    };
    const pReatrib = previewDevolucionImpacto(db, reatrib);
    expect(pReatrib.devolucionImpacto.magnitudes.flujoBancarioImporte).toBe("0.00");

    const c1 = pReatrib.devolucionImpacto.ciclosAfectados.find((c) => c.ciclo === "1");
    const c2 = pReatrib.devolucionImpacto.ciclosAfectados.find((c) => c.ciclo === "2");
    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
    expect(c1!.motivo).toEqual(["FLUJO_CICLO", "ATRIBUCION"]);
    expect(c2!.motivo).toEqual(["FLUJO_CICLO", "ATRIBUCION"]);
    expect(c1!.signoGasto).toBe("sube");
    expect(c2!.signoGasto).toBe("baja");

    const recibo = confirmarDevolucionImpacto(
      db,
      {
        ...reatrib,
        fingerprint: pReatrib.fingerprint,
        contextRevision: pReatrib.contextRevision,
        impactRevision: pReatrib.impactRevision,
        key: "confirm-reatrib-ciclos-01",
      },
      GATE_ABIERTO,
    );

    const h1Despues = huellaUniverso(universoFinanciero(db, "1"));
    const h2Despues = huellaUniverso(universoFinanciero(db, "2"));
    expect(h1Despues).not.toBe(h1Antes);
    expect(h2Despues).not.toBe(h2Antes);
    expect(proyectarValidacion(db, "1").estado).toBe("Pendiente");
    expect(proyectarValidacion(db, "2").estado).toBe("Pendiente");
    expect(recibo.cierresDirty.map((c) => c.ciclo)).toEqual(["1", "2"]);

    // Coherencia auditoría ↔ huellas y motivos de #547
    const audits = db
      .query(
        `SELECT ciclo,accion,huella_anterior,huella_posterior
           FROM cierre_validacion_audit
          WHERE accion='dirty_marcado'
          ORDER BY ciclo`,
      )
      .all() as {
      ciclo: string;
      accion: string;
      huella_anterior: string;
      huella_posterior: string;
    }[];
    expect(audits).toEqual([
      {
        ciclo: "1",
        accion: "dirty_marcado",
        huella_anterior: h1Antes,
        huella_posterior: h1Despues,
      },
      {
        ciclo: "2",
        accion: "dirty_marcado",
        huella_anterior: h2Antes,
        huella_posterior: h2Despues,
      },
    ]);
    expect(proyectarValidacion(db, "1").motivos).toEqual(["FLUJO_CICLO", "ATRIBUCION"]);
    expect(proyectarValidacion(db, "2").motivos).toEqual(["FLUJO_CICLO", "ATRIBUCION"]);
    db.close();
  });

  test("SPEC38 §3.1 · Reatribución entre Partidas del mismo ciclo sin cambio de GRE agregado marca solo ATRIBUCION", () => {
    const { db, compraId, saldoId } = setupDb();
    // Crear segunda partida bajo la misma subcategoría
    const sub = db
      .query("SELECT id FROM subcategorias LIMIT 1")
      .get() as { id: string };
    const partida2 = createClassification(
      db,
      "partidas",
      { nombre: "Partida F4 B", padre: sub.id },
      "setup-par-f4-0002",
    );

    // Segunda compra en el MISMO ciclo 1 con distinta Partida
    const pC2 = previewMovement(
      db,
      {
        tipo: "Gasto",
        fecha: "2026-01-20",
        importe: "100.00",
        saldo: saldoId,
        concepto: "Compra misma ventana distinta partida",
        nota: "",
        partida: partida2.id,
      },
      null,
      false,
    );
    const compra2 = writeMovement(
      db,
      {
        tipo: "Gasto",
        fecha: "2026-01-20",
        importe: "100.00",
        saldo: saldoId,
        concepto: "Compra misma ventana distinta partida",
        nota: "",
        partida: partida2.id,
        fingerprint: pC2.fingerprint,
        contextRevision: pC2.contextRevision,
      },
      "setup-compra-mismo-ciclo-01",
    );

    // Alta de devolución vinculada a compra 1 (en ciclo 2 para que no toque banco del ciclo 1)
    const alta: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución misma ventana",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };
    const pAlta = previewDevolucionImpacto(db, alta);
    confirmarDevolucionImpacto(
      db,
      {
        ...alta,
        fingerprint: pAlta.fingerprint,
        contextRevision: pAlta.contextRevision,
        impactRevision: pAlta.impactRevision,
        key: "confirm-mismo-ciclo-alta-01",
      },
      GATE_ABIERTO,
    );

    // Validar ciclo 1 tras el alta
    validarCiclo(db, "1");
    const uAntes = universoFinanciero(db, "1");
    const hAntes = huellaUniverso(uAntes);
    expect(uAntes.flujo.gre).toBe("19000");
    expect(uAntes.atribucion.find((h) => h.id === compraId)?.neto).toBe("9000");
    expect(uAntes.atribucion.find((h) => h.id === compra2.movimiento.id)?.neto).toBe("10000");

    const dev = db
      .query(
        `SELECT m.id,m.revision,d.revision devRev
           FROM movimientos m JOIN movimiento_devolucion d ON d.movimiento=m.id
          WHERE m.tipo='Devolución de gasto'`,
      )
      .get() as { id: string; revision: number; devRev: number };

    // Reatribuir a compra2 (mismo ciclo 1, distinta Partida, mismo GRE agregado = 190.00)
    const reatrib: EntradaDevolucionImpacto = {
      accion: "atribuir",
      id: dev.id,
      body: {
        revision: dev.revision,
        devolucionRevision: dev.devRev,
        compraAnterior: compraId,
        compra: compra2.movimiento.id,
        estado: "Verificado",
        elegibilidad: "Acreditada",
        cicloOrigen: "1",
        evidenciaRelacion: "Ticket #2",
        evidenciaOrigenTemporal: "Factura enero",
        motivo: "Reatribución entre partidas del mismo ciclo",
      },
    };
    const pReatrib = previewDevolucionImpacto(db, reatrib);
    expect(pReatrib.devolucionImpacto.ciclosAfectados.length).toBe(1);
    const c1 = pReatrib.devolucionImpacto.ciclosAfectados[0]!;
    expect(c1.ciclo).toBe("1");
    expect(c1.motivo).toEqual(["ATRIBUCION"]);
    expect(c1.signoGasto).toBe("invariante");
    expect(c1.cifrasAntes.gastoRealEconomico).toBe("190.00");
    expect(c1.cifrasDespues.gastoRealEconomico).toBe("190.00");

    confirmarDevolucionImpacto(
      db,
      {
        ...reatrib,
        fingerprint: pReatrib.fingerprint,
        contextRevision: pReatrib.contextRevision,
        impactRevision: pReatrib.impactRevision,
        key: "confirm-mismo-ciclo-reatrib-01",
      },
      GATE_ABIERTO,
    );

    const uDespues = universoFinanciero(db, "1");
    const hDespues = huellaUniverso(uDespues);
    expect(uDespues.flujo.gre).toBe("19000");
    expect(uDespues.atribucion.find((h) => h.id === compraId)?.neto).toBe("12000");
    expect(uDespues.atribucion.find((h) => h.id === compra2.movimiento.id)?.neto).toBe("7000");
    expect(hDespues).not.toBe(hAntes);

    const val = proyectarValidacion(db, "1");
    expect(val.estado).toBe("Pendiente");
    expect(val.motivos).toEqual(["ATRIBUCION"]);

    const audit = db
      .query(
        `SELECT accion,huella_anterior,huella_posterior
           FROM cierre_validacion_audit WHERE ciclo='1' ORDER BY id DESC LIMIT 1`,
      )
      .get() as { accion: string; huella_anterior: string; huella_posterior: string };
    expect(audit).toEqual({
      accion: "dirty_marcado",
      huella_anterior: hAntes,
      huella_posterior: hDespues,
    });
    db.close();
  });

  test("SPEC38 §3.2 · Reversión vuelve byte a byte a referenciaHumana, registra accion='reversion' y no limpia dirty", () => {
    const { db, compraId, saldoId } = setupDb();
    validarCiclo(db, "1");
    const hReferencia = huellaUniverso(universoFinanciero(db, "1"));

    // 1. Alta material → dirty_marcado (hReferencia → hConDev)
    const alta: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución reversible",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };
    const pAlta = previewDevolucionImpacto(db, alta);
    confirmarDevolucionImpacto(
      db,
      {
        ...alta,
        fingerprint: pAlta.fingerprint,
        contextRevision: pAlta.contextRevision,
        impactRevision: pAlta.impactRevision,
        key: "confirm-rev-alta-0001",
      },
      GATE_ABIERTO,
    );
    const hConDev = huellaUniverso(universoFinanciero(db, "1"));
    expect(hConDev).not.toBe(hReferencia);

    // 2. Anulación → vuelve byte a byte a hReferencia, registra 'reversion', dirty sigue 1
    const dev = db
      .query("SELECT id,revision FROM movimientos WHERE tipo='Devolución de gasto'")
      .get() as { id: string; revision: number };
    const anular: EntradaDevolucionImpacto = {
      accion: "anular",
      id: dev.id,
      body: { revision: dev.revision, motivo: "Deshacer devolución" },
    };
    const pAnular = previewDevolucionImpacto(db, anular);
    confirmarDevolucionImpacto(
      db,
      {
        ...anular,
        fingerprint: pAnular.fingerprint,
        contextRevision: pAnular.contextRevision,
        impactRevision: pAnular.impactRevision,
        key: "confirm-rev-anular-0001",
      },
      GATE_ABIERTO,
    );

    const hTrasAnular = huellaUniverso(universoFinanciero(db, "1"));
    expect(hTrasAnular).toBe(hReferencia);

    const val = proyectarValidacion(db, "1");
    expect(val.estado).toBe("Pendiente");
    expect(val.dirty).toBe(true);
    expect(val.divergenciaValidacion).toBe("Igual");
    expect(val.pendienteSinDelta).toBe(true);

    const eventos = db
      .query(
        `SELECT accion,huella_anterior,huella_posterior
           FROM cierre_validacion_audit WHERE ciclo='1' ORDER BY id`,
      )
      .all() as { accion: string; huella_anterior: string; huella_posterior: string }[];
    expect(eventos).toEqual([
      {
        accion: "dirty_marcado",
        huella_anterior: hReferencia,
        huella_posterior: hConDev,
      },
      {
        accion: "reversion",
        huella_anterior: hConDev,
        huella_posterior: hReferencia,
      },
    ]);
    db.close();
  });

  test("Compatibilidad F3 (#620) · Guardas DEVOLUTION_LINK_REQUIRED, ATTRIBUTION_REVISION_CONFLICT, DEVOLUTION_EXCESS (en Revisar), DEVOLUTION_LINKED y PURCHASE_BELOW_REFUNDED", () => {
    const { db, compraId, saldoId, partidaId } = setupDb();
    const dummyToken = "0".repeat(64);
    const expectAmbosRechazan = (
      entrada: EntradaDevolucionImpacto,
      status: number,
      code: string,
      key: string,
    ) => {
      expect(() => previewDevolucionImpacto(db, entrada)).toThrow(
        expect.objectContaining({ status, code }),
      );
      const fp = huellaDe({
        familia: `devolucion:${entrada.accion}`,
        id: entrada.id ?? null,
        body: entrada.body,
      });
      expect(() =>
        confirmarDevolucionImpacto(
          db,
          {
            ...entrada,
            fingerprint: fp,
            contextRevision: dummyToken,
            impactRevision: dummyToken,
            key,
          },
          GATE_ABIERTO,
        ),
      ).toThrow(expect.objectContaining({ status, code }));
    };

    // 1. Alta en Revisar excediendo capacidad → DEVOLUTION_EXCESS en preview y confirmación
    const altaRevisarExceso: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "130.00",
        saldo: saldoId,
        nota: "",
        concepto: "Exceso en Revisar",
        devolucion: {
          compra: compraId,
          estado: "Revisar",
          elegibilidad: "No acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket",
        },
      },
    };
    expectAmbosRechazan(altaRevisarExceso, 422, "DEVOLUTION_EXCESS", "confirm-f3-exceso-rev-alta-01");

    // 2. Alta válida en Verificado (80 EUR) y otra en Revisar (30 EUR)
    const altaVer: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "80.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución verificada 80",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };
    const pVer = previewDevolucionImpacto(db, altaVer);
    confirmarDevolucionImpacto(
      db,
      {
        ...altaVer,
        fingerprint: pVer.fingerprint,
        contextRevision: pVer.contextRevision,
        impactRevision: pVer.impactRevision,
        key: "confirm-f3-ver-0001",
      },
      GATE_ABIERTO,
    );

    const altaRev: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-11",
        importe: "30.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución en Revisar 30",
        devolucion: {
          compra: compraId,
          estado: "Revisar",
          elegibilidad: "No acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket pendiente",
        },
      },
    };
    const pRev = previewDevolucionImpacto(db, altaRev);
    confirmarDevolucionImpacto(
      db,
      {
        ...altaRev,
        fingerprint: pRev.fingerprint,
        contextRevision: pRev.contextRevision,
        impactRevision: pRev.impactRevision,
        key: "confirm-f3-rev-0001",
      },
      GATE_ABIERTO,
    );

    const devRev = db
      .query(
        `SELECT m.id,m.revision,d.revision devRev
           FROM movimientos m JOIN movimiento_devolucion d ON d.movimiento=m.id
          WHERE d.estado='Revisar'`,
      )
      .get() as { id: string; revision: number; devRev: number };

    // 3. Rectificación en Revisar que supera la capacidad restante (80 + 50 > 120) → DEVOLUTION_EXCESS
    const rectRevisarExceso: EntradaDevolucionImpacto = {
      accion: "rectificar",
      id: devRev.id,
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-11",
        importe: "50.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución en Revisar 50",
        revision: devRev.revision,
        motivo: "Subir importe en Revisar",
      },
    };
    expectAmbosRechazan(rectRevisarExceso, 422, "DEVOLUTION_EXCESS", "confirm-f3-exceso-rev-rect-01");

    // 4. Atribución con devolucionRevision obsoleta → ATTRIBUTION_REVISION_CONFLICT
    const atribObsoleta: EntradaDevolucionImpacto = {
      accion: "atribuir",
      id: devRev.id,
      body: {
        revision: devRev.revision,
        devolucionRevision: devRev.devRev + 5,
        compra: compraId,
        estado: "Verificado",
        elegibilidad: "Acreditada",
        cicloOrigen: "1",
        evidenciaRelacion: "Ticket",
        evidenciaOrigenTemporal: "Enero",
        motivo: "Revisión obsoleta",
      },
    };
    expectAmbosRechazan(atribObsoleta, 409, "ATTRIBUTION_REVISION_CONFLICT", "confirm-f3-rev-conflict-01");

    // 5. Atribución sin compra sobre vínculo existente → DEVOLUTION_LINK_REQUIRED
    const atribSinCompra: EntradaDevolucionImpacto = {
      accion: "atribuir",
      id: devRev.id,
      body: {
        revision: devRev.revision,
        devolucionRevision: devRev.devRev,
        compra: "",
        estado: "Revisar",
        motivo: "Intentar desvincular",
      },
    };
    expectAmbosRechazan(atribSinCompra, 422, "DEVOLUTION_LINK_REQUIRED", "confirm-f3-link-req-01");

    // 6. Guardas sobre la compra vinculada: DEVOLUTION_LINKED (anular) y PURCHASE_BELOW_REFUNDED (rebajar < 80)
    const compraRow = db
      .query("SELECT revision FROM movimientos WHERE id=?")
      .get(compraId) as { revision: number };
    const anularCompraBody = { revision: compraRow.revision, motivo: "Anular compra vinculada" };
    expect(() => previewMovement(db, anularCompraBody, compraId, true)).toThrow(
      expect.objectContaining({ status: 422, code: "DEVOLUTION_LINKED" }),
    );
    expect(() =>
      writeMovement(
        db,
        { ...anularCompraBody, fingerprint: dummyToken },
        "confirm-f3-dev-linked-01",
        compraId,
        true,
        Date.now(),
        undefined,
        GATE_ABIERTO,
      ),
    ).toThrow(expect.objectContaining({ status: 422, code: "DEVOLUTION_LINKED" }));

    const rebajarCompraBody = {
      tipo: "Gasto",
      fecha: "2026-01-15",
      importe: "50.00",
      saldo: saldoId,
      concepto: "Rebajar por debajo de devuelto",
      nota: "",
      partida: partidaId,
      revision: compraRow.revision,
      motivo: "Rebaja inválida",
    };
    expect(() => previewMovement(db, rebajarCompraBody, compraId, false)).toThrow(
      expect.objectContaining({ status: 422, code: "PURCHASE_BELOW_REFUNDED" }),
    );
    expect(() =>
      writeMovement(
        db,
        { ...rebajarCompraBody, fingerprint: dummyToken },
        "confirm-f3-below-ref-01",
        compraId,
        false,
        Date.now(),
        undefined,
        GATE_ABIERTO,
      ),
    ).toThrow(expect.objectContaining({ status: 422, code: "PURCHASE_BELOW_REFUNDED" }));

    db.close();
  });

  test("SPEC38 §3.2 / AC-07 · Fila histórica en version_conjunto='2' es NoComparable con revalidacionSugerida=true sin dirty espontáneo y se marca al recibir operación material en '3'", () => {
    const { db, compraId, saldoId } = setupDb();
    expect(VERSION_CONJUNTO).toBe("3");

    // Sembrar fila histórica en version_conjunto = "2" con huella v2
    const huellaHistoricaV2 = "a".repeat(64);
    const cobertura = universoFinanciero(db, "1").cobertura;
    db.run(
      `INSERT INTO cierre_validacion(
         ciclo,revision,revision_actor,revision_instante,huella_validacion,version_conjunto,cobertura,dirty
       ) VALUES('1',1,'usuario-unico','2026-01-31T23:59:59.000Z',?,'2',?,0)`,
      [huellaHistoricaV2, JSON.stringify(cobertura)],
    );

    // Sin operación: NoComparable + revalidacionSugerida=true, NO se marca dirty espontáneamente
    const antes = proyectarValidacion(db, "1");
    expect(antes.estado).toBe("Validada");
    expect(antes.dirty).toBe(false);
    expect(antes.divergenciaValidacion).toBe("NoComparable");
    expect(antes.revalidacionSugerida).toBe(true);
    expect(antes.validado).toBe(false);
    expect(antes.versionConjunto).toBe("2");

    // Operación material nueva: compara antes/después en "3", marca dirty=1 y preserva referencia "2"
    const h3Antes = huellaUniverso(universoFinanciero(db, "1"));
    const alta: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: saldoId,
        nota: "",
        concepto: "Devolución sobre histórica v2",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket #1",
          evidenciaOrigenTemporal: "Factura enero",
        },
      },
    };
    const preview = previewDevolucionImpacto(db, alta);
    const c1 = preview.devolucionImpacto.ciclosAfectados.find((c) => c.ciclo === "1");
    expect(c1).toBeDefined();
    expect(c1!.validado).toBe(false);
    expect(c1!.motivo).toEqual(["FLUJO_CICLO", "ATRIBUCION"]);

    confirmarDevolucionImpacto(
      db,
      {
        ...alta,
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        key: "confirm-ac07-v2-a-v3-01",
      },
      GATE_ABIERTO,
    );

    const h3Despues = huellaUniverso(universoFinanciero(db, "1"));
    expect(h3Despues).not.toBe(h3Antes);

    const despues = proyectarValidacion(db, "1");
    expect(despues.estado).toBe("Pendiente");
    expect(despues.dirty).toBe(true);
    expect(despues.divergenciaValidacion).toBe("NoComparable");
    expect(despues.revalidacionSugerida).toBe(true);
    expect(despues.validado).toBe(false);
    // Referencia histórica en "2" preservada intacta
    expect(despues.versionConjunto).toBe("2");
    expect(despues.huellaValidacion).toBe(huellaHistoricaV2);

    const audit = db
      .query(
        `SELECT accion,huella_anterior,huella_posterior
           FROM cierre_validacion_audit WHERE ciclo='1' ORDER BY id DESC LIMIT 1`,
      )
      .get() as { accion: string; huella_anterior: string; huella_posterior: string };
    expect(audit).toEqual({
      accion: "dirty_marcado",
      huella_anterior: h3Antes,
      huella_posterior: h3Despues,
    });
    db.close();
  });

  test("SPEC39 §4 · alta y atribuir con flujo no disponible dan 409 IMPACTO_NO_VERIFICABLE sin escritura", () => {
    const { db, compraB, huerfana } = conExcesoEnCiclo();

    const alta: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: "S001",
        nota: "",
        concepto: "Alta sobre compra con capacidad",
        devolucion: {
          compra: compraB,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket B",
          evidenciaOrigenTemporal: "Factura B",
        },
      },
    };
    const antes = snapCounts(db);
    const altaFallo = codigoDe(() => previewDevolucionImpacto(db, alta));
    expect(altaFallo.status).toBe(409);
    expect(altaFallo.code).toBe("IMPACTO_NO_VERIFICABLE");
    expect(snapCounts(db)).toEqual(antes);

    const rev = db
      .query("SELECT revision FROM movimientos WHERE id=?")
      .get(huerfana) as { revision: number };
    const atribuir: EntradaDevolucionImpacto = {
      accion: "atribuir",
      id: huerfana,
      body: {
        revision: rev.revision,
        compra: compraB,
        estado: "Verificado",
        elegibilidad: "Acreditada",
        evidenciaRelacion: "Evidencia huérfana",
        evidenciaOrigenTemporal: "Documento huérfano",
        cicloOrigen: "1",
      },
    };
    const atribuirFallo = codigoDe(() => previewDevolucionImpacto(db, atribuir));
    expect(atribuirFallo.status).toBe(409);
    expect(atribuirFallo.code).toBe("IMPACTO_NO_VERIFICABLE");
    expect(snapCounts(db)).toEqual(antes);
    db.close();
  });

  test("SPEC39 §4/§6 · anular una devolución causante del exceso sigue permitido (saneamiento)", () => {
    const { db, devolucionConExceso } = conExcesoEnCiclo();
    const mov = db
      .query("SELECT revision FROM movimientos WHERE id=?")
      .get(devolucionConExceso) as { revision: number };
    const antes = snapCounts(db);
    const entrada: EntradaDevolucionImpacto = {
      accion: "anular",
      id: devolucionConExceso,
      body: { revision: mov.revision, motivo: "Saneamiento del exceso histórico" },
    };
    const preview = previewDevolucionImpacto(db, entrada);
    confirmarDevolucionImpacto(
      db,
      {
        ...entrada,
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        key: "confirm-anular-exceso-0001",
      },
      GATE_ABIERTO,
    );
    expect(
      db.query("SELECT anulado FROM movimientos WHERE id=?").get(devolucionConExceso),
    ).toEqual({ anulado: 1 });
    // El vínculo se conserva para trazabilidad; no se borra ni se inventa banco.
    expect(
      db.query("SELECT COUNT(*) n FROM movimiento_devolucion WHERE movimiento=?").get(
        devolucionConExceso,
      ),
    ).toEqual({ n: 1 });
    expect(snapCounts(db).movimientos).toBe(antes.movimientos);
    // Tras el saneamiento, la cobertura deja de ser NoDisponible (puede seguir
    // Parcial por el abono huérfano de la fixture, pero ya es medible).
    const devoluciones = universoFinanciero(db, "1").cobertura.find(
      (entrada) => entrada.fuente === "devoluciones",
    );
    expect(devoluciones?.estado).not.toBe("NoDisponible");
    db.close();
  });

  test("SPEC39 §4/§6 · rectificar a la capacidad real sigue permitido aunque el flujo no sea medible", () => {
    const { db, devolucionConExceso } = conExcesoEnCiclo();
    const mov = db
      .query("SELECT revision FROM movimientos WHERE id=?")
      .get(devolucionConExceso) as { revision: number };
    const entrada: EntradaDevolucionImpacto = {
      accion: "rectificar",
      id: devolucionConExceso,
      body: {
        tipo: "Devolución de gasto",
        revision: mov.revision,
        importe: "0.01",
        fecha: "2026-01-20",
        saldo: "S001",
        nota: "",
        concepto: "Abono ficticio",
        motivo: "Ajuste individual del importe",
      },
    };
    const preview = previewDevolucionImpacto(db, entrada);
    confirmarDevolucionImpacto(
      db,
      {
        ...entrada,
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        key: "confirm-rectificar-exceso-0001",
      },
      GATE_ABIERTO,
    );
    expect(
      db.query("SELECT importe,revision FROM movimientos WHERE id=?").get(
        devolucionConExceso,
      ),
    ).toEqual({ importe: 1, revision: mov.revision + 1 });
    db.close();
  });

  test("SPEC38/SPEC39 · un cambio sólo de cobertura entre preview y confirmación da IMPACT_CHANGED sin dirty", () => {
    const { db, compraId } = setupDb();
    const entrada: EntradaDevolucionImpacto = {
      accion: "alta",
      body: {
        tipo: "Devolución de gasto",
        fecha: "2026-02-10",
        importe: "30.00",
        saldo: "S001",
        nota: "",
        concepto: "Devolución con cobertura cambiada",
        devolucion: {
          compra: compraId,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          cicloOrigen: "1",
          evidenciaRelacion: "Ticket C",
          evidenciaOrigenTemporal: "Factura C",
        },
      },
    };
    const preview = previewDevolucionImpacto(db, entrada);
    // Sólo cambia la cobertura: una fuente deja de estar instalada.
    db.run("DROP TABLE operaciones_inversion");
    const antes = snapCounts(db);
    const fallo = codigoDe(() =>
      confirmarDevolucionImpacto(
        db,
        {
          ...entrada,
          fingerprint: preview.fingerprint,
          contextRevision: preview.contextRevision,
          impactRevision: preview.impactRevision,
          key: "confirm-cobertura-cambiada-0001",
        },
        GATE_ABIERTO,
      ),
    );
    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IMPACT_CHANGED");
    expect(snapCounts(db)).toEqual(antes);
    expect(
      db.query("SELECT COUNT(*) n FROM cierre_validacion_audit").get(),
    ).toEqual({ n: 0 });
    db.close();
  });
});
