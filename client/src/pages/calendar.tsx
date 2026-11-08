import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Clock, User as UserIcon, CheckCircle2, AlertCircle, Hourglass } from 'lucide-react';
import { COURSE_CAPACITY, MIN_PARTICIPANTS, bookedCount, lessonKey, lessonStatus, minimumCheckTime, slotWaitlist, waitlistPosition } from '@/lib/booking-logic';
import { checkBookable, classStart, nextOccurrence, parseISODate, toISODate, WEEKDAYS, type Bookability } from '@/lib/schedule-rules';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

const DAYS: string[] = [...WEEKDAYS];

export default function CalendarPage() {
  const { schedule, courses, bookClass, leaveWaitlist, user, bookings, waitlist, bookingState } = useApp();
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Re-evaluate the booking windows every minute (they open at 09:00, close at class start)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const today = startOfDay(now);
  const currentDayName = format(today, 'EEEE', { locale: it });
  const capitalizedDayName = currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1);

  // Each tab shows the next class on that weekday (today included)
  const dayDates = Object.fromEntries(DAYS.map(d => [d, nextOccurrence(d, now)])) as Record<string, Date>;

  // Open the tab of the first day that has something bookable right now
  const firstOpenDay = DAYS
    .slice()
    .sort((a, b) => dayDates[a].getTime() - dayDates[b].getTime())
    .find(d => schedule.some(s => s.day === d && checkBookable(s, dayDates[d], now).ok));
  const [selectedDay, setSelectedDay] = useState(firstOpenDay ?? DAYS[0]);

  const filteredSchedule = schedule
    .filter(s => s.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedDate = dayDates[selectedDay];
  const bookingDate = toISODate(selectedDate);
  const selectedDateLabel = format(selectedDate, 'EEEE d MMMM', { locale: it });

  const closedReason = (b: Bookability): string => {
    if (b.ok) return '';
    switch (b.reason) {
      case 'not_open_yet':
        return `Prenotazioni aperte da ${format(b.opensAt, "EEEE d MMMM 'alle' HH:mm", { locale: it })}`;
      case 'started':
        return 'Lezione già iniziata';
      case 'course_not_started':
        return `Il corso inizia il ${format(parseISODate(b.startsOn), 'd MMMM', { locale: it })}`;
      case 'out_of_season':
        return 'Fuori stagione (corsi dal 21 settembre al 26 giugno)';
    }
  };

  const handleBook = (scheduleId: string) => {
    if (!user) {
      setLocation('/login');
      return;
    }
    bookClass(scheduleId, bookingDate);
    setOpenBookingId(null);
  };

  const getCourseDetails = (courseId: string) => courses.find(c => c.id === courseId);

  return (
    <div className="container mx-auto px-4 py-10 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold uppercase italic mb-2">
            Calendario <span className="text-primary">Settimanale</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Stagione 2026/2027 · 21 settembre – 26 giugno
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="border-primary/50 text-white bg-primary/10 px-3 py-1">
            Oggi è {capitalizedDayName} {format(today, 'd MMMM', { locale: it })}
          </Badge>
          <div className="text-right">
            <p className="text-xs text-muted-foreground italic">
              * Prenotazioni: max 1 corso al giorno, {COURSE_CAPACITY} posti per lezione.
            </p>
            <p className="text-xs text-primary font-bold italic">
              * Aperte dalle 09:00 del giorno prima (corsi del lunedì: dal venerdì).
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={selectedDay} onValueChange={setSelectedDay} className="w-full">
        <TabsList className="w-full flex h-auto p-1 bg-card/50 border border-white/10 rounded-xl mb-8 overflow-x-auto justify-start md:justify-center">
          {DAYS.map((day) => (
            <TabsTrigger 
              key={day} 
              value={day}
              className="flex-1 min-w-[100px] py-3 text-lg font-display uppercase italic data-[state=active]:bg-primary data-[state=active]:text-black transition-all relative"
            >
              <span className="flex flex-col items-center leading-tight">
                {day}
                <span className="text-[11px] not-italic normal-case font-sans opacity-70">
                  {format(dayDates[day], 'd MMM', { locale: it })}
                </span>
              </span>
              {day === firstOpenDay && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchedule.map((slot) => {
            const course = getCourseDetails(slot.courseId);
            // Only the bookable date matters here: counts and status are per class instance
            const state = bookingState;
            const isBooked = !!user && bookings.some(
              b => b.userId === user.id && b.scheduleId === slot.id && b.date === bookingDate
            );
            const myWaitPos = user ? waitlistPosition(state, user.id, slot.id, bookingDate) : null;
            const myWaitEntry = myWaitPos !== null
              ? slotWaitlist(state, slot.id, bookingDate)[myWaitPos - 1]
              : null;
            const queueLength = slotWaitlist(state, slot.id, bookingDate).length;
            const remainingSpots = Math.max(0, slot.capacity - bookedCount(state, slot.id, bookingDate));
            // A spot freed while people are waiting goes to them, never to a newcomer
            const isFull = remainingSpots <= 0 || queueLength > 0;
            const lessonStart = classStart(selectedDate, slot.time);
            const status = lessonStatus(state, slot.id, bookingDate, lessonStart, now);
            const bookability = checkBookable(slot, selectedDate, now);
            // Show "annullata" for lessons the check cancelled, or still upcoming ones that can no
            // longer reach the minimum; out-of-season or finished lessons keep their own message.
            const isCancelled = status === 'cancelled' &&
              (bookability.ok || state.lessonOutcomes?.[lessonKey(slot.id, bookingDate)] === 'cancelled');
            const booked = bookedCount(state, slot.id, bookingDate);
            const canBookNow = bookability.ok && !isCancelled;
            
            if (!course) return null;

            return (
              <Card key={slot.id} className={cn(
                "group border-l-4 border-t-0 border-r-0 border-b-0 bg-card hover:bg-card/80 transition-all duration-300 overflow-hidden relative",
                isBooked ? "border-l-green-500 bg-green-950/10" : `border-l-${course.color.replace('bg-', '')}`,
                !canBookNow && "opacity-75 grayscale-[0.5]"
              )}>
                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${course.color}`} />
                 
                <CardContent className="p-6 relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{slot.time}</span>
                    </div>
                    {isCancelled ? (
                      <Badge variant="destructive" className="font-bold uppercase">Annullata</Badge>
                    ) : isBooked ? (
                      <Badge className="bg-green-500 text-black font-bold uppercase">Prenotato</Badge>
                    ) : myWaitPos !== null ? (
                      <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold uppercase">
                        In attesa · n° {myWaitPos}
                      </Badge>
                    ) : canBookNow && isFull ? (
                      <Badge variant="destructive" className="font-bold uppercase">
                        Esaurito{queueLength > 0 ? ` · ${queueLength} in attesa` : ''}
                      </Badge>
                    ) : canBookNow ? (
                      <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                        {remainingSpots === 1 ? "1 posto disponibile" : `${remainingSpots} posti disponibili`}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-white/5">Non Prenotabile</Badge>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-display font-bold uppercase italic mb-2 text-white group-hover:text-primary transition-colors">
                    {course.name}
                  </h3>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <UserIcon className="h-4 w-4" />
                      <span>{slot.instructor}</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-white/10">
                      {course.intensity} Intensity
                    </Badge>
                  </div>

                  {canBookNow && status === 'pending' && booked < MIN_PARTICIPANTS && (
                    <p className="-mt-3 mb-3 text-[11px] text-muted-foreground">
                      Minimo {MIN_PARTICIPANTS} iscritti, ora {booked}/{MIN_PARTICIPANTS}: altrimenti la lezione si annulla
                      alle {format(minimumCheckTime(lessonStart), 'HH:mm')} e gli iscritti vengono avvisati.
                    </p>
                  )}
                  {isCancelled ? (
                    <div className="flex items-center gap-2 text-xs text-red-400/90 bg-red-500/5 p-2 rounded border border-red-500/15">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Lezione annullata: meno di {MIN_PARTICIPANTS} iscritti
                    </div>
                  ) : !canBookNow ? (
                    <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/5 p-2 rounded border border-amber-500/10">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {closedReason(bookability)}
                    </div>
                  ) : myWaitEntry ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-xs text-sky-300/90 bg-sky-500/5 p-2 rounded border border-sky-500/15">
                        <Hourglass className="h-3 w-3 shrink-0" />
                        Se si libera un posto verrai iscritto automaticamente e riceverai una notifica.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full font-bold uppercase tracking-wider border-white/15"
                        onClick={() => leaveWaitlist(myWaitEntry.id)}
                      >
                        Esci dalla lista d'attesa
                      </Button>
                    </div>
                  ) : (
                    <Dialog open={openBookingId === slot.id} onOpenChange={(open) => setOpenBookingId(open ? slot.id : null)}>
                      <DialogTrigger asChild>
                        <Button 
                          disabled={isBooked}
                          className={cn(
                            "w-full font-bold uppercase tracking-wider",
                            isBooked
                              ? "bg-white/10 text-gray-500 cursor-not-allowed hover:bg-white/10"
                              : isFull
                                ? "bg-sky-500/15 text-sky-200 border border-sky-500/30 hover:bg-sky-500/25"
                                : "bg-primary text-black hover:bg-primary/90 hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                          )}
                        >
                          {isBooked ? (
                            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Iscritto</span>
                          ) : isFull ? (
                            <span className="flex items-center gap-2"><Hourglass className="h-4 w-4" /> Entra in lista d'attesa</span>
                          ) : (
                            "Prenota"
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-white/10 bg-card/95 backdrop-blur-xl">
                        <DialogHeader>
                          <DialogTitle className="font-display uppercase italic text-2xl">
                            {isFull ? "Lista d'attesa" : "Conferma Prenotazione"}
                          </DialogTitle>
                          <DialogDescription>
                            {isFull
                              ? "Il corso è pieno. Se qualcuno disdice, il posto va al primo in lista e vieni iscritto automaticamente. "
                              : null}
                            {isFull ? "Lezione di" : "Stai prenotando per"} <span className="text-primary font-bold capitalize">{selectedDateLabel}</span>.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4">
                          <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Corso:</span>
                              <span className="font-bold text-white">{course.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Istruttore:</span>
                              <span className="text-white">{slot.instructor}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Orario:</span>
                              <span className="text-white">{selectedDay}, {slot.time}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-white/5">
                              <span className="text-muted-foreground">{isFull ? "La tua posizione:" : "Posti rimanenti:"}</span>
                              <span className="text-primary font-bold">
                                {isFull ? `n° ${queueLength + 1}` : `${remainingSpots} su ${slot.capacity}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setOpenBookingId(null)}>Annulla</Button>
                          <Button className="bg-primary text-black font-bold uppercase" onClick={() => handleBook(slot.id)}>
                            {isFull ? "Mettimi in lista" : "Conferma Prenotazione"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {filteredSchedule.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-xl">Nessun corso programmato per questo giorno.</p>
          </div>
        )}
      </Tabs>
    </div>
  );
}
