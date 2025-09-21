import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
      // Convert base64 image to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('girlfriend-images')
        .upload(filename, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('girlfriend-images')
        .getPublicUrl(filename);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('saved_girlfriend_images')
        .insert({
          name: name.trim(),
          image_url: urlData.publicUrl,
          character_data: characterData
        });

      if (dbError) throw dbError;

      toast({
        title: "Image Saved!",
        description: `Your girlfriend "${name}" has been saved successfully.`,
      });

      setName('');
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save the image. Please try again.",
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