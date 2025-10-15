import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  conversation_config?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      first_message?: string;
      language?: string;
    };
  };
}

interface ElevenLabsAgentSelectorProps {
  agentId: string;
  agentName: string;
  onAgentChange: (agentId: string, agentName: string) => void;
  label?: string;
}

const ElevenLabsAgentSelector: React.FC<ElevenLabsAgentSelectorProps> = ({ 
  agentId, 
  agentName,
  onAgentChange, 
  label = "Voix"
}) => {
  const [agents, setAgents] = useState<ElevenLabsAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-agents');
      
      if (error) throw error;
      
      if (data?.agents && Array.isArray(data.agents)) {
        console.log('[AGENT SELECTOR] Loaded agents:', data.agents);
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error loading ElevenLabs agents:', error);
      toast.error('Erreur lors du chargement des agents vocaux');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentChange = (newAgentId: string) => {
    const selectedAgent = agents.find(a => a.agent_id === newAgentId);
    if (selectedAgent) {
      console.log('[AGENT SELECTOR] Agent selected:', {
        agentId: selectedAgent.agent_id,
        agentName: selectedAgent.name
      });
      onAgentChange(selectedAgent.agent_id, selectedAgent.name);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-background">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Chargement des agents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={agentId} onValueChange={handleAgentChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sélectionner">
            {agentName || "Sélectionner"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {agents.map((agent) => (
            <SelectItem key={agent.agent_id} value={agent.agent_id}>
              <div className="flex flex-col">
                <span className="font-medium">{agent.name}</span>
                {agent.conversation_config?.agent?.prompt?.prompt && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {agent.conversation_config.agent.prompt.prompt.substring(0, 100)}...
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {agentName && (
        <p className="text-xs text-muted-foreground">
          Voix sélectionnée: <span className="font-medium">{agentName}</span>
        </p>
      )}
    </div>
  );
};

export default ElevenLabsAgentSelector;
