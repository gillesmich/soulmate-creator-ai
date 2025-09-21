import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI } from '@/utils/AudioRecorder';
import { playAudioData } from '@/utils/AudioPlayer';
import LipSyncAvatar from '@/components/LipSyncAvatar';

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
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load character from localStorage
    const savedCharacter = localStorage.getItem('girlfriendCharacter');
    if (savedCharacter) {
      setCharacter(JSON.parse(savedCharacter));
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

  const connect = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Request microphone permission first with better error handling
      console.log('Requesting microphone permission...');
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
      console.log('Microphone permission granted');
      
      // Connect to WebSocket - using the correct format for Supabase edge functions
      const wsUrl = `wss://edisqdyywdfcwxrnewqw.supabase.co/functions/v1/realtime-voice-chat`;
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to voice chat WebSocket');
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Voice chat is ready!",
        });
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data.type);

        if (data.type === 'response.audio.delta') {
          if (!isMuted && audioContextRef.current) {
            // Convert base64 to Uint8Array
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            await playAudioData(audioContextRef.current, bytes);
          }
          setIsSpeaking(true);
        } else if (data.type === 'response.audio.done') {
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
            if (lastMessage && lastMessage.sender === 'ai' && lastMessage.id === 'current-ai-response') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + data.delta }
              ];
            } else {
              return [
                ...prev,
                {
                  id: 'current-ai-response',
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
            if (lastMessage && lastMessage.id === 'current-ai-response') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, id: Date.now().toString() }
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
        console.error('WebSocket connection error:', error);
        console.log('WebSocket URL was:', wsUrl);
        console.log('WebSocket readyState:', wsRef.current?.readyState);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice chat. Please try again.",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsRecording(false);
        setIsSpeaking(false);
      };

    } catch (error) {
      console.error('Error connecting:', error);
      let errorMessage = "Failed to connect to voice chat. Please try again.";
      
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
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Not Connected",
        description: "Please connect to voice chat first",
        variant: "destructive",
      });
      return;
    }

    try {
      audioRecorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });

      await audioRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      
      // Commit the audio buffer when stopping recording
      if (wsRef.current?.readyState === WebSocket.OPEN) {
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
                  size="large"
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

        {/* Voice Controls */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-4">
            {isConnected && (
              <Button
                size="lg"
                className={`rounded-full w-16 h-16 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={!isConnected}
              >
                <Mic className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
        
        {isConnected && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Hold the microphone button to speak
          </p>
        )}
      </div>

      {/* Large Avatar Modal */}
      {showLargeAvatar && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowLargeAvatar(false)}
        >
          <div className="relative">
            <LipSyncAvatar 
              imageUrl={character.image} 
              isSpeaking={isSpeaking}
              size="large"
              className="w-96 h-96"
            />
            <button
              onClick={() => setShowLargeAvatar(false)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
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