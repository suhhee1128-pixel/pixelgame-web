'use client';

import GameTab from '@/components/tabs/GameTab';

export default function GeneratorPage() {
  return (
    <main 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/background-high-quality.png')" }}
    >
      <div className="w-full h-screen flex flex-col px-4 py-2 backdrop-blur-sm bg-black/30">
        <div className="flex-1 min-h-0 w-full">
            <GameTab />
        </div>
      </div>
    </main>
  );
}
