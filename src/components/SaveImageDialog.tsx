import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { saveCharacter as saveToLocalStorage } from '@/utils/characterStorage';

interface SaveImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrls: string[]; // Changed to array
  characterData: any;
  existingCharacterId?: string | null;
  existingCharacterName?: string | null;
  onSaveComplete?: (id: string, name: string) => void;
}

const SaveImageDialog: React.FC<SaveImageDialogProps> = ({ 
  isOpen, 
  onClose, 
  imageUrls, 
  characterData,
  existingCharacterId,
  existingCharacterName,
  onSaveComplete
}) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Set name from existing character when dialog opens
  React.useEffect(() => {
    if (isOpen && existingCharacterName) {
      setName(existingCharacterName);
    }
  }, [isOpen, existingCharacterName]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer un nom pour votre profil",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentification requise",
          description: "Connectez-vous pour sauvegarder dans le cloud.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Check if we're updating an existing character or need to check for duplicate name
      let profileIdToUpdate = existingCharacterId;
      
      if (!profileIdToUpdate) {
        // Only check for duplicate name if creating new character
        const { data: duplicateProfile } = await supabase
          .from('saved_girlfriend_images')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', name.trim())
          .single();
        
        if (duplicateProfile) {
          toast({
            title: "Nom déjà utilisé",
            description: "Un profil avec ce nom existe déjà. Choisissez un autre nom.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      // Prepare complete character data with voice and agent info
      const completeCharacterData = {
        ...characterData,
        interests: characterData.interests || '',
        hobbies: characterData.hobbies || '',
        characterTraits: characterData.characterTraits || '',
        voice: characterData.voice || '',
        agentId: characterData.agentId || '',
        agentName: characterData.agentName || ''
      };

      // Check if updating existing character and get current images
      let existingImageUrls: string[] = [];
      if (profileIdToUpdate) {
        const { data: existingProfile } = await supabase
          .from('saved_girlfriend_images')
          .select('image_url, image_urls')
          .eq('id', profileIdToUpdate)
          .single();
        
        if (existingProfile) {
          existingImageUrls = Array.isArray(existingProfile.image_urls) 
            ? (existingProfile.image_urls as string[])
            : [existingProfile.image_url].filter(Boolean) as string[];
        }
      }

      // Upload only NEW images (those not already in Supabase storage)
      const uploadedUrls: string[] = [];
      const timestamp = Date.now();
      
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        
        // Check if this image is already in Supabase storage (URL contains supabase)
        if (imageUrl.includes('supabase.co') && existingImageUrls.includes(imageUrl)) {
          // Image already uploaded, keep the existing URL
          uploadedUrls.push(imageUrl);
          continue;
        }
        
        // New image - upload it
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const filename = `${user.id}/${name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_${i}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('girlfriend-images')
          .upload(filename, blob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('girlfriend-images')
          .getPublicUrl(filename);
        
        uploadedUrls.push(urlData.publicUrl);
      }

      // Update or Insert depending on whether we have an existing ID
      let dbError;
      let savedId = profileIdToUpdate;
      
      if (profileIdToUpdate) {
        // Update existing profile
        const { error } = await supabase
          .from('saved_girlfriend_images')
          .update({
            image_url: uploadedUrls[0] || '',
            image_urls: uploadedUrls,
            character_data: completeCharacterData
          })
          .eq('id', profileIdToUpdate);
        dbError = error;
        
        if (!error) {
          toast({
            title: "✅ Profil mis à jour!",
            description: `${name} et ses ${imageUrls.length} image(s) ont été mises à jour.`,
          });
          if (onSaveComplete) {
            onSaveComplete(profileIdToUpdate, name.trim());
          }
        }
      } else {
        // Insert new profile
        const { data: insertedData, error } = await supabase
          .from('saved_girlfriend_images')
          .insert({
            user_id: user.id,
            name: name.trim(),
            image_url: uploadedUrls[0] || '',
            image_urls: uploadedUrls,
            character_data: completeCharacterData
          })
          .select('id')
          .single();
        dbError = error;
        
        if (!error && insertedData) {
          savedId = insertedData.id;
          toast({
            title: "✅ Profil sauvegardé!",
            description: `${name} et ses ${imageUrls.length} image(s) ont été sauvegardées.`,
          });
          if (onSaveComplete) {
            onSaveComplete(insertedData.id, name.trim());
          }
        }
      }

      if (dbError) throw dbError;

      setName('');
      onClose();
    } catch (error) {
      console.error('Error saving to cloud:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingCharacterId ? 'Mettre à jour le profil' : 'Enregistrer les informations de votre girlfriend'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!existingCharacterId && (
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                type="text"
                placeholder="Entrez un nom pour votre girlfriend"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                maxLength={50}
              />
            </div>
          )}
          
          {existingCharacterId && (
            <div className="p-3 bg-primary/10 rounded-md space-y-2">
              <p className="text-sm font-medium">Mise à jour: <span className="text-primary">{existingCharacterName}</span></p>
              <div className="text-xs text-muted-foreground space-y-1">
                {imageUrls.length > 0 && (
                  <p>• Images ({imageUrls.length})</p>
                )}
                {characterData.personality && (
                  <p>• Personnalité</p>
                )}
                {characterData.voice && (
                  <p>• Voix</p>
                )}
                {characterData.agentId && (
                  <p>• Agent: {characterData.agentName || 'Agent ElevenLabs'}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap justify-center gap-2 max-h-64 overflow-y-auto">
            {imageUrls.map((url, index) => (
              <img 
                key={index}
                src={url} 
                alt={`Image ${index + 1}`} 
                className="w-20 h-20 rounded-lg object-cover border hover:scale-105 transition-transform"
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {imageUrls.length} image(s) seront sauvegardées
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || (!existingCharacterId && !name.trim())}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveImageDialog;