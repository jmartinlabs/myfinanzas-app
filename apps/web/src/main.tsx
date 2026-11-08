import { Inicio } from "./Inicio";
import { RevisionComida } from "./RevisionComida";
import { Comida } from "./Comida";
import { Pendientes } from "./Pendientes";
import { Precierre } from "./Precierre";
import { Cierre } from "./Cierre";
import { Fotos } from "./Fotos";
import { Dprima } from "./Dprima";
import { Compartidos } from "./Compartidos";
import { FlujoMensual } from "./FlujoMensual";
import { Anticipos } from "./Anticipos";
import { Nomina } from "./Nomina";
import { PlanAnual } from "./PlanAnual";
import { ResumenAnual } from "./ResumenAnual";
import { PlanesCiclo } from "./PlanesCiclo";
import { Presupuestos } from "./Presupuestos";
import { Deudas } from "./Deudas";
import { Referencias } from "./Referencias";
import { Vehiculos } from "./Vehiculos";
import { Inversiones } from "./Inversiones";
import { Movimientos } from "./Movimientos";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, type Saldo } from "./api";
import {
  isNavigationActive,
  navigationGroups,
  navigationTitle,
} from "./navigation";
import { AuthScreen } from "./AuthScreen";
import { environmentLabel } from "./environment";
import { SaldoForm } from "./SaldoForm";
import { SaldoDetail, SaldoList } from "./Saldos";
import { Alert } from "./ui";
import { Clasificacion } from "./Clasificacion";
import { Ciclos, CycleHeader } from "./Ciclos";
import {
  applyTheme,
  currentTheme,
  themeCatalog,
  type ThemeId,
} from "./themes";
import "./style.css";
function App() {
  const environment = environmentLabel();
  const localEnvironment = environment === "Entorno local";
  const [auth, setAuth] = useState<"loading" | "ready" | "login" | "error">(
    "loading",
  );
  const [theme, setTheme] = useState<ThemeId>(() => currentTheme()),
    [path, setPath] = useState(location.pathname + location.search),
    [menu, setMenu] = useState(false),
    [saldo, setSaldo] = useState<Saldo | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState(""),
    [expired, setExpired] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mainNavRef = useRef<HTMLElement>(null);
  const check = () => {
    setAuth("loading");
    api("/auth/session")
      .then(() => setAuth("ready"))
      .catch((e) => setAuth(e.status === 401 ? "login" : "error"));
  };
  useEffect(check, []);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    document.title = `${navigationTitle(path)} · MyFinanzas`;
  }, [path]);
  useEffect(() => {
    const expired = () => setExpired(true);
    addEventListener("session-expired", expired);
    return () => removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    const pop = () => {
      setPath(location.pathname + location.search);
      setNotice("");
      setMenu(false);
    };
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const firstLink =
      mainNavRef.current?.querySelector<HTMLAnchorElement>("a");
    if (!firstLink) return;
    const frame = requestAnimationFrame(() => firstLink.focus());
    return () => cancelAnimationFrame(frame);
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenu(false);
      menuToggleRef.current?.focus();
    };
    addEventListener("keydown", close);
    return () => removeEventListener("keydown", close);
  }, [menu]);
  function go(p: string) {
    setNotice("");
    history.pushState(null, "", p);
    setPath(p);
    setMenu(false);
    window.scrollTo(0, 0);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("h1")?.focus(),
    );
  }
  const match = path.match(/^\/saldos\/(S\d+)(\/editar)?$/),
    id = match?.[1],
    editing = Boolean(match?.[2]),
    creating = path === "/saldos/nuevo";
  useEffect(() => {
    let current = true;
    setSaldo(null);
    setError("");
    if (id && auth === "ready")
      api("/saldos/" + id)
        .then((d) => {
          if (current) setSaldo(d.saldo);
        })
        .catch((e) => {
          if (current) setError(e.message);
        });
    return () => {
      current = false;
    };
  }, [id, revision, auth]);
  useEffect(() => {
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("h1")?.focus(),
    );
  }, [path, saldo]);
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      setAuth("login");
      setNotice("");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  if (auth === "loading")
    return (
      <main className="auth-shell">
        <p role="status">Comprobando sesión…</p>
      </main>
    );
  if (auth === "error")
    return (
      <main className="auth-shell">
        <Alert retry={check}>
          No se pudo comprobar la sesión. Comprueba que la API está disponible.
        </Alert>
      </main>
    );
  if (auth === "login")
    return (
      <AuthScreen
        onReady={() => {
          setExpired(false);
          setAuth("ready");
          const current = location.pathname + location.search;
          go(
            current.startsWith("/inicio") ||
              current.startsWith("/flujo-mensual") ||
              current.startsWith("/pendientes") ||
              current.startsWith("/inversiones") ||
              current.startsWith("/cierre") ||
              current.startsWith("/fotos")
              ? current
              : "/saldos",
          );
        }}
      />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <aside
        className={"sidebar " + (menu ? "expanded" : "")}
        aria-label="Navegación principal"
      >
        <a
          className="brand"
          href="/saldos"
          onClick={(e) => {
            e.preventDefault();
            go("/saldos");
          }}
        >
          My<span>Finanzas</span>
          <small>CONTROL FINANCIERO PERSONAL</small>
        </a>
        <button
          ref={menuToggleRef}
          type="button"
          className="menu-toggle"
          aria-expanded={menu}
          aria-controls="main-nav"
          onClick={() => setMenu((m) => !m)}
        >
          {menu ? "Cerrar menú" : "Abrir menú"}{" "}
          <span aria-hidden="true">☰</span>
        </button>
        <nav id="main-nav" aria-label="Secciones" ref={mainNavRef}>
          {navigationGroups.map((group) => (
            <div className="nav-section" key={group.id}>
              <p className="nav-group">{group.label}</p>
              {group.items.map((item) => {
                const active = isNavigationActive(item, path);
                return (
                  <a
                    key={item.href}
                    className={active ? "nav-active" : "nav-link"}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      go(item.href);
                    }}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-chevron" aria-hidden="true">
                      ›
                    </span>
                  </a>
                );
              })}
            </div>
          ))}
          <div className="nav-future">
            Las siguientes entregas ampliarán tu espacio financiero.
          </div>
        </nav>
        <div className="sidebar-bottom">
          <span className="local-dot" />{" "}
          {localEnvironment ? "Local · Datos ficticios" : "Datos ficticios"}
          <small>Excel v5.11 sigue como maestro</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="global-header">
          <CycleHeader path={path} />
          <div className="header-actions">
            <label className="theme-picker">
              Tema
              <select
                aria-label="Tema visual"
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemeId)}
              >
                {themeCatalog.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            {environment && (
              <span className="local-badge">{environment}</span>
            )}
            <button className="text-button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="content">
          {expired && (
            <Alert>
              La sesión ha caducado. Copia cualquier borrador antes de volver a
              identificarte.{" "}
              <button className="secondary" onClick={() => setAuth("login")}>
                Volver a iniciar sesión
              </button>
            </Alert>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          {path.startsWith("/inicio") ? (
            <Inicio go={go} />
          ) : path.startsWith("/dprima") ? (
            <Dprima go={go} />
          ) : path.startsWith("/comida") ? (
            <Comida go={go} />
          ) : path.startsWith("/precierre") ? (
            <Precierre go={go} />
          ) : path.startsWith("/cierre") ? (
            <Cierre go={go} />
          ) : path.startsWith("/fotos") ? (
            <Fotos path={path} go={go} />
          ) : path.startsWith("/revision-comida") ? (
            <RevisionComida path={path} go={go} />
          ) : path.startsWith("/flujo-mensual") ? (
            <FlujoMensual path={path} go={go} />
          ) : path.startsWith("/pendientes") ? (
            <Pendientes path={path} go={go} />
          ) : path.startsWith("/compartidos") ? (
            <Compartidos path={path} go={go} />
          ) : path.startsWith("/anticipos") ? (
            <Anticipos path={path} go={go} />
          ) : path.startsWith("/nomina") ? (
            <Nomina />
          ) : path.startsWith("/plan-anual") ? (
            <PlanAnual go={go} />
          ) : path.startsWith("/resumen-anual") ? (
            <ResumenAnual go={go} />
          ) : path.startsWith("/planes-ciclo") ? (
            <PlanesCiclo go={go} />
          ) : path.startsWith("/presupuestos") ? (
            <Presupuestos path={path} go={go} />
          ) : path.startsWith("/deudas") ? (
            <Deudas path={path} go={go} />
          ) : path.startsWith("/vehiculos") ? (
            <Vehiculos path={path} go={go} />
          ) : path.startsWith("/inversiones") ? (
            <Inversiones path={path} go={go} />
          ) : path.startsWith("/referencias") ? (
            <Referencias path={path} go={go} />
          ) : path.startsWith("/movimientos") ? (
            <Movimientos path={path} go={go} />
          ) : path.startsWith("/ciclos") ? (
            <Ciclos path={path} go={go} />
          ) : path.startsWith("/clasificacion") ? (
            <Clasificacion path={path} go={go} />
          ) : creating ? (
            <SaldoForm
              onCancel={() => go("/saldos")}
              onSaved={(newId) => {
                go("/saldos/" + newId);
                setNotice("Saldo creado correctamente.");
                setRevision((r) => r + 1);
              }}
            />
          ) : id ? (
            error ? (
              <Alert retry={() => setRevision((r) => r + 1)}>
                {error}
                <p>
                  <a
                    href="/saldos"
                    onClick={(e) => {
                      e.preventDefault();
                      go("/saldos");
                    }}
                  >
                    Volver a Saldos
                  </a>
                </p>
              </Alert>
            ) : !saldo ? (
              <p role="status">Cargando ficha…</p>
            ) : editing && saldo.id !== "S000" ? (
              <SaldoForm
                key={saldo.id + ":" + saldo.revision}
                saldo={saldo}
                onCancel={() => go("/saldos/" + id)}
                onSaved={() => {
                  go("/saldos/" + id);
                  setNotice("Cambios guardados.");
                  setRevision((r) => r + 1);
                }}
              />
            ) : (
              <SaldoDetail
                saldo={saldo}
                go={go}
                onReload={() => setRevision((r) => r + 1)}
              />
            )
          ) : path === "/saldos" || path === "/" ? (
            <SaldoList go={go} />
          ) : (
            <Alert>
              <p>Página no encontrada.</p>
              <a
                href="/saldos"
                onClick={(e) => {
                  e.preventDefault();
                  go("/saldos");
                }}
              >
                Ir a Saldos
              </a>
            </Alert>
          )}
        </main>
        <footer className="global-footer">
          <span>MyFinanzas App</span>
          <span>Acceso privado · Información de demostración</span>
        </footer>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
