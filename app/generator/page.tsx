'use client';

import GameTab from '@/components/tabs/GameTab';

export default function GeneratorPage() {
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

        <div className="w-full">
          <GameTab />
        </div>
      </div>
    </main>
  );
}
