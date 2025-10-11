import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const DID_API_KEY = Deno.env.get('DID_API_KEY');
const DID_API_URL = 'https://api.d-id.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Validation schema
const VideoSchema = z.object({
  imageUrl: z.string().url().max(2000),
  text: z.string().max(500).optional(),
  audioUrl: z.string().url().max(2000).optional(),
  voice: z.string().max(100).optional(),
});

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

    const body = await req.json();
    
    // Validate input
    const validationResult = VideoSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageUrl, text, audioUrl, voice } = validationResult.data;

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    if (!text && !audioUrl) {
      throw new Error('Either text or audio URL is required');
    }

    if (!DID_API_KEY) {
      throw new Error('DID_API_KEY is not configured. Please add it in your Supabase secrets.');
    }

    console.log('Creating D-ID talk video...');

    // Create talk request
    const talkPayload: any = {
      source_url: imageUrl,
      script: {}
    };

    if (audioUrl) {
      talkPayload.script.audio_url = audioUrl;
    } else {
      talkPayload.script.type = 'text';
      talkPayload.script.input = text;
      talkPayload.script.provider = {
        type: 'microsoft',
        voice_id: voice || 'en-US-JennyNeural'
      };
    }

    const createResponse = await fetch(`${DID_API_URL}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(talkPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('D-ID API error:', errorText);
      throw new Error(`Failed to create video: ${createResponse.status} ${errorText}`);
    }

    const createData = await createResponse.json();
    const talkId = createData.id;

    console.log('Video generation started, ID:', talkId);

    // Poll for video completion
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`${DID_API_URL}/talks/${talkId}`, {
        headers: {
          'Authorization': `Basic ${DID_API_KEY}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Video status:', statusData.status);

        if (statusData.status === 'done') {
          videoUrl = statusData.result_url;
        } else if (statusData.status === 'error') {
          throw new Error('Video generation failed');
        }
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    console.log('Video generated successfully:', videoUrl);

    return new Response(JSON.stringify({ 
      videoUrl,
      talkId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-video function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
