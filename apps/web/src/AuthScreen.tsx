import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "./api";
import { qrSvg } from "./qr";
import { Alert } from "./ui";
export function AuthScreen({ onReady }: { onReady: () => void }) {
  const [stage, setStage] = useState<
    "loading" | "login" | "enroll" | "mfa" | "recover" | "codes"
  >("loading");
  const [password, setPassword] = useState(""),
    [token, setToken] = useState(""),
    [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<{
      secret: string;
      uri: string;
    } | null>(null),
    [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  // Solo se calcula en el alta TOTP; al verificar o salir del alta el estado
  // `enrollment` se limpia y el QR desaparece del DOM.
  const qr = useMemo(
    () => (stage === "mfa" && enrollment ? qrSvg(enrollment.uri) : ""),
    [stage, enrollment],
  );
  const load = () => {
    setError("");
    setStage("loading");
    api("/auth/status")
      .then((d) => setStage(d.configured ? "login" : "enroll"))
      .catch((e) => {
        setError(e.message);
      });
  };
  useEffect(load, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (stage === "mfa") {
        const d = await api("/auth/mfa", "POST", { code });
        setCode("");
        setEnrollment(null);
        if (d.recoveryCodes?.length) {
          setCodes(d.recoveryCodes);
          setStage("codes");
        } else onReady();
      } else {
        const d = await api(
          "/auth/" +
            (stage === "enroll"
              ? "enroll"
              : stage === "recover"
                ? "recover"
                : "login"),
          "POST",
          {
            password,
            ...(stage === "enroll" ? { token } : {}),
            ...(stage === "recover" ? { code } : {}),
          },
        );
        setPassword("");
        setToken("");
        setCode("");
        setEnrollment(d.needsEnrollment ? d : null);
        setStage("mfa");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <div className="auth-brand">
        My<span>Finanzas</span>
        <small>GESTIÓN FINANCIERA PERSONAL</small>
      </div>
      <section className="auth-panel">
        <p className="eyebrow">ENTORNO TEST · DATOS FICTICIOS</p>
        <h1>
          {stage === "enroll"
            ? "Crea tu cuenta"
            : stage === "mfa"
              ? "Segundo factor"
              : stage === "codes"
                ? "Guarda tus códigos"
                : stage === "recover"
                  ? "Recuperar segundo factor"
                  : "Bienvenido a MyFinanzas"}
        </h1>
        {error && (
          <Alert retry={stage === "loading" ? load : undefined}>{error}</Alert>
        )}
        {stage === "loading" && !error && (
          <p role="status">Comprobando acceso…</p>
        )}
        {stage === "codes" ? (
          <>
            <p>
              Estos códigos se muestran una sola vez. Guárdalos en un lugar
              seguro fuera del repositorio. Cada recuperación requiere también
              tu contraseña.
            </p>
            <div className="recovery-codes">
              {codes.map((c) => (
                <code key={c}>{c}</code>
              ))}
            </div>
            <button
              className="primary"
              onClick={() => {
                setCodes([]);
                onReady();
              }}
            >
              He guardado los códigos · Continuar
            </button>
          </>
        ) : (
          stage !== "loading" && (
            <form onSubmit={submit}>
              {stage === "enroll" && (
                <>
                  <p>
                    Pide el código de activación al administrador de TEST.
                    Caduca en 10 minutos y puedes solicitar uno nuevo si
                    expira. Úsalo una sola vez para crear tu cuenta.
                  </p>
                  <label>
                    Código de activación
                    <input
                      required
                      autoComplete="off"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </label>
                </>
              )}
              {stage !== "mfa" && (
                <label>
                  Contraseña
                  <input
                    aria-label="Contraseña"
                    type="password"
                    required
                    minLength={stage === "enroll" ? 8 : undefined}
                    maxLength={128}
                    autoComplete={
                      stage === "enroll" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {stage === "enroll" && (
                    <small>
                      Entre 8 y 128 caracteres. Usa una frase que puedas
                      recordar.
                    </small>
                  )}
                </label>
              )}
              {stage === "mfa" && (
                <>
                  {enrollment && (
                    <div className="notice">
                      <strong>
                        Añade MyFinanzas a tu aplicación autenticadora
                      </strong>
                      <p>
                        Introduce esta clave como cuenta TOTP (6 dígitos, 30
                        segundos).
                      </p>
                      {qr && (
                        <div
                          className="totp-qr"
                          // Marcado generado localmente por qrSvg: sin datos del
                          // usuario interpolados ni recursos externos.
                          dangerouslySetInnerHTML={{ __html: qr }}
                        />
                      )}
                      <code className="secret">{enrollment.secret}</code>
                      <p>
                        <a href={enrollment.uri}>
                          Abrir aplicación autenticadora
                        </a>
                      </p>
                    </div>
                  )}
                  <label>
                    Código de la aplicación autenticadora
                    <input
                      required
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                </>
              )}
              {stage === "recover" && (
                <>
                  <p>
                    Necesitas tu contraseña y un código guardado. Se revocarán
                    las sesiones y los códigos anteriores, y configurarás un
                    nuevo TOTP.
                  </p>
                  <label>
                    Código de recuperación
                    <input
                      required
                      autoComplete="off"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                </>
              )}
              <button className="primary full" disabled={busy}>
                {busy
                  ? "Verificando…"
                  : stage === "mfa"
                    ? "Verificar código"
                    : stage === "recover"
                      ? "Recuperar acceso"
                      : "Continuar"}
              </button>
              {stage === "login" && (
                <button
                  className="text-button full"
                  type="button"
                  onClick={() => {
                    setStage("recover");
                    setError("");
                    setPassword("");
                  }}
                >
                  He perdido mi segundo factor
                </button>
              )}
              {(stage === "recover" || stage === "mfa") && (
                <button
                  className="text-button full"
                  type="button"
                  onClick={() => {
                    setStage("login");
                    setEnrollment(null);
                    setCode("");
                    setError("");
                  }}
                >
                  Volver al inicio de sesión
                </button>
              )}
            </form>
          )
        )}
      </section>
      <p className="auth-foot">
        Acceso privado · Sin registro público
      </p>
    </main>
  );
}
