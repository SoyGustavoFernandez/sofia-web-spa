const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

// Builds a local date and rejects overflowing components such as 31/02
export function buildLocalDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  date.setFullYear(year);
  const matches = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return matches ? date : null;
}

// Serializes the local calendar day as yyyy-MM-dd (toISOString would shift it to UTC)
export function toDateOnly(date: Date | null | undefined): string | undefined {
  if (!date || isNaN(date.getTime())) return undefined;
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Reads the calendar day written in a yyyy-MM-dd[...] value as a local date (new Date would read it as UTC)
export function fromDateOnly(value: string | null | undefined): Date | null {
  const match = value ? DATE_ONLY_PREFIX.exec(value) : null;
  return match ? buildLocalDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

// Instant where the local calendar day starts, for range filters over timestamps
export function toLocalDayStartIso(date: Date | null | undefined): string | undefined {
  if (!date || isNaN(date.getTime())) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

// Last instant of the local calendar day, so an inclusive upper bound covers the whole day
export function toLocalDayEndIso(date: Date | null | undefined): string | undefined {
  if (!date || isNaN(date.getTime())) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();
}

// Serializes local midnight with its explicit UTC offset so the server time zone never moves the day
export function toLocalMidnightIso(date: Date | null | undefined): string | undefined {
  const day = toDateOnly(date);
  if (!date || !day) return undefined;
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = -midnight.getTimezoneOffset();
  const abs = Math.abs(offset);
  return `${day}T00:00:00${offset >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
