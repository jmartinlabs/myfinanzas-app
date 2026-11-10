import type { Page } from "@playwright/test";

/**
 * UI DEV-07 · I1 — medidores diagnósticos (solo test).
 *
 * No son aserciones: devuelven datos para la línea base. I2/I4 decidirán qué
 * mínimos se convierten en aserciones duras. Sin dependencias nuevas.
 */

export const DEV07_THEMES = ["light-s", "dark-s", "hybrid-s"] as const;
export type Dev07Theme = (typeof DEV07_THEMES)[number];

export type Dev07Viewport = {
  id: "1440" | "720" | "390";
  width: number;
  height: number;
  note?: string;
};

export const DEV07_VIEWPORTS: readonly Dev07Viewport[] = [
  { id: "1440", width: 1440, height: 1000 },
  {
    id: "720",
    width: 720,
    height: 500,
    note: "equivalencia de viewport a 200 % sobre 1440×1000",
  },
  { id: "390", width: 390, height: 844 },
];

export type ContrastFinding = {
  selector: string;
  text: string;
  fontSize: number;
  fontWeight: number;
  large: boolean;
  ratio: number;
  required: number;
  reason?: string;
};

export type ContrastReport = {
  checked: number;
  min: number | null;
  minNormal: number | null;
  minLarge: number | null;
  minEntry: ContrastFinding | null;
  failures: ContrastFinding[];
  unresolved: ContrastFinding[];
  lowest: ContrastFinding[];
};

/**
 * Contraste de componentes no textuales: límite de los campos de formulario
 * y glifos de estado `aria-hidden` que el medidor de texto excluye.
 *
 * Solo se miden los controles cuyo límite depende del borde (`input`,
 * `select`, `textarea`): los botones, enlaces y el switch se identifican por
 * su texto visible y ya quedan cubiertos por contraste de texto/foco. El
 * borde se compara contra el fondo exterior y el relleno interior y se exige
 * el menor de ambos ratios.
 */
export type ComponentContrastFinding = {
  selector: string;
  kind: "control-border" | "status-icon";
  detail: string;
  ratio: number | null;
  required: 3;
  reason?: string;
};

export type ComponentContrastReport = {
  checked: number;
  controlBorders: number;
  statusIcons: number;
  min: number | null;
  minControlBorder: number | null;
  minStatusIcon: number | null;
  minEntry: ComponentContrastFinding | null;
  failures: ComponentContrastFinding[];
};

export type SmallTextFinding = {
  selector: string;
  text: string;
  fontSize: number;
  tag: string;
  classification: "functional" | "decorative";
  insideInteractive: boolean;
  scope: "main" | "shell";
};

export type TargetFinding = {
  selector: string;
  text: string;
  tag: string;
  width: number;
  height: number;
  inlineProse: boolean;
  scope: "main" | "shell";
};

export type OverflowReport = {
  pageOverflow: boolean;
  scrollWidth: number;
  innerWidth: number;
  offenders: { selector: string; right: number; left: number }[];
};

export type KeyboardStop = {
  selector: string;
  tag: string;
  text: string;
  outlineStyle: string;
  outlineWidth: number;
  outlineColor: string;
  boxShadow: string;
  ringVisible: boolean;
  ringRatio: number | null;
  focus: boolean;
  focusVisible: boolean;
  inputType: string | null;
  /**
   * Chromium dirige el foco al segmento interno del control nativo
   * `input[type=date]`: `document.activeElement` sigue siendo el input, pero
   * ni `:focus` ni `:focus-visible` coinciden y el anillo del host no se
   * aplica. No es corregible desde CSS del documento; I4 lo aísla como
   * excepción explícita y verifica aparte que el host sí dibuja anillo al
   * enfocarse de forma normal.
   */
  nativeDateShadowFocus: boolean;
};

export type KeyboardReport = {
  stops: KeyboardStop[];
  stopCount: number;
  missingVisibleFocus: KeyboardStop[];
  lowRingContrast: KeyboardStop[];
  returnedToStart: boolean;
  trapped: boolean;
};

