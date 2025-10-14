-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.usage_tracking;

-- Drop table if exists
DROP TABLE IF EXISTS public.usage_tracking;

-- Create usage tracking table for free tier limits
CREATE TABLE public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  chat_count integer NOT NULL DEFAULT 0,
  chat_minutes_used integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_tracking
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to check and enforce usage limits
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
BEGIN
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

-- Create function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(
  _user_id uuid,
  _operation_type text,
  _increment_value integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _operation_type = 'chat' THEN
    INSERT INTO usage_tracking (user_id, date, chat_count)
    VALUES (_user_id, CURRENT_DATE, _increment_value)
    ON CONFLICT (user_id, date)
    DO UPDATE SET chat_count = usage_tracking.chat_count + _increment_value;
  ELSIF _operation_type = 'chat_minutes' THEN
    INSERT INTO usage_tracking (user_id, date, chat_minutes_used)
    VALUES (_user_id, CURRENT_DATE, _increment_value)
    ON CONFLICT (user_id, date)
    DO UPDATE SET chat_minutes_used = usage_tracking.chat_minutes_used + _increment_value;
  END IF;
END;
$$;