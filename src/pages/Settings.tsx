import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Save, Target, Activity, Palette, Download, Upload, Moon, Sun, Check, UserX } from 'lucide-react';

const THEME_COLORS = [
  { id: 'zinc', bg: 'bg-zinc-800 dark:bg-zinc-300', name: 'Klasyczny' },
  { id: 'blue', bg: 'bg-blue-600', name: 'Niebieski' },
  { id: 'green', bg: 'bg-green-600', name: 'Zielony' },
  { id: 'rose', bg: 'bg-rose-600', name: 'Różowy' },
  { id: 'orange', bg: 'bg-orange-500', name: 'Pomarańczowy' }
];

export default function Settings() {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState({
    daily_calories_goal: 2500, protein_goal: 150, carbs_goal: 200, fat_goal: 70, height: '', theme: 'zinc'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' || 
           (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const applyColorTheme = (themeId: string) => {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('theme', themeId);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({
          daily_calories_goal: data.daily_calories_goal || 2500, protein_goal: data.protein_goal || 150,
          carbs_goal: data.carbs_goal || 200, fat_goal: data.fat_goal || 70, height: data.height || '', theme: data.theme || 'zinc'
        });
        applyColorTheme(data.theme || 'zinc');
      }
    }
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('');
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, ...profile, height: profile.height ? Number(profile.height) : null
    });
    setIsSaving(false);
    if (error) setMessage('Wystąpił błąd podczas zapisywania.');
    else {
      setMessage('Zmiany zostały zapisane.');
      applyColorTheme(profile.theme);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Czy na pewno chcesz się wylogować?')) await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // Podwójne potwierdzenie dla akcji niszczącej
    if (window.confirm('CZY NA PEWNO CHCESZ USUNĄĆ KONTO?\n\nTa operacja jest nieodwracalna. Stracisz wszystkie przepisy, historię wagi i postępy.')) {
      if (window.confirm('Ostatnie ostrzeżenie: Czy ostatecznie potwierdzasz usunięcie konta?')) {
        setIsSaving(true);
        
        // Wywołanie stworzonej funkcji SQL
        const { error } = await supabase.rpc('delete_user');
        
        if (error) {
          alert('Wystąpił błąd. Upewnij się, że dodałeś kod SQL w Supabase.');
          setIsSaving(false);
        } else {
          // Jeśli się udało, wylogowujemy użytkownika (sesja wygasa i cofa go do ekranu logowania)
          await supabase.auth.signOut();
        }
      }
    }
  };

  const handleExport = async () => {
    if (!user) return;
    const { data: food } = await supabase.from('food_entries').select('*').eq('user_id', user.id);
    const { data: verified } = await supabase.from('verified_products').select('*').eq('user_id', user.id);
    const { data: meals } = await supabase.from('saved_meals').select('*').eq('user_id', user.id);
    const exportData = { food, verified, meals };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `foodify_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm('Uwaga: import zastąpi bieżące dane. Czy kontynuować?')) {
          if (json.food?.length) await supabase.from('food_entries').upsert(json.food);
          if (json.verified?.length) await supabase.from('verified_products').upsert(json.verified);
          if (json.meals?.length) await supabase.from('saved_meals').upsert(json.meals);
          alert('Baza danych została zaktualizowana.');
          window.location.reload();
        }
      } catch (err) { alert('Nie udało się odczytać pliku JSON.'); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto pb-28 px-4 pt-8">
      <header className="px-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Ustawienia</h1>
        <p className="text-muted-foreground mt-1 text-sm">Dostosuj aplikację do swoich potrzeb</p>
      </header>

      {/* Twoje Ciało */}
      <Card className="shadow-sm border-border bg-card rounded-2xl">
        <CardHeader className="p-6 pb-4 border-b border-border bg-card rounded-t-2xl">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Twoje Ciało
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <label className="text-sm font-medium text-foreground mb-2 block">Wzrost (cm)</label>
          <Input type="number" placeholder="Niezbędny do wskaźnika BMI" value={profile.height} onChange={(e) => setProfile({...profile, height: e.target.value})} className="h-12" />
        </CardContent>
      </Card>

      {/* Cele Makroskładników */}
      <Card className="shadow-sm border-border bg-card rounded-2xl">
        <CardHeader className="p-6 pb-4 border-b border-border bg-card rounded-t-2xl">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Cele sylwetkowe
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Dzienny limit kalorii (kcal)</label>
            <Input type="number" value={profile.daily_calories_goal} onChange={(e) => setProfile({...profile, daily_calories_goal: Number(e.target.value)})} className="text-lg font-semibold h-12" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Białko (g)</label><Input className="h-11 text-center" type="number" value={profile.protein_goal} onChange={(e) => setProfile({...profile, protein_goal: Number(e.target.value)})} /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Węgle (g)</label><Input className="h-11 text-center" type="number" value={profile.carbs_goal} onChange={(e) => setProfile({...profile, carbs_goal: Number(e.target.value)})} /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tłuszcz (g)</label><Input className="h-11 text-center" type="number" value={profile.fat_goal} onChange={(e) => setProfile({...profile, fat_goal: Number(e.target.value)})} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Wygląd aplikacji */}
      <Card className="shadow-sm border-border bg-card rounded-2xl">
        <CardHeader className="p-6 pb-4 border-b border-border flex flex-row items-center justify-between bg-card rounded-t-2xl">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> Wygląd aplikacji
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50">
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between items-center py-2 px-1">
            {THEME_COLORS.map(color => (
              <div key={color.id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setProfile({...profile, theme: color.id})}>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${color.bg} ${profile.theme === color.id ? 'ring-[5px] ring-offset-4 ring-offset-background ring-primary scale-110 shadow-lg' : 'opacity-85 hover:scale-110'}`}>
                  {profile.theme === color.id && <Check className="w-5 h-5 text-white" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {message && <p className="text-sm font-medium text-center text-primary bg-primary/10 py-3 rounded-xl">{message}</p>}
      
      <Button onClick={handleSave} disabled={isSaving} className="w-full text-base font-semibold h-14 rounded-xl">
        {isSaving ? 'Zapisywanie...' : <><Save className="w-5 h-5 mr-2" /> Zapisz ustawienia</>}
      </Button>

      {/* Export / Import / Wyloguj / Usun */}
      <div className="pt-6 mt-2 border-t border-border space-y-4">
        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1 h-12 rounded-xl" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Eksport</Button>
          <div className="flex-1">
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <Button type="button" variant="secondary" className="w-full h-12 rounded-xl" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Import</Button>
          </div>
        </div>
        
        <Button variant="destructive" className="w-full h-12 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Wyloguj się
        </Button>
        
        <Button variant="ghost" className="w-full h-12 rounded-xl text-destructive/70 hover:bg-destructive/10 hover:text-destructive" onClick={handleDeleteAccount}>
          <UserX className="w-4 h-4 mr-2" /> Usuń konto na zawsze
        </Button>
      </div>
    </div>
  );
}