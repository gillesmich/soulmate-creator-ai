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
      return new Response(
        JSON.stringify({ 
          error: 'ELEVENLABS_API_KEY not configured',
          voices: []
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('ELEVENLABS_API_KEY found, fetching voices from ElevenLabs API...');

    // Fetch ONLY the voices available in the user's ElevenLabs account
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
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch voices: ${response.status}`,
          voices: []
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const voices = data.voices || [];
    
    console.log(`Successfully fetched ${voices.length} voices from ElevenLabs`);
    
    if (voices.length > 0) {
      console.log('Sample voice:', JSON.stringify(voices[0]));
      console.log('Voice categories:', [...new Set(voices.map((v: any) => v.category))]);
    }

    return new Response(
      JSON.stringify({ voices }),
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
        error: error.message || 'Unknown error occurred',
        voices: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
