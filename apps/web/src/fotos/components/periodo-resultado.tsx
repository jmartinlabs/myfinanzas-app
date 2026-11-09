/**
 * Presentación de un agregado de periodo persistido de `/fotos`.
 *
 * Solo lectura: conserva la composición, cobertura y bloques No disponible.
 */

import { Badge, DataList, EmptyState, Table, type TableColumn } from "../../ui";
import {
  countPhrase,
  coverageState,
  periodNoDisponibleRows,
  property,
} from "../data";
import { date, money, utc } from "../format";
import { motivoTexto } from "../labels";
import { estadoTone } from "../states";
import type {
  BloqueCoberturaDto,
  ComponentePeriodoDto,
  FotoPeriodoDto,
  ValorCicloDto,
} from "../types";
import { Motivo, NoDisponibleList } from "./coverage";

export function PeriodoResultado({
  data,
  hrefCiclo,
  onAbrirCiclo,
  hrefPeriodoId,
  onAbrirId,
}: {
  data: FotoPeriodoDto;
  hrefCiclo: (ciclo: string, version?: number | null) => string;
  onAbrirCiclo: (ciclo: string, version?: number | null) => void;
  hrefPeriodoId: (id: number) => string;
  onAbrirId: (id: string) => void;
}) {
  const composicion = data.composicion;
  const cobertura = data.cobertura;
  const valores = data.valores.porCiclo;
  const noDisponibleInformado = Array.isArray(data.noDisponible);
  const noDisponible = periodNoDisponibleRows(data.noDisponible);
  const titulo =
    data.tipo === "Anio"
      ? `Año ${data.periodo.ejercicio}`
      : `T${data.periodo.trimestre} · ${data.periodo.ejercicio}`;

  const composicionColumns: TableColumn<ComponentePeriodoDto>[] = [
    {
      id: "ciclo",
      header: "Ciclo",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          {item.ciclo}
        </a>
      ),
    },
    {
      id: "mes",
      header: "Mes financiado",
      cell: (item) => date(item.mesFinanciado),
    },
    {
      id: "ventana",
      header: "Ventana de la foto",
      cell: (item) =>
        item.ventana
          ? `${date(item.ventana.inicio)} → ${date(item.ventana.fin)}`
          : "No disponible",
    },
    {
      id: "version",
      header: "Versión",
      cell: (item) =>
        item.versionFoto === null ? "Sin foto" : `v${item.versionFoto}`,
    },
    {
      id: "fingerprint",
      header: "Fingerprint",
      cell: (item) =>
        item.fingerprint ? (
          <code className="fotos-fingerprint" title={item.fingerprint}>
            {item.fingerprint}
          </code>
        ) : (
          <span className="muted">No disponible</span>
        ),
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (item) => (
        <span className="fotos-badges">
          <Badge tone={estadoTone(item.estado)} label={item.estado} />
          {item.estadoReapertura &&
            item.estadoReapertura !== "Abierta" && (
              <Badge tone="partial" label={item.estadoReapertura} />
            )}
        </span>
      ),
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: (item) => <Motivo value={item.motivo} />,
    },
    {
      id: "accion",
      header: "Foto",
      kind: "actions",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          {item.estado === "Incluido" ? "Abrir foto" : "Ver ciclo"}
        </a>
      ),
    },
  ];

  const valoresColumns: TableColumn<ValorCicloDto>[] = [
    {
      id: "ciclo",
      header: "Ciclo",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          {item.ciclo}
        </a>
      ),
    },
    {
      id: "version",
      header: "Versión",
      cell: (item) => `v${item.versionFoto}`,
    },
    {
      id: "ventana",
      header: "Ventana",
      cell: (item) =>
        `${date(item.ventana.inicio)} → ${date(item.ventana.fin)}`,
    },
    {
      id: "saldo",
      header: "Saldo inicial (S0)",
      kind: "amount",
      cell: (item) => money(item.ventana.saldoInicial),
    },
    {
      id: "hechos",
      header: "Hechos",
      cell: (item) =>
        `${item.estadoHechos} · ${countPhrase(
          property(item.hechos, "movimientos"),
          "movimiento",
          "movimientos",
        )}`,
    },
    {
      id: "plan",
      header: "Plan",
      cell: (item) =>
        `${item.estadoPlan} · ${countPhrase(
          property(item.plan, "items"),
          "línea",
          "líneas",
        )}`,
    },
    {
      id: "cobertura",
      header: "Cobertura",
      kind: "status",
      cell: (item) => (
        <Badge
          tone={estadoTone(coverageState(item.cobertura))}
          label={coverageState(item.cobertura)}
        />
      ),
    },
    {
      id: "accion",
      header: "Foto",
      kind: "actions",
      cell: (item) => (
        <a
          href={hrefCiclo(item.ciclo, item.versionFoto)}
          onClick={(event) => {
            event.preventDefault();
            onAbrirCiclo(item.ciclo, item.versionFoto);
          }}
        >
          Abrir foto
        </a>
      ),
    },
  ];

  const coberturaColumns: TableColumn<BloqueCoberturaDto>[] = [
    {
      id: "ciclo",
      header: "Ciclo",
      cell: (item) => item.ciclo,
    },
    {
      id: "version",
      header: "Versión",
      cell: (item) =>
        item.versionFoto === null ? "Sin foto" : `v${item.versionFoto}`,
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (item) => <Badge tone={estadoTone(item.estado)} label={item.estado} />,
    },
    {
      id: "motivos",
      header: "Motivos",
      cell: (item) =>
        item.motivos.length ? item.motivos.join(" · ") : "Sin motivo",
    },
  ];

  return (
    <>
      <section className="panel" aria-label="Identidad del agregado">
        <div className="fotos-section-head">
          <div>
            <p className="eyebrow">
              E4.11 · AGREGADO {data.tipo.toUpperCase()}
            </p>
            <h2>
              {titulo} · {data.identidad.versionAgregado}
            </h2>
          </div>
          <div className="fotos-badges">
            <Badge tone="info" icon="▣" label="Foto" />
            <Badge tone="info" label={data.identidad.versionAgregado} />
            <Badge
              tone={data.seleccionVersion.porDefecto === true ? "nd" : "ok"}
              label={
                data.seleccionVersion.porDefecto === true
                  ? "Última automática"
                  : "Consulta explícita"
              }
            />
            <Badge
              tone={estadoTone(data.cobertura.estado)}
              label={data.cobertura.estado}
            />
          </div>
        </div>
        <dl className="fotos-metrics">
          <div>
            <dt>Periodo</dt>
            <dd>
              {date(data.periodo.inicio)} → {date(data.periodo.fin)}
            </dd>
          </div>
          <div>
            <dt>Identidad</dt>
            <dd>
              #{data.id} · {data.identidad.versionAgregado}
            </dd>
          </div>
          <div>
            <dt>Creado</dt>
            <dd>{utc(data.identidad.fechaUtc)}</dd>
          </div>
          <div>
            <dt>Actor</dt>
            <dd>{data.identidad.actor}</dd>
          </div>
          <div>
            <dt>App / esquema</dt>
            <dd>
              {data.identidad.versionApp} · {data.identidad.versionEsquema}
            </dd>
          </div>
          <div>
            <dt>Motivo</dt>
            <dd>{data.identidad.motivo ?? "Sin motivo declarado"}</dd>
          </div>
          <div>
            <dt>Fingerprint</dt>
            <dd>
              <code
                className="fotos-fingerprint"
                title={data.identidad.fingerprint}
              >
                {data.identidad.fingerprint}
              </code>
            </dd>
          </div>
          <div>
            <dt>Selección de versión</dt>
            <dd>
              {data.seleccionAplicada.porDefecto
                ? "Automática: última por ciclo"
                : "Explícita por ciclo"}
            </dd>
          </div>
          <div>
            <dt>Regla</dt>
            <dd>
              {data.seleccionAplicada.regla} · {data.seleccionAplicada.reglaPeriodo}
            </dd>
          </div>
        </dl>
        <p className="help">
          {data.seleccionAplicada.porDefecto
            ? "Selección automática: última versión cerrada de cada ciclo en el instante de generar el agregado."
            : "Selección explícita declarada por ciclo; la composición conserva la versión efectiva."}
        </p>
        {Object.keys(data.seleccionAplicada.solicitada).length > 0 && (
          <p className="help">
            Versiones solicitadas:{" "}
            {Object.entries(data.seleccionAplicada.solicitada)
              .map(([ciclo, version]) => `${ciclo} v${version}`)
              .join(" · ")}
            .
          </p>
        )}
        <p className="help">
          <a
            href={hrefPeriodoId(data.id)}
            onClick={(event) => {
              event.preventDefault();
              onAbrirId(String(data.id));
            }}
          >
            Consultar esta identidad persistida
          </a>{" "}
          · Sin versión se consulta la última del periodo y se declara.
        </p>
        <p className="fotos-caveat" role="note">
          Total del periodo: <strong>No disponible</strong>.{" "}
          {cobertura.motivos.includes("SIN_REGLA_ADITIVA")
            ? "No existe regla aditiva aprobada; no se certifica un parcial ni se muestra 0."
            : "No se certifica un total mientras la cobertura no sea completa."}
        </p>
      </section>

      <section className="panel" aria-label="Composición del periodo">
        <h2>Composición por ciclos financiados</h2>
        <p className="muted">
          Cada ciclo se incluye íntegro por mes financiado, sin prorrateo. Los
          excluidos figuran con su motivo; no se inventa un ciclo.
        </p>
        {composicion.length ? (
          <>
            <div className="desktop-list fotos-table">
              <Table
                caption="Composición del periodo"
                label="Tabla de composición del periodo"
                columns={composicionColumns}
                rows={composicion}
                rowKey={(item) => item.ciclo}
              />
            </div>
            <DataList
              columns={composicionColumns}
              rows={composicion}
              rowKey={(item) => item.ciclo}
              label="Composición del periodo móvil"
              className="mobile-list"
            />
          </>
        ) : (
          <EmptyState title="Sin ciclos en el periodo" icon="○">
            No hay ciclos atribuidos por mes financiado; no se muestra 0.
          </EmptyState>
        )}
      </section>

      <section className="panel" aria-label="Valores por ciclo del periodo">
        <h2>Cifras por ciclo</h2>
        <p className="muted">
          No hay total de periodo certificado. Cada cifra pertenece a una foto
          de ciclo y conserva su versión; no se suma ni se recalcula.
        </p>
        {valores.length ? (
          <>
            <div className="desktop-list fotos-table">
              <Table
                caption="Cifras por ciclo del periodo"
                label="Tabla de cifras por ciclo"
                columns={valoresColumns}
                rows={valores}
                rowKey={(item) => item.ciclo}
              />
            </div>
            <DataList
              columns={valoresColumns}
              rows={valores}
              rowKey={(item) => item.ciclo}
              label="Cifras por ciclo móvil"
              className="mobile-list"
            />
          </>
        ) : (
          <EmptyState title="Sin cifras por ciclo" icon="○">
            No hay ciclos incluidos con valores persistidos; no se muestra 0.
          </EmptyState>
        )}
      </section>

      <section className="panel" aria-label="Cobertura del periodo">
        <h2>Cobertura del periodo</h2>
        <p>
          <Badge
            tone={estadoTone(cobertura.estado)}
            label={cobertura.estado}
          />
        </p>
        {cobertura.motivos.length ? (
          <ul className="fotos-list">
            {cobertura.motivos.map((motivo) => (
              <li key={motivo}>{motivoTexto(motivo)}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sin motivos de cobertura declarados.</p>
        )}
        {cobertura.bloques.length > 0 && (
          <>
            <h3>Cobertura por ciclo</h3>
            <div className="desktop-list fotos-table">
              <Table
                caption="Cobertura por ciclo del periodo"
                label="Tabla de cobertura por ciclo"
                columns={coberturaColumns}
                rows={cobertura.bloques}
                rowKey={(item) => item.ciclo}
              />
            </div>
            <DataList
              columns={coberturaColumns}
              rows={cobertura.bloques}
              rowKey={(item) => item.ciclo}
              label="Cobertura por ciclo móvil"
              className="mobile-list"
            />
          </>
        )}
      </section>

      <section className="panel" aria-label="Bloques no disponibles del periodo">
        <h2>No disponible</h2>
        {!noDisponibleInformado ? (
          <p className="muted">
            No informado. El total sigue sin certificarse.
          </p>
        ) : noDisponible.length ? (
          <NoDisponibleList rows={noDisponible} />
        ) : (
          <p className="muted">
            Sin bloques No disponible declarados. El total sigue sin certificarse.
          </p>
        )}
      </section>
    </>
  );
}
