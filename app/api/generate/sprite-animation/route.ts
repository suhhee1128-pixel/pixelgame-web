import { NextRequest, NextResponse } from 'next/server';
import { getGlobalGenerator } from '@/lib/game-asset-generator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const reference_image = formData.get('reference_image') as File | null;
    const action_type = formData.get('action_type') as string;

    if (!reference_image) {
      return NextResponse.json(
        { success: false, error: 'Please upload a character reference image first.' },
        { status: 400 }
      );
    }

    if (action_type !== 'attack' && action_type !== 'jump') {
      return NextResponse.json(
        { success: false, error: 'Please select a valid action type (attack or jump).' },
        { status: 400 }
      );
    }

    const generator = getGlobalGenerator();
    
    // Save reference image
    const arrayBuffer = await reference_image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const filename = `reference_${timestamp}.png`;
    const referencePath = `${(generator as any).referenceDir}/${filename}`;
    await require('fs-extra').writeFile(referencePath, buffer);

    const frames = await generator.generateSpriteAnimation(
      referencePath,
      action_type as 'attack' | 'jump'
    );

    return NextResponse.json({
      success: true,
      frames: frames.map(f => f.imageUrl),
      message: `Successfully generated ${frames.length} frames!`
    });
  } catch (error: any) {
    console.error('Error generating sprite animation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate sprite animation' },
      { status: 500 }
    );
  }
}