export type MotionReport = {
  reduceMatches: boolean;
  checked: number;
  transitions: { selector: string; transitionDuration: string }[];
  animations: { selector: string; animationName: string }[];
};

export type FocusRingReport = {
  selector: string;
  matched: boolean;
  reason?: string;
  outlineStyle: string;
  outlineWidth: number;
  outlineColor: string;
  ratio: number | null;
  visible: boolean;
};

export type ScreenViewportAudit = {
  theme: Dev07Theme;
  viewport: string;
  contrast: ContrastReport;
  components: ComponentContrastReport;
  smallText: SmallTextFinding[];
  targets: TargetFinding[];
  overflow: OverflowReport;
  overflowExpanded?: OverflowReport;
};

/** Contraste computado de texto visible, con composición de alfa. */
export async function measureContrast(
  page: Page,
  rootSelector = "#main",
): Promise<ContrastReport> {
  const result = await page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector) ?? document.body;
    const parse = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1]
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number);
      if (parts.length < 3) return null;
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 ? parts[3] : 1,
      };
    };
    const over = (
      top: { r: number; g: number; b: number; a: number },
      bottom: { r: number; g: number; b: number; a: number },
    ) => {
      const a = top.a + bottom.a * (1 - top.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
        a,
      };
    };
    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const luminance = (color: { r: number; g: number; b: number }) =>
      0.2126 * channel(color.r) +
      0.7152 * channel(color.g) +
      0.0722 * channel(color.b);
    const ratio = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) => {
      const l1 = luminance(a);
      const l2 = luminance(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const visible = (el: Element) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      let node: HTMLElement | null = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0
        )
          return false;
        node = node.parentElement;
      }
      return true;
    };
    const selectorOf = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? "#" + el.id : "";
      const cls = Array.from(el.classList)
        .slice(0, 3)
        .map((c) => "." + c)
        .join("");
      return tag + id + cls;
    };
    const backgroundOf = (el: HTMLElement) => {
      const chain: HTMLElement[] = [];
      let node: HTMLElement | null = el;
      while (node) {
        chain.push(node);
        node = node.parentElement;
      }
      let base = { r: 255, g: 255, b: 255, a: 1 };
      let unresolved = "";
      for (const ancestor of chain.reverse()) {
        const style = getComputedStyle(ancestor);
        if (
          style.backgroundImage &&
          style.backgroundImage !== "none" &&
          !style.backgroundImage.startsWith("url(\"data:image")
        )
          unresolved = "background-image";
        const parsed = parse(style.backgroundColor);
        if (parsed && parsed.a > 0) base = over(parsed, base);
      }
      return { color: base, unresolved };
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const entries: {
      selector: string;
      text: string;
      fontSize: number;
      fontWeight: number;
      large: boolean;
      ratio: number;
      required: number;
      unresolved?: string;
    }[] = [];
    let node = walker.nextNode();
    while (node) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      const parent = node.parentElement;
      node = walker.nextNode();
      if (!text || !parent) continue;
      if (parent.closest("script,style,noscript,template,svg")) continue;
      if (parent.closest('[aria-hidden="true"],[hidden],.sr-only')) continue;
      if (
        parent.closest(
          "button:disabled,input:disabled,select:disabled,textarea:disabled",
        )
      )
        continue;
      if (!visible(parent)) continue;
      const style = getComputedStyle(parent);
      const fontSize = Number.parseFloat(style.fontSize);
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const required = large ? 3 : 4.5;
      const background = backgroundOf(parent);
      const foreground = parse(style.color);
      if (!foreground) continue;
      const textColor =
        foreground.a < 1 ? over(foreground, background.color) : foreground;
      entries.push({
        selector: selectorOf(parent),
        text: text.slice(0, 90),
        fontSize,
        fontWeight,
        large,
        ratio: Math.round(ratio(textColor, background.color) * 100) / 100,
        required,
        unresolved: background.unresolved || undefined,
      });
    }
    const resolved = entries.filter((entry) => !entry.unresolved);
    const sorted = [...resolved].sort((a, b) => a.ratio - b.ratio);
    const normal = sorted.filter((entry) => !entry.large);
    const large = sorted.filter((entry) => entry.large);
    return {
      checked: entries.length,
      min: sorted.length > 0 ? sorted[0].ratio : null,
      minNormal: normal.length > 0 ? normal[0].ratio : null,
      minLarge: large.length > 0 ? large[0].ratio : null,
      minEntry: sorted[0] ?? null,
      failures: resolved.filter((entry) => entry.ratio < entry.required),
      unresolved: entries.filter((entry) => entry.unresolved),
      lowest: sorted.slice(0, 8),
    };
  }, rootSelector);
  return result;
}

