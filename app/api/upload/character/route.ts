import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Use /tmp in Vercel (serverless), otherwise use data/output
    const outputDir = process.env.VERCEL ? '/tmp/output' : (process.env.OUTPUT_DIR || 'data/output');
    const characterDir = path.join(outputDir, 'characters');
    
    // Ensure directory exists
    await fs.ensureDir(characterDir);

    // Save image
    const timestamp = Date.now();
    const filename = `character_${timestamp}.png`;
    const filePath = path.join(characterDir, filename);

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Calculate relative path for URL
    const relativePath = path.relative(outputDir, filePath);
    const imageUrl = `/api/images/${relativePath.replace(/\\/g, '/')}`;

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error: any) {
    console.error('Error uploading character image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
