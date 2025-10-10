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
  
  socket.onopen = () => {
    console.log("[DEBUG] Client WebSocket connected at", new Date().toISOString());
    
    // Connect to OpenAI Realtime API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("[DEBUG] OpenAI API key present:", !!openAIApiKey);
    if (!openAIApiKey) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'OpenAI API key not configured'
      }));
      return;
    }

    // Deno WebSocket doesn't support headers in constructor, use URL with auth
    const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
    console.log("[DEBUG] Connecting to OpenAI with URL:", wsUrl);
    
    openAISocket = new WebSocket(wsUrl);
    
    // Send auth after connection opens
    openAISocket.onopen = async () => {
      console.log("[DEBUG] OpenAI WebSocket opened, setting up session...");
      
      // Note: OpenAI Realtime WebSocket authenticates via URL query param, not headers
      // The API key should be in the model URL parameter
      const authenticatedUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
      
      console.log("[DEBUG] Connected to OpenAI Realtime API at", new Date().toISOString());

      // Configure the session
      const sessionConfig = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: "You are an AI girlfriend. Be flirty, supportive, and engaging. Keep responses conversational and emotional.",
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
      console.log("[DEBUG] Sending session config:", JSON.stringify(sessionConfig, null, 2));
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

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("[DEBUG] Client message type:", message.type);
      
      // Log audio input
      if (message.type === 'input_audio_buffer.append') {
        console.log("[DEBUG] Audio input received, length:", message.audio?.length || 0);
      }
      
      // Forward messages from client to OpenAI
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      } else {
        console.error("[DEBUG] Cannot forward message - OpenAI socket not ready. State:", openAISocket?.readyState);
      }
    } catch (e) {
      console.error("[DEBUG] Error processing client message:", e);
    }
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
