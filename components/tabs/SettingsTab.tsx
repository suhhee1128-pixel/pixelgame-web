'use client';

import { useState, useEffect } from 'react';
import { ART_STYLES, MOOD_OPTIONS, COLOR_PALETTES, CHARACTER_STYLES, LINE_STYLES, COMPOSITION_STYLES, DEFAULT_CHOICES } from '@/lib/types';

export default function SettingsTab() {
  const [configs, setConfigs] = useState<string[]>(['None']);
  const [loadConfigName, setLoadConfigName] = useState('None');
  const [deleteConfigName, setDeleteConfigName] = useState('None');
  const [saveConfigName, setSaveConfigName] = useState('');
  const [saveArtStyle, setSaveArtStyle] = useState('None');
  const [saveMood, setSaveMood] = useState('None');
  const [saveColorPalette, setSaveColorPalette] = useState('None');
  const [saveCharacterStyle, setSaveCharacterStyle] = useState('None');
  const [saveLineStyle, setSaveLineStyle] = useState('None');
  const [saveComposition, setSaveComposition] = useState('None');
  const [saveAdditionalNotes, setSaveAdditionalNotes] = useState('');
  const [loadStatus, setLoadStatus] = useState('Select a setting and click the load button.');
  const [deleteStatus, setDeleteStatus] = useState('Select a setting to delete.');
  const [saveStatus, setSaveStatus] = useState('Enter the settings and click the save button.');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfigs(data.configs || ['None']);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const handleLoad = async () => {
    if (loadConfigName === 'None') {
      setLoadStatus('Please select a setting to load.');
      return;
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'load',
          config_name: loadConfigName,
        }),
      });
      const data = await response.json();
      if (data.art_style) {
        setSaveArtStyle(data.art_style);
        setSaveMood(data.mood);
        setSaveColorPalette(data.color_palette);
        setSaveCharacterStyle(data.character_style);
        setSaveLineStyle(data.line_style);
        setSaveComposition(data.composition);
        setSaveAdditionalNotes(data.additional_notes || '');
        setLoadStatus(data.message || 'Settings loaded');
      } else {
        setLoadStatus(data.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setLoadStatus('Failed to load settings');
    }
  };

  const handleSave = async () => {
    if (!saveConfigName.trim()) {
      setSaveStatus('❌ Please enter a setting name.');
      return;
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          config_name: saveConfigName.trim(),
          art_style: saveArtStyle,
          mood: saveMood,
          color_palette: saveColorPalette,
          character_style: saveCharacterStyle,
          line_style: saveLineStyle,
          composition: saveComposition,
          additional_notes: saveAdditionalNotes,
        }),
      });
      const data = await response.json();
      setSaveStatus(data.message || 'Settings saved');
      if (data.success) {
        await loadConfigs();
        setSaveConfigName('');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setSaveStatus('Failed to save settings');
    }
  };

  const handleDelete = async () => {
    if (deleteConfigName === 'None') {
      setDeleteStatus('Please select a setting to delete.');
      return;
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          config_name: deleteConfigName,
        }),
      });
      const data = await response.json();
      setDeleteStatus(data.message || 'Settings deleted');
      if (data.success) {
        await loadConfigs();
        setDeleteConfigName('None');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      setDeleteStatus('Failed to delete settings');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">💾 Saved Settings Load</h3>
          <select
            value={loadConfigName}
            onChange={(e) => setLoadConfigName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3"
          >
            {configs.map((config) => (
              <option key={config} value={config}>{config}</option>
            ))}
          </select>
          <button
            onClick={handleLoad}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mb-3"
          >
            📂 Load Settings
          </button>
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm">{loadStatus}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">🗑️ Delete Settings</h3>
          <select
            value={deleteConfigName}
            onChange={(e) => setDeleteConfigName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3"
          >
            {configs.map((config) => (
              <option key={config} value={config}>{config}</option>
            ))}
          </select>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mb-3"
          >
            🗑️ Delete Settings
          </button>
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm">{deleteStatus}</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-3">💾 Save Current Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You can save the current settings by adjusting the settings below.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Setting Name</label>
            <input
              type="text"
              value={saveConfigName}
              onChange={(e) => setSaveConfigName(e.target.value)}
              placeholder="e.g. My Basic Style, Fantasy Style, Pixel Art, etc."
              className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Art Style</label>
              <select
                value={saveArtStyle}
                onChange={(e) => setSaveArtStyle(e.target.value)}
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
                value={saveMood}
                onChange={(e) => setSaveMood(e.target.value)}
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
                value={saveColorPalette}
                onChange={(e) => setSaveColorPalette(e.target.value)}
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
                value={saveCharacterStyle}
                onChange={(e) => setSaveCharacterStyle(e.target.value)}
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
                value={saveLineStyle}
                onChange={(e) => setSaveLineStyle(e.target.value)}
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
                value={saveComposition}
                onChange={(e) => setSaveComposition(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[...DEFAULT_CHOICES, ...COMPOSITION_STYLES].map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Additional Style Notes</label>
            <textarea
              value={saveAdditionalNotes}
              onChange={(e) => setSaveAdditionalNotes(e.target.value)}
              placeholder="Additional style notes..."
              className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 mb-3"
          >
            💾 Save Settings
          </button>

          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm">{saveStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}






