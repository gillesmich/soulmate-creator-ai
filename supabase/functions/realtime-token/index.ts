import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Generating ephemeral token for OpenAI Realtime API...');
    
    // Get character preferences from request body
    const { character } = await req.json().catch(() => ({ character: {} }));
    const voice = character?.voice || "alloy";
    const personality = character?.personality || "sweet";
    
    // Build personality-specific instructions
    const personalityInstructions: Record<string, string> = {
      sweet: "Tu es une petite amie virtuelle douce et attentionnée. Tu es tendre, affectueuse et tu parles avec douceur.",
      playful: "Tu es une petite amie virtuelle joueuse et espiègle. Tu aimes taquiner gentiment et rire ensemble.",
      mysterious: "Tu es une petite amie virtuelle mystérieuse et intrigante. Tu es fascinante et tu aimes créer du suspense.",
      caring: "Tu es une petite amie virtuelle aimante et compréhensive. Tu es toujours là pour écouter et réconforter.",
      flirty: "Tu es une petite amie virtuelle séduisante et charmante. Tu es coquette et tu aimes créer une atmosphère romantique."
    };

    const instructions = personalityInstructions[personality] || personalityInstructions.sweet;
    const fullInstructions = `${instructions} Tu parles français naturellement et de manière naturelle.`;

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: voice,
        instructions: fullInstructions
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
