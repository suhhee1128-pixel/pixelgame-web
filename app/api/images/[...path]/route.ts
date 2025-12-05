import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path.join('/');
    // Use /tmp in Vercel (serverless), otherwise use data/output
    const outputDir = process.env.VERCEL ? '/tmp/output' : (process.env.OUTPUT_DIR || 'data/output');
    
    // Security: prevent directory traversal
    const fullPath = path.join(outputDir, ...params.path);
    const resolvedPath = path.resolve(fullPath);
    const outputDirResolved = path.resolve(outputDir);
    
    if (!resolvedPath.startsWith(outputDirResolved)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    if (!(await fs.pathExists(fullPath))) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const imageBuffer = await fs.readFile(fullPath);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}