/**
 * Contraste computado de bordes de campo y glifos de estado.
 *
 * Excluye texto (lo cubre `measureContrast`), controles deshabilitados y
 * elementos ocultos. Un borde transparente o inexistente no se ignora: se
 * registra como fallo explícito porque el límite del campo no sería visible.
 */
export async function measureComponentContrast(
  page: Page,
  rootSelector = "#main",
): Promise<ComponentContrastReport> {
  return page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector) ?? document.body;
    const parse = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1]
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number);
      if (parts.length < 3) return null;
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 ? parts[3] : 1,
      };
    };
    const over = (
      top: { r: number; g: number; b: number; a: number },
      bottom: { r: number; g: number; b: number; a: number },
    ) => {
      const a = top.a + bottom.a * (1 - top.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
        a,
      };
    };
    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const luminance = (color: { r: number; g: number; b: number }) =>
      0.2126 * channel(color.r) +
      0.7152 * channel(color.g) +
      0.0722 * channel(color.b);
    const contrast = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) => {
      const l1 = luminance(a);
      const l2 = luminance(b);
      return Math.round(
        ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100,
      ) / 100;
    };
    const visible = (el: Element) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      let node: HTMLElement | null = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0
        )
          return false;
        node = node.parentElement;
      }
      return true;
    };
    const selectorOf = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? "#" + el.id : "";
      const cls = Array.from(el.classList)
        .slice(0, 3)
        .map((c) => "." + c)
        .join("");
      return tag + id + cls;
    };
    const background = (el: HTMLElement, includeSelf: boolean) => {
      const chain: HTMLElement[] = [];
      let node: HTMLElement | null = includeSelf ? el : el.parentElement;
      while (node) {
        chain.push(node);
        node = node.parentElement;
      }
      let base = { r: 255, g: 255, b: 255, a: 1 };
      for (const ancestor of chain.reverse()) {
        const parsed = parse(getComputedStyle(ancestor).backgroundColor);
        if (parsed && parsed.a > 0) base = over(parsed, base);
      }
      return base;
    };

    const findings: {
      selector: string;
      kind: "control-border" | "status-icon";
      detail: string;
      ratio: number | null;
      required: 3;
      reason?: string;
    }[] = [];

    const controls = Array.from(
      root.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea',
      ),
    );
    for (const control of controls) {
      if (!visible(control)) continue;
      if (control.closest('.sr-only,[hidden],[aria-hidden="true"]')) continue;
      if (
        control.closest(
          "button:disabled,input:disabled,select:disabled,textarea:disabled",
        )
      )
        continue;
      const style = getComputedStyle(control);
      const width = Number.parseFloat(style.borderTopWidth);
      if (style.borderTopStyle === "none" || width === 0) {
        findings.push({
          selector: selectorOf(control),
          kind: "control-border",
          detail: "sin borde visible",
          ratio: null,
          required: 3,
          reason: "no-visible-border",
        });
        continue;
      }
      const border = parse(style.borderTopColor);
      if (!border || border.a === 0) {
        findings.push({
          selector: selectorOf(control),
          kind: "control-border",
          detail: "borde transparente",
          ratio: null,
          required: 3,
          reason: "transparent-border",
        });
        continue;
      }
      const outside = background(control, false);
      const inside = background(control, true);
      const outsideRatio = contrast(
        border.a < 1 ? over(border, outside) : border,
        outside,
      );
      const insideRatio = contrast(
        border.a < 1 ? over(border, inside) : border,
        inside,
      );
      const ratio = Math.min(outsideRatio, insideRatio);
      findings.push({
        selector: selectorOf(control),
        kind: "control-border",
        detail: `${style.borderTopColor} vs fondo ${outsideRatio}/${insideRatio}`,
        ratio,
        required: 3,
      });
    }

    const icons = Array.from(
      root.querySelectorAll<HTMLElement>(
        ".ui-badge-icon, .ui-amount-icon, .ui-empty-icon, .empty-symbol",
      ),
    );
    for (const icon of icons) {
      if (!visible(icon)) continue;
      // El propio glifo es `aria-hidden` (decorativo); se ignora solo si lo
      // oculta un ancestro, no su propia semántica.
      if (
        icon.closest("[hidden],.sr-only") ||
        icon.parentElement?.closest('[hidden],.sr-only,[aria-hidden="true"]')
      )
        continue;
      const color = parse(getComputedStyle(icon).color);
      if (!color || color.a === 0) {
        findings.push({
          selector: selectorOf(icon),
          kind: "status-icon",
          detail: "color transparente",
          ratio: null,
          required: 3,
          reason: "transparent-icon",
        });
        continue;
      }
      const backdrop = background(icon, true);
      findings.push({
        selector: selectorOf(icon),
        kind: "status-icon",
        detail: getComputedStyle(icon).color,
        ratio: contrast(
          color.a < 1 ? over(color, backdrop) : color,
          backdrop,
        ),
        required: 3,
      });
    }

    const measured = findings.filter((entry) => entry.ratio !== null);
    const sorted = [...measured].sort((a, b) => a.ratio! - b.ratio!);
    const byKind = (kind: "control-border" | "status-icon") =>
      sorted.find((entry) => entry.kind === kind)?.ratio ?? null;
    return {
      checked: findings.length,
      controlBorders: findings.filter(
        (entry) => entry.kind === "control-border",
      ).length,
      statusIcons: findings.filter((entry) => entry.kind === "status-icon")
        .length,
      min: sorted.length > 0 ? sorted[0].ratio : null,
      minControlBorder: byKind("control-border"),
      minStatusIcon: byKind("status-icon"),
      minEntry: sorted[0] ?? null,
      failures: findings.filter(
        (entry) => entry.ratio === null || entry.ratio < entry.required,
      ),
    };
  }, rootSelector);
}

