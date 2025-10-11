import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Validation schema
const CharacterSchema = z.object({
  hairColor: z.string().max(50),
  hairStyle: z.string().max(50),
  bodyType: z.string().max(50),
  personality: z.string().max(100),
  outfit: z.string().max(50),
  eyeColor: z.string().max(50),
  avatarView: z.string().max(50).optional(),
  clothing: z.string().max(50).optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
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

    const body = await req.json();
    
    // Validate input
    const validationResult = CharacterSchema.safeParse(body.character);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const character = validationResult.data;

    if (!character) {
      throw new Error('Character description is required');
    }

    // Build detailed prompt for realistic photo - avoiding content policy violations
    const outfitMap = {
      'sexy': 'elegant',
      'casual': 'casual',
      'formal': 'formal',
      'sporty': 'athletic'
    };
    
    const safeOutfit = outfitMap[character.outfit as keyof typeof outfitMap] || 'stylish';
    
    // Handle avatar view
    const viewType = character.avatarView === 'bust' ? 'portrait shot from shoulders up' : 'full body shot';
    
    // Handle clothing option
    let clothingDescription = '';
    if (character.clothing === 'nude') {
      clothingDescription = 'artistic nude portrait, tasteful and elegant';
    } else if (character.clothing === 'lingerie') {
      clothingDescription = 'wearing elegant lingerie';
    } else {
      clothingDescription = `wearing ${safeOutfit} clothing`;
    }
    
    const prompt = `A beautiful realistic photo of a woman with ${character.hairColor} ${character.hairStyle} hair, ${character.eyeColor} eyes, ${character.bodyType} body type, ${clothingDescription}. She has a ${character.personality} personality expression. ${viewType}, professional photography, high quality, realistic lighting, detailed features, elegant pose, 4K resolution, fashion photography style.`;

    console.log('Generating image with prompt:', prompt);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`Failed to generate image: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // gpt-image-1 returns base64 directly, no need to extract from b64_json
    const imageUrl = data.data[0].url;
    
    // Convert URL to base64 efficiently to avoid stack overflow
    const imageResponse = await fetch(imageUrl);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    
    // Convert ArrayBuffer to base64 without spreading the array to avoid stack overflow
    const uint8Array = new Uint8Array(imageArrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64Image = btoa(binaryString);

    console.log('Image generated successfully');

    return new Response(JSON.stringify({ 
      image: `data:image/png;base64,${base64Image}`,
      prompt: prompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-girlfriend-photo function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});