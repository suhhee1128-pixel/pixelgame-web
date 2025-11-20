'use client';

import { useState, useEffect } from 'react';
import { ART_STYLES, MOOD_OPTIONS, COLOR_PALETTES, CHARACTER_STYLES, LINE_STYLES, COMPOSITION_STYLES, DEFAULT_CHOICES } from '@/lib/types';

export default function CharacterTab() {
  const [description, setDescription] = useState('');
  const [artStyle, setArtStyle] = useState('None');
  const [mood, setMood] = useState('None');
  const [colorPalette, setColorPalette] = useState('None');
  const [characterStyle, setCharacterStyle] = useState('None');
  const [lineStyle, setLineStyle] = useState('None');
  const [composition, setComposition] = useState('None');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [configs, setConfigs] = useState<string[]>(['None']);
  const [selectedConfig, setSelectedConfig] = useState('None');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready to generate character...');
  const [promptPreview, setPromptPreview] = useState('Enter character description and style preferences to see the generated prompt...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    updatePromptPreview();
  }, [description, artStyle, mood, colorPalette, characterStyle, lineStyle, composition, additionalNotes]);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfigs(data.configs || ['None']);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const updatePromptPreview = async () => {
    if (!description.trim()) {
      setPromptPreview('Enter character description and style preferences to see the generated prompt...');
      return;
    }

    try {
      const response = await fetch('/api/prompt/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'character',
          description,
          art_style: artStyle,
          mood,
          color_palette: colorPalette,
          character_style: characterStyle,
          line_style: lineStyle,
          composition,
          additional_notes: additionalNotes,
        }),
      });
      const data = await response.json();
      setPromptPreview(data.prompt || '');
    } catch (error) {
      console.error('Error updating prompt preview:', error);
    }
  };

  const loadConfig = async () => {
    if (selectedConfig === 'None') return;

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'load',
          config_name: selectedConfig,
        }),
      });
      const data = await response.json();
      if (data.art_style) {
        setArtStyle(data.art_style);
        setMood(data.mood);
        setColorPalette(data.color_palette);
        setCharacterStyle(data.character_style);
        setLineStyle(data.line_style);
        setComposition(data.composition);
        setAdditionalNotes(data.additional_notes || '');
        setStatus(data.message || 'Settings loaded');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setStatus('Failed to load settings');
    }
  };

  const generateCharacter = async () => {
    if (!description.trim()) {
      setStatus('Please enter a character description');
      return;
    }

    setLoading(true);
    setStatus('Generating character...');

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('art_style', artStyle);
      formData.append('mood', mood);
      formData.append('color_palette', colorPalette);
      formData.append('character_style', characterStyle);
      formData.append('line_style', lineStyle);
      formData.append('composition', composition);
      formData.append('additional_notes', additionalNotes);
      if (referenceImage) {
        formData.append('reference_image', referenceImage);
      }

      const response = await fetch('/api/generate/character', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedImage(data.image_url);
        setStatus('✅ Character generated successfully!');
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error generating character: ${error.message}`);
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

  const flipImage = () => {
    // Image manipulation would be done on server side
    setStatus('Image manipulation feature coming soon');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Character Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your character: A brave knight in shining armor, a cute cat wizard, etc."
            className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={5}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">🎨 Style Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Art Style</label>
              <select
                value={artStyle}
                onChange={(e) => setArtStyle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[...DEFAULT_CHOICES, ...ART_STYLES].map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mood</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[...DEFAULT_CHOICES, ...MOOD_OPTIONS].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color Palette</label>
              <select
                value={colorPalette}
                onChange={(e) => setColorPalette(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[...DEFAULT_CHOICES, ...COLOR_PALETTES].map((palette) => (
                  <option key={palette} value={palette}>{palette}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Character Style</label>
              <select
                value={characterStyle}
                onChange={(e) => setCharacterStyle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[...DEFAULT_CHOICES, ...CHARACTER_STYLES].map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Line Style</label>
              <select
                value={lineStyle}
                onChange={(e) => setLineStyle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[...DEFAULT_CHOICES, ...LINE_STYLES].map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Composition</label>
              <select
                value={composition}
                onChange={(e) => setComposition(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[...DEFAULT_CHOICES, ...COMPOSITION_STYLES].map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Additional Style Notes</label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any specific style preferences or artistic directions..."
            className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">🖼️ Character Reference (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
            className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">⚙️ Load Settings</h3>
          <div className="flex gap-2">
            <select
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {configs.map((config) => (
                <option key={config} value={config}>{config}</option>
              ))}
            </select>
            <button
              onClick={loadConfig}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              📂 Load
            </button>
          </div>
        </div>

        <button
          onClick={generateCharacter}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : '🎨 Generate Character'}
        </button>

        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium mb-1">Status</label>
          <p className="text-sm">{status}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">📝 Generated Prompt</h3>
          <textarea
            value={promptPreview}
            readOnly
            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            rows={8}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Generated Character</h3>
          {generatedImage ? (
            <div className="space-y-2">
              <img
                src={generatedImage}
                alt="Generated character"
                className="w-full rounded-lg border border-gray-300"
              />
              <button
                onClick={() => {
                  const filename = `character_${Date.now()}.png`;
                  downloadImage(generatedImage, filename);
                }}
                className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                title="Download image"
              >
                💾 Download Image
              </button>
              <div className="flex gap-2">
                <button
                  onClick={flipImage}
                  className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  🔄 Flip
                </button>
                <button
                  onClick={flipImage}
                  className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  ↻ Rotate
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
              No image generated yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





