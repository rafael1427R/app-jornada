import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/grupos', label: 'Grupos', icon: UsersRound },
  { path: '/participantes', label: 'Participantes', icon: Users },
  { path: '/modulos', label: 'Módulos', icon: BookOpen },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(210,30%,97%)' }}>
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-8 py-3">
          <div className="flex items-center gap-4">
            <img
              src="https://media.base44.com/images/public/69d3ed756b33a032859932d3/cb9e3f9b7_2021-07-08T17_08_22467746_logo-vertical-ISAC.png"
              alt="ISAC"
              className="h-14 w-auto object-contain"
              style={{ filter: 'none' }}
            />
            <div className="hidden md:flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Gestão de</span>
              <span className="text-lg font-bold" style={{ color: 'hsl(213,87%,28%)' }}>Módulos & Pontuação</span>
            </div>
          </div>
          <img
            src="https://media.base44.com/images/public/69d3ed756b33a032859932d3/098d63844_transferir.png"
            alt="Hospital Regional Chagas Rodrigues"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Nav */}
        <nav className="flex overflow-x-auto border-t border-border bg-white">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2',
                  active
                    ? 'border-b-2 text-white'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                style={active ? { borderBottomColor: 'hsl(213,87%,28%)', backgroundColor: 'hsl(213,87%,28%)', color: 'white' } : {}}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}