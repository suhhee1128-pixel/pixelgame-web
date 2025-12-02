import { NextRequest, NextResponse } from 'next/server';
import { getGlobalGenerator } from '@/lib/game-asset-generator';
import { buildUserPreferences } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const description = formData.get('description') as string;
    const actions_text = formData.get('actions_text') as string;
    const art_style = formData.get('art_style') as string || 'None';
    const mood = formData.get('mood') as string || 'None';
    const color_palette = formData.get('color_palette') as string || 'None';
    const character_style = formData.get('character_style') as string || 'None';
    const line_style = formData.get('line_style') as string || 'None';
    const composition = formData.get('composition') as string || 'None';
    const additional_notes = formData.get('additional_notes') as string || '';
    const reference_image = formData.get('reference_image') as File | null;

    if (!description || !actions_text) {
      return NextResponse.json(
        { success: false, error: 'Character description and actions are required' },
        { status: 400 }
      );
    }

    const actions = actions_text.split(',').map(a => a.trim()).filter(a => a);
    if (actions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least one action' },
        { status: 400 }
      );
    }

    const stylePreferences = buildUserPreferences(
      art_style,
      mood,
      color_palette,
      character_style,
      line_style,
      composition,
      additional_notes
    );

    const generator = getGlobalGenerator();
    let referenceImagePath: string | null = null;

    if (reference_image) {
      const arrayBuffer = await reference_image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const timestamp = Date.now();
      const filename = `reference_${timestamp}.png`;
      const referencePath = `${generator['referenceDir']}/${filename}`;
      await require('fs-extra').writeFile(referencePath, buffer);
      referenceImagePath = referencePath;
    }

    const sprites = await generator.generateCharacterSprites(
      description,
      actions,
      stylePreferences,
      referenceImagePath || undefined
    );

    return NextResponse.json({
      success: true,
      sprites: sprites.map(s => ({ action: s.action, image_url: s.imageUrl })),
      message: `Generated ${sprites.length} sprites successfully!`
    });
  } catch (error: any) {
    console.error('Error generating sprites:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate sprites' },
      { status: 500 }
    );
  }
}







