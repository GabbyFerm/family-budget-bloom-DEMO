-- Recalculate savings_total while preserving swept leftovers.
CREATE OR REPLACE FUNCTION public.recalculate_savings_total_for_user(
  _user_id uuid,
  _previous_savings_sum numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_savings_sum numeric := 0;
  v_previous_savings_sum numeric := 0;
  v_existing_row_id uuid;
  v_existing_total numeric := 0;
  v_sweep_component numeric := 0;
  v_new_total numeric := 0;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(me.actual_amount), 0)
  INTO v_current_savings_sum
  FROM public.monthly_entries me
  JOIN public.categories c ON c.id = me.category_id
  WHERE me.user_id = _user_id
    AND c.type = 'savings';

  v_previous_savings_sum := COALESCE(_previous_savings_sum, v_current_savings_sum);

  SELECT id, total_amount
  INTO v_existing_row_id, v_existing_total
  FROM public.savings_total
  WHERE user_id = _user_id
  LIMIT 1;

  v_sweep_component := GREATEST(COALESCE(v_existing_total, 0) - v_previous_savings_sum, 0);
  v_new_total := v_current_savings_sum + v_sweep_component;

  IF v_existing_row_id IS NULL THEN
    INSERT INTO public.savings_total (user_id, total_amount)
    VALUES (_user_id, v_new_total);
  ELSE
    UPDATE public.savings_total
    SET total_amount = v_new_total,
        updated_at = now()
    WHERE id = v_existing_row_id;
  END IF;
END;
$$;

-- Trigger handler for monthly entries and savings category type changes.
CREATE OR REPLACE FUNCTION public.sync_savings_total_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_sum numeric := 0;
  v_previous_sum numeric := NULL;
  v_delta numeric := 0;
  v_old_is_savings boolean := false;
  v_new_is_savings boolean := false;
  v_category_entries_sum numeric := 0;
BEGIN
  IF TG_TABLE_NAME = 'monthly_entries' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);

    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      SELECT EXISTS(
        SELECT 1 FROM public.categories WHERE id = OLD.category_id AND type = 'savings'
      ) INTO v_old_is_savings;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      SELECT EXISTS(
        SELECT 1 FROM public.categories WHERE id = NEW.category_id AND type = 'savings'
      ) INTO v_new_is_savings;
    END IF;

    IF TG_OP = 'INSERT' THEN
      v_delta := CASE WHEN v_new_is_savings THEN NEW.actual_amount ELSE 0 END;
    ELSIF TG_OP = 'DELETE' THEN
      v_delta := CASE WHEN v_old_is_savings THEN -OLD.actual_amount ELSE 0 END;
    ELSE
      v_delta :=
        (CASE WHEN v_new_is_savings THEN NEW.actual_amount ELSE 0 END) -
        (CASE WHEN v_old_is_savings THEN OLD.actual_amount ELSE 0 END);
    END IF;

    SELECT COALESCE(SUM(me.actual_amount), 0)
    INTO v_current_sum
    FROM public.monthly_entries me
    JOIN public.categories c ON c.id = me.category_id
    WHERE me.user_id = v_user_id
      AND c.type = 'savings';

    v_previous_sum := v_current_sum - v_delta;
    PERFORM public.recalculate_savings_total_for_user(v_user_id, v_previous_sum);

    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'categories' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);

    IF TG_OP = 'INSERT' AND NEW.type = 'savings' THEN
      SELECT COALESCE(SUM(actual_amount), 0)
      INTO v_category_entries_sum
      FROM public.monthly_entries
      WHERE user_id = v_user_id
        AND category_id = NEW.id;

      SELECT COALESCE(SUM(me.actual_amount), 0)
      INTO v_current_sum
      FROM public.monthly_entries me
      JOIN public.categories c ON c.id = me.category_id
      WHERE me.user_id = v_user_id
        AND c.type = 'savings';

      v_previous_sum := v_current_sum - v_category_entries_sum;
      PERFORM public.recalculate_savings_total_for_user(v_user_id, v_previous_sum);
      RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND (OLD.type IS DISTINCT FROM NEW.type) THEN
      SELECT COALESCE(SUM(actual_amount), 0)
      INTO v_category_entries_sum
      FROM public.monthly_entries
      WHERE user_id = v_user_id
        AND category_id = NEW.id;

      SELECT COALESCE(SUM(me.actual_amount), 0)
      INTO v_current_sum
      FROM public.monthly_entries me
      JOIN public.categories c ON c.id = me.category_id
      WHERE me.user_id = v_user_id
        AND c.type = 'savings';

      IF OLD.type = 'savings' AND NEW.type <> 'savings' THEN
        v_previous_sum := v_current_sum + v_category_entries_sum;
      ELSIF OLD.type <> 'savings' AND NEW.type = 'savings' THEN
        v_previous_sum := v_current_sum - v_category_entries_sum;
      ELSE
        v_previous_sum := v_current_sum;
      END IF;

      PERFORM public.recalculate_savings_total_for_user(v_user_id, v_previous_sum);
      RETURN NEW;
    END IF;

    RETURN COALESCE(NEW, OLD);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_savings_total_from_entries ON public.monthly_entries;
CREATE TRIGGER trg_sync_savings_total_from_entries
AFTER INSERT OR UPDATE OR DELETE ON public.monthly_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_savings_total_trigger();

DROP TRIGGER IF EXISTS trg_sync_savings_total_from_categories ON public.categories;
CREATE TRIGGER trg_sync_savings_total_from_categories
AFTER INSERT OR UPDATE OF type ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.sync_savings_total_trigger();

-- Backfill/create missing savings_total rows for users with existing data.
WITH impacted_users AS (
  SELECT DISTINCT user_id FROM public.monthly_entries
  UNION
  SELECT DISTINCT user_id FROM public.savings_total
)
SELECT public.recalculate_savings_total_for_user(user_id)
FROM impacted_users;