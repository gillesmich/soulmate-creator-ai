import React, { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2, Info, Sparkles } from 'lucide-react';
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

// Voix françaises féminines premium pour ElevenLabs (Creator Plan)
// Ces voix supportent le français avec le modèle Multilingual v2
const FRENCH_FEMALE_VOICES = [
  { 
    id: 'EXAVITQu4vr4xnSDxMaL', 
    name: 'Sarah',
    description: 'Voix douce et chaleureuse',
    category: 'Premium'
  },
  { 
    id: 'pFZP5JQG7iQjIQuC4Bku', 
    name: 'Lily',
    description: 'Voix jeune et énergique',
    category: 'Premium'
  },
  { 
    id: 'XB0fDUnXU5powFXDhCwa', 
    name: 'Charlotte',
    description: 'Voix élégante et posée',
    category: 'Premium'
  },
  { 
    id: 'XrExE9yKIg1WjnnlVkGX', 
    name: 'Matilda',
    description: 'Voix mature et confiante',
    category: 'Premium'
  },
  { 
    id: 'cgSgspJ2msm6clMCkdW9', 
    name: 'Jessica',
    description: 'Voix claire et professionnelle',
    category: 'Premium'
  },
  { 
    id: '9BWtsMINqrJLrRacOk9x', 
    name: 'Aria',
    description: 'Voix expressive et naturelle',
    category: 'Premium'
  },
  { 
    id: 'pqHfZKP75CvOlQylNhV4', 
    name: 'Bill',
    description: 'Voix féminine claire',
    category: 'Premium'
  },
  { 
    id: 'SAz9YHcvj6GT2YYXdXww', 
    name: 'River',
    description: 'Voix douce et apaisante',
    category: 'Premium'
  },
];

// Voix par défaut gratuite
const DEFAULT_VOICE = FRENCH_FEMALE_VOICES[0];

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
      
      // Agent Agathe configuré
      const agentId = 'agent_5501k79dakb3eay91b90g55520cr';

      const url = await getSignedUrl(agentId);
      if (!url) return;

      setSignedUrl(url);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Enable audio autoplay by creating and playing a silent audio context
      const audioContext = new AudioContext();
      await audioContext.resume();
      
      await conversation.startSession({ 
        signedUrl: url 
      });
      
      console.log('Conversation started successfully');
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
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Mic className={`w-12 h-12 ${isConnected ? 'text-white animate-pulse' : 'text-white/70'}`} />
          </div>
          <h3 className="text-xl font-bold mb-2">
            Conversation Vocale ElevenLabs
          </h3>
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Connecté - Parlez librement' : 'Voix françaises premium et voice clones'}
          </p>
        </div>

        {/* Voice Clones Section - Info Only */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/20">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-4 h-4" />
            Voice Clones et Voix Premium
          </h4>
          <p className="text-sm text-muted-foreground">
            Pour utiliser un voice clone personnalisé ou une voix premium, configurez-le directement dans votre{' '}
            <a 
              href="https://elevenlabs.io/app/conversational-ai" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-600 hover:underline font-medium"
            >
              agent ElevenLabs
            </a>
            . Créez votre voice clone dans{' '}
            <a 
              href="https://elevenlabs.io/voice-lab" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-600 hover:underline font-medium"
            >
              Voice Lab
            </a>
            .
          </p>
        </div>

        {/* Premium Voices List */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Voix françaises premium disponibles
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FRENCH_FEMALE_VOICES.map(voice => (
              <div
                key={voice.id}
                className="flex flex-col p-3 rounded-md bg-background/70 transition-colors"
              >
                <span className="font-medium text-sm">{voice.name}</span>
                <span className="text-xs text-muted-foreground">{voice.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Instructions */}
        <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Info className="w-4 h-4" />
            Configuration
          </h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>⚠️ <strong>Important:</strong> Pour changer la voix, configurez-la directement dans votre{' '}
              <a 
                href="https://elevenlabs.io/app/conversational-ai" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline font-medium"
              >
                agent ElevenLabs
              </a>
            </li>
            <li>Les voix disponibles ci-dessus peuvent être sélectionnées dans les paramètres de votre agent</li>
            <li>Le modèle "Multilingual v2" est recommandé pour le français</li>
          </ol>
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
