import React, { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2, Info, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { getCurrentCharacter } from '@/utils/characterStorage';

interface ElevenLabsVoiceProps {
  character?: {
    name: string;
    personality: string;
    voice?: string;
  };
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

const ElevenLabsVoice: React.FC<ElevenLabsVoiceProps> = ({ 
  character, 
  onSpeakingChange 
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState<any>(null);
  const [agentId, setAgentId] = useState<string>('');
  const [agentName, setAgentName] = useState<string>('');
  const { toast } = useToast();
  const { subscription } = useSubscription();

  // Charger le personnage actuel et les infos d'agent
  useEffect(() => {
    const loadCharacterAndAgent = async () => {
      const character = getCurrentCharacter();
      if (character) {
        console.log('[ELEVENLABS] Current character loaded:', character);
        setCurrentCharacter(character);
        
        // Récupérer l'agent ID depuis le character_data ou utiliser l'agent par défaut
        const characterAgentId = character.agentId || 'agent_5501k79dakb3eay91b90g55520cr';
        const characterAgentName = character.agentName || character.name || 'Agathe';
        
        setAgentId(characterAgentId);
        setAgentName(characterAgentName);
        
        console.log('[ELEVENLABS] Agent configured:', {
          agentId: characterAgentId,
          agentName: characterAgentName
        });
      } else {
        // Valeurs par défaut si aucun personnage
        setAgentId('agent_5501k79dakb3eay91b90g55520cr');
        setAgentName('Agathe');
      }
    };
    
    loadCharacterAndAgent();
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ELEVENLABS] Connected to ElevenLabs');
      toast({
        title: "Connecté",
        description: `Agent: ${agentName}`,
      });
    },
    onDisconnect: () => {
      console.log('[ELEVENLABS] Disconnected from ElevenLabs');
      onSpeakingChange?.(false);
    },
    onError: (error) => {
      console.error('[ELEVENLABS] Connection error:', error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion vocale",
        variant: "destructive",
      });
    },
    onMessage: (message) => {
      console.log('[ELEVENLABS] Message received:', message);
    },
  });

  const { status, isSpeaking } = conversation;

  useEffect(() => {
    console.log('[ELEVENLABS] isSpeaking changed:', isSpeaking);
    if (onSpeakingChange) {
      onSpeakingChange(isSpeaking);
    }
  }, [isSpeaking, onSpeakingChange]);

  const getSignedUrl = async (agentId: string) => {
    try {
      setIsLoadingUrl(true);
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-agent', {
        body: { agentId },
      });

      if (error) throw error;
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'obtenir l'URL de connexion",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const startConversation = async () => {
    try {
      if (!agentId) {
        toast({
          title: "Erreur",
          description: "Aucun agent configuré.",
          variant: "destructive",
        });
        return;
      }

      console.log('[ELEVENLABS] Starting conversation with agent:', {
        agentId,
        agentName,
        characterData: currentCharacter
      });
      
      const url = await getSignedUrl(agentId);

      if (!url) {
        console.error('[ELEVENLABS] No signed URL received');
        return;
      }

      console.log('[ELEVENLABS] Signed URL received');
      setSignedUrl(url);
      
      // Request microphone permission
      console.log('[ELEVENLABS] Requesting microphone permission');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Enable audio autoplay by creating and playing a silent audio context
      const audioContext = new AudioContext();
      await audioContext.resume();
      
      await conversation.startSession({ signedUrl: url });
      
      console.log('[ELEVENLABS] Conversation started successfully');
    } catch (error) {
      console.error('[ELEVENLABS] Error starting conversation:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de démarrer la conversation",
        variant: "destructive",
      });
    }
  };

  const endConversation = async () => {
    await conversation.endSession();
    setSignedUrl(null);
  };

  const isConnected = status === 'connected';
  const isPremium = subscription.subscribed && subscription.plan_type !== 'free';

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Mic className={`w-12 h-12 ${isConnected ? 'text-white animate-pulse' : 'text-white/70'}`} />
          </div>
          <h3 className="text-xl font-bold mb-2">
            Conversation Vocale
          </h3>
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Connecté - Parlez librement' : 'Conversation vocale avec votre personnage'}
          </p>
        </div>

        {/* Character Info */}
        <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Agent:</span>
            <span className="text-muted-foreground">{agentName || 'Chargement...'}</span>
          </div>
          {currentCharacter && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Personnage:</span>
                <span className="text-muted-foreground">
                  {currentCharacter.name || 'Maya'}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="font-medium">Personnalité:</span>
                  <span className="text-muted-foreground ml-1">
                    {currentCharacter.personality || 'Non défini'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              disabled={isLoadingUrl}
              size="lg"
              className="w-full max-w-xs gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isLoadingUrl ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  Démarrer la conversation
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={endConversation}
              variant="destructive"
              size="lg"
              className="w-full max-w-xs gap-2"
            >
              <MicOff className="h-5 w-5" />
              Terminer
            </Button>
          )}
        </div>

        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
              <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              En train de parler...
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ElevenLabsVoice;
