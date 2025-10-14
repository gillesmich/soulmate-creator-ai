import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  fr: {
    // Gallery
    'gallery.title': 'Galerie de Personnages',
    'gallery.back': 'Retour',
    'gallery.createNew': 'Créer un Nouveau Personnage',
    'gallery.noCharacters': 'Aucun Personnage Sauvegardé',
    'gallery.noCharactersDesc': "Vous n'avez pas encore sauvegardé de personnages. Créez votre première petite amie IA !",
    'gallery.createFirst': 'Créer Votre Premier Personnage',
    'gallery.chat': 'Chat',
    'gallery.edit': 'Modifier',
    'gallery.created': 'Créé le',
    'gallery.interests': 'Intérêts:',
    'gallery.hobbies': 'Hobbies:',
    'gallery.traits': 'Traits:',
    'gallery.appearance': 'Apparence:',
    'gallery.characterTraits': 'Traits de caractère:',
    'gallery.generateAvatar': 'Générer un Avatar',
    'gallery.startChat': 'Démarrer le Chat',
    'gallery.selected': 'Personnage sélectionné',
    'gallery.selectedDesc': 'est maintenant actif',
    'gallery.deleted': 'Personnage supprimé',
    'gallery.deletedDesc': 'a été retiré',
    'gallery.error': 'Erreur',
    'gallery.errorDelete': 'Impossible de supprimer le personnage',
    'gallery.errorLogin': 'Vous devez être connecté pour supprimer un personnage',
    'gallery.apiRequired': 'Clé API requise',
    'gallery.apiRequiredDesc': 'Veuillez configurer votre clé API dans les paramètres',
    'gallery.avatarGenerated': 'Avatar généré !',
    'gallery.avatarGeneratedDesc': 'Un nouvel avatar a été ajouté à ce personnage',
    'gallery.errorGenerate': "Impossible de générer l'avatar. Veuillez réessayer.",
    'gallery.loading': 'Chargement de vos personnages...',
    'gallery.eyes': 'yeux',
    
    // Chat
    'chat.title': 'Votre Petite Amie IA',
    'chat.typeMessage': 'Tapez votre message...',
    'chat.send': 'Envoyer',
    'chat.back': 'Retour',
    
    // Customize
    'customize.title': 'Personnalisez Votre Petite Amie IA',
    'customize.signIn': 'Se Connecter',
    'customize.signOut': 'Se Déconnecter',
    'customize.generate': 'Générer',
    'customize.save': 'Sauvegarder',
    'customize.chat': 'Démarrer le Chat',
    'customize.hairColor': 'Couleur de Cheveux',
    'customize.hairStyle': 'Style de Cheveux',
    'customize.bodyType': 'Type de Corps',
    'customize.personality': 'Personnalité',
    'customize.outfit': 'Tenue',
    'customize.eyeColor': 'Couleur des Yeux',
    'customize.age': 'Âge',
    'customize.ethnicity': 'Ethnicité',
    'customize.voice': 'Voix',
    'customize.avatarView': 'Vue Avatar',
    'customize.clothing': 'Vêtements',
    'customize.imageStyle': 'Style Image',
    'customize.interests': 'Intérêts',
    'customize.hobbies': 'Hobbies',
    'customize.characterTraits': 'Traits de Caractère',
    'customize.scenery': 'Décor / Scène',
    'customize.sceneryPlaceholder': 'Ex: plage au coucher du soleil, café parisien...',
    'customize.multipleStyles': 'Plusieurs Styles',
    'customize.multipleViews': 'Plusieurs Vues',
    'customize.multipleClothing': 'Plusieurs Vêtements',
    'customize.generating': 'Génération en cours...',
    'customize.selectImage': 'Sélectionnez une image pour commencer',
    'customize.variations': 'Variations',
    'customize.uploadImage': 'Télécharger une Image',
    'customize.video': 'Vidéo',
    'customize.back': 'Retour',
    'customize.gallery': 'Galerie',
    
    // Index/Home
    'home.title': 'Votre Petite Amie IA',
    'home.subtitle': 'Créez et chattez avec votre compagne IA personnalisée',
    'home.customize': 'Personnaliser',
    'home.chat': 'Chat',
    'home.gallery': 'Galerie',
    'home.pricing': 'Tarifs',
    'home.apiKeys': 'Clés API',
    
    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
  },
  en: {
    // Gallery
    'gallery.title': 'Character Gallery',
    'gallery.back': 'Back',
    'gallery.createNew': 'Create New Character',
    'gallery.noCharacters': 'No Saved Characters',
    'gallery.noCharactersDesc': "You haven't saved any characters yet. Create your first AI girlfriend!",
    'gallery.createFirst': 'Create Your First Character',
    'gallery.chat': 'Chat',
    'gallery.edit': 'Edit',
    'gallery.created': 'Created',
    'gallery.interests': 'Interests:',
    'gallery.hobbies': 'Hobbies:',
    'gallery.traits': 'Traits:',
    'gallery.appearance': 'Appearance:',
    'gallery.characterTraits': 'Character Traits:',
    'gallery.generateAvatar': 'Generate Avatar',
    'gallery.startChat': 'Start Chat',
    'gallery.selected': 'Character selected',
    'gallery.selectedDesc': 'is now active',
    'gallery.deleted': 'Character deleted',
    'gallery.deletedDesc': 'has been removed',
    'gallery.error': 'Error',
    'gallery.errorDelete': 'Unable to delete character',
    'gallery.errorLogin': 'You must be logged in to delete a character',
    'gallery.apiRequired': 'API Key Required',
    'gallery.apiRequiredDesc': 'Please configure your API key in settings',
    'gallery.avatarGenerated': 'Avatar generated!',
    'gallery.avatarGeneratedDesc': 'A new avatar has been added to this character',
    'gallery.errorGenerate': 'Unable to generate avatar. Please try again.',
    'gallery.loading': 'Loading your characters...',
    'gallery.eyes': 'eyes',
    
    // Chat
    'chat.title': 'Your AI Girlfriend',
    'chat.typeMessage': 'Type your message...',
    'chat.send': 'Send',
    'chat.back': 'Back',
    
    // Customize
    'customize.title': 'Customize Your AI Girlfriend',
    'customize.signIn': 'Sign In',
    'customize.signOut': 'Sign Out',
    'customize.generate': 'Generate',
    'customize.save': 'Save',
    'customize.chat': 'Start Chatting',
    'customize.hairColor': 'Hair Color',
    'customize.hairStyle': 'Hair Style',
    'customize.bodyType': 'Body Type',
    'customize.personality': 'Personality',
    'customize.outfit': 'Outfit',
    'customize.eyeColor': 'Eye Color',
    'customize.age': 'Age',
    'customize.ethnicity': 'Ethnicity',
    'customize.voice': 'Voice',
    'customize.avatarView': 'Avatar View',
    'customize.clothing': 'Clothing',
    'customize.imageStyle': 'Image Style',
    'customize.interests': 'Interests',
    'customize.hobbies': 'Hobbies',
    'customize.characterTraits': 'Character Traits',
    'customize.scenery': 'Scenery / Scene',
    'customize.sceneryPlaceholder': 'e.g., beach at sunset, Parisian café...',
    'customize.multipleStyles': 'Multiple Styles',
    'customize.multipleViews': 'Multiple Views',
    'customize.multipleClothing': 'Multiple Clothing',
    'customize.generating': 'Generating...',
    'customize.selectImage': 'Select an image to start',
    'customize.variations': 'Variations',
    'customize.uploadImage': 'Upload Image',
    'customize.video': 'Video',
    'customize.back': 'Back',
    'customize.gallery': 'Gallery',
    
    // Index/Home
    'home.title': 'Your AI Girlfriend',
    'home.subtitle': 'Create and chat with your personalized AI companion',
    'home.customize': 'Customize',
    'home.chat': 'Chat',
    'home.gallery': 'Gallery',
    'home.pricing': 'Pricing',
    'home.apiKeys': 'API Keys',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved === 'en' || saved === 'fr') ? saved : 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.fr] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
