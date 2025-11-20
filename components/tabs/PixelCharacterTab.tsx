'use client';

import { useState } from 'react';

export default function PixelCharacterTab() {
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('None');
  const [mood, setMood] = useState('None');
  const [weapon, setWeapon] = useState('None');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState('Enter character description and click generate button');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const colorOptions = [
    { name: 'None', value: 'None', color: 'transparent' },
    { name: 'Red', value: 'Red', color: '#FF0000' },
    { name: 'Blue', value: 'Blue', color: '#0000FF' },
    { name: 'Green', value: 'Green', color: '#00FF00' },
    { name: 'Yellow', value: 'Yellow', color: '#FFFF00' },
    { name: 'Pink', value: 'Pink', color: '#FFC0CB' },
    { name: 'Purple', value: 'Purple', color: '#800080' },
    { name: 'Black', value: 'Black', color: '#000000' },
    { name: 'White', value: 'White', color: '#FFFFFF' },
    { name: 'Brown', value: 'Brown', color: '#A52A2A' },
    { name: 'Orange', value: 'Orange', color: '#FFA500' },
    { name: 'Gray', value: 'Gray', color: '#808080' },
    { name: 'Gold', value: 'Gold', color: '#FFD700' },
    { name: 'Silver', value: 'Silver', color: '#C0C0C0' },
  ];
  const moodOptions = ['None', 'Cute', 'Scary', 'Futuristic', 'Fantasy', 'Elegant', 'Powerful'];
  const weaponOptions = ['None', 'Baguette', 'Magic Wand', 'Candy', 'Sword'];

  const generatePixelCharacter = async () => {
    if (!description.trim()) {
      setStatus('❌ Please enter a character description');
      return;
    }

    setLoading(true);
    setStatus('Generating pixel character...');
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('color', color);
      formData.append('mood', mood);
      formData.append('weapon', weapon);

      const response = await fetch('/api/generate/pixel-character', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        clearInterval(progressInterval);
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        console.error('Response status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        const errorMessage = errorData.error || errorData.message || 'Failed to generate pixel character';
        const errorDetails = errorData.details ? `\nDetails: ${errorData.details}` : '';
        setStatus(`❌ Error: ${errorMessage}${errorDetails}`);
        setLoading(false);
        setProgress(0);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setProgress(100);
        setTimeout(() => {
          setGeneratedImage(data.image_url);
          setStatus('✅ Pixel art character generated successfully! 🎮');
          setLoading(false);
          setProgress(0);
        }, 500);
      } else {
        setStatus(`❌ Error: ${data.error}`);
        setLoading(false);
        setProgress(0);
      }
    } catch (error: any) {
      setStatus(`❌ Error generating pixel character: ${error.message}`);
      setLoading(false);
      setProgress(0);
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

  return (
    <div>
      <h2 className="pixel-label text-3xl mb-6" style={{ color: 'white', textShadow: '3px 3px 0px rgba(0, 0, 0, 0.5)' }}>PIXEL CHARACTER</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="pixel-box" style={{ border: '3px solid #4169E1' }}>
            <label className="pixel-label block text-base mb-3">CHARACTER DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g., "cute pink-haired person", "scary blue dragon", "small robot"'
              className="pixel-input w-full"
              rows={3}
            />
          </div>

          <div className="pixel-box">
            <label className="pixel-label block text-base mb-3">HAIR COLOR / PRIMARY COLOR</label>
            <div className="flex flex-wrap" style={{ gap: '5px', rowGap: '0px' }}>
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setColor(option.value)}
                  className={`pixel-color-box ${color === option.value ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: option.color,
                    borderColor: option.color === '#FFFFFF' || option.color === 'transparent' ? 'black' : option.color
                  }}
                  title={option.name}
                />
              ))}
            </div>
          </div>

          <div className="pixel-box">
            <label className="pixel-label block text-base mb-3">MOOD</label>
            <div className="space-y-2">
              {moodOptions.map((option) => (
                <label 
                  key={option} 
                  className="pixel-radio-label"
                  onClick={() => setMood(option)}
                >
                  <input
                    type="radio"
                    name="mood"
                    value={option}
                    checked={mood === option}
                    onChange={(e) => setMood(e.target.value)}
                    className="pixel-radio-hidden"
                  />
                  <img
                    src={mood === option ? "/radio-checked.png" : "/radio-unchecked.png"}
                    alt={mood === option ? "Selected" : "Unselected"}
                    className="pixel-radio-image"
                    style={{
                      width: '25px',
                      height: '25px',
                      imageRendering: 'pixelated',
                      cursor: 'pointer',
                      pointerEvents: 'none'
                    }}
                  />
                  <span className="pixel-text text-base">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pixel-box">
            <label className="pixel-label block text-base mb-3">WEAPON</label>
            <div className="flex flex-wrap" style={{ gap: '5px', rowGap: '0px' }}>
              {weaponOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setWeapon(option)}
                  className={`pixel-color-box ${weapon === option ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: 'white',
                    borderColor: 'black',
                    minWidth: (option === 'Candy' || option === 'Baguette' || option === 'Magic Wand' || option === 'Sword') ? '180px' : '100px',
                    height: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    paddingLeft: (option === 'Candy' || option === 'Baguette' || option === 'Magic Wand' || option === 'Sword') ? '20px' : '0px',
                    paddingRight: (option === 'Candy' || option === 'Baguette' || option === 'Magic Wand' || option === 'Sword') ? '20px' : '0px'
                  }}
                  title={option}
                >
                  {option === 'Candy' && (
                    <img 
                      src="/candy-icon.png" 
                      alt="Candy icon" 
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        imageRendering: 'pixelated',
                        objectFit: 'contain'
                      }} 
                      onError={(e) => {
                        console.error('이미지 로딩 실패:', e);
                      }}
                    />
                  )}
                  {option === 'Baguette' && (
                    <img 
                      src="/baguette-icon.png" 
                      alt="Baguette icon" 
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        imageRendering: 'pixelated',
                        objectFit: 'contain'
                      }} 
                      onError={(e) => {
                        console.error('이미지 로딩 실패:', e);
                      }}
                    />
                  )}
                  {option === 'Magic Wand' && (
                    <img 
                      src="/magic-wand-icon.png" 
                      alt="Magic Wand icon" 
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        imageRendering: 'pixelated',
                        objectFit: 'contain'
                      }} 
                      onError={(e) => {
                        console.error('이미지 로딩 실패:', e);
                      }}
                    />
                  )}
                  {option === 'Sword' && (
                    <img 
                      src="/sword-icon.png" 
                      alt="Sword icon" 
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        imageRendering: 'pixelated',
                        objectFit: 'contain'
                      }} 
                      onError={(e) => {
                        console.error('이미지 로딩 실패:', e);
                      }}
                    />
                  )}
                  <span className="pixel-text text-base" style={{ color: 'black', textAlign: 'center' }}>{option}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generatePixelCharacter}
            disabled={loading}
            className="pixel-button w-full text-lg"
          >
            {loading ? 'GENERATING...' : 'APPLY'}
          </button>

          {loading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="pixel-text text-sm">Generating...</span>
                <span className="pixel-text text-sm">{progress}%</span>
              </div>
              <div className="pixel-progress-bar">
                <div 
                  className="pixel-progress-bar-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

        </div>

        <div className="space-y-6">
          <div className="pixel-box">
            <h3 className="pixel-label text-lg mb-4">GENERATED PIXEL ART CHARACTER</h3>
            {!generatedImage && (
              <div className="relative mb-4" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    src="/speech-bubble.png" 
                    alt="Speech bubble" 
                    style={{ 
                      imageRendering: 'pixelated',
                      imageRendering: '-moz-crisp-edges',
                      imageRendering: 'crisp-edges',
                      maxWidth: '150px',
                      width: 'auto',
                      height: 'auto',
                      display: 'block'
                    }} 
                    onError={(e) => {
                      console.error('말풍선 이미지 로딩 실패:', e);
                    }}
                  />
                  <p 
                    className="pixel-text" 
                    style={{ 
                      position: 'absolute',
                      top: '35%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'black',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      margin: 0,
                      padding: 0
                    }}
                  >
                    Hi
                  </p>
                </div>
              </div>
            )}
            {generatedImage ? (
              <div className="relative">
                <img
                  src={generatedImage}
                  alt="Generated pixel character"
                  className="w-full"
                  style={{ imageRendering: 'pixelated' }}
                />
                <button
                  onClick={() => {
                    const filename = generatedImage.split('/').pop() || `pixel_character_${Date.now()}.png`;
                    downloadImage(generatedImage, filename);
                  }}
                  className="pixel-button absolute top-2 right-2 p-2"
                  title="Download image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                    className="w-5 h-5"
                    style={{ imageRendering: 'pixelated' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-full h-64 flex flex-col items-center justify-center gap-4">
                <div style={{ 
                  imageRendering: 'pixelated',
                  imageRendering: '-moz-crisp-edges',
                  imageRendering: 'crisp-edges',
                  transform: 'scale(3)',
                  transformOrigin: 'center'
                }}>
                  <img 
                    src="/character-silhouette.png" 
                    alt="Character silhouette" 
                    style={{ 
                      filter: 'brightness(0)',
                      imageRendering: 'pixelated',
                      imageRendering: '-moz-crisp-edges',
                      imageRendering: 'crisp-edges',
                      width: '80px',
                      height: '80px',
                      objectFit: 'contain',
                      WebkitFontSmoothing: 'none',
                      MozOsxFontSmoothing: 'unset'
                    }} 
                    onError={(e) => {
                      console.error('실루엣 이미지 로딩 실패:', e);
                    }}
                  />
                </div>
                <p className="pixel-text text-gray-500" style={{ marginTop: '40px' }}>NO CHARACTER GENERATED YET</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

