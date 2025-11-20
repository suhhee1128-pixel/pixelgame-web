import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path.join('/');
    const outputDir = process.env.OUTPUT_DIR || 'data/output';
    
    console.log('Image request:', { imagePath, params: params.path, outputDir });
    
    // Security: prevent directory traversal
    const fullPath = path.join(outputDir, ...params.path);
    const resolvedPath = path.resolve(fullPath);
    const outputDirResolved = path.resolve(outputDir);
    
    console.log('Path resolution:', { fullPath, resolvedPath, outputDirResolved });
    
    if (!resolvedPath.startsWith(outputDirResolved)) {
      console.error('Invalid path - directory traversal attempt');
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    const pathExists = await fs.pathExists(fullPath);
    console.log('Path exists:', pathExists, fullPath);
    
    if (!pathExists) {
      console.error('Image not found at:', fullPath);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const imageBuffer = await fs.readFile(fullPath);
    console.log('Image loaded successfully, size:', imageBuffer.length);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving image:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to serve image', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

