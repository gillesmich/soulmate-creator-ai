import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, ArrowLeft, LogOut } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

const Pricing = () => {
  const navigate = useNavigate();
  const { subscription, createCheckout, openCustomerPortal } = useSubscription();
  const { user, signOut } = useAuth();

  const plans = [
    {
      name: 'Free',
      price: '0€',
      period: '',
      priceId: null,
      features: [
        '5 conversations par jour',
        'Max 10 minutes par jour',
        '1 voix féminine par défaut',
        'Accès aux fonctionnalités de base',
      ],
      current: subscription.plan_type === 'free',
    },
    {
      name: 'Premium Mensuel',
      price: '9,99€',
      period: '/mois',
      priceId: 'price_1SGzBJAv1E9PU67T6b17aCHX',
      features: [
        '🚀 Commencez immédiatement',
        'Conversations illimitées',
        'Durée illimitée',
        '20+ voix féminines premium',
        'Voix de qualité supérieure',
        'Support prioritaire',
        'Nouvelles voix en avant-première',
      ],
      current: subscription.plan_type === 'monthly',
      popular: true,
    },
    {
      name: 'Premium Annuel',
      price: '100€',
      period: '/an',
      priceId: 'price_1SGzBZAv1E9PU67TXSMq7RSB',
      savings: 'Économisez 19,88€',
      trial: '3 jours d\'essai gratuit',
      features: [
        '✨ 3 jours d\'essai gratuit',
        'Conversations illimitées',
        'Durée illimitée',
        '20+ voix féminines premium',
        'Voix de qualité supérieure',
        'Support prioritaire',
        'Nouvelles voix en avant-première',
        '2 mois gratuits',
      ],
      current: subscription.plan_type === 'yearly',
    },
  ];

  const handleSubscribe = async (priceId: string | null) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (priceId) {
      await createCheckout(priceId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          
          <Button
            variant="outline"
            onClick={signOut}
            className="border-primary/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-muted-foreground text-lg">
            Accédez à des conversations illimitées avec des voix premium
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-6 relative ${
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : ''
              } ${
                plan.current
                  ? 'border-green-500 border-2'
                  : ''
              }`}
            >
              {plan.popular && !plan.current && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Plus populaire
                </div>
              )}
              
              {plan.trial && !plan.current && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  {plan.trial}
                </div>
              )}
              
              {plan.current && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Votre plan actuel
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {plan.savings && (
                  <p className="text-green-600 text-sm mt-1 font-semibold">
                    {plan.savings}
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.current ? (
                subscription.subscribed ? (
                  <Button
                    onClick={openCustomerPortal}
                    variant="outline"
                    className="w-full"
                  >
                    Gérer l'abonnement
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full"
                  >
                    Plan actuel
                  </Button>
                )
              ) : (
                <Button
                  onClick={() => handleSubscribe(plan.priceId)}
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full"
                  disabled={!plan.priceId}
                >
                  {plan.priceId ? 'Souscrire' : 'Actuel'}
                </Button>
              )}
            </Card>
          ))}
        </div>

        {subscription.subscribed && subscription.subscription_end && (
          <div className="text-center mt-8 text-sm text-muted-foreground">
            Votre abonnement se renouvelle le{' '}
            {new Date(subscription.subscription_end).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;