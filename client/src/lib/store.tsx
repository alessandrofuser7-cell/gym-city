import React, { createContext, useContext, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  COURSE_CAPACITY,
  requestBooking,
  cancelBooking as cancelBookingRule,
  leaveWaitlist as leaveWaitlistRule,
  type Booking,
  type BookingState,
  type WaitlistEntry,
} from '@/lib/booking-logic';

export type { Booking, WaitlistEntry } from '@/lib/booking-logic';

// Types
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
};

export type Course = {
  id: string;
  name: string;
  description: string;
  intensity: 'bassa' | 'media' | 'alta';
  color: string;
};

export type ScheduleItem = {
  id: string;
  courseId: string;
  day: string; // 'Lunedì', 'Martedì', etc.
  time: string; // '18:00'
  instructor: string;
  capacity: number;
};

export type NotificationType =
  | 'subscription_expired'
  | 'subscription_expiring'
  | 'welcome'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'waitlist_joined'
  | 'waitlist_promoted'
  | 'admin_message'
  | 'info';

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: string;
};

export type NewNotification = Pick<AppNotification, 'title' | 'message' | 'type' | 'link'>;

// Mock Data
const COURSES: Course[] = [
  { id: '1', name: 'Body Sculpt', description: 'Tonificazione completa per tutto il corpo.', intensity: 'media', color: 'bg-pink-500' },
  { id: '2', name: 'Funzionale', description: 'Allenamento a circuito per forza e resistenza.', intensity: 'alta', color: 'bg-orange-500' },
  { id: '3', name: 'Abdominal Gluteo Killer', description: 'Focus mirato su addominali e glutei.', intensity: 'alta', color: 'bg-red-500' },
  { id: '4', name: 'Pump', description: 'Allenamento con bilancieri a ritmo di musica.', intensity: 'alta', color: 'bg-purple-500' },
  { id: '5', name: 'Posturale', description: 'Ginnastica per migliorare la postura e la flessibilità.', intensity: 'bassa', color: 'bg-blue-400' },
  { id: '6', name: 'Burn & Tone', description: 'Cardio e tonificazione ad alta intensità.', intensity: 'alta', color: 'bg-yellow-500' },
  { id: '7', name: 'Pilates', description: 'Controllo, precisione e fluidità del movimento.', intensity: 'bassa', color: 'bg-teal-500' },
  { id: '8', name: 'Estetica', description: 'Esercizi mirati alla definizione muscolare.', intensity: 'media', color: 'bg-indigo-500' },
  { id: '9', name: 'Fullbody Workout', description: 'Allenamento completo che coinvolge tutti i gruppi muscolari.', intensity: 'media', color: 'bg-green-500' },
  { id: '10', name: 'GAG', description: 'Gambe, Addominali, Glutei.', intensity: 'media', color: 'bg-rose-500' },
  { id: '11', name: 'Total Body Coreografico', description: 'Allenamento aerobico con coreografie.', intensity: 'media', color: 'bg-cyan-500' },
  { id: '12', name: 'Gym Arms Butt', description: 'Focus su braccia e glutei.', intensity: 'media', color: 'bg-fuchsia-500' },
];

