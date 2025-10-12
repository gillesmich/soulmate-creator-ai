import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ElevenLabsVoiceSelector from '@/components/ElevenLabsVoiceSelector';
import { useApiKey } from '@/hooks/useApiKey';
import { invokeFunctionWithApiKey } from '@/utils/apiHelper';

const ImportMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const uploadedImage = location.state?.uploadedImage;
  const { apiKey } = useApiKey();

  const [age, setAge] = useState('25');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['realistic']);
  const [selectedViews, setSelectedViews] = useState<string[]>(['bust']);
  const [selectedClothing, setSelectedClothing] = useState<string[]>(['clothed']);
  const [interests, setInterests] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [characterTraits, setCharacterTraits] = useState('');
  const [voice, setVoice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const imageStyles = ['realistic', 'anime', 'cartoon', 'digital art'];
  const avatarViews = ['bust', 'full body'];
  const clothingOptions = ['clothed', 'nude', 'lingerie'];

  const toggleSelection = (value: string, currentSelection: string[], setter: (val: string[]) => void) => {
    if (currentSelection.includes(value)) {
      setter(currentSelection.filter(v => v !== value));
    } else {
      setter([...currentSelection, value]);
    }
  };

  const generateAvatar = async () => {
    if (!uploadedImage) {
      toast.error('Aucune image de référence');
      return;
    }

    if (!apiKey) {
      toast.error('Clé API manquante. Veuillez en créer une dans les paramètres.');
      return;
    }

    if (selectedStyles.length === 0 || selectedViews.length === 0 || selectedClothing.length === 0) {
      toast.error('Veuillez sélectionner au moins un style, une vue et une tenue');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await invokeFunctionWithApiKey({
        functionName: 'generate-girlfriend-photo-ai',
        apiKey,
        body: {
          character: {
            hairColor: 'brown',
            hairStyle: 'long',
            bodyType: 'athletic',
            eyeColor: 'brown',
            ethnicity: 'mixed',
            age,
            interests,
            hobbies,
            characterTraits,
            imageStyle: selectedStyles[0],
            avatarView: selectedViews[0],
            clothing: selectedClothing[0],
          },
          referenceImage: uploadedImage,
        }
      });

      if (error) throw error;

      if (data?.image) {
        toast.success('Avatar généré avec succès!');
        
        // Store in session for use in other pages
        const characterData = {
          age,
          interests,
          hobbies,
          characterTraits,
          imageStyle: selectedStyles,
          avatarView: selectedViews,
          clothing: selectedClothing,
          voice,
        };
        
        sessionStorage.setItem('generatedCharacter', JSON.stringify(characterData));
        sessionStorage.setItem('generatedImage', data.image);
        
        navigate('/customize');
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!uploadedImage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <p className="text-muted-foreground mb-4">Aucune image de référence trouvée</p>
          <Button onClick={() => navigate('/customize')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/customize')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <h1 className="text-3xl font-bold mb-8">Générer un avatar depuis une photo</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image de référence */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Image de référence</h2>
            <img
              src={uploadedImage}
              alt="Reference"
              className="w-full rounded-lg object-cover"
            />
          </Card>

          {/* Paramètres */}
          <div className="space-y-6">
            {/* Age */}
            <div className="space-y-2">
              <Label>Âge</Label>
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['18', '20', '22', '25', '28', '30', '35', '40'].map(a => (
                    <SelectItem key={a} value={a}>{a} ans</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Style d'image */}
            <div className="space-y-2">
              <Label>Style d'image</Label>
              <div className="grid grid-cols-2 gap-2">
                {imageStyles.map(style => (
                  <div key={style} className="flex items-center space-x-2">
                    <Checkbox
                      id={`style-${style}`}
                      checked={selectedStyles.includes(style)}
                      onCheckedChange={() => toggleSelection(style, selectedStyles, setSelectedStyles)}
                    />
                    <label htmlFor={`style-${style}`} className="text-sm capitalize cursor-pointer">
                      {style}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Vues */}
            <div className="space-y-2">
              <Label>Vues</Label>
              <div className="grid grid-cols-2 gap-2">
                {avatarViews.map(view => (
                  <div key={view} className="flex items-center space-x-2">
                    <Checkbox
                      id={`view-${view}`}
                      checked={selectedViews.includes(view)}
                      onCheckedChange={() => toggleSelection(view, selectedViews, setSelectedViews)}
                    />
                    <label htmlFor={`view-${view}`} className="text-sm capitalize cursor-pointer">
                      {view}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tenues */}
            <div className="space-y-2">
              <Label>Tenues</Label>
              <div className="grid grid-cols-2 gap-2">
                {clothingOptions.map(clothing => (
                  <div key={clothing} className="flex items-center space-x-2">
                    <Checkbox
                      id={`clothing-${clothing}`}
                      checked={selectedClothing.includes(clothing)}
                      onCheckedChange={() => toggleSelection(clothing, selectedClothing, setSelectedClothing)}
                    />
                    <label htmlFor={`clothing-${clothing}`} className="text-sm capitalize cursor-pointer">
                      {clothing}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Traits de caractère */}
            <div className="space-y-2">
              <Label>Centres d'intérêt</Label>
              <Textarea
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Ex: voyages, musique, art..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Loisirs</Label>
              <Textarea
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                placeholder="Ex: lecture, cuisine, sport..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Traits de personnalité</Label>
              <Textarea
                value={characterTraits}
                onChange={(e) => setCharacterTraits(e.target.value)}
                placeholder="Ex: drôle, intelligente, attentionnée..."
                rows={2}
              />
            </div>

            {/* Voix ElevenLabs */}
            <ElevenLabsVoiceSelector
              value={voice}
              onChange={setVoice}
              label="Voix"
            />

            {/* Bouton Générer */}
            <Button
              onClick={generateAvatar}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                'Générer l\'avatar'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportMode;
