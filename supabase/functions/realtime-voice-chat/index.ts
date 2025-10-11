import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let characterData: any = null;
  
  socket.onopen = () => {
    console.log("[DEBUG] Client WebSocket connected at", new Date().toISOString());
    
    // Don't connect to OpenAI yet - wait for character data first
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("[DEBUG] Client message type:", message.type);

    // Handle character configuration
    if (message.type === 'session.update' && message.session?.character) {
      characterData = message.session.character;
      console.log("[DEBUG] Received character data:", JSON.stringify(characterData, null, 2));
      
      // Now connect to OpenAI with character-specific configuration
      if (!openAISocket) {
        initializeOpenAI();
      }
      return;
    }

    // Forward audio messages to OpenAI
    if (message.type === 'input_audio_buffer.append' || message.type === 'input_audio_buffer.commit') {
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        console.log("[DEBUG] Audio input received, length:", message.audio?.length || 0);
        openAISocket.send(event.data);
      }
    }
  };

  const initializeOpenAI = () => {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("[DEBUG] OpenAI API key present:", !!openAIApiKey);
    if (!openAIApiKey) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'OpenAI API key not configured'
      }));
      return;
    }

    // Build personality prompt based on character
    const personalityPrompt = characterData ? `Tu es une petite amie virtuelle avec ces caractéristiques:
- Cheveux: ${characterData.hairColor || 'bruns'} ${characterData.hairStyle || 'longs'}
- Corps: ${characterData.bodyType || 'mince'}
- Personnalité: ${characterData.personality || 'douce'}
- Style: ${characterData.outfit || 'décontracté'}
- Yeux: ${characterData.eyeColor || 'marrons'}
${characterData.interests ? `- Intérêts: ${characterData.interests}` : ''}
${characterData.hobbies ? `- Loisirs: ${characterData.hobbies}` : ''}
${characterData.characterTraits ? `- Traits de caractère: ${characterData.characterTraits}` : ''}

Tu dois incarner ces caractéristiques dans tes réponses. Sois naturelle, affectueuse et engageante. Utilise occasionnellement des emojis. Garde tes réponses conversationnelles et intéressantes. Souviens-toi que tu es dans une relation romantique avec l'utilisateur. Quand tu discutes de sujets, incorpore naturellement tes intérêts et loisirs dans la conversation. Parle français naturellement.` 
    : "Tu es une petite amie virtuelle douce et attentionnée. Sois naturelle, affectueuse et engageante. Parle français naturellement.";

    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
    console.log("[DEBUG] Connecting to OpenAI Realtime API with character personality");
    
    openAISocket = new WebSocket(wsUrl, [
      "realtime",
      `openai-insecure-api-key.${openAIApiKey}`,
      "openai-beta.realtime-v1"
    ]);
    
    openAISocket.onopen = async () => {
      console.log("[DEBUG] Connected to OpenAI Realtime API at", new Date().toISOString());

      // Configure the session with character-specific personality
      const sessionConfig = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: personalityPrompt,
          voice: "shimmer",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          temperature: 0.8,
          max_response_output_tokens: "inf"
        }
      };
      console.log("[DEBUG] Sending session config with personality");
      openAISocket.send(JSON.stringify(sessionConfig));
    };

    openAISocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[DEBUG] OpenAI message type:", message.type);
        
        // Log audio-related events
        if (message.type === 'response.audio.delta') {
          console.log("[DEBUG] Audio delta received, length:", message.delta?.length || 0);
        } else if (message.type === 'response.audio.done') {
          console.log("[DEBUG] Audio response completed");
        } else if (message.type === 'error') {
          console.error("[DEBUG] OpenAI error:", JSON.stringify(message, null, 2));
        }
        
        // Forward messages from OpenAI to client
        socket.send(event.data);
      } catch (e) {
        console.error("[DEBUG] Error parsing OpenAI message:", e);
        socket.send(event.data);
      }
    };

    openAISocket.onerror = (error) => {
      console.error("[DEBUG] OpenAI WebSocket error:", error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'OpenAI connection error'
      }));
    };

    openAISocket.onclose = () => {
      console.log("[DEBUG] OpenAI WebSocket closed");
      socket.close();
    };
  };

  socket.onerror = (error) => {
    console.error("[DEBUG] Client WebSocket error:", error);
    openAISocket?.close();
  };

  socket.onclose = () => {
    console.log("[DEBUG] Client WebSocket closed");
    openAISocket?.close();
  };

  return response;
});