/** Texto renderizado < 12 px con una clasificación heurística. */
export async function measureSmallText(
  page: Page,
  rootSelector = "#main",
): Promise<SmallTextFinding[]> {
  return page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector) ?? document.body;
    const visible = (el: Element) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      let node: HTMLElement | null = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0
        )
          return false;
        node = node.parentElement;
      }
      return true;
    };
    const selectorOf = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      const cls = Array.from(el.classList)
        .slice(0, 3)
        .map((c) => "." + c)
        .join("");
      return tag + cls;
    };
    const findings: {
      selector: string;
      text: string;
      fontSize: number;
      tag: string;
      classification: "functional" | "decorative";
      insideInteractive: boolean;
      scope: "main" | "shell";
    }[] = [];
    for (const element of Array.from(root.querySelectorAll("*"))) {
      if (!visible(element)) continue;
      if (element.closest('.sr-only,[hidden],[aria-hidden="true"]')) continue;
      const direct = Array.from(element.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => (child.textContent ?? "").replace(/\s+/g, " ").trim())
        .join(" ")
        .trim();
      if (!direct) continue;
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      if (fontSize >= 12) continue;
      const ariaHidden = Boolean(element.closest('[aria-hidden="true"]'));
      const letters = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(direct);
      const decorative =
        ariaHidden ||
        !letters ||
        Boolean(element.closest(".brand, .auth-brand")) ||
        /(?:^|\.)(?:nav-icon|nav-chevron|empty-symbol|local-dot)$/.test(
          Array.from(element.classList).join("."),
        );
      findings.push({
        selector: selectorOf(element),
        text: direct.slice(0, 90),
        fontSize,
        tag: element.tagName.toLowerCase(),
        classification: decorative ? "decorative" : "functional",
        insideInteractive: Boolean(
          element.closest(
            'a,button,input,select,textarea,summary,[role="button"],[role="switch"]',
          ),
        ),
        scope: element.closest("#main") ? "main" : "shell",
      });
    }
    return findings;
  }, rootSelector);
}

