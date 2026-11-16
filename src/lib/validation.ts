export function isValidDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
  );
}

export function isValidAmount(value: number) {
  const [coefficient, exponentValue] = value.toString().toLowerCase().split("e");
  const decimalPlaces = coefficient.split(".")[1]?.length ?? 0;
  const exponent = Number(exponentValue ?? 0);

  return (
    Number.isFinite(value) &&
    value > 0 &&
    value <= 9_999_999_999.99 &&
    Math.max(0, decimalPlaces - exponent) <= 2
  );
}
