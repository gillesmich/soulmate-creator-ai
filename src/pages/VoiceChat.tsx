import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import VoiceAvatar from "@/components/VoiceAvatar";

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
            Conversez en temps réel avec votre avatar
          </p>
        </div>

        <VoiceAvatar />
      </div>
    </div>
  );
};

export default VoiceChat;
