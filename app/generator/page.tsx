'use client';

import { useState } from 'react';
import DeadSpriteTab from '@/components/tabs/DeadSpriteTab';
import GameTab from '@/components/tabs/GameTab';
import BattleTab from '@/components/tabs/BattleTab';
import Link from 'next/link';

type TabType = 'dead-sprite' | 'game' | 'battle';

export default function GeneratorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dead-sprite');

  const tabs = [
    { id: 'dead-sprite' as TabType, label: '💀 Dead Sprite', icon: '💀' },
    { id: 'game' as TabType, label: '🕹️ Game', icon: '🕹️' },
    { id: 'battle' as TabType, label: '⚔️ Battle', icon: '⚔️' },
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
            {activeTab === 'dead-sprite' && <DeadSpriteTab />}
            {activeTab === 'game' && <GameTab />}
            {activeTab === 'battle' && <BattleTab />}
          </div>
        </div>
      </div>
    </main>
  );
}





