import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';

interface CharacterOptions {
  hairColor: string;
  hairStyle: string;
  bodyType: string;
  personality: string;
  outfit: string;
  eyeColor: string;
}

const Customize = () => {
  const navigate = useNavigate();
  const [character, setCharacter] = useState<CharacterOptions>({
    hairColor: 'blonde',
    hairStyle: 'long',
    bodyType: 'slim',
    personality: 'sweet',
    outfit: 'casual',
    eyeColor: 'blue'
  });

  const options = {
    hairColor: ['blonde', 'brunette', 'black', 'red', 'pink'],
    hairStyle: ['long', 'short', 'curly', 'straight', 'ponytail'],
    bodyType: ['slim', 'curvy', 'athletic', 'petite'],
    personality: ['sweet', 'playful', 'mysterious', 'caring', 'flirty'],
    outfit: ['casual', 'elegant', 'sporty', 'cute', 'sexy'],
    eyeColor: ['blue', 'brown', 'green', 'hazel', 'gray']
  };

  const updateCharacter = (key: keyof CharacterOptions, value: string) => {
    setCharacter(prev => ({ ...prev, [key]: value }));
  };

  const startChat = () => {
    localStorage.setItem('girlfriendCharacter', JSON.stringify(character));
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
                <div className="bg-gradient-to-b from-primary/10 to-accent/10 rounded-lg p-6 text-center min-h-[300px] flex items-center justify-center">
                  <div className="space-y-2">
                    <div className="text-6xl">👩‍🦰</div>
                    <p className="text-sm text-muted-foreground">
                      AI-Generated Avatar Coming Soon
                    </p>
                  </div>
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
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Chatting
                </Button>
              </CardContent>
            </Card>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default Customize;