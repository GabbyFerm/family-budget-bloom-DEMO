
-- Create households table
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Mitt hushåll',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Create household_members table
CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Security definer function: get all user IDs in same household
CREATE OR REPLACE FUNCTION public.get_household_user_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hm2.user_id
  FROM household_members hm1
  JOIN household_members hm2 ON hm1.household_id = hm2.household_id
  WHERE hm1.user_id = _user_id
  UNION
  SELECT _user_id
$$;

-- RLS for households: members can view their households
CREATE POLICY "Members can view own households" ON public.households
  FOR SELECT TO authenticated
  USING (id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- RLS for household_members: members can view co-members
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- Update categories RLS: allow viewing household members' data
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view household categories" ON public.categories
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT public.get_household_user_ids(auth.uid())));

-- Update monthly_entries RLS: allow viewing household members' data
DROP POLICY IF EXISTS "Users can view own entries" ON public.monthly_entries;
CREATE POLICY "Users can view household entries" ON public.monthly_entries
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT public.get_household_user_ids(auth.uid())));

-- Update savings_total RLS: allow viewing household members' data
DROP POLICY IF EXISTS "Users can view own savings" ON public.savings_total;
CREATE POLICY "Users can view household savings" ON public.savings_total
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT public.get_household_user_ids(auth.uid())));
