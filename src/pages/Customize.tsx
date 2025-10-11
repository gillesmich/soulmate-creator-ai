import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Sparkles, RefreshCw, Save, Mic } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SaveImageDialog from '@/components/SaveImageDialog';
import VideoGenerator from '@/components/VideoGenerator';
import { setCurrentCharacter, getCurrentCharacter } from '@/utils/characterStorage';

interface CharacterOptions {
  hairColor: string;
  hairStyle: string;
  bodyType: string;
  personality: string;
  outfit: string;
  eyeColor: string;
  age: string;
  voice: string;
  avatarView: string;
  clothing: string;
  imageStyle: string;
  interests: string;
  hobbies: string;
  characterTraits: string;
}

const Customize = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [character, setCharacter] = useState<CharacterOptions>({
    hairColor: 'blonde',
    hairStyle: 'long',
    bodyType: 'slim',
    personality: 'sweet',
    outfit: 'casual',
    eyeColor: 'blue',
    age: 'medium age',
    voice: 'alloy',
    avatarView: 'bust',
    clothing: 'clothed',
    imageStyle: 'realistic',
    interests: '',
    hobbies: '',
    characterTraits: ''
  });
  const [generatedImages, setGeneratedImages] = useState<{url: string, style: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['realistic']);

  // Load character from localStorage on mount if exists
  useEffect(() => {
    const savedCharacter = getCurrentCharacter();
    if (savedCharacter) {
      setCharacter({
        hairColor: savedCharacter.hairColor,
        hairStyle: savedCharacter.hairStyle,
        bodyType: savedCharacter.bodyType,
        personality: savedCharacter.personality,
        outfit: savedCharacter.outfit,
        eyeColor: savedCharacter.eyeColor,
        age: savedCharacter.age,
        voice: savedCharacter.voice || 'alloy',
        avatarView: savedCharacter.avatarView || 'bust',
        clothing: savedCharacter.clothing || 'clothed',
        imageStyle: savedCharacter.imageStyle || 'realistic',
        interests: savedCharacter.interests || '',
        hobbies: savedCharacter.hobbies || '',
        characterTraits: savedCharacter.characterTraits || ''
      });
      if (savedCharacter.image) {
        setGeneratedImages([{ url: savedCharacter.image, style: savedCharacter.imageStyle || 'realistic' }]);
      }
    }
  }, []);

  const options = {
    hairColor: ['blonde', 'brunette', 'black', 'red', 'pink'],
    hairStyle: ['long', 'short', 'curly', 'straight', 'ponytail'],
    bodyType: ['slim', 'curvy', 'athletic', 'petite'],
    personality: ['sweet', 'playful', 'mysterious', 'caring', 'flirty'],
    outfit: ['casual', 'elegant', 'sporty', 'cute', 'sexy'],
    eyeColor: ['blue', 'brown', 'green', 'hazel', 'gray'],
    age: ['teen', 'medium age'],
    voice: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'],
    avatarView: ['bust', 'full body'],
    clothing: ['clothed', 'nude', 'lingerie'],
    imageStyle: ['realistic', 'anime', 'cartoon', 'digital art']
  };

  const updateCharacter = (key: keyof CharacterOptions, value: string) => {
    setCharacter(prev => ({ ...prev, [key]: value }));
    // Clear generated images when character changes
    setGeneratedImages([]);
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(style)) {
        return prev.filter(s => s !== style);
      } else {
        return [...prev, style];
      }
    });
  };

  const generatePhoto = async () => {
    if (selectedStyles.length === 0) {
      toast({
        title: "Aucun style sélectionné",
        description: "Veuillez sélectionner au moins un style d'image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);
    
    try {
      // Generate images for each selected style in parallel
      const generationPromises = selectedStyles.map(async (style) => {
        const { data, error } = await supabase.functions.invoke('generate-girlfriend-photo-ai', {
          body: { character: { ...character, imageStyle: style } }
        });

        if (error) {
          console.error(`Error generating ${style} image:`, error);
          throw error;
        }

        console.log(`${style} photo generation response:`, data);
        return { url: data.image, style };
      });

      const results = await Promise.all(generationPromises);
      setGeneratedImages(results);
      
      toast({
        title: "✨ Photos générées!",
        description: `${results.length} image(s) créée(s) avec Lovable AI`,
      });
    } catch (error) {
      console.error('Error generating photos:', error);
      toast({
        title: "Échec de la génération",
        description: error.message || "Impossible de générer les photos. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove auto-generation on mount

  const startChat = () => {
    const mainImage = generatedImages.length > 0 ? generatedImages[0].url : '';
    setCurrentCharacter({ ...character, image: mainImage });
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
            Create Your Perfect Girlfriend
          </h1>
          <p className="text-muted-foreground text-lg">
            Customize every detail to bring your dream companion to life
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Customization Options */}
          <div className="lg:col-span-2">
            <div className="grid gap-6">
              {Object.entries(options).map(([category, choices]) => {
                // Skip imageStyle as we handle it separately for multi-select
                if (category === 'imageStyle') return null;
                
                return (
                  <Card key={category} className="border-primary/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 capitalize">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {category.replace(/([A-Z])/g, ' $1')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {choices.map((choice) => (
                          <Button
                            key={choice}
                            variant={character[category as keyof CharacterOptions] === choice ? "default" : "outline"}
                            onClick={() => updateCharacter(category as keyof CharacterOptions, choice)}
                            className={`capitalize ${
                              character[category as keyof CharacterOptions] === choice 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-accent"
                            }`}
                          >
                            {choice}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Multi-select for image styles */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Styles d'image (sélection multiple)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {options.imageStyle.map((style) => (
                      <Button
                        key={style}
                        variant={selectedStyles.includes(style) ? "default" : "outline"}
                        onClick={() => toggleStyle(style)}
                        className={`capitalize ${
                          selectedStyles.includes(style)
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        }`}
                      >
                        {style}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sélectionnez un ou plusieurs styles pour générer plusieurs images
                  </p>
                </CardContent>
              </Card>

              {/* Text customization fields */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Personnalisation du caractère
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="interests">Goûts et intérêts</Label>
                    <Textarea
                      id="interests"
                      placeholder="Ex: musique classique, cinéma d'horreur, cuisine italienne..."
                      value={character.interests}
                      onChange={(e) => updateCharacter('interests', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hobbies">Hobbies</Label>
                    <Textarea
                      id="hobbies"
                      placeholder="Ex: yoga, lecture, randonnée, photographie..."
                      value={character.hobbies}
                      onChange={(e) => updateCharacter('hobbies', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="characterTraits">Traits de caractère supplémentaires</Label>
                    <Textarea
                      id="characterTraits"
                      placeholder="Ex: sens de l'humour, timide au début, aime les longues discussions..."
                      value={character.characterTraits}
                      onChange={(e) => updateCharacter('characterTraits', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Character Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-gradient-to-b from-romantic to-card border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Your Girlfriend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-b from-primary/10 to-accent/10 rounded-lg p-4 text-center min-h-[400px]">
                  {isGenerating ? (
                    <div className="space-y-4 flex flex-col items-center justify-center h-full">
                      <RefreshCw className="h-12 w-12 text-primary animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground">Génération de {selectedStyles.length} image(s)...</p>
                    </div>
                  ) : generatedImages.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                        {generatedImages.map((img, idx) => (
                          <div key={idx} className="space-y-2">
                            <Badge variant="secondary" className="mb-1">{img.style}</Badge>
                            <img 
                              src={img.url} 
                              alt={`AI Girlfriend - ${img.style}`} 
                              className="w-full rounded-lg shadow-lg"
                              onError={(e) => {
                                console.error('Image load error:', e);
                                console.log('Image src:', img.url);
                              }}
                              onLoad={() => console.log(`Image ${img.style} loaded successfully`)}
                            />
                            <Button 
                              onClick={() => setShowSaveDialog(true)} 
                              variant="outline" 
                              size="sm"
                              className="hover:bg-accent w-full"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Sauvegarder
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button 
                        onClick={generatePhoto} 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-accent w-full mt-2"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Générer de nouvelles photos
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 flex flex-col items-center justify-center h-full">
                      <div className="text-6xl">📸</div>
                      <Button 
                        onClick={generatePhoto} 
                        className="bg-primary hover:bg-primary/90"
                        disabled={selectedStyles.length === 0}
                      >
                        Générer {selectedStyles.length} photo(s)
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-romantic-foreground">Character Traits</h3>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(character).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={startChat} 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    size="lg"
                    disabled={generatedImages.length === 0}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Start Chatting
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      const mainImage = generatedImages.length > 0 ? generatedImages[0].url : '';
                      setCurrentCharacter({ ...character, image: mainImage });
                      navigate('/voice-chat');
                    }} 
                    className="w-full bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
                    size="lg"
                    disabled={generatedImages.length === 0}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Chat
                  </Button>
                </div>
              </CardContent>
            </Card>

            {generatedImages.length > 0 && (
              <div className="mt-4">
                <VideoGenerator imageUrl={generatedImages[0].url} />
              </div>
            )}
          </div>
        </div>
      </div>

      <SaveImageDialog 
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        imageUrl={generatedImages.length > 0 ? generatedImages[0].url : ''}
        characterData={character}
      />
    </div>
  );
};

export default Customize;