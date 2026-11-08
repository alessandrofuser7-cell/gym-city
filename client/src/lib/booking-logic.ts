// Pure booking rules: capacity, one-course-per-day, FIFO waitlist with automatic promotion.
// No React and no side effects, so this module can be moved to the server unchanged
// once bookings are persisted there.

export const COURSE_CAPACITY = 18;

export type Booking = {
  id: string;
  userId: string;
  scheduleId: string;
  date: string; // 'yyyy-MM-dd' of the specific class instance
};

export type WaitlistEntry = {
  id: string;
  userId: string;
  scheduleId: string;
  date: string;
  createdAt: string; // ISO timestamp, defines queue order
};

export type BookingState = {
  bookings: Booking[];
  waitlist: WaitlistEntry[];
};

export type RequestOutcome =
  | { kind: 'booked'; booking: Booking }
  | { kind: 'waitlisted'; entry: WaitlistEntry; position: number }
  | { kind: 'already_booked'; }
  | { kind: 'already_waitlisted'; position: number }
  | { kind: 'daily_limit' };

export type CancelOutcome = {
  cancelled: Booking | null;
  promoted: Booking | null; // booking created for the first person in the waitlist
};

type IdFactory = () => string;

const sameSlot = (a: { scheduleId: string; date: string }, scheduleId: string, date: string) =>
  a.scheduleId === scheduleId && a.date === date;

export function bookedCount(state: BookingState, scheduleId: string, date: string): number {
  return state.bookings.filter(b => sameSlot(b, scheduleId, date)).length;
}

export function slotWaitlist(state: BookingState, scheduleId: string, date: string): WaitlistEntry[] {
  return state.waitlist
    .filter(w => sameSlot(w, scheduleId, date))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** 1-based position of the user in the slot's waitlist, or null if not in it. */
export function waitlistPosition(
  state: BookingState,
  userId: string,
  scheduleId: string,
  date: string,
): number | null {
  const idx = slotWaitlist(state, scheduleId, date).findIndex(w => w.userId === userId);
  return idx === -1 ? null : idx + 1;
}

/**
 * A user may hold at most one course per day. A waitlist entry counts as that course:
 * otherwise an automatic promotion could give someone two courses on the same day.
 */
function holdsSomethingOnDate(state: BookingState, userId: string, date: string): boolean {
  return (
    state.bookings.some(b => b.userId === userId && b.date === date) ||
    state.waitlist.some(w => w.userId === userId && w.date === date)
  );
}

export function requestBooking(
  state: BookingState,
  params: { userId: string; scheduleId: string; date: string; capacity?: number; now?: Date },
  newId: IdFactory,
): { state: BookingState; outcome: RequestOutcome } {
  const { userId, scheduleId, date } = params;
  const capacity = params.capacity ?? COURSE_CAPACITY;

  if (state.bookings.some(b => b.userId === userId && sameSlot(b, scheduleId, date))) {
    return { state, outcome: { kind: 'already_booked' } };
  }
  const pos = waitlistPosition(state, userId, scheduleId, date);
  if (pos !== null) {
    return { state, outcome: { kind: 'already_waitlisted', position: pos } };
  }
  if (holdsSomethingOnDate(state, userId, date)) {
    return { state, outcome: { kind: 'daily_limit' } };
  }

  // Free spots go to the queue first: never let a newcomer jump people already waiting.
  const hasQueue = slotWaitlist(state, scheduleId, date).length > 0;
  if (bookedCount(state, scheduleId, date) < capacity && !hasQueue) {
    const booking: Booking = { id: newId(), userId, scheduleId, date };
    return {
      state: { ...state, bookings: [...state.bookings, booking] },
      outcome: { kind: 'booked', booking },
    };
  }

  const entry: WaitlistEntry = {
    id: newId(),
    userId,
    scheduleId,
    date,
    createdAt: (params.now ?? new Date()).toISOString(),
  };
  const next = { ...state, waitlist: [...state.waitlist, entry] };
  return {
    state: next,
    outcome: { kind: 'waitlisted', entry, position: slotWaitlist(next, scheduleId, date).length },
  };
}

/** Fill free spots of a slot from its waitlist, in queue order. */
function promoteFromWaitlist(
  state: BookingState,
  scheduleId: string,
  date: string,
  capacity: number,
  newId: IdFactory,
): { state: BookingState; promoted: Booking[] } {
  let current = state;
  const promoted: Booking[] = [];
  while (bookedCount(current, scheduleId, date) < capacity) {
    const [first] = slotWaitlist(current, scheduleId, date);
    if (!first) break;
    const booking: Booking = { id: newId(), userId: first.userId, scheduleId, date };
    current = {
      bookings: [...current.bookings, booking],
      waitlist: current.waitlist.filter(w => w.id !== first.id),
    };
    promoted.push(booking);
  }
  return { state: current, promoted };
}

export function cancelBooking(
  state: BookingState,
  params: { bookingId: string; capacity?: number },
  newId: IdFactory,
): { state: BookingState; outcome: CancelOutcome } {
  const cancelled = state.bookings.find(b => b.id === params.bookingId) ?? null;
  if (!cancelled) return { state, outcome: { cancelled: null, promoted: null } };

  const afterCancel = { ...state, bookings: state.bookings.filter(b => b.id !== cancelled.id) };
  const { state: next, promoted } = promoteFromWaitlist(
    afterCancel,
    cancelled.scheduleId,
    cancelled.date,
    params.capacity ?? COURSE_CAPACITY,
    newId,
  );
  return { state: next, outcome: { cancelled, promoted: promoted[0] ?? null } };
}

export function leaveWaitlist(state: BookingState, entryId: string): { state: BookingState; left: WaitlistEntry | null } {
  const left = state.waitlist.find(w => w.id === entryId) ?? null;
  if (!left) return { state, left: null };
  return { state: { ...state, waitlist: state.waitlist.filter(w => w.id !== entryId) }, left };
}
