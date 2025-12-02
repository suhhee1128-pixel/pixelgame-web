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
        
        {/* Spacer before Features Section */}
        <div className="col-span-5" style={{ height: '200px' }}></div>
      </div>

      {/* Features Section - Card Grid */}
      <div 
        className="relative z-10 w-full"
        style={{
          paddingTop: '80px',
          paddingBottom: '40px',
          background: 'linear-gradient(to bottom, transparent, #000510, #000E27, #001A3D)',
        }}
      >
        <div className="w-full" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
          <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Animation Card */}
            <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-[rgba(255,255,255,0.08)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-8 h-8 flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#14B8A6]">
                    <circle cx="6" cy="18" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
                    <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <path d="M6 12L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M6 18L12 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M6 12L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 12L12 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Animation
                </h3>
              </div>
              <ul className="space-y-2 text-white/80 text-sm" style={{ fontFamily: 'Merriweather Sans, sans-serif' }}>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>One-click animations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>Skeleton-based animation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>Text-to-animation</span>
                </li>
              </ul>
            </div>

            {/* Rotation Card */}
            <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-[rgba(255,255,255,0.08)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-8 h-8 flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#14B8A6]">
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 12L12 8L16 12L12 16L8 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Rotation
                </h3>
              </div>
              <ul className="space-y-2 text-white/80 text-sm" style={{ fontFamily: 'Merriweather Sans, sans-serif' }}>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>4 & 8 directional views</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>Isometric support</span>
                </li>
              </ul>
            </div>

            {/* Style & Editing Card */}
            <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-[rgba(255,255,255,0.08)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-8 h-8 flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#14B8A6]">
                    <path d="M20.71 4.04L21.38 2.38C21.63 2.13 21.63 1.71 21.38 1.46C21.13 1.21 20.71 1.21 20.46 1.46L19.8 2.12L17.88 0.2C17.63 -0.05 17.21 -0.05 16.96 0.2C16.71 0.45 16.71 0.87 16.96 1.12L18.88 3.04L18.22 3.7C17.97 3.95 17.97 4.37 18.22 4.62C18.47 4.87 18.89 4.87 19.14 4.62L19.8 3.96L20.71 4.04Z" fill="currentColor"/>
                    <path d="M17 3L3 17L7 21L21 7L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Style & Editing
                </h3>
              </div>
              <ul className="space-y-2 text-white/80 text-sm" style={{ fontFamily: 'Merriweather Sans, sans-serif' }}>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>True inpainting</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>Style-consistent generation</span>
                </li>
              </ul>
            </div>

            {/* Environments Card */}
            <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-[rgba(255,255,255,0.08)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-8 h-8 flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#14B8A6]">
                    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Environments
                </h3>
              </div>
              <ul className="space-y-2 text-white/80 text-sm" style={{ fontFamily: 'Merriweather Sans, sans-serif' }}>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>Scene generation (up to 400x400)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>Textures</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#14B8A6] mr-2">•</span>
                  <span>Tilesets</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div 
        className="relative z-10 w-full py-20"
        style={{
          background: 'linear-gradient(to bottom, #001A3D, #000E27, #000510)',
        }}
      >
        <div className="w-full" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
          {/* Section Title */}
          <div className="text-center mb-16">
            <h2 
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
            >
              Animation Tools
            </h2>
          </div>

          {/* Animate with Skeletons Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="grid grid-cols-2 gap-12 items-center">
              {/* Images */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <img 
                    src="/api/images/character_1760998529.png" 
                    alt="Character sprite"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/character_example.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <img 
                    src="/api/images/characters/attack_frame1_idle_1760996918.png" 
                    alt="Skeleton animation"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/sprite_animation_example.png';
                    }}
                  />
                </div>
              </div>
              
              {/* Text Content */}
              <div>
                <h3 
                  className="text-2xl font-semibold text-white mb-4"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Animate with Skeletons
                </h3>
                <p 
                  className="text-white/80 mb-6 leading-relaxed"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Take full control over character movements with our skeleton-based sprite animation tool. Perfect for creating complex, natural-looking animations and sprite sheets for your game.
                </p>
                <a
                  href="/generator?tab=sprite-images"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#14B8A6] text-white rounded-lg hover:bg-[#14B8A6]/20 transition-colors"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  View docs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Text-Based Animation Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="grid grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div>
                <h3 
                  className="text-2xl font-semibold text-white mb-4"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Text-Based Animation
                </h3>
                <p 
                  className="text-white/80 mb-6 leading-relaxed"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Generate animations by describing the movement you want. Quickly create walking, running, and attack animations for your character sprites using our pixel art animation software.
                </p>
                <a
                  href="/generator?tab=sprite-images"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#14B8A6] text-white rounded-lg hover:bg-[#14B8A6]/20 transition-colors"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  View docs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Images */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <img 
                    src="/api/images/characters/attack_frame4_lunge_1761165779.png" 
                    alt="Jump animation"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/jump_animation_example.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <img 
                    src="/api/images/characters/dead_frame5_rest_1761164693.png" 
                    alt="Dead animation"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/dead_sprite_example.png';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Character Generation Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="grid grid-cols-2 gap-12 items-center">
              {/* Images */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <img 
                    src="/api/images/character_1759301632%202.png" 
                    alt="Generated character"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/character_example.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <img 
                    src="/api/images/character_1759534583%201.png" 
                    alt="Character variation"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/character_example.png';
                    }}
                  />
                </div>
              </div>
              
              {/* Text Content */}
              <div>
                <h3 
                  className="text-2xl font-semibold text-white mb-4"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Character Generation
                </h3>
                <p 
                  className="text-white/80 mb-6 leading-relaxed"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Create unique 2D game characters with AI. Generate characters based on your descriptions, customize styles, and get pixel-perfect sprites ready for your game development.
                </p>
                <a
                  href="/generator?tab=character"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#14B8A6] text-white rounded-lg hover:bg-[#14B8A6]/20 transition-colors"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  View docs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Pixel Character Section */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div>
                <h3 
                  className="text-2xl font-semibold text-white mb-4"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Pixel Art Characters
                </h3>
                <p 
                  className="text-white/80 mb-6 leading-relaxed"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  Generate retro-style pixel art characters with customizable options. Perfect for indie games, retro aesthetics, and 8-bit style projects. Create chibi-style characters with consistent pixel art quality.
                </p>
                <a
                  href="/generator?tab=pixel-character"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#14B8A6] text-white rounded-lg hover:bg-[#14B8A6]/20 transition-colors"
                  style={{ fontFamily: 'Merriweather Sans, sans-serif' }}
                >
                  View docs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Images */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <img 
                    src="/api/images/character_1759534583%201.png" 
                    alt="Pixel character"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/character_example.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <img 
                    src="/api/images/characters/attack_frame6_aftershock_1760483968%201.png" 
                    alt="Pixel character variation"
                    className="w-full rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = '/images/examples/character_example.png';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
