import { NextResponse } from 'next/server';
import { getCharacterById, updateCharacter, deleteCharacter } from '@/lib/character-db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const character = await getCharacterById(params.id);
  
  if (!character) {
    return NextResponse.json(
      { error: 'Character not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(character);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await updateCharacter(params.id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const success = await deleteCharacter(params.id);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Character not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ success: true });
}

