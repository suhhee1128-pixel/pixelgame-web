'use client';

import { useState } from 'react';
import CharacterTab from '@/components/tabs/CharacterTab';
import CharacterSpritesTab from '@/components/tabs/CharacterSpritesTab';
import SpriteImagesTab from '@/components/tabs/SpriteImagesTab';
import DeadSpriteTab from '@/components/tabs/DeadSpriteTab';
import BackgroundTab from '@/components/tabs/BackgroundTab';
import ItemTab from '@/components/tabs/ItemTab';
import PixelCharacterTab from '@/components/tabs/PixelCharacterTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import GameTab from '@/components/tabs/GameTab';
import Link from 'next/link';

type TabType = 'character' | 'sprites' | 'sprite-images' | 'dead-sprite' | 'background' | 'item' | 'pixel-character' | 'settings' | 'game';

export default function GeneratorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pixel-character');

  const tabs = [
    { id: 'pixel-character' as TabType, label: 'STEP 1', icon: '🎮' },
    { id: 'character' as TabType, label: '👤 Character Generation', icon: '👤' },
    { id: 'sprites' as TabType, label: '🏃 Character Sprites', icon: '🏃' },
    { id: 'sprite-images' as TabType, label: '🎮 Sprite Images', icon: '🎮' },
    { id: 'dead-sprite' as TabType, label: '💀 Dead Sprite', icon: '💀' },
    { id: 'background' as TabType, label: '🌄 Background Generation', icon: '🌄' },
    { id: 'item' as TabType, label: '🧰 Item Generation', icon: '🧰' },
    { id: 'game' as TabType, label: '🕹️ Game', icon: '🕹️' },
    { id: 'settings' as TabType, label: '⚙️ Setting', icon: '⚙️' },
  ];

  return (
    <main className="min-h-screen pixel-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <a 
            href="/" 
            className="pixel-text text-2xl font-bold hover:opacity-80 transition-opacity" 
            style={{ 
              color: 'white', 
              textShadow: '2px 2px 0px rgba(0, 0, 0, 0.5)',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block',
              zIndex: 10,
              position: 'relative'
            }}
          >
            ← BACK TO HOME
          </a>
        </div>

        {/* Tab Navigation */}
        <div className="pixel-tab-container mb-6">
          <div className="px-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? 'pixel-tab-active' : 'pixel-tab'}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="pt-6 px-4">
            {activeTab === 'character' && <CharacterTab />}
            {activeTab === 'sprites' && <CharacterSpritesTab />}
            {activeTab === 'sprite-images' && <SpriteImagesTab />}
            {activeTab === 'dead-sprite' && <DeadSpriteTab />}
            {activeTab === 'background' && <BackgroundTab />}
            {activeTab === 'item' && <ItemTab />}
            {activeTab === 'pixel-character' && <PixelCharacterTab />}
            {activeTab === 'game' && <GameTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </div>
    </main>
  );
}





