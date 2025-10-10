import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DID_API_KEY = Deno.env.get('DID_API_KEY');
const DID_API_URL = 'https://api.d-id.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, text, audioUrl, voice } = await req.json();

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
