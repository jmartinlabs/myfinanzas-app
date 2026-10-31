// Fictitious E2E source for COMIDA-UNICO-01 and D′. Never imported by runtime.
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { createSaldo } from "../src/saldos";
import { createClassification } from "../src/clasificacion";
import { createCycle, cycleContext } from "../src/ciclos";
import { previewMovement, writeMovement } from "../src/movimientos";
import {
  activateRegimen,
  prepareRegimen,
  writeComidaDevolucion,
  writeComidaMetadata,
  writeComidaRol,
} from "../src/comida";
import {
  confirmPartidaConfig,
  confirmLineas,
  createPlanificacion,
  previewLineas,
  previewPartidaConfig,
  writeMensual,
} from "../src/dprima";

export const E2E_NOW = Date.parse("2026-10-31T12:00:00Z");

function add(
  db: Database,
  body: Record<string, unknown>,
  now = E2E_NOW,
) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
    },
    randomUUID(),
    null,
    false,
    now,
  );
}

function configure(
  db: Database,
  id: string,
  cambios: Record<string, unknown>,
) {
  const preview = previewPartidaConfig(db, id, {
    cambios,
    motivo: "Configuración E2E ficticia",
  });
  return confirmPartidaConfig(
    db,
    id,
    {
      cambios,
      motivo: "Configuración E2E ficticia",
      fingerprint: preview.fingerprint,
    },
    randomUUID(),
    E2E_NOW,
  );
}

function forecastLine(
  db: Database,
  planId: string,
  lineId: string,
  importe: string,
  revision: number,
) {
  const preview = previewLineas(db, planId, {
    revision,
    cambios: [{ id: lineId, importe, esencial: false }],
    motivo: "Previsión E2E ficticia",
  });
  return confirmLineas(
    db,
    planId,
    {
      revision,
      cambios: preview.cambios,
      motivo: "Previsión E2E ficticia",
      fingerprint: preview.fingerprint,
    },
    randomUUID(),
    E2E_NOW,
  );
}

