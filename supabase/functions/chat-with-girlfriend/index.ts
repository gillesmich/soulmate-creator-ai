import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, character, conversationHistory } = await req.json();

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