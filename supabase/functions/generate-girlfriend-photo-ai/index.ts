import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Sanitize function to prevent prompt injection
const sanitizeText = (text: string): string => {
  return text
    .replace(/[<>]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .substring(0, 200);
};

// Validation schema with strict constraints
const CharacterSchema = z.object({
  hairColor: z.string().trim().min(1).max(50).transform(sanitizeText),
  hairStyle: z.string().trim().min(1).max(50).transform(sanitizeText),
  bodyType: z.string().trim().min(1).max(50).transform(sanitizeText),
  eyeColor: z.string().trim().min(1).max(50).transform(sanitizeText),
  ethnicity: z.string().trim().max(50).transform(sanitizeText).optional(),
  outfit: z.string().trim().max(50).transform(sanitizeText).optional(),
  personality: z.string().trim().max(100).transform(sanitizeText).optional(),
  clothing: z.string().trim().max(50).transform(sanitizeText).optional(),
  imageStyle: z.string().trim().max(50).transform(sanitizeText).optional(),
  avatarView: z.string().trim().max(50).transform(sanitizeText).optional(),
});

const ImageGenerationSchema = z.object({
  character: CharacterSchema,
  seed: z.number().optional(),
  attitude: z.string().trim().max(100).transform(sanitizeText).optional(),
  scenery: z.string().trim().max(200).transform(sanitizeText).optional(),
  retryAttempt: z.number().int().min(0).max(5).optional(),
  referenceImage: z.string().optional(), // Base64 encoded reference image
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    const body = await req.json();
    
    // Validate input
    const validationResult = ImageGenerationSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.issues);
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { character, seed, attitude, scenery, retryAttempt = 0, referenceImage } = validationResult.data;

    if (!character) {
      console.error('Missing character description');
      return new Response(
        JSON.stringify({ error: 'Character description is required' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not configured. Please contact support.' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    

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
      // Replace with OpenAI-safe alternative
      clothingDescription = 'wearing elegant white silk draped fabric in artistic pose, professional art photography, tasteful composition';
    } else if (character.clothing === 'lingerie') {
      // Replace with OpenAI-safe alternative  
      clothingDescription = 'wearing elegant satin evening dress with elegant draping, sophisticated glamour photography';
    } else if (character.clothing === 'clothed') {
      clothingDescription = `wearing ${safeOutfit} outfit`;
    } else {
      clothingDescription = `wearing ${safeOutfit} clothing`;
    }
    
    // Generate unique but consistent character features using seed
    const faceShapes = ['oval', 'heart-shaped', 'round', 'angular'];
    const noseTypes = ['small', 'delicate', 'slightly upturned', 'refined'];
    const lipTypes = ['full', 'natural', 'soft', 'well-defined'];
    
    // Use seed to ensure same features across all generations in this batch
    const seedNum = seed || Date.now();
    const faceShape = faceShapes[seedNum % faceShapes.length];
    const noseType = noseTypes[(seedNum >> 2) % noseTypes.length];
    const lipType = lipTypes[(seedNum >> 4) % lipTypes.length];
    
    // Handle ethnicity with detailed descriptions
    let ethnicityDescription = '';
    if (character.ethnicity) {
      const ethnicityMap = {
        'caucasian': 'caucasian woman with european features',
        'asian': 'east asian woman with asian features',
        'african': 'african woman with african features',
        'latina': 'latina woman with hispanic features',
        'middle eastern': 'middle eastern woman with middle eastern features',
        'mixed': 'mixed ethnicity woman with diverse features'
      };
      ethnicityDescription = ethnicityMap[character.ethnicity.toLowerCase() as keyof typeof ethnicityMap] || `${character.ethnicity} woman`;
    } else {
      ethnicityDescription = 'woman';
    }
    
    // Build consistent character description with attitude
    const attitudeExpression = attitude 
      ? `She has a ${attitude} expression and attitude.` 
      : `She has a ${character.personality} personality expression.`;
    
    const characterDescription = `A specific ${ethnicityDescription} with ${character.hairColor} ${character.hairStyle} hair, ${character.eyeColor} eyes, ${character.bodyType} body type, ${faceShape} face shape, ${noseType} nose, ${lipType} lips. ${attitudeExpression}`;
    
    console.log('Character ethnicity:', character.ethnicity);
    console.log('Character description:', characterDescription);
    
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

    console.log('Making API call to OpenAI...');
    
    // Call OpenAI DALL-E 3 for image generation
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
        quality: 'standard',
        response_format: 'url'
      }),
    });

    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      
      let errorMessage = '';
      
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait before trying again.';
      } else if (response.status === 402) {
        errorMessage = 'Payment required. Please add credits to your Lovable AI workspace.';
      } else if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your configuration.';
      } else if (response.status === 500) {
        errorMessage = 'AI service temporarily unavailable. Please try again in a few moments.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request. Please check your character settings.';
      } else {
        errorMessage = `Image generation failed (${response.status}). Please try again.`;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage, status: response.status, details: errorText }), 
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('API response received');
    
    // Extract the image URL from DALL-E 3 response
    const imageUrl = data.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', data ? JSON.stringify(data).substring(0, 500) : 'No data');
      return new Response(
        JSON.stringify({ error: 'No image was generated. Please try again.' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const finalImageUrl = `data:image/png;base64,${base64Image}`;

    console.log('Image generated successfully');
    return new Response(JSON.stringify({ 
      image: finalImageUrl,
      prompt: prompt,
      seed: seedNum
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-girlfriend-photo-ai:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred during image generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
