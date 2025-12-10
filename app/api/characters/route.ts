import { NextResponse } from 'next/server';
import { getCharacters, createCharacter } from '@/lib/character-db';

export async function GET() {
  console.log("GET /api/characters called"); // Debug Log
  try {
    const characters = await getCharacters();
    console.log("Fetched characters count:", characters.length); // Debug Log
    return NextResponse.json(characters);
  } catch (err) {
    console.error("GET /api/characters error:", err); // Debug Log
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 필수 필드 검증 (간단하게)
    if (!body.name || !body.imageUrl) {
      return NextResponse.json(
        { error: 'Name and imageUrl are required' },
        { status: 400 }
      );
    }

    const newCharacter = await createCharacter(body);
    return NextResponse.json(newCharacter);
  } catch (error) {
    console.error('Create character error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

