-- Assign admin role to gillesmich@yahoo.fr
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'gillesmich@yahoo.fr';
  
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Create function to get shared API keys from admin
CREATE OR REPLACE FUNCTION public.get_shared_api_keys()
RETURNS TABLE (
  openai_key text,
  elevenlabs_key text,
  lovable_key text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT user_id INTO admin_user_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    (SELECT key_value FROM public.api_keys WHERE user_id = admin_user_id AND name ILIKE '%openai%' AND is_active = true LIMIT 1) as openai_key,
    (SELECT key_value FROM public.api_keys WHERE user_id = admin_user_id AND name ILIKE '%eleven%' AND is_active = true LIMIT 1) as elevenlabs_key,
    (SELECT key_value FROM public.api_keys WHERE user_id = admin_user_id AND name ILIKE '%lovable%' AND is_active = true LIMIT 1) as lovable_key;
END;
$$;