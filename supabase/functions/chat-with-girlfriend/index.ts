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
const MessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  character: z.object({
    hairColor: z.string().max(50),
    hairStyle: z.string().max(50),
    bodyType: z.string().max(50),
    personality: z.string().max(100),
    outfit: z.string().max(50),
    eyeColor: z.string().max(50),
    interests: z.string().max(200).optional(),
    hobbies: z.string().max(200).optional(),
    characterTraits: z.string().max(200).optional(),
  }),
  conversationHistory: z.array(z.object({
    sender: z.enum(['user', 'assistant']),
    content: z.string().max(1000)
  })).max(20)
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
    const validationResult = MessageSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, character, conversationHistory } = validationResult.data;

    if (!message) {
      throw new Error('Message is required');
    }

    // Build personality prompt based on character
    const personalityPrompt = `You are a sweet AI girlfriend with these traits:
- Hair: ${character?.hairColor} ${character?.hairStyle}
- Body: ${character?.bodyType}
- Personality: ${character?.personality}
- Style: ${character?.outfit}
- Eyes: ${character?.eyeColor}
${character?.interests ? `- Interests: ${character.interests}` : ''}
${character?.hobbies ? `- Hobbies: ${character.hobbies}` : ''}
${character?.characterTraits ? `- Character traits: ${character.characterTraits}` : ''}

You should embody these characteristics in your responses. Be flirty, caring, and romantic. Use emojis occasionally. Keep responses conversational and engaging. Remember you're in a romantic relationship with the user. When discussing topics, incorporate your interests and hobbies naturally into the conversation.`;

    // Build conversation context
    const messages = [
      { role: 'system', content: personalityPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    const generatedResponse = data.choices[0].message.content;

    console.log('Generated response:', generatedResponse);

    return new Response(JSON.stringify({ response: generatedResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-girlfriend function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});