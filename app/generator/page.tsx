'use client';

import GameTab from '@/components/tabs/GameTab';

export default function GeneratorPage() {
  return (
    <main 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/background-high-quality.png')" }}
    >
      <div className="w-full h-screen flex flex-col px-4 py-2 backdrop-blur-sm bg-black/30">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <a 
            href="/" 
            className="pixel-text text-lg font-bold hover:opacity-80 transition-opacity" 
            style={{ 
              color: 'white', 
              textShadow: '2px 2px 0px #000',
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

        <div className="flex-1 min-h-0 w-full">
            <GameTab />
        </div>
      </div>
    </main>
  );
}
