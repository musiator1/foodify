import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Search, Check, Star, QrCode, Plus, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';

type TabType = 'global' | 'my_products' | 'my_meals';

export default function AddFood() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  
  const mealType = location.state?.defaultMeal || 'Śniadanie';
  
  const [activeTab, setActiveTab] = useState<TabType>('global'); 
  const [query, setQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [myMeals, setMyMeals] = useState<any[]>([]); 
  
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [inputMode, setInputMode] = useState<'grams' | 'portions'>('grams');
  const [grams, setGrams] = useState(100);
  const [portionCount, setPortionCount] = useState(1);
  const [portionWeight, setPortionWeight] = useState(100);
  const [saveAsVerified, setSaveAsVerified] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customFood, setCustomFood] = useState({ 
    name: '', kcal: '', protein: '', carbs: '', fat: '', default_portion: '' 
  });

  useEffect(() => {
    if (user) {
      supabase.from('verified_products').select('*').eq('user_id', user.id).order('name')
        .then(({ data }) => { if (data) setMyProducts(data); });
        
      supabase.from('saved_meals').select('*').eq('user_id', user.id).order('name')
        .then(({ data }) => { if (data) setMyMeals(data); });
    }
  }, [user]);

  const handleSearchGlobal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setGlobalResults([]);
    setErrorMsg(null);
    
    try {
      const safeQuery = encodeURIComponent(query);
      const res = await fetch(`https://pl.openfoodfacts.org/cgi/search.pl?search_terms=${safeQuery}&search_simple=1&action=process&json=1&page_size=15`);
      const data = await res.json();
      if (data.products && data.products.length === 0) setErrorMsg("Brak wyników w bazie globalnej.");
      setGlobalResults(data.products || []);
    } catch (error) {
      setErrorMsg("Problem z połączeniem z bazą globalną.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setIsScanning(false);
    setIsSearching(true);
    setQuery(barcode);
    setActiveTab('global'); 

    try {
      const res = await fetch(`https://pl.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        prepareProductForForm(data.product, 'global');
      } else {
        setErrorMsg("Nie znaleziono kodu kreskowego w bazie.");
      }
    } catch (error) {
      setErrorMsg("Błąd połączenia ze skanerem.");
    } finally {
      setIsSearching(false);
    }
  };

  const prepareProductForForm = (item: any, source: TabType) => {
    const isFromDb = source === 'my_products';
    const isMeal = source === 'my_meals';
    
    if (isFromDb && item.default_portion_weight) {
      setInputMode('portions');
      setPortionWeight(item.default_portion_weight);
      setPortionCount(1);
      setGrams(item.default_portion_weight);
    } else if (source === 'global' && item.serving_quantity) {
      setInputMode('grams');
      setPortionWeight(Number(item.serving_quantity));
      setGrams(100);
    } else if (isMeal) {
      setInputMode('portions');
      setPortionWeight(item.total_grams);
      setPortionCount(1);
    } else {
      setInputMode('grams');
      setPortionWeight(100);
      setGrams(100);
    }
    
    item.sourceType = source;
    setSelectedProduct(item);
    setSaveAsVerified(false);
  };

  const handleSaveCustomFood = async () => {
    if (!user || !customFood.name || !customFood.kcal) return;
    setIsSaving(true);

    const newProduct = {
      user_id: user.id, name: customFood.name, calories: Number(customFood.kcal),
      protein: Number(customFood.protein || 0), carbs: Number(customFood.carbs || 0), fat: Number(customFood.fat || 0),
      default_portion_weight: customFood.default_portion ? Number(customFood.default_portion) : null
    };

    const { data, error } = await supabase.from('verified_products').insert([newProduct]).select().single();
    if (!error && data) {
      setMyProducts(prev => [...prev, data]);
      setIsCreatingCustom(false);
      prepareProductForForm(data, 'my_products'); 
    }
    setIsSaving(false);
  };

  const getFinalGrams = () => inputMode === 'grams' ? grams : (portionCount * portionWeight);
  const calcMacro = (valuePer100g: number | undefined) => {
    if (!valuePer100g) return 0;
    return Math.round((valuePer100g / 100) * getFinalGrams());
  };

  const handleSaveToDiary = async () => {
    if (!user || !selectedProduct) return;
    setIsSaving(true);

    const isGlobal = selectedProduct.sourceType === 'global';
    const isMeal = selectedProduct.sourceType === 'my_meals';
    
    const name = selectedProduct.product_name_pl || selectedProduct.product_name || selectedProduct.name || 'Nieznany';
    const finalGrams = getFinalGrams();
    let finalCalories, finalProtein, finalCarbs, finalFat;

    if (isMeal) {
      const ratio = finalGrams / selectedProduct.total_grams;
      finalCalories = Math.round(selectedProduct.calories * ratio);
      finalProtein = Math.round(selectedProduct.protein * ratio);
      finalCarbs = Math.round(selectedProduct.carbs * ratio);
      finalFat = Math.round(selectedProduct.fat * ratio);
    } else {
      const cal100 = isGlobal ? (selectedProduct.nutriments?.['energy-kcal_100g'] || 0) : selectedProduct.calories;
      const pro100 = isGlobal ? (selectedProduct.nutriments?.proteins_100g || 0) : selectedProduct.protein;
      const carb100 = isGlobal ? (selectedProduct.nutriments?.carbohydrates_100g || 0) : selectedProduct.carbs;
      const fat100 = isGlobal ? (selectedProduct.nutriments?.fat_100g || 0) : selectedProduct.fat;

      finalCalories = calcMacro(cal100); finalProtein = calcMacro(pro100);
      finalCarbs = calcMacro(carb100); finalFat = calcMacro(fat100);
    }

    const { error } = await supabase.from('food_entries').insert({
      user_id: user.id, date: new Date().toISOString().split('T')[0], meal_type: mealType,
      name, grams: finalGrams, calories: finalCalories, protein: finalProtein, carbs: finalCarbs, fat: finalFat
    });

    if (isGlobal && saveAsVerified) {
      await supabase.from('verified_products').insert({
        user_id: user.id, api_id: selectedProduct._id || null, name,
        calories: Math.round(selectedProduct.nutriments?.['energy-kcal_100g'] || 0),
        protein: Math.round(selectedProduct.nutriments?.proteins_100g || 0),
        carbs: Math.round(selectedProduct.nutriments?.carbohydrates_100g || 0),
        fat: Math.round(selectedProduct.nutriments?.fat_100g || 0),
        default_portion_weight: inputMode === 'portions' ? portionWeight : null 
      });
    }

    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => navigate('/'), 600);
    } else {
      setIsSaving(false);
    }
  };

  const filteredMyProducts = myProducts.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const filteredMyMeals = myMeals.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen pb-20">
      {isScanning && <BarcodeScanner onResult={handleBarcodeScanned} onClose={() => setIsScanning(false)} />}

      {/* HEADER */}
      <header className="flex items-center gap-3 p-4 bg-card border-b border-border sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg text-foreground tracking-tight">
          {isCreatingCustom ? 'Nowy produkt' : `Dodaj do: ${mealType}`}
        </h1>
      </header>

      <div className="p-4">
        
        {/* WIDOK: TWORZENIE PRODUKTU */}
        {isCreatingCustom ? (
          <div className="space-y-5">
            <div className="bg-primary/10 p-3.5 rounded-xl text-xs text-primary font-medium leading-relaxed">
              Podaj makro dla <strong>100g</strong>. Opcjonalnie zdefiniuj wagę 1 sztuki, aby aplikacja mogła ją mnożyć (np. Jabłko - 150g).
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nazwa produktu</label>
              <Input placeholder="np. Banan surowy" value={customFood.name} onChange={e => setCustomFood({...customFood, name: e.target.value})} className="h-11" />
            </div>
            
            <div className="flex gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-muted-foreground">Kcal (w 100g)</label>
                <Input type="number" placeholder="0" value={customFood.kcal} onChange={e => setCustomFood({...customFood, kcal: e.target.value})} className="h-11" />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-primary">Waga 1 sztuki (g)</label>
                <Input type="number" placeholder="Opcjonalnie" value={customFood.default_portion} onChange={e => setCustomFood({...customFood, default_portion: e.target.value})} className="h-11 border-primary/30 focus-visible:ring-primary/50" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 mt-2">
              <div className="space-y-1.5"><label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Białko (g)</label><Input type="number" value={customFood.protein} onChange={e => setCustomFood({...customFood, protein: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Węgle (g)</label><Input type="number" value={customFood.carbs} onChange={e => setCustomFood({...customFood, carbs: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tłuszcz (g)</label><Input type="number" value={customFood.fat} onChange={e => setCustomFood({...customFood, fat: e.target.value})} /></div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setIsCreatingCustom(false)}>Anuluj</Button>
              <Button className="flex-1 h-11" onClick={handleSaveCustomFood} disabled={isSaving || !customFood.name || !customFood.kcal}>
                {isSaving ? 'Zapisywanie...' : 'Zapisz w bazie'}
              </Button>
            </div>
          </div>

        /* WIDOK: DODAWANIE DO DZIENNIKA */
        ) : selectedProduct ? (
          <div className="space-y-5">
            <Card className="shadow-sm border-border bg-card">
              <CardContent className="p-4">
                <h2 className="font-bold text-lg text-foreground capitalize leading-tight">
                  {(selectedProduct.product_name_pl || selectedProduct.product_name || selectedProduct.name).toLowerCase()}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {selectedProduct.sourceType === 'my_meals' 
                    ? `Cały przepis: ${selectedProduct.calories} kcal / ${selectedProduct.total_grams}g`
                    : `${Math.round(selectedProduct.sourceType === 'my_products' ? selectedProduct.calories : selectedProduct.nutriments?.['energy-kcal_100g'])} kcal w 100g`
                  }
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4 bg-card p-4 rounded-xl shadow-sm border border-border">
              {/* Przełącznik Waga / Porcje */}
              <div className="flex bg-muted p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInputMode('grams')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${inputMode === 'grams' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Waga (g)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('portions')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${inputMode === 'portions' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  {selectedProduct.sourceType === 'my_meals' ? 'Porcje przepisu' : 'Sztuki / Porcje'}
                </button>
              </div>

              {inputMode === 'grams' ? (
                <div className="flex items-center gap-3 pt-1">
                  <Input type="number" value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="text-xl w-32 font-bold h-14" />
                  <span className="font-medium text-muted-foreground text-base">gramów</span>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">Liczba sztuk/porcji:</span>
                    <Input type="number" step="0.5" value={portionCount} onChange={(e) => setPortionCount(Number(e.target.value))} className="w-28 text-center font-bold h-12 text-lg" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Waga 1 sztuki (g):</span>
                    <Input type="number" value={portionWeight} onChange={(e) => setPortionWeight(Number(e.target.value))} className="w-24 text-center h-9 text-xs bg-muted border-transparent" />
                  </div>
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-right text-xs font-bold text-primary">Przeliczona waga: {portionCount * portionWeight} g</p>
                  </div>
                </div>
              )}
            </div>

            {selectedProduct.sourceType === 'global' && (
              <div className="flex items-start space-x-3 pt-1 bg-primary/5 p-3 rounded-lg border border-primary/20">
                <Checkbox id="verify" checked={saveAsVerified} onCheckedChange={(c) => setSaveAsVerified(c === true)} className="mt-0.5" />
                <label htmlFor="verify" className="text-xs leading-snug cursor-pointer text-foreground font-medium">
                  Zapisz do <strong>Moich Produktów</strong>. Zapamięta również Twoją wagę porcji z formularza wyżej.
                </label>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1 h-12 text-base" onClick={() => setSelectedProduct(null)}>Wróć</Button>
              <Button className={`flex-1 h-12 text-base ${saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`} onClick={handleSaveToDiary} disabled={isSaving || saveSuccess}>
                {saveSuccess ? <><Check className="w-5 h-5 mr-2" /> Dodano!</> : 'Zapisz'}
              </Button>
            </div>
          </div>

        /* WIDOK: WYSZUKIWARKA I LISTY */
        ) : (
          <>
            {/* PRZEŁĄCZNIK 3 FILARÓW */}
            <div className="flex bg-muted p-1 rounded-lg mb-5">
              <button onClick={() => { setActiveTab('global'); setQuery(''); }} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'global' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                Baza Globalna
              </button>
              <button onClick={() => { setActiveTab('my_products'); setQuery(''); }} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'my_products' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                Moje Produkty
              </button>
              <button onClick={() => { setActiveTab('my_meals'); setQuery(''); }} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'my_meals' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                Przepisy
              </button>
            </div>

            <form onSubmit={activeTab === 'global' ? handleSearchGlobal : (e) => e.preventDefault()} className="flex gap-2 mb-5">
              {activeTab === 'global' && (
                <Button type="button" variant="outline" className="px-3 text-primary border-primary/20 hover:bg-primary/10" onClick={() => setIsScanning(true)}>
                  <QrCode className="w-5 h-5" />
                </Button>
              )}
              <Input 
                placeholder={activeTab === 'global' ? "Szukaj gotowców (np. Jogurt)..." : "Filtruj listę..."} 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 text-sm bg-card"
              />
              {activeTab === 'global' && (
                <Button type="submit" className="h-11 px-4" disabled={isSearching}><Search className="w-5 h-5" /></Button>
              )}
            </form>
            
            {errorMsg && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-lg mb-4 font-medium border border-destructive/20">
                <AlertTriangle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
              </div>
            )}

            {isSearching && <p className="text-center text-sm font-medium text-muted-foreground py-6">Wyszukiwanie w bazie...</p>}

            <div className="flex flex-col gap-2.5">
              
              {/* BAZA GLOBALNA */}
              {activeTab === 'global' && globalResults.map((p, index) => {
                const name = p.product_name_pl || p.product_name;
                if (!name) return null;
                const kcal100 = Math.round(p.nutriments?.['energy-kcal_100g'] || 0);

                return (
                  <Card key={p._id + index} className="cursor-pointer hover:border-primary/40 transition-colors border-border shadow-sm" onClick={() => prepareProductForForm(p, 'global')}>
                    <CardContent className="p-3.5 flex justify-between items-center bg-card rounded-xl">
                      <div className="max-w-[75%] pr-2">
                        <p className="font-semibold text-sm truncate capitalize text-foreground">{name.toLowerCase()}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{p.brands || 'Brak marki'}</p>
                      </div>
                      <div className="text-sm font-bold text-foreground">{kcal100} kcal</div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* MOJE PRODUKTY */}
              {activeTab === 'my_products' && (
                <>
                  <Button variant="outline" className="w-full border-dashed border-2 py-6 text-muted-foreground text-xs mb-2 hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setIsCreatingCustom(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Stwórz własny produkt surowy
                  </Button>
                  
                  {filteredMyProducts.length === 0 && <p className="text-center text-muted-foreground text-xs py-4 font-medium">Brak produktów. Dodaj je z bazy globalnej lub stwórz własny.</p>}
                  
                  {filteredMyProducts.map((p) => (
                    <Card key={p.id} className="cursor-pointer border-primary/20 hover:border-primary/40 transition-colors shadow-sm" onClick={() => prepareProductForForm(p, 'my_products')}>
                      <CardContent className="p-3.5 flex justify-between items-center bg-primary/5 rounded-xl">
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-2 capitalize text-foreground">
                            {p.name.toLowerCase()} <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                          </p>
                          {p.default_portion_weight && (
                            <p className="text-[11px] text-primary font-medium mt-0.5">1 sztuka = {p.default_portion_weight}g</p>
                          )}
                        </div>
                        <div className="text-sm font-bold text-foreground">{p.calories} kcal</div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* PRZEPISY */}
              {activeTab === 'my_meals' && (
                <>
                  {filteredMyMeals.length === 0 && <p className="text-center text-muted-foreground text-xs py-4 font-medium">Brak przepisów. Utwórz je zjadając produkty na ekranie głównym.</p>}
                  
                  {filteredMyMeals.map((m) => (
                    <Card key={m.id} className="cursor-pointer border-emerald-500/30 hover:border-emerald-500/60 transition-colors shadow-sm" onClick={() => prepareProductForForm(m, 'my_meals')}>
                      <CardContent className="p-3.5 flex justify-between items-center bg-emerald-500/10 rounded-xl">
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2 text-foreground capitalize">
                            {m.name.toLowerCase()} <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">Porcja z przepisu: {m.total_grams}g</p>
                        </div>
                        <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">{m.calories} kcal</div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}