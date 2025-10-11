import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Trash2, Plus, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ApiKey {
  id: string;
  key_value: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
}

const ApiKeys = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchApiKeys();
  }, [user, navigate]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Erreur lors du chargement des clés API");
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    return `gf_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Veuillez entrer un nom pour la clé");
      return;
    }

    setIsCreating(true);
    try {
      const keyValue = generateApiKey();
      const { error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user?.id,
          key_value: keyValue,
          name: newKeyName.trim(),
        });

      if (error) throw error;

      toast.success("Clé API créée avec succès");
      setNewKeyName("");
      setDialogOpen(false);
      fetchApiKeys();
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Erreur lors de la création de la clé API");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Clé API supprimée");
      fetchApiKeys();
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Clé copiée dans le presse-papiers");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-romantic via-background to-accent/20">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20 p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Gestion des Clés API</CardTitle>
            <CardDescription>
              Créez et gérez vos clés API pour accéder aux endpoints de manière sécurisée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une nouvelle clé
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle clé API</DialogTitle>
                  <DialogDescription>
                    Donnez un nom à votre clé pour la retrouver facilement
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Nom de la clé</Label>
                    <Input
                      id="keyName"
                      placeholder="Ex: Production API"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={createApiKey}
                    disabled={isCreating}
                    className="w-full"
                  >
                    {isCreating ? "Création..." : "Créer la clé"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune clé API créée. Créez-en une pour commencer.
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <Card key={key.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{key.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[300px]">
                              {key.key_value}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(key.key_value)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Utilisations: {key.usage_count} | 
                            Dernière utilisation: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Jamais"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteApiKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Comment utiliser vos clés API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Pour utiliser votre clé API, ajoutez-la dans l'en-tête <code className="bg-muted px-1 rounded">x-api-key</code> de vos requêtes:
            </p>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`const response = await supabase.functions.invoke('function-name', {
  body: { /* vos données */ },
  headers: {
    'x-api-key': 'votre_clé_api_ici'
  }
});`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiKeys;
