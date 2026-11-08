import React, { useState } from 'react';
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
import { format, addDays, startOfWeek, isSameDay, parseISO, isAfter, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Clock, User as UserIcon, CheckCircle2, AlertCircle, Hourglass } from 'lucide-react';
import { bookedCount, slotWaitlist, waitlistPosition } from '@/lib/booking-logic';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

const DAYS_MAP: Record<string, number> = {
  'Lunedì': 1,
  'Martedì': 2,
  'Mercoledì': 3,
  'Giovedì': 4,
  'Venerdì': 5
};

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

export default function CalendarPage() {
  const { schedule, courses, bookClass, leaveWaitlist, user, bookings, waitlist } = useApp();
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Current Date logic
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  
  // Current day of week in Italian
  const currentDayName = format(today, 'EEEE', { locale: it });
  const capitalizedDayName = currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1);
  
  // Logic for allowed booking day
  // If Today is Friday, Saturday or Sunday -> Can book for Monday
  // Else -> Can book for Tomorrow
  let targetBookingDate = tomorrow;
  const isFriday = capitalizedDayName === 'Venerdì';
  const isSaturday = capitalizedDayName === 'Sabato';
  const isSunday = capitalizedDayName === 'Domenica';

  if (isFriday || isSaturday || isSunday) {
    // Target is next Monday
    const daysToAdd = isFriday ? 3 : (isSaturday ? 2 : 1);
    targetBookingDate = addDays(today, daysToAdd);
  }

  const targetDayName = format(targetBookingDate, 'EEEE', { locale: it });
  const capitalizedTargetName = targetDayName.charAt(0).toUpperCase() + targetDayName.slice(1);

  const [selectedDay, setSelectedDay] = useState(capitalizedTargetName);

  const filteredSchedule = schedule
    .filter(s => s.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const bookingDate = format(targetBookingDate, 'yyyy-MM-dd');

  const handleBook = (scheduleId: string) => {
    if (!user) {
      setLocation('/login');
      return;
    }
    bookClass(scheduleId, bookingDate);
    setOpenBookingId(null);
  };

  const getCourseDetails = (courseId: string) => courses.find(c => c.id === courseId);

  // Check if a day is the one currently allowed for booking
  const isBookingAllowedForDay = (dayName: string) => {
    return dayName === capitalizedTargetName;
  };

  return (
    <div className="container mx-auto px-4 py-10 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold uppercase italic mb-2">
            Calendario <span className="text-primary">Settimanale</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Settimana del {format(weekStart, 'd MMMM', { locale: it })} - {format(addDays(weekStart, 4), 'd MMMM yyyy', { locale: it })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="border-primary/50 text-white bg-primary/10 px-3 py-1">
            Oggi è {capitalizedDayName} {format(today, 'd MMMM', { locale: it })}
          </Badge>
          <div className="text-right">
            <p className="text-xs text-muted-foreground italic">
              * Prenotazioni: max 1 corso al giorno.
            </p>
            <p className="text-xs text-primary font-bold italic">
              * Prenotazioni aperte per: {capitalizedTargetName} {format(targetBookingDate, 'd MMMM', { locale: it })}
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
              {day}
              {day === capitalizedTargetName && (
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
            const state = { bookings, waitlist };
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
            const canBookNow = isBookingAllowedForDay(selectedDay);
            
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
                    {isBooked ? (
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

                  {!canBookNow ? (
                    <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/5 p-2 rounded border border-amber-500/10">
                      <AlertCircle className="h-3 w-3" />
                      Prenotazioni aperte solo il giorno precedente
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
                            "Prenota per Domani"
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
                            {isFull ? "Lezione di" : "Stai prenotando per"} <span className="text-primary font-bold">{capitalizedTargetName}, {format(targetBookingDate, 'd MMMM', { locale: it })}</span>.
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
