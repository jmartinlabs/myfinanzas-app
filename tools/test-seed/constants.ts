import {
  admitted,
  contract,
} from "../../apps/api/src/schema-contract";
import { schemaVersion } from "../../apps/api/src/database-identity";

export const TEST_ORIGIN = "https://test.myfinanzas.pp.ua";
export const SEED_FORMAT = 1;
export const SEED_DATASET = "FT-1";
export const SEED_DATASET_VERSION = 1;
export const SEED_BUN = "1.4.3";
export const SEED_DATA_CONTRACT = "e4.11-v27";
export const SEED_SCHEMA_VERSION = schemaVersion;
export const SEED_SCHEMA_CONTRACT = admitted[27];
export const SEED_SCHEMA_CONTRACT_SHA256 = contract(admitted[27]).sha256;

export const DATABASE_RELATIVE = "state/database.sqlite";
export const KEY_RELATIVE = "state/auth.key";
export const MARKER_FILE = "test-instance.json";
export const MANIFEST_FILE = "seed-manifest.json";
export const FAILURE_FILE = "seed-failure.json";

export const APPLY_PRAGMAS =
  "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA recursive_triggers=ON;";

/** Metadatos de autenticación, sesiones e idempotencia fuera de la huella lógica. */
export const EXCLUDED_TABLES = new Set([
  "owner",
  "bootstrap",
  "challenges",
  "sessions",
  "recovery",
  "auth_limits",
  "auth_events",
  "idempotency",
]);

/** Marcas de tiempo e identidad de clave que dependen de cada ejecución limpia. */
export const EXCLUDED_COLUMNS = new Set([
  "instante",
  "creado",
  "actualizado",
  "creado_en",
  "actualizado_en",
  "key_hash",
]);

/** Payloads de auditoría que pueden contener marcas de tiempo. */
export const AUDIT_PAYLOAD_COLUMNS = new Set(["anterior", "posterior"]);

export const INITIAL_EMPTY_EXCEPTIONS = new Set([
  "saldos",
  "counters",
  "schema_version",
  "database_origin",
  "budget_contract",
]);

export const ID_QUERIES: Record<string, string> = {
  saldos: "SELECT id FROM saldos WHERE id!='S000' ORDER BY id",
  categorias: "SELECT id FROM categorias ORDER BY id",
  subcategorias: "SELECT id FROM subcategorias ORDER BY id",
  partidas: "SELECT id FROM partidas ORDER BY id",
  presupuestos: "SELECT id FROM presupuestos ORDER BY id",
  deudas: "SELECT id FROM deudas ORDER BY id",
  ciclos: "SELECT id FROM ciclos ORDER BY id",
  movimientos: "SELECT id FROM movimientos ORDER BY id",
  referencias: "SELECT id FROM referencias ORDER BY id",
  fichas_anticipos: "SELECT referencia AS id FROM fichas_anticipos ORDER BY referencia",
  fichas_vehiculo: "SELECT referencia AS id FROM fichas_vehiculo ORDER BY referencia",
  instrumentos: "SELECT id FROM instrumentos ORDER BY id",
  operaciones_inversion:
    "SELECT id FROM operaciones_inversion ORDER BY id",
  movimiento_anticipo:
    "SELECT movimiento AS id FROM movimiento_anticipo ORDER BY movimiento",
  payroll: "SELECT id FROM payroll ORDER BY id",
  payroll_allocations:
    "SELECT paga || ':' || movimiento AS id FROM payroll_allocations ORDER BY paga,movimiento",
  fichas_compartidos:
    "SELECT referencia AS id FROM fichas_compartidos ORDER BY referencia",
  participantes_compartido:
    "SELECT id FROM participantes_compartido ORDER BY id",
  movimiento_compartido:
    "SELECT movimiento AS id FROM movimiento_compartido ORDER BY movimiento",
};

export const ENTITY_COUNT_QUERIES: Record<string, string> = {
  saldos: "SELECT count(*) AS n FROM saldos",
  categorias: "SELECT count(*) AS n FROM categorias",
  subcategorias: "SELECT count(*) AS n FROM subcategorias",
  partidas: "SELECT count(*) AS n FROM partidas",
  presupuestos: "SELECT count(*) AS n FROM presupuestos",
  deudas: "SELECT count(*) AS n FROM deudas",
  ciclos: "SELECT count(*) AS n FROM ciclos",
  movimientos: "SELECT count(*) AS n FROM movimientos",
  referencias: "SELECT count(*) AS n FROM referencias",
  fichas_anticipos: "SELECT count(*) AS n FROM fichas_anticipos",
  fichas_vehiculo: "SELECT count(*) AS n FROM fichas_vehiculo",
  instrumentos: "SELECT count(*) AS n FROM instrumentos",
  operaciones_inversion:
    "SELECT count(*) AS n FROM operaciones_inversion",
  movimiento_anticipo:
    "SELECT count(*) AS n FROM movimiento_anticipo",
  payroll: "SELECT count(*) AS n FROM payroll",
  payroll_allocations:
    "SELECT count(*) AS n FROM payroll_allocations",
  fichas_compartidos:
    "SELECT count(*) AS n FROM fichas_compartidos",
  participantes_compartido:
    "SELECT count(*) AS n FROM participantes_compartido",
  movimiento_compartido:
    "SELECT count(*) AS n FROM movimiento_compartido",
};
