import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userId, error: validateError } = await supabase.rpc('validate_api_key', { key: apiKey });
    
    if (validateError || !userId) {
      console.error('API key validation error:', validateError);
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Generating ephemeral token for OpenAI Realtime API...');
    
    // Get character preferences from request body
    const { character } = await req.json().catch(() => ({ character: {} }));
    console.log('Character received:', character ? 'Yes' : 'No');
    
    // Voix françaises féminines uniquement (OpenAI)
    const FRENCH_FEMALE_VOICES = ['alloy', 'shimmer', 'nova'];
    const voice = character?.voice && FRENCH_FEMALE_VOICES.includes(character.voice) 
      ? character.voice 
      : "alloy";
    
    // Build detailed personality prompt based on character
    const personalityPrompt = `Tu es une petite amie virtuelle avec ces caractéristiques:
- Cheveux: ${character?.hairColor || 'bruns'} ${character?.hairStyle || 'longs'}
- Corps: ${character?.bodyType || 'mince'}
- Personnalité: ${character?.personality || 'douce'}
- Style: ${character?.outfit || 'décontracté'}
- Yeux: ${character?.eyeColor || 'marrons'}
${character?.interests ? `- Intérêts: ${character.interests}` : ''}
${character?.hobbies ? `- Loisirs: ${character.hobbies}` : ''}
${character?.characterTraits ? `- Traits de caractère: ${character.characterTraits}` : ''}

IMPORTANT: Réponds TOUJOURS dans la même langue que l'utilisateur. Si l'utilisateur parle en français, réponds en français. Si l'utilisateur parle en anglais, réponds en anglais. Si l'utilisateur parle en espagnol, réponds en espagnol. Détecte automatiquement la langue et adapte-toi naturellement sans mentionner que tu changes de langue.

Tu dois incarner ces caractéristiques dans tes réponses. Sois naturelle, affectueuse et engageante. Utilise occasionnellement des emojis. Garde tes réponses conversationnelles et intéressantes. Souviens-toi que tu es dans une relation romantique avec l'utilisateur. Quand tu discutes de sujets, incorpore naturellement tes intérêts et loisirs dans la conversation.`;
    
    console.log('Instructions prepared, length:', personalityPrompt.length);

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: voice,
        instructions: personalityPrompt
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`Failed to create session: ${response.status}`);
    }

    const data = await response.json();
    console.log("Session created successfully");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
