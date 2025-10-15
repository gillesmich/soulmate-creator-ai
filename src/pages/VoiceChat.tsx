import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ElevenLabsVoice from "@/components/ElevenLabsVoice";
import LipSyncAvatar from "@/components/LipSyncAvatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { getCurrentCharacter } from "@/utils/characterStorage";
import { supabase } from "@/integrations/supabase/client";

const VoiceChat = () => {
  const navigate = useNavigate();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [characterName, setCharacterName] = useState<string>('');

  // Debug: Log when isSpeaking changes
  useEffect(() => {
    console.log('[VOICE CHAT] isSpeaking changed:', isSpeaking);
  }, [isSpeaking]);

  // Load character images and name on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        // First priority: Get from getCurrentCharacter which checks both localStorage and sessionStorage
        const savedCharacter = getCurrentCharacter();
        console.log('[VOICE CHAT] Loaded character from storage:', {
          name: savedCharacter?.name,
          id: savedCharacter?.id,
          hasImages: !!savedCharacter?.images,
          imageCount: savedCharacter?.images?.length || 0,
          images: savedCharacter?.images
        });
        
        // Set character name if available
        if (savedCharacter?.name) {
          setCharacterName(savedCharacter.name);
          console.log('[VOICE CHAT] Character name set:', savedCharacter.name);
        }
        
        // Set images if available - convert storage paths to signed URLs
        if (savedCharacter?.images && savedCharacter.images.length > 0) {
          console.log('[VOICE CHAT] Processing images...');
          
          // Always generate signed URLs for storage paths
          // Check each image individually - some might be base64, some might be storage paths
          const processedUrls = await Promise.all(
            savedCharacter.images.map(async (img) => {
              // If it's base64, keep it as is
              if (img.startsWith('data:')) {
                console.log('[VOICE CHAT] Keeping base64 image');
                return img;
              }
              
              // If it's a signed URL that's still valid (contains supabase and token)
              if (img.includes('supabase.co') && img.includes('token=')) {
                console.log('[VOICE CHAT] Checking if signed URL is still valid...');
                // Test if the URL is still valid
                try {
                  const testResponse = await fetch(img, { method: 'HEAD' });
                  if (testResponse.ok) {
                    console.log('[VOICE CHAT] Signed URL still valid, reusing');
                    return img;
                  }
                } catch (e) {
                  console.log('[VOICE CHAT] Signed URL expired or invalid, regenerating');
                }
                // If we get here, the URL is expired, extract the path
                const urlObj = new URL(img);
                const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/girlfriend-images\/(.+)/);
                if (pathMatch) {
                  const path = pathMatch[1];
                  const { data, error } = await supabase.storage
                    .from('girlfriend-images')
                    .createSignedUrl(path, 3600);
                  
                  if (!error && data) {
                    console.log('[VOICE CHAT] Regenerated signed URL from expired URL');
                    return data.signedUrl;
                  }
                }
              }
              
              // Otherwise, treat it as a storage path and generate signed URL
              const { data, error } = await supabase.storage
                .from('girlfriend-images')
                .createSignedUrl(img, 3600);
              
              if (error) {
                console.error('[VOICE CHAT] Error creating signed URL for:', img, error);
                return null;
              }
              
              console.log('[VOICE CHAT] Created new signed URL for storage path');
              return data.signedUrl;
            })
          );
          
          const validUrls = processedUrls.filter(url => url !== null) as string[];
          console.log('[VOICE CHAT] Processed', validUrls.length, 'valid image URLs');
          setCharacterImages(validUrls);
          return;
        }
        
        // Fallback to single image
        if (savedCharacter?.image) {
          console.log('[VOICE CHAT] Setting single character image:', savedCharacter.image);
          setCharacterImages([savedCharacter.image]);
          return;
        }
        
        // Last fallback: Load from Supabase if no character in storage
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[VOICE CHAT] No character in storage, loading from Supabase for user:', user.id);
          const { data: characters } = await supabase
            .from('saved_girlfriend_images')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (characters && characters.length > 0) {
            const character = characters[0];
            const imageUrls = character.image_urls as string[] | null;
            const imageUrl = character.image_url as string | null;
            const imagePaths = imageUrls || (imageUrl ? [imageUrl] : []);
            
            // Generate signed URLs for storage paths
            const signedUrls = await Promise.all(
              imagePaths.map(async (path: string) => {
                if (path.startsWith('http') || path.startsWith('data:')) {
                  return path; // Already a full URL
                }
                
                const { data, error } = await supabase.storage
                  .from('girlfriend-images')
                  .createSignedUrl(path, 3600); // 1 hour expiration
                
                if (error) {
                  console.error('[VOICE CHAT] Error creating signed URL from Supabase:', error);
                  return null;
                }
                
                return data.signedUrl;
              })
            );
            
            const validUrls = signedUrls.filter(url => url !== null) as string[];
            
            setCharacterName(character.name);
            setCharacterImages(validUrls);
            console.log('[VOICE CHAT] Loaded from Supabase with signed URLs:', {
              name: character.name,
              imageCount: validUrls.length
            });
            return;
          }
        }
        
        console.log('[VOICE CHAT] No character images found anywhere');
      } catch (error) {
        console.error('[VOICE CHAT] Error loading images:', error);
      }
    };
    
    loadImages();
    
    // Listen for character changes
    const handleCharacterChange = () => {
      console.log('[VOICE CHAT] Character changed event received, reloading...');
      loadImages();
    };
    
    window.addEventListener('characterChanged', handleCharacterChange);
    
    return () => {
      window.removeEventListener('characterChanged', handleCharacterChange);
    };
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
          <h1 className="text-4xl font-bold mb-2">
            {characterName ? `Chat avec ${characterName}` : 'Chat Vocal'}
          </h1>
          <p className="text-muted-foreground">
            {characterName 
              ? `Conversation vocale avec ${characterName}` 
              : 'Choisissez votre mode de conversation vocale avec voix française féminine'
            }
          </p>
          {characterImages.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {characterImages.length} {characterImages.length > 1 ? 'photos disponibles' : 'photo disponible'}
            </p>
          )}
        </div>

        {/* Avatar Carousel with Lip Sync - Always visible */}
        <div className="mb-8 flex justify-center">
          {characterImages.length > 0 ? (
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
                  <CarouselPrevious className="left-0" />
                  <CarouselNext className="right-0" />
                </>
              )}
            </Carousel>
          ) : (
            <div className="text-center p-8 bg-muted/50 rounded-lg border border-dashed max-w-sm">
              <p className="text-muted-foreground">
                Aucune photo de personnage disponible.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Créez un personnage sur la page Personnaliser pour voir l'avatar avec lipsync ici.
              </p>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold">Cabine téléphonique</h2>
          </div>
          <ElevenLabsVoice onSpeakingChange={setIsSpeaking} />
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
