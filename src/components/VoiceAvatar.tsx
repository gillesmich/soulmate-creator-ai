import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface VoiceAvatarProps {
  imageUrl?: string;
}

const VoiceAvatar: React.FC<VoiceAvatarProps> = ({ imageUrl }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);

  const handleMessage = (event: any) => {
    console.log('Received message:', event.type);
    
    if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      setTranscript(prev => [...prev, `Vous: ${event.transcript}`]);
    } else if (event.type === 'response.audio_transcript.delta') {
      setTranscript(prev => {
        const newTranscript = [...prev];
        if (newTranscript[newTranscript.length - 1]?.startsWith('Avatar:')) {
          newTranscript[newTranscript.length - 1] += event.delta;
        } else {
          newTranscript.push(`Avatar: ${event.delta}`);
        }
        return newTranscript;
      });
    }
  };

  const startConversation = async () => {
    try {
      setIsLoading(true);
      console.log('Starting conversation...');
      
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();
      
      setIsConnected(true);
      setIsLoading(false);
      
      toast({
        title: "Connecté",
        description: "L'avatar est prêt à discuter avec vous",
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsLoading(false);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : 'Impossible de démarrer la conversation',
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    toast({
      title: "Déconnecté",
      description: "La conversation est terminée",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  const avatarImage = imageUrl || localStorage.getItem('generatedImage') || '/placeholder.svg';

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="relative">
        <div className={`
          w-64 h-64 rounded-full overflow-hidden border-4 
          ${isSpeaking ? 'border-primary animate-pulse' : 'border-border'}
          transition-all duration-300
        `}>
          <img 
            src={avatarImage} 
            alt="Avatar" 
            className="w-full h-full object-cover"
          />
        </div>
        {isConnected && (
          <div className={`
            absolute -bottom-2 left-1/2 -translate-x-1/2 
            px-4 py-2 rounded-full text-sm font-medium
            ${isSpeaking ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            {isSpeaking ? '🎤 En train de parler...' : '👂 À l\'écoute...'}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {!isConnected ? (
          <Button 
            onClick={startConversation}
            disabled={isLoading}
            size="lg"
            className="gap-2"
          >
            <Phone className="w-5 h-5" />
            {isLoading ? 'Connexion...' : 'Démarrer la conversation'}
          </Button>
        ) : (
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <PhoneOff className="w-5 h-5" />
            Terminer
          </Button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="w-full max-w-2xl bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
          <h3 className="font-semibold mb-2">Transcription:</h3>
          <div className="space-y-2">
            {transcript.map((text, i) => (
              <p key={i} className="text-sm">{text}</p>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center max-w-md">
        {isConnected 
          ? "Parlez naturellement, l'avatar vous entend et répondra automatiquement."
          : "Cliquez pour commencer une conversation vocale en temps réel avec votre avatar."}
      </p>
    </div>
  );
};

export default VoiceAvatar;
