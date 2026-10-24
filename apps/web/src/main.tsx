import { PlanAnual } from "./PlanAnual";
import { PlanesCiclo } from "./PlanesCiclo";
import { Presupuestos } from "./Presupuestos";
import { Deudas } from "./Deudas";
import { Referencias } from "./Referencias";
import { Movimientos } from "./Movimientos";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, type Saldo } from "./api";
import { AuthScreen } from "./AuthScreen";
import { SaldoForm } from "./SaldoForm";
import { SaldoDetail, SaldoList } from "./Saldos";
import { Alert } from "./ui";
import { Clasificacion } from "./Clasificacion";
import { Ciclos, CycleHeader } from "./Ciclos";
import "./style.css";
function App() {
  const [auth, setAuth] = useState<"loading" | "ready" | "login" | "error">(
    "loading",
  );
  const [path, setPath] = useState(location.pathname + location.search),
    [menu, setMenu] = useState(false),
    [saldo, setSaldo] = useState<Saldo | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState(""),
    [expired, setExpired] = useState(false);
  const check = () => {
    setAuth("loading");
    api("/auth/session")
      .then(() => setAuth("ready"))
      .catch((e) => setAuth(e.status === 401 ? "login" : "error"));
  };
  useEffect(check, []);
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
          go("/saldos");
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
          className="menu-toggle"
          aria-expanded={menu}
          aria-controls="main-nav"
          onClick={() => setMenu((m) => !m)}
        >
          {menu ? "Cerrar menú" : "Abrir menú"} ☰
        </button>
        <nav id="main-nav">
          <p className="nav-group">MI ESPACIO</p>
          <a
            className={
              path.startsWith("/planes-ciclo") ? "nav-active" : "nav-link"
            }
            href="/planes-ciclo"
            aria-current={path.startsWith("/planes-ciclo") ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              go("/planes-ciclo");
            }}
          >
            Plan del ciclo
          </a>
          <a
            className={
              path.startsWith("/plan-anual") ? "nav-active" : "nav-link"
            }
            href="/plan-anual"
            aria-current={path.startsWith("/plan-anual") ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              go("/plan-anual");
            }}
          >
            Plan anual
          </a>
          <a
            className={
              path.startsWith("/saldos") || path === "/"
                ? "nav-active"
                : "nav-link"
            }
            aria-current={
              path.startsWith("/saldos") || path === "/" ? "page" : undefined
            }
            href="/saldos"
            onClick={(e) => {
              e.preventDefault();
              go("/saldos");
            }}
          >
            <span aria-hidden="true">▤</span> Saldos{" "}
            <span aria-hidden="true">›</span>
          </a>
          <a
            className={
              path.startsWith("/clasificacion") ? "nav-active" : "nav-link"
            }
            aria-current={
              path.startsWith("/clasificacion") ? "page" : undefined
            }
            href="/clasificacion/partidas"
            onClick={(e) => {
              e.preventDefault();
              go("/clasificacion/partidas");
            }}
          >
            <span aria-hidden="true">≡</span> Clasificación{" "}
            <span aria-hidden="true">›</span>
          </a>
          <a
            className={path.startsWith("/ciclos") ? "nav-active" : "nav-link"}
            aria-current={path.startsWith("/ciclos") ? "page" : undefined}
            href="/ciclos"
            onClick={(e) => {
              e.preventDefault();
              go("/ciclos");
            }}
          >
            <span aria-hidden="true">▦</span> Ciclos{" "}
            <span aria-hidden="true">›</span>
          </a>
          <a
            className={
              path.startsWith("/movimientos") ? "nav-active" : "nav-link"
            }
            aria-current={path.startsWith("/movimientos") ? "page" : undefined}
            href="/movimientos"
            onClick={(e) => {
              e.preventDefault();
              go("/movimientos");
            }}
          >
            <span aria-hidden="true">↔</span> Movimientos{" "}
            <span aria-hidden="true">›</span>
          </a>
          <a
            className={
              path.startsWith("/referencias") ? "nav-active" : "nav-link"
            }
            aria-current={path.startsWith("/referencias") ? "page" : undefined}
            href="/referencias"
            onClick={(e) => {
              e.preventDefault();
              go("/referencias");
            }}
          >
            <span aria-hidden="true">⌑</span> Referencias{" "}
            <span aria-hidden="true">›</span>
          </a>
          <a
            className={path.startsWith("/deudas") ? "nav-active" : "nav-link"}
            aria-current={path.startsWith("/deudas") ? "page" : undefined}
            href="/deudas"
            onClick={(e) => {
              e.preventDefault();
              go("/deudas");
            }}
          >
            <span aria-hidden="true">◷</span> Deudas{" "}
            <span aria-hidden="true">›</span>
          </a>
          <a
            className={
              path.startsWith("/presupuestos") ? "nav-active" : "nav-link"
            }
            aria-current={path.startsWith("/presupuestos") ? "page" : undefined}
            href="/presupuestos"
            onClick={(e) => {
              e.preventDefault();
              go("/presupuestos");
            }}
          >
            <span aria-hidden="true">▤</span> Presupuestos{" "}
            <span aria-hidden="true">›</span>
          </a>
          <div className="nav-future">
            Las siguientes entregas ampliarán tu espacio financiero.
          </div>
        </nav>
        <div className="sidebar-bottom">
          <span className="local-dot" /> Local · Datos ficticios
          <small>Excel v5.11 sigue como maestro</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="global-header">
          <CycleHeader path={path} />
          <div className="header-actions">
            <span className="local-badge">Entorno local</span>
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
          {path.startsWith("/plan-anual") ? (
            <PlanAnual go={go} />
          ) : path.startsWith("/planes-ciclo") ? (
            <PlanesCiclo go={go} />
          ) : path.startsWith("/presupuestos") ? (
            <Presupuestos path={path} go={go} />
          ) : path.startsWith("/deudas") ? (
            <Deudas path={path} go={go} />
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
