import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getSavedCharacters, deleteCharacter, setCurrentCharacter, type SavedCharacter } from '@/utils/characterStorage';

const CharacterGallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = () => {
    setLoading(true);
    // Load from localStorage
    const localCharacters = getSavedCharacters();
    setCharacters(localCharacters);
    setLoading(false);
  };

  const selectCharacter = (character: SavedCharacter) => {
    setCurrentCharacter({
      ...character,
      image: character.image
    });
    
    toast({
      title: "Character Selected",
      description: `${character.name} is now your active character`,
    });
    
    navigate('/chat');
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
    setCurrentCharacter(character);
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
            {characters.map((character) => (
              <Card key={character.id} className="overflow-hidden hover:shadow-lg transition-shadow border-primary/10">
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={character.image}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-center">{character.name}</CardTitle>
                  <div className="text-sm text-muted-foreground text-center space-y-1">
                    <p className="capitalize">
                      {character.personality} • {character.hairColor} {character.hairStyle}
                    </p>
                    <p className="capitalize">
                      {character.eyeColor} eyes • {character.bodyType}
                    </p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterGallery;