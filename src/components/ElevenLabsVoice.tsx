import React, { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ElevenLabsVoiceProps {
  character?: {
    name: string;
    personality: string;
    voice?: string;
  };
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: { [key: string]: string };
  preview_url?: string;
}

const ElevenLabsVoice: React.FC<ElevenLabsVoiceProps> = ({ 
  character, 
  onSpeakingChange 
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('agent');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ELEVENLABS] Connected to ElevenLabs');
      const voiceName = selectedVoiceId === 'agent' 
        ? 'Agathe (voix de l\'agent)' 
        : availableVoices.find(v => v.voice_id === selectedVoiceId)?.name || 'sélectionnée';
      toast({
        title: "Connecté",
        description: `Voix: ${voiceName}`,
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

  // Charger toutes les voix disponibles au démarrage
  useEffect(() => {
    const fetchVoices = async () => {
      setIsLoadingVoices(true);
      try {
        console.log('[ELEVENLABS] Starting to fetch voices...');
        const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
        
        console.log('[ELEVENLABS] Voice fetch result:', { 
          hasData: !!data, 
          hasError: !!error,
          voiceCount: data?.voices?.length || 0,
          error: error
        });
        
        if (error) {
          console.error('[ELEVENLABS] Error fetching voices:', error);
          throw error;
        }
        
        if (data?.voices && Array.isArray(data.voices)) {
          console.log(`[ELEVENLABS] Successfully loaded ${data.voices.length} voices`);
          if (data.voices.length > 0) {
            console.log('[ELEVENLABS] First voice:', data.voices[0]);
          }
          setAvailableVoices(data.voices);
        } else {
          console.warn('[ELEVENLABS] No voices returned from API, data:', data);
          toast({
            title: "Information",
            description: "Aucune voix disponible pour le moment. Seule la voix de l'agent sera disponible.",
          });
        }
      } catch (error) {
        console.error('[ELEVENLABS] Failed to load voices:', error);
        toast({
          title: "Avertissement",
          description: "Impossible de charger les voix. La voix de l'agent sera utilisée par défaut.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [toast]);

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
      // Agent Agathe configuré
      const agentId = 'agent_5501k79dakb3eay91b90g55520cr';

      console.log('[ELEVENLABS] Getting signed URL for agent:', agentId);
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
      
      const sessionConfig: any = { signedUrl: url };
      
      // Appliquer les overrides de voix si une voix spécifique est sélectionnée
      if (selectedVoiceId !== 'agent') {
        console.log('[ELEVENLABS] Applying voice override:', selectedVoiceId);
        const selectedVoice = availableVoices.find(v => v.voice_id === selectedVoiceId);
        console.log('[ELEVENLABS] Selected voice details:', selectedVoice);
        
        sessionConfig.overrides = {
          agent: {
            prompt: {
              prompt: character?.personality || "Tu es une petite amie virtuelle charmante et attentionnée."
            },
            firstMessage: "Salut ! Comment vas-tu aujourd'hui ?",
            language: "fr"
          },
          tts: {
            voiceId: selectedVoiceId
          }
        };
      }
      
      console.log('[ELEVENLABS] Starting session with config:', JSON.stringify(sessionConfig));
      await conversation.startSession(sessionConfig);
      
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
            Conversation Vocale ElevenLabs
          </h3>
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Connecté - Parlez librement' : 'Voix françaises premium et voice clones'}
          </p>
        </div>

        {/* Voice Selection */}
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Sélectionnez une voix
            </h4>
            
            {isLoadingVoices ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Chargement des voix...</span>
              </div>
            ) : (
              <RadioGroup 
                value={selectedVoiceId} 
                onValueChange={setSelectedVoiceId}
                className="space-y-2 max-h-96 overflow-y-auto"
              >
                {/* Option voix de l'agent (Agathe) */}
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                  <RadioGroupItem 
                    value="agent" 
                    id="agent"
                    disabled={isConnected}
                  />
                  <Label 
                    htmlFor="agent" 
                    className={`flex flex-col cursor-pointer flex-1 ${
                      isConnected ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      🎭 Voix de l'agent (Agathe)
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Utilise la voix configurée dans votre agent ElevenLabs
                    </span>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1">
                      ⭐ Recommandé
                    </span>
                  </Label>
                </div>

                {/* Toutes les voix disponibles */}
                {availableVoices.length > 0 ? (
                  availableVoices.map((voice) => (
                    <div 
                      key={voice.voice_id} 
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-accent/5 border border-transparent hover:border-accent/20 transition-colors"
                    >
                      <RadioGroupItem 
                        value={voice.voice_id} 
                        id={voice.voice_id}
                        disabled={isConnected}
                      />
                      <Label 
                        htmlFor={voice.voice_id} 
                        className={`flex flex-col cursor-pointer flex-1 ${
                          isConnected ? 'opacity-50' : ''
                        }`}
                      >
                        <span className="font-medium">{voice.name}</span>
                        {voice.labels && Object.keys(voice.labels).length > 0 && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {Object.entries(voice.labels)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(' • ')}
                          </span>
                        )}
                        {voice.category && (
                          <span className="text-xs text-primary mt-0.5">
                            {voice.category}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-sm text-muted-foreground">
                    Aucune voix disponible. La voix de l'agent sera utilisée.
                  </div>
                )}
              </RadioGroup>
            )}
          </div>
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
