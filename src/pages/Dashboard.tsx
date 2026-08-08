import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Trash2, UtensilsCrossed, ChevronDown, ChevronUp, Check, X, Edit3, Zap } from "lucide-react";

const MEAL_TYPES = ['Śniadanie', 'Lunch', 'Obiad', 'Kolacja'];

export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [goals, setGoals] = useState({ calories: 2500, protein: 150, carbs: 200, fat: 70 });
  const [consumed, setConsumed] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({
    'Śniadanie': false, 'Lunch': false, 'Obiad': false, 'Kolacja': false
  });

  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- NOWE STANY: Edycja ilości ---
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState<number>(0);

  // --- NOWE STANY: Szybkie dodawanie ---
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    name: "Szybki posiłek",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    mealType: MEAL_TYPES[0]
  });

  const toggleMeal = (mealType: string) => setExpandedMeals(prev => ({ ...prev, [mealType]: !prev[mealType] }));
  const handlePreviousDay = () => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; });
  const handleNextDay = () => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; });

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return; 
      setLoading(true);
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setGoals({
          calories: profile.daily_calories_goal || 2500,
          protein: profile.protein_goal || 150,
          carbs: profile.carbs_goal || 200,
          fat: profile.fat_goal || 70
        });
        document.documentElement.setAttribute('data-theme', profile.theme || 'zinc');
      }

      const { data: foodEntries } = await supabase.from('food_entries').select('*')
        .eq('user_id', user.id).eq('date', currentDate).order('created_at', { ascending: true });

      if (foodEntries) {
        setMeals(foodEntries);
        const c = foodEntries.reduce((acc, item) => ({
          calories: acc.calories + (item.calories || 0),
          protein: acc.protein + (item.protein || 0),
          carbs: acc.carbs + (item.carbs || 0),
          fat: acc.fat + (item.fat || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        setConsumed(c);
      }
      setLoading(false);
    }
    fetchData();
  }, [user, currentDate]);

  const handleDeleteEntry = async (id: string) => {
    const deletedMeal = meals.find(m => m.id === id);
    if (!deletedMeal) return;
    
    setMeals(prev => prev.filter(m => m.id !== id));
    setConsumed(prev => ({
      calories: prev.calories - deletedMeal.calories,
      protein: prev.protein - deletedMeal.protein,
      carbs: prev.carbs - deletedMeal.carbs,
      fat: prev.fat - deletedMeal.fat
    }));
    await supabase.from('food_entries').delete().eq('id', id);
  };

  const handleSaveAsMeal = async (_mealType: string, typeMeals: any[]) => {
    if (!user) return;
    const mealName = window.prompt(`Podaj nazwę dla tego posiłku (np. "Moja owsianka"):`);
    if (!mealName || mealName.trim() === '') return;

    const newMeal = {
      user_id: user.id,
      name: mealName.trim(),
      total_grams: typeMeals.reduce((sum, item) => sum + Number(item.grams || 0), 0),
      calories: typeMeals.reduce((sum, item) => sum + Number(item.calories || 0), 0),
      protein: typeMeals.reduce((sum, item) => sum + Number(item.protein || 0), 0),
      carbs: typeMeals.reduce((sum, item) => sum + Number(item.carbs || 0), 0),
      fat: typeMeals.reduce((sum, item) => sum + Number(item.fat || 0), 0),
      ingredients: typeMeals.map(item => ({ name: item.name, grams: item.grams, calories: item.calories }))
    };

    const { error } = await supabase.from('saved_meals').insert(newMeal);
    if (!error) alert(`Zapisano! Znajdziesz to w zakładce "Moja Baza".`);
  };

  // --- LOGIKA: Zapis Edycji Wagi ---
  const handleSaveEdit = async (item: any) => {
    if (!editGrams || editGrams <= 0) {
      setEditingItemId(null);
      return;
    }

    const ratio = editGrams / item.grams;
    const updatedItem = {
      ...item,
      grams: editGrams,
      calories: Math.round(item.calories * ratio),
      protein: Math.round(item.protein * ratio),
      carbs: Math.round(item.carbs * ratio),
      fat: Math.round(item.fat * ratio),
    };

    // Zapis w bazie
    const { error } = await supabase.from('food_entries').update({
      grams: updatedItem.grams,
      calories: updatedItem.calories,
      protein: updatedItem.protein,
      carbs: updatedItem.carbs,
      fat: updatedItem.fat
    }).eq('id', item.id);

    if (!error) {
      // Aktualizacja lokalnych stanów
      setMeals(prev => prev.map(m => m.id === item.id ? updatedItem : m));
      setConsumed(prev => ({
        calories: prev.calories - item.calories + updatedItem.calories,
        protein: prev.protein - item.protein + updatedItem.protein,
        carbs: prev.carbs - item.carbs + updatedItem.carbs,
        fat: prev.fat - item.fat + updatedItem.fat
      }));
    }
    setEditingItemId(null);
  };

  // --- LOGIKA: Zapis Szybkiego Dodawania ---
  const handleQuickAddSubmit = async () => {
    if (!user || !quickAddForm.calories) return;

    const newItem = {
      user_id: user.id,
      name: quickAddForm.name || "Szybki posiłek",
      grams: 100, // domyślna wartość umowna
      calories: Number(quickAddForm.calories) || 0,
      protein: Number(quickAddForm.protein) || 0,
      carbs: Number(quickAddForm.carbs) || 0,
      fat: Number(quickAddForm.fat) || 0,
      date: currentDate,
      meal_type: quickAddForm.mealType,
    };

    const { data, error } = await supabase.from('food_entries').insert(newItem).select().single();
    
    if (data && !error) {
      setMeals(prev => [...prev, data]);
      setConsumed(prev => ({
        calories: prev.calories + data.calories,
        protein: prev.protein + data.protein,
        carbs: prev.carbs + data.carbs,
        fat: prev.fat + data.fat
      }));
      setIsQuickAddOpen(false);
      setQuickAddForm({ name: "Szybki posiłek", calories: "", protein: "", carbs: "", fat: "", mealType: MEAL_TYPES[0] });
    }
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground min-h-screen flex items-center justify-center">Wczytywanie dziennika...</div>;

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto pb-24 px-4 pt-6">
      
      {/* Pasek Daty z Kalendarzem */}
      <div className="flex items-center justify-between bg-card p-2 rounded-2xl shadow-sm border border-border">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handlePreviousDay}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="relative text-center flex flex-col items-center justify-center cursor-pointer group">
          <h2 className="font-bold text-base text-foreground tracking-tight group-hover:text-primary transition-colors">
            {currentDate === new Date().toISOString().split('T')[0] ? 'Dzisiaj' : 'Wybrany dzień'}
          </h2>
          <p className="text-[11px] font-medium text-muted-foreground">{currentDate}</p>
          <input 
            type="date" 
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleNextDay}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Pasek Szybkich Akcji */}
      <Button 
        variant="outline" 
        className="w-full border-dashed border-2 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all font-semibold rounded-xl"
        onClick={() => setIsQuickAddOpen(true)}
      >
        <Zap className="w-4 h-4 mr-2" />
        Szybkie dodawanie
      </Button>

      {/* Podsumowanie Kalorii i Makro */}
      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Podsumowanie dnia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          {/* Kalorie */}
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-muted-foreground text-sm font-medium ml-1">{consumed.calories}</span>
              <span className="text-muted-foreground text-sm font-medium ml-1">/ {goals.calories} kcal</span>
            </div>
            <span className="text-sm font-bold text-primary">
              {Math.min(Math.round((consumed.calories / goals.calories) * 100) || 0, 100)}%
            </span>
          </div>
          <Progress value={(consumed.calories / goals.calories) * 100} className="h-2.5 mb-5 bg-secondary" />

          {/* Makroskładniki */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1.5 text-muted-foreground whitespace-nowrap">
                <span>Białko</span> <span>{consumed.protein}/{goals.protein}g</span>
              </div>
              <Progress value={(consumed.protein / goals.protein) * 100} className="h-1.5 bg-secondary [&>div]:bg-rose-500" />
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1.5 text-muted-foreground whitespace-nowrap">
                <span>Węgle</span> <span>{consumed.carbs}/{goals.carbs}g</span>
              </div>
              <Progress value={(consumed.carbs / goals.carbs) * 100} className="h-1.5 bg-secondary [&>div]:bg-amber-500" />
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1.5 text-muted-foreground whitespace-nowrap">
                <span>Tłuszcz</span> <span>{consumed.fat}/{goals.fat}g</span>
              </div>
              <Progress value={(consumed.fat / goals.fat) * 100} className="h-1.5 bg-secondary [&>div]:bg-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kategorie posiłków */}
      <div className="space-y-4 mt-2">
        {MEAL_TYPES.map(mealType => {
          const typeMeals = meals.filter(m => m.meal_type === mealType);
          const typeCalories = typeMeals.reduce((sum, item) => sum + item.calories, 0);
          const isExpanded = expandedMeals[mealType];

          return (
            <div key={mealType} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden transition-all">
              {/* Klikalny nagłówek */}
              <div 
                className="flex justify-between items-center p-3.5 hover:bg-muted/30 cursor-pointer select-none transition-colors"
                onClick={() => toggleMeal(mealType)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  <h3 className="font-semibold text-base text-foreground tracking-tight">{mealType}</h3>
                </div>
                
                <div className="flex items-center gap-3">
                  {typeCalories > 0 && <span className="text-sm font-semibold text-muted-foreground">{typeCalories} kcal</span>}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" 
                    onClick={(e) => { e.stopPropagation(); navigate('/dodaj', { state: { defaultMeal: mealType } }); }}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Rozwinięta lista */}
              {isExpanded && (
                <div className="p-1.5 border-t border-border bg-muted/10">
                  {typeMeals.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs py-4 font-medium">Brak wpisów.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {typeMeals.map((meal) => (
                        <div key={meal.id} className="flex justify-between items-center p-3 hover:bg-muted/50 rounded-xl group transition-colors">
                          
                          {/* Edycja Inline czy zwykły podgląd? */}
                          {editingItemId === meal.id ? (
                            <div className="flex w-full items-center gap-2 bg-background p-1.5 rounded-lg border shadow-sm animate-in fade-in">
                              <input 
                                type="number" 
                                autoFocus
                                className="w-16 h-8 text-center font-bold text-sm bg-muted rounded-md border-none focus:outline-none focus:ring-2 focus:ring-primary/50" 
                                value={editGrams} 
                                onChange={(e) => setEditGrams(Number(e.target.value))}
                              />
                              <span className="text-xs font-semibold text-muted-foreground">g</span>
                              <div className="flex-1"></div>
                              <button onClick={() => handleSaveEdit(meal)} className="p-1.5 text-green-500 hover:bg-green-500/20 rounded-md transition-colors">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingItemId(null)} className="p-1.5 text-red-400 hover:bg-red-400/20 rounded-md transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 pr-2 min-w-0">
                                <p className="font-medium text-sm text-foreground capitalize truncate">{meal.name.toLowerCase()}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                  {meal.grams}g • B:{meal.protein} W:{meal.carbs} T:{meal.fat}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-semibold text-foreground text-sm whitespace-nowrap">{meal.calories} kcal</span>
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => { setEditingItemId(meal.id); setEditGrams(meal.grams); }} 
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteEntry(meal.id)} 
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      
                      {/* Zapisz jako posiłek */}
                      <div className="mt-1 pt-1">
                        <button 
                          onClick={() => handleSaveAsMeal(mealType, typeMeals)} 
                          className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:bg-primary/5 py-2.5 rounded-lg transition-colors"
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5" /> Zapisz jako gotowy posiłek
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL SZYBKIEGO DODAWANIA (QUICK ADD) */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-20 animate-in fade-in">
          <Card className="w-full max-w-sm shadow-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 border-primary/20">
            <CardHeader className="pb-4 border-b p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Zap className="w-5 h-5 text-primary fill-primary" />
                  Szybkie dodawanie
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsQuickAddOpen(false)} className="h-8 w-8 text-muted-foreground">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Co to było?</label>
                <input 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                  placeholder="np. Słodka bułka" 
                  value={quickAddForm.name} 
                  onChange={(e) => setQuickAddForm({...quickAddForm, name: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Kcal *</label>
                  <input 
                    type="number" 
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-lg font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                    placeholder="0" 
                    value={quickAddForm.calories} 
                    onChange={(e) => setQuickAddForm({...quickAddForm, calories: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Posiłek</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={quickAddForm.mealType}
                    onChange={(e) => setQuickAddForm({...quickAddForm, mealType: e.target.value})}
                  >
                    {MEAL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Białko (g)</label>
                  <input type="number" placeholder="0" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-center text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={quickAddForm.protein} onChange={(e) => setQuickAddForm({...quickAddForm, protein: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Węgle (g)</label>
                  <input type="number" placeholder="0" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-center text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={quickAddForm.carbs} onChange={(e) => setQuickAddForm({...quickAddForm, carbs: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Tłuszcz (g)</label>
                  <input type="number" placeholder="0" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-center text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={quickAddForm.fat} onChange={(e) => setQuickAddForm({...quickAddForm, fat: e.target.value})} />
                </div>
              </div>

              <Button 
                onClick={handleQuickAddSubmit}
                disabled={!quickAddForm.calories}
                className="w-full font-bold mt-4 h-11"
              >
                Zapisz do dziennika
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}