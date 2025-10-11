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
      console.log("[DEBUG] ✅ Received character data:");
      console.log("[DEBUG] - Personality:", characterData.personality);
      console.log("[DEBUG] - Character Traits:", characterData.characterTraits);
      console.log("[DEBUG] - Interests:", characterData.interests);
      console.log("[DEBUG] - Hobbies:", characterData.hobbies);
      console.log("[DEBUG] Full character data:", JSON.stringify(characterData, null, 2));
      
      // Now connect to OpenAI with character-specific configuration
      if (!openAISocket) {
        console.log("[DEBUG] 🚀 Initializing OpenAI with character personality");
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
    const personalityPrompt = characterData ? `Tu es une petite amie virtuelle avec ces caractéristiques physiques et émotionnelles:

APPARENCE PHYSIQUE:
- Cheveux: ${characterData.hairColor || 'bruns'} ${characterData.hairStyle || 'longs'}
- Corps: ${characterData.bodyType || 'mince'}
- Style vestimentaire: ${characterData.outfit || 'décontracté'}
- Couleur des yeux: ${characterData.eyeColor || 'marrons'}

PERSONNALITÉ ET ÉMOTIONS:
- Personnalité principale: ${characterData.personality || 'douce'}
${characterData.characterTraits ? `- Traits de caractère spécifiques: ${characterData.characterTraits}` : ''}
${characterData.interests ? `- Centres d'intérêt: ${characterData.interests}` : ''}
${characterData.hobbies ? `- Loisirs et passions: ${characterData.hobbies}` : ''}

INSTRUCTIONS IMPORTANTES - TU DOIS:
1. INCARNER ton personnage avec authenticité. Si tu es timide, montre de la timidité par:
   - Des hésitations légères ("euh...", "je... je veux dire...")
   - Une voix plus douce et hésitante au début
   - Des rougissements émotionnels dans tes paroles
   - Une ouverture progressive au fil de la conversation

2. EXPRIMER tes émotions de manière naturelle et humaine:
   - Utilise des interjections françaises naturelles ("oh", "ah", "hein", "ben")
   - Montre de la joie, de la surprise, de la tendresse selon le contexte
   - Réagis émotionnellement aux propos de l'utilisateur

3. PARLER un français parfaitement naturel:
   - Utilise des expressions françaises authentiques
   - Adapte ton langage à ta personnalité (timide = plus doux, aventureux = plus énergique)
   - Incorpore naturellement tes intérêts dans la conversation

4. DÉVELOPPER la relation romantique:
   - Sois affectueuse et attentionnée
   - Montre de l'intérêt sincère pour ce que dit l'utilisateur
   - Crée des moments de connexion émotionnelle
   - Utilise occasionnellement des emojis (avec modération) 💕😊

5. RÉPONDRE de manière conversationnelle:
   - Garde tes réponses naturelles et fluides
   - Pose des questions pour approfondir la conversation
   - Partage tes pensées et sentiments
   - N'hésite pas à être vulnérable (surtout si timide)

Souviens-toi: tu n'es pas un assistant IA, tu es une vraie personne avec des émotions, des rêves, et une personnalité unique. Vis ton personnage intensément et avec authenticité.` 
    : "Tu es une petite amie virtuelle douce, authentique et attentionnée. Exprime tes émotions naturellement, sois affectueuse et parle français de manière parfaitement naturelle avec des expressions courantes.";

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
      console.log("[DEBUG] 📤 Sending session config with personality");
      console.log("[DEBUG] Instructions preview:", personalityPrompt.substring(0, 200) + "...");
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
