import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    console.log('Starting get-elevenlabs-voices function...');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not found in environment');
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log('ELEVENLABS_API_KEY found, fetching voices from ElevenLabs API...');

    // Fetch all available voices from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    console.log('ElevenLabs API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`Failed to fetch voices: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.voices?.length || 0} voices from ElevenLabs`);
    
    // Ajouter les voix standard ElevenLabs
    const standardVoices = [
      { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', category: 'premade', labels: { accent: 'american', gender: 'female', age: 'young' } },
      { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade', labels: { accent: 'american', gender: 'female', age: 'young' } },
      { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', category: 'premade', labels: { accent: 'american', gender: 'female', age: 'young' } },
      { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade', labels: { accent: 'australian', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade', labels: { accent: 'british', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'young' } },
      { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'young' } },
      { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', category: 'premade', labels: { accent: 'english-swedish', gender: 'female', age: 'middle-aged' } },
      { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', category: 'premade', labels: { accent: 'british', gender: 'female', age: 'middle-aged' } },
      { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', category: 'premade', labels: { accent: 'american', gender: 'female', age: 'young' } },
      { voice_id: 'bIHbv24MWmeRgasZH58o', name: 'Will', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'young' } },
      { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', category: 'premade', labels: { accent: 'american', gender: 'female', age: 'young' } },
      { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade', labels: { accent: 'british', gender: 'male', age: 'middle-aged' } },
      { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'premade', labels: { accent: 'british', gender: 'female', age: 'middle-aged' } },
      { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', category: 'premade', labels: { accent: 'american', gender: 'male', age: 'old' } },
    ];

    // Combiner les voix standard avec les voix de l'utilisateur
    const allVoices = [...standardVoices, ...(data.voices || [])];
    console.log(`Total voices: ${allVoices.length} (${standardVoices.length} standard + ${data.voices?.length || 0} custom)`);
    
    if (allVoices.length > 0) {
      console.log('Sample voice:', JSON.stringify(allVoices[0]));
    }

    return new Response(
      JSON.stringify({ voices: allVoices }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-elevenlabs-voices:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        voices: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
