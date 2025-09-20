/**
 * Time formatting utilities
 *
 * Provides a helper to display minutes in the most appropriate unit.
 * Default style uses long unit labels (min, hrs, days) while the short style
 * uses compact forms (m, h, d, w, mo).
 */
export function formatDuration(minutes: number, style: "long" | "short" = "long"): string {
  if (minutes < 60) {
    const value = Math.round(minutes * 10) / 10;
    return style === "short" ? `${value}m` : `${value} min`;
  }
  if (minutes < 60 * 24) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return style === "short"
      ? `${hours}h`
      : `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  if (minutes < 60 * 24 * 7) {
    const days = Math.round((minutes / (60 * 24)) * 10) / 10;
    return style === "short"
      ? `${days}d`
      : `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes < 60 * 24 * 30) {
    const weeks = Math.round((minutes / (60 * 24 * 7)) * 10) / 10;
    return style === "short"
      ? `${weeks}w`
      : `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  const months = Math.round((minutes / (60 * 24 * 30)) * 10) / 10;
  return style === "short"
    ? `${months}mo`
    : `${months} month${months === 1 ? "" : "s"}`;
}
