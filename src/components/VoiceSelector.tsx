import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Voice {
  id: string;
  name: string;
  description: string;
}

// Complete list of ElevenLabs voices
export const ELEVENLABS_VOICES: Voice[] = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Voix féminine expressive' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Voix masculine confiante' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Voix féminine douce' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Voix féminine chaleureuse' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Voix neutre amicale' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Voix masculine mature' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Voix masculine jeune' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', description: 'Voix neutre énergique' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Voix masculine claire' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Voix féminine britannique' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Voix féminine dynamique' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Voix féminine posée' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Voix masculine amicale' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Voix féminine professionnelle' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Voix masculine américaine' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Voix masculine décontractée' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Voix masculine narrative' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Voix masculine britannique' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Voix féminine jeune' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', description: 'Voix masculine forte' },
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
          <SelectValue placeholder="Choisissez une voix ElevenLabs" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {ELEVENLABS_VOICES.map((voice) => (
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
