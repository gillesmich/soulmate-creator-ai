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
}

const SaveImageDialog: React.FC<SaveImageDialogProps> = ({ 
  isOpen, 
  onClose, 
  imageUrls, 
  characterData 
}) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

      // Check if a profile with this name already exists
      const { data: existingProfile } = await supabase
        .from('saved_girlfriend_images')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name.trim())
        .single();

      // Prepare complete character data (without images for localStorage)
      const completeCharacterData = {
        ...characterData,
        interests: characterData.interests || '',
        hobbies: characterData.hobbies || '',
        characterTraits: characterData.characterTraits || ''
      };

      // Upload all images to Supabase storage
      const uploadedUrls: string[] = [];
      const timestamp = Date.now();
      
      for (let i = 0; i < imageUrls.length; i++) {
        const response = await fetch(imageUrls[i]);
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

      // Update or Insert depending on whether profile exists
      let dbError;
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('saved_girlfriend_images')
          .update({
            image_url: uploadedUrls[0] || '',
            image_urls: uploadedUrls,
            character_data: completeCharacterData
          })
          .eq('id', existingProfile.id);
        dbError = error;
        
        if (!error) {
          toast({
            title: "✅ Profil mis à jour!",
            description: `${name} et ses ${imageUrls.length} image(s) ont été mises à jour.`,
          });
        }
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('saved_girlfriend_images')
          .insert({
            user_id: user.id,
            name: name.trim(),
            image_url: uploadedUrls[0] || '',
            image_urls: uploadedUrls,
            character_data: completeCharacterData
          });
        dbError = error;
        
        if (!error) {
          toast({
            title: "✅ Profil sauvegardé!",
            description: `${name} et ses ${imageUrls.length} image(s) ont été sauvegardées.`,
          });
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
          <DialogTitle>Enregistrer les informations de votre girlfriend</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
            disabled={isSaving || !name.trim()}
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