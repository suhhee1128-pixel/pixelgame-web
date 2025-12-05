import React, { useEffect, useState, useRef } from 'react';

// --- Types & Interfaces ---
type GamePhase = 'creation' | 'sprites' | 'playing' | 'gameover' | 'victory';

  interface Entity {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    hp: number;
    maxHp: number;
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
    attackCooldown?: number; // Added for AI
  }

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const GROUND_Y = 400; // Standard 2D floor
const GRAVITY = 0.8;

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
    { name: 'Orange', value: 'Orange', color: '#FFA500' },
    { name: 'Gray', value: 'Gray', color: '#808080' },
    { name: 'Gold', value: 'Gold', color: '#FFD700' },
    { name: 'Silver', value: 'Silver', color: '#C0C0C0' },
];
const moodOptions = ['None', 'Cute', 'Scary', 'Futuristic', 'Fantasy', 'Elegant', 'Powerful'];
const weaponOptions = ['None', 'Baguette', 'Magic Wand', 'Candy', 'Sword'];

export default function GameTab() {
  // --- States ---
  const [phase, setPhase] = useState<GamePhase>('creation');
  
  // Creation State
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
  const [attackSprites, setAttackSprites] = useState<string[]>([]);
  const [attack2Sprites, setAttack2Sprites] = useState<string[]>([]); // Added
  const [jumpSprites, setJumpSprites] = useState<string[]>([]);
  const [deadSprites, setDeadSprites] = useState<string[]>([]);
  const [defenseSprites, setDefenseSprites] = useState<string[]>([]); // Added
  const [spriteStatus, setSpriteStatus] = useState('Select animation type...');
  const [spriteLoading, setSpriteLoading] = useState(false);
  const [animationInfo, setAnimationInfo] = useState('');

  // Game State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const playerRef = useRef<Entity>({
    x: 100, y: GROUND_Y, vx: 0, vy: 0, width: 120, height: 200, hp: 100, maxHp: 100,
    state: 'idle', facing: 1, frameTimer: 0, frameIndex: 0, animFrame: 0, type: 'player', color: 'blue', hitTimer: 0
  });
  // Add extra properties for combat logic (dashing, combo, etc.) dynamically if needed, or update interface.
  // Using refs for dash timing
  const lastKeyTime = useRef<{ [key: string]: number }>({ ArrowLeft: 0, ArrowRight: 0 });
  
  const enemyRef = useRef<Entity>({
    x: 600, y: GROUND_Y, vx: 0, vy: 0, width: 120, height: 200, hp: 100, maxHp: 100,
    state: 'idle', facing: -1, frameTimer: 0, frameIndex: 0, animFrame: 0, type: 'enemy', color: '#963296', hitTimer: 0
  });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<any[]>([]);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const victoryTimerRef = useRef<number>(0);

  // --- Effects ---
  useEffect(() => {
      const loadEnemySprites = async () => {
          console.log("Attempting to load enemy sprites...");
          const types = ['idle', 'attack', 'attack2', 'jump', 'defense', 'dead'];
          const loadedFrames: {[key: string]: (HTMLImageElement | HTMLCanvasElement)[]} = {};
          
          // Load up to 8 frames for each type
          for (const type of types) {
              const frames: (HTMLImageElement | HTMLCanvasElement)[] = [];
              for (let i = 1; i <= 8; i++) {
                  const img = new Image();
                  // Use timestamp to bust cache if needed, but try standard first
                  img.src = `/images/enemy/${type}/${i}.png`; 
                  
                  await new Promise((resolve) => {
                      img.onload = () => {
                          console.log(`Loaded: ${type}/${i}.png`);
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
          
          // Force re-render logic or state update if needed, but Ref change usually reflects next frame
      };

      if (phase === 'playing') {
          loadEnemySprites();
      }
  }, [phase]);

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
            if (now - lastKeyTime.current[key] < 250) {
                playerRef.current.isDashing = true;
            }
            lastKeyTime.current[key] = now;
        }
        
        // Trigger Actions immediately on press (Z: Attack, ArrowUp: Jump)
        if (phase === 'playing' && playerRef.current.hp > 0) {
             if (e.code === 'KeyZ') performAttack(playerRef.current, 'attack');
             if (e.code === 'KeyX') performAttack(playerRef.current, 'attack2'); // X is now Attack 2
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
    img.src = '/game-background.jpg';
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

  useEffect(() => {
    if (phase === 'playing') {
        if (generatedImage) {
            const img = new Image();
            img.src = generatedImage;
            img.onload = () => {
                playerRef.current.image = removeBackground(img);
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

  const handleCharacterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const url = URL.createObjectURL(file);
          setGeneratedImage(url);
          setGenStatus('✅ Character uploaded successfully!');
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
            if (spriteActionType === 'attack') setAttackSprites(data.frames);
            else if (spriteActionType === 'attack2') setAttack2Sprites(data.frames);
            else if (spriteActionType === 'jump') setJumpSprites(data.frames);
            else if (spriteActionType === 'defense') setDefenseSprites(data.frames);
            else setDeadSprites(data.frames);
            setSpriteStatus(`✅ ${spriteActionType} animation generated successfully!`);
        } else {
            setSpriteStatus(`❌ Error: ${data.error}`);
        }
    } catch(e: any) { setSpriteStatus(`❌ Error: ${e.message}`); }
    setSpriteLoading(false);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'attack' | 'jump' | 'dead' | 'defense' | 'attack2') => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        const urls = files.map(file => URL.createObjectURL(file));
        
        if (type === 'attack') setAttackSprites(urls);
        else if (type === 'attack2') setAttack2Sprites(urls);
        else if (type === 'jump') setJumpSprites(urls);
        else if (type === 'defense') setDefenseSprites(urls);
        else setDeadSprites(urls);
        
        setSpriteStatus(`✅ Custom ${type} sprites loaded (${files.length} frames)`);
    }
  };

  const downloadAllFrames = async () => {
    const framesToDownload = spriteActionType === 'attack' ? attackSprites : 
                             spriteActionType === 'attack2' ? attack2Sprites :
                             spriteActionType === 'jump' ? jumpSprites : 
                             spriteActionType === 'defense' ? defenseSprites : deadSprites;
    if (framesToDownload.length === 0) return;
    try {
      setSpriteStatus('Creating ZIP file...');
      const response = await fetch('/api/download/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: framesToDownload }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sprite_frames_${spriteActionType}_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setSpriteStatus('✅ Downloaded ZIP!');
      }
    } catch (error: any) { setSpriteStatus(`❌ Error: ${error.message}`); }
  };

  // --- Game Engine ---
  const startGameLoop = () => {
    playerRef.current.hp = 100;
    playerRef.current.x = 100;
    enemyRef.current.hp = 100;
    enemyRef.current.x = 600;
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
      const mW = mover.width * 0.4; 
      const tW = target.width * 0.4;
      
      const mLeft = nextX - mW/2;
      const mRight = nextX + mW/2;
      const tLeft = target.x - tW/2;
      const tRight = target.x + tW/2;
      
      const xOverlap = mLeft < tRight && mRight > tLeft;
      
      // Y Overlap (Allow jumping over)
      // Height is typically 200. 
      const mBot = mover.y;
      const mTop = mover.y - mover.height * 0.8; // Approximate hitbox height
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

    // Defense
    if (e.type === 'player' && keys['KeyC']) {
        if (e.state !== 'attack' && e.state !== 'hit' && e.state !== 'dead') {
            e.state = 'defend';
            e.vx = 0;
            if (e.defenseFrames && e.frames !== e.defenseFrames) {
                e.frames = e.defenseFrames;
                e.frameIndex = 0;
            }
        }
    } else if (e.state === 'defend') {
        e.state = 'idle';
        e.frames = undefined; // Reset
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
        
        // Update attack box position
        if (e.attackBox) {
            e.attackBox.x = e.x + (e.facing === 1 ? 0 : -e.attackBox.w);
            e.attackBox.y = e.y - 100;
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
                // Attack Animation Cycle
                e.frameIndex++;
                // Double check length inside just in case (though outer check covers it)
                if (e.frameIndex >= e.frames.length) { 
                    e.frameIndex = 0; e.state = 'idle'; 
                    e.frames = undefined;
                    if(e.attackBox) e.attackBox.active = false;
                } else { // Only check hitbox if frame is valid
                    // Active Hitbox on specific frames (Impact)
                    const mid = Math.floor(e.frames.length / 2);
                    if ((e.frameIndex === mid || e.frameIndex === mid+1) && e.attackBox) {
                        e.attackBox.active = true;
                    } else if (e.attackBox) {
                        e.attackBox.active = false;
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

    if (e.attackBox && e.attackBox.active) {
        const target = e.type === 'player' ? enemyRef.current : playerRef.current;
        if (checkCollision(e.attackBox, target)) {
            takeDamage(target, e.attackBox.damage || 10, e.facing, e.attackBox.knockback || 5);
            e.attackBox.active = false; // Hit once per attack frame
            spawnParticle(target.x, target.y - 50, 'hit');
        }
    }
  };

  const updateAI = (enemy: Entity, player: Entity) => {
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
          if (enemy.y >= GROUND_Y) { enemy.y = GROUND_Y; enemy.vy = 0; }
          else enemy.vy += GRAVITY;
          
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

      // Attack Cooldown Logic
      if (enemy.attackCooldown && enemy.attackCooldown > 0) {
          enemy.attackCooldown--;
      }

      const dx = player.x - enemy.x;
      const dist = Math.abs(dx);
      const attackRange = 80;
      
      // Simple AI
      // If blocked by collision, try to attack
      const isBlocked = Math.abs(dx) < 120 && Math.abs(dx) > 30 && (enemy.x === 0 || enemy.x === CANVAS_WIDTH || Math.abs(dx) < 60); // Basic heuristic

      if (dist < 100 || (dist < 150 && Math.random() < 0.05)) { // Increased range and chance
          // In Attack Range
          enemy.vx = 0;
          enemy.state = 'idle'; // Default state when close
          
          // Face player
          enemy.facing = dx > 0 ? 1 : -1;

          // Random Attack Chance
          // Attack more aggressively if close
          // Check Cooldown
          if (enemy.state !== 'attack' && (!enemy.attackCooldown || enemy.attackCooldown <= 0) && Math.random() < 0.05) { 
              performAttack(enemy, 'attack');
          }
      } else {
          // Chase Player
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
              // If blocked by player, FORCE ATTACK if cooldown ready
              if (enemy.state !== 'attack' && enemy.state !== 'hit' && enemy.state !== 'dead' && (!enemy.attackCooldown || enemy.attackCooldown <= 0)) {
                  enemy.vx = 0;
                  performAttack(enemy, 'attack');
              }
          }
      }

      if (canMove) {
          enemy.x = nextX;
      }
      
      if (enemy.x < 0) enemy.x = 0; if (enemy.x > CANVAS_WIDTH) enemy.x = CANVAS_WIDTH;

      enemy.y += enemy.vy;
      if (enemy.y > GROUND_Y) {
          enemy.y = GROUND_Y;
          enemy.vy = 0;
      } else if (enemy.y < GROUND_Y) {
          enemy.vy += GRAVITY;
      }

      if (enemy.y > GROUND_Y) {
          enemy.y = GROUND_Y;
          enemy.vy = 0;
      } else if (enemy.y < GROUND_Y) {
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
                     
                     // Add Cooldown
                     enemy.attackCooldown = 60 + Math.floor(Math.random() * 60); // 1~2 seconds cooldown
                     
                     enemy.vx = 0; // Stop moving briefly

                     // Reset to IDLE frames after attack
                     if (enemy.frames !== enemy.attackFrames && enemyRef.current.frames) {
                         enemy.frames = enemyRef.current.frames; // Restore idle frames
                         if(enemy.frames[0]) enemy.image = enemy.frames[0];
                     }
                 } else {
                     // Active Hitbox logic for Sprite
                     // Active for a longer window in the middle
                     const mid = Math.floor(enemy.frames.length / 2);
                     if (enemy.frameIndex >= mid - 1 && enemy.frameIndex <= mid + 1 && enemy.attackBox) {
                         enemy.attackBox.active = true;
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
                      enemy.attackCooldown = 60; // Cooldown for stickman too
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
          else if (enemy.state === 'hit' && enemy.frames) { /* hit frames if any */ }
      }

      // Update Attack Box Position
      if (enemy.state === 'attack' && enemy.attackBox) {
          // Adjust Hitbox based on facing (Left/Right)
          // Since sprites are centered, we offset from center
          // Width 80, height 80
          const reach = 60;
          enemy.attackBox.x = enemy.x + (enemy.facing === 1 ? reach/2 : -reach - enemy.attackBox.w + 20);
          enemy.attackBox.y = enemy.y - 80; // Lower it a bit (was -100) to hit body
      }

      // Enemy Hitbox Collision Check vs Player
      if (enemy.attackBox && enemy.attackBox.active) {
          if (checkCollision(enemy.attackBox, player)) {
              takeDamage(player, 10, enemy.facing, 10); // Player takes damage
              enemy.attackBox.active = false; // One hit per attack
              spawnParticle(player.x, player.y - 50, 'hit');
          }
      }
  };

  const performAttack = (e: Entity, type: string) => {
      if (e.state === 'attack') return; // Already attacking
      e.state = 'attack'; e.vx = 0;
      e.frameIndex = 0; // Start from frame 0
      
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
      e.attackBox = { 
          x: 0, // Set in update loop
          y: 0, 
          w: 80, 
          h: 80, 
          active: false,
          damage: type === 'attack2' ? 20 : 10, // Higher damage for Attack 2
          knockback: type === 'attack2' ? 15 : 10
      };
  };

  const checkCollision = (box: {x:number, y:number, w:number, h:number}, target: Entity) => {
      // 2D Box Collision
      return (box.x < target.x + target.width/2 && 
              box.x + box.w > target.x - target.width/2 && 
              box.y < target.y && 
              box.y + box.h > target.y - target.height);
  };

  const takeDamage = (e: Entity, amount: number, hitDir: number, knockback: number) => {
      if (e.state === 'dead') return;
      
      if (e.state === 'defend') {
          amount *= 0.1; // Chip damage
          knockback *= 0.5;
          spawnParticle(e.x, e.y - 50, 'block'); // Block effect
      } else {
          e.state = 'hit'; 
          e.hitTimer = 15; 
          // Blood effect
          spawnParticle(e.x, e.y - 50, 'blood');
          // Pop up
          e.vy = -5;
      }
      
      e.hp -= amount; 
      e.vx = hitDir * knockback; // Knockback
      
      if (e.hp <= 0) {
          e.hp = 0;
          e.state = 'dead';
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
             // Force Sprite Drawing for Enemy (No more Stickman)
             // Adjust Y slightly up to match pixel character foot level visually
             const drawY = spriteY - 5;

             // Enemy Sprite Logic (Assuming sprites face LEFT by default based on user feedback)
             if (e.facing === -1) {
                 // Facing Left (Default for these sprites) -> Draw normally
                 if (e.image) {
                    let img = e.image;
                    // Use frames if available
                    if (e.frames && e.frames.length > 0) {
                        // Wrap index safely
                        const idx = e.frameIndex % e.frames.length;
                        if(e.frames[idx]) img = e.frames[idx];
                    }
                    ctx.drawImage(img, e.x - e.width/2, drawY - e.height, e.width, e.height);
                 } else {
                    // Fallback Box
                    ctx.fillStyle = e.color; 
                    ctx.fillRect(e.x - e.width/2, drawY - e.height, e.width, e.height);
                 }
             } else {
                 // Facing Right -> Flip horizontally
                 ctx.save();
                 ctx.translate(e.x, drawY);
                 ctx.scale(-1, 1); // Flip
                 if (e.image) {
                    let img = e.image;
                    if (e.frames && e.frames.length > 0) {
                        const idx = e.frameIndex % e.frames.length;
                        if(e.frames[idx]) img = e.frames[idx];
                    }
                    // Draw centered at 0,0 (since we translated to x)
                    ctx.drawImage(img, -e.width/2, -e.height, e.width, e.height);
                 } else {
                    ctx.fillStyle = e.color;
                    ctx.fillRect(-e.width/2, -e.height, e.width, e.height);
                 }
                 ctx.restore();
             }
             
             // drawStickman(ctx, e); // DISABLED
          } else {
             // Player (Original Logic)
             if (e.facing === -1) { ctx.scale(-1, 1); ctx.translate(-e.x * 2, 0); }
             if (e.image) {
                let img = e.image;
                if (e.frames && e.frames.length > e.frameIndex && e.frames[e.frameIndex]) img = e.frames[e.frameIndex];
                ctx.drawImage(img, e.x - e.width/2, spriteY - e.height + bobOffset, e.width, e.height);
             } else {
                ctx.fillStyle = e.color; ctx.fillRect(e.x - e.width/2, spriteY - e.height + bobOffset, e.width, e.height);
             }
          }

          ctx.restore();

          if (e.state === 'hit' && e.type !== 'enemy') {
              ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              // Note: source-atop works on the whole canvas, but since we cleared/restored, we'd need to re-clip or mask.
              // For simplicity in this architecture, simplified flash is better or just skipping for now.
              // The original code tried to draw over the rect.
              // ctx.fillRect(e.x - e.width/2, spriteY - e.height, e.width, e.height);
          }
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
      const playerHpPct = Math.max(0, playerRef.current.hp / playerRef.current.maxHp);
      ctx.fillStyle = '#00E676'; 
      ctx.fillRect(20, 40, 280 * playerHpPct, 20);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 40, 280, 20);

      // Enemy HUD
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(CANVAS_WIDTH - 330, 10, 320, 60);
      ctx.fillStyle = '#fff'; ctx.fillText('RIVAL NINJA', CANVAS_WIDTH - 310, 30);
      // HP Bar BG
      ctx.fillStyle = '#333'; ctx.fillRect(CANVAS_WIDTH - 310, 40, 280, 20);
      // HP Bar Fill (Red)
      const enemyHpPct = Math.max(0, enemyRef.current.hp / enemyRef.current.maxHp);
      ctx.fillStyle = '#F44336'; 
      ctx.fillRect(CANVAS_WIDTH - 310, 40, 280 * enemyHpPct, 20);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(CANVAS_WIDTH - 310, 40, 280, 20);
  };

  // --- RENDER ---
  const renderLeftPanel = () => {
      if (phase === 'creation') {
          return (
            <div className="flex flex-col gap-3 h-auto pr-2">
                <div className="p-3 border-4 border-black bg-white">
                    <label className="pixel-label block text-sm mb-1 text-black">CHARACTER DESCRIPTION</label>
                    <textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder='e.g., "cute pink-haired warrior"' 
                        className="pixel-input w-full text-sm p-2 bg-white text-black border-2 border-black placeholder-gray-400" 
                        rows={2} 
                    />
                </div>
                <div className="p-3 border-4 border-black bg-white">
                    <label className="pixel-label block text-sm mb-1 text-black">HAIR COLOR / PRIMARY COLOR</label>
                    <div className="flex flex-wrap gap-1">
                        {colorOptions.map((option) => (
                            <button key={option.value} onClick={() => setColor(option.value)} className={`pixel-color-box w-6 h-6 ${color === option.value ? 'selected ring-2 ring-black' : ''}`} style={{ backgroundColor: option.color, borderColor: option.color === '#FFFFFF' || option.color === 'transparent' ? 'black' : option.color }} title={option.name} />
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 h-auto">
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
            <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2">
                 <div className="p-3 border-4 border-black bg-white">
                    <label className="pixel-text block text-sm mb-2 font-bold text-black">ANIMATION TYPE</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                       <button onClick={() => setSpriteActionType('attack')} className={`px-3 py-1 border-2 ${spriteActionType === 'attack' ? 'border-blue-500 bg-blue-100 text-black' : 'border-gray-300 text-black'} pixel-text text-xs`}>ATTACK</button>
                       <button onClick={() => setSpriteActionType('attack2')} className={`px-3 py-1 border-2 ${spriteActionType === 'attack2' ? 'border-blue-500 bg-blue-100 text-black' : 'border-gray-300 text-black'} pixel-text text-xs`}>ATTACK 2</button>
                       <button onClick={() => setSpriteActionType('jump')} className={`px-3 py-1 border-2 ${spriteActionType === 'jump' ? 'border-blue-500 bg-blue-100 text-black' : 'border-gray-300 text-black'} pixel-text text-xs`}>JUMP</button>
                       <button onClick={() => setSpriteActionType('defense')} className={`px-3 py-1 border-2 ${spriteActionType === 'defense' ? 'border-blue-500 bg-blue-100 text-black' : 'border-gray-300 text-black'} pixel-text text-xs`}>DEFENSE</button>
                       <button onClick={() => setSpriteActionType('dead')} className={`px-3 py-1 border-2 ${spriteActionType === 'dead' ? 'border-blue-500 bg-blue-100 text-black' : 'border-gray-300 text-black'} pixel-text text-xs`}>DEAD</button>
                    </div>
                    <div className="p-2 bg-gray-100 rounded border-2 border-gray-200 mb-2"><p className="pixel-text text-[10px] whitespace-pre-line text-black">{animationInfo}</p></div>
                    <button onClick={generateSprites} disabled={spriteLoading || !spriteReferenceImage} className="pixel-button w-full bg-indigo-600 text-white py-2 text-base hover:bg-indigo-700 disabled:bg-gray-400 border-black">
                        {spriteLoading ? 'GENERATING SPRITES...' : 'GENERATE FRAMES'}
                    </button>
                    <p className="pixel-text text-xs mt-1 text-black">{spriteStatus}</p>
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
            <div className="h-auto flex flex-col p-3 border-4 border-black bg-white">
                <h3 className="pixel-label text-base mb-2 text-center text-black">PREVIEW</h3>
                
                {/* Preview Area - Aspect Square */}
                <div className="w-full aspect-square bg-gray-100 border-2 border-black relative flex items-center justify-center overflow-hidden mb-3">
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
                        <button onClick={() => setPhase('sprites')} className="pixel-button w-full mt-auto bg-green-500 text-white py-2 text-base hover:bg-green-600 shrink-0 border-black">NEXT: SPRITES</button>
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
                                    {attackSprites.map((frame, i) => <img key={`atk-${i}`} src={frame} className="w-full border border-gray-300 bg-white" style={{ imageRendering: 'pixelated' }} />)}
                                  </div>
                              </div>
                          )}
                          {attack2Sprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Attack 2 ({attack2Sprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {attack2Sprites.map((frame, i) => <img key={`atk2-${i}`} src={frame} className="w-full border border-gray-300 bg-white" style={{ imageRendering: 'pixelated' }} />)}
                                  </div>
                              </div>
                          )}
                          {jumpSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Jump ({jumpSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {jumpSprites.map((frame, i) => <img key={`jmp-${i}`} src={frame} className="w-full border border-gray-300 bg-white" style={{ imageRendering: 'pixelated' }} />)}
                                  </div>
                              </div>
                          )}
                          {defenseSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Defense ({defenseSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {defenseSprites.map((frame, i) => <img key={`def-${i}`} src={frame} className="w-full border border-gray-300 bg-white" style={{ imageRendering: 'pixelated' }} />)}
                                  </div>
                              </div>
                          )}
                          {deadSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold mb-1 mt-2 text-black">Dead ({deadSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {deadSprites.map((frame, i) => <img key={`ded-${i}`} src={frame} className="w-full border border-gray-300 bg-white" style={{ imageRendering: 'pixelated' }} />)}
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs">No frames yet</div>}
                </div>
                
                {(attackSprites.length > 0 || attack2Sprites.length > 0 || jumpSprites.length > 0 || deadSprites.length > 0 || defenseSprites.length > 0) && (
                    <div className="mt-3 flex flex-col gap-2 shrink-0">
                        <button onClick={downloadAllFrames} className="pixel-button w-full bg-green-600 text-white py-2 text-sm hover:bg-green-700 border-black">DOWNLOAD CURRENT (ZIP)</button>
                        <button onClick={() => setPhase('playing')} className="pixel-button w-full bg-red-500 text-white py-2 text-base hover:bg-red-600 animate-pulse border-black">START BATTLE!</button>
                    </div>
                )}
            </div>
          );
      }
      return null;
  };

  if (phase === 'creation' || phase === 'sprites') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-transparent overflow-y-auto">
            <div className="w-full max-w-6xl border-4 border-black bg-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 shadow-xl relative">
                {/* Decorative pixel corners or title could go here if needed */}
                <div className="lg:col-span-2 min-h-0">
                    {renderLeftPanel()}
                </div>
                <div className="min-h-0">
                    {renderRightPanel()}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="w-full flex flex-col items-center p-4 bg-gray-900 min-h-screen">
        <div className="w-full max-w-4xl pixel-box bg-white p-4 mb-4">
            <h1 className="text-2xl font-bold pixel-text text-center">PIXEL FIGHTER</h1>
            <div className="flex justify-center gap-4 mt-2">
                <div className={`px-4 py-1 ${phase === 'creation' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>1. CREATE</div>
                <div className={`px-4 py-1 ${phase === 'sprites' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>2. SPRITES</div>
                <div className={`px-4 py-1 ${phase === 'playing' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>3. BATTLE</div>
            </div>
        </div>
        <div className="relative w-full max-w-4xl">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full border-4 border-white shadow-xl bg-gray-800 pixelated" />
            {(phase === 'gameover' || phase === 'victory') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                    <div className="text-center text-white">
                        <h2 className="text-4xl mb-4 pixel-text">{phase === 'victory' ? 'YOU WIN!' : 'GAME OVER'}</h2>
                        <button onClick={() => setPhase('creation')} className="bg-yellow-500 text-black px-6 py-3 pixel-button">NEW GAME</button>
                    </div>
                </div>
            )}
            {/* Remove old text instructions, now in Canvas */}
        </div>
    </div>
  );
}
