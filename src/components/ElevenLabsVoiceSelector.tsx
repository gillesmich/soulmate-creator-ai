import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

interface ElevenLabsVoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const ElevenLabsVoiceSelector: React.FC<ElevenLabsVoiceSelectorProps> = ({ 
  value, 
  onChange, 
  label = "Voix ElevenLabs" 
}) => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
      
      if (error) throw error;
      
      if (data?.voices) {
        setVoices(data.voices);
      }
    } catch (error) {
      console.error('Error loading ElevenLabs voices:', error);
      toast.error('Erreur lors du chargement des voix');
    } finally {
      setLoading(false);
    }
  };

  const getVoiceLabel = (voice: ElevenLabsVoice) => {
    const labels = voice.labels || {};
    const accent = labels.accent || '';
    const age = labels.age || '';
    const gender = labels.gender || '';
    const useCase = labels.use_case || '';
    
    const meta = [accent, age, gender, useCase].filter(Boolean).join(' • ');
    return meta ? `${voice.name} (${meta})` : voice.name;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-background">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Chargement des voix...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choisissez une voix" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {voices.map((voice) => (
            <SelectItem key={voice.voice_id} value={voice.voice_id}>
              <div className="flex flex-col">
                <span className="font-medium">{getVoiceLabel(voice)}</span>
                {voice.description && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {voice.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ElevenLabsVoiceSelector;
