import React from 'react';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Trash2, Trophy, Flame, History, Hourglass } from 'lucide-react';
import { waitlistPosition } from '@/lib/booking-logic';
import { useLocation } from 'wouter';
import patternImage from '@assets/generated_images/sporty_abstract_geometric_pattern_dark_neon_green.png';

export default function ProfilePage() {
  const { user, bookings, waitlist, courses, schedule, cancelBooking, leaveWaitlist } = useApp();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation('/login');
    return null;
  }

  // Enrich booking data
  const myBookings = bookings
    .filter(b => b.userId === user.id)
    .map(b => {
      const slot = schedule.find(s => s.id === b.scheduleId);
      const course = slot ? courses.find(c => c.id === slot.courseId) : null;
      return { ...b, slot, course };
    })
    .filter(item => item.slot && item.course); // Remove invalid refs

  const myWaitlist = waitlist
    .filter(w => w.userId === user.id)
    .map(w => {
      const slot = schedule.find(s => s.id === w.scheduleId);
      const course = slot ? courses.find(c => c.id === slot.courseId) : null;
      const position = waitlistPosition({ bookings, waitlist }, user.id, w.scheduleId, w.date);
      return { ...w, slot, course, position };
    })
    .filter(item => item.slot && item.course);

  return (
    <div className="min-h-screen bg-background relative">
       <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: `url(${patternImage})`, backgroundSize: 'cover' }}></div>

      <div className="container mx-auto px-4 py-10 relative z-10">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 p-8 bg-card/60 backdrop-blur border border-white/10 rounded-2xl shadow-xl">
          <Avatar className="h-32 w-32 border-4 border-primary shadow-[0_0_30px_rgba(204,255,0,0.3)]">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-4xl font-bold bg-zinc-800 text-white">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-display font-bold uppercase italic text-white mb-2">{user.name}</h1>
            <p className="text-muted-foreground text-lg mb-4">{user.email}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-full flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-bold text-primary">{myBookings.length} Allenamenti</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-bold text-white">Livello: Intermedio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full justify-start border-b border-white/10 bg-transparent p-0 rounded-none h-auto gap-8 mb-8">
            <TabsTrigger 
              value="upcoming" 
              className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-lg font-display uppercase italic transition-all"
            >
              Prossimi Allenamenti
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-lg font-display uppercase italic transition-all"
            >
              Storico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {myWaitlist.map((entry) => (
              <Card key={entry.id} className="bg-sky-950/10 border border-sky-500/20">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-full flex items-center justify-center bg-zinc-800 border-2 border-sky-500/30">
                      <Hourglass className="h-8 w-8 text-sky-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-1">
                        Lista d'attesa · posizione n° {entry.position}
                      </p>
                      <h3 className="text-xl font-display font-bold uppercase italic text-white mb-1">{entry.course?.name}</h3>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <span className="text-primary font-bold">{entry.slot?.day}</span> • {entry.slot?.time} • con {entry.slot?.instructor}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full md:w-auto border-white/15"
                    onClick={() => leaveWaitlist(entry.id)}
                  >
                    Esci dalla lista
                  </Button>
                </CardContent>
              </Card>
            ))}
            {myBookings.length > 0 ? (
              myBookings.map((booking) => (
                <Card key={booking.id} className="bg-card hover:bg-card/80 border border-white/10 transition-colors group">
                  <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center bg-zinc-800 border-2 border-white/10 group-hover:border-primary transition-colors`}>
                        <CalendarDays className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold uppercase italic text-white mb-1">{booking.course?.name}</h3>
                        <p className="text-muted-foreground flex items-center gap-2">
                          <span className="text-primary font-bold">{booking.slot?.day}</span> • {booking.slot?.time} • con {booking.slot?.instructor}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      className="w-full md:w-auto bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20"
                      onClick={() => cancelBooking(booking.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Disdici
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : myWaitlist.length > 0 ? null : (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-card/20">
                <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Nessuna prenotazione attiva</h3>
                <p className="text-muted-foreground mb-6">Non hai ancora prenotato nessun corso per questa settimana.</p>
                <Button className="bg-primary text-black font-bold uppercase" onClick={() => setLocation('/calendar')}>
                  Vai al Calendario
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="text-center py-20 text-muted-foreground">
              <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Lo storico delle prenotazioni passate apparirà qui.</p>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
