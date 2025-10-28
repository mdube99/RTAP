const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(
  value: Date | string,
  options: { includeYear?: boolean } = {},
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const day = date.getUTCDate();
  const month = MONTH_NAMES[date.getUTCMonth()];
  return options.includeYear
    ? `${day} ${month} ${date.getUTCFullYear()} UTC`
    : `${day} ${month} UTC`;
}

export function formatMonthYear(value: Date | string): string {
  const date =
    typeof value === "string"
      ? new Date(value.length === 7 ? `${value}-01` : value)
      : value;
  const month = MONTH_NAMES[date.getUTCMonth()];
  return `${month} ${date.getUTCFullYear()} UTC`;
}

export function formatDateTime(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds} UTC`;
}
