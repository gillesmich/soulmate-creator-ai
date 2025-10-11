export interface CharacterData {
  hairColor: string;
  hairStyle: string;
  bodyType: string;
  personality: string;
  outfit: string;
  eyeColor: string;
  age: string;
  voice?: string;
  avatarView?: string;
  clothing?: string;
  imageStyle?: string;
  image?: string;
  images?: string[]; // Multiple generated images
  name?: string;
  interests?: string;
  hobbies?: string;
  characterTraits?: string;
}

export interface SavedCharacter extends CharacterData {
  id: string;
  name: string;
  image: string;
  createdAt: string;
}

const STORAGE_KEY = 'savedCharacters';
const CURRENT_CHARACTER_KEY = 'girlfriendCharacter';

export const saveCharacter = (character: CharacterData, name: string): SavedCharacter => {
  const savedCharacter: SavedCharacter = {
    ...character,
    id: crypto.randomUUID(),
    name,
    image: character.image || '',
    createdAt: new Date().toISOString(),
  };

  const characters = getSavedCharacters();
  characters.push(savedCharacter);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  
  return savedCharacter;
};

export const getSavedCharacters = (): SavedCharacter[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const deleteCharacter = (id: string): void => {
  const characters = getSavedCharacters().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
};

export const getCurrentCharacter = (): CharacterData | null => {
  const stored = localStorage.getItem(CURRENT_CHARACTER_KEY);
  if (!stored) return null;
  
  try {
    const character = JSON.parse(stored);
    // Retrieve the image from sessionStorage if available
    const image = sessionStorage.getItem('currentCharacterImage');
    if (image) {
      character.image = image;
    }
    return character;
  } catch {
    return null;
  }
};

export const setCurrentCharacter = (character: CharacterData): void => {
  // Remove images to avoid localStorage quota exceeded error
  const { image, images, ...characterWithoutImages } = character;
  localStorage.setItem(CURRENT_CHARACTER_KEY, JSON.stringify(characterWithoutImages));
  
  // Store only the first image URL separately if it exists
  if (image) {
    try {
      sessionStorage.setItem('currentCharacterImage', image);
    } catch (e) {
      console.warn('Could not store image in sessionStorage:', e);
    }
  }
};
