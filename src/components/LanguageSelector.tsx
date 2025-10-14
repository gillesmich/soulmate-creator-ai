import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-primary/20 bg-background/50">
      <Globe className="h-4 w-4 text-primary" />
      <RadioGroup 
        value={language} 
        onValueChange={(value) => setLanguage(value as 'fr' | 'en')}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fr" id="lang-fr" />
          <Label htmlFor="lang-fr" className="cursor-pointer font-medium">
            Français
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="en" id="lang-en" />
          <Label htmlFor="lang-en" className="cursor-pointer font-medium">
            English
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
