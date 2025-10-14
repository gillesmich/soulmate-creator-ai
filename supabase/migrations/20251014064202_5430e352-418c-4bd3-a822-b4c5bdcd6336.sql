-- Step 2: Grant admin role to gillesmich@yahoo.fr
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get user_id from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'gillesmich@yahoo.fr';

  -- Only proceed if user exists
  IF admin_user_id IS NOT NULL THEN
    -- Insert admin role (on conflict do nothing in case already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role successfully granted to gillesmich@yahoo.fr (user_id: %)', admin_user_id;
  ELSE
    RAISE NOTICE 'User gillesmich@yahoo.fr not found in database yet. Please run this migration again after the user signs up.';
  END IF;
END $$;