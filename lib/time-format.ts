/** Display stored HH:mm booking slots in 12-hour time without changing their values. */
export function formatTimeRange(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value.replace(/\b([01]?\d|2[0-3]):([0-5]\d)(?!\d)(?:\s*([AP]M))?/gi, (match, hour: string, minute: string, period?: string) => {
    if (period) return match;
    const h = Number(hour);
    return `${h % 12 || 12}:${minute} ${h < 12 ? "AM" : "PM"}`;
  });
}
