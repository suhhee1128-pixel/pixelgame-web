'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/background-high-quality.png)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/45"></div>
      </div>

      {/* Main Container with Grid System - 5 columns, Margin 120px, Gutter 20px */}
      <div className="relative z-10 min-h-screen w-full py-6" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
        {/* Grid Container - 5 columns with 20px gutter */}
        <div className="w-full grid gap-[20px]" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>

          {/* Spacer - Reduced gap between nav and content */}
          <div className="col-span-5" style={{ height: '80px' }}></div>

          {/* Main Content - spans columns 2-4 (middle 3 columns) */}
          <div className="col-start-2 col-end-5 flex flex-col items-center h-[85vh] pb-20 relative">
            {/* Title Image - Centered */}
            <div className="absolute top-[30%] -translate-y-1/2 flex flex-col items-center gap-8">
              <img 
                src="/start-game-title-v2.png" 
                alt="Start Game" 
                style={{ 
                  width: '700px',
                  height: 'auto',
                  imageRendering: 'pixelated',
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                }} 
              />
              <img 
                src="/welcome-image.png" 
                alt="Welcome" 
                style={{ 
                  width: '500px',
                  height: 'auto',
                  imageRendering: 'pixelated',
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                }} 
              />
            </div>

            {/* Start Button - Bottom */}
            <div className="mt-auto mb-10">
              <Link 
                href="/generator" 
                className="hover:scale-105 transition-transform duration-200 active:scale-95 block"
              >
                <img 
                  src="/start-button-cropped.png" 
                  alt="START" 
                  style={{ 
                    width: '320px',
                    height: 'auto',
                    imageRendering: 'pixelated',
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                  }} 
                />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
