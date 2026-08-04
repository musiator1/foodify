import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, BarChart2, Settings } from 'lucide-react';

export default function MainLayout() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dziennik' },
    { path: '/przepisy', icon: BookOpen, label: 'Przepisy' },
    { path: '/progres', icon: BarChart2, label: 'Progres' },
    { path: '/ustawienia', icon: Settings, label: 'Ustawienia' },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <Outlet />
      </main>

      {/* Dodane z-50 oraz podpięte zmienne motywów (bg-card, border-border) */}
      <nav className="fixed bottom-0 w-full bg-card border-t border-border flex justify-around p-3 pb-safe z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.path} 
              to={item.path}
              // Używamy text-primary zamiast text-blue-600, by menu reagowało na zmianę motywu!
              className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon size={24} className={isActive ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}