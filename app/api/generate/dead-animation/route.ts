import { NextRequest, NextResponse } from 'next/server';
import { getGlobalGenerator } from '@/lib/game-asset-generator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const reference_image = formData.get('reference_image') as File | null;

    if (!reference_image) {
      return NextResponse.json(
        { success: false, error: 'Please upload a character reference image first.' },
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

    const frames = await generator.generateDeadAnimation(referencePath);

    return NextResponse.json({
      success: true,
      frames: frames.map(f => f.imageUrl),
      message: `Successfully generated ${frames.length} dead animation frames!`
    });
  } catch (error: any) {
    console.error('Error generating dead animation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate dead animation' },
      { status: 500 }
    );
  }
}





