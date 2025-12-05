import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrls } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No images provided for download' },
        { status: 400 }
      );
    }

    const outputDir = process.env.OUTPUT_DIR || 'data/output';
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

      // Add each image to the zip
      imageUrls.forEach((imageUrl: string) => {
        // Extract the relative path from the URL
        const urlPath = imageUrl.replace('/api/images/', '');
        const imagePath = path.join(outputDir, urlPath);
        
        if (fs.pathExistsSync(imagePath)) {
          const filename = path.basename(imagePath);
          archive.file(imagePath, { name: filename });
        }
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

