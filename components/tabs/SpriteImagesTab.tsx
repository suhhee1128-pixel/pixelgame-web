'use client';

import { useState, useEffect } from 'react';

export default function SpriteImagesTab() {
  const [actionType, setActionType] = useState<'attack' | 'jump'>('attack');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);
  const [status, setStatus] = useState('Select animation type, upload character image and click generate to create 8-frame animation (Original + 6 frames + Combined sprite sheet)...');
  const [loading, setLoading] = useState(false);
  const [animationInfo, setAnimationInfo] = useState('');

  useEffect(() => {
    updateAnimationInfo();
  }, [actionType]);

  const updateAnimationInfo = () => {
    if (actionType === 'attack') {
      setAnimationInfo(`
        **Attack Animation Frames**:
        **Frame 1**: Original character (uploaded)
        **Frame 2**: Idle ready stance
        **Frame 3**: Charge-up pose
        **Frame 4**: Pre-attack aiming pose
        **Frame 5**: Lunge attack-prep pose
        **Frame 6**: Attack impact pose
        **Frame 7**: Aftershock dissipate pose
        **Frame 8**: Combined sprite sheet (all frames horizontally)
        
        *Character will maintain exact appearance from uploaded image*
      `);
    } else {
      setAnimationInfo(`
        **Jump Animation Frames**:
        **Frame 1**: Original character (uploaded)
        **Frame 2**: Jump preparation pose
        **Frame 3**: Jump launch pose
        **Frame 4**: Mid-air rising pose
        **Frame 5**: Jump apex pose
        **Frame 6**: Descending pose
        **Frame 7**: Landing impact pose
        **Frame 8**: Combined sprite sheet (all frames horizontally)
        
        *Character will maintain exact appearance from uploaded image*
      `);
    }
  };

  const generateAnimation = async () => {
    if (!referenceImage) {
      setStatus('❌ Please upload a character reference image first.');
      return;
    }

    setLoading(true);
    setStatus('Generating animation frames...');

    try {
      const formData = new FormData();
      formData.append('reference_image', referenceImage);
      formData.append('action_type', actionType);

      const response = await fetch('/api/generate/sprite-animation', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedFrames(data.frames || []);
        setStatus(data.message || 'Animation generated successfully!');
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error generating animation: ${error.message}`);
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
        link.download = `sprite_frames_${actionType}_${Date.now()}.zip`;
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
        <h2 className="text-2xl font-bold mb-2">🎮 Universal Sprite Animation Generator (Gemini)</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Generate 6-frame sprite animations: Choose between Attack or Jump sequences
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">⚙️ Animation Type</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as 'attack' | 'jump')}
            className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="attack">Attack</option>
            <option value="jump">Jump</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">🖼️ Character Reference (Required)</label>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            *Upload your character PNG image to generate sprite animation frames*
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
            className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <button
          onClick={generateAnimation}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : '🎮 Generate 6 Frames'}
        </button>

        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium mb-1">Status</label>
          <p className="text-sm">{status}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">📋 Animation Frames</h3>
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg whitespace-pre-line text-sm">
            {animationInfo}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Generated Sprite Animation Frames</h3>
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
                const filename = frame.split('/').pop() || `frame_${index + 1}.png`;
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

