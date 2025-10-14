import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[GET-ELEVENLABS-AGENT] Function invoked");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[GET-ELEVENLABS-AGENT] No authorization header");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      console.error("[GET-ELEVENLABS-AGENT] Auth error:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user) {
      console.error("[GET-ELEVENLABS-AGENT] User not authenticated");
      throw new Error("User not authenticated");
    }

    console.log("[GET-ELEVENLABS-AGENT] User authenticated:", user.id);

    const { agentId } = await req.json();
    console.log("[GET-ELEVENLABS-AGENT] Agent ID requested:", agentId);
    
    if (!agentId) {
      console.error("[GET-ELEVENLABS-AGENT] No agent ID provided");
      throw new Error("Agent ID is required");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      console.error("[GET-ELEVENLABS-AGENT] API key not configured");
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    console.log("[GET-ELEVENLABS-AGENT] Calling ElevenLabs API...");
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    console.log("[GET-ELEVENLABS-AGENT] ElevenLabs API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GET-ELEVENLABS-AGENT] ElevenLabs API error:", errorText);
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const data = await response.json();
    console.log("[GET-ELEVENLABS-AGENT] Signed URL obtained successfully");
    
    return new Response(JSON.stringify({ signedUrl: data.signed_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[GET-ELEVENLABS-AGENT] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
