import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LipSyncAvatar from '@/components/LipSyncAvatar';
import { getCurrentCharacter } from '@/utils/characterStorage';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { RealtimeChat } from '@/utils/RealtimeAudio';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface CharacterOptions {
  hairColor: string;
  hairStyle: string;
  bodyType: string;
  personality: string;
  outfit: string;
  eyeColor: string;
  image?: string;
  images?: string[];
}

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [character, setCharacter] = useState<CharacterOptions | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLargeAvatar, setShowLargeAvatar] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const chatRef = useRef<RealtimeChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageRotationInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const savedCharacter = getCurrentCharacter();
    if (savedCharacter) {
      setCharacter(savedCharacter);
    } else {
      navigate('/customize');
      return;
    }

    return () => {
      chatRef.current?.disconnect();
    };
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showLargeAvatar && character?.images && character.images.length > 1) {
      imageRotationInterval.current = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % (character.images?.length || 1));
      }, 3000);

      return () => {
        if (imageRotationInterval.current) {
          clearInterval(imageRotationInterval.current);
        }
      };
    }
  }, [showLargeAvatar, character?.images]);

  const handleMessage = (event: any) => {
    console.log('[CHAT] Message reçu:', event.type);
    
    // Activer le lipsynch dès qu'on reçoit de l'audio OU une transcription
    if (event.type === 'response.audio.delta' || event.type === 'response.audio_transcript.delta') {
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done' || event.type === 'response.audio_transcript.done') {
      setIsSpeaking(false);
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      if (event.transcript) {
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          content: event.transcript,
          sender: 'user',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
      }
    } else if (event.type === 'response.audio_transcript.delta') {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.sender === 'ai' && lastMessage.id.startsWith('ai-streaming-')) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + event.delta }
          ];
        }
        return [
          ...prev,
          {
            id: `ai-streaming-${Date.now()}`,
            content: event.delta,
            sender: 'ai',
            timestamp: new Date()
          }
        ];
      });
    } else if (event.type === 'response.audio_transcript.done') {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.id.startsWith('ai-streaming-')) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, id: `ai-${Date.now()}` }
          ];
        }
        return prev;
      });
    }
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      console.log('[CHAT] 🎬 Connexion...');
      
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init(character);
      
      setIsConnected(true);
      setIsLoading(false);
      console.log('[CHAT] ✅ Connecté - parlez naturellement!');
      
      toast({
        title: "Connecté",
        description: "Parlez naturellement, je vous écoute!",
      });
    } catch (error) {
      console.error('[CHAT] ❌ Erreur:', error);
      setIsLoading(false);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : 'Impossible de se connecter',
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    console.log('[CHAT] 🛑 Déconnexion');
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    toast({
      title: "Déconnecté",
      description: "Conversation terminée",
    });
  };

  if (!character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Loading your girlfriend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20">
      {/* Header */}
      <div className="border-b border-primary/10 bg-background/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              
              <div className="flex items-center gap-3">
                <LipSyncAvatar 
                  imageUrl={character.image} 
                  isSpeaking={isSpeaking}
                  size="medium"
                  className="cursor-pointer"
                  onClick={() => setShowLargeAvatar(true)}
                />
                <div>
                  <h1 className="font-semibold text-romantic-foreground">Votre Petite Amie IA</h1>
                  <p className="text-sm text-muted-foreground capitalize">
                    {character.personality} • {character.hairColor} {character.hairStyle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isConnected ? (
                <Button 
                  onClick={connect} 
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {isLoading ? 'Connexion...' : 'Démarrer'}
                </Button>
              ) : (
                <Button onClick={disconnect} variant="destructive" className="gap-2">
                  <PhoneOff className="h-4 w-4" />
                  Terminer
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Carousel Banner */}
      {character.images && character.images.length > 0 && (
        <div className="border-b border-primary/10 bg-background/30 backdrop-blur-sm py-3">
          <div className="max-w-4xl mx-auto px-4">
            <Carousel className="w-full">
              <CarouselContent className="-ml-2">
                {character.images.map((img, index) => (
                  <CarouselItem key={index} className="pl-2 basis-1/6 md:basis-1/8 lg:basis-1/10">
                    <div 
                      className="cursor-pointer group relative"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setShowLargeAvatar(true);
                      }}
                    >
                      <Avatar className="w-16 h-16 border-2 border-primary/20 group-hover:border-primary transition-colors">
                        <AvatarImage src={img} alt={`Character ${index + 1}`} />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0" />
              <CarouselNext className="right-0" />
            </Carousel>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6" style={{ height: 'calc(100vh - 240px)' }}>
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="text-romantic-foreground">Conversation</CardTitle>
            {isConnected && (
              <p className="text-sm text-muted-foreground mt-2">
                {isSpeaking ? '🎤 En train de parler...' : '👂 À l\'écoute... Parlez naturellement!'}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <p className="mb-2">
                    {isConnected 
                      ? 'Commencez à parler naturellement' 
                      : 'Connectez-vous pour démarrer la conversation'}
                  </p>
                  <p className="text-sm">
                    {isConnected 
                      ? 'La détection vocale est automatique - pas besoin d\'appuyer sur un bouton!' 
                      : 'Après connexion, parlez librement sans bouton'}
                  </p>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>
      </div>

      {/* Large Avatar Modal with Carousel */}
      {showLargeAvatar && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLargeAvatar(false);
            }
          }}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] w-full flex items-center justify-center">
            {character?.images && character.images.length > 1 ? (
              <Carousel 
                className="w-full max-w-[600px]"
                opts={{
                  align: "center",
                  loop: true,
                }}
              >
                <CarouselContent>
                  {character.images.map((img, index) => (
                    <CarouselItem key={index}>
                      <div className="w-[80vmin] h-[80vmin] max-w-[600px] max-h-[600px] mx-auto">
                        <LipSyncAvatar 
                          imageUrl={img} 
                          isSpeaking={isSpeaking}
                          size="large"
                          className="w-full h-full"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 bg-black/50 border-white/20 hover:bg-black/70 text-white" />
                <CarouselNext className="right-4 bg-black/50 border-white/20 hover:bg-black/70 text-white" />
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full">
                  <span className="text-white text-sm">
                    {character.images.length} images
                  </span>
                </div>
              </Carousel>
            ) : (
              <div className="w-[80vmin] h-[80vmin] max-w-[600px] max-h-[600px]">
                <LipSyncAvatar 
                  imageUrl={character?.image} 
                  isSpeaking={isSpeaking}
                  size="large"
                  className="w-full h-full"
                />
              </div>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLargeAvatar(false);
              }}
              className="absolute top-4 right-4 text-white bg-black/70 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/90 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
