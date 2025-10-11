import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI } from '@/utils/AudioRecorder';
import { playAudioData } from '@/utils/AudioPlayer';
import LipSyncAvatar from '@/components/LipSyncAvatar';
import { getCurrentCharacter } from '@/utils/characterStorage';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showLargeAvatar, setShowLargeAvatar] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [textInput, setTextInput] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageRotationInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load character from localStorage
    const savedCharacter = getCurrentCharacter();
    if (savedCharacter) {
      setCharacter(savedCharacter);
    } else {
      navigate('/customize');
      return;
    }

    // Initialize audio context
    audioContextRef.current = new AudioContext();

    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-rotate images when large avatar is shown
  useEffect(() => {
    if (showLargeAvatar && character?.images && character.images.length > 1) {
      imageRotationInterval.current = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % (character.images?.length || 1));
      }, 3000); // Change image every 3 seconds

      return () => {
        if (imageRotationInterval.current) {
          clearInterval(imageRotationInterval.current);
        }
      };
    }
  }, [showLargeAvatar, character?.images]);

  const connect = async () => {
    try {
      console.log('[VOICE CHAT] Connect button clicked');
      console.log('[VOICE CHAT] Current connection state:', isConnected);
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[VOICE CHAT] Browser does not support audio recording');
        throw new Error('Your browser does not support audio recording');
      }

      // Request microphone permission first with better error handling
      console.log('[VOICE CHAT] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Stop the test stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log('[VOICE CHAT] Microphone permission granted');
      
      // Connect to WebSocket - using the correct format for Supabase edge functions
      const wsUrl = `wss://edisqdyywdfcwxrnewqw.supabase.co/functions/v1/realtime-voice-chat`;
      console.log('[VOICE CHAT] Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[VOICE CHAT] ✅ Connected to voice chat WebSocket');
        console.log('[VOICE CHAT] WebSocket readyState:', wsRef.current?.readyState);
        
        // Send character information to the server
        if (wsRef.current && character) {
          console.log('[VOICE CHAT] 📤 Sending character data to server');
          wsRef.current.send(JSON.stringify({
            type: 'session.update',
            session: {
              character: {
                hairColor: character.hairColor,
                hairStyle: character.hairStyle,
                bodyType: character.bodyType,
                personality: character.personality,
                outfit: character.outfit,
                eyeColor: character.eyeColor,
                interests: (character as any).interests,
                hobbies: (character as any).hobbies,
                characterTraits: (character as any).characterTraits
              }
            }
          }));
        }
        
        setIsConnected(true);
        toast({
          title: "Connecté",
          description: "Chat vocal prêt !",
        });
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('[VOICE CHAT] 📨 Received message:', data.type);
        if (data.type === 'error') {
          console.error('[VOICE CHAT] ❌ Error from server:', data.message);
        }

        if (data.type === 'response.audio.delta') {
          console.log('[VOICE CHAT] 🔊 Audio delta received, size:', data.delta?.length || 0);
          if (!isMuted && audioContextRef.current) {
            try {
              // Convert base64 to Uint8Array
              const binaryString = atob(data.delta);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              console.log('[VOICE CHAT] 🎵 Playing audio chunk, bytes:', bytes.length);
              await playAudioData(audioContextRef.current, bytes);
            } catch (audioError) {
              console.error('[VOICE CHAT] ❌ Error playing audio:', audioError);
            }
          } else if (isMuted) {
            console.log('[VOICE CHAT] 🔇 Audio muted, not playing');
          }
          setIsSpeaking(true);
        } else if (data.type === 'response.audio.done') {
          console.log('[VOICE CHAT] ✅ Audio response complete');
          setIsSpeaking(false);
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          // Add user's transcribed message
          if (data.transcript) {
            const userMessage: Message = {
              id: Date.now().toString(),
              content: data.transcript,
              sender: 'user',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, userMessage]);
          }
        } else if (data.type === 'response.audio_transcript.delta') {
          // Handle AI response transcript (for display)
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.sender === 'ai' && lastMessage.id.startsWith('ai-streaming-')) {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + data.delta }
              ];
            } else {
              return [
                ...prev,
                {
                  id: `ai-streaming-${Date.now()}`,
                  content: data.delta,
                  sender: 'ai',
                  timestamp: new Date()
                }
              ];
            }
          });
        } else if (data.type === 'response.audio_transcript.done') {
          // Finalize AI response
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.id.startsWith('ai-streaming-')) {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, id: `ai-${Date.now()}` }
              ];
            }
            return prev;
          });
        } else if (data.type === 'error') {
          toast({
            title: "Connection Error",
            description: data.message,
            variant: "destructive",
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[VOICE CHAT] ❌ WebSocket connection error:', error);
        console.log('[VOICE CHAT] WebSocket URL was:', wsUrl);
        console.log('[VOICE CHAT] WebSocket readyState:', wsRef.current?.readyState);
        toast({
          title: "Erreur de connexion",
          description: "Impossible de se connecter au chat vocal. Réessayez.",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log('[VOICE CHAT] 🔌 WebSocket closed');
        setIsConnected(false);
        setIsRecording(false);
        setIsSpeaking(false);
      };

    } catch (error) {
      console.error('[VOICE CHAT] ❌ Error connecting:', error);
      let errorMessage = "Impossible de se connecter au chat vocal. Réessayez.";
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings and try again.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Your browser doesn't support audio recording. Please use a modern browser.";
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
  };

  const startRecording = async () => {
    console.log('[VOICE CHAT] 🎤 Start recording button pressed');
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[VOICE CHAT] ❌ Cannot record - not connected. ReadyState:', wsRef.current?.readyState);
      toast({
        title: "Non connecté",
        description: "Connectez-vous au chat vocal d'abord",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[VOICE CHAT] Starting audio recorder...');
      audioRecorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          console.log('[VOICE CHAT] 📤 Sending audio chunk, size:', encodedAudio.length);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        } else {
          console.warn('[VOICE CHAT] ⚠️ Cannot send audio - WebSocket not open');
        }
      });

      await audioRecorderRef.current.start();
      setIsRecording(true);
      console.log('[VOICE CHAT] ✅ Recording started successfully');
    } catch (error) {
      console.error('[VOICE CHAT] ❌ Error starting recording:', error);
      toast({
        title: "Erreur d'enregistrement",
        description: "Impossible de démarrer l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    console.log('[VOICE CHAT] 🛑 Stop recording');
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      
      // Commit the audio buffer when stopping recording
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[VOICE CHAT] 📤 Committing audio buffer');
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.commit'
        }));
      }
    }
    setIsRecording(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const sendTextMessage = () => {
    if (!textInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: textInput,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send text to OpenAI
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: textInput
          }
        ]
      }
    }));

    // Trigger response
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));

    setTextInput('');
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
                Back
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
              <h1 className="font-semibold text-romantic-foreground">Your AI Girlfriend</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {character.personality} • {character.hairColor} {character.hairStyle}
              </p>
            </div>
          </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                className="hover:bg-accent"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              {!isConnected ? (
                <Button onClick={connect} className="bg-primary hover:bg-primary/90">
                  Connect Voice
                </Button>
              ) : (
                <Button onClick={disconnect} variant="outline">
                  Disconnect
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

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-200px)] flex flex-col">
        <Card className="flex-1 border-primary/10">
          <CardHeader>
            <CardTitle className="text-center">
              Voice Chat
              {isSpeaking && (
                <span className="ml-2 text-sm text-primary animate-pulse">
                  🎤 Speaking...
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 h-full overflow-y-auto">
            {messages.length === 0 && isConnected && (
              <div className="text-center text-muted-foreground py-8">
                <p>Start talking to begin your conversation!</p>
                <p className="text-sm mt-2">Hold the microphone button to speak</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        {/* Text Input */}
        <div className="mt-4 flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendTextMessage();
              }
            }}
            placeholder={isConnected ? "Tapez votre message..." : "Connectez-vous d'abord"}
            disabled={!isConnected}
            className="flex-1"
          />
          <Button
            onClick={sendTextMessage}
            disabled={!isConnected || !textInput.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Voice Controls */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              className={`rounded-full w-16 h-16 ${
                !isConnected 
                  ? 'bg-muted hover:bg-muted/80 cursor-not-allowed opacity-50' 
                  : isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-primary hover:bg-primary/90'
              }`}
              onMouseDown={isConnected ? startRecording : undefined}
              onMouseUp={isConnected ? stopRecording : undefined}
              onMouseLeave={isConnected ? stopRecording : undefined}
              onTouchStart={isConnected ? startRecording : undefined}
              onTouchEnd={isConnected ? stopRecording : undefined}
              disabled={!isConnected}
              title={!isConnected ? "Connect to voice chat first" : "Hold to speak"}
            >
              {!isConnected ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-2">
          {!isConnected 
            ? "Connect to voice chat to start speaking" 
            : "Hold the microphone button to speak"
          }
        </p>
      </div>

      {/* Large Avatar Modal with Carousel */}
      {showLargeAvatar && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the carousel
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
                
                {/* Image Counter */}
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