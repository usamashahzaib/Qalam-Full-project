/*
  Sorting applied at the point a listing is defined, rather than by hand-ordering
  the literal. Keeps service and tool listings A-Z even when someone appends a new
  entry to the bottom of the array without thinking about placement.

  Uses localeCompare with an explicit "en" locale so ordering does not shift with
  the server's default locale.
*/
export const alphabetical = <T,>(items: readonly T[], key: (item: T) => string): T[] =>
  [...items].sort((a, b) => key(a).localeCompare(key(b), "en"))
