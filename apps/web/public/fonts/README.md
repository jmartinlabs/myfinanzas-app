# Fuentes locales · Casa de cuentas

Archivos WOFF2 usados solo por la apariencia `casa`:

- **Newsreader** (500, 600) — serif editorial para títulos y cifras destacadas.
- **IBM Plex Sans** (400, 500, 600) — interfaz.
- **IBM Plex Mono** (400, 500) — etiquetas, IDs e importes tabulares.

Las tres familias se distribuyen bajo la **SIL Open Font License 1.1**:

- https://openfontlicense.org/open-font-license-official-text/
- Newsreader: https://fonts.google.com/specimen/Newsreader
- IBM Plex: https://fonts.google.com/specimen/IBM+Plex+Sans

Los archivos se sirven desde `apps/web/public/fonts/` y se declaran en
`apps/web/src/casa.css` con `font-display: swap`. No se cargan en las otras
apariencias.
