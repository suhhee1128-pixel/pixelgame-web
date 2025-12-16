import React, { useEffect, useState, useRef } from 'react';
import { Character } from '@/lib/types';
import { ENEMY_SPRITE } from '@/lib/spriteMeta';

// --- Types & Interfaces ---
type GamePhase = 'home' | 'character_select' | 'creation' | 'sprites' | 'playing' | 'gameover' | 'victory';

  interface Entity {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    hp: number;
    maxHp: number;
    atk?: number; // Added attack power
    state: 'idle' | 'move' | 'attack' | 'skill' | 'hit' | 'dead' | 'defend'; // Added defend
    facing: 1 | -1;
    frameTimer: number;
    frameIndex: number;
    animFrame: number; // Added for stickman animation
    type: 'player' | 'enemy';
    color: string;
    image?: HTMLImageElement | HTMLCanvasElement;
    frames?: (HTMLImageElement | HTMLCanvasElement)[];
    attackFrames?: (HTMLImageElement | HTMLCanvasElement)[];
    attack2Frames?: (HTMLImageElement | HTMLCanvasElement)[]; // Added attack2
    jumpFrames?: (HTMLImageElement | HTMLCanvasElement)[];
    deadFrames?: (HTMLImageElement | HTMLCanvasElement)[];
    defenseFrames?: (HTMLImageElement | HTMLCanvasElement)[]; // Added
    attackBox?: { x: number, y: number, w: number, h: number, active: boolean, damage?: number, knockback?: number }; // Added damage/knockback
    hitTimer: number;
    isDashing?: boolean; // Added
    attackCombo?: number; // Added
    attackCooldown?: number; // Deprecated: Use attackCooldownUntil instead
    attackCooldownUntil?: number; // 🔥 시간 기반 쿨타임 (performance.now() timestamp)
    hasHit?: boolean; // Added for single hit check
    defenseTimer?: number; // Added
    lastHitFrame?: number; // Added for per-frame hit tracking
  }

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const GROUND_Y = 400; // Standard 2D floor
const GRAVITY = 0.8;
const PLAYER_SCALE = 1.10; // 🔥 히어로 크기 스케일

const colorOptions = [
    { name: 'None', value: 'None', color: 'transparent' },
    { name: 'Red', value: 'Red', color: '#FF0000' },
    { name: 'Blue', value: 'Blue', color: '#0000FF' },
    { name: 'Green', value: 'Green', color: '#00FF00' },
    { name: 'Yellow', value: 'Yellow', color: '#FFFF00' },
    { name: 'Pink', value: 'Pink', color: '#FFC0CB' },
    { name: 'Purple', value: 'Purple', color: '#800080' },
    { name: 'Black', value: 'Black', color: '#000000' },
    { name: 'White', value: 'White', color: '#FFFFFF' },
    { name: 'Brown', value: 'Brown', color: '#A52A2A' },
];
const moodOptions = ['None', 'Cute', 'Scary', 'Futuristic', 'Fantasy', 'Elegant', 'Powerful'];
const weaponOptions = ['None', 'Baguette', 'Magic Wand', 'Candy', 'Sword'];

