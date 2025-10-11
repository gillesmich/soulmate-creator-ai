import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Key } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const ApiKeyInfo = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id")
        .eq("is_active", true)
        .limit(1);

      if (error) throw error;
      setHasApiKey(data && data.length > 0);
    } catch (error) {
      console.error("Error checking API key:", error);
      setHasApiKey(false);
    }
  };

  if (hasApiKey === null) return null;

  if (!hasApiKey) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Clé API requise</AlertTitle>
        <AlertDescription>
          Vous devez créer une clé API pour utiliser les fonctionnalités de génération.
          <Link to="/api-keys">
            <Button variant="outline" size="sm" className="ml-2">
              <Key className="mr-2 h-3 w-3" />
              Créer une clé API
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
