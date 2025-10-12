import { supabase } from '@/integrations/supabase/client';

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: {
    accent?: string;
    gender?: string;
    age?: string;
  };
}

interface VoiceLoaderResult {
  voices: Voice[];
  apiKey: string;
}

/**
 * Charge les voix ElevenLabs depuis la fonction edge
 * @returns Liste des voix et clé API
 */
export async function loadElevenLabsVoices(): Promise<VoiceLoaderResult> {
  try {
    console.log('[VoiceLoader] Chargement des voix ElevenLabs...');
    
    // Appeler la fonction edge get-elevenlabs-voices
    const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
    
    if (error) {
      console.error('[VoiceLoader] Erreur:', error);
      throw new Error(`Erreur chargement voix: ${error.message}`);
    }
    
    if (!data || !data.voices) {
      throw new Error('Aucune voix trouvée');
    }
    
    console.log(`[VoiceLoader] ${data.voices.length} voix chargées`);
    
    // Récupérer la clé API depuis le fichier public
    let apiKey = '';
    try {
      const keyResponse = await fetch('/eleven.txt');
      apiKey = (await keyResponse.text()).trim();
      console.log('[VoiceLoader] Clé API récupérée');
    } catch (keyError) {
      console.warn('[VoiceLoader] Impossible de charger la clé API depuis /eleven.txt');
    }
    
    return {
      voices: data.voices as Voice[],
      apiKey
    };
  } catch (error) {
    console.error('[VoiceLoader] Erreur fatale:', error);
    throw error;
  }
}
