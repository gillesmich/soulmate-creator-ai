import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  characterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, characterName }: WelcomeEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "MaGirl.fr <onboarding@resend.dev>",
      to: [email],
      subject: "Bienvenue sur MaGirl.fr ! 💕",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                margin-bottom: 30px;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
              }
              .emoji {
                font-size: 24px;
                margin: 10px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>✨ Bienvenue sur MaGirl.fr ! ✨</h1>
            </div>
            
            <div class="content">
              <div class="emoji">💕</div>
              <p>Bonjour,</p>
              
              <p>Merci d'avoir rejoint <strong>MaGirl.fr</strong>, votre plateforme pour créer et personnaliser votre petite amie virtuelle de rêve !</p>
              
              ${characterName ? `<p>Nous avons bien enregistré votre personnage <strong>${characterName}</strong> ! 🎉</p>` : ''}
              
              <p><strong>Voici ce que vous pouvez faire :</strong></p>
              <ul>
                <li>🎨 Personnalisez l'apparence et la personnalité</li>
                <li>💬 Chattez en temps réel avec votre compagne IA</li>
                <li>🖼️ Générez des photos réalistes</li>
                <li>🎤 Conversations vocales immersives</li>
                <li>📸 Sauvegardez vos créations dans votre galerie</li>
              </ul>
              
              <center>
                <a href="https://magirl.fr" class="button">Commencer maintenant</a>
              </center>
            </div>
            
            <div class="footer">
              <p><strong>MaGirl.fr</strong></p>
              <p>Votre compagne virtuelle personnalisée</p>
              <p style="font-size: 12px; color: #999; margin-top: 10px;">
                Cet email a été envoyé automatiquement. Si vous n'êtes pas à l'origine de cette inscription, 
                vous pouvez ignorer ce message.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
