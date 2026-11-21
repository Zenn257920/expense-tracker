const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MMK",
  maximumFractionDigits: 2,
});

const amountFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  maximumFractionDigits: 2,
});

const plainAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function formatMoney(value: string | number) {
  return moneyFormatter.format(Number(value));
}

export function formatMoneySuffix(value: string | number) {
  return `${plainAmountFormatter.format(Number(value))} MMK`;
}

export function formatAmount(value: string | number) {
  return amountFormatter.format(Number(value));
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
