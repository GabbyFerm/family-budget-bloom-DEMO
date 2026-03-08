
-- Create a trigger function that auto-assigns new users to a default household
CREATE OR REPLACE FUNCTION public.handle_new_user_household()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid;
BEGIN
  -- Create a default household for the new user
  INSERT INTO public.households (name)
  VALUES ('Mitt hushåll')
  RETURNING id INTO v_household_id;

  -- Add the user as a member
  INSERT INTO public.household_members (household_id, user_id)
  VALUES (v_household_id, NEW.id);

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users on insert
CREATE TRIGGER on_auth_user_created_household
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_household();
