import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smile, Frown, Heart, Zap, Coffee, Sun, Moon, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AttitudeVariationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  character: any;
  currentSeed: number | null;
  onGenerateVariations: (attitudes: string[]) => Promise<void>;
}

const ATTITUDES = [
  { value: 'happy', label: 'Happy', icon: Smile, color: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/50' },
  { value: 'playful', label: 'Playful', icon: Zap, color: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/50' },
  { value: 'confident', label: 'Confident', icon: Star, color: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/50' },
  { value: 'romantic', label: 'Romantic', icon: Heart, color: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50' },
  { value: 'calm', label: 'Calm', icon: Coffee, color: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/50' },
  { value: 'energetic', label: 'Energetic', icon: Sun, color: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/50' },
  { value: 'mysterious', label: 'Mysterious', icon: Moon, color: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/50' },
  { value: 'sad', label: 'Sad', icon: Frown, color: 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/50' },
];

const AttitudeVariationsDialog: React.FC<AttitudeVariationsDialogProps> = ({
  isOpen,
  onClose,
  character,
  currentSeed,
  onGenerateVariations
}) => {
  const [selectedAttitudes, setSelectedAttitudes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const toggleAttitude = (attitude: string) => {
    setSelectedAttitudes(prev => 
      prev.includes(attitude) 
        ? prev.filter(a => a !== attitude)
        : [...prev, attitude]
    );
  };

  const handleGenerate = async () => {
    if (selectedAttitudes.length === 0) {
      toast({
        title: "Select Attitudes",
        description: "Please select at least one attitude to generate variations",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateVariations(selectedAttitudes);
      setSelectedAttitudes([]);
      onClose();
    } catch (error) {
      console.error('Error generating variations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Generate Character Variations</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select different attitudes to generate new images of your character
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ATTITUDES.map((attitude) => {
              const Icon = attitude.icon;
              const isSelected = selectedAttitudes.includes(attitude.value);
              
              return (
                <button
                  key={attitude.value}
                  onClick={() => toggleAttitude(attitude.value)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${isSelected 
                      ? attitude.color + ' scale-105 shadow-lg' 
                      : 'border-border hover:border-primary/50 bg-background/50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {attitude.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-primary">✓</Badge>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {selectedAttitudes.length} attitude{selectedAttitudes.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            {selectedAttitudes.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedAttitudes.length} image{selectedAttitudes.length !== 1 ? 's' : ''} will be generated
              </span>
            )}
          </div>

          {currentSeed && (
            <p className="text-xs text-muted-foreground text-center">
              Using character seed {currentSeed} to maintain consistency
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || selectedAttitudes.length === 0}
          >
            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate {selectedAttitudes.length > 0 && `(${selectedAttitudes.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttitudeVariationsDialog;
