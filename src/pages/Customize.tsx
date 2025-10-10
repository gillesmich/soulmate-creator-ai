import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Sparkles, RefreshCw, Save } from 'lucide-react';
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
    age: 'medium age'
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

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
      });
      if (savedCharacter.image) {
        setGeneratedImage(savedCharacter.image);
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
    age: ['teen', 'medium age']
  };

  const updateCharacter = (key: keyof CharacterOptions, value: string) => {
    setCharacter(prev => ({ ...prev, [key]: value }));
    // Clear generated image when character changes
    setGeneratedImage(null);
  };

  const generatePhoto = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-girlfriend-photo', {
        body: { character }
      });

      if (error) throw error;

      console.log('Photo generation response:', data);
      setGeneratedImage(data.image);
      toast({
        title: "Photo Generated!",
        description: "Your girlfriend's photo has been created.",
      });
    } catch (error) {
      console.error('Error generating photo:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove auto-generation on mount

  const startChat = () => {
    setCurrentCharacter({ ...character, image: generatedImage || '' });
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
              {Object.entries(options).map(([category, choices]) => (
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
              ))}
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
                <div className="bg-gradient-to-b from-primary/10 to-accent/10 rounded-lg p-4 text-center min-h-[400px] flex items-center justify-center">
                  {isGenerating ? (
                    <div className="space-y-4">
                      <RefreshCw className="h-12 w-12 text-primary animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground">Generating your girlfriend's photo...</p>
                    </div>
                  ) : generatedImage ? (
                    <div className="space-y-3">
                      <img 
                        src={generatedImage} 
                        alt="Your AI Girlfriend" 
                        className="w-full max-w-sm rounded-lg shadow-lg"
                        onError={(e) => {
                          console.error('Image load error:', e);
                          console.log('Image src:', generatedImage);
                        }}
                        onLoad={() => console.log('Image loaded successfully')}
                      />
                      <Button 
                        onClick={generatePhoto} 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-accent mr-2"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate New Photo
                      </Button>
                      <Button 
                        onClick={() => setShowSaveDialog(true)} 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-accent"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-6xl">📸</div>
                      <Button 
                        onClick={generatePhoto} 
                        className="bg-primary hover:bg-primary/90"
                      >
                        Generate Photo
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

                <Button 
                  onClick={startChat} 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  size="lg"
                  disabled={!generatedImage}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Chatting
                </Button>
              </CardContent>
            </Card>

            {generatedImage && (
              <div className="mt-4">
                <VideoGenerator imageUrl={generatedImage} />
              </div>
            )}
          </div>
        </div>
      </div>

      <SaveImageDialog 
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        imageUrl={generatedImage || ''}
        characterData={character}
      />
    </div>
  );
};

export default Customize;