/** Objetivos interactivos por debajo de 44×44 px. */
export async function measureTargets(page: Page): Promise<TargetFinding[]> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      let node: HTMLElement | null = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0
        )
          return false;
        node = node.parentElement;
      }
      return true;
    };
    const selectorOf = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? "#" + el.id : "";
      const cls = Array.from(el.classList)
        .slice(0, 3)
        .map((c) => "." + c)
        .join("");
      return tag + id + cls;
    };
    const findings: {
      selector: string;
      text: string;
      tag: string;
      width: number;
      height: number;
      inlineProse: boolean;
      scope: "main" | "shell";
    }[] = [];
    const candidates = Array.from(
      document.querySelectorAll(
        'a[href],button,input:not([type="hidden"]),select,textarea,summary,[role="button"],[role="switch"],[role="link"],[role="tab"]',
      ),
    );
    for (const element of candidates) {
      if (!visible(element)) continue;
      if (element.closest('.sr-only,[hidden],[aria-hidden="true"]')) continue;
      if (
        element.closest(
          "button:disabled,input:disabled,select:disabled,textarea:disabled",
        )
      )
        continue;
      let rect = element.getBoundingClientRect();
      const input = element as HTMLInputElement;
      if (
        element.tagName === "INPUT" &&
        (input.type === "checkbox" || input.type === "radio")
      ) {
        const label = input.labels?.[0];
        if (label) rect = label.getBoundingClientRect();
      }
      if (rect.width >= 44 && rect.height >= 44) continue;
      const style = getComputedStyle(element);
      findings.push({
        selector: selectorOf(element),
        text: (element.textContent ?? element.getAttribute("aria-label") ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60),
        tag: element.tagName.toLowerCase(),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        inlineProse:
          style.display.startsWith("inline") &&
          Boolean(element.closest("p,li,dd,dt,small,summary,td,th")),
        scope: element.closest("#main") ? "main" : "shell",
      });
    }
    return findings;
  });
}

/** Overflow horizontal de página y elementos que sobresalen. */
export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    const innerWidth = window.innerWidth;
    const offenders: { selector: string; right: number; left: number }[] = [];
    if (scrollWidth > innerWidth + 1) {
      for (const element of Array.from(document.querySelectorAll("body *"))) {
        if (!(element instanceof HTMLElement)) continue;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right <= innerWidth + 1 && rect.left >= -1) continue;
        offenders.push({
          selector:
            element.tagName.toLowerCase() +
            (element.id ? "#" + element.id : "") +
            Array.from(element.classList)
              .slice(0, 2)
              .map((c) => "." + c)
              .join(""),
          right: Math.round(rect.right),
          left: Math.round(rect.left),
        });
        if (offenders.length >= 12) break;
      }
    }
    return {
      pageOverflow: scrollWidth > innerWidth + 1,
      scrollWidth,
      innerWidth,
      offenders,
    };
  });
}

