import React, { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

interface ElevenLabsVoiceProps {
  character?: {
    name: string;
    personality: string;
    voice?: string;
  };
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

// Premium voices available
const PREMIUM_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River' },
];

// Free default voice
const FREE_VOICE = { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria' };

const ElevenLabsVoice: React.FC<ElevenLabsVoiceProps> = ({ 
  character, 
  onSpeakingChange 
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      toast({
        title: "Connecté",
        description: "Conversation vocale démarrée",
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      onSpeakingChange?.(false);
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion vocale",
        variant: "destructive",
      });
    },
  });

  const { status, isSpeaking } = conversation;

  useEffect(() => {
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
      // Check if user has premium access
      const isPremium = subscription.subscribed && subscription.plan_type !== 'free';
      
      // For this example, we'll use a demo agent ID
      // In production, you would create agents via ElevenLabs dashboard
      const demoAgentId = 'your-agent-id-here';
      
      if (!demoAgentId || demoAgentId === 'your-agent-id-here') {
        toast({
          title: "Configuration requise",
          description: "Veuillez configurer un agent ElevenLabs dans le tableau de bord",
          variant: "destructive",
        });
        return;
      }

      const url = await getSignedUrl(demoAgentId);
      if (!url) return;

      setSignedUrl(url);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      await conversation.startSession({ 
        signedUrl: url 
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la conversation",
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
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            Conversation Vocale ElevenLabs
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isPremium 
              ? `${PREMIUM_VOICES.length} voix premium disponibles`
              : 'Passez à Premium pour débloquer 20+ voix'}
          </p>
        </div>

        {!isPremium && (
          <div className="bg-muted p-3 rounded-lg text-sm text-center">
            <p>Voix gratuite: {FREE_VOICE.name}</p>
          </div>
        )}

        <div className="flex justify-center">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              disabled={isLoadingUrl}
              size="lg"
              className="gap-2"
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
              className="gap-2"
            >
              <MicOff className="h-5 w-5" />
              Terminer
            </Button>
          )}
        </div>

        {isSpeaking && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-primary">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              En train de parler...
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ElevenLabsVoice;
