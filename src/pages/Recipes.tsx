import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, UtensilsCrossed, ChevronDown, ChevronUp, Edit3, Plus, ArrowLeft, Package } from "lucide-react";

export default function Recipes() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'meals' | 'products'>('meals');

  const [meals, setMeals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: '', default_portion_weight: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      
      const { data: mData } = await supabase.from('saved_meals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (mData) setMeals(mData);

      const { data: pData } = await supabase.from('verified_products').select('*').eq('user_id', user.id).order('name', { ascending: true });
      if (pData) setProducts(pData);
      
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleDeleteMeal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Na pewno chcesz usunąć ten przepis?")) return;
    setMeals(prev => prev.filter(m => m.id !== id));
    await supabase.from('saved_meals').delete().eq('id', id);
  };

  const toggleMealExpand = (id: string) => {
    setExpandedMealId(prev => (prev === id ? null : id));
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Na pewno chcesz usunąć ten produkt ze swojej bazy?")) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    await supabase.from('verified_products').delete().eq('id', id);
  };

  const openProductForm = (product?: any) => {
    if (product) {
      setEditingProductId(product.id);
      setProductForm({
        name: product.name,
        calories: product.calories.toString(),
        protein: (product.protein || 0).toString(),
        carbs: (product.carbs || 0).toString(),
        fat: (product.fat || 0).toString(),
        default_portion_weight: product.default_portion_weight ? product.default_portion_weight.toString() : ''
      });
    } else {
      setEditingProductId(null);
      setProductForm({ name: '', calories: '', protein: '', carbs: '', fat: '', default_portion_weight: '' });
    }
    setIsProductFormOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!user || !productForm.name || !productForm.calories) return;
    setIsSaving(true);

    const payload = {
      user_id: user.id,
      name: productForm.name,
      calories: Number(productForm.calories),
      protein: Number(productForm.protein),
      carbs: Number(productForm.carbs),
      fat: Number(productForm.fat),
      default_portion_weight: productForm.default_portion_weight ? Number(productForm.default_portion_weight) : null
    };

    if (editingProductId) {
      const { data } = await supabase.from('verified_products').update(payload).eq('id', editingProductId).select().single();
      if (data) setProducts(prev => prev.map(p => p.id === editingProductId ? data : p));
    } else {
      const { data } = await supabase.from('verified_products').insert([payload]).select().single();
      if (data) setProducts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }

    setIsSaving(false);
    setIsProductFormOpen(false);
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground min-h-[50vh] flex items-center justify-center">Wczytywanie Twojej bazy...</div>;

  // === WIDOK FORMULARZA PRODUKTU ===
  if (isProductFormOpen) {
    return (
      <div className="flex flex-col gap-4 max-w-md mx-auto pb-24 px-4 pt-6">
        <header className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setIsProductFormOpen(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{editingProductId ? 'Edytuj produkt' : 'Nowy produkt'}</h1>
        </header>

        <div className="space-y-5 bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="bg-primary/10 p-3.5 rounded-xl text-xs text-primary font-medium leading-relaxed">
            Pamiętaj: wartości makro i kalorii wpisujemy dla <strong>100 gramów</strong> produktu.
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nazwa produktu</label>
            <Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="np. Awokado Hass" className="h-11" />
          </div>
          
          <div className="flex gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-semibold text-muted-foreground">Kcal (w 100g)</label>
              <Input type="number" value={productForm.calories} onChange={e => setProductForm({...productForm, calories: e.target.value})} placeholder="0" className="h-11" />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-semibold text-primary">Waga 1 sztuki (g)</label>
              <Input type="number" value={productForm.default_portion_weight} onChange={e => setProductForm({...productForm, default_portion_weight: e.target.value})} placeholder="Opcjonalnie" className="h-11 border-primary/30 focus-visible:ring-primary/50" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 mt-2">
            <div className="space-y-1.5"><label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Białko (g)</label><Input type="number" value={productForm.protein} onChange={e => setProductForm({...productForm, protein: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Węgle (g)</label><Input type="number" value={productForm.carbs} onChange={e => setProductForm({...productForm, carbs: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tłuszcz (g)</label><Input type="number" value={productForm.fat} onChange={e => setProductForm({...productForm, fat: e.target.value})} /></div>
          </div>

          <div className="pt-3">
            <Button className="w-full h-12 text-base" onClick={handleSaveProduct} disabled={isSaving || !productForm.name || !productForm.calories}>
              {isSaving ? 'Zapisywanie...' : 'Zapisz do bazy'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // === WIDOK GŁÓWNY (Baza) ===
  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto pb-24 px-4 pt-6">
      <header className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Moja Baza</h1>
        <p className="text-muted-foreground mt-1 text-sm">Zarządzaj własnymi produktami i przepisami</p>
      </header>

      {/* PRZEŁĄCZNIK ZAKŁADEK */}
      <div className="flex bg-muted p-1 rounded-xl mb-2">
        <button
          onClick={() => setActiveTab('meals')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'meals' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <UtensilsCrossed className="w-4 h-4" /> Przepisy ({meals.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'products' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Package className="w-4 h-4" /> Produkty ({products.length})
        </button>
      </div>

      {/* ZAKŁADKA 1: PRZEPISY */}
      {activeTab === 'meals' && (
        <div className="flex flex-col gap-3">
          {meals.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-2xl border border-border">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-semibold text-foreground">Brak przepisów</h3>
              <p className="text-xs text-muted-foreground mt-1 px-4">Twórz przepisy na ekranie głównym, grupując zjedzone produkty z danej pory dnia.</p>
            </div>
          ) : (
            meals.map((meal) => {
              const isExpanded = expandedMealId === meal.id;
              const ingredients = meal.ingredients || [];

              return (
                <Card key={meal.id} className="overflow-hidden border-border shadow-sm bg-card rounded-2xl">
                  <div className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleMealExpand(meal.id)}>
                    <div className="flex-1 pr-2">
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        <span className="capitalize tracking-tight">{meal.name}</span>
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground mt-1 ml-6">{meal.total_grams}g • {ingredients.length} składników</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary text-sm">{meal.calories} kcal</span>
                      <button onClick={(e) => handleDeleteMeal(meal.id, e)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-muted/10 p-3.5 border-t border-border">
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center bg-background p-2.5 rounded-xl border border-border shadow-sm">
                        <div><p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Białko</p><p className="text-xs font-bold text-foreground">{meal.protein}g</p></div>
                        <div><p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Węgle</p><p className="text-xs font-bold text-foreground">{meal.carbs}g</p></div>
                        <div><p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Tłuszcz</p><p className="text-xs font-bold text-foreground">{meal.fat}g</p></div>
                      </div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Składniki:</h4>
                      <ul className="space-y-1.5">
                        {ingredients.map((ing: any, i: number) => (
                          <li key={i} className="flex justify-between items-center text-xs">
                            <span className="text-foreground capitalize font-medium">{ing.name}</span>
                            <div className="flex gap-2">
                              <span className="text-muted-foreground w-8 text-right">{ing.grams}g</span>
                              <span className="font-semibold text-foreground w-12 text-right">{ing.calories} kcal</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ZAKŁADKA 2: PRODUKTY */}
      {activeTab === 'products' && (
        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full border-dashed border-2 py-6 text-muted-foreground text-xs mb-1 border-border hover:bg-secondary hover:text-foreground transition-colors rounded-xl" onClick={() => openProductForm()}>
            <Plus className="w-4 h-4 mr-2" /> Dodaj nowy własny produkt
          </Button>

          {products.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-6 font-medium">Nie zapisałeś jeszcze żadnych własnych produktów.</p>
          ) : (
            products.map((p) => (
              <Card key={p.id} className="border-border shadow-sm bg-card hover:border-primary/40 transition-colors rounded-2xl">
                <CardContent className="p-3.5 flex justify-between items-center">
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="font-semibold text-sm capitalize truncate text-foreground tracking-tight">{p.name}</p>
                    <div className="flex gap-2 mt-1 items-center">
                      <span className="text-[11px] font-bold text-muted-foreground">{p.calories} kcal/100g</span>
                      {p.default_portion_weight && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">1 szt = {p.default_portion_weight}g</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openProductForm(p)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}