/** Recorrido completo con Tab y comprobación del anillo de foco. */
export async function auditKeyboard(
  page: Page,
  max = 90,
): Promise<KeyboardReport> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    // El h1 recibe foco programático tras navegar; sin este ancla, Tab
    // continúa desde ahí y se pierde el inicio del documento.
    document.body.tabIndex = -1;
    document.body.focus();
    window.scrollTo(0, 0);
  });
  const stops: KeyboardStop[] = [];
  let returnedToStart = false;
  let trapped = false;
  let first = "";
  for (let index = 0; index < max; index += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const parse = (value: string) => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const parts = match[1]
          .split(/[,\s/]+/)
          .filter(Boolean)
          .map(Number);
        if (parts.length < 3) return null;
        return {
          r: parts[0],
          g: parts[1],
          b: parts[2],
          a: parts.length > 3 ? parts[3] : 1,
        };
      };
      const over = (
        top: { r: number; g: number; b: number; a: number },
        bottom: { r: number; g: number; b: number; a: number },
      ) => {
        const a = top.a + bottom.a * (1 - top.a);
        if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
        return {
          r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
          g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
          b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
          a,
        };
      };
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const luminance = (color: { r: number; g: number; b: number }) =>
        0.2126 * channel(color.r) +
        0.7152 * channel(color.g) +
        0.0722 * channel(color.b);
      const contrast = (
        a: { r: number; g: number; b: number },
        b: { r: number; g: number; b: number },
      ) => {
        const l1 = luminance(a);
        const l2 = luminance(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      const backdrop = (el: HTMLElement) => {
        const chain: HTMLElement[] = [];
        // El outline se dibuja fuera del elemento: el fondo adyacente es el
        // del padre, no el relleno propio del control.
        let node: HTMLElement | null = el.parentElement ?? el;
        while (node) {
          chain.push(node);
          node = node.parentElement;
        }
        let base = { r: 255, g: 255, b: 255, a: 1 };
        for (const ancestor of chain.reverse()) {
          const parsed = parse(getComputedStyle(ancestor).backgroundColor);
          if (parsed && parsed.a > 0) base = over(parsed, base);
        }
        return base;
      };
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || el === document.body)
        return { done: true } as const;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0)
        return { done: false, hidden: true } as const;
      const style = getComputedStyle(el);
      const selector =
        el.tagName.toLowerCase() +
        (el.id ? "#" + el.id : "") +
        Array.from(el.classList)
          .slice(0, 3)
          .map((c) => "." + c)
          .join("");
      const source =
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
          ? style.outlineColor
          : style.boxShadow !== "none"
            ? style.boxShadow
            : "";
      const colorValue = source.match(/rgba?\([^)]+\)/)?.[0];
      let ringRatio: number | null = null;
      if (colorValue) {
        const parsed = parse(colorValue);
        if (parsed) {
          const base = backdrop(el);
          const ring = parsed.a < 1 ? over(parsed, base) : parsed;
          ringRatio = Math.round(contrast(ring, base) * 100) / 100;
        }
      }
      return {
        done: false,
        hidden: false,
        selector,
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? el.getAttribute("aria-label") ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60),
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
        ringVisible:
          (style.outlineStyle !== "none" &&
            parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== "none",
        ringRatio,
        focus: el.matches(":focus"),
        focusVisible: el.matches(":focus-visible"),
        inputType: el instanceof HTMLInputElement ? el.type : null,
        nativeDateShadowFocus:
          el instanceof HTMLInputElement &&
          el.type === "date" &&
          !el.matches(":focus"),
      } as const;
    });
    if ("done" in stop && stop.done) break;
    if ("done" in stop && stop.hidden) continue;
    if (!("selector" in stop)) break;
    if (!first) first = stop.selector + "|" + stop.text;
    else if (stop.selector + "|" + stop.text === first) {
      returnedToStart = true;
      break;
    }
    stops.push({
      selector: stop.selector,
      tag: stop.tag,
      text: stop.text,
      outlineStyle: stop.outlineStyle,
      outlineWidth: stop.outlineWidth,
      outlineColor: stop.outlineColor,
      boxShadow: stop.boxShadow,
      ringVisible: stop.ringVisible,
      ringRatio: stop.ringRatio,
      focus: stop.focus,
      focusVisible: stop.focusVisible,
      inputType: stop.inputType,
      nativeDateShadowFocus: stop.nativeDateShadowFocus,
    });
  }
  if (stops.length >= max) trapped = true;
  return {
    stops,
    stopCount: stops.length,
    missingVisibleFocus: stops.filter((stop) => !stop.ringVisible),
    lowRingContrast: stops.filter(
      (stop) => stop.ringRatio !== null && stop.ringRatio < 3,
    ),
    returnedToStart,
    trapped,
  };
}

