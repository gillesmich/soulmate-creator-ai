-- Step 1: Add 'admin' to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'admin';
  END IF;
END $$;

-- Update check_usage_limit function to allow unlimited access for admins
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  _user_id uuid,
  _operation_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subscription record;
  _usage record;
  _is_admin boolean;
BEGIN
  -- Check if user is admin (unlimited access)
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO _is_admin;

  IF _is_admin THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'plan', 'admin',
      'remaining', -1
    );
  END IF;

  -- Get subscription status
  SELECT plan_type, subscription_status
  INTO _subscription
  FROM user_subscriptions
  WHERE user_id = _user_id;

  -- If premium (monthly or yearly), allow unlimited
  IF _subscription.plan_type IN ('monthly', 'yearly') AND _subscription.subscription_status = 'active' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'plan', _subscription.plan_type,
      'remaining', -1
    );
  END IF;

  -- For free users, check daily limits
  SELECT chat_count, chat_minutes_used
  INTO _usage
  FROM usage_tracking
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  -- If no usage record exists, create one
  IF _usage IS NULL THEN
    INSERT INTO usage_tracking (user_id, date, chat_count, chat_minutes_used)
    VALUES (_user_id, CURRENT_DATE, 0, 0)
    RETURNING chat_count, chat_minutes_used INTO _usage;
  END IF;

  -- Free tier limits: 5 conversations per day, max 10 minutes total
  IF _operation_type = 'chat' THEN
    IF _usage.chat_count >= 5 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'plan', 'free',
        'limit_type', 'daily_conversations',
        'limit', 5,
        'used', _usage.chat_count,
        'message', 'Limite quotidienne atteinte. Passez à Premium pour des conversations illimitées.'
      );
    END IF;

    IF _usage.chat_minutes_used >= 10 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'plan', 'free',
        'limit_type', 'daily_minutes',
        'limit', 10,
        'used', _usage.chat_minutes_used,
        'message', 'Temps de conversation quotidien épuisé. Passez à Premium pour une durée illimitée.'
      );
    END IF;

    RETURN jsonb_build_object(
      'allowed', true,
      'plan', 'free',
      'remaining_chats', 5 - _usage.chat_count,
      'remaining_minutes', 10 - _usage.chat_minutes_used
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'plan', 'free');
END;
$$;