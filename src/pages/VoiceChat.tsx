import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VoiceAvatar from "@/components/VoiceAvatar";
import ElevenLabsVoice from "@/components/ElevenLabsVoice";
import LipSyncAvatar from "@/components/LipSyncAvatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { getCurrentCharacter } from "@/utils/characterStorage";

const VoiceChat = () => {
  const navigate = useNavigate();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [characterImages, setCharacterImages] = useState<string[]>([]);

  // Debug: Log when isSpeaking changes
  useEffect(() => {
    console.log('[VOICE CHAT] isSpeaking changed:', isSpeaking);
  }, [isSpeaking]);

  // Load character images on mount
  useEffect(() => {
    const loadImages = () => {
      try {
        // Try to get images from sessionStorage first
        const imagesJson = sessionStorage.getItem('currentCharacterImages');
        console.log('[VOICE CHAT] sessionStorage currentCharacterImages:', imagesJson);
        
        if (imagesJson) {
          const images = JSON.parse(imagesJson);
          if (Array.isArray(images) && images.length > 0) {
            console.log('[VOICE CHAT] Loaded images from sessionStorage:', images.length);
            setCharacterImages(images);
            return;
          }
        }
        
        // Fallback to single image
        const singleImage = sessionStorage.getItem('currentCharacterImage');
        console.log('[VOICE CHAT] sessionStorage currentCharacterImage:', singleImage ? 'found' : 'not found');
        
        if (singleImage) {
          console.log('[VOICE CHAT] Loaded single image from sessionStorage');
          setCharacterImages([singleImage]);
          return;
        }
        
        // Last fallback: try from character data
        const savedCharacter = getCurrentCharacter();
        console.log('[VOICE CHAT] Loaded character:', savedCharacter);
        
        if (savedCharacter) {
          const images = savedCharacter.images && savedCharacter.images.length > 0 
            ? savedCharacter.images 
            : savedCharacter.image 
              ? [savedCharacter.image] 
              : [];
          console.log('[VOICE CHAT] Character images:', images.length);
          setCharacterImages(images);
        } else {
          console.log('[VOICE CHAT] No character found');
        }
      } catch (error) {
        console.error('[VOICE CHAT] Error loading images:', error);
      }
    };
    
    loadImages();
  }, []);

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
            Choisissez votre mode de conversation vocale avec voix française féminine
          </p>
        </div>

        {/* Avatar Carousel with Lip Sync */}
        {characterImages.length > 0 ? (
          <div className="mb-8 flex justify-center">
            <Carousel className="w-full max-w-sm">
              <CarouselContent>
                {characterImages.map((imageUrl, index) => (
                  <CarouselItem key={index}>
                    <div className="flex justify-center p-4">
                      <LipSyncAvatar
                        imageUrl={imageUrl}
                        isSpeaking={isSpeaking}
                        size="large"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {characterImages.length > 1 && (
                <>
                  <CarouselPrevious />
                  <CarouselNext />
                </>
              )}
            </Carousel>
          </div>
        ) : (
          <div className="mb-8 flex justify-center">
            <div className="text-center p-8 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-muted-foreground">
                Aucune photo de personnage disponible.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Créez un personnage sur la page Personnaliser pour voir son avatar ici.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="elevenlabs" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="openai">OpenAI Realtime</TabsTrigger>
            <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="openai" className="mt-6">
            <VoiceAvatar onSpeakingChange={setIsSpeaking} />
          </TabsContent>
          
          <TabsContent value="elevenlabs" className="mt-6">
            <ElevenLabsVoice onSpeakingChange={setIsSpeaking} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VoiceChat;
