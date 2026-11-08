import React from 'react';
import { Link, useLocation } from 'wouter';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell, 
  CalendarDays, 
  User, 
  LogOut, 
  Menu, 
  ShieldCheck 
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notification-bell";

import logoImg from '@assets/palestra-gym-city-pescara_1769876975532.jpg';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useApp();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  const NavItems = () => (
    <>
      <Link href="/">
        <Button variant={isActive('/') ? "default" : "ghost"} className="w-full justify-start text-lg font-medium">
          <Dumbbell className="mr-2 h-5 w-5" />
          Home
        </Button>
      </Link>
      <Link href="/calendar">
        <Button variant={isActive('/calendar') ? "default" : "ghost"} className="w-full justify-start text-lg font-medium">
          <CalendarDays className="mr-2 h-5 w-5" />
          Calendario
        </Button>
      </Link>
      {user && (
        <Link href="/profile">
          <Button variant={isActive('/profile') ? "default" : "ghost"} className="w-full justify-start text-lg font-medium">
            <User className="mr-2 h-5 w-5" />
            Il mio Profilo
          </Button>
        </Link>
      )}
      {user?.role === 'admin' && (
        <Link href="/admin">
          <Button variant={isActive('/admin') ? "default" : "ghost"} className="w-full justify-start text-lg font-medium text-primary">
            <ShieldCheck className="mr-2 h-5 w-5" />
            Admin Area
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] border-r border-white/10 bg-card/95 backdrop-blur-xl pt-10">
                <nav className="flex flex-col gap-4">
                  <NavItems />
                </nav>
              </SheetContent>
            </Sheet>
            
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-primary/20 group-hover:scale-110 transition-transform">
                  <img src={logoImg} alt="Gym City Logo" className="h-full w-full object-cover" />
                </div>
                <h1 className="text-xl md:text-2xl font-display font-bold tracking-tighter uppercase italic">
                  Gym <span className="text-primary neon-text">City</span>
                </h1>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={`text-sm font-medium hover:text-primary transition-colors ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}>HOME</Link>
            <Link href="/calendar" className={`text-sm font-medium hover:text-primary transition-colors ${isActive('/calendar') ? 'text-primary' : 'text-muted-foreground'}`}>CALENDARIO</Link>
            {user && (
              <Link href="/profile" className={`text-sm font-medium hover:text-primary transition-colors ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground'}`}>PROFILO</Link>
            )}
            {user?.role === 'admin' && (
              <Link href="/admin" className={`text-sm font-medium hover:text-primary transition-colors ${isActive('/admin') ? 'text-primary' : 'text-muted-foreground'}`}>ADMIN</Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold leading-none">{user.name}</span>
                  <span className="text-xs text-muted-foreground uppercase">{user.role}</span>
                </div>
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                  <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button className="font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-black border-none">
                  Accedi
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-card py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl font-display font-bold uppercase mb-4">
            A.S.D. Gym <span className="text-primary">City</span>
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            La tua palestra di riferimento a Pescara. Allenati con i migliori professionisti in un ambiente moderno e dinamico.
          </p>
          <div className="text-sm text-muted-foreground/50 mb-4">
            &copy; {new Date().getFullYear()} Gym City Pescara. All rights reserved.
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 max-w-2xl mx-auto">
            <h3 className="text-primary font-display uppercase italic mb-2">Orari Struttura</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-white font-bold block">LUN - VEN</span>
                <span className="text-muted-foreground">09:00 - 21:30</span>
              </div>
              <div>
                <span className="text-white font-bold block">SABATO</span>
                <span className="text-muted-foreground">10:00 - 18:00</span>
              </div>
              <div>
                <span className="text-white font-bold block">DOMENICA</span>
                <span className="text-muted-foreground">CHIUSO</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
