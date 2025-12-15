import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both old format (imageUrls) and new format (frames with type)
    let frames: { type: string; imageUrls: string[] }[] = [];
    
    if (body.frames && Array.isArray(body.frames)) {
      // New format: multiple animation types
      frames = body.frames;
    } else if (body.imageUrls && Array.isArray(body.imageUrls)) {
      // Old format: single animation type (backward compatibility)
      frames = [{ type: 'attack', imageUrls: body.imageUrls }];
    } else {
      return NextResponse.json(
        { error: 'No images provided for download' },
        { status: 400 }
      );
    }

    if (frames.length === 0 || frames.every(f => !f.imageUrls || f.imageUrls.length === 0)) {
      return NextResponse.json(
        { error: 'No images provided for download' },
        { status: 400 }
      );
    }

    // Use /tmp in Vercel (serverless), otherwise use data/output
    const outputDir = process.env.VERCEL ? '/tmp/output' : (process.env.OUTPUT_DIR || 'data/output');
    const timestamp = Date.now();
    const zipFilename = `sprite_frames_${timestamp}.zip`;

    // Create a readable stream for the zip file
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Wrap archive in a promise
    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('error', (err) => {
        reject(err);
      });

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      // Add each animation type's images to the zip with folder structure
      frames.forEach((frameSet) => {
        const { type, imageUrls } = frameSet;
        
        imageUrls.forEach((imageUrl: string, index: number) => {
          // Extract the relative path from the URL
          const urlPath = imageUrl.replace('/api/images/', '');
          const imagePath = path.join(outputDir, urlPath);
          
          if (fs.pathExistsSync(imagePath)) {
            // Create folder structure: type/filename
            const filename = path.basename(imagePath);
            const zipPath = `${type}/${filename}`;
            archive.file(imagePath, { name: zipPath });
          }
        });
      });

      archive.finalize();
    });

    const zipBuffer = await zipPromise;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error creating zip file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create zip file' },
      { status: 500 }
    );
  }
}

