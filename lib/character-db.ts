import { supabase } from './supabase';
import { Character } from './types';

// Supabase DB Row 타입 정의 (Snake Case)
interface CharacterRow {
  id: string;
  name: string;
  type?: string;
  image_url: string;
  description?: string;
  stats: any; // JSONB
  sprite_frames?: any; // JSONB
  created_at: string;
  updated_at?: string;
  win_count?: number;
}

// Row -> Domain Object 변환
function mapRowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    imageUrl: row.image_url,
    description: row.description,
    stats: row.stats,
    spriteFrames: row.sprite_frames,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    winCount: row.win_count
  };
}

export async function getCharacters(): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error details:', JSON.stringify(error, null, 2)); // Detailed Error
    return [];
  }
  
  if (data) {
      console.log(`Supabase returned ${data.length} rows.`);
  }

  return (data as CharacterRow[]).map(mapRowToCharacter);
}

export async function getCharacterById(id: string): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return mapRowToCharacter(data as CharacterRow);
}

export async function createCharacter(
  data: Omit<Character, 'id' | 'createdAt' | 'winCount'>
): Promise<Character> {
  // DB Insert
  const { data: inserted, error } = await supabase
    .from('characters')
    .insert({
      name: data.name,
      type: data.type,
      image_url: data.imageUrl,
      description: data.description,
      stats: data.stats || { hp: 20, maxHp: 20, atk: 1, speed: 10 },
      sprite_frames: data.spriteFrames
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(error.message);
  }

  return mapRowToCharacter(inserted as CharacterRow);
}

export async function updateCharacter(id: string, updates: Partial<Character>): Promise<Character | null> {
  // Map updates to snake_case
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
  if (updates.stats) dbUpdates.stats = updates.stats;
  if (updates.spriteFrames) dbUpdates.sprite_frames = updates.spriteFrames;
  if (updates.winCount !== undefined) dbUpdates.win_count = updates.winCount;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('characters')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return mapRowToCharacter(data as CharacterRow);
}

export async function deleteCharacter(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id);

  return !error;
}