/** Muestra el anillo de foco de selectores concretos en el tema actual. */
export async function sampleFocusRing(
  page: Page,
  selectors: string[],
): Promise<FocusRingReport[]> {
  const report: FocusRingReport[] = [];
  for (const selector of selectors) {
    const matches = page.locator(selector);
    const total = await matches.count();
    let locator = null as ReturnType<typeof page.locator> | null;
    for (let index = 0; index < total; index += 1) {
      const candidate = matches.nth(index);
      if (await candidate.isVisible()) {
        locator = candidate;
        break;
      }
    }
    if (!locator) {
      report.push({
        selector,
        matched: false,
        reason: total === 0 ? "absent" : "hidden",
        outlineStyle: "",
        outlineWidth: 0,
        outlineColor: "",
        ratio: null,
        visible: false,
      });
      continue;
    }
    await page.keyboard.press("Tab");
    await locator.focus();
    const matched = await locator.evaluate(
      (element) => document.activeElement === element,
    );
    if (!matched) {
      report.push({
        selector,
        matched: false,
        reason: "not-focused",
        outlineStyle: "",
        outlineWidth: 0,
        outlineColor: "",
        ratio: null,
        visible: false,
      });
      continue;
    }
    const item = await page.evaluate(() => {
      const parse = (value: string) => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const parts = match[1]
          .split(/[,\s/]+/)
          .filter(Boolean)
          .map(Number);
        if (parts.length < 3) return null;
        return {
          r: parts[0],
          g: parts[1],
          b: parts[2],
          a: parts.length > 3 ? parts[3] : 1,
        };
      };
      const over = (
        top: { r: number; g: number; b: number; a: number },
        bottom: { r: number; g: number; b: number; a: number },
      ) => {
        const a = top.a + bottom.a * (1 - top.a);
        if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
        return {
          r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
          g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
          b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
          a,
        };
      };
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const luminance = (color: { r: number; g: number; b: number }) =>
        0.2126 * channel(color.r) +
        0.7152 * channel(color.g) +
        0.0722 * channel(color.b);
      const contrast = (
        a: { r: number; g: number; b: number },
        b: { r: number; g: number; b: number },
      ) => {
        const l1 = luminance(a);
        const l2 = luminance(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      const backdrop = (el: HTMLElement) => {
        const chain: HTMLElement[] = [];
        // El outline se dibuja fuera del elemento: el fondo adyacente es el
        // del padre, no el relleno propio del control.
        let node: HTMLElement | null = el.parentElement ?? el;
        while (node) {
          chain.push(node);
          node = node.parentElement;
        }
        let base = { r: 255, g: 255, b: 255, a: 1 };
        for (const ancestor of chain.reverse()) {
          const parsed = parse(getComputedStyle(ancestor).backgroundColor);
          if (parsed && parsed.a > 0) base = over(parsed, base);
        }
        return base;
      };
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      const style = getComputedStyle(el);
      const source =
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
          ? style.outlineColor
          : style.boxShadow !== "none"
            ? style.boxShadow
            : "";
      const colorValue = source.match(/rgba?\([^)]+\)/)?.[0];
      let ratio: number | null = null;
      if (colorValue) {
        const parsed = parse(colorValue);
        if (parsed) {
          const base = backdrop(el);
          const ring = parsed.a < 1 ? over(parsed, base) : parsed;
          ratio = Math.round(contrast(ring, base) * 100) / 100;
        }
      }
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
        outlineColor: style.outlineColor,
        ratio,
        visible:
          style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      };
    });
    if (!item) continue;
    report.push({ selector, matched: true, ...item });
  }
  return report;
}

