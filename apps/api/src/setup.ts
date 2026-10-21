import {
  writeFileSync,
  openSync,
  closeSync,
  fsyncSync,
  unlinkSync,
} from "node:fs";
import { dirname } from "node:path";
import { productionConfig, privateDirectory, syncPath } from "./private-state";
import { openDatabase } from "./database";
import { provision, loadKey } from "./auth";
import { resolve } from "node:path";
const path =
  process.env.DATABASE_PATH ??
  resolve(import.meta.dir, "../../../.local/demo.sqlite");
try {
  const db = openDatabase(path);
  try {
    loadKey(
      db,
      process.env.AUTH_KEY_PATH ??
        resolve(import.meta.dir, "../../../.local/auth.key"),
    );
    if (process.env.NODE_ENV === "production") {
      const config = productionConfig();
      const output = process.argv[2];
      if (
        !output ||
        output !== resolve(output) ||
        dirname(output) !== config.state ||
        output === config.database ||
        output === config.key
      )
        throw new Error(
          "Archivo de entrega nuevo dentro del estado privado requerido.",
        );
      privateDirectory(config.state);
      const fd = openSync(output, "wx", 0o600);
      try {
        db.transaction(() => {
          const value = provision(db);
          writeFileSync(fd, value, { encoding: "utf8" });
          fsyncSync(fd);
          syncPath(config.state);
        }).immediate();
      } catch (e) {
        unlinkSync(output);
        throw e;
      } finally {
        closeSync(fd);
      }
      console.log(
        "Alta privada preparada; token disponible solo en el archivo de entrega durante 10 minutos.",
      );
    } else {
      const value = provision(db);
      process.stdout.write(
        `Token local de configuración (uso único, 10 minutos). No compartir ni registrar:\n${value}\nAbre la aplicación local y configura contraseña y autenticador.\n`,
      );
    }
  } finally {
    db.close();
  }
} catch (e) {
  console.error(
    process.env.NODE_ENV === "production"
      ? "Alta rechazada: comprueba estado, permisos y archivo de entrega nuevo."
      : (e as Error).message,
  );
  process.exitCode = 1;
}
