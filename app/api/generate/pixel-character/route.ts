import { NextRequest, NextResponse } from 'next/server';
import { getGlobalGenerator } from '@/lib/game-asset-generator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const description = formData.get('description') as string;
    const color = formData.get('color') as string || 'None';
    const mood = formData.get('mood') as string || 'None';
    const weapon = formData.get('weapon') as string || 'None';

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Character description is required' },
        { status: 400 }
      );
    }

    console.log('Getting generator instance...');
    const generator = getGlobalGenerator();
    console.log('Generator obtained, calling generatePixelCharacter...');
    
    const result = await generator.generatePixelCharacter(
      description,
      color !== 'None' ? color : undefined,
      mood !== 'None' ? mood : undefined,
      weapon !== 'None' ? weapon : undefined
    );

    console.log('Generation result:', result);

    if (!result || !result.imageUrl) {
      console.error('Invalid result from generatePixelCharacter:', result);
      return NextResponse.json(
        { success: false, error: 'Invalid response from generator' },
        { status: 500 }
      );
    }

    console.log('Returning success response with image_url:', result.imageUrl);
    return NextResponse.json({
      success: true,
      image_url: result.imageUrl,
      message: 'Pixel character generated successfully!'
    });
  } catch (error: any) {
    console.error('Error generating pixel character:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate pixel character',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}



