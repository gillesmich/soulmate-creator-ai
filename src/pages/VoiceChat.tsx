import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VoiceAvatar from "@/components/VoiceAvatar";
import ElevenLabsVoice from "@/components/ElevenLabsVoice";

const VoiceChat = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Chat Vocal</h1>
          <p className="text-muted-foreground">
            Choisissez votre mode de conversation vocale
          </p>
        </div>

        <Tabs defaultValue="openai" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="openai">OpenAI Realtime</TabsTrigger>
            <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="openai" className="mt-6">
            <VoiceAvatar />
          </TabsContent>
          
          <TabsContent value="elevenlabs" className="mt-6">
            <ElevenLabsVoice />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VoiceChat;
