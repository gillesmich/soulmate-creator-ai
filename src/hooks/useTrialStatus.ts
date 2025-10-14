import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrialStatus {
  allowed: boolean;
  plan: string;
  trial?: boolean;
  remaining_minutes?: number;
  limit_type?: string;
  message?: string;
}

export const useTrialStatus = () => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkTrialStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_usage_limit', {
        _user_id: user.id,
        _operation_type: 'chat'
      });

      if (error) {
        console.error('Error checking trial status:', error);
        return;
      }

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setTrialStatus(data as unknown as TrialStatus);
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTrialStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkTrialStatus, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  return {
    trialStatus,
    loading,
    checkTrialStatus,
  };
};
