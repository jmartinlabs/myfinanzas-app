import { initializeProduction } from "./production-state";
try {
  if (process.argv.length !== 2) throw new Error("No se aceptan argumentos; usa configuración de rutas explícita.");
  initializeProduction();
  console.log("Estado productivo privado inicializado sin fixtures ni usuario.");
} catch {
  console.error("Inicialización rechazada: comprueba entorno, rutas, destino nuevo y permisos privados.");
  process.exitCode = 1;
}
