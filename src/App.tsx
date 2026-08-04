import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from '@/lib/useUser';
import MainLayout from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Auth from '@/pages/Auth';
import AddFood from '@/pages/AddFood'
import Recipes from '@/pages/Recipes';
import Settings from '@/pages/Settings';
import Progress from './pages/Progress';

function App() {
  const { user, loading } = useUser();

  // Zanim Supabase sprawdzi sesję, pokazujemy prosty ekran ładowania
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  // Jeśli nie ma użytkownika, renderujemy TYLKO ekran logowania
  if (!user) {
    return <Auth />;
  }

  // Jeśli użytkownik jest zalogowany, ma dostęp do całej aplikacji
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="przepisy" element={<Recipes />} />
          <Route path="progres" element={<Progress />} />
          <Route path="ustawienia" element={<Settings />} />
        </Route>
        {/* Nowy widok dodawania bez dolnego paska */}
        <Route path="/dodaj" element={<AddFood />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;