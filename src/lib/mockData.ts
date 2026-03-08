import { Tables } from '@/integrations/supabase/types';

export const DEMO_USER_ID = 'demo-00000000-0000-0000-0000-000000000001';
export const DEMO_EMAIL = 'demo@portfolio.com';
export const DEMO_PASSWORD = 'demo123';

type DemoCategory = Tables<'categories'>;
type DemoEntry = Tables<'monthly_entries'>;

const ts = new Date().toISOString();

export const INITIAL_CATEGORIES = [
  {
    id: 'c1',
    user_id: DEMO_USER_ID,
    name: 'Lön (efter skatt)',
    type: 'income',
    default_amount: 35000,
    sort_order: 0,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c2',
    user_id: DEMO_USER_ID,
    name: 'Sidoinkomst',
    type: 'income',
    default_amount: 5000,
    sort_order: 1,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c3',
    user_id: DEMO_USER_ID,
    name: 'Hyra',
    type: 'fixed_expense',
    default_amount: 12000,
    sort_order: 0,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c4',
    user_id: DEMO_USER_ID,
    name: 'El & Vatten',
    type: 'fixed_expense',
    default_amount: 1500,
    sort_order: 1,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c5',
    user_id: DEMO_USER_ID,
    name: 'Försäkringar',
    type: 'fixed_expense',
    default_amount: 2000,
    sort_order: 2,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c6',
    user_id: DEMO_USER_ID,
    name: 'Internet & Telefon',
    type: 'fixed_expense',
    default_amount: 800,
    sort_order: 3,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c7',
    user_id: DEMO_USER_ID,
    name: 'Mat & Hushåll',
    type: 'variable_expense',
    default_amount: 6000,
    sort_order: 0,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c8',
    user_id: DEMO_USER_ID,
    name: 'Transport',
    type: 'variable_expense',
    default_amount: 2000,
    sort_order: 1,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c9',
    user_id: DEMO_USER_ID,
    name: 'Nöje & Fritid',
    type: 'variable_expense',
    default_amount: 3000,
    sort_order: 2,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c10',
    user_id: DEMO_USER_ID,
    name: 'Spara sommarstuga',
    type: 'savings',
    default_amount: 3000,
    sort_order: 0,
    created_at: ts,
    updated_at: ts,
  },
  {
    id: 'c11',
    user_id: DEMO_USER_ID,
    name: 'Spara hus',
    type: 'savings',
    default_amount: 5000,
    sort_order: 1,
    created_at: ts,
    updated_at: ts,
  },
];

const variations: Record<string, number[]> = {
  c1: [35000, 35000, 35000],
  c2: [4500, 5200, 5000],
  c3: [12000, 12000, 12000],
  c4: [1400, 1600, 1500],
  c5: [2000, 2000, 2000],
  c6: [800, 800, 800],
  c7: [5800, 6200, 5500],
  c8: [1800, 2200, 1900],
  c9: [2500, 3500, 2800],
  c10: [3000, 3000, 3000],
  c11: [5000, 5000, 5000],
};

function generateEntries(): DemoEntry[] {
  const entries: DemoEntry[] = [];
  const months = ['2026-01', '2026-02', '2026-03'];
  months.forEach((month, mi) => {
    Object.entries(variations).forEach(([catId, amounts]) => {
      entries.push({
        id: `e-${month}-${catId}`,
        user_id: DEMO_USER_ID,
        month_year: month,
        category_id: catId,
        actual_amount: amounts[mi],
        created_at: ts,
        updated_at: ts,
      });
    });
  });
  return entries;
}

export const INITIAL_ENTRIES = generateEntries();
export const INITIAL_SAVINGS = 15000;

// localStorage helpers
const KEYS = {
  categories: 'ff_demo_categories',
  entries: 'ff_demo_entries',
  savings: 'ff_demo_savings',
};

export function demoLoad<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

export function demoSave<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getDemoCategories(): DemoCategory[] {
  return demoLoad(KEYS.categories, INITIAL_CATEGORIES);
}

export function setDemoCategories(cats: DemoCategory[]) {
  demoSave(KEYS.categories, cats);
}

export function getDemoEntries(): DemoEntry[] {
  return demoLoad(KEYS.entries, INITIAL_ENTRIES);
}

export function setDemoEntries(entries: DemoEntry[]) {
  demoSave(KEYS.entries, entries);
}

export function getDemoSavings(): number {
  return demoLoad(KEYS.savings, INITIAL_SAVINGS);
}

export function setDemoSavings(amount: number) {
  demoSave(KEYS.savings, amount);
}
