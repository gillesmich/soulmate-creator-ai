import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Sparkles, MessageCircle, Palette, Users, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ApiKeyInfo } from '@/components/ApiKeyInfo';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { PremiumModal } from '@/components/PremiumModal';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { signOut, subscription, user } = useAuth();
  const { t } = useLanguage();
  const { trialStatus } = useTrialStatus();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isPremium = subscription.subscribed && subscription.plan_type !== 'free';

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    // Show premium modal for non-admin, non-premium users
    if (!isAdmin && !isPremium && trialStatus && !trialStatus.allowed) {
      setShowPremiumModal(true);
    } else if (!isAdmin && !isPremium && trialStatus?.trial) {
      // Show modal once on first load for trial users
      const hasSeenModal = sessionStorage.getItem('hasSeenPremiumModal');
      if (!hasSeenModal) {
        setShowPremiumModal(true);
        sessionStorage.setItem('hasSeenPremiumModal', 'true');
      }
    }
  }, [trialStatus, isPremium, isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-romantic via-background to-accent/20">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-end mb-4 gap-2">
          <LanguageSelector />
          {isPremium && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Premium
            </div>
          )}
          <Button 
            onClick={() => navigate('/pricing')}
            variant="outline"
            className="border-primary/20"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {isPremium ? t('home.pricing') : 'Premium'}
          </Button>
          <Button 
            onClick={signOut}
            variant="outline"
            className="border-primary/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('customize.signOut')}
          </Button>
        </div>
        
        <ApiKeyInfo />
        
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-6">
            {t('home.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('home.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => navigate('/customize')} 
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg px-8 py-6"
            >
              <Heart className="h-6 w-6 mr-3" />
              {t('home.customize')}
            </Button>
            
            <Button 
              onClick={() => navigate('/gallery')} 
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-primary/20 hover:bg-primary/10"
            >
              <Users className="h-6 w-6 mr-3" />
              {t('home.gallery')}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-primary/20 bg-gradient-to-b from-romantic to-card">
            <CardHeader className="text-center">
              <Palette className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Customize Everything</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Choose hair color, style, body type, personality traits, and outfits to create your perfect companion.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-b from-romantic to-card">
            <CardHeader className="text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Natural Conversations</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Enjoy realistic, engaging conversations powered by advanced AI that adapts to your girlfriend's personality.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-b from-romantic to-card">
            <CardHeader className="text-center">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Always Available</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Your AI girlfriend is always there for you, ready to chat, listen, and provide companionship anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <PremiumModal 
        open={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
        remainingMinutes={trialStatus?.remaining_minutes}
      />
    </div>
  );
};

export default Index;
