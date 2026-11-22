const amountFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  maximumFractionDigits: 2,
});

const plainAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/**
 * Canonical money display: "1,250,000 MMK". Use this for every amount
 * shown to the user (cards, tables, tooltips). Do not use the Intl
 * currency style ("MMK 1,250,000.00") — it prefixes the unit and forces
 * decimals.
 */
export function formatMoney(value: string | number) {
  return `${amountFormatter.format(Number(value))} MMK`;
}

export function formatMoneySuffix(value: string | number) {
  return formatMoney(value);
}

/**
 * Grouped number without a unit ("1,250,000"). Only a building block for
 * callers that add their own sign or unit — display code should prefer
 * formatMoney.
 */
export function formatAmount(value: string | number) {
  return amountFormatter.format(Number(value));
}

/**
 * Compact money for chart axis ticks: "1.25M", "25K", or the grouped
 * number below 1,000. The chart labels the axis as MMK, so no unit here.
 */
export function formatCompactAmount(value: string | number) {
  const numeric = Number(value);
  const sign = numeric < 0 ? "-" : "";
  const absolute = Math.abs(numeric);
  if (absolute >= 1_000_000) {
    return `${sign}${trimTrailingZeros(absolute / 1_000_000)}M`;
  }
  if (absolute >= 1_000) {
    return `${sign}${trimTrailingZeros(absolute / 1_000)}K`;
  }
  return amountFormatter.format(numeric);
}

function trimTrailingZeros(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function formatPlainAmount(value: string | number) {
  return plainAmountFormatter.format(Number(value));
}

export function formatDate(value: string) {
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatNumericDate(value: string) {
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
