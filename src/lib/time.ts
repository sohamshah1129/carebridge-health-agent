export function istDayRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Expected YYYY-MM-DD.");
  const start = new Date(`${date}T00:00:00+05:30`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(start) !== date) throw new Error("Invalid calendar date.");
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
