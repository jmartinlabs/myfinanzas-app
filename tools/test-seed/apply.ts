import type { Database } from "bun:sqlite";
import { createSaldo } from "../../apps/api/src/saldos";
import { createClassification } from "../../apps/api/src/clasificacion";
import { createBudget } from "../../apps/api/src/presupuestos";
import { createDebt } from "../../apps/api/src/deudas";
import { createCycle, cycleContext } from "../../apps/api/src/ciclos";
import { createAnticipo } from "../../apps/api/src/anticipos";
import { createReference } from "../../apps/api/src/referencias";
import { previewMovement, writeMovement } from "../../apps/api/src/movimientos";
import { createInstrumento } from "../../apps/api/src/instrumentos";
import { createPurchase } from "../../apps/api/src/compras";
import { dataset, seedNow } from "./dataset/ft1";
import { SeedError } from "./errors";

export class ApplyFailure extends Error {
  constructor(
    public readonly step: string,
    public readonly cause: unknown,
  ) {
    super(`Fallo al aplicar ${step}.`);
    this.name = "ApplyFailure";
  }
}

const key = (entity: string, number: string | number) =>
  `seed-ft1-${entity}-${number}`;

function expectId(actual: string, expected: string, step: string) {
  if (actual !== expected)
    throw new SeedError(
      1,
      `ID generado ${actual} distinto del congelado ${expected}.`,
      step,
    );
}

export function applyDataset(db: Database) {
  let step = "inicio";
  const run = <T>(name: string, action: () => T): T => {
    step = name;
    try {
      return action();
    } catch (error) {
      throw new ApplyFailure(name, error);
    }
  };
  try {
    run("saldos", () => {
      dataset.saldos.forEach((saldo, index) => {
        const created = createSaldo(
          db,
          {
            nombre: saldo.nombre,
            tipo: saldo.tipo,
            control: saldo.control,
            saldoApertura: saldo.saldoApertura,
            fechaApertura: saldo.fechaApertura,
            permiteSalidaExterior: saldo.permiteSalidaExterior,
          },
          key("saldo", index + 1),
          seedNow,
        );
        expectId(created.id, saldo.id, "saldos");
      });
    });

    run("categorias", () => {
      dataset.classifications.categorias.forEach((categoria, index) => {
        const created = createClassification(
          db,
          "categorias",
          {
            nombre: categoria.nombre,
            grupo: categoria.grupo,
            anual: categoria.anual,
            mensual: categoria.mensual,
            referencia: categoria.referencia,
          },
          key("categoria", index + 1),
          seedNow,
        );
        expectId(created.id, categoria.id, "categorias");
      });
    });

    run("subcategorias", () => {
      dataset.classifications.subcategorias.forEach((subcategoria, index) => {
        const created = createClassification(
          db,
          "subcategorias",
          { nombre: subcategoria.nombre, padre: subcategoria.padre },
          key("subcategoria", index + 1),
          seedNow,
        );
        expectId(created.id, subcategoria.id, "subcategorias");
      });
    });

    run("presupuesto", () => {
      const created = createBudget(
        db,
        {
          nombre: dataset.presupuesto.nombre,
          fuente: dataset.presupuesto.fuente,
          destino: dataset.presupuesto.destino,
        },
        key("presupuesto", 1),
        seedNow,
      );
      expectId(created.id, dataset.presupuesto.id, "presupuesto");
    });

    run("deuda", () => {
      const created = createDebt(
        db,
        {
          nombre: dataset.deuda.nombre,
          inicioControl: dataset.deuda.inicioControl,
          capitalApertura: dataset.deuda.capitalApertura,
          tipoDeuda: dataset.deuda.tipoDeuda,
          tin: dataset.deuda.tin,
          tae: dataset.deuda.tae,
          cuotaContractual: dataset.deuda.cuotaContractual,
          condiciones: dataset.deuda.condiciones,
        },
        key("deuda", 1),
        seedNow,
      );
      expectId(created.id, dataset.deuda.id, "deuda");
    });

    run("partidas", () => {
      dataset.classifications.partidas.forEach((partida, index) => {
        const created = createClassification(
          db,
          "partidas",
          {
            nombre: partida.nombre,
            padre: partida.padre,
            deuda: partida.deuda,
            presupuesto: partida.presupuesto,
          },
          key("partida", index + 1),
          seedNow,
        );
        expectId(created.id, partida.id, "partidas");
      });
    });

    run("referencia-anticipo", () => {
      const created = createAnticipo(
        db,
        {
          nombre: dataset.referencias.anticipo.nombre,
          apertura: dataset.referencias.anticipo.apertura,
          evidencia: dataset.referencias.anticipo.evidencia,
        },
        key("referencia", "anticipo"),
        seedNow,
      );
      expectId(
        created.referencia.id,
        dataset.referencias.anticipo.id,
        "referencia-anticipo",
      );
    });

    run("referencia-vehiculo", () => {
      const created = createReference(
        db,
        {
          nombre: dataset.referencias.vehiculo.nombre,
          tipo: dataset.referencias.vehiculo.tipo,
          vehiculo: dataset.referencias.vehiculo.vehiculo,
        },
        key("referencia", "vehiculo"),
        seedNow,
      );
      expectId(
        created.id,
        dataset.referencias.vehiculo.id,
        "referencia-vehiculo",
      );
    });

    run("ciclo", () => {
      const created = createCycle(
        db,
        {
          inicio: dataset.ciclo.inicio,
          saldoInicialComida: dataset.ciclo.saldoInicialComida,
          contextRevision: cycleContext(db).revision,
        },
        key("ciclo", 1),
        seedNow,
      );
      expectId(created.ciclo.id, dataset.ciclo.id, "ciclo");
    });

    run("movimientos", () => {
      for (const movement of dataset.movimientos) {
        const { id: expectedId, ...body } = movement;
        const input = body as Record<string, unknown>;
        const preview = previewMovement(db, input, null, false, seedNow);
        const saved = writeMovement(
          db,
          {
            ...input,
            fingerprint: preview.fingerprint,
            aceptarCoincidencia: true,
          },
          key("movimiento", expectedId),
          null,
          false,
          seedNow,
        );
        expectId(saved.movimiento.id, expectedId, "movimientos");
      }
    });

    run("instrumento", () => {
      const instrumento = dataset.inversion.instrumento;
      const created = createInstrumento(
        db,
        {
          nombre: instrumento.nombre,
          isin: instrumento.isin,
          isinEvidencia: instrumento.isinEvidencia,
          divisaReferencia: instrumento.divisaReferencia,
        },
        key("instrumento", 1),
        seedNow,
      );
      expectId(created.instrumento.id, instrumento.id, "instrumento");
    });

    run("compra", () => {
      const compra = dataset.inversion.compra;
      const { id: expectedId, ...body } = compra;
      const created = createPurchase(
        db,
        body,
        key("compra", 1),
        seedNow,
      );
      expectId(created.compra.id, expectedId, "compra");
    });

    return step;
  } catch (error) {
    if (error instanceof ApplyFailure) throw error;
    throw new ApplyFailure(step, error);
  }
}
