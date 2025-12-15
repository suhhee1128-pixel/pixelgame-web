'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/real_background.png')" }}
      />

      {/* Main Container: center horizontally, lifted further from bottom */}
      <div
        className="relative z-10 min-h-screen w-full flex flex-col items-center justify-end p-4"
        style={{ paddingBottom: '140px' }}
      >
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
    </main>
  );
}