/** Comprueba transiciones/animaciones con `prefers-reduced-motion: reduce`. */
export async function auditReducedMotion(
  page: Page,
  restore = true,
): Promise<MotionReport> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  const report = await page.evaluate(() => {
    const transitions: { selector: string; transitionDuration: string }[] = [];
    const animations: { selector: string; animationName: string }[] = [];
    const nodes = Array.from(
      document.querySelectorAll(
        "button,a,select,input,textarea,summary,.panel,.card,.nav-link,.menu-toggle",
      ),
    );
    for (const element of nodes) {
      if (!(element instanceof HTMLElement)) continue;
      const style = getComputedStyle(element);
      const duration = style.transitionDuration;
      const active = duration
        .split(",")
        .map((value) => Number.parseFloat(value) || 0)
        .some((value) => value > 0);
      if (active)
        transitions.push({
          selector:
            element.tagName.toLowerCase() +
            Array.from(element.classList)
              .slice(0, 2)
              .map((c) => "." + c)
              .join(""),
          transitionDuration: duration,
        });
      if (style.animationName && style.animationName !== "none")
        animations.push({
          selector:
            element.tagName.toLowerCase() +
            Array.from(element.classList)
              .slice(0, 2)
              .map((c) => "." + c)
              .join(""),
          animationName: style.animationName,
        });
    }
    return {
      reduceMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
      checked: nodes.length,
      transitions,
      animations,
    };
  });
  if (restore) await page.emulateMedia({ reducedMotion: "no-preference" });
  return report;
}

export async function setTheme(page: Page, theme: Dev07Theme): Promise<void> {
  await page.getByLabel("Apariencia").selectOption(theme);
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.theme === expected,
    theme,
  );
}

/** Auditoría de viewport para el estado actual de la pantalla. */
export async function setDetailsOpen(page: Page, open: boolean): Promise<void> {
  await page.evaluate((open) => {
    for (const node of Array.from(
      document.querySelectorAll<HTMLDetailsElement>("#main details"),
    ))
      node.open = open;
  }, open);
}

export async function auditViewport(
  page: Page,
  theme: Dev07Theme,
  viewport: string,
  rootSelector = "#main",
  options: { expandDetails?: boolean; defaultOverflow?: OverflowReport } = {},
): Promise<ScreenViewportAudit> {
  if (options.expandDetails) await setDetailsOpen(page, true);
  const [contrast, components, smallText, targets, overflow] =
    await Promise.all([
      measureContrast(page, rootSelector),
      measureComponentContrast(page, rootSelector),
      measureSmallText(page, rootSelector),
      measureTargets(page),
      measureOverflow(page),
    ]);
  return {
    theme,
    viewport,
    contrast,
    components,
    smallText,
    targets,
    overflow: options.defaultOverflow ?? overflow,
    overflowExpanded: options.expandDetails ? overflow : undefined,
  };
}

export function summarise(audit: ScreenViewportAudit) {
  const count = (
    scope: "main" | "shell",
    classification: "functional" | "decorative",
  ) =>
    audit.smallText.filter(
      (item) =>
        item.scope === scope && item.classification === classification,
    ).length;
  const inlineTargets = audit.targets.filter((item) => item.inlineProse);
  const nonInline = audit.targets.filter((item) => !item.inlineProse);
  return {
    theme: audit.theme,
    viewport: audit.viewport,
    contrastMin: audit.contrast.min,
    contrastMinNormal: audit.contrast.minNormal,
    contrastMinLarge: audit.contrast.minLarge,
    contrastChecked: audit.contrast.checked,
    contrastFailures: audit.contrast.failures.length,
    unresolved: audit.contrast.unresolved.length,
    componentChecked: audit.components.checked,
    componentBorders: audit.components.controlBorders,
    componentIcons: audit.components.statusIcons,
    componentMin: audit.components.min,
    componentMinBorder: audit.components.minControlBorder,
    componentMinIcon: audit.components.minStatusIcon,
    componentFailures: audit.components.failures.length,
    smallMainFunctional: count("main", "functional"),
    smallMainDecorative: count("main", "decorative"),
    smallShellFunctional: count("shell", "functional"),
    smallShellDecorative: count("shell", "decorative"),
    targetsMainUnder44: nonInline.filter((item) => item.scope === "main")
      .length,
    targetsShellUnder44: nonInline.filter((item) => item.scope === "shell")
      .length,
    inlineTargets: inlineTargets.length,
    overflow: audit.overflow.pageOverflow,
  };
}
