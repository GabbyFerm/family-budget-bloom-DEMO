import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_ENABLED = import.meta.env.VITE_USE_SUPABASE === 'true';

export const hasSupabase = SUPABASE_ENABLED && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient<Database> | null = hasSupabase
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
