import { describe, expect, test } from "bun:test";
import {
  NO_DATA,
  NO_VERSION_TEXT,
  environmentText,
  footerEnvironmentLabel,
  footerIdentityLabel,
  parseVersionPayload,
  schemaLabel,
  shaLabel,
  shortShaText,
  versionText,
  type AppVersionInfo,
} from "../src/version";

/**
 * #502 — formato y fallback del pie persistente, sin DOM.
 *
 * La versión y el entorno llegan de `/api/version`; estas pruebas fijan que un
 * payload incompleto o dudoso degrada al fallback explícito y que nunca se
 * presenta `0.0.0-e49`, ni un TEST inventado, ni una release sin versión.
 */

const release: AppVersionInfo = {
  app: { version: "0.2.0", sha: "a1b2c3d", label: "release" },
  environment: "TEST",
  schema: 31,
};
const development: AppVersionInfo = {
  app: { version: null, sha: null, label: "desarrollo" },
  environment: "DEMO",
  schema: 31,
};

describe("parseVersionPayload", () => {
  test("acepta el contrato de /api/version y normaliza el SHA corto", () => {
    expect(
      parseVersionPayload({
        app: {
          version: "0.2.0",
          sha: "A1B2C3D4E5F6",
          label: "release",
        },
        environment: "PROD",
        schema: 31,
      }),
    ).toEqual({
      app: { version: "0.2.0", sha: "a1b2c3d", label: "release" },
      environment: "PROD",
      schema: 31,
    });
    expect(
      parseVersionPayload({
        app: { version: null, sha: null, label: "desarrollo" },
        environment: "DEMO",
        schema: 31,
      }),
    ).toEqual(development);
  });

  test("rechaza payloads que no permiten mostrar una identidad fiable", () => {
    for (const value of [
      null,
      undefined,
      "0.2.0",
      [],
      {},
      { app: {}, environment: "TEST", schema: 31 },
      { app: release.app, environment: "STAGING", schema: 31 },
      { app: release.app, environment: "TEST", schema: "31" },
      { app: release.app, environment: "TEST", schema: 0 },
      // Una «release» sin versión verificable no se pinta como release.
      {
        app: { version: null, sha: null, label: "release" },
        environment: "TEST",
        schema: 31,
      },
      {
        app: { version: "última", sha: null, label: "release" },
        environment: "TEST",
        schema: 31,
      },
      {
        app: { version: "0.2.0", sha: null, label: "producción" },
        environment: "TEST",
        schema: 31,
      },
    ])
      expect(parseVersionPayload(value)).toBeNull();
  });

  test("un SHA inverificable se descarta sin perder la versión", () => {
    expect(shortShaText("no-es-un-sha")).toBeNull();
    expect(shortShaText(42)).toBeNull();
    expect(
      parseVersionPayload({
        app: { version: "0.2.0", sha: "../../etc/passwd", label: "release" },
        environment: "TEST",
        schema: 31,
      })?.app.sha,
    ).toBeNull();
  });
});

describe("texto del pie", () => {
  test("release: identidad y entorno servidos, con el entorno aparte (#503)", () => {
    expect(footerIdentityLabel(release)).toBe("MyFinanzas · v0.2.0");
    expect(footerEnvironmentLabel(release)).toBe("· TEST");
    expect(
      `${footerIdentityLabel(release)} ${footerEnvironmentLabel(release)}`,
    ).toBe("MyFinanzas · v0.2.0 · TEST");
  });

  test("desarrollo: no se presenta 0.0.0-e49 como versión estable", () => {
    expect(footerIdentityLabel(development)).toBe(
      "MyFinanzas · build de desarrollo",
    );
    expect(footerEnvironmentLabel(development)).toBe("· DEMO");
    expect(versionText(development)).toBe("Build de desarrollo");
    expect(footerIdentityLabel(release)).not.toContain("0.0.0-e49");
  });

  test("sin identidad verificable el fallback es explícito y sin entorno", () => {
    expect(footerIdentityLabel(null)).toBe(NO_VERSION_TEXT);
    expect(footerIdentityLabel(null)).toBe(
      "Versión no disponible · build de desarrollo",
    );
    expect(footerEnvironmentLabel(null)).toBeNull();
    expect(versionText(null)).toBe("Build de desarrollo");
    expect(environmentText(null)).toBe(NO_DATA);
    expect(shaLabel(null)).toBe(NO_DATA);
    expect(schemaLabel(null)).toBe(NO_DATA);
  });

  test("el panel separa esquema SQLite de versión de aplicación", () => {
    expect(versionText(release)).toBe("v0.2.0");
    expect(environmentText(release)).toBe("TEST");
    expect(shaLabel(release)).toBe("a1b2c3d");
    expect(schemaLabel(release)).toBe("SQLite v31");
    expect(versionText(release)).not.toBe(schemaLabel(release));
  });
});