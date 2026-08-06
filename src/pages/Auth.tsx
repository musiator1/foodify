import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff, UserCircle2 } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Konto utworzone! Możesz się teraz zalogować.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas autoryzacji.');
    } finally {
      setLoading(false);
    }
  };

  // Nowa funkcja dla Gościa
  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Nie udało się wejść jako gość.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Nagłówek */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-2 shadow-sm text-4xl">
            🥫
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            PureKcal
          </h1>
          <p className="text-sm text-muted-foreground font-medium px-4">
            {isLogin 
              ? 'Witaj ponownie. Zaloguj się, aby kontynuować.' 
              : 'Rozpocznij swoją drogę do czystej miski.'}
          </p>
        </div>

        {/* Formularz główny */}
        <form onSubmit={handleAuth} className="space-y-4 mt-8">
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="Twój e-mail"
                className="pl-11 h-14 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all text-base"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Hasło"
                className="pl-11 pr-11 h-14 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all text-base"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-xl font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 text-sm text-emerald-600 bg-emerald-500/10 rounded-xl font-medium">
              {message}
            </div>
          )}
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 rounded-xl font-bold text-base mt-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            {loading ? 'Ładowanie...' : (isLogin ? 'Zaloguj się' : 'Utwórz darmowe konto')}
          </Button>
        </form>

        {/* LUB WEJDŹ JAKO GOŚĆ (Nowa sekcja) */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground font-semibold">
              Albo przetestuj
            </span>
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline"
          disabled={loading}
          onClick={handleGuestLogin}
          className="w-full h-14 rounded-xl font-bold text-base border-2 hover:bg-muted/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <UserCircle2 className="w-5 h-5" />
          Wejdź bez logowania jako Gość
        </Button>
        
        {/* Przełącznik Logowanie / Rejestracja */}
        <div className="text-center pt-2">
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); setShowPassword(false); }}
            className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors py-2 px-4"
          >
            {isLogin ? 'Nie masz konta? ' : 'Masz już konto? '}
            <span className="text-primary underline-offset-4 hover:underline">
              {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}