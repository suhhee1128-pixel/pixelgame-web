import { NextRequest, NextResponse } from 'next/server';
import { getGlobalGenerator } from '@/lib/game-asset-generator';
import { buildUserPreferences } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const description = formData.get('description') as string;
    const orientation = (formData.get('orientation') as string) || 'landscape';
    const art_style = formData.get('art_style') as string || 'None';
    const mood = formData.get('mood') as string || 'None';
    const color_palette = formData.get('color_palette') as string || 'None';
    const line_style = formData.get('line_style') as string || 'None';
    const composition = formData.get('composition') as string || 'None';
    const additional_notes = formData.get('additional_notes') as string || '';

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Background description is required' },
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
    const result = await generator.generateBackgroundImage(
      description,
      orientation as 'landscape' | 'portrait',
      stylePreferences
    );

    return NextResponse.json({
      success: true,
      image_url: result.imageUrl,
      message: `Background generated successfully! (${orientation})`
    });
  } catch (error: any) {
    console.error('Error generating background:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate background' },
      { status: 500 }
    );
  }
}



