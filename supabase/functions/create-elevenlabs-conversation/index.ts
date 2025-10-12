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
    const { voiceId, systemPrompt } = await req.json();
    
    console.log('[CREATE-CONVERSATION] Request:', { voiceId, hasSystemPrompt: !!systemPrompt });

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    if (!voiceId) {
      throw new Error('voiceId is required');
    }

    // Créer une conversation ElevenLabs avec la voix spécifiée
    const conversationConfig = {
      voice: {
        voice_id: voiceId
      },
      agent: {
        prompt: {
          prompt: systemPrompt || "Tu es une assistante vocale amicale et serviable. Réponds de manière naturelle et engageante."
        },
        first_message: "Salut ! Comment puis-je t'aider aujourd'hui ?",
        language: "fr"
      }
    };

    console.log('[CREATE-CONVERSATION] Creating conversation with config:', conversationConfig);

    // Générer une signed URL pour la conversation
    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/conversation/get_signed_url',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversationConfig)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CREATE-CONVERSATION] ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[CREATE-CONVERSATION] Conversation created successfully');

    return new Response(
      JSON.stringify({ signedUrl: data.signed_url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CREATE-CONVERSATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