export default function GameTab() {
  // --- States ---
  const [phase, setPhase] = useState<GamePhase>('character_select'); // Start at Character Select
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  
  // Creation State
  const [characterName, setCharacterName] = useState(''); // Character name input
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('None');
  const [mood, setMood] = useState('None');
  const [weapon, setWeapon] = useState('None');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState('Enter character description and click APPLY button');
  const [genLoading, setGenLoading] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  // Sprite State
  const [spriteActionType, setSpriteActionType] = useState<'attack' | 'jump' | 'dead' | 'defense' | 'attack2'>('attack');
  const [spriteReferenceImage, setSpriteReferenceImage] = useState<File | null>(null);

  // Temporary storage for all generated sprites before saving
  const [generatedSprites, setGeneratedSprites] = useState<{
      attack?: string[];
      attack2?: string[];
      jump?: string[];
      dead?: string[];
      defense?: string[];
  }>({});

  const [attackSprites, setAttackSprites] = useState<string[]>([]);
  const [attack2Sprites, setAttack2Sprites] = useState<string[]>([]); // Added
  const [jumpSprites, setJumpSprites] = useState<string[]>([]);
  const [deadSprites, setDeadSprites] = useState<string[]>([]);
  const [defenseSprites, setDefenseSprites] = useState<string[]>([]); // Added
  const [spriteStatus, setSpriteStatus] = useState('Select animation type...');
  const [spriteLoading, setSpriteLoading] = useState(false);
  const [animationInfo, setAnimationInfo] = useState('');
  
  // STEP 1: Core animations generation state
  const [coreGenerating, setCoreGenerating] = useState(false);
  const [coreCompleted, setCoreCompleted] = useState(false); // Core 생성 완료 여부
  const [optionalDefense, setOptionalDefense] = useState(false);
  const [optionalDead, setOptionalDead] = useState(false);
  
  // Progress tracking for each animation type
  const [progress, setProgress] = useState<{
    attack: number;
    attack2: number;
    jump: number;
    defense: number;
    dead: number;
  }>({
    attack: 0,
    attack2: 0,
    jump: 0,
    defense: 0,
    dead: 0
  });
  
  // Frame selection state
  const [frameSelectionMode, setFrameSelectionMode] = useState<'download' | 'save' | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());

  // Game State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const playerRef = useRef<Entity>({
    x: 100, y: GROUND_Y, vx: 0, vy: 0, 
    width: 80, // FIX: Reduced to 2/3 size (120 * 2/3 = 80)
    height: 133, // FIX: Reduced to 2/3 size (200 * 2/3 = 133.3)
    hp: 100, maxHp: 100, atk: 1, 
    state: 'idle', facing: 1, frameTimer: 0, frameIndex: 0, animFrame: 0, type: 'player', color: 'blue', hitTimer: 0
  });
  
  // Dash Timing Ref
  const lastKeyTime = useRef<{ [key: string]: number }>({});
  
  // Combat State
  const attackStackRef = useRef(0);
  const [defenseCooldown, setDefenseCooldown] = useState(0); // in seconds
  const lastDefenseTime = useRef(0);
  const DEFENSE_COOLDOWN_TIME = 5000; // 5 seconds
  
  // Victory State
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [rewardMessage, setRewardMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 🔥 Loading State

  const enemyRef = useRef<Entity & { patternIndex: number }>({
    x: 600, y: GROUND_Y, vx: 0, vy: 0, 
    width: 247, // FIX: Reduced to 2/3 size (370 * 2/3 = 246.6)
    height: 133, // FIX: Reduced to 2/3 size (200 * 2/3 = 133.3)
    hp: 30, maxHp: 30, atk: 1, 
    state: 'idle', facing: -1, frameTimer: 0, frameIndex: 0, animFrame: 0, type: 'enemy', color: '#963296', hitTimer: 0,
    patternIndex: 0 // 0, 1 = Attack1, 2 = Attack2
  });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<any[]>([]);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const victoryTimerRef = useRef<number>(0);

  // --- Effects ---
  /* Enemy Sprite Loading moved to startGameWithCharacter */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        // Prevent default scrolling for game keys
        if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        keysPressed.current[e.code] = true; 
        
        // Dash Logic (Double Tap)
        if (phase === 'playing' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
            const now = Date.now();
            const key = e.code;
            const lastTime = lastKeyTime.current[key] || 0;
            
            if (now - lastTime < 250) {
                playerRef.current.isDashing = true;
            }
            lastKeyTime.current[key] = now;
        }
        
        // Trigger Actions immediately on press (Z: Attack, ArrowUp: Jump)
        if (phase === 'playing' && playerRef.current.hp > 0) {
             if (e.code === 'KeyZ') performAttack(playerRef.current, 'attack');
             
             // Attack 2: Requires 5 stacks
             if (e.code === 'KeyX') {
                 if (attackStackRef.current >= 5) { // FIX: Enabled 5 Stack Requirement
                     performAttack(playerRef.current, 'attack2');
                     attackStackRef.current = 0; // Reset stack
                 }
             }

             // Defense: Cooldown Check
             if (e.code === 'KeyC') {
                 const now = Date.now();
                 if (now - lastDefenseTime.current >= DEFENSE_COOLDOWN_TIME) {
                     // Trigger Defense manually here to ensure cooldown is set
                     if (playerRef.current.state !== 'attack' && playerRef.current.state !== 'hit' && playerRef.current.state !== 'defend') {
                        playerRef.current.state = 'defend';
                        playerRef.current.vx = 0;
                        playerRef.current.defenseTimer = 180; // 3 Seconds (60fps * 3)
                        if (playerRef.current.defenseFrames && playerRef.current.frames !== playerRef.current.defenseFrames) {
                            playerRef.current.frames = playerRef.current.defenseFrames;
                            playerRef.current.frameIndex = 0;
                        }
                        // lastDefenseTime.current = now; // MOVED: Cooldown starts after defense ends
                     }
                 }
             }

             if (e.code === 'ArrowUp') {
                 if (Math.abs(playerRef.current.y - GROUND_Y) < 1 && playerRef.current.state !== 'hit' && playerRef.current.state !== 'attack') {
                     playerRef.current.vy = -18; // Jump force
                 }
             }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
        keysPressed.current[e.code] = false; 
        if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !keysPressed.current['ArrowLeft'] && !keysPressed.current['ArrowRight']) {
            playerRef.current.isDashing = false;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Load BG Image
    const img = new Image();
    img.src = '/game-background.png';
    img.onload = () => setBgImage(img);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [phase]); // Add phase to dependency array to ensure handleKeyDown has current state

  useEffect(() => {
    const convert = async () => {
        if (generatedImage && phase === 'sprites' && !spriteReferenceImage) {
            try {
                const res = await fetch(generatedImage);
                const blob = await res.blob();
                setSpriteReferenceImage(new File([blob], "hero.png", { type: "image/png" }));
                setSpriteStatus("✅ Character loaded! Generate sprites now.");
            } catch (e) { console.error(e); }
        }
    };
    convert();
  }, [generatedImage, phase]);

  useEffect(() => {
    if (spriteActionType === 'attack') {
      setAnimationInfo('Frame 1: Original\nFrame 2: Idle\nFrame 3: Charge\nFrame 4: Aim\nFrame 5: Prep\nFrame 6: Impact\nFrame 7: Aftershock\nFrame 8: Sheet');
    } else if (spriteActionType === 'attack2') {
      setAnimationInfo('Frame 1: Idle Guard\nFrame 2: Shield Up\nFrame 3: Pre-block\nFrame 4: Impact Block\nFrame 5: Shockwave\nFrame 6: Recovery\nFrame 7: Sheet (High Damage)');
    } else if (spriteActionType === 'jump') {
      setAnimationInfo('Frame 1: Original\nFrame 2: Prep\nFrame 3: Launch\nFrame 4: Rising\nFrame 5: Apex\nFrame 6: Descend\nFrame 7: Land\nFrame 8: Sheet');
    } else if (spriteActionType === 'defense') {
      setAnimationInfo('Frame 1: Idle Guard\nFrame 2: Shield Up\nFrame 3: Pre-block\nFrame 4: Impact Block\nFrame 5: Shockwave\nFrame 6: Recovery\nFrame 7: Sheet');
    } else {
      setAnimationInfo('Frame 1: Original\nFrame 2: Hit\nFrame 3: Stagger\nFrame 4: Fall Start\nFrame 5: Falling\nFrame 6: Impact\nFrame 7: Ground\nFrame 8: Sheet');
    }
  }, [spriteActionType]);

  // Helper: Remove White Background
  const removeBackground = (img: HTMLImageElement): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      
      // Check if image is loaded and has valid dimensions
      if (!img.complete || img.width === 0 || img.height === 0) {
          console.error('Image not loaded or invalid dimensions:', { complete: img.complete, width: img.width, height: img.height, src: img.src });
          // Return a small default canvas to prevent errors
          canvas.width = 100;
          canvas.height = 100;
          return canvas;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 230 && g > 230 && b > 230) { // White threshold
              data[i + 3] = 0; // Alpha 0
          }
      }
      ctx.putImageData(imageData, 0, 0);
      return canvas;
  };

  const loadEnemySprites = async () => {
      console.log("Attempting to load enemy sprites...");
      
      // Define frame counts for each animation type
      const spriteConfig: { [key: string]: number } = {
          'idle': 1,
          'attack': 3,
          'attack2': 6,
          'jump': 4,
          'defense': 4,
          'dead': 3
      };
      
      const loadedFrames: {[key: string]: (HTMLImageElement | HTMLCanvasElement)[]} = {};
      
      // Load frames based on config
      for (const [type, count] of Object.entries(spriteConfig)) {
          const frames: (HTMLImageElement | HTMLCanvasElement)[] = [];
          for (let i = 1; i <= count; i++) {
              const img = new Image();
              // Use timestamp to bust cache if needed, but try standard first
              img.src = `/images/enemy/${type}/${i}.png`; 
              
              await new Promise((resolve) => {
                  img.onload = () => {
                      // console.log(`Loaded: ${type}/${i}.png`);
                      frames.push(removeBackground(img));
                      resolve(null);
                  };
                  img.onerror = () => {
                      // console.log(`Failed: ${type}/${i}.png`); // Reduce noise
                      resolve(null); 
                  };
              });
          }
          if (frames.length > 0) {
              loadedFrames[type] = frames;
              console.log(`Set ${type} frames: ${frames.length}`);
          }
      }
      
      // Apply to Enemy
      if (loadedFrames['idle'] && loadedFrames['idle'].length > 0) {
          enemyRef.current.frames = loadedFrames['idle'];
          enemyRef.current.image = loadedFrames['idle'][0]; // Set default image explicitly
          console.log("Enemy IDLE frames set! Default image updated.");
      } else {
          console.log("Warning: No IDLE frames found for enemy.");
      }
      if (loadedFrames['attack']) enemyRef.current.attackFrames = loadedFrames['attack'];
      if (loadedFrames['attack2']) enemyRef.current.attack2Frames = loadedFrames['attack2'];
      if (loadedFrames['jump']) enemyRef.current.jumpFrames = loadedFrames['jump'];
      if (loadedFrames['defense']) enemyRef.current.defenseFrames = loadedFrames['defense'];
      if (loadedFrames['dead']) enemyRef.current.deadFrames = loadedFrames['dead'];
  };

  useEffect(() => {
    if (phase === 'playing') {
        if (generatedImage) {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Allow CORS for blob URLs
            img.onload = () => {
                // Verify image is loaded before processing
                if (img.width === 0 || img.height === 0) {
                    console.error('Generated image loaded but has invalid dimensions:', generatedImage);
                    return;
                }
                playerRef.current.image = removeBackground(img);
                
                // Set player size based on image aspect ratio (maintain original proportions)
                const aspectRatio = img.width / img.height;
                const targetHeight = 133; // Keep target height
                const targetWidth = targetHeight * aspectRatio;
                playerRef.current.width = targetWidth;
                playerRef.current.height = targetHeight;
            };
        }
        if (attackSprites.length > 0) {
            const frames: (HTMLImageElement | HTMLCanvasElement)[] = new Array(attackSprites.length);
            let loaded = 0;
            attackSprites.forEach((url, i) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    frames[i] = removeBackground(img);
                    loaded++;
                    if (loaded === attackSprites.length) playerRef.current.attackFrames = frames;
                };
            });
        }
        if (attack2Sprites.length > 0) {
            const frames: (HTMLImageElement | HTMLCanvasElement)[] = new Array(attack2Sprites.length);
            let loaded = 0;
            attack2Sprites.forEach((url, i) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    frames[i] = removeBackground(img);
                    loaded++;
                    if (loaded === attack2Sprites.length) playerRef.current.attack2Frames = frames;
                };
            });
        }
        if (jumpSprites.length > 0) {
            const frames: (HTMLImageElement | HTMLCanvasElement)[] = new Array(jumpSprites.length);
            let loaded = 0;
            jumpSprites.forEach((url, i) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    frames[i] = removeBackground(img);
                    loaded++;
                    if (loaded === jumpSprites.length) playerRef.current.jumpFrames = frames;
                };
            });
        }
        if (deadSprites.length > 0) {
            const frames: (HTMLImageElement | HTMLCanvasElement)[] = new Array(deadSprites.length);
            let loaded = 0;
            deadSprites.forEach((url, i) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    frames[i] = removeBackground(img);
                    loaded++;
                    if (loaded === deadSprites.length) playerRef.current.deadFrames = frames;
                };
            });
        }
        if (defenseSprites.length > 0) {
            const frames: (HTMLImageElement | HTMLCanvasElement)[] = new Array(defenseSprites.length);
            let loaded = 0;
            defenseSprites.forEach((url, i) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    frames[i] = removeBackground(img);
                    loaded++;
                    if (loaded === defenseSprites.length) playerRef.current.defenseFrames = frames;
                };
            });
        }
        startGameLoop();
    }
    return () => cancelAnimationFrame(requestRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase === 'character_select') {
        fetch('/api/characters')
            .then(res => res.json())
            .then(data => setCharacters(data))
            .catch(err => console.error("Failed to load characters:", err));
    }
  }, [phase]);

  // --- Character Selection & Game Start Logic ---
  const startGameWithCharacter = async (char: Character) => {
      setIsLoading(true); // START LOADING
      setSelectedChar(char);
      
      // Initialize Player
      playerRef.current.hp = char.stats.hp;
      playerRef.current.maxHp = char.stats.maxHp; 
      playerRef.current.atk = char.stats.atk;
      
      // Helper to load frames
      const loadFrames = async (prefix: string, count: number): Promise<(HTMLImageElement | HTMLCanvasElement)[]> => {
          const promises = [];
          for(let i=1; i<=count; i++) {
              promises.push(new Promise<HTMLCanvasElement | null>((resolve) => {
                  const img = new Image();
                  img.src = `/images/dummy/${prefix}${i}.png`;
                  img.onload = () => resolve(removeBackground(img));
                  img.onerror = () => resolve(null);
              }));
          }
          const results = await Promise.all(promises);
          return results.filter((f): f is HTMLCanvasElement => f !== null);
      };

      // Special Handling for Dummy Character (Pre-loaded Sprites)
      if (char.id === '00000000-0000-0000-0000-000000000001') {
          console.log("Loading Dummy Character Sprites...");
          
          // Load Main Image (Force 0_main.png)
          const mainImg = new Image();
          mainImg.src = '/images/dummy/0_main.png'; // Changed to 0_main.png
          await new Promise((r) => { mainImg.onload = r; mainImg.onerror = r; });
          playerRef.current.image = removeBackground(mainImg);
          
          // Set player size based on image aspect ratio (maintain original proportions)
          const aspectRatio = mainImg.width / mainImg.height;
          const targetHeight = 133; // Keep target height
          const targetWidth = targetHeight * aspectRatio;
          playerRef.current.width = targetWidth;
          playerRef.current.height = targetHeight;

          // Load Animations Parallel
          const [atk1, atk2, jump, dead, def] = await Promise.all([
              loadFrames('attack1_', 7),
              loadFrames('attack2_', 6), // Should match file count in directory
              loadFrames('jump_', 6),
              loadFrames('dead', 6), 
              loadFrames('defense_', 6)
          ]);
          
          playerRef.current.attackFrames = atk1;
          playerRef.current.attack2Frames = atk2;
          playerRef.current.jumpFrames = jump;
          playerRef.current.deadFrames = dead;
          playerRef.current.defenseFrames = def;
          
          // Reset to IDLE state and frames
          playerRef.current.state = 'idle';
          playerRef.current.frames = [playerRef.current.image as HTMLCanvasElement]; 
          
          await loadEnemySprites(); // Wait for enemy sprites
          setIsLoading(false);
          setPhase('playing');
          return;
      } else if (char.spriteFrames && Object.keys(char.spriteFrames).length > 0) {
          // Case 2: Custom Character WITH Sprites
          console.log("Loading Custom Character Sprites...");
          
          // Load Main Image
          const mainImg = new Image();
          mainImg.crossOrigin = 'anonymous'; // Allow CORS for blob URLs
          
          await new Promise<void>((resolve, reject) => {
              mainImg.onload = () => {
                  if (mainImg.width === 0 || mainImg.height === 0) {
                      console.error('Main image loaded but has invalid dimensions:', mainImg.src);
                      reject(new Error('Main image has invalid dimensions'));
                      return;
                  }
                  resolve();
              };
              mainImg.onerror = (error) => {
                  console.error('Failed to load main image:', error, mainImg.src);
                  reject(new Error('Failed to load main image'));
              };
              mainImg.src = char.imageUrl;
          });
          
          playerRef.current.image = removeBackground(mainImg);
          
          // Set player size based on image aspect ratio (maintain original proportions)
          const aspectRatio = mainImg.width / mainImg.height;
          const targetHeight = 133; // Keep target height
          const targetWidth = targetHeight * aspectRatio;
          playerRef.current.width = targetWidth;
          playerRef.current.height = targetHeight;

          // Helper to load array of URLs
          const loadUrlFrames = async (urls: string[]) => {
              const promises = urls.map(url => new Promise<HTMLCanvasElement | null>((resolve) => {
                  const img = new Image();
                  img.crossOrigin = 'anonymous'; // Allow CORS for blob URLs
                  img.onload = () => {
                      // Verify image is loaded before processing
                      if (img.width === 0 || img.height === 0) {
                          console.error('Frame image loaded but has invalid dimensions:', url);
                          resolve(null);
                          return;
                      }
                      resolve(removeBackground(img));
                  };
                  img.onerror = (error) => {
                      console.error('Failed to load frame image:', url, error);
                      resolve(null);
                  };
                  img.src = url;
              }));
              const results = await Promise.all(promises);
              return results.filter((f): f is HTMLCanvasElement => f !== null);
          };

          // Load available frames
          if (char.spriteFrames.idle) playerRef.current.frames = await loadUrlFrames(char.spriteFrames.idle);
          if (char.spriteFrames.attack) playerRef.current.attackFrames = await loadUrlFrames(char.spriteFrames.attack);
          if (char.spriteFrames.attack2) playerRef.current.attack2Frames = await loadUrlFrames(char.spriteFrames.attack2);
          if (char.spriteFrames.jump) playerRef.current.jumpFrames = await loadUrlFrames(char.spriteFrames.jump);
          if (char.spriteFrames.dead) playerRef.current.deadFrames = await loadUrlFrames(char.spriteFrames.dead);
          if (char.spriteFrames.defense) playerRef.current.defenseFrames = await loadUrlFrames(char.spriteFrames.defense);
          
          // Fallback if no idle frames
          if (!char.spriteFrames.idle) {
              playerRef.current.frames = [playerRef.current.image as HTMLCanvasElement];
          }
          
          playerRef.current.state = 'idle';
          await loadEnemySprites();
          setIsLoading(false);
          setPhase('playing');
          return;
      }
      
      // Standard Logic for User-Generated Characters (Single Frame Fallback)
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Allow CORS for blob URLs
      
      // Wait for image to load before processing
      await new Promise<void>((resolve, reject) => {
          img.onload = () => {
              // Verify image is actually loaded
              if (img.width === 0 || img.height === 0) {
                  console.error('Image loaded but has invalid dimensions:', img.src);
                  reject(new Error('Image has invalid dimensions'));
                  return;
              }
              resolve();
          };
          img.onerror = (error) => {
              console.error("Failed to load character image:", error, img.src);
              reject(new Error('Failed to load image'));
          };
          img.src = char.imageUrl;
      });
      
      // Image is loaded, now process it
      const bgRemoved = removeBackground(img);
      playerRef.current.image = bgRemoved;
      
      // Set player size based on image aspect ratio (maintain original proportions)
      const aspectRatio = img.width / img.height;
      const targetHeight = 133; // Keep target height
      const targetWidth = targetHeight * aspectRatio;
      playerRef.current.width = targetWidth;
      playerRef.current.height = targetHeight;

      const singleFrame = [bgRemoved];
      playerRef.current.state = 'idle'; // Ensure Idle
      playerRef.current.frames = singleFrame;
      playerRef.current.attackFrames = singleFrame;
      playerRef.current.attack2Frames = singleFrame;
      playerRef.current.jumpFrames = singleFrame;
      playerRef.current.deadFrames = singleFrame;
      playerRef.current.defenseFrames = singleFrame;
      
      await loadEnemySprites();
      setIsLoading(false);
      setPhase('playing');
  };

  const rollDiceAndSave = async () => {
      if (!selectedChar) return;
      setIsSaving(true);
      
      // 1. Roll Dice (1-6)
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceResult(roll);
      
      // 2. Calculate Reward
      // 1-3: ATK +1/2/3
      // 4-6: HP +2/4/6
      let atkBonus = 0;
      let hpBonus = 0;
      let msg = "";
      
      if (roll <= 3) {
          atkBonus = roll; // 1, 2, 3
          msg = `ATK +${atkBonus}`;
      } else {
          hpBonus = (roll - 3) * 2; // 4->2, 5->4, 6->6
          msg = `MAX HP +${hpBonus}`;
      }
      setRewardMessage(msg);
      
      // 3. Update Stats Locally (for immediate feedback if needed)
      const newStats = {
          ...selectedChar.stats,
          maxHp: selectedChar.stats.maxHp + hpBonus,
          atk: selectedChar.stats.atk + atkBonus,
          hp: selectedChar.stats.maxHp + hpBonus // Heal to full + bonus
      };
      
      // 4. Save to Backend
      try {
          const res = await fetch(`/api/characters/${selectedChar.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  stats: newStats,
                  winCount: (selectedChar.winCount || 0) + 1 
              })
          });
          
          if (!res.ok) throw new Error("Failed to save");
          
          // Wait a bit to show result, then go to character select
          setTimeout(() => {
              setPhase('character_select');
              setDiceResult(null);
              setRewardMessage('');
              setIsSaving(false);
          }, 3000); // 3 seconds delay
          
      } catch (e) {
          console.error(e);
          setRewardMessage("Error saving progress!");
          setIsSaving(false);
      }
  };

  // --- Creation Logic ---
  const generatePixelCharacter = async () => {
    if (!description.trim()) {
      setGenStatus('❌ Please enter a character description');
      return;
    }
    setGenLoading(true);
    setGenStatus('Generating pixel character...');
    setGenProgress(0);
    const progressInterval = setInterval(() => {
      setGenProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('color', color);
      formData.append('mood', mood);
      formData.append('weapon', weapon);

      const response = await fetch('/api/generate/pixel-character', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed');

      const data = await response.json();
      if (data.success) {
        setGenProgress(100);
        setTimeout(() => {
          setGeneratedImage(data.image_url);
          setGenStatus('✅ Pixel art character generated successfully! 🎮');
          setGenLoading(false);
          setGenProgress(0);
          clearInterval(progressInterval);
        }, 500);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setGenStatus(`❌ Error: ${error.message}`);
      setGenLoading(false);
      setGenProgress(0);
    }
  };

  const handleSaveCharacter = async () => {
      if (!generatedImage) return;
      setIsSaving(true);
      
      try {
          // If generatedImage is a blob URL, upload it to server first
          let imageUrl = generatedImage;
          if (generatedImage.startsWith('blob:')) {
              // Fetch the blob and upload it
              const blob = await fetch(generatedImage).then(r => r.blob());
              const formData = new FormData();
              formData.append('image', blob, 'character.png');
              
              const uploadRes = await fetch('/api/upload/character', {
                  method: 'POST',
                  body: formData
              });
              
              if (!uploadRes.ok) {
                  throw new Error('Failed to upload image');
              }
              
              const uploadData = await uploadRes.json();
              imageUrl = uploadData.imageUrl;
          }
          
          const newCharData = {
              name: characterName.trim() || description.split(' ').slice(0, 2).join(' ') || 'New Hero', // Use character name or fallback
              type: 'Custom',
              imageUrl: imageUrl,
              description: description,
              stats: {
                  hp: 20,
                  maxHp: 20,
                  atk: 1,
                  speed: 10
              }
          };
          
          const res = await fetch('/api/characters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newCharData)
          });
          
          if (res.ok) {
              setGenStatus('✅ Character saved!');
              setTimeout(() => {
                  setPhase('character_select'); // Go back to list
                  setIsSaving(false);
                  // Reset form
                  setCharacterName('');
                  setDescription('');
                  setGeneratedImage(null);
              }, 1000);
          } else {
              throw new Error('Failed to save');
          }
      } catch (e) {
          console.error(e);
          setGenStatus('❌ Save failed');
          setIsSaving(false);
      }
  };

  const handleSaveAll = async () => {
      if (!generatedImage) return;
      
      // Enter selection mode if not already
      if (!frameSelectionMode) {
        // Initialize all frames as selected
        const allFrameIds = new Set<string>();
        attackSprites.forEach((_, i) => allFrameIds.add(`attack-${i}`));
        attack2Sprites.forEach((_, i) => allFrameIds.add(`attack2-${i}`));
        jumpSprites.forEach((_, i) => allFrameIds.add(`jump-${i}`));
        defenseSprites.forEach((_, i) => allFrameIds.add(`defense-${i}`));
        deadSprites.forEach((_, i) => allFrameIds.add(`dead-${i}`));
        setSelectedFrames(allFrameIds);
        setFrameSelectionMode('save');
        return;
      }
      
      // If already in selection mode, proceed with save
      if (selectedFrames.size === 0) {
        setSpriteStatus('❌ Please select at least one frame');
        return;
      }
      
      setIsSaving(true);

      try {
          // Filter generatedSprites to only include selected frames
          const filteredSprites: typeof generatedSprites = {};
          
          const selectedAttack = attackSprites.filter((_, i) => selectedFrames.has(`attack-${i}`));
          if (selectedAttack.length > 0) filteredSprites.attack = selectedAttack;
          
          const selectedAttack2 = attack2Sprites.filter((_, i) => selectedFrames.has(`attack2-${i}`));
          if (selectedAttack2.length > 0) filteredSprites.attack2 = selectedAttack2;
          
          const selectedJump = jumpSprites.filter((_, i) => selectedFrames.has(`jump-${i}`));
          if (selectedJump.length > 0) filteredSprites.jump = selectedJump;
          
          const selectedDefense = defenseSprites.filter((_, i) => selectedFrames.has(`defense-${i}`));
          if (selectedDefense.length > 0) filteredSprites.defense = selectedDefense;
          
          const selectedDead = deadSprites.filter((_, i) => selectedFrames.has(`dead-${i}`));
          if (selectedDead.length > 0) filteredSprites.dead = selectedDead;
          
          // Upload main image if it's a blob URL
          let imageUrl = generatedImage;
          if (generatedImage.startsWith('blob:')) {
              const blob = await fetch(generatedImage).then(r => r.blob());
              const formData = new FormData();
              formData.append('image', blob, 'character.png');
              
              const uploadRes = await fetch('/api/upload/character', {
                  method: 'POST',
                  body: formData
              });
              
              if (!uploadRes.ok) {
                  throw new Error('Failed to upload main image');
              }
              
              const uploadData = await uploadRes.json();
              imageUrl = uploadData.imageUrl;
          }
          
          // Upload sprite frames if they are blob URLs
          const uploadSpriteFrames = async (urls: string[]): Promise<string[]> => {
              const uploadPromises = urls.map(async (url) => {
                  if (url.startsWith('blob:')) {
                      const blob = await fetch(url).then(r => r.blob());
                      const formData = new FormData();
                      formData.append('image', blob, 'sprite.png');
                      
                      const uploadRes = await fetch('/api/upload/character', {
                          method: 'POST',
                          body: formData
                      });
                      
                      if (uploadRes.ok) {
                          const uploadData = await uploadRes.json();
                          return uploadData.imageUrl;
                      } else {
                          console.error('Failed to upload sprite frame:', url);
                          return url; // Fallback to original URL
                      }
                  }
                  return url; // Already a server URL
              });
              
              return Promise.all(uploadPromises);
          };
          
          // Upload all sprite frames
          const uploadedSprites: typeof filteredSprites = {};
          if (filteredSprites.attack) uploadedSprites.attack = await uploadSpriteFrames(filteredSprites.attack);
          if (filteredSprites.attack2) uploadedSprites.attack2 = await uploadSpriteFrames(filteredSprites.attack2);
          if (filteredSprites.jump) uploadedSprites.jump = await uploadSpriteFrames(filteredSprites.jump);
          if (filteredSprites.defense) uploadedSprites.defense = await uploadSpriteFrames(filteredSprites.defense);
          if (filteredSprites.dead) uploadedSprites.dead = await uploadSpriteFrames(filteredSprites.dead);
          
          const newCharData = {
              name: characterName.trim() || description.split(' ').slice(0, 2).join(' ') || 'New Hero', // Use character name or fallback
              type: 'Custom',
              imageUrl: imageUrl,
              description: description,
              stats: {
                  hp: 20,
                  maxHp: 20,
                  atk: 1,
                  speed: 10
              },
              spriteFrames: uploadedSprites // Save only selected frames with server URLs
          };
          
          const res = await fetch('/api/characters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newCharData)
          });
          
          if (res.ok) {
              const savedChar = await res.json();
              setSpriteStatus('✅ Character & Sprites saved! Starting game...');
              
              // Load the saved character and start game
              const char = savedChar;
              
              // Load main image
              const mainImg = new Image();
              mainImg.src = char.imageUrl;
              await new Promise((r) => { mainImg.onload = r; mainImg.onerror = r; });
              playerRef.current.image = removeBackground(mainImg);
              
              // Set player size based on image aspect ratio (maintain original proportions)
              const aspectRatio = mainImg.width / mainImg.height;
              const targetHeight = 133; // Keep target height
              const targetWidth = targetHeight * aspectRatio;
              playerRef.current.width = targetWidth;
              playerRef.current.height = targetHeight;
              
              // Helper to load array of URLs
              const loadUrlFrames = async (urls: string[]) => {
                  const promises = urls.map(url => new Promise<HTMLCanvasElement | null>((resolve) => {
                      const img = new Image();
                      img.src = url;
                      img.onload = () => resolve(removeBackground(img));
                      img.onerror = () => resolve(null);
                  }));
                  const results = await Promise.all(promises);
                  return results.filter((f): f is HTMLCanvasElement => f !== null);
              };
              
              // Load available frames
              if (char.spriteFrames?.idle) playerRef.current.frames = await loadUrlFrames(char.spriteFrames.idle);
              if (char.spriteFrames?.attack) playerRef.current.attackFrames = await loadUrlFrames(char.spriteFrames.attack);
              if (char.spriteFrames?.attack2) playerRef.current.attack2Frames = await loadUrlFrames(char.spriteFrames.attack2);
              if (char.spriteFrames?.jump) playerRef.current.jumpFrames = await loadUrlFrames(char.spriteFrames.jump);
              if (char.spriteFrames?.dead) playerRef.current.deadFrames = await loadUrlFrames(char.spriteFrames.dead);
              if (char.spriteFrames?.defense) playerRef.current.defenseFrames = await loadUrlFrames(char.spriteFrames.defense);
              
              // Fallback if no idle frames
              if (!char.spriteFrames?.idle) {
                  playerRef.current.frames = [playerRef.current.image as HTMLCanvasElement];
              }
              
              // Set player stats
              playerRef.current.hp = char.stats?.hp || 20;
              playerRef.current.maxHp = char.stats?.maxHp || 20;
              playerRef.current.atk = char.stats?.atk || 1;
              
              playerRef.current.state = 'idle';
              setIsSaving(false);
              
              // Reset states
              setCharacterName('');
              setDescription('');
              setGeneratedImage(null);
              setGeneratedSprites({});
              setAttackSprites([]); setAttack2Sprites([]); setJumpSprites([]); setDeadSprites([]); setDefenseSprites([]);
              setFrameSelectionMode(null);
              setSelectedFrames(new Set());
              
              // Load enemy sprites before starting game
              setIsLoading(true);
              await loadEnemySprites();
              setIsLoading(false);
              
              // Start game
              setPhase('playing');
          } else {
              throw new Error('Failed to save');
          }
      } catch (e) {
          console.error(e);
          setSpriteStatus('❌ Save failed');
          setIsSaving(false);
      }
  };

  const handleCharacterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          // Upload to server to get permanent URL
          try {
              const formData = new FormData();
              formData.append('image', file);
              
              const res = await fetch('/api/upload/character', {
                  method: 'POST',
                  body: formData
              });
              
              if (res.ok) {
                  const data = await res.json();
                  setGeneratedImage(data.imageUrl);
                  setGenStatus('✅ Character uploaded successfully!');
              } else {
                  const error = await res.json();
                  setGenStatus(`❌ Upload failed: ${error.error}`);
              }
          } catch (error: any) {
              console.error('Upload error:', error);
              setGenStatus(`❌ Upload failed: ${error.message}`);
          }
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

  // --- Sprite Gen Logic ---
  const generateSprites = async () => {
    if (!spriteReferenceImage) return;
    setSpriteLoading(true);
    setSpriteStatus('Generating animation frames...');
    const formData = new FormData();
    formData.append('reference_image', spriteReferenceImage);
    formData.append('action_type', spriteActionType);
    try {
        const res = await fetch('/api/generate/sprite-animation', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            if (spriteActionType === 'attack') { setAttackSprites(data.frames); setGeneratedSprites(prev => ({ ...prev, attack: data.frames })); }
            else if (spriteActionType === 'attack2') { setAttack2Sprites(data.frames); setGeneratedSprites(prev => ({ ...prev, attack2: data.frames })); }
            else if (spriteActionType === 'jump') { setJumpSprites(data.frames); setGeneratedSprites(prev => ({ ...prev, jump: data.frames })); }
            else if (spriteActionType === 'defense') { setDefenseSprites(data.frames); setGeneratedSprites(prev => ({ ...prev, defense: data.frames })); }
            else { setDeadSprites(data.frames); setGeneratedSprites(prev => ({ ...prev, dead: data.frames })); }
            setSpriteStatus(`✅ ${spriteActionType} animation generated successfully!`);
        } else {
            setSpriteStatus(`❌ Error: ${data.error}`);
        }
    } catch(e: any) { setSpriteStatus(`❌ Error: ${e.message}`); }
    setSpriteLoading(false);
  };

  // STEP 1: Generate Core Animations (Attack + Attack2 + Jump) in parallel
  const generateCoreAnimations = async () => {
    if (!spriteReferenceImage) return;
    setCoreGenerating(true);
    setCoreCompleted(false); // Reset completion status
    setSpriteStatus('Starting core animations generation...');
    
    // Reset progress
    setProgress({ attack: 0, attack2: 0, jump: 0, defense: 0, dead: 0 });
    
    const coreTypes: ('attack' | 'attack2' | 'jump')[] = ['attack', 'attack2', 'jump'];
    
    try {
        // Generate all core animations in parallel with progress tracking
        const promises = coreTypes.map(async (actionType) => {
            const formData = new FormData();
            formData.append('reference_image', spriteReferenceImage);
            formData.append('action_type', actionType);
            
            // Simulate progress (since we don't have real-time progress from API)
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const current = prev[actionType];
                    if (current < 90) {
                        return { ...prev, [actionType]: current + Math.random() * 10 };
                    }
                    return prev;
                });
            }, 1500);
            
            setSpriteStatus(`Generating ${actionType}...`);
            const res = await fetch('/api/generate/sprite-animation', { method: 'POST', body: formData });
            const data = await res.json();
            
            clearInterval(progressInterval);
            
            if (data.success) {
                // Set to 100% on completion
                setProgress(prev => ({ ...prev, [actionType]: 100 }));
                
                if (actionType === 'attack') { 
                    setAttackSprites(data.frames); 
                    setGeneratedSprites(prev => ({ ...prev, attack: data.frames })); 
                }
                else if (actionType === 'attack2') { 
                    setAttack2Sprites(data.frames); 
                    setGeneratedSprites(prev => ({ ...prev, attack2: data.frames })); 
                }
                else if (actionType === 'jump') { 
                    setJumpSprites(data.frames); 
                    setGeneratedSprites(prev => ({ ...prev, jump: data.frames })); 
                }
                return { success: true, type: actionType };
            } else {
                setProgress(prev => ({ ...prev, [actionType]: 0 }));
                return { success: false, type: actionType, error: data.error };
            }
        });
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        setSpriteStatus(`✅ Core animations complete! (${successCount}/3)`);
        setCoreCompleted(true); // Mark as completed
        
        // If optional animations are selected, generate them automatically after Core completion
        if (optionalDefense || optionalDead) {
            // Small delay to show Core completion message
            setTimeout(() => {
                generateOptionalAnimations();
            }, 500);
        }
    } catch(e: any) { 
        setSpriteStatus(`❌ Error: ${e.message}`); 
        setProgress({ attack: 0, attack2: 0, jump: 0, defense: 0, dead: 0 });
    }
    setCoreGenerating(false);
  };

  // STEP 1: Generate Optional Animations (Defense + Dead) based on checkboxes
  const generateOptionalAnimations = async () => {
    if (!spriteReferenceImage) return;
    if (!optionalDefense && !optionalDead) return;
    
    setSpriteLoading(true);
    setSpriteStatus('Generating optional animations...');
    
    const optionalTypes: ('defense' | 'dead')[] = [];
    if (optionalDefense) optionalTypes.push('defense');
    if (optionalDead) optionalTypes.push('dead');
    
    try {
        const promises = optionalTypes.map(async (actionType) => {
            const formData = new FormData();
            formData.append('reference_image', spriteReferenceImage);
            formData.append('action_type', actionType);
            
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const current = prev[actionType];
                    if (current < 90) {
                        return { ...prev, [actionType]: current + Math.random() * 10 };
                    }
                    return prev;
                });
            }, 500);
            
            setSpriteStatus(`Generating ${actionType}...`);
            const res = await fetch('/api/generate/sprite-animation', { method: 'POST', body: formData });
            const data = await res.json();
            
            clearInterval(progressInterval);
            
            if (data.success) {
                // Set to 100% on completion
                setProgress(prev => ({ ...prev, [actionType]: 100 }));
                
                if (actionType === 'defense') { 
                    setDefenseSprites(data.frames); 
                    setGeneratedSprites(prev => ({ ...prev, defense: data.frames })); 
                }
                else if (actionType === 'dead') { 
                    setDeadSprites(data.frames); 
                    setGeneratedSprites(prev => ({ ...prev, dead: data.frames })); 
                }
                return { success: true, type: actionType };
            } else {
                setProgress(prev => ({ ...prev, [actionType]: 0 }));
                return { success: false, type: actionType, error: data.error };
            }
        });
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        setSpriteStatus(`✅ Optional animations complete! (${successCount}/${optionalTypes.length})`);
    } catch(e: any) { 
        setSpriteStatus(`❌ Error: ${e.message}`); 
    }
    setSpriteLoading(false);
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'attack' | 'jump' | 'dead' | 'defense' | 'attack2') => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        
        // Upload all files to server
        try {
            setSpriteStatus(`Uploading ${files.length} ${type} frames...`);
            const uploadPromises = files.map(async (file) => {
                const formData = new FormData();
                formData.append('image', file);
                
                const res = await fetch('/api/upload/character', {
                    method: 'POST',
                    body: formData
                });
                
                if (res.ok) {
                    const data = await res.json();
                    return data.imageUrl;
                } else {
                    throw new Error(`Failed to upload ${file.name}`);
                }
            });
            
            const urls = await Promise.all(uploadPromises);
            
            if (type === 'attack') setAttackSprites(urls);
            else if (type === 'attack2') setAttack2Sprites(urls);
            else if (type === 'jump') setJumpSprites(urls);
            else if (type === 'defense') setDefenseSprites(urls);
            else setDeadSprites(urls);
            
            setSpriteStatus(`✅ Custom ${type} sprites loaded (${files.length} frames)`);
        } catch (error: any) {
            console.error('Upload error:', error);
            setSpriteStatus(`❌ Upload failed: ${error.message}`);
        }
    }
  };

  const downloadAllFrames = async () => {
    // Enter selection mode if not already
    if (!frameSelectionMode) {
      // Initialize all frames as selected
      const allFrameIds = new Set<string>();
      attackSprites.forEach((_, i) => allFrameIds.add(`attack-${i}`));
      attack2Sprites.forEach((_, i) => allFrameIds.add(`attack2-${i}`));
      jumpSprites.forEach((_, i) => allFrameIds.add(`jump-${i}`));
      defenseSprites.forEach((_, i) => allFrameIds.add(`defense-${i}`));
      deadSprites.forEach((_, i) => allFrameIds.add(`dead-${i}`));
      setSelectedFrames(allFrameIds);
      setFrameSelectionMode('download');
      return;
    }
    
    // If already in selection mode, proceed with download
    if (selectedFrames.size === 0) {
      setSpriteStatus('❌ Please select at least one frame');
      return;
    }
    
    // Collect selected frames by type
    const allFrames: { type: string; urls: string[] }[] = [];
    
    const selectedAttack = attackSprites.filter((_, i) => selectedFrames.has(`attack-${i}`));
    if (selectedAttack.length > 0) {
      allFrames.push({ type: 'attack', urls: selectedAttack });
    }
    
    const selectedAttack2 = attack2Sprites.filter((_, i) => selectedFrames.has(`attack2-${i}`));
    if (selectedAttack2.length > 0) {
      allFrames.push({ type: 'attack2', urls: selectedAttack2 });
    }
    
    const selectedJump = jumpSprites.filter((_, i) => selectedFrames.has(`jump-${i}`));
    if (selectedJump.length > 0) {
      allFrames.push({ type: 'jump', urls: selectedJump });
    }
    
    const selectedDefense = defenseSprites.filter((_, i) => selectedFrames.has(`defense-${i}`));
    if (selectedDefense.length > 0) {
      allFrames.push({ type: 'defense', urls: selectedDefense });
    }
    
    const selectedDead = deadSprites.filter((_, i) => selectedFrames.has(`dead-${i}`));
    if (selectedDead.length > 0) {
      allFrames.push({ type: 'dead', urls: selectedDead });
    }
    
    if (allFrames.length === 0) {
      setSpriteStatus('❌ Please select at least one frame');
      return;
    }
    
    try {
      setSpriteStatus('Creating ZIP file...');
      
      // Flatten all selected image URLs into a single array
      // API expects { imageUrls: string[] } format
      const imageUrls = allFrames.flatMap(({ urls }) => urls);
      
      const response = await fetch('/api/download/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sprite_frames_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setSpriteStatus('✅ Downloaded ZIP!');
        setFrameSelectionMode(null);
        setSelectedFrames(new Set());
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        setSpriteStatus(`❌ Download failed: ${errorData.error || `HTTP ${response.status}`}`);
      }
    } catch (error: any) { 
      setSpriteStatus(`❌ Error: ${error.message}`); 
    }
  };

  // --- Game Engine ---
  const startGameLoop = () => {
    // FIX: Reset HP to Character Stats or Default 20
    playerRef.current.hp = selectedChar ? selectedChar.stats.maxHp : 20; 
    playerRef.current.maxHp = selectedChar ? selectedChar.stats.maxHp : 20;
    playerRef.current.x = 100;
    
    enemyRef.current.hp = 30; // 적 체력 30으로 고정
    enemyRef.current.maxHp = 30;
    enemyRef.current.x = 600;
    // 🔥 enemy.y를 GROUND_Y로 강제 (pivot = 발 = groundY)
    enemyRef.current.y = GROUND_Y;
    enemyRef.current.vy = 0;
    // Reset enemy state correctly for new game
    enemyRef.current.state = 'idle';
    enemyRef.current.frameIndex = 0;
    enemyRef.current.deadFrames = enemyRef.current.deadFrames || []; // Ensure not undefined
    
    particlesRef.current = [];
    victoryTimerRef.current = 0;
    const loop = () => {
        update();
        draw();
        if (phase === 'playing') requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
  };

  const update = () => {
    if (playerRef.current.hp <= 0) setPhase('gameover');
    
    // Victory Check with Delay
    if (enemyRef.current.hp <= 0) {
        // If already dead, wait
        if (enemyRef.current.state === 'dead') {
            // Check if animation finished (held at last frame)
            const isAnimFinished = enemyRef.current.frames && 
                                   enemyRef.current.frameIndex >= enemyRef.current.frames.length - 1;
            
            if (isAnimFinished) {
                victoryTimerRef.current++;
                if (victoryTimerRef.current > 180) { // 3 seconds at 60fps
                    setPhase('victory');
                }
            }
        }
    }
    
    updateEntity(playerRef.current, keysPressed.current);
    updateAI(enemyRef.current, playerRef.current);
    updateParticles();
  };

  const checkBodyCollision = (mover: Entity, target: Entity, nextX: number) => {
      // Body Hitbox (Make it slightly narrower than full width for better feel)
      // FIX: Normalized Logic - No Offsets. Center is Center.
      
      const mW = mover.type === 'enemy' ? mover.width * 0.3 : mover.width * 0.4; 
      const tW = target.type === 'enemy' ? target.width * 0.3 : target.width * 0.4;
      
      // FIX: Dynamic Offset based on Facing Direction
      // Logic adjusted for smaller Enemy size (2/3 scale)
      // Original offset was 80. New offset should be roughly 2/3 of 80 => ~53. Let's try 55.
      let mX = nextX;
      if (mover.type === 'enemy') {
          mX += (mover.facing === -1 ? 55 : -55); 
      }
      
      let tX = target.x;
      if (target.type === 'enemy') {
          tX += (target.facing === -1 ? 55 : -55);
      }

      const mLeft = mX - mW/2;
      const mRight = mX + mW/2;
      const tLeft = tX - tW/2;
      const tRight = tX + tW/2;
      
      const xOverlap = mLeft < tRight && mRight > tLeft;
      
      // Y Overlap
      const mBot = mover.y;
      const mTop = mover.y - mover.height * 0.8; 
      const tBot = target.y;
      const tTop = target.y - target.height * 0.8;
      
      const yOverlap = mTop < tBot && mBot > tTop;
      
      return xOverlap && yOverlap;
  };

  const updateEntity = (e: Entity, keys: { [key: string]: boolean }) => {
    if (e.state === 'dead') {
        // Play Dead Animation once
        if (e.deadFrames && e.frames !== e.deadFrames) {
            e.frames = e.deadFrames;
            e.frameIndex = 0;
            e.frameTimer = 0;
        } else if (!e.deadFrames) {
            // For Stickman or if no dead frames
            // Just stay in dead state
        }
        
        if (e.frames === e.deadFrames && e.frames) {
             e.frameTimer++;
             if (e.frameTimer > 10) { // Slow animation for death
                 e.frameTimer = 0;
                 if (e.frameIndex < e.frames.length - 1) {
                     e.frameIndex++;
                 }
             }
        }
        return;
    }
    
    e.animFrame += 0.2;

    // Hit Stun
    if (e.state === 'hit') {
        if (e.hitTimer > 0) {
            e.hitTimer--;
            if (e.hitTimer === 0) {
                 e.state = 'idle';
                 e.frameIndex = 0; // Reset Animation
            }
        }
        // Apply Gravity during hit
        e.y += e.vy;
        if (e.y >= GROUND_Y) { e.y = GROUND_Y; e.vy = 0; }
        else e.vy += GRAVITY;
        
        e.x += e.vx; // Knockback
        
        // Friction to stop knockback
        e.vx *= 0.9;
        
        return;
    }

    // Defense Logic (Fixed Duration)
    if (e.state === 'defend') {
            e.vx = 0;
        if (e.type === 'player' && e.defenseTimer !== undefined) {
             e.defenseTimer--;
             if (e.defenseTimer <= 0) {
        e.state = 'idle';
                 e.frames = undefined;
                 lastDefenseTime.current = Date.now(); // Cooldown starts NOW
             }
        }
    }

    // Attack Logic (State Machine handled in performAttack/Animation loop)
    if (e.state === 'attack') {
        // Lock movement during attack
        e.vx = 0;
        
        // Robust frame check
        if (e.attackCombo === 2) {
             if (e.attack2Frames && e.attack2Frames.length > 0 && e.frames !== e.attack2Frames) {
                 e.frames = e.attack2Frames;
                 // Don't reset index if we are already playing it
             }
        } else {
             if (e.attackFrames && e.attackFrames.length > 0 && e.frames !== e.attackFrames) {
                 e.frames = e.attackFrames;
             }
        }

        // Check if frames are valid
        if (e.frames) {
             // ... standard update logic continues below in Animation & Hitbox section
        }
        
        // STEP 3: Update attack box position (PIVOT-based)
        // e.x, e.y = pivot (character foot center)
        if (e.attackBox) {
            // Attack box offset from pivot (adjustable)
            const attackOffsetX = e.type === 'enemy' ? 140 : 80;  // Distance forward from pivot
            const attackOffsetY = e.type === 'enemy' ? 100 : 80;  // Height above pivot (몸통 높이)
            
            // Calculate attack box position based on facing
            if (e.facing === 1) {
                // Facing right: box extends to the right from pivot
                e.attackBox.x = e.x + attackOffsetX;
            } else {
                // Facing left: box extends to the left from pivot
                e.attackBox.x = e.x - attackOffsetX - e.attackBox.w;
            }
            
            e.attackBox.y = e.y - attackOffsetY; // Pivot 기준 위쪽
        }
    } else if (e.state !== 'defend') { // Ensure movement doesn't override defend
        // Movement
        if (e.type === 'player') {
            let moveSpeed = e.isDashing ? 10 : 5;
            let moving = false;

            if (keys['ArrowLeft']) { e.vx = -moveSpeed; e.facing = -1; moving = true; }
            else if (keys['ArrowRight']) { e.vx = moveSpeed; e.facing = 1; moving = true; }
            else e.vx = 0;

            // Check Ground State
            const onGround = Math.abs(e.y - GROUND_Y) < 1;

            if (moving && onGround) {
                e.state = 'move';
                e.frames = undefined; // Use static image or walk frames if added
            }
            else if (!onGround) {
                // e.state = 'idle'; // Don't force idle in air to allow jump animation
                if (e.jumpFrames && e.frames !== e.jumpFrames) {
                    e.frames = e.jumpFrames;
                    e.frameIndex = 0;
                } else if (!e.jumpFrames) {
                    e.frames = undefined;
                }
            }
            else {
                e.state = 'idle';
                e.frames = undefined;
            }

            // Jump handled in handleKeyDown
            
            // Attack Trigger
            if (keys['KeyZ']) performAttack(e, 'attack');
        }
    }

    // Physics 2D
    const nextX = e.x + e.vx;
    
    // Body Collision Check (Prevent passing through)
    let canMove = true;
    if (e.type === 'player' && enemyRef.current.hp > 0) {
        if (checkBodyCollision(e, enemyRef.current, nextX)) {
            canMove = false;
        }
    }
    
    if (canMove) {
        e.x = nextX; 
    }
    
    // Boundary checks
    if (e.x < 0) e.x = 0; if (e.x > CANVAS_WIDTH) e.x = CANVAS_WIDTH;
    
    // Gravity
    e.y += e.vy;
    if (e.y > GROUND_Y) {
        e.y = GROUND_Y;
        e.vy = 0;
    } else if (e.y < GROUND_Y) {
        e.vy += GRAVITY;
    }
    
    // Animation & Hitbox
    e.frameTimer++;
    const animSpeed = e.state === 'move' ? (e.isDashing ? 4 : 8) : 8; 
    if (e.frameTimer > animSpeed) {
        e.frameTimer = 0;
        // Safety check: ensure frames exists AND has length
        if (e.frames && e.frames.length > 0) {
            if (e.state === 'attack') {
                // Attack Animation Cycle - 안정화된 프레임 로직
                if (e.frameIndex < e.frames.length - 1) {
                    // 마지막 프레임 전까지만 증가
                    e.frameIndex++;
                    // Active Hitbox on specific frames (Impact)
                    // 공격 판정 프레임: 1, 2 (0-based index)
                    if ((e.frameIndex === 1 || e.frameIndex === 2) && e.attackBox) {
                        e.attackBox.active = true;
                    } else if (e.attackBox) {
                        e.attackBox.active = false;
                    }
                } else {
                    // 마지막 프레임에서 종료 처리
                    e.frameIndex = 0;
                    e.state = 'idle';
                    e.frames = undefined;
                    e.attackCombo = 0;
                    // ⚠️ hasHit은 performAttack에서만 리셋 (여기서 리셋하면 안 됨)
                    if (e.attackBox) e.attackBox.active = false;
                    
                    // 🔥 공격 쿨타임 설정 (300ms) - 시간 기반
                    if (e.type === 'enemy') {
                        e.attackCooldownUntil = performance.now() + 300; // 300ms 후까지 쿨타임
                    }
                }
            } else if (e.state === 'defend') {
                // Hold Defense Frame (Hold at 5th frame = index 4, or last)
                if (e.frameIndex < 4 && e.frameIndex < e.frames.length - 1) {
                    e.frameIndex++;
                } else {
                    e.frameIndex = Math.min(4, e.frames.length - 1);
                }
            } else if (!Math.abs(e.y - GROUND_Y) && e.frames === e.jumpFrames) {
                // Jump Animation
                e.frameIndex++;
                if (e.frameIndex >= e.frames.length) e.frameIndex = e.frames.length - 1; 
            } else {
                // Loop
                e.frameIndex = (e.frameIndex + 1) % e.frames.length;
            }
        }
    }

    if (e.attackBox && e.attackBox.active && !e.hasHit) { // FIX: Check hasHit to prevent multi-hit
        const target = e.type === 'player' ? enemyRef.current : playerRef.current;
        if (checkCollision(e.attackBox, target)) {
            takeDamage(target, e.attackBox.damage || 10, e.facing, e.attackBox.knockback || 5);
            e.hasHit = true; // FIX: Mark as hit so it doesn't hit again in this animation
            // e.attackBox.active = false; // REMOVED: Don't disable box, just ignore damage with hasHit
            spawnParticle(target.x, target.y - 50, 'hit');
            
            // Player Stack Logic
            if (e.type === 'player' && e.attackCombo !== 2) { // Only Stack on Attack 1
                attackStackRef.current = Math.min(attackStackRef.current + 1, 5);
            }
        }
    }
  };

  const updateAI = (enemy: Entity & { patternIndex: number }, player: Entity) => {
      if (enemy.state === 'hit') {
          // Hit Stun recovery for Enemy
          if (enemy.hitTimer > 0) {
              enemy.hitTimer--;
              if (enemy.hitTimer === 0) {
                   enemy.state = 'idle';
                   enemy.frameIndex = 0;
              }
          }
          
          // Apply knockback physics to enemy
          enemy.y += enemy.vy;
          // 🔥 착지 시 GROUND_Y로 강제 (pivot = 발 = groundY)
          if (enemy.y >= GROUND_Y) { 
              enemy.y = GROUND_Y; 
              enemy.vy = 0; 
          } else {
              enemy.vy += GRAVITY;
          }
          
          enemy.x += enemy.vx; 
          enemy.vx *= 0.9; // Friction

          return;
      }

      if (enemy.state === 'dead') {
          // Ensure dead frames are used
          if (enemy.deadFrames && enemy.frames !== enemy.deadFrames) {
              enemy.frames = enemy.deadFrames;
              enemy.frameIndex = 0;
              enemy.frameTimer = 0;
          }

          enemy.frameTimer++;
          if (enemy.frameTimer > 25) { // Slow down death animation (was default speed)
              enemy.frameTimer = 0;
              if (enemy.frames && enemy.frames.length > 0) {
                  if (enemy.frameIndex < enemy.frames.length - 1) {
                      enemy.frameIndex++;
                  }
              }
          }
          return;
      }
      
      enemy.animFrame += 0.2;

      // ❌ 쿨타임 감소 로직 제거 (시간 기반으로 변경)

      const dx = player.x - enemy.x;
      const dist = Math.abs(dx);
      
      // 🔒 공격 반경 상수
      const ATTACK_RANGE = 160;
      
      // 🔒 공격 시작 조건 (idle 상태 + 쿨타임 + 거리) - 시간 기반
      const now = performance.now();
      const canAttack =
          enemy.state === 'idle' &&
          (enemy.attackCooldownUntil === undefined || now >= enemy.attackCooldownUntil) &&
          dist <= ATTACK_RANGE;

      if (dist <= ATTACK_RANGE) {
          // 공격 반경 안에 있음
          enemy.vx = 0;
          
          // 공격 중이 아닐 때만 idle로 설정 (공격 중에는 상태 유지)
          if (enemy.state !== 'attack') {
              enemy.state = 'idle';
          }
          
          // Face player
          enemy.facing = dx > 0 ? 1 : -1;

          // 🔒 공격 시작 (조건 만족 시에만)
          if (canAttack) {
              performAttack(enemy, 'attack');
              enemy.patternIndex++;
          }
      } else {
          // 공격 반경 밖 - 플레이어 추적
          if (enemy.state !== 'attack') {
              enemy.vx = dx > 0 ? 2 : -2;
              enemy.state = 'move';
              enemy.facing = dx > 0 ? 1 : -1;
          }
      }
      
      // Physics 2D
      const nextX = enemy.x + enemy.vx;
      
      // Body Collision Check for Enemy
      let canMove = true;
      if (player.hp > 0) {
          if (checkBodyCollision(enemy, player, nextX)) {
              canMove = false;
              // 🔒 충돌 시 공격 (idle 상태 + 쿨타임 + 거리 체크)
              if (canAttack) {
                  enemy.vx = 0;
                  performAttack(enemy, 'attack');
                  enemy.patternIndex++;
              }
          }
      }

      if (canMove) {
          enemy.x = nextX;
      }
      
      if (enemy.x < 0) enemy.x = 0; if (enemy.x > CANVAS_WIDTH) enemy.x = CANVAS_WIDTH;

      enemy.y += enemy.vy;
      // 🔥 착지 시 GROUND_Y로 강제 (pivot = 발 = groundY)
      // player와 동일한 로직: 착지하면 무조건 GROUND_Y
      if (enemy.y >= GROUND_Y) {
          enemy.y = GROUND_Y;
          enemy.vy = 0;
      } else {
          enemy.vy += GRAVITY;
      }

      // Unified Animation Update (Handles both Stickman and Sprite)
      enemy.frameTimer++;
      // Slower animation speed for Enemy (was 6/8, now 10/12)
      const animSpeed = enemy.state === 'move' ? 10 : 12;
      
      if (enemy.frameTimer > animSpeed) {
          enemy.frameTimer = 0;

          // Case 1: Sprite Animation (If frames exist)
          if (enemy.frames && enemy.frames.length > 0) {
             // Loop or One-shot based on state
             if (enemy.state === 'attack') {
                 enemy.frameIndex++;
                 if (enemy.frameIndex >= enemy.frames.length) {
                     enemy.frameIndex = 0; enemy.state = 'idle';
                     if (enemy.attackBox) enemy.attackBox.active = false;
                     
                    // 🔥 Add Cooldown (시간 기반)
                    const cooldownMs = 1000 + Math.floor(Math.random() * 1000); // 1~2 seconds cooldown
                    enemy.attackCooldownUntil = performance.now() + cooldownMs;
                     
                     enemy.vx = 0; // Stop moving briefly

                     // Reset to IDLE frames after attack
                     if (enemy.frames !== enemy.attackFrames && enemyRef.current.frames) {
                         enemy.frames = enemyRef.current.frames; // Restore idle frames
                         if(enemy.frames[0]) enemy.image = enemy.frames[0];
                     }
                 } else {
                     // STEP 3: Active Hitbox logic for Sprite
                     // Enemy attack is 3 frames (indices 0, 1, 2)
                     // Active ONLY on frames 1 and 2 (indices 1, 2) - impact frames
                     
                     if (enemy.attackBox) {
                         // Activate only on frame 1 and 2 (2nd and 3rd frame)
                         enemy.attackBox.active = (enemy.frameIndex === 1 || enemy.frameIndex === 2);
                         
                         // ⚠️ hasHit은 performAttack에서만 리셋 (프레임마다 리셋하면 안 됨)
                         // 한 공격당 데미지는 1회만 들어가야 함
                     }
                 }
             } else {
                 // Idle/Move Loop
                 enemy.frameIndex = (enemy.frameIndex + 1) % enemy.frames.length;
             }
          } 
          // Case 2: Stickman Animation Fallback (No frames)
          else {
              if (enemy.state === 'attack') {
                  enemy.frameIndex++;
                  // Stickman Attack Duration (approx 20 frames)
                  if (enemy.frameIndex > 20) {
                      enemy.state = 'idle';
                      enemy.frameIndex = 0;
                      if (enemy.attackBox) enemy.attackBox.active = false;
                      // 🔥 Cooldown for stickman (시간 기반)
                      enemy.attackCooldownUntil = performance.now() + 1000; // 1 second cooldown
                  } else {
                      // Active hitbox mid-animation
                      if (enemy.frameIndex >= 5 && enemy.frameIndex <= 15 && enemy.attackBox) {
                          enemy.attackBox.active = true;
                      } else if (enemy.attackBox) {
                          enemy.attackBox.active = false;
                      }
                  }
              }
          }
      }

      // Ensure frames are set correctly based on state (For Sprites)
      // This fixes the issue where enemy walks with attack sprites
      if (enemy.frames) {
          if (enemy.state === 'idle' && enemyRef.current.frames) { 
              // Use default/idle frames
              if (enemy.frames !== enemyRef.current.frames) enemy.frames = enemyRef.current.frames;
          }
          else if (enemy.state === 'move') { 
              // Use walk frames if available, otherwise idle frames
              // Currently we don't have specific walk frames, so use idle frames or jump frames if appropriate
              // For now, sticking to idle frames for movement to avoid sliding attack sprite
              if (enemyRef.current.frames && enemy.frames !== enemyRef.current.frames) {
                  enemy.frames = enemyRef.current.frames;
              }
          }
          else if (enemy.state === 'attack') {
               if (enemy.attackCombo === 2 && enemy.attack2Frames) enemy.frames = enemy.attack2Frames;
               else if (enemy.attackFrames) enemy.frames = enemy.attackFrames;
          }
      }

      // STEP 3: Update Attack Box Position (PIVOT-based, sync every frame)
      // e.x, e.y = pivot (character foot center)
      if (enemy.attackBox) {
          // Attack box offset from pivot (adjustable)
          const attackOffsetX = 70;  // Distance forward from pivot (몸통에서 앞으로)
          const attackOffsetY = 100;  // Height above pivot (몸통 높이)
          
          // Calculate attack box position based on facing
          if (enemy.facing === 1) {
              // Facing right: box extends to the right from pivot
              enemy.attackBox.x = enemy.x + attackOffsetX;
          } else {
              // Facing left: box extends to the left from pivot
              enemy.attackBox.x = enemy.x - attackOffsetX - enemy.attackBox.w;
          }
          
          enemy.attackBox.y = enemy.y - attackOffsetY; // Pivot 기준 위쪽
          
      // Debug: Log attack box position every frame when active
      if (enemy.attackBox.active && enemy.state === 'attack') {
          /* console.log('Enemy attack box position:', {
              frameIndex: enemy.frameIndex,
              facing: enemy.facing,
              pivotX: enemy.x,
              pivotY: enemy.y,
              attackBox: { x: enemy.attackBox.x, y: enemy.attackBox.y, w: enemy.attackBox.w, h: enemy.attackBox.h },
              playerX: player.x,
              playerY: player.y
          }); */
      }
      }

      // Enemy Hitbox Collision Check vs Player
      if (enemy.attackBox && enemy.attackBox.active) {
          const hit = checkCollision(enemy.attackBox, player);
        console.log(
            '[ENEMY HIT CHECK]',
            'attackActive:', enemy.attackBox.active,
            'playerHitTimer:', player.hitTimer,
            'enemyHasHit:', enemy.hasHit
        );
          
          // Debug: Always log collision check when attack is active
          if (enemy.state === 'attack') {
              console.log('Collision check result:', {
                  hit,
                  attackBox: { x: enemy.attackBox.x, y: enemy.attackBox.y, w: enemy.attackBox.w, h: enemy.attackBox.h },
                  player: { x: player.x, y: player.y, width: player.width, height: player.height },
                  playerHitTimer: player.hitTimer,
                  playerState: player.state
              });
          }
          
          if (hit) {
              // 🔥 한 공격당 데미지 1회만 보장
              if (!enemy.hasHit) {
                  console.log('Enemy attack hit player!', {
                      enemyAttackBox: { x: enemy.attackBox.x, y: enemy.attackBox.y, w: enemy.attackBox.w, h: enemy.attackBox.h },
                      playerPos: { x: player.x, y: player.y },
                      playerHitTimer: player.hitTimer,
                      playerState: player.state,
                      frameIndex: enemy.frameIndex
                  });
                  takeDamage(player, enemy.attackBox.damage || 3, enemy.facing, enemy.attackBox.knockback || 10);
                  enemy.hasHit = true; // 🔥 한 공격당 1회만 데미지
                  spawnParticle(player.x, player.y - 50, 'hit');
              }
          }
      }
  };

  const performAttack = (e: Entity, type: string) => {
      // 🔒 경직/사망/공격 중에는 새 공격 불가 (경직 중 입력 무시 효과)
      if (e.state === 'attack' || e.state === 'hit' || e.state === 'dead') return;
      e.state = 'attack'; e.vx = 0;
      e.frameIndex = 0; // Start from frame 0
      e.hasHit = false; // FIX: Reset hit flag for new attack
      e.lastHitFrame = -1; // FIX: Reset frame tracking for new attack
      
      // Attack 2 Logic
      if (type === 'attack2') {
          e.attackCombo = 2; // Mark as attack 2
          // Use attack2 frames if available, otherwise fallback or empty
          if (e.attack2Frames && e.attack2Frames.length > 0) {
              e.frames = e.attack2Frames;
          } else {
              console.log("Attack 2 triggered but no frames found, using default or empty");
              e.frames = e.attackFrames; // Fallback
          }
      } else {
          e.attackCombo = 1;
          e.frames = e.attackFrames;
      }
      
      // Hitbox parameters
      const baseAtk = e.atk || 1;
      let damage = 0;
      let knockback = 0;

      if (e.type === 'player') {
          if (type === 'attack2') {
              damage = 10; // FIX: Fixed Damage 10 (Skill)
              knockback = 15;
          } else {
              damage = 2;  // FIX: Fixed Damage 2 (Normal)
              knockback = 10;
          }
      } else {
          // Enemy Damage Logic (Fixed for now as per design)
          // Attack 1 = 3 dmg, Attack 2 = 10 dmg
          // But here we just pass type. Let's simplify.
          damage = type === 'attack2' ? 10 : 3;
          knockback = 10;
      }

      // FIX: Larger attack box for better hit detection (Enemy attack animation is wide)
      const attackBoxWidth = e.type === 'enemy' ? 120 : 80;  // 적: 165 → 82 (반으로 줄임)
      const attackBoxHeight = e.type === 'enemy' ? 100 : 80;
      
      e.attackBox = { 
          x: 0, // Set in update loop
          y: 0, 
          w: attackBoxWidth, 
          h: attackBoxHeight, 
          active: false,
          damage: damage, 
          knockback: knockback
      };
  };

  const checkCollision = (box: {x:number, y:number, w:number, h:number}, target: Entity) => {
      // FIX: Ignore collision if target is already dead or invincible
      if (target.state === 'dead') return false;
      if (target.hitTimer > 0) return false; // FIX: Ignore hits during invincibility frames

      // 2D Box Collision (AABB - Axis-Aligned Bounding Box)
      // Calculate target bounds cleanly based on center x/y and dimensions
      
      const tW = target.type === 'enemy' ? target.width * 0.3 : target.width * 0.4;
      let tX = target.x;
      
      // FIX: Dynamic Offset here too (Reduced to 55)
      if (target.type === 'enemy') {
          tX += (target.facing === -1 ? 55 : -55);
      }
      
      const tLeft = tX - tW/2;
      const tRight = tX + tW/2;
      const tBot = target.y;
      const tTop = target.y - target.height * 0.8;

      // AABB Collision Detection
      // Box overlaps if: box left < target right AND box right > target left
      //                  AND box top < target bottom AND box bottom > target top
      const boxLeft = box.x;
      const boxRight = box.x + box.w;
      const boxTop = box.y;
      const boxBottom = box.y + box.h;
      
      const xOverlap = boxLeft < tRight && boxRight > tLeft;
      const yOverlap = boxTop < tBot && boxBottom > tTop;
      
      const isColliding = xOverlap && yOverlap;
      
      // Debug log for collision detection (always log for enemy attacks on player)
      if (target.type === 'player' && box.w > 100) {
          console.log('Collision check (ENEMY ATTACK vs PLAYER):', {
              attackBox: { 
                  left: boxLeft, right: boxRight, top: boxTop, bottom: boxBottom,
                  x: box.x, y: box.y, w: box.w, h: box.h
              },
              playerBody: { 
                  left: tLeft, right: tRight, top: tTop, bottom: tBot,
                  centerX: tX, centerY: target.y, width: tW * 2, height: target.height * 0.8
              },
              xOverlap,
              yOverlap,
              isColliding,
              playerHitTimer: target.hitTimer,
              playerState: target.state
          });
      }
      
      return isColliding;
  };

  const takeDamage = (e: Entity, amount: number, hitDir: number, knockback: number) => {
      if (e.state === 'dead') return;
      
      // FIX: Check invincibility frames (hitTimer)
      if (e.hitTimer > 0) {
          console.log(`${e.type} is invincible, ignoring damage`);
          return;
      }
      
      console.log(`${e.type} taking damage: ${amount}. Current HP: ${e.hp}`); // Debug Log

      if (e.state === 'defend') {
          amount *= 0.1; // Chip damage
          knockback *= 0.5;
          spawnParticle(e.x, e.y - 50, 'block'); // Block effect
      } else {
          e.state = 'hit'; 
          e.hitTimer = 8; // FIX: Reduced Hit Stun/Invincibility from 15 to 8 frames (~0.13s)
          // Blood effect
          spawnParticle(e.x, e.y - 50, 'blood');
          // Pop up
          e.vy = -5;
      }
      
      e.hp -= amount; 
      
      // Ensure HP doesn't go below 0
      if (e.hp <= 0) {
          e.hp = 0;
          e.state = 'dead';
          console.log(`${e.type} is DEAD.`);
      }
  };

  const spawnParticle = (x: number, y: number, type: string) => { particlesRef.current.push({ x, y, life: 20, type }); };
  const updateParticles = () => { particlesRef.current.forEach((p, i) => { p.life--; p.y -= 1; if (p.life <= 0) particlesRef.current.splice(i, 1); }); };

  const drawStickman = (ctx: CanvasRenderingContext2D, e: Entity) => {
    const t = e.animFrame;

    // Default Joint Positions (Matching BattleTab logic)
    let head = { x: 0, y: -90 };
    let neck = { x: 0, y: -75 };
    let pelvis = { x: 0, y: -40 };
    let kneeL = { x: -10, y: -20 };
    let footL = { x: -15, y: 0 };
    let kneeR = { x: 10, y: -20 };
    let footR = { x: 15, y: 0 };
    let elbowL = { x: -15, y: -60 };
    let handL = { x: -20, y: -45 };
    let elbowR = { x: 15, y: -60 };
    let handR = { x: 20, y: -45 };

    // Apply Animation Logic based on State
    if (e.state === 'idle') {
      head.y += Math.sin(t) * 2;
      handL.y += Math.sin(t) * 3;
      handR.y += Math.sin(t) * 3;
    } else if (e.state === 'move') { // Walk/Run
      // Using Walk logic for move
      kneeL.x = Math.sin(t) * 15; footL.x = Math.sin(t) * 20;
      kneeR.x = Math.sin(t + Math.PI) * 15; footR.x = Math.sin(t + Math.PI) * 20;
      elbowL.x = Math.sin(t + Math.PI) * 15; handL.x = Math.sin(t + Math.PI) * 20;
      elbowR.x = Math.sin(t) * 15; handR.x = Math.sin(t) * 20;
    } else if (e.state === 'attack') {
      // Punch logic (ATTACK1)
      handR.x = 40; handR.y = -75; // Extend Right
      elbowR.x = 20; elbowR.y = -75;
      pelvis.x = 10;
    } else if (e.state === 'hit' || e.state === 'dead') {
      head.x = -10; head.y = -80;
      neck.x = -5; pelvis.x = -10;
      handL.y = -90; handR.y = -90;
      kneeL.x = 10; kneeR.x = -10;
    }

    ctx.strokeStyle = e.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Helper to draw line
    const line = (v1: {x:number, y:number}, v2: {x:number, y:number}) => {
      ctx.beginPath();
      ctx.moveTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.stroke();
    };

    // Draw Limbs
    line(neck, pelvis); // Body
    line(pelvis, kneeL); line(kneeL, footL); // Left Leg
    line(pelvis, kneeR); line(kneeR, footR); // Right Leg
    line(neck, elbowL); line(elbowL, handL); // Left Arm
    line(neck, elbowR); line(elbowR, handR); // Right Arm

    // Draw Head
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 12.5, 0, Math.PI * 2); // Radius 12.5 = diameter 25
    ctx.fill();
  };

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      // --- Draw Background Image ---
      if (bgImage) {
          ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      const entities = [playerRef.current, enemyRef.current].sort((a, b) => a.y - b.y);
      entities.forEach(e => {
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(e.x, GROUND_Y + 5, 40, 10, 0, 0, Math.PI*2); ctx.fill();

          const spriteY = e.y;
          const bobOffset = (e.state === 'move' && Math.floor(Date.now() / 150) % 2 === 0) ? -5 : 0;

          ctx.save();
          
          if (e.type === 'enemy') {
             // STEP 2-3: Pivot-based rendering (MINIMAL CHANGE - rendering only)
             // e.x, e.y = pivot (character foot center in world coordinates)
             
             if (e.image) {
                 let img = e.image;
                 // Use frames if available
                 if (e.frames && e.frames.length > 0) {
                     const idx = e.frameIndex % e.frames.length;
                     if(e.frames[idx]) img = e.frames[idx];
                 }
                 
                 // STEP 3: Calculate draw position from pivot
                 // Convert world pivot (e.x, e.y) to sprite frame coordinates (scaled)
                 const renderW = ENEMY_SPRITE.W * ENEMY_SPRITE.RENDER_SCALE;
                 const renderH = ENEMY_SPRITE.H * ENEMY_SPRITE.RENDER_SCALE;
                 const pivotXScaled = ENEMY_SPRITE.PIVOT_X * ENEMY_SPRITE.RENDER_SCALE;
                 const pivotYScaled = ENEMY_SPRITE.PIVOT_Y * ENEMY_SPRITE.RENDER_SCALE;
                 
                 const drawX = e.x - pivotXScaled;
                 const drawY = e.y - pivotYScaled;
                 
                 if (e.facing === -1) {
                     // Facing Left (Default) -> Draw normally
                     ctx.drawImage(img, drawX, drawY, renderW, renderH);
                 } else {
                     // Facing Right -> Flip horizontally
                     ctx.save();
                     ctx.translate(e.x, 0);
                     ctx.scale(-1, 1);
                     // Draw with pivot offset (scaled)
                     ctx.drawImage(img, -pivotXScaled, drawY, renderW, renderH);
                     ctx.restore();
                 }
                 
                 /*
                 // STEP 3.5: Pivot visualization INSIDE sprite frame (for calibration)
                 // This shows where PIVOT_X/Y is in the actual sprite frame
                 const pivotBoxSize = 10;
                 ctx.strokeStyle = '#FFFF00'; // Yellow box for visibility
                 ctx.lineWidth = 2;
                 ctx.strokeRect(
                     drawX + pivotXScaled - pivotBoxSize/2,
                     drawY + pivotYScaled - pivotBoxSize/2,
                     pivotBoxSize,
                     pivotBoxSize
                 );
                 // Crosshair
                 ctx.beginPath();
                 ctx.moveTo(drawX + pivotXScaled - pivotBoxSize, drawY + pivotYScaled);
                 ctx.lineTo(drawX + pivotXScaled + pivotBoxSize, drawY + pivotYScaled);
                 ctx.moveTo(drawX + pivotXScaled, drawY + pivotYScaled - pivotBoxSize);
                 ctx.lineTo(drawX + pivotXScaled, drawY + pivotYScaled + pivotBoxSize);
                 ctx.stroke();
                 */
             } else {
                 // Fallback Box (for debugging)
                 ctx.fillStyle = e.color;
                 const drawX = e.x - ENEMY_SPRITE.PIVOT_X * ENEMY_SPRITE.RENDER_SCALE;
                 const drawY = e.y - ENEMY_SPRITE.PIVOT_Y * ENEMY_SPRITE.RENDER_SCALE;
                 const renderW = ENEMY_SPRITE.W * ENEMY_SPRITE.RENDER_SCALE;
                 const renderH = ENEMY_SPRITE.H * ENEMY_SPRITE.RENDER_SCALE;
                 ctx.fillRect(drawX, drawY, renderW, renderH);
             }
             
             // World pivot point는 아래에서 플레이어와 함께 그려짐
             // drawStickman(ctx, e); // DISABLED
          } else {
             // Player (Original Logic)
             if (e.facing === -1) { ctx.scale(-1, 1); ctx.translate(-e.x * 2, 0); }
             if (e.image) {
                let img = e.image;
                if (e.frames && e.frames.length > e.frameIndex && e.frames[e.frameIndex]) img = e.frames[e.frameIndex];
                // 🔥 스케일 적용: pivot 위치는 유지하고 렌더 크기만 키움
                const scaledWidth = e.width * PLAYER_SCALE;
                const scaledHeight = e.height * PLAYER_SCALE;
                const drawX = e.x - scaledWidth/2;
                const drawY = spriteY - scaledHeight + bobOffset;
                ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);
                
                /*
                // 🔥 Pivot visualization INSIDE sprite frame (적과 동일)
                // 플레이어의 pivot은 (e.x, spriteY) = 스프라이트 내부에서 (scaledWidth/2, scaledHeight - bobOffset)
                const pivotBoxSize = 10;
                ctx.strokeStyle = '#FFFF00'; // Yellow box for visibility
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    drawX + scaledWidth/2 - pivotBoxSize/2,
                    drawY + scaledHeight - bobOffset - pivotBoxSize/2,
                    pivotBoxSize,
                    pivotBoxSize
                );
                // Crosshair
                ctx.beginPath();
                ctx.moveTo(drawX + scaledWidth/2 - pivotBoxSize, drawY + scaledHeight - bobOffset);
                ctx.lineTo(drawX + scaledWidth/2 + pivotBoxSize, drawY + scaledHeight - bobOffset);
                ctx.moveTo(drawX + scaledWidth/2, drawY + scaledHeight - bobOffset - pivotBoxSize);
                ctx.lineTo(drawX + scaledWidth/2, drawY + scaledHeight - bobOffset + pivotBoxSize);
                ctx.stroke();
                */
             } else {
                // Fallback box도 스케일 적용
                const scaledWidth = e.width * PLAYER_SCALE;
                const scaledHeight = e.height * PLAYER_SCALE;
                ctx.fillStyle = e.color; ctx.fillRect(e.x - scaledWidth/2, spriteY - scaledHeight + bobOffset, scaledWidth, scaledHeight);
             }
          }

          ctx.restore();
          
          /*
          // 🔥 World pivot point (플레이어와 적 모두) - 발 위치 표시
          // ctx.restore() 이후에 그려야 변환 영향 없음
          ctx.fillStyle = e.type === 'player' ? '#00FF00' : '#FFFFFF'; // 플레이어는 초록색, 적은 흰색
          ctx.beginPath();
          ctx.arc(e.x, e.y, 6, 0, Math.PI * 2); // 크기 4 -> 6으로 증가
          ctx.fill();
          // 외곽선 추가로 더 명확하게
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // 🔥 Ground Y 표시 (빨간 점)
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.arc(e.x, GROUND_Y, 6, 0, Math.PI * 2); // 크기 4 -> 6으로 증가
          ctx.fill();
          // 외곽선 추가로 더 명확하게
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();
          */

          if (e.state === 'hit' && e.type !== 'enemy') {
              ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              // Note: source-atop works on the whole canvas, but since we cleared/restored, we'd need to re-clip or mask.
              // For simplicity in this architecture, simplified flash is better or just skipping for now.
              // The original code tried to draw over the rect.
              // ctx.fillRect(e.x - e.width/2, spriteY - e.height, e.width, e.height);
          }

          /*
          // --- DEBUG: HITBOX VISUALIZATION ---
          // STEP 2: Body Hitbox based on PIVOT (e.x, e.y = pivot)
          // ✅ Pivot-based, 스프라이트 크기 기반
          
          // 플레이어의 실제 렌더링 크기 계산
          const spriteW = e.type === 'player' ? e.width * PLAYER_SCALE : e.width;
          const spriteH = e.type === 'player' ? e.height * PLAYER_SCALE : e.height;
          
          // Body box dimensions: 스프라이트 크기의 비율로 계산
          // 플레이어: 가로 60%, 세로 75% (맞아도 억울하지 않은 영역만)
          // 적: 기존보다 20% 넓게 (55 * 1.2 = 66)
          const bodyW = e.type === 'enemy' ? 66 : spriteW * 0.6;  // 적: 66 (기존 55의 120%), 플레이어: 스프라이트 폭의 60%
          const bodyH = e.type === 'enemy' ? 95 : spriteH * 0.75; // 적: 기존 값 유지, 플레이어: 스프라이트 높이의 75%
          
          // Body box position: pivot (e.x, e.y) centered horizontally, extends upward only
          const bodyBoxX = e.x - bodyW / 2;  // Pivot centered
          const bodyBoxY = e.y - bodyH;      // Pivot at bottom, box extends upward (발 아래 금지)
          
          ctx.lineWidth = 2;
          ctx.strokeStyle = e.type === 'enemy' ? '#FFFF00' : '#00FFFF'; // Yellow for Enemy, Cyan for Player
          ctx.strokeRect(bodyBoxX, bodyBoxY, bodyW, bodyH);

          // 2. Attack Hitbox (Red)
          if (e.attackBox) {
              if (e.attackBox.active) {
                  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Active: Semi-transparent Red Fill
                  ctx.strokeStyle = '#FF0000'; // Active: Red Border
              } else {
                  // Enemy Attack Box = Purple, Player = White/Gray
                  ctx.fillStyle = e.type === 'enemy' ? 'rgba(128, 0, 128, 0.2)' : 'rgba(255, 255, 255, 0.2)'; 
                  ctx.strokeStyle = e.type === 'enemy' ? 'rgba(128, 0, 128, 0.5)' : 'rgba(255, 255, 255, 0.5)'; 
              }
              
              ctx.fillRect(e.attackBox.x, e.attackBox.y, e.attackBox.w, e.attackBox.h);
              ctx.strokeRect(e.attackBox.x, e.attackBox.y, e.attackBox.w, e.attackBox.h);
          }
          // --- END DEBUG ---
          */
      });
      
      // Effects
      particlesRef.current.forEach(p => { 
          ctx.fillStyle = '#FFD700'; 
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          ctx.font = 'bold 24px Galmuri11, monospace'; 
          ctx.strokeText('HIT!', p.x, p.y);
          ctx.fillText('HIT!', p.x, p.y); 
      });
      
      // --- HUD (Ninja Style) ---
      // Player HUD
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 320, 60);
      ctx.fillStyle = '#fff'; ctx.font = '16px Galmuri11'; ctx.fillText('HERO', 20, 30);
      // HP Bar BG
      ctx.fillStyle = '#333'; ctx.fillRect(20, 40, 280, 20);
      // HP Bar Fill (Chakra Green)
      // Safety check for maxHp to avoid Infinity
      const pMax = playerRef.current.maxHp || 100;
      const playerHpPct = Math.min(1, Math.max(0, playerRef.current.hp / pMax));
      
      // Box Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(10, 10, 320, 80); 
      
      // Name
      ctx.fillStyle = '#fff'; 
      ctx.font = 'bold 16px Galmuri11'; 
      ctx.fillText('HERO', 20, 30);
      
      // HP Bar
      const hpBarY = 40;
      const barWidth = 280;
      const barHeight = 15;
      
      // 1. Background (Empty part)
      ctx.fillStyle = '#333'; 
      ctx.fillRect(20, hpBarY, barWidth, barHeight);
      
      // 2. Fill (Health)
      ctx.fillStyle = '#00E676'; 
      ctx.fillRect(20, hpBarY, barWidth * playerHpPct, barHeight);
      
      // 3. Border (White Outline)
      ctx.strokeStyle = '#fff'; 
      ctx.lineWidth = 2; 
      ctx.strokeRect(20, hpBarY, barWidth, barHeight);

      // Attack Stacks (Boxes)
      // FIX: Improved UI for Stack System
      const stackY = hpBarY + 25;
      
      // Draw Label
      ctx.fillStyle = '#bbb';
      ctx.font = '10px Galmuri11';
      ctx.fillText('COMBO', 20, stackY + 8);
      
      for (let i = 0; i < 5; i++) {
          const x = 60 + (i * 25); // Shifted right after label
          const y = stackY; 
          
          // Background Box
          ctx.fillStyle = '#222';
          ctx.fillRect(x, y, 20, 10);
          ctx.strokeStyle = '#555';
          ctx.strokeRect(x, y, 20, 10);
          
          // Filled Box
          if (i < attackStackRef.current) {
              // Color gradient: Yellow -> Orange -> Red
              if (attackStackRef.current === 5) ctx.fillStyle = '#FF0000'; // Full Charge: Red
              else ctx.fillStyle = '#FFD700'; // Charging: Gold
              
              ctx.fillRect(x, y, 20, 10);
              
              // Glow effect for full stack
              if (attackStackRef.current === 5) {
                  ctx.strokeStyle = '#FFF';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(x, y, 20, 10);
                  ctx.lineWidth = 1; // Reset
              }
          }
      }
      
      // Ultimate Ready Text
      if (attackStackRef.current >= 5) {
          // Blink effect
          if (Math.floor(Date.now() / 200) % 2 === 0) {
              ctx.fillStyle = '#FF4500';
              ctx.font = 'bold 12px Galmuri11';
              ctx.fillText("ULTIMATE READY! (PRESS X)", 20, stackY + 25); 
          }
      }
      
      // Defense Cooldown Text
      const now = Date.now();
      const defDiff = now - lastDefenseTime.current;
      const defReady = defDiff >= DEFENSE_COOLDOWN_TIME;
      
      ctx.font = '12px Galmuri11';
      ctx.textAlign = 'right';
      
      if (playerRef.current.state === 'defend') {
          ctx.fillStyle = '#00E676';
          ctx.fillText(`ACTIVE: ${((playerRef.current.defenseTimer || 0)/60).toFixed(1)}s`, 320, 30); 
      } else if (defReady) {
          ctx.fillStyle = '#00E676';
          ctx.fillText("DEF: READY", 320, 30); 
      } else {
          ctx.fillStyle = '#F44336';
          const timeLeft = ((DEFENSE_COOLDOWN_TIME - defDiff) / 1000).toFixed(1);
          ctx.fillText(`DEF: ${timeLeft}s`, 320, 30);
      }
      ctx.textAlign = 'left'; 

      // Enemy HUD
      // Move slightly left to ensure it's fully visible (CANVAS_WIDTH - 340)
      const enemyHudX = CANVAS_WIDTH - 340;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(enemyHudX, 10, 320, 60);
      
      ctx.fillStyle = '#fff'; 
      ctx.font = 'bold 16px Galmuri11';
      ctx.fillText('RIVAL NINJA', enemyHudX + 20, 30);
      
      const eMax = enemyRef.current.maxHp || 100;
      const enemyHpPct = Math.min(1, Math.max(0, enemyRef.current.hp / eMax));
      
      // Enemy HP Bar
      const eBarX = enemyHudX + 20;
      
      // 1. Background
      ctx.fillStyle = '#333'; 
      ctx.fillRect(eBarX, 40, barWidth, barHeight);
      
      // 2. Fill
      ctx.fillStyle = '#F44336'; 
      ctx.fillRect(eBarX, 40, barWidth * enemyHpPct, barHeight);
      
      // 3. Border
      ctx.strokeStyle = '#fff'; 
      ctx.strokeRect(eBarX, 40, barWidth, barHeight);
  };

  // --- RENDER ---
  const renderCharacterSelect = () => (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-transparent overflow-hidden">
          <div className="w-full max-w-6xl h-[650px] border-4 border-black bg-white p-6 shadow-xl relative flex flex-col">
              <h2 
                className="text-4xl mb-6 text-center font-bold shrink-0"
                style={{ 
                  fontFamily: "'Galmuri11', 'Courier New', monospace",
                  fontWeight: 'bold',
                  WebkitFontSmoothing: 'none',
                  MozOsxFontSmoothing: 'unset',
                  textRendering: 'optimizeSpeed',
                  color: 'white',
                  textShadow: 
                    // Inner dark blue-purple stroke (1px layers)
                    '1px 0 0 #4A148C, -1px 0 0 #4A148C, 0 1px 0 #4A148C, 0 -1px 0 #4A148C, ' +
                    '1px 1px 0 #4A148C, -1px -1px 0 #4A148C, 1px -1px 0 #4A148C, -1px 1px 0 #4A148C, ' +
                    // Middle outline layer (2-3px) - Changed to #0084FF
                    '2px 0 0 #0084FF, -2px 0 0 #0084FF, 0 2px 0 #0084FF, 0 -2px 0 #0084FF, ' +
                    '2px 2px 0 #0084FF, -2px -2px 0 #0084FF, 2px -2px 0 #0084FF, -2px 2px 0 #0084FF, ' +
                    '3px 0 0 #0084FF, -3px 0 0 #0084FF, 0 3px 0 #0084FF, 0 -3px 0 #0084FF, ' +
                    '3px 3px 0 #0084FF, -3px -3px 0 #0084FF, 3px -3px 0 #0084FF, -3px 3px 0 #0084FF, ' +
                    // Outer dark shadow (offset bottom-right)
                    '4px 4px 0 #000000, 5px 5px 0 #000000, 4px 5px 0 #000000, 5px 4px 0 #000000',
                  filter: 'none',
                  letterSpacing: '2px'
                }}
              >
                SELECT YOUR HERO
              </h2>
              
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 min-h-0">
              {/* New Character Card */}
              <div 
                  onClick={() => setPhase('creation')}
                  className="border-4 border-dashed cursor-pointer p-4 flex flex-col items-center justify-center min-h-[200px] group transition-colors"
                  style={{ borderColor: '#0084FF', backgroundColor: '#ACD4FF' }}
              >
                  <div className="text-4xl mb-2" style={{ color: '#0084FF' }}>+</div>
                  <p className="text-lg" style={{ color: '#0084FF', fontFamily: "'Galmuri11', 'Courier New', monospace", fontWeight: 'bold', WebkitFontSmoothing: 'none', MozOsxFontSmoothing: 'unset', textRendering: 'optimizeSpeed' }}>CREATE NEW</p>
              </div>

                  {/* Existing Characters */}
              {characters
                  .filter(char => !failedImageIds.has(char.id) && char.name !== '마녀')
                  .map(char => (
                  <div 
                      key={char.id}
                      onClick={() => startGameWithCharacter(char)}
                      className="bg-white hover:bg-gray-50 cursor-pointer p-3 flex flex-col items-center relative group transition-transform hover:-translate-y-2"
                      style={{ 
                        border: 'none',
                        backgroundImage: 'url(/box2.png)',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        width: '100%'
                      }}
                  >
                      {/* Level Box - Centered at top */}
                      <div className="relative mb-1 shrink-0" style={{ imageRendering: 'pixelated', zIndex: 10 }}>
                          <img src="/lv.png" alt="LV" style={{ imageRendering: 'pixelated', height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }} />
                          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-end" style={{ 
                              color: 'white', 
                              fontFamily: "'Galmuri11', 'Courier New', monospace", 
                              fontWeight: 'bold', 
                              WebkitFontSmoothing: 'none', 
                              MozOsxFontSmoothing: 'unset', 
                              textRendering: 'optimizeSpeed',
                              fontSize: '0.7rem',
                              paddingRight: '8px',
                              paddingTop: '2px',
                              pointerEvents: 'none',
                              zIndex: 11
                          }}>
                              {char.winCount || 1}
                          </div>
                      </div>
                      
                      {/* Character Image */}
                      <div className="bg-white flex items-center justify-center relative inline-block" style={{ flexShrink: 1, flexGrow: 0 }}>
                          <img 
                              src={char.imageUrl} 
                              alt={char.name} 
                              className="object-contain" 
                              style={{ imageRendering: 'pixelated', maxWidth: '200px', maxHeight: '200px', display: 'block' }}
                              onError={() => {
                                  setFailedImageIds(prev => new Set(prev).add(char.id));
                              }}
                          />
                      </div>
                      
                      {/* Character Name - No margin bottom */}
                      <h3 className="text-base font-bold" style={{ color: 'black', fontFamily: "'Galmuri11', 'Courier New', monospace", fontWeight: 'bold', WebkitFontSmoothing: 'none', MozOsxFontSmoothing: 'unset', textRendering: 'optimizeSpeed', marginTop: 0, marginBottom: 0 }}>{char.name}</h3>
                      <div className="w-full grid grid-cols-2 gap-3" style={{ maxWidth: '85%' }}>
                          <div className="relative w-full flex items-center justify-center" style={{ imageRendering: 'pixelated' }}>
                              <img src="/HP.png" alt="HP" style={{ imageRendering: 'pixelated', height: '32px', width: 'auto', objectFit: 'contain' }} />
                              <div className="absolute inset-0 flex items-center justify-center" style={{ 
                                  color: 'white', 
                                  fontFamily: "'Galmuri11', 'Courier New', monospace", 
                                  fontWeight: 'bold', 
                                  WebkitFontSmoothing: 'none', 
                                  MozOsxFontSmoothing: 'unset', 
                                  textRendering: 'optimizeSpeed',
                                  fontSize: '0.75rem'
                              }}>
                                  <div className="flex items-center justify-center" style={{ width: '40%', height: '100%', marginLeft: '60%' }}>
                                      {char.stats.hp}
                                  </div>
                              </div>
                          </div>
                          <div className="relative w-full flex items-center justify-center" style={{ imageRendering: 'pixelated' }}>
                              <img src="/attack.png" alt="ATK" style={{ imageRendering: 'pixelated', height: '32px', width: 'auto', objectFit: 'contain' }} />
                              <div className="absolute inset-0 flex items-center justify-center" style={{ 
                                  color: 'white', 
                                  fontFamily: "'Galmuri11', 'Courier New', monospace", 
                                  fontWeight: 'bold', 
                                  WebkitFontSmoothing: 'none', 
                                  MozOsxFontSmoothing: 'unset', 
                                  textRendering: 'optimizeSpeed',
                                  fontSize: '0.75rem'
                              }}>
                                  <div className="flex items-center justify-center" style={{ width: '40%', height: '100%', marginLeft: '60%' }}>
                                      {char.stats.atk}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
              </div>
              
              <button onClick={() => window.location.href = '/'} className="absolute top-4 left-4 hover:text-gray-600" style={{ color: 'black', fontFamily: "'Galmuri11', 'Courier New', monospace", fontWeight: 'bold', WebkitFontSmoothing: 'none', MozOsxFontSmoothing: 'unset', textRendering: 'optimizeSpeed', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                  &lt; BACK
              </button>
          </div>
      </div>
  );

  const renderLeftPanel = () => {
      if (phase === 'creation') {
          return (
            <div className="flex flex-col gap-3 h-full pr-2 overflow-y-auto">
                <div className="p-3 border-4 border-black bg-white shrink-0">
                    <label className="pixel-label block text-sm mb-1 text-black">CHARACTER NAME</label>
                    <input
                        type="text"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        placeholder='e.g., "Pink Warrior"'
                        className="pixel-input w-full text-sm p-2 bg-white text-black border-2 border-black placeholder-gray-400 mb-3"
                    />
                    <label className="pixel-label block text-sm mb-1 text-black">CHARACTER DESCRIPTION</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder='e.g., "cute pink-haired warrior"'
                        className="pixel-input w-full text-sm p-2 bg-white text-black border-2 border-black placeholder-gray-400"
                        rows={2}
                    />
                </div>
                <div className="p-3 border-4 border-black bg-white shrink-0">
                    <label className="pixel-label block text-sm mb-1 text-black">HAIR COLOR / PRIMARY COLOR</label>
                    <div className="flex gap-1">
                        {colorOptions.map((option) => (
                            <button key={option.value} onClick={() => setColor(option.value)} className={`pixel-color-box w-6 h-6 ${color === option.value ? 'selected ring-2 ring-black' : ''}`} style={{ backgroundColor: option.color, borderColor: option.color === '#FFFFFF' || option.color === 'transparent' ? 'black' : option.color }} title={option.name} />
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="p-3 border-4 border-black bg-white">
                        <label className="pixel-label block text-sm mb-1 text-black">MOOD</label>
                        <div className="space-y-1">
                            {moodOptions.map((option) => (
                                <div key={option} className="pixel-radio-label flex items-center gap-2 cursor-pointer" onClick={() => setMood(option)}>
                                    <img src={mood === option ? "/radio-checked.png" : "/radio-unchecked.png"} alt={option} className="pixel-radio-image w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                                    <span className="pixel-text text-sm select-none text-black">{option}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 border-4 border-black bg-white">
                        <label className="pixel-label block text-sm mb-1 text-black">WEAPON</label>
                        <div className="flex flex-col gap-1">
                            {weaponOptions.map((option) => (
                                <button key={option} onClick={() => setWeapon(option)} className={`pixel-color-box ${weapon === option ? 'selected ring-2 ring-black' : ''}`} style={{ backgroundColor: 'white', borderColor: 'black', borderWidth: '1px', width: '100%', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '0 8px' }} title={option}>
                                    {option === 'Candy' && <img src="/candy-icon.png" alt="Candy" style={{ width: '20px', height: '20px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    {option === 'Baguette' && <img src="/baguette-icon.png" alt="Baguette" style={{ width: '20px', height: '20px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    {option === 'Magic Wand' && <img src="/magic-wand-icon.png" alt="Magic Wand" style={{ width: '20px', height: '20px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    {option === 'Sword' && <img src="/sword-icon.png" alt="Sword" style={{ width: '20px', height: '20px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    <span className="pixel-text text-xs text-black">{option}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          );
      } else if (phase === 'sprites') {
          return (
            <div className="flex flex-col gap-3 h-full pr-2">
                 <div className="p-3 border-4 border-black bg-white shrink-0">
                    {/* STEP 1: Optional Animations Section - Always visible, can select before Core generation */}
                    <div className="border-t-2 border-gray-300 pt-3 mb-3">
                        <label className="pixel-text block text-sm mb-2 font-bold text-black">+ Generate Optional</label>
                        <div className="flex flex-col gap-2">
                            <label 
                                className="flex items-center gap-3 cursor-pointer p-2 border-2 border-gray-300 hover:border-gray-500 hover:bg-gray-50 rounded transition-colors"
                                onClick={() => {
                                    if (!coreGenerating && !spriteLoading) {
                                        setOptionalDefense(!optionalDefense);
                                    }
                                }}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={optionalDefense} 
                                    onChange={(e) => setOptionalDefense(e.target.checked)}
                                    disabled={coreGenerating || spriteLoading}
                                    className="w-5 h-5 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <span className="pixel-text text-sm text-black select-none">Defense</span>
                            </label>
                            <label 
                                className="flex items-center gap-3 cursor-pointer p-2 border-2 border-gray-300 hover:border-gray-500 hover:bg-gray-50 rounded transition-colors"
                                onClick={() => {
                                    if (!coreGenerating && !spriteLoading) {
                                        setOptionalDead(!optionalDead);
                                    }
                                }}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={optionalDead} 
                                    onChange={(e) => setOptionalDead(e.target.checked)}
                                    disabled={coreGenerating || spriteLoading}
                                    className="w-5 h-5 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <span className="pixel-text text-sm text-black select-none">Dead</span>
                            </label>
                        </div>
                    </div>
                    
                    {/* STEP 1: Core Animations Button */}
                    <button 
                        onClick={generateCoreAnimations} 
                        disabled={coreGenerating || !spriteReferenceImage} 
                        className="pixel-button w-full bg-indigo-600 text-white py-3 text-base hover:bg-indigo-700 disabled:bg-gray-400 border-black mb-2"
                    >
                        {coreGenerating ? 'GENERATING CORE ANIMATIONS...' : 'GENERATE CORE ANIMATIONS'}
                    </button>
                    <p className="pixel-text text-xs mb-2 text-gray-600 text-center">Attack + Attack2 + Jump (Recommended)</p>
                    
                    {/* Progress Bars for Core Animations */}
                    {coreGenerating && (
                        <div className="space-y-2 mb-2">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="pixel-text text-xs text-black">Attack</span>
                                    <span className="pixel-text text-xs text-black">{Math.round(progress.attack)}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 border border-gray-400">
                                    <div 
                                        className="h-full bg-indigo-600 transition-all duration-300" 
                                        style={{ width: `${progress.attack}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="pixel-text text-xs text-black">Attack2</span>
                                    <span className="pixel-text text-xs text-black">{Math.round(progress.attack2)}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 border border-gray-400">
                                    <div 
                                        className="h-full bg-indigo-600 transition-all duration-300" 
                                        style={{ width: `${progress.attack2}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="pixel-text text-xs text-black">Jump</span>
                                    <span className="pixel-text text-xs text-black">{Math.round(progress.jump)}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 border border-gray-400">
                                    <div 
                                        className="h-full bg-indigo-600 transition-all duration-300" 
                                        style={{ width: `${progress.jump}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Progress Bars for Optional Animations */}
                    {spriteLoading && (optionalDefense || optionalDead) && (
                        <div className="space-y-2 mb-2 border-t-2 border-gray-300 pt-2">
                            {optionalDefense && (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="pixel-text text-xs text-black">Defense</span>
                                        <span className="pixel-text text-xs text-black">{Math.round(progress.defense)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 border border-gray-400">
                                        <div 
                                            className="h-full bg-gray-600 transition-all duration-300" 
                                            style={{ width: `${progress.defense}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            {optionalDead && (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="pixel-text text-xs text-black">Dead</span>
                                        <span className="pixel-text text-xs text-black">{Math.round(progress.dead)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 border border-gray-400">
                                        <div 
                                            className="h-full bg-gray-600 transition-all duration-300" 
                                            style={{ width: `${progress.dead}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {coreCompleted && (optionalDefense || optionalDead) && !spriteLoading && (
                        <p className="pixel-text text-xs text-green-600 text-center mb-2">
                            Core complete! Optional animations will start automatically...
                        </p>
                    )}
                    
                    <p className="pixel-text text-xs mt-3 text-black">{spriteStatus}</p>
                 </div>
                 <div className="p-3 border-4 border-black bg-white flex-1 overflow-y-auto">
                      <p className="text-xs mb-1 font-bold text-black">Or Upload Your Own:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="pixel-button bg-gray-200 text-black border-2 border-gray-400 text-[10px] cursor-pointer flex items-center justify-center py-1 hover:bg-gray-300">
                            UPLOAD ATTACK
                            <input type="file" multiple accept="image/*" onChange={(e) => handleCustomUpload(e, 'attack')} className="hidden" />
                        </label>
                        <label className="pixel-button bg-gray-200 text-black border-2 border-gray-400 text-[10px] cursor-pointer flex items-center justify-center py-1 hover:bg-gray-300">
                            UPLOAD ATTACK 2
                            <input type="file" multiple accept="image/*" onChange={(e) => handleCustomUpload(e, 'attack2')} className="hidden" />
                        </label>
                        <label className="pixel-button bg-gray-200 text-black border-2 border-gray-400 text-[10px] cursor-pointer flex items-center justify-center py-1 hover:bg-gray-300">
                            UPLOAD JUMP
                            <input type="file" multiple accept="image/*" onChange={(e) => handleCustomUpload(e, 'jump')} className="hidden" />
                        </label>
                        <label className="pixel-button bg-gray-200 text-black border-2 border-gray-400 text-[10px] cursor-pointer flex items-center justify-center py-1 hover:bg-gray-300">
                            UPLOAD DEFENSE
                            <input type="file" multiple accept="image/*" onChange={(e) => handleCustomUpload(e, 'defense')} className="hidden" />
                        </label>
                        <label className="pixel-button bg-gray-200 text-black border-2 border-gray-400 text-[10px] cursor-pointer flex items-center justify-center py-1 hover:bg-gray-300">
                            UPLOAD DEAD
                            <input type="file" multiple accept="image/*" onChange={(e) => handleCustomUpload(e, 'dead')} className="hidden" />
                        </label>
                      </div>
                 </div>
            </div>
          );
      }
      return null;
  };

  const renderRightPanel = () => {
      if (phase === 'creation') {
          return (
            <div className="h-full flex flex-col p-3 border-4 border-black bg-white">
                <h3 className="pixel-label text-base mb-2 text-center text-black">PREVIEW</h3>
                
                {/* Preview Area - Aspect Square */}
                <div className="w-full aspect-square bg-gray-100 border-2 border-black relative flex items-center justify-center overflow-hidden mb-3 shrink-0">
                    {!generatedImage && (
                        <div className="flex flex-col items-center justify-center gap-4 p-4 text-center">
                            <div className="relative">
                                <img src="/speech-bubble.png" alt="Speech bubble" style={{ imageRendering: 'pixelated', width: '100px' }} />
                                <p className="pixel-text absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-black font-bold">Hi</p>
                            </div>
                            <div style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}><img src="/character-silhouette.png" alt="Silhouette" style={{ filter: 'brightness(0)', width: '40px', height: '40px', objectFit: 'contain' }} /></div>
                            <p className="pixel-text text-gray-400 text-xs mt-4">NO CHARACTER YET</p>
                        </div>
                    )}
                    {generatedImage && (
                        <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                    )}
                </div>

                {/* Buttons Moved Here */}
                <div className="space-y-2 flex-col">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={generatePixelCharacter} disabled={genLoading} className="pixel-button w-full text-sm py-2 border-black bg-blue-500 text-white hover:bg-blue-600">
                            {genLoading ? '...' : 'GENERATE (AI)'}
                        </button>
                        <label className="pixel-button w-full text-sm bg-purple-600 hover:bg-purple-700 text-white cursor-pointer flex items-center justify-center text-center py-2 border-black">
                            UPLOAD
                            <input type="file" accept="image/*" onChange={handleCharacterUpload} className="hidden" />
                        </label>
                    </div>
                    
                    {genLoading && (
                        <div>
                            <div className="flex items-center justify-between mb-1"><span className="pixel-text text-xs text-black">Generating...</span><span className="pixel-text text-xs text-black">{genProgress}%</span></div>
                            <div className="pixel-progress-bar h-2 border border-black"><div className="pixel-progress-bar-fill bg-green-500" style={{ width: `${genProgress}%` }}></div></div>
                        </div>
                    )}

                    {generatedImage && (
                        <div className="flex flex-col gap-2 mt-auto shrink-0">
                             <button onClick={handleSaveCharacter} disabled={isSaving} className="pixel-button w-full bg-green-500 text-white py-2 text-base hover:bg-green-600 border-black">
                                 {isSaving ? 'SAVING...' : 'SAVE'}
                             </button>
                             <button onClick={() => setPhase('sprites')} className="pixel-button w-full bg-blue-500 text-white py-2 text-base hover:bg-blue-600 border-black">
                                 CREATE SPRITES
                             </button>
                        </div>
                    )}
                </div>
            </div>
          );
      } else if (phase === 'sprites') {
          return (
            <div className="h-full flex flex-col p-3 border-4 border-black bg-white">
                <h3 className="pixel-label text-base mb-2 text-center text-black">GENERATED FRAMES</h3>
                <div className="flex-1 overflow-y-auto bg-gray-100 border-2 border-black p-2 min-h-0">
                  {attackSprites.length > 0 || attack2Sprites.length > 0 || jumpSprites.length > 0 || deadSprites.length > 0 || defenseSprites.length > 0 ? (
                      <div className="space-y-2">
                          {attackSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 text-black">Attack ({attackSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {attackSprites.map((frame, i) => {
                                      const frameId = `attack-${i}`;
                                      const isSelected = selectedFrames.has(frameId);
                                      return (
                                        <div key={`atk-${i}`} className="relative">
                                          <img src={frame} className={`w-full border-2 ${isSelected ? 'border-blue-500' : 'border-gray-300'} bg-white ${!frameSelectionMode ? '' : 'opacity-70'}`} style={{ imageRendering: 'pixelated' }} />
                                          {frameSelectionMode && (
                                            <div 
                                              className="absolute top-0 right-0 w-6 h-6 cursor-pointer hover:scale-110 transition-transform z-10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newSelected = new Set(selectedFrames);
                                                if (isSelected) {
                                                  newSelected.delete(frameId);
                                                } else {
                                                  newSelected.add(frameId);
                                                }
                                                setSelectedFrames(newSelected);
                                              }}
                                            >
                                              <div className={`w-full h-full border-2 border-black ${isSelected ? 'bg-blue-500' : 'bg-white'} flex items-center justify-center`}>
                                                {isSelected && (
                                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                              </div>
                          )}
                          {attack2Sprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Attack 2 ({attack2Sprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {attack2Sprites.map((frame, i) => {
                                      const frameId = `attack2-${i}`;
                                      const isSelected = selectedFrames.has(frameId);
                                      return (
                                        <div key={`atk2-${i}`} className="relative">
                                          <img src={frame} className={`w-full border-2 ${isSelected ? 'border-blue-500' : 'border-gray-300'} bg-white ${!frameSelectionMode ? '' : 'opacity-70'}`} style={{ imageRendering: 'pixelated' }} />
                                          {frameSelectionMode && (
                                            <div 
                                              className="absolute top-0 right-0 w-6 h-6 cursor-pointer hover:scale-110 transition-transform z-10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newSelected = new Set(selectedFrames);
                                                if (isSelected) {
                                                  newSelected.delete(frameId);
                                                } else {
                                                  newSelected.add(frameId);
                                                }
                                                setSelectedFrames(newSelected);
                                              }}
                                            >
                                              <div className={`w-full h-full border-2 border-black ${isSelected ? 'bg-blue-500' : 'bg-white'} flex items-center justify-center`}>
                                                {isSelected && (
                                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                              </div>
                          )}
                          {jumpSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Jump ({jumpSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {jumpSprites.map((frame, i) => {
                                      const frameId = `jump-${i}`;
                                      const isSelected = selectedFrames.has(frameId);
                                      return (
                                        <div key={`jmp-${i}`} className="relative">
                                          <img src={frame} className={`w-full border-2 ${isSelected ? 'border-blue-500' : 'border-gray-300'} bg-white ${!frameSelectionMode ? '' : 'opacity-70'}`} style={{ imageRendering: 'pixelated' }} />
                                          {frameSelectionMode && (
                                            <div 
                                              className="absolute top-0 right-0 w-6 h-6 cursor-pointer hover:scale-110 transition-transform z-10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newSelected = new Set(selectedFrames);
                                                if (isSelected) {
                                                  newSelected.delete(frameId);
                                                } else {
                                                  newSelected.add(frameId);
                                                }
                                                setSelectedFrames(newSelected);
                                              }}
                                            >
                                              <div className={`w-full h-full border-2 border-black ${isSelected ? 'bg-blue-500' : 'bg-white'} flex items-center justify-center`}>
                                                {isSelected && (
                                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                              </div>
                          )}
                          {defenseSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Defense ({defenseSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {defenseSprites.map((frame, i) => {
                                      const frameId = `defense-${i}`;
                                      const isSelected = selectedFrames.has(frameId);
                                      return (
                                        <div key={`def-${i}`} className="relative">
                                          <img src={frame} className={`w-full border-2 ${isSelected ? 'border-blue-500' : 'border-gray-300'} bg-white ${!frameSelectionMode ? '' : 'opacity-70'}`} style={{ imageRendering: 'pixelated' }} />
                                          {frameSelectionMode && (
                                            <div 
                                              className="absolute top-0 right-0 w-6 h-6 cursor-pointer hover:scale-110 transition-transform z-10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newSelected = new Set(selectedFrames);
                                                if (isSelected) {
                                                  newSelected.delete(frameId);
                                                } else {
                                                  newSelected.add(frameId);
                                                }
                                                setSelectedFrames(newSelected);
                                              }}
                                            >
                                              <div className={`w-full h-full border-2 border-black ${isSelected ? 'bg-blue-500' : 'bg-white'} flex items-center justify-center`}>
                                                {isSelected && (
                                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                              </div>
                          )}
                          {deadSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Dead ({deadSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {deadSprites.map((frame, i) => {
                                      const frameId = `dead-${i}`;
                                      const isSelected = selectedFrames.has(frameId);
                                      return (
                                        <div key={`ded-${i}`} className="relative">
                                          <img src={frame} className={`w-full border-2 ${isSelected ? 'border-blue-500' : 'border-gray-300'} bg-white ${!frameSelectionMode ? '' : 'opacity-70'}`} style={{ imageRendering: 'pixelated' }} />
                                          {frameSelectionMode && (
                                            <div 
                                              className="absolute top-0 right-0 w-6 h-6 cursor-pointer hover:scale-110 transition-transform z-10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newSelected = new Set(selectedFrames);
                                                if (isSelected) {
                                                  newSelected.delete(frameId);
                                                } else {
                                                  newSelected.add(frameId);
                                                }
                                                setSelectedFrames(newSelected);
                                              }}
                                            >
                                              <div className={`w-full h-full border-2 border-black ${isSelected ? 'bg-blue-500' : 'bg-white'} flex items-center justify-center`}>
                                                {isSelected && (
                                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs">No frames yet</div>}
                </div>
                
                <div className="mt-3 flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPhase('creation')} className="pixel-button w-full bg-gray-500 text-white py-2 text-sm hover:bg-gray-600 border-black">BACK</button>
                        {(attackSprites.length > 0 || attack2Sprites.length > 0 || jumpSprites.length > 0 || deadSprites.length > 0 || defenseSprites.length > 0) ? (
                            <button onClick={downloadAllFrames} className="pixel-button w-full bg-green-600 text-white py-2 text-sm hover:bg-green-700 border-black">DOWNLOAD (ZIP)</button>
                        ) : (
                            <button disabled className="pixel-button w-full bg-gray-300 text-gray-500 py-2 text-sm border-black cursor-not-allowed">DOWNLOAD (ZIP)</button>
                        )}
                    </div>
                    {(attackSprites.length > 0 || attack2Sprites.length > 0 || jumpSprites.length > 0 || deadSprites.length > 0 || defenseSprites.length > 0) && (
                        <div className="flex flex-col gap-2">
                            <button onClick={handleSaveAll} disabled={isSaving} className="pixel-button w-full bg-blue-600 text-white py-2 text-base hover:bg-blue-700 border-black animate-pulse">
                                {isSaving ? 'SAVING...' : 'SAVE ALL & START'}
                            </button>
                            {/* <button onClick={() => setPhase('playing')} className="pixel-button w-full bg-red-500 text-white py-2 text-base hover:bg-red-600 border-black">START BATTLE (Test)</button> */}
                        </div>
                    )}
                </div>
            </div>
          );
      }
      return null;
  };

  // Loading Screen Overlay
  if (isLoading) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-black z-50 absolute inset-0">
              <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 border-4 border-t-white border-r-transparent border-b-white border-l-transparent rounded-full animate-spin"></div>
                  <h2 
                    className="text-3xl text-white font-bold animate-pulse"
                    style={{ 
                      fontFamily: "'Galmuri11', 'Courier New', monospace",
                      textShadow: '2px 2px 0 #000'
                    }}
                  >
                    SUMMONING ENEMY...
                  </h2>
              </div>
          </div>
      );
  }

  if (phase === 'character_select') return renderCharacterSelect();

  if (phase === 'creation' || phase === 'sprites') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-transparent overflow-hidden">
            <div className="w-full max-w-6xl h-[650px] border-4 border-black bg-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 shadow-xl relative">
                {/* BACK Button */}
                {phase === 'creation' && (
                  <button 
                    onClick={() => setPhase('character_select')} 
                    className="absolute top-4 left-4 hover:text-gray-600" 
                    style={{ 
                      color: 'black', 
                      fontFamily: "'Galmuri11', 'Courier New', monospace", 
                      fontWeight: 'bold', 
                      WebkitFontSmoothing: 'none', 
                      MozOsxFontSmoothing: 'unset', 
                      textRendering: 'optimizeSpeed', 
                      background: 'transparent', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontSize: '1rem',
                      zIndex: 10
                    }}
                  >
                    &lt; BACK
                  </button>
                )}
                {/* Decorative pixel corners or title could go here if needed */}
                <div className="lg:col-span-2 h-full min-h-0 pt-12">
                    {renderLeftPanel()}
                </div>
                <div className="h-full min-h-0 pt-12">
                    {renderRightPanel()}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-transparent overflow-hidden">
        <div className="w-full max-w-6xl h-[650px] border-4 border-black bg-black p-0 shadow-xl relative flex items-center justify-center">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain pixelated" />
            {phase === 'gameover' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-end" style={{
                    backgroundImage: 'url(/game_over.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}>
                    <button 
                        onClick={() => window.location.href = '/'} 
                        className="mb-8 pixel-button bg-white text-black px-6 py-3 border-2 border-gray-500 hover:bg-gray-200"
                        style={{
                            fontFamily: "'Galmuri11', 'Courier New', monospace",
                            fontWeight: 'bold',
                            WebkitFontSmoothing: 'none',
                            MozOsxFontSmoothing: 'unset',
                            textRendering: 'optimizeSpeed'
                        }}
                    >
                        RETURN HOME
                    </button>
                </div>
            )}
            {phase === 'victory' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-end" style={{
                    backgroundImage: 'url(/victory.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}>
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="text-center text-white p-8 min-w-[300px]">
                            <div className="mb-6">
                                {diceResult === null ? (
                                    <div className="animate-bounce">
                                        <p className="mb-4 text-sm text-gray-300">Roll the dice to grow stronger!</p>
                                        <button
                                            onClick={rollDiceAndSave}
                                            disabled={isSaving}
                                            className="bg-purple-600 text-white px-6 py-3 pixel-button border-2 border-white hover:bg-purple-500"
                                        >
                                            🎲 ROLL DICE
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-16 h-16 bg-white text-black flex items-center justify-center text-4xl border-4 border-black font-bold mb-2">
                                            {diceResult}
                                        </div>
                                        <p className="text-2xl text-white font-bold pixel-text">{rewardMessage}</p>
                                        <p className="text-xs text-gray-400 mt-2">Saving progress...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
