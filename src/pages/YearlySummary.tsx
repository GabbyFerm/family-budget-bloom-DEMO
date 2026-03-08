import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { formatSEK } from '@/lib/format';
import { getDemoCategories, getDemoEntries, getDemoSavings } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import AppHeader from '@/components/AppHeader';

type Category = Tables<'categories'>;
type MonthlyEntry = Tables<'monthly_entries'>;

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Maj',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dec',
];
const SPARMAL_KEY = 'ff_sparmal_goal';

const YearlySummary = () => {
  const { user, isDemo } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [savings, setSavings] = useState(0);
  const [loading, setLoading] = useState(true);

  const sparmalGoal = useMemo(() => {
    try {
      const s = localStorage.getItem(SPARMAL_KEY);
      return s ? Number(s) : 0;
    } catch {
      return 0;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isDemo) {
      const allCats = getDemoCategories() as Category[];
      const allE = getDemoEntries() as MonthlyEntry[];
      setCategories(allCats);
      setEntries(allE.filter((e) => e.month_year.startsWith(String(year))));
      setSavings(getDemoSavings());
      setLoading(false);
      return;
    }

    const [catRes, entRes, savRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('type')
        .order('sort_order'),
      supabase
        .from('monthly_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('month_year', `${year}-01`)
        .lte('month_year', `${year}-12`),
      supabase.from('savings_total').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (entRes.data) setEntries(entRes.data);
    setSavings(savRes.data?.total_amount ?? 0);
    setLoading(false);
  }, [user, isDemo, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAmount = (categoryId: string, month: number): number | null => {
    const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
    const entry = entries.find((e) => e.category_id === categoryId && e.month_year === monthYear);
    return entry ? entry.actual_amount : null;
  };

  const getMonthTotal = useCallback(
    (month: number, type: string): number => {
      const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
      return entries
        .filter((e) => e.month_year === monthYear)
        .filter((e) => {
          const cat = categories.find((c) => c.id === e.category_id);
          return cat?.type === type;
        })
        .reduce((sum, e) => sum + e.actual_amount, 0);
    },
    [year, entries, categories],
  );

  const cumulativeTotalSaved = useMemo(() => savings, [savings]);

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const fixedExpenseCategories = categories.filter((c) => c.type === 'fixed_expense');
  const variableExpenseCategories = categories.filter((c) => c.type === 'variable_expense');
  const savingsCategories = categories.filter((c) => c.type === 'savings');

  const chartData = useMemo(() => {
    return MONTH_LABELS.map((label, mi) => {
      const income = getMonthTotal(mi, 'income');
      const fixed = getMonthTotal(mi, 'fixed_expense');
      const variable = getMonthTotal(mi, 'variable_expense');
      const sav = getMonthTotal(mi, 'savings');
      const expenses = fixed + variable + sav;
      const net = income - expenses;
      return { month: label, income, expenses, net, savings: sav };
    });
  }, [getMonthTotal]);

  const savingsChartData = useMemo(() => {
    let cumulative = 0;
    return chartData.map((d) => {
      cumulative += d.savings;
      return {
        month: d.month,
        savings: cumulative,
        goal: sparmalGoal > 0 ? sparmalGoal : undefined,
      };
    });
  }, [chartData, sparmalGoal]);

  const renderSection = (title: string, cats: Category[], colorClass: string) => (
    <>
      <tr className="border-b border-border">
        <td
          colSpan={13}
          className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/30"
        >
          {title}
        </td>
      </tr>
      {cats.map((cat) => (
        <tr
          key={cat.id}
          className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
        >
          <td className="px-3 py-2 text-sm font-medium whitespace-nowrap sticky left-0 bg-card/90 backdrop-blur-sm z-10">
            {cat.name}
          </td>
          {MONTH_LABELS.map((_, mi) => {
            const amount = getAmount(cat.id, mi);
            return (
              <td
                key={mi}
                className={`px-2 py-2 text-xs text-right tabular-nums ${amount !== null ? colorClass : 'text-muted-foreground/30'}`}
              >
                {amount !== null ? formatSEK(amount) : '–'}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );

  const tealColor = 'hsl(166, 46%, 52%)';
  const coralColor = 'hsl(350, 80%, 72%)';

  const goalProgress =
    sparmalGoal > 0 ? Math.min(100, (cumulativeTotalSaved / sparmalGoal) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Årsöversikt</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft size={18} strokeWidth={1.5} />
            </Button>
            <span className="text-lg font-bold tabular-nums min-w-[60px] text-center">{year}</span>
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight size={18} strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Income vs Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Inkomster vs Utgifter
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => formatSEK(value)}
                />
                <Bar dataKey="income" name="Inkomst" fill={tealColor} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Utgifter" fill={coralColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Balance Trend */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Balanstrend
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => formatSEK(value)}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Netto"
                  stroke={tealColor}
                  strokeWidth={2}
                  dot={{ r: 4, fill: tealColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Savings Growth with Goal */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-5 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Spartillväxt
              </h3>
              <div className="flex items-center gap-3">
                {sparmalGoal > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Target size={14} strokeWidth={1.5} className="text-primary" />
                    <span className="text-muted-foreground">Mål:</span>
                    <span className="font-bold">{formatSEK(sparmalGoal)}</span>
                  </div>
                )}
                <span className="text-sm font-bold text-emerald">
                  {formatSEK(cumulativeTotalSaved)}
                </span>
              </div>
            </div>

            {sparmalGoal > 0 && (
              <div className="mb-4 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Totalt sparat vs Mål</span>
                  <span className="font-semibold">{goalProgress.toFixed(0)}%</span>
                </div>
                <Progress value={goalProgress} className="h-2.5" />
              </div>
            )}

            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={savingsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => formatSEK(value)}
                />
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tealColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={tealColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="savings"
                  name="Sparande"
                  stroke={tealColor}
                  strokeWidth={2}
                  fill="url(#savingsGrad)"
                />
                {sparmalGoal > 0 && (
                  <Area
                    type="monotone"
                    dataKey="goal"
                    name="Mål"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="6 3"
                    fill="none"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Excel-style grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-card/90 backdrop-blur-sm z-10">
                    Kategori
                  </th>
                  {MONTH_LABELS.map((m) => (
                    <th
                      key={m}
                      className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderSection('Inkomster', incomeCategories, 'text-emerald')}
                {renderSection('Fasta utgifter', fixedExpenseCategories, 'text-rose-expense')}
                {variableExpenseCategories.length > 0 &&
                  renderSection('Rörliga utgifter', variableExpenseCategories, 'text-rose-expense')}
                {savingsCategories.length > 0 &&
                  renderSection('Sparande', savingsCategories, 'text-primary')}

                {/* Summary rows */}
                <tr className="border-t-2 border-border bg-secondary/20">
                  <td className="px-3 py-2 text-sm font-bold sticky left-0 bg-secondary/20 z-10">
                    Netto per månad
                  </td>
                  {MONTH_LABELS.map((_, mi) => {
                    const income = getMonthTotal(mi, 'income');
                    const fixed = getMonthTotal(mi, 'fixed_expense');
                    const variable = getMonthTotal(mi, 'variable_expense');
                    const sav = getMonthTotal(mi, 'savings');
                    const net = income - fixed - variable - sav;
                    const hasData = income > 0 || fixed > 0 || variable > 0 || sav > 0;
                    return (
                      <td
                        key={mi}
                        className={`px-2 py-2 text-xs text-right font-bold tabular-nums ${
                          !hasData
                            ? 'text-muted-foreground/30'
                            : net >= 0
                              ? 'text-emerald'
                              : 'text-rose-expense'
                        }`}
                      >
                        {hasData ? formatSEK(net) : '–'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default YearlySummary;
