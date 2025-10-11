import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Trash2, Images } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getSavedCharacters, deleteCharacter, setCurrentCharacter, type SavedCharacter } from '@/utils/characterStorage';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const CharacterGallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<SavedCharacter | null>(null);
  const [showImagesDialog, setShowImagesDialog] = useState(false);

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
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading from Supabase:', error);
          setCharacters([]);
          setLoading(false);
          return;
        }
        
        if (supabaseCharacters && supabaseCharacters.length > 0) {
          const loadedCharacters = supabaseCharacters.map(sc => {
            const characterData = typeof sc.character_data === 'object' && sc.character_data !== null 
              ? sc.character_data as Record<string, any>
              : {};
            
            const imageUrls = Array.isArray(sc.image_urls) 
              ? sc.image_urls.filter((url): url is string => typeof url === 'string')
              : [sc.image_url];
            
            return {
              id: sc.id,
              name: sc.name,
              image: sc.image_url,
              images: imageUrls,
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
              characterTraits: characterData.characterTraits || ''
            };
          });
          
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
    setCurrentCharacter({
      ...character,
      image: character.image,
      images: character.images || [character.image]
    });
    
    toast({
      title: "Character Selected",
      description: `${character.name} is now your active character`,
    });
    
    navigate('/voice-chat');
  };

  const viewCharacterImages = (character: SavedCharacter) => {
    setSelectedCharacter(character);
    setShowImagesDialog(true);
  };

  const handleDelete = (id: string, name: string) => {
    deleteCharacter(id);
    setCharacters(getSavedCharacters());
    toast({
      title: "Character Deleted",
      description: `${name} has been removed`,
    });
  };

  const editCharacter = (character: SavedCharacter) => {
    setCurrentCharacter({
      ...character,
      images: character.images || [character.image]
    });
    navigate('/customize');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading your characters...</p>
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
                Back
              </Button>
              <h1 className="text-2xl font-bold text-romantic-foreground">Character Gallery</h1>
            </div>
            <Button onClick={() => navigate('/customize')} className="bg-primary hover:bg-primary/90">
              Create New Character
            </Button>
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
                    <img
                      src={character.image}
                      alt={character.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
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
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
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

          <div className="flex gap-2 mt-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CharacterGallery;