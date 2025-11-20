import { NextRequest, NextResponse } from 'next/server';
import { getGlobalGenerator } from '@/lib/game-asset-generator';
import { buildUserPreferences } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const description = formData.get('description') as string;
    const art_style = formData.get('art_style') as string || 'None';
    const mood = formData.get('mood') as string || 'None';
    const color_palette = formData.get('color_palette') as string || 'None';
    const line_style = formData.get('line_style') as string || 'None';
    const composition = formData.get('composition') as string || 'None';
    const additional_notes = formData.get('additional_notes') as string || '';
    const reference_image = formData.get('reference_image') as File | null;

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Item description is required' },
        { status: 400 }
      );
    }

    const stylePreferences = buildUserPreferences(
      art_style,
      mood,
      color_palette,
      null,
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

    const result = await generator.generateItemImage(
      description,
      stylePreferences,
      referenceImagePath || undefined
    );

    return NextResponse.json({
      success: true,
      image_url: result.imageUrl,
      message: 'Item generated successfully!'
    });
  } catch (error: any) {
    console.error('Error generating item:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate item',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}





