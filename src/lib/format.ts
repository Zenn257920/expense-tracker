const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MMK",
  maximumFractionDigits: 2,
});

const amountFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  maximumFractionDigits: 2,
});

export function formatMoney(value: string | number) {
  return moneyFormatter.format(Number(value));
}

export function formatAmount(value: string | number) {
  return amountFormatter.format(Number(value));
}

export function formatDate(value: string) {
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
