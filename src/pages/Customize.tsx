import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Sparkles, RefreshCw, Save, Mic, Wand2, LogIn, LogOut, Images } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApiKey } from '@/hooks/useApiKey';
import { invokeFunctionWithApiKey } from '@/utils/apiHelper';
import SaveImageDialog from '@/components/SaveImageDialog';
import AttitudeVariationsDialog from '@/components/AttitudeVariationsDialog';
import VideoGenerator from '@/components/VideoGenerator';
import VoiceSelector from '@/components/VoiceSelector';
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
  const { user, signOut } = useAuth();
  const { apiKey, loading: apiKeyLoading } = useApiKey();
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
  const [generatedImages, setGeneratedImages] = useState<{url: string, style: string, view: string, clothing: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAttitudeDialog, setShowAttitudeDialog] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['realistic']);
  const [selectedViews, setSelectedViews] = useState<string[]>(['bust']);
  const [selectedClothing, setSelectedClothing] = useState<string[]>(['clothed']);
  const [currentBatchSeed, setCurrentBatchSeed] = useState<number | null>(null);
  const [sceneryTheme, setSceneryTheme] = useState<string>('');

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
      
      // Load all saved images or just the main one
      if (savedCharacter.images && savedCharacter.images.length > 0) {
        setGeneratedImages(
          savedCharacter.images.map((url, index) => ({
            url,
            style: savedCharacter.imageStyle || 'realistic',
            view: savedCharacter.avatarView || 'bust',
            clothing: savedCharacter.clothing || 'clothed'
          }))
        );
      } else if (savedCharacter.image) {
        setGeneratedImages([{ 
          url: savedCharacter.image, 
          style: savedCharacter.imageStyle || 'realistic', 
          view: savedCharacter.avatarView || 'bust', 
          clothing: savedCharacter.clothing || 'clothed' 
        }]);
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
    avatarView: ['bust', 'full body'],
    clothing: ['clothed', 'nude', 'lingerie'],
    imageStyle: ['realistic', 'anime', 'cartoon', 'digital art']
  };

  const updateCharacter = (key: keyof CharacterOptions, value: string) => {
    setCharacter(prev => ({ ...prev, [key]: value }));
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

  const toggleView = (view: string) => {
    setSelectedViews(prev => {
      if (prev.includes(view)) {
        return prev.filter(v => v !== view);
      } else {
        return [...prev, view];
      }
    });
  };

  const toggleClothing = (clothing: string) => {
    setSelectedClothing(prev => {
      if (prev.includes(clothing)) {
        return prev.filter(c => c !== clothing);
      } else {
        return [...prev, clothing];
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

    if (selectedViews.length === 0) {
      toast({
        title: "Aucune vue sélectionnée",
        description: "Veuillez sélectionner au moins une vue (buste ou corps entier)",
        variant: "destructive",
      });
      return;
    }

    if (selectedClothing.length === 0) {
      toast({
        title: "Aucune tenue sélectionnée",
        description: "Veuillez sélectionner au moins une tenue",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);
    
    const totalImages = selectedStyles.length * selectedViews.length * selectedClothing.length;
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Generate a unique seed for this batch to ensure consistency
      const characterSeed = Date.now();
      setCurrentBatchSeed(characterSeed);
      
      // Generate images for each combination of style, view, and clothing
      const generationPromises = selectedStyles.flatMap(style => 
        selectedViews.flatMap(view =>
          selectedClothing.map(async (clothing) => {
            const maxRetries = 2;
            let lastError = null;
            
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                const { data, error } = await invokeFunctionWithApiKey({
                  functionName: 'generate-girlfriend-photo-ai',
                  apiKey,
                  body: { 
                    character: { 
                      ...character, 
                      imageStyle: style,
                      avatarView: view,
                      clothing: clothing
                    },
                    seed: characterSeed,
                    retryAttempt: attempt
                  }
                });

                if (error) {
                  throw error;
                }

                if (!data?.image) {
                  throw new Error('Aucune image générée');
                }

                console.log(`${style} ${view} ${clothing} photo generated successfully`);
                successCount++;
                return { url: data.image, style, view, clothing };
              } catch (err) {
                lastError = err;
                console.error(`Tentative ${attempt + 1}/${maxRetries + 1} échouée pour ${style} ${view} ${clothing}:`, err);
                
                if (attempt < maxRetries) {
                  // Wait before retry (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
              }
            }
            
            // All retries failed
            failedCount++;
            console.error(`Échec définitif pour ${style} ${view} ${clothing}:`, lastError);
            throw lastError;
          })
        )
      );

      const results = await Promise.allSettled(generationPromises);
      
      // Filter successful results
      const successfulImages = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      setGeneratedImages(successfulImages);
      
      if (successfulImages.length > 0) {
        toast({
          title: "✨ Photos générées!",
          description: `${successfulImages.length}/${totalImages} image(s) créée(s) avec succès. Le même avatar est utilisé dans toutes les images.`,
        });
      }
      
      if (failedCount > 0) {
        toast({
          title: "⚠️ Génération partielle",
          description: `${failedCount} image(s) n'ont pas pu être générée(s). Réessayez ou vérifiez vos crédits Lovable AI.`,
          variant: "destructive",
        });
      }
      
      if (successfulImages.length === 0) {
        throw new Error('Aucune image n\'a pu être générée');
      }
    } catch (error) {
      console.error('Error generating photos:', error);
      
      let errorMessage = "Impossible de générer les photos. ";
      
      if (error.message?.includes('Rate limit')) {
        errorMessage += "Limite de requêtes atteinte. Attendez quelques instants.";
      } else if (error.message?.includes('Credits') || error.message?.includes('402')) {
        errorMessage += "Crédits Lovable AI épuisés. Ajoutez des crédits dans Settings → Workspace → Usage.";
      } else if (error.message?.includes('429')) {
        errorMessage += "Trop de requêtes. Attendez 1 minute avant de réessayer.";
      } else {
        errorMessage += "Réessayez dans quelques instants.";
      }
      
      toast({
        title: "❌ Échec de la génération",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMorePhotos = async () => {
    if (selectedStyles.length === 0) {
      toast({
        title: "Aucun style sélectionné",
        description: "Veuillez sélectionner au moins un style d'image",
        variant: "destructive",
      });
      return;
    }

    if (selectedViews.length === 0) {
      toast({
        title: "Aucune vue sélectionnée",
        description: "Veuillez sélectionner au moins une vue (buste ou corps entier)",
        variant: "destructive",
      });
      return;
    }

    if (selectedClothing.length === 0) {
      toast({
        title: "Aucune tenue sélectionnée",
        description: "Veuillez sélectionner au moins une tenue",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    const totalImages = selectedStyles.length * selectedViews.length * selectedClothing.length;
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Use the same seed to maintain consistency with existing images
      const characterSeed = currentBatchSeed || Date.now();
      if (!currentBatchSeed) {
        setCurrentBatchSeed(characterSeed);
      }
      
      // Generate images for each combination of style, view, and clothing
      const generationPromises = selectedStyles.flatMap(style => 
        selectedViews.flatMap(view =>
          selectedClothing.map(async (clothing) => {
            const maxRetries = 2;
            let lastError = null;
            
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                const { data, error } = await invokeFunctionWithApiKey({
                  functionName: 'generate-girlfriend-photo-ai',
                  apiKey,
                  body: { 
                    character: { 
                      ...character, 
                      imageStyle: style,
                      avatarView: view,
                      clothing: clothing
                    },
                    seed: characterSeed,
                    retryAttempt: attempt
                  }
                });

                if (error) {
                  throw error;
                }

                if (!data?.image) {
                  throw new Error('Aucune image générée');
                }

                console.log(`${style} ${view} ${clothing} photo generated successfully`);
                successCount++;
                return { url: data.image, style, view, clothing };
              } catch (err) {
                lastError = err;
                console.error(`Tentative ${attempt + 1}/${maxRetries + 1} échouée pour ${style} ${view} ${clothing}:`, err);
                
                if (attempt < maxRetries) {
                  // Wait before retry (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
              }
            }
            
            // All retries failed
            failedCount++;
            console.error(`Échec définitif pour ${style} ${view} ${clothing}:`, lastError);
            throw lastError;
          })
        )
      );

      const results = await Promise.allSettled(generationPromises);
      
      // Filter successful results
      const successfulImages = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      // Add new images to existing ones instead of replacing
      setGeneratedImages(prev => [...prev, ...successfulImages]);
      
      if (successfulImages.length > 0) {
        toast({
          title: "✨ Photos supplémentaires générées!",
          description: `${successfulImages.length}/${totalImages} image(s) ajoutée(s) avec succès. Total: ${generatedImages.length + successfulImages.length} images.`,
        });
      }
      
      if (failedCount > 0) {
        toast({
          title: "⚠️ Génération partielle",
          description: `${failedCount} image(s) n'ont pas pu être générée(s). Réessayez ou vérifiez vos crédits Lovable AI.`,
          variant: "destructive",
        });
      }
      
      if (successfulImages.length === 0) {
        throw new Error('Aucune image n\'a pu être générée');
      }
    } catch (error) {
      console.error('Error generating more photos:', error);
      
      let errorMessage = "Impossible de générer plus de photos. ";
      
      if (error.message?.includes('Rate limit')) {
        errorMessage += "Limite de requêtes atteinte. Attendez quelques instants.";
      } else if (error.message?.includes('Credits') || error.message?.includes('402')) {
        errorMessage += "Crédits Lovable AI épuisés. Ajoutez des crédits dans Settings → Workspace → Usage.";
      } else if (error.message?.includes('429')) {
        errorMessage += "Trop de requêtes. Attendez 1 minute avant de réessayer.";
      } else {
        errorMessage += "Réessayez dans quelques instants.";
      }
      
      toast({
        title: "❌ Échec de la génération",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove auto-generation on mount

  const regenerateSpecificImage = async (style: string, view: string, clothing: string) => {
    setIsGenerating(true);
    
    try {
      // Réutiliser le seed du batch actuel pour garder le même personnage
      const characterSeed = currentBatchSeed || Date.now();
      
      const { data, error } = await invokeFunctionWithApiKey({
        functionName: 'generate-girlfriend-photo-ai',
        apiKey,
        body: { 
          character: { 
            ...character, 
            imageStyle: style,
            avatarView: view,
            clothing: clothing
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

      // Replace the specific image in the array
      setGeneratedImages(prev => 
        prev.map(img => 
          img.style === style && img.view === view && img.clothing === clothing
            ? { url: data.image, style, view, clothing }
            : img
        )
      );
      
      toast({
        title: "✨ Image régénérée!",
        description: `Image ${style} ${view} ${clothing} recréée avec succès`,
      });
    } catch (error) {
      console.error('Error regenerating image:', error);
      
      let errorMessage = "Impossible de régénérer l'image. ";
      
      if (error.message?.includes('Rate limit')) {
        errorMessage += "Limite de requêtes atteinte.";
      } else if (error.message?.includes('Credits') || error.message?.includes('402')) {
        errorMessage += "Crédits épuisés.";
      } else {
        errorMessage += "Réessayez.";
      }
      
      toast({
        title: "❌ Échec de la régénération",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAttitudeVariations = async (attitudes: string[]) => {
    setIsGenerating(true);
    
    try {
      const characterSeed = currentBatchSeed || Date.now();
      const style = selectedStyles[0] || 'realistic';
      const view = selectedViews[0] || 'bust';
      const clothing = selectedClothing[0] || 'clothed';
      
      const generationPromises = attitudes.map(async (attitude) => {
        try {
          const { data, error } = await invokeFunctionWithApiKey({
            functionName: 'generate-girlfriend-photo-ai',
            apiKey,
            body: { 
              character: { 
                ...character, 
                imageStyle: style,
                avatarView: view,
                clothing: clothing
              },
              seed: characterSeed,
              attitude: attitude,
              retryAttempt: 0
            }
          });

          if (error) throw error;
          if (!data?.image) throw new Error('No image generated');

          return { url: data.image, style, view, clothing };
        } catch (err) {
          console.error(`Failed to generate ${attitude} variation:`, err);
          throw err;
        }
      });

      const results = await Promise.allSettled(generationPromises);
      
      const successfulImages = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      if (successfulImages.length > 0) {
        setGeneratedImages(prev => [...prev, ...successfulImages]);
        
        toast({
          title: "✨ Variations Generated!",
          description: `${successfulImages.length} new variation(s) created with different attitudes`,
        });
      }
      
      const failedCount = results.length - successfulImages.length;
      if (failedCount > 0) {
        toast({
          title: "⚠️ Partial Generation",
          description: `${failedCount} variation(s) failed to generate`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating attitude variations:', error);
      toast({
        title: "❌ Generation Failed",
        description: "Could not generate attitude variations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWithScenery = async () => {
    console.log('Generate with scenery called');
    console.log('Scenery theme:', sceneryTheme);
    console.log('Current batch seed:', currentBatchSeed);
    
    if (!sceneryTheme.trim()) {
      toast({
        title: "Thème manquant",
        description: "Veuillez entrer un décor ou thème pour les photos",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    console.log('Starting generation of 10 photos with scenery...');
    
    const imagesToGenerate = 10;
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Use existing seed or generate a new one
      const characterSeed = currentBatchSeed || Date.now();
      if (!currentBatchSeed) {
        setCurrentBatchSeed(characterSeed);
        console.log('No seed found, generated new seed:', characterSeed);
      }
      
      const generationPromises = Array.from({ length: imagesToGenerate }, async (_, index) => {
        const maxRetries = 2;
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const { data, error } = await invokeFunctionWithApiKey({
              functionName: 'generate-girlfriend-photo-ai',
              apiKey,
              body: { 
                character: { 
                  ...character, 
                  imageStyle: selectedStyles[0] || 'realistic',
                  avatarView: selectedViews[0] || 'bust',
                  clothing: selectedClothing[0] || 'clothed'
                },
                seed: characterSeed,
                scenery: sceneryTheme,
                retryAttempt: attempt
              }
            });

            console.log(`Photo ${index + 1} response:`, { data, error });

            if (error) {
              throw error;
            }

            if (!data?.image) {
              throw new Error('Aucune image générée');
            }

            console.log(`Photo ${index + 1}/${imagesToGenerate} avec décor générée`);
            successCount++;
            return { 
              url: data.image, 
              style: selectedStyles[0] || 'realistic', 
              view: selectedViews[0] || 'bust',
              clothing: selectedClothing[0] || 'clothed'
            };
          } catch (err) {
            lastError = err;
            console.error(`Tentative ${attempt + 1}/${maxRetries + 1} échouée pour image ${index + 1}:`, err);
            
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
          }
        }
        
        failedCount++;
        console.error(`Échec définitif pour image ${index + 1}:`, lastError);
        throw lastError;
      });

      const results = await Promise.allSettled(generationPromises);
      
      const successfulImages = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      setGeneratedImages(prev => [...prev, ...successfulImages]);
      
      if (successfulImages.length > 0) {
        toast({
          title: "✨ Photos avec décor générées!",
          description: `${successfulImages.length}/${imagesToGenerate} image(s) créée(s) avec le thème "${sceneryTheme}"`,
        });
      }
      
      if (failedCount > 0) {
        toast({
          title: "⚠️ Génération partielle",
          description: `${failedCount} image(s) n'ont pas pu être générée(s).`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating scenery photos:', error);
      toast({
        title: "❌ Échec de la génération",
        description: "Impossible de générer les photos avec décor.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetCustomize = () => {
    setCharacter({
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
    setGeneratedImages([]);
    setCurrentBatchSeed(null);
    setSceneryTheme('');
    localStorage.removeItem('currentCharacter');
    toast({
      title: "Nouveau profil",
      description: "Créez un nouveau personnage",
    });
  };

  const startChat = () => {
    const mainImage = generatedImages.length > 0 ? generatedImages[0].url : '';
    const allImages = generatedImages.map(img => img.url);
    setCurrentCharacter({ ...character, image: mainImage, images: allImages });
    navigate('/voice-chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Auth buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/gallery')}
              className="gap-2"
            >
              <Images className="h-4 w-4" />
              Browse Profiles
            </Button>
            <Button
              variant="outline"
              onClick={resetCustomize}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Créer nouveau
            </Button>
          </div>
          
          <div className="flex gap-2">
            {user ? (
              <Button
                variant="outline"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                Connexion
              </Button>
            )}
          </div>
        </div>

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
                // Skip imageStyle, avatarView, and clothing as we handle them separately for multi-select
                if (category === 'imageStyle' || category === 'avatarView' || category === 'clothing') return null;
                
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

              {/* Multi-select for avatar views */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Vues de l'avatar (sélection multiple)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {options.avatarView.map((view) => (
                      <Button
                        key={view}
                        variant={selectedViews.includes(view) ? "default" : "outline"}
                        onClick={() => toggleView(view)}
                        className={`capitalize ${
                          selectedViews.includes(view)
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        }`}
                      >
                        {view}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sélectionnez buste et/ou corps entier. Le même personnage sera généré pour toutes les vues.
                  </p>
                </CardContent>
              </Card>

              {/* Multi-select for clothing */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Tenues (sélection multiple)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {options.clothing.map((clothing) => (
                      <Button
                        key={clothing}
                        variant={selectedClothing.includes(clothing) ? "default" : "outline"}
                        onClick={() => toggleClothing(clothing)}
                        className={`capitalize ${
                          selectedClothing.includes(clothing)
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        }`}
                      >
                        {clothing}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sélectionnez une ou plusieurs tenues. Le même personnage sera généré pour toutes les tenues.
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

              {/* Voice Selection Card */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-primary" />
                    Voix française
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VoiceSelector 
                    value={character.voice}
                    onChange={(value) => updateCharacter('voice', value)}
                    label="Sélectionnez la voix de conversation"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Toutes les voix sont françaises féminines
                  </p>
                </CardContent>
              </Card>

              {/* Scenery Theme Card */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Générer 10 photos avec décor personnalisé
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sceneryTheme">Décor ou thème (une phrase)</Label>
                    <Textarea
                      id="sceneryTheme"
                      placeholder="Ex: sur une plage au coucher du soleil, dans un café parisien, dans une forêt enneigée..."
                      value={sceneryTheme}
                      onChange={(e) => setSceneryTheme(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <Button 
                    onClick={generateWithScenery} 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90"
                    disabled={isGenerating || !sceneryTheme.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer 10 photos avec ce décor
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {currentBatchSeed 
                      ? "Utilisez le même avatar que les photos existantes avec un nouveau décor"
                      : "Créez un nouvel avatar avec ce décor (pas de photos existantes)"}
                  </p>
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
                      <p className="text-sm text-muted-foreground">
                        Génération de {selectedStyles.length * selectedViews.length} image(s)...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Le même personnage sera créé pour toutes les vues
                      </p>
                    </div>
                  ) : generatedImages.length > 0 ? (
                    <div className="space-y-3">
                      {generatedImages.length > 0 && (
                        <p className="text-sm font-medium text-primary text-center">
                          {generatedImages.length} image(s) générée(s) avec le même avatar
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                        {generatedImages.map((img, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex gap-2 justify-center mb-1">
                              <Badge variant="secondary">{img.style}</Badge>
                              <Badge variant="outline">{img.view}</Badge>
                            </div>
                            <img 
                              src={img.url} 
                              alt={`AI Girlfriend - ${img.style} ${img.view}`} 
                              className="w-full rounded-lg shadow-lg"
                              onError={(e) => {
                                console.error('Image load error:', e);
                                console.log('Image src:', img.url);
                              }}
                              onLoad={() => console.log(`Image ${img.style} ${img.view} loaded successfully`)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Button 
                                onClick={() => regenerateSpecificImage(img.style, img.view, img.clothing)} 
                                variant="outline" 
                                size="sm"
                                disabled={isGenerating}
                                className="hover:bg-accent"
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                                Régénérer
                              </Button>
                              <Button 
                                onClick={() => setShowSaveDialog(true)} 
                                variant="outline" 
                                size="sm"
                                className="hover:bg-accent"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Sauvegarder
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 mt-2">
                        <Button 
                          onClick={generatePhoto} 
                          variant="outline" 
                          size="sm"
                          className="hover:bg-accent w-full"
                          disabled={isGenerating}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Générer de nouvelles photos
                        </Button>
                        <Button 
                          onClick={generateMorePhotos} 
                          variant="outline" 
                          size="sm"
                          className="hover:bg-primary/10 w-full border-primary/50"
                          disabled={isGenerating || generatedImages.length === 0}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Ajouter plus de photos
                        </Button>
                        <Button 
                          onClick={() => setShowAttitudeDialog(true)} 
                          variant="outline" 
                          size="sm"
                          className="hover:bg-accent w-full border-primary/50"
                          disabled={isGenerating || !currentBatchSeed}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate More Attitudes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex flex-col items-center justify-center h-full">
                      <div className="text-6xl">📸</div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Générer {selectedStyles.length * selectedViews.length * selectedClothing.length} image(s) du même avatar
                      </p>
                      <Button 
                        onClick={generatePhoto} 
                        className="bg-primary hover:bg-primary/90"
                        disabled={selectedStyles.length === 0 || selectedViews.length === 0}
                      >
                        Générer les photos
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
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Start Chatting
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      const mainImage = generatedImages.length > 0 ? generatedImages[0].url : '';
                      const allImages = generatedImages.map(img => img.url);
                      setCurrentCharacter({ ...character, image: mainImage, images: allImages });
                      navigate('/voice-chat');
                    }} 
                    className="w-full bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
                    size="lg"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Chat
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4">
              <VideoGenerator imageUrl={generatedImages.length > 0 ? generatedImages[0].url : ''} />
            </div>
          </div>
        </div>
      </div>

      <SaveImageDialog 
        isOpen={showSaveDialog} 
        onClose={() => setShowSaveDialog(false)} 
        imageUrls={generatedImages.map(img => img.url)} 
        characterData={character} 
      />
      
      <AttitudeVariationsDialog 
        isOpen={showAttitudeDialog} 
        onClose={() => setShowAttitudeDialog(false)} 
        character={character}
        currentSeed={currentBatchSeed}
        onGenerateVariations={generateAttitudeVariations}
      />
    </div>
  );
};

export default Customize;