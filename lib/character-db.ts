import fs from 'fs-extra';
import path from 'path';
import { Character, CharacterStats } from './types';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'characters.json');

// 초기 더미 데이터
const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'dummy-hero-001',
    name: 'Hero (Tester)',
    type: 'Warrior',
    imageUrl: '/images/dummy/0_main.png', // Changed to correct dummy main image
    description: '테스트용 초기 캐릭터입니다.',
    stats: {
      hp: 20,
      maxHp: 20,
      atk: 1,
      speed: 10
    },
    createdAt: new Date().toISOString(),
    winCount: 0
  }
];

export async function getCharacters(): Promise<Character[]> {
  try {
    await fs.ensureDir(DATA_DIR);
    
    if (!await fs.pathExists(DB_PATH)) {
      await fs.writeJSON(DB_PATH, INITIAL_CHARACTERS, { spaces: 2 });
      return INITIAL_CHARACTERS;
    }
    
    return await fs.readJSON(DB_PATH);
  } catch (error) {
    console.error('Failed to read characters:', error);
    return [];
  }
}

export async function getCharacterById(id: string): Promise<Character | null> {
  const characters = await getCharacters();
  return characters.find(c => c.id === id) || null;
}

export async function createCharacter(
  data: Omit<Character, 'id' | 'createdAt' | 'winCount'>
): Promise<Character> {
  const characters = await getCharacters();
  
  const newCharacter: Character = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    winCount: 0,
    // 스탯이 없으면 기본값 설정 (안전장치)
    stats: data.stats || {
      hp: 20,
      maxHp: 20,
      atk: 1,
      speed: 10
    }
  };
  
  characters.push(newCharacter);
  await fs.writeJSON(DB_PATH, characters, { spaces: 2 });
  
  return newCharacter;
}

export async function updateCharacter(id: string, updates: Partial<Character>): Promise<Character | null> {
  const characters = await getCharacters();
  const index = characters.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  const updatedCharacter = {
    ...characters[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  characters[index] = updatedCharacter;
  await fs.writeJSON(DB_PATH, characters, { spaces: 2 });
  
  return updatedCharacter;
}

export async function deleteCharacter(id: string): Promise<boolean> {
  const characters = await getCharacters();
  const filtered = characters.filter(c => c.id !== id);
  
  if (filtered.length === characters.length) return false;
  
  await fs.writeJSON(DB_PATH, filtered, { spaces: 2 });
  return true;
}