const SCHEDULE: ScheduleItem[] = [
  // Lunedì
  { id: 's1', courseId: '1', day: 'Lunedì', time: '10:00/11:00', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
  { id: 's2', courseId: '2', day: 'Lunedì', time: '13:30/14:30', instructor: 'Luca', capacity: COURSE_CAPACITY },
  { id: 's3', courseId: '3', day: 'Lunedì', time: '18:05/19:05', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
  { id: 's4', courseId: '4', day: 'Lunedì', time: '19:15/20:15', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
  
  // Martedì
  { id: 's5', courseId: '5', day: 'Martedì', time: '09:30/10:30', instructor: 'Sisto', capacity: COURSE_CAPACITY },
  { id: 's5b', courseId: '5', day: 'Martedì', time: '10:30/11:30', instructor: 'Sisto', capacity: COURSE_CAPACITY },
  { id: 's6', courseId: '6', day: 'Martedì', time: '13:30/14:30', instructor: 'Luca', capacity: COURSE_CAPACITY },
  { id: 's7', courseId: '7', day: 'Martedì', time: '16:15/17:15', instructor: 'Hanna', capacity: COURSE_CAPACITY },
  { id: 's7b', courseId: '7', day: 'Martedì', time: '17:15/18:15', instructor: 'Hanna', capacity: COURSE_CAPACITY },
  { id: 's2_tue', courseId: '2', day: 'Martedì', time: '18:35/19:35', instructor: 'Luca', capacity: COURSE_CAPACITY },
  { id: 's8', courseId: '8', day: 'Martedì', time: '19:40/20:40', instructor: 'Gianluca', capacity: COURSE_CAPACITY },

  // Mercoledì
  { id: 's10', courseId: '10', day: 'Mercoledì', time: '10:00/11:00', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
  { id: 's2_wed', courseId: '2', day: 'Mercoledì', time: '13:30/14:30', instructor: 'Luca', capacity: COURSE_CAPACITY },
  { id: 's9', courseId: '9', day: 'Mercoledì', time: '18:05/19:05', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
  { id: 's10_evening', courseId: '10', day: 'Mercoledì', time: '19:15/20:15', instructor: 'Gianluca', capacity: COURSE_CAPACITY },

  // Giovedì
  { id: 's5_thu', courseId: '5', day: 'Giovedì', time: '09:30/10:30', instructor: 'Sisto', capacity: COURSE_CAPACITY },
  { id: 's5b_thu', courseId: '5', day: 'Giovedì', time: '10:30/11:30', instructor: 'Sisto', capacity: COURSE_CAPACITY },
  { id: 's6_thu', courseId: '6', day: 'Giovedì', time: '13:30/14:30', instructor: 'Luca', capacity: COURSE_CAPACITY },
  { id: 's7_thu', courseId: '7', day: 'Giovedì', time: '16:15/17:15', instructor: 'Hanna', capacity: COURSE_CAPACITY },
  { id: 's7b_thu', courseId: '7', day: 'Giovedì', time: '17:15/18:15', instructor: 'Hanna', capacity: COURSE_CAPACITY },
  { id: 's2_thu', courseId: '2', day: 'Giovedì', time: '18:35/19:35', instructor: 'Luca', capacity: COURSE_CAPACITY },
  { id: 's8_thu', courseId: '8', day: 'Giovedì', time: '19:40/20:40', instructor: 'Gianluca', capacity: COURSE_CAPACITY },

  // Venerdì
  { id: 's4_fri', courseId: '4', day: 'Venerdì', time: '10:00/11:00', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
  { id: 's2_fri', courseId: '2', day: 'Venerdì', time: '13:30/14:30', instructor: 'Luca', capacity: COURSE_CAPACITY },
  { id: 's11_fri', courseId: '11', day: 'Venerdì', time: '18:00/19:00', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
  { id: 's12_fri', courseId: '12', day: 'Venerdì', time: '19:00/20:00', instructor: 'Gianluca', capacity: COURSE_CAPACITY },
];

const MOCK_USER: User = {
  id: 'u1',
  name: 'Mario Rossi',
  email: 'mario.rossi@example.com',
  avatar: 'https://github.com/shadcn.png',
  role: 'user',
};

const MOCK_ADMIN: User = {
  id: 'a1',
  name: 'Admin Gym',
  email: 'admin@gymcity.com',
  avatar: 'https://github.com/shadcn.png',
  role: 'admin',
};

// Context
interface AppContextType {
  user: User | null;
  courses: Course[];
  schedule: ScheduleItem[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  login: (asAdmin?: boolean) => void;
  logout: () => void;
  bookClass: (scheduleId: string, date: string) => void;
  cancelBooking: (bookingId: string) => void;
  leaveWaitlist: (entryId: string) => void;
  addCourse: (course: Course) => void;
  isAdmin: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  pushNotification: (userId: string, notification: NewNotification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearReadNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(SCHEDULE);
  // Bookings and waitlist change together (a cancellation can promote someone), so they share
  // one state object. The ref always holds the latest value, so two actions fired in the same
  // tick never work on a stale copy.
  const [bookingState, setBookingStateRaw] = useState<BookingState>({ bookings: [], waitlist: [] });
  const bookingStateRef = useRef(bookingState);
  const setBookingState = (next: BookingState) => {
    bookingStateRef.current = next;
    setBookingStateRaw(next);
  };
  const { bookings, waitlist } = bookingState;
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const { toast } = useToast();

  // Notifications of the current user, newest first
  const notifications = user
    ? allNotifications
        .filter(n => n.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const pushNotification = (userId: string, notification: NewNotification) => {
    setAllNotifications(prev => [
      ...prev,
      {
        ...notification,
        id: Math.random().toString(36).slice(2, 11),
        userId,
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const isMine = (n: AppNotification) => !!user && n.userId === user.id;

  const markNotificationRead = (id: string) => {
    setAllNotifications(prev => prev.map(n => (n.id === id && isMine(n) ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setAllNotifications(prev => prev.map(n => (isMine(n) ? { ...n, read: true } : n)));
  };

  const deleteNotification = (id: string) => {
    setAllNotifications(prev => prev.filter(n => !(n.id === id && isMine(n))));
  };

  const clearReadNotifications = () => {
    setAllNotifications(prev => prev.filter(n => !(isMine(n) && n.read)));
  };

  const login = (asAdmin = false) => {
    const loggedUser = asAdmin ? MOCK_ADMIN : MOCK_USER;
    setUser(loggedUser);
    if (!allNotifications.some(n => n.userId === loggedUser.id && n.type === 'welcome')) {
      pushNotification(loggedUser.id, {
        type: 'welcome',
        title: `Benvenuto, ${loggedUser.name.split(' ')[0]}!`,
        message: 'Qui troverai conferme di prenotazione, scadenze e novità della palestra.',
      });
    }
    toast({
      title: "Benvenuto!",
      description: asAdmin ? "Accesso effettuato come Amministratore" : "Accesso effettuato con successo",
    });
  };

  const logout = () => {
    setUser(null);
    toast({
      title: "Arrivederci",
      description: "Disconnessione completata",
    });
  };

  const newId = () => Math.random().toString(36).slice(2, 11);

  const describeSlot = (scheduleId: string, date: string) => {
    const slot = schedule.find(s => s.id === scheduleId);
    const course = slot && courses.find(c => c.id === slot.courseId);
    const day = new Date(`${date}T00:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    return {
      capacity: slot?.capacity ?? COURSE_CAPACITY,
      name: course?.name ?? 'Corso',
      label: course && slot ? `${course.name} — ${day}, ${slot.time}` : day,
    };
  };

  const bookClass = (scheduleId: string, date: string) => {
    if (!user) return;
    const info = describeSlot(scheduleId, date);
    const { state, outcome } = requestBooking(
      bookingStateRef.current,
      { userId: user.id, scheduleId, date, capacity: info.capacity },
      newId,
    );

    switch (outcome.kind) {
      case 'booked':
        setBookingState(state);
        pushNotification(user.id, {
          type: 'booking_confirmed',
          title: 'Prenotazione confermata',
          message: info.label,
          link: '/profile',
        });
        toast({
          title: "Prenotazione confermata!",
          description: "Ti aspettiamo in palestra.",
          className: "bg-primary text-primary-foreground border-none",
        });
        return;
      case 'waitlisted':
        setBookingState(state);
        pushNotification(user.id, {
          type: 'waitlist_joined',
          title: "Sei in lista d'attesa",
          message: `${info.label}. Posizione n° ${outcome.position}: se si libera un posto verrai iscritto automaticamente.`,
          link: '/profile',
        });
        toast({
          title: "Corso pieno: sei in lista d'attesa",
          description: `Posizione n° ${outcome.position}. Ti avviseremo se entri.`,
        });
        return;
      case 'already_booked':
        toast({ title: "Sei già iscritto", description: "Hai già un posto in questo corso." });
        return;
      case 'already_waitlisted':
        toast({ title: "Sei già in lista d'attesa", description: `Posizione n° ${outcome.position}.` });
        return;
      case 'daily_limit':
        toast({
          title: "Limite raggiunto",
          description: "Puoi prenotare un solo corso al giorno (lista d'attesa inclusa).",
          variant: "destructive",
        });
        return;
    }
  };

  const cancelBooking = (bookingId: string) => {
    const target = bookingStateRef.current.bookings.find(b => b.id === bookingId);
    if (!target) return;
    const { state, outcome } = cancelBookingRule(
      bookingStateRef.current,
      { bookingId, capacity: describeSlot(target.scheduleId, target.date).capacity },
      newId,
    );
    const { cancelled, promoted } = outcome;
    if (!cancelled) return;
    setBookingState(state);

    const info = describeSlot(cancelled.scheduleId, cancelled.date);
    pushNotification(cancelled.userId, {
      type: 'booking_cancelled',
      title: 'Prenotazione cancellata',
      message: `Hai annullato ${info.label}.`,
      link: '/calendar',
    });
    if (promoted) {
      pushNotification(promoted.userId, {
        type: 'waitlist_promoted',
        title: 'Si è liberato un posto: sei iscritto!',
        message: `Sei stato inserito automaticamente in ${info.label}.`,
        link: '/profile',
      });
    }
    toast({
      title: "Prenotazione cancellata",
      description: promoted
        ? "Il posto è stato assegnato al primo in lista d'attesa."
        : "La tua prenotazione è stata rimossa.",
    });
  };

  const leaveWaitlist = (entryId: string) => {
    const { state, left } = leaveWaitlistRule(bookingStateRef.current, entryId);
    if (!left) return;
    setBookingState(state);
    toast({ title: "Uscito dalla lista d'attesa", description: describeSlot(left.scheduleId, left.date).label });
  };

  const addCourse = (course: Course) => {
    setCourses([...courses, course]);
  };

  return (
    <AppContext.Provider value={{
      user,
      courses,
      schedule,
      bookings,
      waitlist,
      login,
      logout,
      bookClass,
      cancelBooking,
      leaveWaitlist,
      addCourse,
      isAdmin: user?.role === 'admin',
      notifications,
      unreadCount,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearReadNotifications,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
