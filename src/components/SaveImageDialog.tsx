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
  imageUrl: string;
  characterData: any;
}

const SaveImageDialog: React.FC<SaveImageDialogProps> = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  characterData 
}) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your girlfriend image",
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
          title: "Authentication Required",
          description: "Please sign in to save your images to the cloud.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Save to localStorage first
      const savedCharacter = saveToLocalStorage(
        { ...characterData, image: imageUrl },
        name.trim()
      );

      toast({
        title: "Saved Locally!",
        description: `${name} has been saved to your browser.`,
      });

      // Then save to Supabase storage and database
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const timestamp = Date.now();
      const filename = `${user.id}/${name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('girlfriend-images')
        .upload(filename, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('girlfriend-images')
        .getPublicUrl(filename);

      const { error: dbError } = await supabase
        .from('saved_girlfriend_images')
        .insert({
          user_id: user.id,
          name: name.trim(),
          image_url: urlData.publicUrl,
          character_data: characterData
        });

      if (dbError) throw dbError;

      setName('');
      onClose();
    } catch (error) {
      console.error('Error saving to cloud:', error);
      toast({
        title: "Saved Locally",
        description: "Saved to your browser, but cloud backup failed.",
        variant: "default",
      });
      setName('');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Your Girlfriend</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter a name for your girlfriend"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              maxLength={50}
            />
          </div>
          
          <div className="flex justify-center">
            <img 
              src={imageUrl} 
              alt="Girlfriend to save" 
              className="w-32 h-32 rounded-lg object-cover border"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveImageDialog;