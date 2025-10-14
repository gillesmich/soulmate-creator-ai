import { supabase } from "@/integrations/supabase/client";


export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;

  constructor(private onMessage: (message: any) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init(character?: any) {
    try {
      console.log('Requesting ephemeral token...');
      
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("realtime-token", {
        body: { character }
      });
      
      if (tokenError) {
        console.error('Token error:', tokenError);
        throw new Error(`Failed to get token: ${tokenError.message}`);
      }

      console.log('Token received:', tokenData);
      
      if (!tokenData?.client_secret?.value) {
        throw new Error("No ephemeral token received");
      }

      const EPHEMERAL_KEY = tokenData.client_secret.value;

      console.log('Creating peer connection...');
      this.pc = new RTCPeerConnection();

      // Set up remote audio
      this.pc.ontrack = e => {
        console.log('[AUDIO DEBUG] Received remote audio track');
        console.log('[AUDIO DEBUG] Track kind:', e.track.kind);
        console.log('[AUDIO DEBUG] Track enabled:', e.track.enabled);
        console.log('[AUDIO DEBUG] Track muted:', e.track.muted);
        console.log('[AUDIO DEBUG] Track readyState:', e.track.readyState);
        console.log('[AUDIO DEBUG] Streams:', e.streams.length);
        
        this.audioEl.srcObject = e.streams[0];
        
        // Additional audio element checks
        this.audioEl.onloadedmetadata = () => {
          console.log('[AUDIO DEBUG] Audio element loaded metadata');
          console.log('[AUDIO DEBUG] Audio duration:', this.audioEl.duration);
          console.log('[AUDIO DEBUG] Audio paused:', this.audioEl.paused);
          console.log('[AUDIO DEBUG] Audio volume:', this.audioEl.volume);
          console.log('[AUDIO DEBUG] Audio muted:', this.audioEl.muted);
        };
        
        this.audioEl.onplay = () => console.log('[AUDIO DEBUG] Audio started playing');
        this.audioEl.onerror = (err) => console.error('[AUDIO DEBUG] Audio error:', err);
      };

      // Add local audio track
      console.log('Requesting microphone access...');
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('[DATA CHANNEL] Data channel opened');
      });
      
      this.dc.addEventListener("close", () => {
        console.log('[DATA CHANNEL] Data channel closed');
      });
      
      this.dc.addEventListener("error", (err) => {
        console.error('[DATA CHANNEL] Data channel error:', err);
      });
      
      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("[EVENT] Received event:", event.type);
        
        if (event.type === 'response.audio.delta') {
          console.log('[EVENT] Audio delta size:', event.delta?.length);
        } else if (event.type === 'error') {
          console.error('[EVENT] Error event:', event);
        }
        
        this.onMessage(event);
      });

      // Create and set local description
      console.log('Creating offer...');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      console.log('Connecting to OpenAI Realtime API...');
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI connection failed: ${sdpResponse.status}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established successfully");

    } catch (error) {
      console.error("Error initializing chat:", error);
      throw error;
    }
  }

  async sendMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
  }

  disconnect() {
    console.log('Disconnecting...');
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    this.audioEl.srcObject = null;
  }
}
