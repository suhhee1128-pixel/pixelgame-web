'use client';

import { useState } from 'react';

export default function DeadSpriteTab() {
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);
  const [status, setStatus] = useState('Upload character image and click generate to create 7-frame dead animation (Original + 5 frames + Combined sprite sheet)...');
  const [loading, setLoading] = useState(false);

  const generateDeadAnimation = async () => {
    if (!referenceImage) {
      setStatus('❌ Please upload a character reference image first.');
      return;
    }

    setLoading(true);
    setStatus('Generating dead animation frames...');

    try {
      const formData = new FormData();
      formData.append('reference_image', referenceImage);

      const response = await fetch('/api/generate/dead-animation', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedFrames(data.frames || []);
        setStatus(data.message || 'Dead animation generated successfully!');
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error generating dead animation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllFrames = async () => {
    if (generatedFrames.length === 0) {
      setStatus('❌ No frames to download');
      return;
    }

    try {
      setStatus('Creating ZIP file...');
      const response = await fetch('/api/download/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: generatedFrames }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dead_animation_frames_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setStatus('✅ All frames downloaded as ZIP!');
      } else {
        const error = await response.json();
        setStatus(`❌ Error: ${error.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error downloading frames: ${error.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold mb-2">💀 Dead Animation Generator (Gemini)</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Generate a complete 5-frame death sequence: Hit Recoil → Knockback Airborne → Mid Flip → Fall Down → Rest
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">🖼️ Character Reference (Required)</label>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            *Upload your character PNG image to generate dead animation frames*
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
            className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <button
          onClick={generateDeadAnimation}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : '💀 Generate 5 Frames'}
        </button>

        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium mb-1">Status</label>
          <p className="text-sm">{status}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">📋 Dead Animation Frames</h3>
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm">
            <p><strong>Frame 1</strong>: Original character (uploaded)</p>
            <p><strong>Frame 2</strong>: Hit recoil pose (15° backward tilt)</p>
            <p><strong>Frame 3</strong>: Knockback airborne pose (45° rotation)</p>
            <p><strong>Frame 4</strong>: Mid flip pose (75° rotation, slow rotation)</p>
            <p><strong>Frame 5</strong>: Fall transition pose (140° rotation, descending)</p>
            <p><strong>Frame 6</strong>: Rest pose (fully on ground)</p>
            <p><strong>Frame 7</strong>: Combined sprite sheet (all frames horizontally)</p>
            <p className="mt-2 italic">*Character will maintain exact appearance from uploaded image*</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Generated Dead Animation Frames</h3>
            {generatedFrames.length > 0 && (
              <button
                onClick={downloadAllFrames}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                📦 Download All (ZIP)
              </button>
            )}
          </div>
          {generatedFrames.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {generatedFrames.map((frame, index) => {
                const filename = frame.split('/').pop() || `dead_frame_${index + 1}.png`;
                return (
                  <div key={index} className="relative group">
                    <img
                      src={frame}
                      alt={`Frame ${index + 1}`}
                      className="w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => downloadImage(frame, filename)}
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Frame {index + 1} - Click to download
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
              No frames generated yet
            </div>
          )}
          {generatedFrames.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              💡 각 프레임을 클릭하면 개별 다운로드됩니다. 모든 프레임을 ZIP으로 다운로드하려면 "Download All" 버튼을 클릭하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

