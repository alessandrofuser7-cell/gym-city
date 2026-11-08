// Booking-window and season rules from the official "Orario corsi — Stagione 2026/2027".
// Pure functions (time is always passed in) so they can move to the server unchanged.

export const SEASON = { start: '2026-09-21', end: '2027-06-26' } as const;
/** Gianluca's courses start later than the rest of the season. */
export const GIANLUCA_COURSES_START = '2026-10-05';
/** Bookings open at 09:00 of the day before the class (Monday classes: the previous Friday). */
export const BOOKING_OPEN_HOUR = 9;

export const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] as const;
const DAY_INDEX: Record<string, number> = {
  'Lunedì': 1, 'Martedì': 2, 'Mercoledì': 3, 'Giovedì': 4, 'Venerdì': 5,
};

export type SlotLike = { day: string; time: string; startsOn?: string };

export type Bookability =
  | { ok: true }
  | { ok: false; reason: 'not_open_yet'; opensAt: Date }
  | { ok: false; reason: 'started' }
  | { ok: false; reason: 'out_of_season' }
  | { ok: false; reason: 'course_not_started'; startsOn: string };

/** Local calendar date as 'yyyy-MM-dd' (not toISOString, which shifts to UTC). */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date of the next class on `dayName`, today included. */
export function nextOccurrence(dayName: string, now: Date): Date {
  const target = DAY_INDEX[dayName];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = (target - today.getDay() + 7) % 7;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
}

export function bookingOpensAt(classDate: Date): Date {
  const daysBefore = classDate.getDay() === 1 ? 3 : 1; // Monday -> Friday
  return new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate() - daysBefore, BOOKING_OPEN_HOUR);
}

/** Start of the class from a 'HH:MM/HH:MM' slot time. */
export function classStart(classDate: Date, time: string): Date {
  const [h, m] = time.split('/')[0].split(':').map(Number);
  return new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate(), h, m);
}

export function checkBookable(slot: SlotLike, classDate: Date, now: Date): Bookability {
  const iso = toISODate(classDate);
  if (iso < SEASON.start || iso > SEASON.end) return { ok: false, reason: 'out_of_season' };
  if (slot.startsOn && iso < slot.startsOn) return { ok: false, reason: 'course_not_started', startsOn: slot.startsOn };
  if (now >= classStart(classDate, slot.time)) return { ok: false, reason: 'started' };
  const opensAt = bookingOpensAt(classDate);
  if (now < opensAt) return { ok: false, reason: 'not_open_yet', opensAt };
  return { ok: true };
}
