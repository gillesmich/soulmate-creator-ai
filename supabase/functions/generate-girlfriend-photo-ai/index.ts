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
    const { character, seed, attitude, scenery, retryAttempt = 0 } = await req.json();

    if (!character) {
      return new Response(
        JSON.stringify({ error: 'Character description is required' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured. Please contact support.' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Generating image with Lovable AI (Gemini) - Attempt ${retryAttempt + 1}...`);

    // Build detailed prompt based on image style
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
    
    // Handle clothing option with safe filtering
    let clothingDescription = '';
    if (character.clothing === 'nude') {
      // Replace with safe alternative
      clothingDescription = 'wearing elegant flowing white fabric, artistic fashion photography';
    } else if (character.clothing === 'lingerie') {
      // Replace with safe alternative
      clothingDescription = 'wearing elegant silk dress, glamour photography';
    } else {
      clothingDescription = `wearing ${safeOutfit} clothing`;
    }
    
    // Generate unique but consistent character features using seed
    const faceShapes = ['oval', 'heart-shaped', 'round', 'angular'];
    const noseTypes = ['small', 'delicate', 'slightly upturned', 'refined'];
    const lipTypes = ['full', 'natural', 'soft', 'well-defined'];
    const skinTones = ['fair', 'olive', 'tan', 'porcelain'];
    
    // Use seed to ensure same features across all generations in this batch
    const seedNum = seed || Date.now();
    const faceShape = faceShapes[seedNum % faceShapes.length];
    const noseType = noseTypes[(seedNum >> 2) % noseTypes.length];
    const lipType = lipTypes[(seedNum >> 4) % lipTypes.length];
    const skinTone = skinTones[(seedNum >> 6) % skinTones.length];
    
    // Build consistent character description with attitude
    const attitudeExpression = attitude 
      ? `She has a ${attitude} expression and attitude.` 
      : `She has a ${character.personality} personality expression.`;
    
    const characterDescription = `A specific woman with ${character.hairColor} ${character.hairStyle} hair, ${character.eyeColor} eyes, ${character.bodyType} body type, ${faceShape} face shape, ${noseType} nose, ${lipType} lips, ${skinTone} skin. ${attitudeExpression}`;
    
    // Build style-specific prompt
    const imageStyle = character.imageStyle || 'realistic';
    let stylePrefix = '';
    let styleSuffix = '';
    
    if (imageStyle === 'anime') {
      stylePrefix = 'Anime style illustration of ';
      styleSuffix = ', high quality anime art, detailed anime style, vibrant colors, professional anime artwork, Studio Ghibli quality, consistent character design';
    } else if (imageStyle === 'cartoon') {
      stylePrefix = 'Cartoon style illustration of ';
      styleSuffix = ', high quality cartoon art, cel-shaded, vibrant colors, professional cartoon illustration, Pixar quality, consistent character design';
    } else if (imageStyle === 'digital art') {
      stylePrefix = 'Digital art painting of ';
      styleSuffix = ', high quality digital painting, artistic style, detailed brush strokes, professional digital artwork, ArtStation quality, consistent character design';
    } else {
      stylePrefix = 'A beautiful realistic photo of ';
      styleSuffix = ', professional photography, high quality, realistic lighting, detailed features, elegant pose, 4K resolution, fashion photography style, consistent character';
    }
    
    
    const sceneryDescription = scenery ? ` Set in ${scenery}.` : '';
    const prompt = `${stylePrefix}${characterDescription} ${clothingDescription}. ${viewType}${sceneryDescription}${styleSuffix}. Character seed: ${seedNum}`;

    console.log('Prompt:', prompt);
    console.log('Seed:', seedNum);

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
      console.error('Lovable AI error:', response.status, errorText);
      
      let errorMessage = '';
      
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait 60 seconds before trying again.';
      } else if (response.status === 402) {
        errorMessage = 'Credits exhausted. Please add credits in Settings → Workspace → Usage.';
      } else if (response.status === 500) {
        errorMessage = 'AI service temporarily unavailable. Please try again in a few moments.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request. Please check your character settings.';
      } else {
        errorMessage = `Image generation failed (${response.status}). Please try again.`;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage, status: response.status }), 
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Response structure:', JSON.stringify(data, null, 2));
    
    // Extract the image from Gemini response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({ error: 'No image was generated. Please try again.' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Image generated successfully');

    return new Response(JSON.stringify({ 
      image: imageUrl,
      prompt: prompt,
      seed: seedNum
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-girlfriend-photo-ai function:', error);
    
    const errorMessage = error.message || 'Unexpected error during image generation';
    const statusCode = error.status || 500;
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Please try again or contact support if the problem persists.'
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
