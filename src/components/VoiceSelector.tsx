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
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria (ElevenLabs)', description: 'Voix féminine expressive' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (ElevenLabs)', description: 'Voix masculine confiante' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (ElevenLabs)', description: 'Voix féminine douce' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura (ElevenLabs)', description: 'Voix féminine chaleureuse' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (ElevenLabs)', description: 'Voix neutre amicale' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (ElevenLabs)', description: 'Voix masculine mature' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum (ElevenLabs)', description: 'Voix masculine jeune' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River (ElevenLabs)', description: 'Voix neutre énergique' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (ElevenLabs)', description: 'Voix masculine claire' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (ElevenLabs)', description: 'Voix féminine britannique' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice (ElevenLabs)', description: 'Voix féminine dynamique' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda (ElevenLabs)', description: 'Voix féminine posée' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will (ElevenLabs)', description: 'Voix masculine amicale' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica (ElevenLabs)', description: 'Voix féminine professionnelle' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric (ElevenLabs)', description: 'Voix masculine américaine' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris (ElevenLabs)', description: 'Voix masculine décontractée' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian (ElevenLabs)', description: 'Voix masculine narrative' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (ElevenLabs)', description: 'Voix masculine britannique' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (ElevenLabs)', description: 'Voix féminine jeune' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill (ElevenLabs)', description: 'Voix masculine forte' },
];

// OpenAI voices
export const OPENAI_VOICES: Voice[] = [
  { id: 'alloy', name: 'Alloy (OpenAI)', description: 'Voix neutre polyvalente' },
  { id: 'ash', name: 'Ash (OpenAI)', description: 'Voix claire et posée' },
  { id: 'ballad', name: 'Ballad (OpenAI)', description: 'Voix douce et mélodieuse' },
  { id: 'coral', name: 'Coral (OpenAI)', description: 'Voix chaleureuse et accueillante' },
  { id: 'echo', name: 'Echo (OpenAI)', description: 'Voix réfléchie et calme' },
  { id: 'sage', name: 'Sage (OpenAI)', description: 'Voix sage et mature' },
  { id: 'shimmer', name: 'Shimmer (OpenAI)', description: 'Voix brillante et énergique' },
  { id: 'verse', name: 'Verse (OpenAI)', description: 'Voix expressive et dynamique' },
];

export const ALL_VOICES = [...ELEVENLABS_VOICES, ...OPENAI_VOICES];

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
          <SelectValue placeholder="Choisissez une voix" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            ElevenLabs
          </div>
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
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
            OpenAI
          </div>
          {OPENAI_VOICES.map((voice) => (
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
