import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import ElevenLabsVoiceSelector from '@/components/ElevenLabsVoiceSelector';
import SaveImageDialog from '@/components/SaveImageDialog';
import { useApiKey } from '@/hooks/useApiKey';
import { invokeFunctionWithApiKey } from '@/utils/apiHelper';

const ImportMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const uploadedImage = location.state?.uploadedImage;
  const { apiKey } = useApiKey();

  const [age, setAge] = useState('25');
  const [imageStyle, setImageStyle] = useState('anime');
  const [avatarView, setAvatarView] = useState('bust');
  const [clothing, setClothing] = useState('clothed');
  const [interests, setInterests] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [characterTraits, setCharacterTraits] = useState('');
  const [voice, setVoice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const imageStyles = ['realistic', 'anime', 'cartoon', 'digital art'];
  const avatarViews = ['bust', 'full body'];
  const clothingOptions = ['clothed', 'nude', 'lingerie'];

  const generateAvatar = async () => {
    if (!uploadedImage) {
      toast.error('Aucune image de référence');
      return;
    }

    if (!apiKey) {
      toast.error('Clé API manquante. Veuillez en créer une dans les paramètres.');
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
            imageStyle,
            avatarView,
            clothing,
          },
          referenceImage: uploadedImage,
        }
      });

      if (error) throw error;

      if (data?.image) {
        setGeneratedImage(data.image);
        toast.success('Avatar généré avec succès!');
        
        // Store in session for use in other pages
        const characterData = {
          age,
          interests,
          hobbies,
          characterTraits,
          imageStyle,
          avatarView,
          clothing,
          voice,
        };
        
        sessionStorage.setItem('generatedCharacter', JSON.stringify(characterData));
        sessionStorage.setItem('generatedImage', data.image);
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  // Show loading state while API key is being fetched
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
          {/* Image de référence ou générée */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {generatedImage ? 'Avatar généré' : 'Image de référence'}
            </h2>
            <img
              src={generatedImage || uploadedImage}
              alt={generatedImage ? 'Generated avatar' : 'Reference'}
              className="w-full rounded-lg object-cover"
            />
            {generatedImage && (
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => setShowSaveDialog(true)}
                  className="flex-1"
                  variant="default"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </Button>
                <Button
                  onClick={() => navigate('/customize')}
                  className="flex-1"
                  variant="outline"
                >
                  Continuer
                </Button>
              </div>
            )}
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
              <Select value={imageStyle} onValueChange={setImageStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageStyles.map(style => (
                    <SelectItem key={style} value={style} className="capitalize">
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vues */}
            <div className="space-y-2">
              <Label>Vue</Label>
              <Select value={avatarView} onValueChange={setAvatarView}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {avatarViews.map(view => (
                    <SelectItem key={view} value={view} className="capitalize">
                      {view}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tenues */}
            <div className="space-y-2">
              <Label>Tenue</Label>
              <Select value={clothing} onValueChange={setClothing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clothingOptions.map(cloth => (
                    <SelectItem key={cloth} value={cloth} className="capitalize">
                      {cloth}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={isGenerating || !!generatedImage}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : generatedImage ? (
                'Avatar généré'
              ) : (
                'Générer l\'avatar'
              )}
            </Button>

            {generatedImage && (
              <Button
                onClick={() => {
                  setGeneratedImage(null);
                  setAge('25');
                  setImageStyle('anime');
                  setAvatarView('bust');
                  setClothing('clothed');
                  setInterests('');
                  setHobbies('');
                  setCharacterTraits('');
                  setVoice('');
                }}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Générer un nouvel avatar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <SaveImageDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        imageUrls={generatedImage ? [generatedImage] : []}
        characterData={{
          hairColor: 'brown',
          hairStyle: 'long',
          bodyType: 'athletic',
          personality: characterTraits,
          outfit: clothing,
          eyeColor: 'brown',
          age,
          voice,
          avatarView,
          clothing,
          imageStyle,
          interests,
          hobbies,
          characterTraits,
          ethnicity: 'mixed'
        }}
      />
    </div>
  );
};

export default ImportMode;
