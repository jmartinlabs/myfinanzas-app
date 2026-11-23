import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import {
  createRevisionComida,
  rectificarRevisionComida,
  anularRevisionComida,
  vincularRevisionComida,
} from "./revision-comida";
import { writeComidaMetadata, writeComidaRol } from "./comida";

/**
 * #572 · F2G-AC-17: las operaciones ORDINARIAS (no de devolución) de
 * revision-comida y los recursos metadata/rol de Comida conservan los códigos y
 * el orden de error de origin/test. Estos 17 casos se generaron ejecutando este
 * mismo fichero sobre origin/test (625e3bdb) y se fijan literalmente.
 * No pasan ningún gate: nunca están clasificados.
 */
const now = Date.parse("2026-10-26T12:00:00Z");
const detalle = {
  fecha: "2026-10-07",
  concepto: "Compra ficticia",
  importe: "10.00",
  direccion: "Salida",
  esDevolucion: false,
  clasificacion: "Pendiente revisar",
  evidenciaBancaria: "op ficticia",
  cuentaOrigen: "Cuenta ficticia",
};
const repos = {
  fecha: "2026-10-12",
  concepto: "Reposición ficticia",
  importe: "20.00",
  direccion: "Entrada",
  esDevolucion: false,
  evidenciaBancaria: "operación ficticia",
  cuentaOrigen: "Cuenta ficticia",
};
function codigo(run: () => unknown) {
  try {
    run();
    return "OK";
  } catch (e: any) {
    return `${e.status}:${e.code}`;
  }
}

test("F2G-AC-17: códigos y orden de error de las operaciones ordinarias iguales a origin/test (17 casos)", () => {
  const db = openDatabase(":memory:");
  const usada = randomUUID();
  const fila = createRevisionComida(db, detalle, usada, now, "Detalle").operacion;
  const reposUsada = randomUUID();
  const fr = createRevisionComida(db, repos, reposUsada, now, "Reposicion").operacion;
  const mala = "corta";
  const x = { campoInventado: 1 };
  const rv = { revision: 1, motivo: "x" };
  const casos: Record<string, string> = {
    "01 alta, campo desconocido, clave nueva": codigo(() =>
      createRevisionComida(db, { ...detalle, ...x }, randomUUID(), now, "Detalle")),
    "02 alta, campo desconocido, clave usada con otro hash": codigo(() =>
      createRevisionComida(db, { ...detalle, ...x }, usada, now, "Detalle")),
    "03 alta, tipo inválido, clave nueva": codigo(() =>
      createRevisionComida(db, { ...detalle, tipo: "Reposicion" }, randomUUID(), now, "Detalle")),
    "04 alta, campo desconocido, clave inválida": codigo(() =>
      createRevisionComida(db, { ...detalle, ...x }, mala, now, "Detalle")),
    "05 alta, tipo inválido, clave inválida": codigo(() =>
      createRevisionComida(db, { ...detalle, tipo: "Reposicion" }, mala, now, "Detalle")),
    "06 alta válida, clave inválida": codigo(() =>
      createRevisionComida(db, detalle, mala, now, "Detalle")),
    "07 alta válida, clave usada con otro hash": codigo(() =>
      createRevisionComida(db, { ...detalle, concepto: "Otro" }, usada, now, "Detalle")),
    "08 alta válida, misma clave y hash (reproduce)": codigo(() =>
      createRevisionComida(db, detalle, usada, now, "Detalle")),
    "09 reposición, campo desconocido, clave usada con otro hash": codigo(() =>
      createRevisionComida(db, { ...repos, ...x }, reposUsada, now, "Reposicion")),
    "10 reposición, tipo inválido, clave inválida": codigo(() =>
      createRevisionComida(db, { ...repos, tipo: "Detalle" }, mala, now, "Reposicion")),
    "11 rectificar, campo desconocido, clave usada": codigo(() =>
      rectificarRevisionComida(db, fila.id, { ...rv, ...x }, usada, now, "Detalle")),
    "12 rectificar, campo desconocido, clave inválida": codigo(() =>
      rectificarRevisionComida(db, fila.id, { ...rv, ...x }, mala, now, "Detalle")),
    "13 anular, campo desconocido, clave inválida": codigo(() =>
      anularRevisionComida(db, fila.id, { ...rv, ...x }, mala, now, "Detalle")),
    "14 anular, campo desconocido, clave usada": codigo(() =>
      anularRevisionComida(db, fila.id, { ...rv, ...x }, usada, now, "Detalle")),
    "15 vincular, campo desconocido, clave inválida": codigo(() =>
      vincularRevisionComida(db, fr.id, { ...rv, ...x }, mala, now, "Reposicion")),
    "16 metadata, campo desconocido, clave inválida": codigo(() =>
      writeComidaMetadata(db, "999", { ...x }, mala, now)),
    "17 rol, campo desconocido, clave usada/nueva": codigo(() =>
      writeComidaRol(db, "999", { ...x }, randomUUID(), now)),
  };
  expect(casos).toEqual({
    "01 alta, campo desconocido, clave nueva": "422:VALIDATION",
    "02 alta, campo desconocido, clave usada con otro hash": "422:VALIDATION",
    "03 alta, tipo inválido, clave nueva": "422:VALIDATION",
    "04 alta, campo desconocido, clave inválida": "422:VALIDATION",
    "05 alta, tipo inválido, clave inválida": "422:VALIDATION",
    "06 alta válida, clave inválida": "422:IDEMPOTENCY_REQUIRED",
    "07 alta válida, clave usada con otro hash": "409:IDEMPOTENCY_CONFLICT",
    "08 alta válida, misma clave y hash (reproduce)": "OK",
    "09 reposición, campo desconocido, clave usada con otro hash": "422:VALIDATION",
    "10 reposición, tipo inválido, clave inválida": "422:VALIDATION",
    "11 rectificar, campo desconocido, clave usada": "422:VALIDATION",
    "12 rectificar, campo desconocido, clave inválida": "422:VALIDATION",
    "13 anular, campo desconocido, clave inválida": "422:VALIDATION",
    "14 anular, campo desconocido, clave usada": "422:VALIDATION",
    "15 vincular, campo desconocido, clave inválida": "422:VALIDATION",
    "16 metadata, campo desconocido, clave inválida": "422:VALIDATION",
    "17 rol, campo desconocido, clave usada/nueva": "422:VALIDATION",
  });
  db.close();
});
