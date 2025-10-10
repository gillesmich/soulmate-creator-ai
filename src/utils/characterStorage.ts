export interface CharacterData {
  hairColor: string;
  hairStyle: string;
  bodyType: string;
  personality: string;
  outfit: string;
  eyeColor: string;
  age: string;
  image?: string;
  name?: string;
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
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setCurrentCharacter = (character: CharacterData): void => {
  localStorage.setItem(CURRENT_CHARACTER_KEY, JSON.stringify(character));
};
