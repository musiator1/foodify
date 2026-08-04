import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, TrendingUp, Save, Scale, History, Trash2, Edit3, ChevronDown, ChevronUp } from "lucide-react";

export default function Progress() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [range, setRange] = useState<number>(7);
  
  const [caloriesData, setCaloriesData] = useState<any[]>([]);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [allWeightLogs, setAllWeightLogs] = useState<any[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  
  const [height, setHeight] = useState<number | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [dailyGoal, setDailyGoal] = useState(2500);
  const [avgCalories, setAvgCalories] = useState(0);
  
  const getToday = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [newWeight, setNewWeight] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);

      const { data: profile } = await supabase.from('profiles').select('height, daily_calories_goal').eq('id', user.id).single();
      if (profile) {
        setHeight(profile.height);
        setDailyGoal(profile.daily_calories_goal || 2500);
      }

      const { data: allLogs } = await supabase.from('weight_logs').select('*').eq('user_id', user.id).order('date', { ascending: false });
      if (allLogs) {
        setAllWeightLogs(allLogs);
        if (allLogs.length > 0) setLatestWeight(allLogs[0].weight);
        else setLatestWeight(null);
      }

      const today = new Date();
      const datesArray = Array.from({ length: range }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (range - 1 - i));
        return d.toISOString().split('T')[0];
      });
      setAllDates(datesArray);
      const startDate = datesArray[0];
      const endDate = datesArray[datesArray.length - 1];

      const { data: foodEntries } = await supabase.from('food_entries').select('date, calories').eq('user_id', user.id).gte('date', startDate).lte('date', endDate);

      const groupedCals = datesArray.map(dateStr => {
        const cals = (foodEntries || []).filter(e => e.date === dateStr).reduce((sum, e) => sum + e.calories, 0);
        return { date: dateStr, calories: cals };
      });
      setCaloriesData(groupedCals);

      const daysWithFood = groupedCals.filter(d => d.calories > 0);
      setAvgCalories(daysWithFood.length > 0 ? Math.round(daysWithFood.reduce((a, b) => a + b.calories, 0) / daysWithFood.length) : 0);

      const wPoints = (allLogs || []).map(log => ({
        xIndex: datesArray.indexOf(log.date),
        weight: log.weight,
        date: log.date
      })).filter(p => p.xIndex !== -1);
      setWeightData(wPoints);

      setLoading(false);
    }
    loadData();
  }, [user, range, refreshTrigger]);

  const handleSaveWeight = async () => {
    if (!user || !newWeight || !selectedDate) return;
    setIsSavingWeight(true);
    
    const weightNum = Number(newWeight);
    const existingLog = allWeightLogs.find(l => l.date === selectedDate);

    if (editingLogId) {
      await supabase.from('weight_logs').update({ weight: weightNum, date: selectedDate }).eq('id', editingLogId);
    } else if (existingLog) {
      if (window.confirm(`Masz już pomiar dla ${selectedDate} (${existingLog.weight} kg). Chcesz go nadpisać nową wagą?`)) {
        await supabase.from('weight_logs').update({ weight: weightNum }).eq('id', existingLog.id);
      } else {
        setIsSavingWeight(false);
        return;
      }
    } else {
      await supabase.from('weight_logs').insert({ user_id: user.id, weight: weightNum, date: selectedDate });
    }
    
    setNewWeight('');
    setEditingLogId(null);
    setSelectedDate(getToday());
    setIsSavingWeight(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditLog = (log: any) => {
    setEditingLogId(log.id);
    setSelectedDate(log.date);
    setNewWeight(log.weight.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm("Na pewno chcesz usunąć ten pomiar z historii?")) return;
    await supabase.from('weight_logs').delete().eq('id', id);
    setRefreshTrigger(prev => prev + 1);
  };

  const bmi = (height && latestWeight) ? (latestWeight / Math.pow(height / 100, 2)).toFixed(1) : null;
  let bmiColor = "text-foreground";
  if (bmi) {
    const num = Number(bmi);
    if (num < 18.5) bmiColor = "text-blue-500";
    else if (num < 25) bmiColor = "text-emerald-500";
    else if (num < 30) bmiColor = "text-amber-500";
    else bmiColor = "text-rose-500";
  }

  const maxCalories = Math.max(...caloriesData.map(d => d.calories), dailyGoal, 1);
  const minW = Math.min(...weightData.map(p => p.weight)) - 1;
  const maxW = Math.max(...weightData.map(p => p.weight)) + 1;
  const rangeW = maxW - minW || 1;
  
  // Bezpieczne pozycjonowanie na osi Y (margines od dołu i z góry)
  const pathD = weightData.map((p, i) => {
    const x = p.xIndex * (1000 / Math.max(1, allDates.length - 1));
    const y = 170 - ((p.weight - minW) / rangeW) * 140; 
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  if (loading) return <div className="p-4 text-center text-muted-foreground mt-20 font-medium">Analizowanie progresu...</div>;

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto pb-24 px-4 pt-5">
      <header className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Progres</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Analiza Twoich celów i wymiarów</p>
      </header>

      <div className="flex bg-muted p-1 rounded-xl mx-1">
        {[7, 14, 30].map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${range === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {r} dni
          </button>
        ))}
      </div>

      <Card className="shadow-sm border-border bg-card rounded-2xl">
        <CardHeader className="p-4 pb-3 border-b border-border bg-card rounded-t-2xl">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Aktualna waga
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Najnowsza waga</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{latestWeight ? `${latestWeight} kg` : '--'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Wskaźnik BMI</p>
              {bmi ? (
                <p className={`text-2xl font-bold tracking-tight ${bmiColor}`}>{bmi}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 leading-tight font-medium">Uzupełnij wzrost<br/>w Ustawieniach</p>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {editingLogId ? 'Edytujesz pomiar' : 'Dodaj pomiar wagi'}
            </h4>
            <div className="flex gap-3">
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 flex-1 bg-background border-border px-3 text-sm" />
              <Input type="number" step="0.1" placeholder="Waga (kg)" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="h-11 flex-1 w-24 bg-background font-bold text-center border-border" />
            </div>
            <div className="flex gap-2">
              {editingLogId && <Button variant="outline" className="flex-1 h-11 rounded-lg" onClick={() => { setEditingLogId(null); setNewWeight(''); setSelectedDate(getToday()); }}>Anuluj</Button>}
              <Button onClick={handleSaveWeight} disabled={isSavingWeight || !newWeight} className={`h-11 rounded-lg font-semibold ${editingLogId ? 'flex-1' : 'w-full'}`}>
                {isSavingWeight ? '...' : (editingLogId ? 'Zaktualizuj' : 'Zapisz wynik')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border bg-card rounded-2xl">
        <CardHeader className="p-4 pb-3 border-b border-border bg-card rounded-t-2xl">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> Zmiany wagi w czasie
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-44 relative">
            {weightData.length > 0 ? (
              <svg viewBox="0 0 1000 200" className="w-full h-full overflow-visible">
                <path d={pathD} fill="none" stroke="currentColor" strokeWidth="6" className="text-primary" strokeLinecap="round" strokeLinejoin="round" />
                {weightData.map((p, i) => {
                  const x = p.xIndex * (1000 / Math.max(1, allDates.length - 1));
                  const y = 170 - ((p.weight - minW) / rangeW) * 140;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="14" className="fill-background stroke-primary" strokeWidth="5" />
                      {range <= 14 && <text x={x} y={y - 22} textAnchor="middle" fontSize="35" fontWeight="bold" className="fill-foreground">{p.weight}</text>}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-medium text-muted-foreground">Brak pomiarów</div>
            )}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-4 uppercase font-bold tracking-wider">
            <span>{allDates[0]}</span>
            <span>{allDates[allDates.length - 1]}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border bg-card rounded-2xl">
        <CardHeader className="p-4 pb-3 border-b border-border flex flex-row justify-between items-center bg-card rounded-t-2xl">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Spożyte Kalorie
          </CardTitle>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Średnia</p>
            <p className="text-sm font-bold text-primary">{avgCalories} kcal</p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-44 flex items-end justify-between gap-[3px] relative mt-8">
            <div className="absolute w-full border-t-2 border-dashed border-destructive/50 z-0" style={{ bottom: `${(dailyGoal / maxCalories) * 100}%` }}>
              <span className="absolute -top-7 right-0 text-[11px] text-destructive font-bold bg-background px-2 py-1 rounded-md shadow-sm border border-border">Cel: {dailyGoal}</span>
            </div>
            {caloriesData.map((day, i) => {
              const heightPercent = (day.calories / maxCalories) * 100;
              const isOver = day.calories > dailyGoal;
              return (
                <div key={i} className="flex flex-col items-center flex-1 z-10 group relative h-full justify-end">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-foreground text-background text-[11px] font-semibold py-1.5 px-2.5 rounded-md pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                    {day.date}: {day.calories} kcal
                  </div>
                  <div className={`w-full rounded-t-sm transition-all ${isOver ? 'bg-destructive/80 hover:bg-destructive' : 'bg-primary/80 hover:bg-primary'}`} style={{ height: `${heightPercent}%`, minHeight: day.calories > 0 ? '4px' : '0px' }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-4 uppercase font-bold tracking-wider">
            <span>{allDates[0]}</span>
            <span>{allDates[allDates.length - 1]}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border bg-card rounded-2xl overflow-hidden transition-all">
        <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Pełna historia pomiarów</h3>
          </div>
          <div className="text-muted-foreground">
            {isHistoryExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>

        {isHistoryExpanded && (
          <div className="p-4 pt-3 border-t border-border bg-muted/5 space-y-2.5">
            {allWeightLogs.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-3 font-medium">Brak dodanych pomiarów.</p>
            ) : (
              allWeightLogs.map(log => (
                <div key={log.id} className={`flex justify-between items-center p-3.5 rounded-xl border transition-colors ${editingLogId === log.id ? 'bg-primary/5 border-primary/30' : 'bg-background border-border hover:bg-muted/40'}`}>
                  <div>
                    <p className="font-bold text-foreground text-base">{log.weight} <span className="text-xs text-muted-foreground font-normal">kg</span></p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{log.date}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleEditLog(log)} className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteLog(log.id)} className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}