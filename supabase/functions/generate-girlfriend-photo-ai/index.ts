import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { character } = await req.json();

    if (!character) {
      throw new Error('Character description is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating image with Lovable AI (Gemini)...');

    // Build detailed prompt for realistic photo
    const outfitMap = {
      'sexy': 'elegant',
      'casual': 'casual',
      'formal': 'formal',
      'sporty': 'athletic',
      'cute': 'cute'
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

    console.log('Prompt:', prompt);

    // Call Lovable AI (Gemini Nano banana model for image generation)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('Credits exhausted. Please add credits to your Lovable workspace.');
      }
      
      throw new Error(`Failed to generate image: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response structure:', JSON.stringify(data, null, 2));
    
    // Extract the image from Gemini response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data, null, 2));
      throw new Error('No image was generated');
    }

    console.log('Image generated successfully');

    return new Response(JSON.stringify({ 
      image: imageUrl,
      prompt: prompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-girlfriend-photo-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