export function comidaDprimaFixture(db: Database) {
  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Gastos E2E",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub E2E", padre: category.id },
    randomUUID(),
  );
  const food = createClassification(
    db,
    "partidas",
    { nombre: "Comida E2E", padre: sub.id },
    randomUUID(),
  );
  const leisure = createClassification(
    db,
    "partidas",
    { nombre: "Ocio E2E", padre: sub.id },
    randomUUID(),
  );
  const source = createSaldo(
    db,
    {
      nombre: "Cuenta origen E2E",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "1000",
      fechaApertura: "2026-09-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    E2E_NOW,
  );
  const ing = createSaldo(
    db,
    {
      nombre: "ING Comida E2E",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "100",
      fechaApertura: "2026-09-20",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    E2E_NOW,
  );
  const c1 = createCycle(
    db,
    {
      inicio: "2026-09-20",
      saldoInicialComida: "100",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    E2E_NOW,
  ).ciclo;
  const c2 = createCycle(
    db,
    {
      inicio: "2026-10-20",
      saldoInicialComida: "100",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    E2E_NOW,
  ).ciclo;

  const finance = add(db, {
    tipo: "Transferencia",
    fecha: "2026-10-21",
    importe: "800",
    origen: source.id,
    destino: ing.id,
    concepto: "Financiación E2E",
    nota: "",
  });
  writeComidaRol(
    db,
    finance.movimiento.id,
    {
      revision: 1,
      rol: "Financiación",
      evidencia: "Transferencia E2E ficticia",
    },
    randomUUID(),
    E2E_NOW,
  );
  const foodBuy = add(db, {
    tipo: "Gasto",
    fecha: "2026-10-22",
    importe: "50",
    saldo: ing.id,
    partida: food.id,
    concepto: "Compra comida E2E",
    nota: "",
    comida: { etiqueta: "Comida", evidenciaBancaria: "Extracto E2E" },
  });
  const leisureBuy = add(db, {
    tipo: "Gasto",
    fecha: "2026-10-23",
    importe: "50",
    saldo: ing.id,
    partida: leisure.id,
    concepto: "Ocio E2E compra",
    nota: "",
    comida: { etiqueta: "Ocio", evidenciaBancaria: "Extracto E2E" },
  });
  const refund = add(db, {
    tipo: "Devolución de gasto",
    fecha: "2026-10-24",
    importe: "15",
    saldo: ing.id,
    partida: leisure.id,
    concepto: "Devolución ocio E2E",
    nota: "",
    comida: { etiqueta: "Ocio" },
    devolucion: {
      estado: "Verificado",
      compra: leisureBuy.movimiento.id,
      evidenciaRelacion: "Motivo comercial E2E",
      elegibilidad: "Acreditada",
      cicloOrigen: c2.id,
      evidenciaOrigenTemporal: "Documento compra E2E",
    },
  });
  const restitution = add(db, {
    tipo: "Transferencia",
    fecha: "2026-10-25",
    importe: "20",
    origen: ing.id,
    destino: "S001",
    concepto: "Reposición E2E",
    nota: "",
  });
  writeComidaRol(
    db,
    restitution.movimiento.id,
    {
      revision: 1,
      rol: "Reposición",
      obligacionCiclo: c2.id,
      evidencia: "Reposición E2E ficticia",
    },
    randomUUID(),
    E2E_NOW,
  );
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: c2.id,
      apertura: "100",
      evidencia: "Extracto E2E ficticio",
      cobertura: "Verificable",
      motivo: "Preparación E2E",
    },
    randomUUID(),
    E2E_NOW,
  );
  activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación E2E ficticia",
      confirmar: true,
    },
    randomUUID(),
    E2E_NOW,
  );
  // Keep an unclassified purchase in the active Saldo for the UI path.
  const unclassified = add(db, {
    tipo: "Gasto",
    fecha: "2026-10-26",
    importe: "30",
    saldo: ing.id,
    partida: food.id,
    concepto: "Compra sin clasificar E2E",
    nota: "",
  });

  const realRoot = createClassification(
    db,
    "partidas",
    { nombre: "Raíz gasto E2E", padre: sub.id },
    randomUUID(),
  );
  configure(db, realRoot.id, { fuente: "Gasto real" });
  const realDaughter = createClassification(
    db,
    "partidas",
    { nombre: "Hija gasto E2E", padre: sub.id },
    randomUUID(),
  );
  configure(db, realDaughter.id, { padrePartida: realRoot.id });
  const aportRoot = createClassification(
    db,
    "partidas",
    { nombre: "Raíz aportación E2E", padre: sub.id },
    randomUUID(),
  );
  configure(db, aportRoot.id, { fuente: "Aportación a saldo" });
  const aportDaughter = createClassification(
    db,
    "partidas",
    { nombre: "Hija aportación E2E", padre: sub.id },
    randomUUID(),
  );
  configure(db, aportDaughter.id, { padrePartida: aportRoot.id });

  const realPlan = createPlanificacion(
    db,
    {
      padre: realRoot.id,
      saldo: ing.id,
      mesInicial: "2026-10-01",
      mesFinal: "2026-10-01",
      saldoInicial: "100",
      saldoEvidencia: "Extracto E2E",
      copiarHijas: true,
    },
    randomUUID(),
    E2E_NOW,
  );
  forecastLine(
    db,
    realPlan.planificacion.id,
    realPlan.lineas[0].id,
    "100",
    realPlan.planificacion.revision,
  );
  const aportPlan = createPlanificacion(
    db,
    {
      padre: aportRoot.id,
      saldo: ing.id,
      mesInicial: "2026-11-01",
      mesFinal: "2026-12-01",
      saldoInicial: "100",
      saldoEvidencia: "Extracto E2E",
      copiarHijas: true,
    },
    randomUUID(),
    E2E_NOW,
  );
  const aportUpdated = forecastLine(
    db,
    aportPlan.planificacion.id,
    aportPlan.lineas[0].id,
    "300",
    aportPlan.planificacion.revision,
  );
  writeMensual(
    db,
    c2.id,
    {
      raiz: aportRoot.id,
      fuente: "Aportación a saldo",
      destino: ing.id,
      base: null,
      esencial: null,
      delMes: "50",
      revision: 0,
    },
    randomUUID(),
    E2E_NOW,
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE900','Presupuesto E2E','Gasto real','S001','Activo',1,'f','f')",
  );
  const mappingPartida = createClassification(
    db,
    "partidas",
    { nombre: "Partida mapping E2E", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  return {
    c1,
    c2,
    ing,
    food,
    leisure,
    source,
    foodBuy,
    leisureBuy,
    refund,
    restitution,
    unclassified,
    realRoot,
    realDaughter,
    aportRoot,
    aportDaughter,
    realPlan,
    aportPlan,
    aportUpdated,
    mappingPartida,
  };
}
