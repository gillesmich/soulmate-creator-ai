import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useApiKey = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("key_value")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setApiKey(data?.key_value || null);
    } catch (error) {
      console.error("Error fetching API key:", error);
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  };

  return { apiKey, loading, refetch: fetchApiKey };
};
