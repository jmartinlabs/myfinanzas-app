import qrcode from "qrcode-generator";

/**
 * Etiqueta accesible del QR de alta TOTP. Es genérica a propósito: nunca
 * describe, resume ni incluye el secreto ni el URI.
 */
export const TOTP_QR_LABEL =
  "Código QR para configurar la aplicación autenticadora";

/** Lado en píxeles de cada módulo del QR. */
const CELL = 4;
/** Zona de silencio mínima (4 módulos) necesaria para escanear. */
const QUIET_ZONE = 4;

/**
 * Genera un `<svg>` inline para el contenido indicado.
 *
 * `value` es el URI `otpauth://totp/...` de alta del segundo factor. El QR se
 * calcula íntegramente en el navegador con `qrcode-generator` (tipo automático,
 * corrección `M`): no se envía el secreto a ningún servicio, no se descargan
 * imágenes y el resultado no contiene `<image>`, `<script>`, URLs externas ni
 * atributos `style`, por lo que es compatible con una CSP estricta.
 *
 * El valor no se serializa en el marcado: solo determina los módulos pintados.
 */
export function qrSvg(value: string): string {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const modules = qr.getModuleCount();
  const size = (modules + QUIET_ZONE * 2) * CELL;
  const steps: string[] = [];
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (!qr.isDark(row, column)) continue;
      const x = (column + QUIET_ZONE) * CELL;
      const y = (row + QUIET_ZONE) * CELL;
      steps.push(`M${x} ${y}h${CELL}v${CELL}h-${CELL}z`);
    }
  }
  return [
    `<svg role="img" aria-label="${TOTP_QR_LABEL}" focusable="false"`,
    ` viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    // Única pareja de colores literales: negro sobre blanco es lo que exige la
    // lectura del QR y no se adapta a los temas.
    `<rect width="${size}" height="${size}" fill="#fff"/>`,
    `<path fill="#000" d="${steps.join("")}"/>`,
    "</svg>",
  ].join("");
}
