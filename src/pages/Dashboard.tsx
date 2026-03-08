import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { formatSEK, getCurrentMonthYear, getAdjacentMonth } from '@/lib/format';
import {
  getDemoCategories,
  getDemoEntries,
  setDemoEntries,
  setDemoCategories,
  getDemoSavings,
  setDemoSavings,
} from '@/lib/mockData';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  PiggyBank,
  ArrowDownToLine,
  Copy,
  Pencil,
  Trash2,
  Plus,
  Wallet,
  TrendingUp,
  ShoppingCart,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import AppHeader from '@/components/AppHeader';
import MonthPicker from '@/components/MonthPicker';
import { useIsMobile } from '@/hooks/use-mobile';

type Category = Tables<'categories'>;
type MonthlyEntry = Tables<'monthly_entries'>;

const SPARMAL_KEY = 'ff_sparmal_goal';

function loadSparmal(): number {
  try {
    const s = localStorage.getItem(SPARMAL_KEY);
    return s ? Number(s) : 0;
  } catch {
    return 0;
  }
}
function saveSparmal(goal: number) {
  localStorage.setItem(SPARMAL_KEY, String(goal));
}

const Dashboard = () => {
  const { user, isDemo } = useAuth();
  const isMobile = useIsMobile();
  const [monthYear, setMonthYear] = useState(getCurrentMonthYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [savings, setSavings] = useState(0);
  const [editedLeftover, setEditedLeftover] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  // Savings goal (single global goal)
  const [sparmalGoal, setSparmalGoal] = useState(loadSparmal);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isDemo) {
      const allCats = getDemoCategories() as Category[];
      const allE = getDemoEntries() as MonthlyEntry[];
      setCategories(allCats);
      setEntries(allE.filter((e) => e.month_year === monthYear));
      setSavings(getDemoSavings());
      setLoading(false);
      return;
    }

    const [catRes, entRes, savRes] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase
        .from('monthly_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', monthYear),
      supabase.from('savings_total').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (entRes.data) setEntries(entRes.data);
    setSavings(savRes.data?.total_amount ?? 0);

    setLoading(false);
  }, [user, isDemo, monthYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getEntryAmount = (categoryId: string): number => {
    const entry = entries.find((e) => e.category_id === categoryId);
    return entry ? entry.actual_amount : 0;
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const fixedExpenseCategories = categories.filter((c) => c.type === 'fixed_expense');
  const variableExpenseCategories = categories.filter((c) => c.type === 'variable_expense');
  const savingsCategories = categories.filter((c) => c.type === 'savings');

  const totalIncome = incomeCategories.reduce((sum, c) => sum + getEntryAmount(c.id), 0);
  const totalFixedExpenses = fixedExpenseCategories.reduce(
    (sum, c) => sum + getEntryAmount(c.id),
    0,
  );
  const totalVariableExpenses = variableExpenseCategories.reduce(
    (sum, c) => sum + getEntryAmount(c.id),
    0,
  );
  const totalSavingsGoals = savingsCategories.reduce((sum, c) => sum + getEntryAmount(c.id), 0);
  const calculatedLeftover =
    totalIncome - totalFixedExpenses - totalVariableExpenses - totalSavingsGoals;

  useEffect(() => {
    setEditedLeftover(String(calculatedLeftover));
  }, [calculatedLeftover]);

  // Always sourced from savings_total.total_amount
  const cumulativeTotalSaved = savings;
  const sparmalPct =
    sparmalGoal > 0 ? Math.min(100, Math.round((cumulativeTotalSaved / sparmalGoal) * 100)) : 0;

  // Split fixed expenses into two columns if > 12 items
  const splitFixed = fixedExpenseCategories.length > 12;
  const fixedCol1 = splitFixed
    ? fixedExpenseCategories.slice(0, Math.ceil(fixedExpenseCategories.length / 2))
    : fixedExpenseCategories;
  const fixedCol2 = splitFixed
    ? fixedExpenseCategories.slice(Math.ceil(fixedExpenseCategories.length / 2))
    : [];

  const updateEntry = async (categoryId: string, amount: number) => {
    if (!user) return;
    if (isDemo) {
      const allE = getDemoEntries();
      const idx = allE.findIndex((e) => e.category_id === categoryId && e.month_year === monthYear);
      if (idx >= 0) {
        allE[idx] = { ...allE[idx], actual_amount: amount, updated_at: new Date().toISOString() };
      } else {
        allE.push({
          id: `e-${Date.now()}`,
          user_id: user.id,
          month_year: monthYear,
          category_id: categoryId,
          actual_amount: amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setDemoEntries(allE);
      fetchData();
      return;
    }
    const existing = entries.find((e) => e.category_id === categoryId);
    if (existing) {
      await supabase
        .from('monthly_entries')
        .update({ actual_amount: amount })
        .eq('id', existing.id);
    } else {
      await supabase.from('monthly_entries').insert({
        user_id: user.id,
        month_year: monthYear,
        category_id: categoryId,
        actual_amount: amount,
      });
    }
    fetchData();
  };

  const renameCategory = async (cat: Category, newName: string) => {
    if (!user || !newName.trim()) return;
    if (isDemo) {
      const cats = getDemoCategories();
      const idx = cats.findIndex((c) => c.id === cat.id);
      if (idx >= 0)
        cats[idx] = { ...cats[idx], name: newName.trim(), updated_at: new Date().toISOString() };
      setDemoCategories(cats);
      fetchData();
      return;
    }
    await supabase.from('categories').update({ name: newName.trim() }).eq('id', cat.id);
    fetchData();
  };

  const deleteCategory = async (cat: Category) => {
    if (isDemo) {
      setDemoCategories(getDemoCategories().filter((c) => c.id !== cat.id));
      setDemoEntries(getDemoEntries().filter((e) => e.category_id !== cat.id));
      toast.success('Kategori borttagen');
      fetchData();
      return;
    }
    await supabase.from('monthly_entries').delete().eq('category_id', cat.id);
    await supabase.from('categories').delete().eq('id', cat.id);
    toast.success('Kategori borttagen');
    fetchData();
  };

  const addEmptyRow = async (type: string) => {
    if (!user) return;
    const nameMap: Record<string, string> = {
      income: 'Ny inkomst',
      fixed_expense: 'Ny fast utgift',
      variable_expense: 'Ny rörlig utgift',
      savings: 'Nytt sparmål',
    };
    const name = nameMap[type] || 'Ny post';
    if (isDemo) {
      const cats = getDemoCategories();
      const newCat = {
        id: `c-${Date.now()}`,
        user_id: user.id,
        name,
        type,
        default_amount: 0,
        sort_order: cats.filter((c) => c.type === type).length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cats.push(newCat);
      setDemoCategories(cats);
      const allE = getDemoEntries();
      allE.push({
        id: `e-${Date.now()}`,
        user_id: user.id,
        month_year: monthYear,
        category_id: newCat.id,
        actual_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setDemoEntries(allE);
      fetchData();
      return;
    }
    const { data: newCat } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name,
        type,
        default_amount: 0,
        sort_order: categories.filter((c) => c.type === type).length,
      })
      .select()
      .single();
    if (newCat) {
      await supabase.from('monthly_entries').insert({
        user_id: user.id,
        month_year: monthYear,
        category_id: newCat.id,
        actual_amount: 0,
      });
    }
    fetchData();
  };

  const sweepToSavings = async () => {
    if (!user) return;
    const amount = Number(editedLeftover) || 0;
    if (amount <= 0) {
      toast.error('Inget att spara');
      return;
    }
    const newTotal = savings + amount;
    const nextMonth = getAdjacentMonth(monthYear, 1);
    if (isDemo) {
      setDemoSavings(newTotal);
      const allE = getDemoEntries();
      const cats = getDemoCategories();
      const nextEntries = allE.filter((e) => e.month_year === nextMonth);
      if (nextEntries.length === 0) {
        const fixedCats = cats.filter((c) => c.type !== 'variable_expense');
        const newEntries = fixedCats.map((c) => ({
          id: `e-${Date.now()}-${c.id}`,
          user_id: user.id,
          month_year: nextMonth,
          category_id: c.id,
          actual_amount: c.default_amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setDemoEntries([...allE, ...newEntries]);
      }
      toast.success(`${formatSEK(amount)} sparat! Nästa månad initierad.`);
      setSavings(newTotal);
      return;
    }
    const { data: existing } = await supabase
      .from('savings_total')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) {
      await supabase.from('savings_total').update({ total_amount: newTotal }).eq('id', existing.id);
    } else {
      await supabase.from('savings_total').insert({ user_id: user.id, total_amount: newTotal });
    }
    const { data: nextEntries } = await supabase
      .from('monthly_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('month_year', nextMonth)
      .limit(1);
    if (!nextEntries || nextEntries.length === 0) {
      const fixedCats = categories.filter((c) => c.type !== 'variable_expense');
      const inserts = fixedCats.map((c) => ({
        user_id: user.id,
        month_year: nextMonth,
        category_id: c.id,
        actual_amount: c.default_amount,
      }));
      if (inserts.length > 0) await supabase.from('monthly_entries').insert(inserts);
    }
    toast.success(`${formatSEK(amount)} sparat! Nästa månad initierad.`);
    await fetchData();
  };

  const populateFromPrevious = async () => {
    if (!user) return;
    const prevMonthYear = getAdjacentMonth(monthYear, -1);
    if (isDemo) {
      const allE = getDemoEntries();
      const prevEntries = allE.filter((e) => e.month_year === prevMonthYear);
      const currentEntries = allE.filter((e) => e.month_year === monthYear);
      if (prevEntries.length > 0) {
        const newEntries = prevEntries
          .filter((pe) => !currentEntries.some((ce) => ce.category_id === pe.category_id))
          .map((pe) => ({
            ...pe,
            id: `e-${Date.now()}-${pe.category_id}`,
            month_year: monthYear,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        setDemoEntries([...allE, ...newEntries]);
      } else {
        const cats = getDemoCategories();
        const newEntries = cats
          .filter((c) => c.type !== 'variable_expense')
          .filter((c) => !currentEntries.some((ce) => ce.category_id === c.id))
          .map((c) => ({
            id: `e-${Date.now()}-${c.id}`,
            user_id: user.id,
            month_year: monthYear,
            category_id: c.id,
            actual_amount: c.default_amount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        setDemoEntries([...allE, ...newEntries]);
      }
      toast.success('Ifyllt från föregående månad!');
      fetchData();
      return;
    }
    const { data: prevEntries } = await supabase
      .from('monthly_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', prevMonthYear);
    if (!prevEntries || prevEntries.length === 0) {
      const inserts = categories
        .filter((c) => c.type !== 'variable_expense')
        .map((c) => ({
          user_id: user.id,
          month_year: monthYear,
          category_id: c.id,
          actual_amount: c.default_amount,
        }));
      if (inserts.length > 0) await supabase.from('monthly_entries').insert(inserts);
    } else {
      const inserts = prevEntries.map((e) => ({
        user_id: user.id,
        month_year: monthYear,
        category_id: e.category_id,
        actual_amount: e.actual_amount,
      }));
      await supabase.from('monthly_entries').insert(inserts);
    }
    toast.success('Ifyllt från föregående månad!');
    fetchData();
  };

  const hasEntries = entries.length > 0;

  const rowProps = {
    renamingId,
    renameValue,
    setRenamingId,
    setRenameValue,
    renameCategory,
    setDeletingCat,
    getEntryAmount,
    updateEntry,
  };

  return (
    <div className="min-h-screen bg-background pb-36 lg:pb-8">
      <AppHeader />
      <main className="container mx-auto px-4 max-w-7xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <MonthPicker monthYear={monthYear} onChange={setMonthYear} />
          {hasEntries && (
            <Button
              onClick={populateFromPrevious}
              variant="outline"
              size="sm"
              className="gap-2 text-sm"
            >
              <Copy size={14} strokeWidth={1.5} />
              Fyll i från föregående
            </Button>
          )}
        </div>

        {/* Empty state */}
        {!hasEntries && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 space-y-5"
          >
            <p className="text-muted-foreground text-base">Inga poster för denna månad än.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={() => addEmptyRow('fixed_expense')}
                variant="default"
                size="default"
                className="gap-2"
              >
                <Plus size={16} strokeWidth={1.5} />
                Börja fylla i
              </Button>
              <Button
                onClick={populateFromPrevious}
                variant="outline"
                size="default"
                className="gap-2"
              >
                <Copy size={16} strokeWidth={1.5} />
                Fyll i från föregående
              </Button>
            </div>
          </motion.div>
        )}

        {/* Main content */}
        {(hasEntries || loading) && (
          <>
            {/* Desktop layout: col 1+2 = Fixed+Variable, col 3 = sidebar */}
            <div className="hidden lg:grid lg:grid-cols-[2fr_minmax(300px,1fr)] lg:gap-6">
              {/* LEFT AREA (col-span-1 of the 2-col grid, but internally wide) */}
              <div className="space-y-6">
                {/* Fixed Expenses – flows into 2 columns if >12 items */}
                <Section
                  title="Fasta utgifter"
                  icon={<Wallet size={16} />}
                  onAdd={() => addEmptyRow('fixed_expense')}
                >
                  <div className={splitFixed ? 'grid grid-cols-2 gap-x-3 gap-y-1' : 'space-y-1'}>
                    {fixedExpenseCategories.map((cat) => (
                      <EntryRow key={cat.id} cat={cat} {...rowProps} type="expense" />
                    ))}
                  </div>
                  <SummaryRow label="Totalt fasta" amount={totalFixedExpenses} type="expense" />
                  <AddButton onClick={() => addEmptyRow('fixed_expense')} />
                </Section>

                {/* Variable Expenses – below fixed */}
                <Section
                  title="Rörliga utgifter"
                  icon={<ShoppingCart size={16} />}
                  onAdd={() => addEmptyRow('variable_expense')}
                >
                  <div className="space-y-1">
                    {variableExpenseCategories.map((cat) => (
                      <EntryRow key={cat.id} cat={cat} {...rowProps} type="expense" />
                    ))}
                  </div>
                  <SummaryRow
                    label="Totalt rörliga"
                    amount={totalVariableExpenses}
                    type="expense"
                  />
                  <AddButton onClick={() => addEmptyRow('variable_expense')} />
                </Section>
              </div>

              {/* RIGHT SIDEBAR: Income + Savings + Sparmål + Balans */}
              <div className="space-y-6">
                <Section
                  title="Inkomster"
                  icon={<TrendingUp size={16} />}
                  onAdd={() => addEmptyRow('income')}
                >
                  <div className="space-y-1">
                    {incomeCategories.map((cat) => (
                      <EntryRow key={cat.id} cat={cat} {...rowProps} type="income" />
                    ))}
                  </div>
                  <SummaryRow label="Totalt inkomst" amount={totalIncome} type="income" />
                  <AddButton onClick={() => addEmptyRow('income')} />
                </Section>

                <Section
                  title="Månadssparande"
                  icon={<PiggyBank size={16} />}
                  onAdd={() => addEmptyRow('savings')}
                >
                  <div className="space-y-1">
                    {savingsCategories.map((cat) => (
                      <EntryRow key={cat.id} cat={cat} {...rowProps} type="savings" />
                    ))}
                  </div>
                  <SummaryRow label="Totalt sparande" amount={totalSavingsGoals} type="expense" />
                  <AddButton onClick={() => addEmptyRow('savings')} />
                </Section>

                {/* Sparmål progress card */}
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Target size={16} className="text-primary" />
                      Sparmål
                    </h3>
                    <button
                      onClick={() => {
                        setGoalDialogOpen(true);
                        setGoalInput(String(sparmalGoal || ''));
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      {sparmalGoal > 0 ? `Mål: ${formatSEK(sparmalGoal)}` : 'Sätt mål'}
                    </button>
                  </div>
                  {sparmalGoal > 0 && (
                    <div className="flex items-center gap-2">
                      <Progress value={sparmalPct} className="h-3 flex-1" />
                      <span className="text-sm text-muted-foreground tabular-nums w-12 text-right">
                        {sparmalPct}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <PiggyBank size={16} className="text-primary" />
                      <span className="text-base text-muted-foreground">Totalt sparat:</span>
                    </div>
                    <span className="text-lg font-bold text-emerald tabular-nums">
                      {formatSEK(cumulativeTotalSaved)}
                    </span>
                  </div>
                </div>

                {/* Balans & Sweep card – sticky */}
                <div className="glass-card p-4 space-y-3 sticky top-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
                      Balans
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums ${calculatedLeftover >= 0 ? 'text-emerald' : 'text-rose-expense'}`}
                    >
                      {formatSEK(calculatedLeftover)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editedLeftover}
                      onChange={(e) => setEditedLeftover(e.target.value)}
                      className="bg-secondary/50 max-w-[130px] h-9 text-base"
                    />
                    <Button onClick={sweepToSavings} size="sm" className="gap-2 flex-1 h-9">
                      <ArrowDownToLine size={14} strokeWidth={1.5} />
                      Sweep to Savings
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: single column */}
            <div className="lg:hidden space-y-5">
              <Section
                title="Fasta utgifter"
                icon={<Wallet size={15} />}
                onAdd={() => addEmptyRow('fixed_expense')}
              >
                <div className="space-y-0.5">
                  {fixedExpenseCategories.map((cat) => (
                    <EntryRow key={cat.id} cat={cat} {...rowProps} type="expense" />
                  ))}
                </div>
                <SummaryRow label="Totalt" amount={totalFixedExpenses} type="expense" />
                <AddButton onClick={() => addEmptyRow('fixed_expense')} />
              </Section>
              <Section
                title="Inkomster"
                icon={<TrendingUp size={15} />}
                onAdd={() => addEmptyRow('income')}
              >
                <div className="space-y-0.5">
                  {incomeCategories.map((cat) => (
                    <EntryRow key={cat.id} cat={cat} {...rowProps} type="income" />
                  ))}
                </div>
                <SummaryRow label="Totalt" amount={totalIncome} type="income" />
                <AddButton onClick={() => addEmptyRow('income')} />
              </Section>
              <Section
                title="Rörliga utgifter"
                icon={<ShoppingCart size={15} />}
                onAdd={() => addEmptyRow('variable_expense')}
              >
                <div className="space-y-0.5">
                  {variableExpenseCategories.map((cat) => (
                    <EntryRow key={cat.id} cat={cat} {...rowProps} type="expense" />
                  ))}
                </div>
                <SummaryRow label="Totalt" amount={totalVariableExpenses} type="expense" />
                <AddButton onClick={() => addEmptyRow('variable_expense')} />
              </Section>
              <Section
                title="Månadssparande"
                icon={<PiggyBank size={15} />}
                onAdd={() => addEmptyRow('savings')}
              >
                <div className="space-y-0.5">
                  {savingsCategories.map((cat) => (
                    <EntryRow key={cat.id} cat={cat} {...rowProps} type="savings" />
                  ))}
                </div>
                <SummaryRow label="Totalt" amount={totalSavingsGoals} type="expense" />
                <AddButton onClick={() => addEmptyRow('savings')} />
              </Section>

              {/* Mobile Sparmål */}
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target size={15} className="text-primary" />
                    Sparmål
                  </h3>
                  <button
                    onClick={() => {
                      setGoalDialogOpen(true);
                      setGoalInput(String(sparmalGoal || ''));
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {sparmalGoal > 0 ? `Mål: ${formatSEK(sparmalGoal)}` : 'Sätt mål'}
                  </button>
                </div>
                {sparmalGoal > 0 && (
                  <div className="flex items-center gap-2">
                    <Progress value={sparmalPct} className="h-2.5 flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                      {sparmalPct}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <PiggyBank size={15} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Totalt sparat:</span>
                  <span className="text-base font-bold text-emerald tabular-nums ml-auto">
                    {formatSEK(cumulativeTotalSaved)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Mobile sticky bottom BALANS */}
      {hasEntries && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
          <div className="container mx-auto px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Balans
              </span>
              <span
                className={`text-xl font-bold tabular-nums ${calculatedLeftover >= 0 ? 'text-emerald' : 'text-rose-expense'}`}
              >
                {formatSEK(calculatedLeftover)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editedLeftover}
                onChange={(e) => setEditedLeftover(e.target.value)}
                className="bg-secondary/50 max-w-[120px] h-9 text-sm"
              />
              <Button onClick={sweepToSavings} size="sm" className="gap-2 flex-1 h-9">
                <ArrowDownToLine size={14} strokeWidth={1.5} />
                Sweep to Savings
              </Button>
              <div className="flex items-center gap-1 ml-auto">
                <PiggyBank size={15} className="text-primary" />
                <span className="text-sm font-bold text-emerald tabular-nums">
                  {formatSEK(cumulativeTotalSaved)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <div className="fixed bottom-32 right-4 z-50 flex flex-col items-end gap-2">
          <AnimatePresence>
            {fabOpen && (
              <>
                {[
                  { label: 'Utgift', type: 'fixed_expense', icon: <Wallet size={15} /> },
                  { label: 'Inkomst', type: 'income', icon: <TrendingUp size={15} /> },
                  { label: 'Rörlig', type: 'variable_expense', icon: <ShoppingCart size={15} /> },
                  { label: 'Sparande', type: 'savings', icon: <PiggyBank size={15} /> },
                ].map((item, i) => (
                  <motion.button
                    key={item.type}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      addEmptyRow(item.type);
                      setFabOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-lg text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    {item.icon}
                    {item.label}
                  </motion.button>
                ))}
              </>
            )}
          </AnimatePresence>
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className="w-13 h-13 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          >
            <Plus
              size={22}
              strokeWidth={2}
              className={`transition-transform ${fabOpen ? 'rotate-45' : ''}`}
            />
          </button>
        </div>
      )}

      {/* Goal dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={(o) => !o && setGoalDialogOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sätt sparmål</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Målbelopp (kr)</label>
            <Input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="t.ex. 500000"
              className="h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={() => {
                const val = Number(goalInput) || 0;
                setSparmalGoal(val);
                saveSparmal(val);
                setGoalDialogOpen(false);
                toast.success('Sparmål uppdaterat!');
              }}
            >
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingCat} onOpenChange={(o) => !o && setDeletingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort &quot;{deletingCat?.name}&quot;? Alla poster tas
              också bort.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingCat) {
                  deleteCategory(deletingCat);
                  setDeletingCat(null);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────── */

const Section = ({
  title,
  icon,
  onAdd,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  onAdd: () => void;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between px-1 mb-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <button
        onClick={onAdd}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent"
        title="Lägg till"
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>
    </div>
    <div>{children}</div>
  </div>
);

const EntryRow = ({
  cat,
  type,
  renamingId,
  renameValue,
  setRenamingId,
  setRenameValue,
  renameCategory,
  setDeletingCat,
  getEntryAmount,
  updateEntry,
}: {
  cat: Category;
  type: 'income' | 'expense' | 'savings';
  renamingId: string | null;
  renameValue: string;
  setRenamingId: (id: string | null) => void;
  setRenameValue: (v: string) => void;
  renameCategory: (cat: Category, name: string) => void;
  setDeletingCat: (cat: Category | null) => void;
  getEntryAmount: (id: string) => number;
  updateEntry: (id: string, amount: number) => void;
}) => {
  const amount = getEntryAmount(cat.id);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(amount));
  const isRenaming = renamingId === cat.id;

  useEffect(() => {
    setValue(String(amount));
  }, [amount]);

  const handleBlur = () => {
    setEditing(false);
    const num = Number(value) || 0;
    if (num !== amount) updateEntry(cat.id, num);
  };

  return (
    <div className="glass-card px-3 py-2.5 flex items-center justify-between group min-h-[42px]">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => {
              renameCategory(cat, renameValue);
              setRenamingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                renameCategory(cat, renameValue);
                setRenamingId(null);
              }
              if (e.key === 'Escape') setRenamingId(null);
            }}
            autoFocus
            className="h-8 text-base bg-secondary/50 max-w-[180px]"
          />
        ) : (
          <span className="text-base truncate text-foreground">{cat.name}</span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => {
              setRenamingId(cat.id);
              setRenameValue(cat.name);
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
          >
            <Pencil size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setDeletingCat(cat)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded hover:bg-accent"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {editing ? (
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          autoFocus
          className="w-28 text-right bg-secondary/50 h-8 text-base"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`text-base font-bold tabular-nums cursor-pointer hover:opacity-70 transition-opacity whitespace-nowrap ${
            type === 'income'
              ? 'text-emerald'
              : type === 'savings'
                ? 'text-primary'
                : amount > 0
                  ? 'text-rose-expense'
                  : 'text-muted-foreground'
          }`}
        >
          {amount > 0 ? formatSEK(amount) : '—'}
        </button>
      )}
    </div>
  );
};

const AddButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1.5 px-3 py-2 rounded hover:bg-accent w-full"
  >
    <Plus size={14} strokeWidth={1.5} />
    Lägg till
  </button>
);

const SummaryRow = ({
  label,
  amount,
  type,
}: {
  label: string;
  amount: number;
  type: 'income' | 'expense';
}) => (
  <div className="flex items-center justify-between px-3 py-2 mt-3 border-t border-border">
    <span className="text-base font-medium text-muted-foreground">{label}</span>
    <span
      className={`text-base font-bold tabular-nums ${type === 'income' ? 'text-emerald' : 'text-rose-expense'}`}
    >
      {formatSEK(amount)}
    </span>
  </div>
);

export default Dashboard;
