import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FrenchFemaleVoice {
  id: string;
  name: string;
  description: string;
}

// Voix françaises féminines disponibles avec OpenAI Realtime API
export const FRENCH_FEMALE_VOICES: FrenchFemaleVoice[] = [
  { 
    id: 'alloy', 
    name: 'Alloy', 
    description: 'Voix féminine douce et naturelle' 
  },
  { 
    id: 'shimmer', 
    name: 'Shimmer', 
    description: 'Voix féminine chaleureuse et expressive' 
  },
  { 
    id: 'nova', 
    name: 'Nova', 
    description: 'Voix féminine jeune et énergique' 
  },
];

interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  value, 
  onChange, 
  label = "Voix" 
}) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choisissez une voix française" />
        </SelectTrigger>
        <SelectContent>
          {FRENCH_FEMALE_VOICES.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              <div className="flex flex-col">
                <span className="font-medium">{voice.name}</span>
                <span className="text-xs text-muted-foreground">
                  {voice.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VoiceSelector;
