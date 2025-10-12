import React, { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2, Info, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getCurrentCharacter } from '@/utils/characterStorage';

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

interface Agent {
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
    tts?: {
      voice_id?: string;
    };
  };
}

const ElevenLabsVoice: React.FC<ElevenLabsVoiceProps> = ({ 
  character, 
  onSpeakingChange 
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
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
          agentName: characterAgentName,
          characterVoice: character.voice
        });
        
        // Pré-sélectionner la voix du personnage si elle existe
        if (character.voice) {
          setSelectedVoiceId(character.voice);
        }
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
      const voiceName = availableVoices.find(v => v.voice_id === selectedVoiceId)?.name || 'sélectionnée';
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
      
      // Convertir l'erreur en chaîne pour la vérification
      const errorStr = String(error);
      
      // Si l'erreur concerne la voix, informer l'utilisateur
      if (errorStr.toLowerCase().includes('voice') || 
          errorStr.toLowerCase().includes('tts')) {
        toast({
          title: "Erreur de voix",
          description: "Cette voix n'est pas compatible avec cet agent. Essayez une autre voix.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: "Erreur de connexion vocale",
          variant: "destructive",
        });
      }
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
            // Sélectionner la première voix par défaut
            setSelectedVoiceId(data.voices[0].voice_id);
          }
          setAvailableVoices(data.voices);
        } else {
          console.warn('[ELEVENLABS] No voices returned from API, data:', data);
          toast({
            title: "Erreur",
            description: "Aucune voix disponible.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('[ELEVENLABS] Failed to load voices:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les voix.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [toast]);

  // Charger tous les agents disponibles au démarrage
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        console.log('[ELEVENLABS] Starting to fetch agents...');
        const { data, error } = await supabase.functions.invoke('get-elevenlabs-agents');
        
        console.log('[ELEVENLABS] Agent fetch result:', { 
          hasData: !!data, 
          hasError: !!error,
          agentCount: data?.agents?.length || 0,
          error: error
        });
        
        if (error) {
          console.error('[ELEVENLABS] Error fetching agents:', error);
          throw error;
        }
        
        if (data?.agents && Array.isArray(data.agents)) {
          console.log(`[ELEVENLABS] Successfully loaded ${data.agents.length} agents`);
          if (data.agents.length > 0) {
            console.log('[ELEVENLABS] First agent:', data.agents[0]);
            // Sélectionner le premier agent par défaut si aucun n'est défini
            if (!agentId) {
              setAgentId(data.agents[0].agent_id);
              setAgentName(data.agents[0].name);
            }
          }
          setAvailableAgents(data.agents);
        } else {
          console.warn('[ELEVENLABS] No agents returned from API, data:', data);
        }
      } catch (error) {
        console.error('[ELEVENLABS] Failed to load agents:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les agents.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
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
      if (!agentId) {
        toast({
          title: "Erreur",
          description: "Aucun agent configuré. Veuillez recharger la page.",
          variant: "destructive",
        });
        return;
      }

      console.log('[ELEVENLABS] Starting conversation with agent:', {
        agentId,
        agentName,
        selectedVoiceId,
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
      
      const sessionConfig: any = { 
        signedUrl: url
      };

      // Ne PAS appliquer d'override - laisser l'agent utiliser sa voix configurée
      console.log('[ELEVENLABS] Using agent default voice configuration');
      
      console.log('[ELEVENLABS] Session config:', sessionConfig);
      
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

        {/* Agent and Character Info */}
        <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Agent:</span>
            <span className="text-muted-foreground">{agentName || 'Chargement...'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">ID:</span>
            <span className="text-xs text-muted-foreground font-mono break-all">{agentId || 'Chargement...'}</span>
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
          {selectedVoiceId && (
            <div className="flex items-center gap-2 text-sm">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Voix active:</span>
              <span className="text-muted-foreground">
                {availableVoices.find(v => v.voice_id === selectedVoiceId)?.name || selectedVoiceId}
              </span>
            </div>
          )}
        </div>

        {/* Agent Selection */}
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border">
            <div className="flex items-start gap-2 mb-3">
              <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <h4 className="font-semibold">Sélectionnez un agent</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Choisissez un agent ElevenLabs pour personnaliser la conversation.
                </p>
              </div>
            </div>
            
            {isLoadingAgents ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Chargement des agents...</span>
              </div>
            ) : (
              <RadioGroup 
                value={agentId} 
                onValueChange={(value) => {
                  const selectedAgent = availableAgents.find(a => a.agent_id === value);
                  if (selectedAgent) {
                    setAgentId(value);
                    setAgentName(selectedAgent.name);
                    
                    // IMPORTANT : Récupérer et pré-sélectionner la voix de l'agent
                    const agentVoiceId = selectedAgent.conversation_config?.tts?.voice_id;
                    if (agentVoiceId) {
                      console.log('[ELEVENLABS] Agent voice detected:', agentVoiceId);
                      setSelectedVoiceId(agentVoiceId);
                    }
                    
                    // Sauvegarder l'agent dans le personnage
                    if (currentCharacter) {
                      const updatedCharacter = {
                        ...currentCharacter,
                        agentId: value,
                        agentName: selectedAgent.name,
                        voice: agentVoiceId || currentCharacter.voice
                      };
                      setCurrentCharacter(updatedCharacter);
                    }
                  }
                }}
                className="space-y-2 max-h-64 overflow-y-auto"
              >
                {availableAgents.length > 0 ? (
                  availableAgents.map((agent) => (
                    <div 
                      key={agent.agent_id} 
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-accent/5 border border-transparent hover:border-accent/20 transition-colors"
                    >
                      <RadioGroupItem 
                        value={agent.agent_id} 
                        id={agent.agent_id}
                        disabled={isConnected}
                      />
                      <Label 
                        htmlFor={agent.agent_id} 
                        className={`flex flex-col cursor-pointer flex-1 ${
                          isConnected ? 'opacity-50' : ''
                        }`}
                      >
                        <span className="font-medium">{agent.name}</span>
                        {agent.conversation_config?.tts?.voice_id && (
                          <span className="text-xs text-primary mt-0.5">
                            Voix: {availableVoices.find(v => v.voice_id === agent.conversation_config?.tts?.voice_id)?.name || agent.conversation_config.tts.voice_id}
                          </span>
                        )}
                        {agent.conversation_config?.agent?.prompt?.prompt && (
                          <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {agent.conversation_config.agent.prompt.prompt.slice(0, 100)}...
                          </span>
                        )}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-sm text-muted-foreground">
                    Aucun agent disponible. L'agent par défaut sera utilisé.
                  </div>
                )}
              </RadioGroup>
            )}
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <h4 className="font-semibold">Sélectionnez une voix</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Choisissez une voix parmi celles disponibles.
                </p>
              </div>
            </div>
            
            {isLoadingVoices ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Chargement des voix...</span>
              </div>
            ) : (
              <RadioGroup 
                value={selectedVoiceId} 
                onValueChange={(value) => {
                  setSelectedVoiceId(value);
                  
                  // Sauvegarder la voix dans le personnage
                  if (currentCharacter) {
                    const updatedCharacter = {
                      ...currentCharacter,
                      voice: value
                    };
                    setCurrentCharacter(updatedCharacter);
                  }
                }}
                className="space-y-2 max-h-96 overflow-y-auto"
              >
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
