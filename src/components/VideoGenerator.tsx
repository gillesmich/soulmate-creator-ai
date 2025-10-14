import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoGeneratorProps {
  imageUrl?: string;
  onVideoGenerated?: (videoUrl: string) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ imageUrl, onVideoGenerated }) => {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const generateVideo = async () => {
    if (!imageUrl) {
      toast({
        title: "No Image",
        description: "Please generate a character image first",
        variant: "destructive",
      });
      return;
    }

    if (!text.trim()) {
      toast({
        title: "No Text",
        description: "Please enter text for your character to say",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { 
          imageUrl,
          text: text.trim()
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setVideoUrl(data.videoUrl);
      if (onVideoGenerated) {
        onVideoGenerated(data.videoUrl);
      }

      toast({
        title: "Video Generated!",
        description: "Your character video is ready",
      });
    } catch (error) {
      console.error('Error generating video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            What should your character say?
          </label>
          <Textarea
            placeholder="Enter text for your character to speak..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isGenerating}
          />
        </div>

        <Button
          onClick={generateVideo}
          disabled={isGenerating || !imageUrl || !text.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Video...
            </>
          ) : (
            <>
              <Video className="mr-2 h-4 w-4" />
              Generate Lipsync Video
            </>
          )}
        </Button>

        {videoUrl && (
          <div className="space-y-2">
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg border border-primary/20"
              autoPlay
              loop
            >
              Your browser does not support video playback.
            </video>
            <p className="text-xs text-muted-foreground text-center">
              Video generated with D-ID
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoGenerator;
