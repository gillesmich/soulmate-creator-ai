import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Trash2, Images, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getSavedCharacters, deleteCharacter, setCurrentCharacter, type SavedCharacter } from '@/utils/characterStorage';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';

const CharacterGallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<SavedCharacter | null>(null);
  const [showImagesDialog, setShowImagesDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load exclusively from Supabase for authenticated users
        const { data: supabaseCharacters, error } = await supabase
          .from('saved_girlfriend_images')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) {
          console.error('Error loading from Supabase:', error);
          setCharacters([]);
          setLoading(false);
          return;
        }
        
        if (supabaseCharacters && supabaseCharacters.length > 0) {
          // Generate signed URLs for all images
          const loadedCharacters = await Promise.all(supabaseCharacters.map(async (sc) => {
            const characterData = typeof sc.character_data === 'object' && sc.character_data !== null 
              ? sc.character_data as Record<string, any>
              : {};
            
            const imagePaths = Array.isArray(sc.image_urls) 
              ? sc.image_urls.filter((url): url is string => typeof url === 'string')
              : [sc.image_url];
            
            // Generate signed URLs for all image paths
            const signedUrls = await Promise.all(
              imagePaths.map(async (path: string) => {
                if (path.startsWith('http') || path.startsWith('data:')) {
                  return path; // Already a full URL
                }
                
                const { data, error } = await supabase.storage
                  .from('girlfriend-images')
                  .createSignedUrl(path, 3600); // 1 hour expiration
                
                if (error) {
                  console.error('[CHARACTER GALLERY] Error creating signed URL:', error);
                  return path; // Return original path as fallback
                }
                
                return data.signedUrl;
              })
            );
            
            return {
              id: sc.id,
              name: sc.name,
              image: signedUrls[0] || sc.image_url,
              images: signedUrls,
              createdAt: sc.created_at,
              hairColor: characterData.hairColor || 'blonde',
              hairStyle: characterData.hairStyle || 'long',
              bodyType: characterData.bodyType || 'slim',
              personality: characterData.personality || 'sweet',
              outfit: characterData.outfit || 'casual',
              eyeColor: characterData.eyeColor || 'blue',
              age: characterData.age || 'medium age',
              voice: characterData.voice,
              avatarView: characterData.avatarView,
              clothing: characterData.clothing,
              imageStyle: characterData.imageStyle,
              interests: characterData.interests || '',
              hobbies: characterData.hobbies || '',
              characterTraits: characterData.characterTraits || '',
              agentId: characterData.agentId,
              agentName: characterData.agentName,
              ethnicity: characterData.ethnicity
            };
          }));
          
          setCharacters(loadedCharacters);
          setLoading(false);
          return;
        }
      }
      
      // No user or no characters
      setCharacters([]);
      setLoading(false);
    } catch (error) {
      console.error('Error loading characters:', error);
      setCharacters([]);
      setLoading(false);
    }
  };

  const selectCharacter = (character: SavedCharacter) => {
    // Store in sessionStorage for VoiceChat to access
    sessionStorage.setItem('currentCharacterImages', JSON.stringify(character.images || [character.image]));
    sessionStorage.setItem('currentCharacterImage', character.image);
    
    setCurrentCharacter({
      ...character,
      image: character.image,
      images: character.images || [character.image]
    });
    
    toast({
      title: "Personnage sélectionné",
      description: `${character.name} est maintenant actif`,
    });
    
    navigate('/voice-chat');
  };

  const viewCharacterImages = (character: SavedCharacter) => {
    setSelectedCharacter(character);
    setShowImagesDialog(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour supprimer un personnage",
          variant: "destructive",
        });
        return;
      }

      // Delete from Supabase
      const { error } = await supabase
        .from('saved_girlfriend_images')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting character:', error);
        throw error;
      }

      // Reload characters
      await loadCharacters();
      
      toast({
        title: "Personnage supprimé",
        description: `${name} a été retiré`,
      });
    } catch (error) {
      console.error('Error deleting character:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le personnage",
        variant: "destructive",
      });
    }
  };

  const editCharacter = (character: SavedCharacter) => {
    setCurrentCharacter({
      ...character,
      images: character.images || [character.image]
    });
    navigate('/customize');
  };

  const generateNewAvatar = async (character: SavedCharacter) => {

    setIsGenerating(true);
    
    try {
      const characterSeed = Date.now();
      
      // Generate with the character's existing style or default to realistic
      const style = character.imageStyle || 'realistic';
      const view = character.avatarView || 'bust';
      const clothing = character.clothing || 'clothed';
      
      const { data, error } = await supabase.functions.invoke('generate-girlfriend-photo-ai', {
        body: {
          character: { 
            hairColor: character.hairColor,
            hairStyle: character.hairStyle,
            bodyType: character.bodyType,
            personality: character.personality,
            outfit: character.outfit,
            eyeColor: character.eyeColor,
            age: character.age,
            ethnicity: character.ethnicity,
            imageStyle: style,
            avatarView: view,
            clothing: clothing,
            interests: character.interests,
            hobbies: character.hobbies,
            characterTraits: character.characterTraits
          },
          seed: characterSeed,
          retryAttempt: 0
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.image) {
        throw new Error('Aucune image générée');
      }

      // Update character in Supabase with new image
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const updatedImages = [...(character.images || [character.image]), data.image];
        
        const { error: updateError } = await supabase
          .from('saved_girlfriend_images')
          .update({
            image_urls: updatedImages,
            image_url: data.image // Update the main image to the latest
          })
          .eq('id', character.id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating character:', updateError);
          throw updateError;
        }

        toast({
          title: "Avatar généré !",
          description: "Un nouvel avatar a été ajouté à ce personnage",
        });

        // Reload characters to show the new image
        await loadCharacters();
        
        // Update selected character if it's the one being viewed
        if (selectedCharacter?.id === character.id) {
          const updatedChar = { ...character, images: updatedImages, image: data.image };
          setSelectedCharacter(updatedChar);
        }
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'avatar. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('gallery.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20">
      {/* Header */}
      <div className="border-b border-primary/10 bg-background/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('gallery.back')}
              </Button>
              <h1 className="text-2xl font-bold text-romantic-foreground">{t('gallery.title')}</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <Button onClick={() => navigate('/customize')} className="bg-primary hover:bg-primary/90">
                {t('gallery.createNew')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {characters.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No Saved Characters</h2>
            <p className="text-muted-foreground mb-6">
              You haven't saved any characters yet. Create your first AI girlfriend!
            </p>
            <Button onClick={() => navigate('/customize')} className="bg-primary hover:bg-primary/90">
              Create Your First Character
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {characters.map((character) => {
              const imageCount = character.images?.length || 1;
              return (
                <Card key={character.id} className="overflow-hidden hover:shadow-lg transition-shadow border-primary/10">
                   <div 
                    className="aspect-square relative overflow-hidden cursor-pointer group"
                    onClick={() => viewCharacterImages(character)}
                  >
                    {character.image ? (
                      <img
                        src={character.image}
                        alt={character.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          console.error('Failed to load image:', character.image);
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground">Pas d'image</p>
                      </div>
                    )}
                    {imageCount > 1 && (
                      <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">
                        <Images className="h-3 w-3 mr-1" />
                        {imageCount}
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={character.image} alt={character.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {character.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">{character.name}</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="capitalize">
                        {character.personality} • {character.hairColor} {character.hairStyle}
                      </p>
                      <p className="capitalize">
                        {character.eyeColor} eyes • {character.bodyType}
                      </p>
                      {character.interests && (
                        <p className="text-xs mt-2">
                          <span className="font-semibold">Intérêts:</span> {character.interests}
                        </p>
                      )}
                      {character.hobbies && (
                        <p className="text-xs">
                          <span className="font-semibold">Hobbies:</span> {character.hobbies}
                        </p>
                      )}
                      {character.characterTraits && (
                        <p className="text-xs">
                          <span className="font-semibold">Traits:</span> {character.characterTraits}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-primary hover:bg-primary/90"
                        onClick={() => selectCharacter(character)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => editCharacter(character)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(character.id, character.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Created {new Date(character.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Images Dialog avec Carousel */}
      <Dialog open={showImagesDialog} onOpenChange={setShowImagesDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={selectedCharacter?.image} alt={selectedCharacter?.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {selectedCharacter?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{selectedCharacter?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedCharacter?.personality} • {selectedCharacter?.hairColor} {selectedCharacter?.hairStyle}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {/* Character Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <p className="capitalize">
              <span className="font-semibold">Apparence:</span> {selectedCharacter?.eyeColor} eyes • {selectedCharacter?.bodyType} • {selectedCharacter?.age}
            </p>
            {selectedCharacter?.interests && (
              <p>
                <span className="font-semibold">Intérêts:</span> {selectedCharacter.interests}
              </p>
            )}
            {selectedCharacter?.hobbies && (
              <p>
                <span className="font-semibold">Hobbies:</span> {selectedCharacter.hobbies}
              </p>
            )}
            {selectedCharacter?.characterTraits && (
              <p>
                <span className="font-semibold">Traits de caractère:</span> {selectedCharacter.characterTraits}
              </p>
            )}
          </div>

          {/* Images Carousel */}
          {selectedCharacter?.images && selectedCharacter.images.length > 1 ? (
            <div className="mt-4">
              <h3 className="font-semibold mb-3 text-center">
                {selectedCharacter.images.length} Images
              </h3>
              <div className="relative px-12">
                <Carousel 
                  className="w-full max-w-2xl mx-auto"
                  opts={{
                    align: "center",
                    loop: true,
                  }}
                >
                  <CarouselContent>
                    {selectedCharacter.images.map((imageUrl, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-square rounded-lg overflow-hidden border border-border">
                          <img
                            src={imageUrl}
                            alt={`${selectedCharacter.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="aspect-square rounded-lg overflow-hidden border border-border max-w-md mx-auto">
                <img
                  src={selectedCharacter?.image}
                  alt={selectedCharacter?.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="space-y-2 mt-4">
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => {
                if (selectedCharacter) generateNewAvatar(selectedCharacter);
              }}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? 'Génération en cours...' : 'Générer un nouvel avatar'}
            </Button>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  if (selectedCharacter) selectCharacter(selectedCharacter);
                  setShowImagesDialog(false);
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (selectedCharacter) editCharacter(selectedCharacter);
                  setShowImagesDialog(false);
                }}
              >
                Edit Character
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CharacterGallery;