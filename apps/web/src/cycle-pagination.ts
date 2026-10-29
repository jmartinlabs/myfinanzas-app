/** Pagination is shared by both Comida lists; a page exists while either has more. */
export function hasNextComidaPage(
  page: number,
  totals: { vigentes: number; historicas: number },
) {
  return page * 100 < Math.max(totals.vigentes, totals.historicas);
}
