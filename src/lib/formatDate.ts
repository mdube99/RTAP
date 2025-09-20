const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value: Date | string, options: { includeYear?: boolean } = {}): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  return options.includeYear ? `${day} ${month} ${date.getFullYear()}` : `${day} ${month}`;
}

export function formatMonthYear(value: Date | string): string {
  const date =
    typeof value === 'string'
      ? new Date(value.length === 7 ? `${value}-01` : value)
      : value;
  const month = MONTH_NAMES[date.getMonth()];
  return `${month} ${date.getFullYear()}`;
}
