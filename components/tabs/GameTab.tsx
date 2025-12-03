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
  state: 'idle' | 'move' | 'attack' | 'skill' | 'hit' | 'dead' | 'defend';
  facing: 1 | -1;
  frameTimer: number;
  frameIndex: number;
  animFrame: number;
  type: 'player' | 'enemy';
  color: string;
  image?: HTMLImageElement | HTMLCanvasElement;
  frames?: (HTMLImageElement | HTMLCanvasElement)[];
  attackFrames?: (HTMLImageElement | HTMLCanvasElement)[];
  attack2Frames?: (HTMLImageElement | HTMLCanvasElement)[];
  jumpFrames?: (HTMLImageElement | HTMLCanvasElement)[];
  deadFrames?: (HTMLImageElement | HTMLCanvasElement)[];
  defenseFrames?: (HTMLImageElement | HTMLCanvasElement)[];
  attackBox?: { x: number, y: number, w: number, h: number, active: boolean, damage?: number, knockback?: number };
  hitTimer: number;
  isDashing?: boolean;
  attackCombo?: number;
  attackCooldown?: number;
}

const GRAVITY = 0.8;

const colorOptions = [
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
  // --- Dimensions State (Responsive) ---
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  // Ground Y is calculated dynamically based on height
  const groundY = dimensions.height - 100;

  // --- States ---
  const [phase, setPhase] = useState<GamePhase>('creation');
  
  // Creation State
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('Red');
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
  const [attack2Sprites, setAttack2Sprites] = useState<string[]>([]);
  const [jumpSprites, setJumpSprites] = useState<string[]>([]);
  const [deadSprites, setDeadSprites] = useState<string[]>([]);
  const [defenseSprites, setDefenseSprites] = useState<string[]>([]);
  const [spriteStatus, setSpriteStatus] = useState('Select animation type...');
  const [spriteLoading, setSpriteLoading] = useState(false);
  const [animationInfo, setAnimationInfo] = useState('');

  // Game State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Initialize with placeholder values, will be updated in start/resize
  const playerRef = useRef<Entity>({
    x: 100, y: 0, vx: 0, vy: 0, width: 150, height: 150, hp: 100, maxHp: 100,
    state: 'idle', facing: 1, frameTimer: 0, frameIndex: 0, animFrame: 0, type: 'player', color: 'blue', hitTimer: 0
  });
  
  const enemyRef = useRef<Entity>({
    x: 600, y: 0, vx: 0, vy: 0, width: 150, height: 150, hp: 100, maxHp: 100,
    state: 'idle', facing: -1, frameTimer: 0, frameIndex: 0, animFrame: 0, type: 'enemy', color: '#963296', hitTimer: 0
  });
  
  const lastKeyTime = useRef<{ [key: string]: number }>({ ArrowLeft: 0, ArrowRight: 0 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<any[]>([]);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const victoryTimerRef = useRef<number>(0);

  // --- Effects ---

  // 1. Resize Handler
  useEffect(() => {
    const handleResize = () => {
        if (typeof window !== 'undefined') {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Entity Positions on Resize to keep them on ground
  useEffect(() => {
      const newGroundY = dimensions.height - 100;
      if (playerRef.current.y >= newGroundY - 50) playerRef.current.y = newGroundY;
      if (enemyRef.current.y >= newGroundY - 50) enemyRef.current.y = newGroundY;
  }, [dimensions]);


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
                  img.src = `/images/enemy/${type}/${i}.png`; 
                  
                  await new Promise((resolve) => {
                      img.onload = () => {
                          frames.push(removeBackground(img));
                          resolve(null);
                      };
                      img.onerror = () => { resolve(null); };
                  });
              }
              if (frames.length > 0) {
                  loadedFrames[type] = frames;
              }
          }
          
          if (loadedFrames['idle'] && loadedFrames['idle'].length > 0) {
              enemyRef.current.frames = loadedFrames['idle'];
              enemyRef.current.image = loadedFrames['idle'][0];
          }
          if (loadedFrames['attack']) enemyRef.current.attackFrames = loadedFrames['attack'];
          if (loadedFrames['attack2']) enemyRef.current.attack2Frames = loadedFrames['attack2'];
          if (loadedFrames['jump']) enemyRef.current.jumpFrames = loadedFrames['jump'];
          if (loadedFrames['defense']) enemyRef.current.defenseFrames = loadedFrames['defense'];
          if (loadedFrames['dead']) enemyRef.current.deadFrames = loadedFrames['dead'];
      };

      if (phase === 'playing') {
          loadEnemySprites();
      }
  }, [phase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        keysPressed.current[e.code] = true; 
        
        if (phase === 'playing' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
            const now = Date.now();
            const key = e.code;
            if (now - lastKeyTime.current[key] < 250) {
                playerRef.current.isDashing = true;
            }
            lastKeyTime.current[key] = now;
        }
        
        if (phase === 'playing' && playerRef.current.hp > 0) {
             if (e.code === 'KeyZ') performAttack(playerRef.current, 'attack');
             if (e.code === 'KeyX') performAttack(playerRef.current, 'attack2');
             if (e.code === 'ArrowUp') {
                 // Dynamic Ground Check
                 const curGroundY = dimensions.height - 100;
                 if (Math.abs(playerRef.current.y - curGroundY) < 5 && playerRef.current.state !== 'hit' && playerRef.current.state !== 'attack') {
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
    
    const img = new Image();
    img.src = '/game-background.jpg';
    img.onload = () => setBgImage(img);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [phase, dimensions]); // Add dimensions dependency

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
        // Load Sprites helper
        const loadSprites = (urls: string[], setFrames: (frames: any) => void) => {
            if (urls.length === 0) return;
            const frames: any[] = new Array(urls.length);
            let loaded = 0;
            urls.forEach((url, i) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    frames[i] = removeBackground(img);
                    loaded++;
                    if (loaded === urls.length) setFrames(frames);
                };
            });
        };

        loadSprites(attackSprites, (f) => playerRef.current.attackFrames = f);
        loadSprites(attack2Sprites, (f) => playerRef.current.attack2Frames = f);
        loadSprites(jumpSprites, (f) => playerRef.current.jumpFrames = f);
        loadSprites(deadSprites, (f) => playerRef.current.deadFrames = f);
        loadSprites(defenseSprites, (f) => playerRef.current.defenseFrames = f);

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
    const curGroundY = dimensions.height - 100;

    playerRef.current.hp = 100;
    playerRef.current.x = dimensions.width * 0.15; // Start at 15% width
    playerRef.current.y = curGroundY;
    
    enemyRef.current.hp = 100;
    enemyRef.current.x = dimensions.width * 0.85; // Start at 85% width
    enemyRef.current.y = curGroundY;
    
    // Reset enemy state correctly for new game
    enemyRef.current.state = 'idle';
    enemyRef.current.frameIndex = 0;
    enemyRef.current.deadFrames = enemyRef.current.deadFrames || []; 
    
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
    
    if (enemyRef.current.hp <= 0) {
        if (enemyRef.current.state === 'dead') {
            const isAnimFinished = enemyRef.current.frames && 
                                   enemyRef.current.frameIndex >= enemyRef.current.frames.length - 1;
            
            if (isAnimFinished) {
                victoryTimerRef.current++;
                if (victoryTimerRef.current > 180) { 
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
      const mW = mover.width * 0.4; 
      const tW = target.width * 0.4;
      
      const mLeft = nextX - mW/2;
      const mRight = nextX + mW/2;
      const tLeft = target.x - tW/2;
      const tRight = target.x + tW/2;
      
      const xOverlap = mLeft < tRight && mRight > tLeft;
      
      const mBot = mover.y;
      const mTop = mover.y - mover.height * 0.8; 
      const tBot = target.y;
      const tTop = target.y - target.height * 0.8;
      
      const yOverlap = mTop < tBot && mBot > tTop;
      
      return xOverlap && yOverlap;
  };

  const updateEntity = (e: Entity, keys: { [key: string]: boolean }) => {
    const curGroundY = dimensions.height - 100; // Dynamic ground

    if (e.state === 'dead') {
        if (e.deadFrames && e.frames !== e.deadFrames) {
            e.frames = e.deadFrames;
            e.frameIndex = 0;
            e.frameTimer = 0;
        } 
        
        if (e.frames === e.deadFrames && e.frames) {
             e.frameTimer++;
             if (e.frameTimer > 10) { 
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
                 e.frameIndex = 0; 
            }
        }
        e.y += e.vy;
        if (e.y >= curGroundY) { e.y = curGroundY; e.vy = 0; }
        else e.vy += GRAVITY;
        
        e.x += e.vx; 
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
        e.frames = undefined;
    }

    // Attack Logic
    if (e.state === 'attack') {
        e.vx = 0;
        if (e.attackCombo === 2) {
             if (e.attack2Frames && e.attack2Frames.length > 0 && e.frames !== e.attack2Frames) {
                 e.frames = e.attack2Frames;
             }
        } else {
             if (e.attackFrames && e.attackFrames.length > 0 && e.frames !== e.attackFrames) {
                 e.frames = e.attackFrames;
             }
        }
        if (e.attackBox) {
            e.attackBox.x = e.x + (e.facing === 1 ? 0 : -e.attackBox.w);
            e.attackBox.y = e.y - 100;
        }
    } else if (e.state !== 'defend') { 
        if (e.type === 'player') {
            let moveSpeed = e.isDashing ? 10 : 5;
            let moving = false;

            if (keys['ArrowLeft']) { e.vx = -moveSpeed; e.facing = -1; moving = true; }
            else if (keys['ArrowRight']) { e.vx = moveSpeed; e.facing = 1; moving = true; }
            else e.vx = 0;

            const onGround = Math.abs(e.y - curGroundY) < 1;

            if (moving && onGround) {
                e.state = 'move';
                e.frames = undefined; 
            }
            else if (!onGround) {
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
            if (keys['KeyZ']) performAttack(e, 'attack');
        }
    }

    const nextX = e.x + e.vx;
    
    let canMove = true;
    if (e.type === 'player' && enemyRef.current.hp > 0) {
        if (checkBodyCollision(e, enemyRef.current, nextX)) {
            canMove = false;
        }
    }
    
    if (canMove) {
        e.x = nextX; 
    }
    
    // Dynamic Width
    const curWidth = dimensions.width;
    if (e.x < 0) e.x = 0; if (e.x > curWidth) e.x = curWidth;
    
    e.y += e.vy;
    if (e.y > curGroundY) {
        e.y = curGroundY;
        e.vy = 0;
    } else if (e.y < curGroundY) {
        e.vy += GRAVITY;
    }
    
    // Animation & Hitbox
    e.frameTimer++;
    const animSpeed = e.state === 'move' ? (e.isDashing ? 4 : 8) : 8; 
    if (e.frameTimer > animSpeed) {
        e.frameTimer = 0;
        if (e.frames && e.frames.length > 0) {
            if (e.state === 'attack') {
                e.frameIndex++;
                if (e.frameIndex >= e.frames.length) { 
                    e.frameIndex = 0; e.state = 'idle'; 
                    e.frames = undefined;
                    if(e.attackBox) e.attackBox.active = false;
                } else { 
                    const mid = Math.floor(e.frames.length / 2);
                    if ((e.frameIndex === mid || e.frameIndex === mid+1) && e.attackBox) {
                        e.attackBox.active = true;
                    } else if (e.attackBox) {
                        e.attackBox.active = false;
                    }
                }
            } else if (e.state === 'defend') {
                if (e.frameIndex < 4 && e.frameIndex < e.frames.length - 1) {
                    e.frameIndex++;
                } else {
                    e.frameIndex = Math.min(4, e.frames.length - 1);
                }
            } else if (!Math.abs(e.y - curGroundY) && e.frames === e.jumpFrames) {
                e.frameIndex++;
                if (e.frameIndex >= e.frames.length) e.frameIndex = e.frames.length - 1; 
            } else {
                e.frameIndex = (e.frameIndex + 1) % e.frames.length;
            }
        }
    }

    if (e.attackBox && e.attackBox.active) {
        const target = e.type === 'player' ? enemyRef.current : playerRef.current;
        if (checkCollision(e.attackBox, target)) {
            takeDamage(target, e.attackBox.damage || 10, e.facing, e.attackBox.knockback || 5);
            e.attackBox.active = false; 
            spawnParticle(target.x, target.y - 50, 'hit');
        }
    }
  };

  const updateAI = (enemy: Entity, player: Entity) => {
      const curGroundY = dimensions.height - 100;

      if (enemy.state === 'hit') {
          if (enemy.hitTimer > 0) {
              enemy.hitTimer--;
              if (enemy.hitTimer === 0) {
                   enemy.state = 'idle';
                   enemy.frameIndex = 0;
              }
          }
          
          enemy.y += enemy.vy;
          if (enemy.y >= curGroundY) { enemy.y = curGroundY; enemy.vy = 0; }
          else enemy.vy += GRAVITY;
          
          enemy.x += enemy.vx; 
          enemy.vx *= 0.9; 

          return;
      }

      if (enemy.state === 'dead') {
          if (enemy.deadFrames && enemy.frames !== enemy.deadFrames) {
              enemy.frames = enemy.deadFrames;
              enemy.frameIndex = 0;
              enemy.frameTimer = 0;
          }

          enemy.frameTimer++;
          if (enemy.frameTimer > 25) { 
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

      if (enemy.attackCooldown && enemy.attackCooldown > 0) {
          enemy.attackCooldown--;
      }

      const dx = player.x - enemy.x;
      const dist = Math.abs(dx);
      
      const curWidth = dimensions.width;

      if (dist < 100 || (dist < 150 && Math.random() < 0.05)) { 
          enemy.vx = 0;
          enemy.state = 'idle'; 
          enemy.facing = dx > 0 ? 1 : -1;

          if (enemy.state !== 'attack' && (!enemy.attackCooldown || enemy.attackCooldown <= 0) && Math.random() < 0.05) { 
              performAttack(enemy, 'attack');
          }
      } else {
          if (enemy.state !== 'attack') {
            enemy.vx = dx > 0 ? 2 : -2;
            enemy.state = 'move';
            enemy.facing = dx > 0 ? 1 : -1;
          }
      }
      
      const nextX = enemy.x + enemy.vx;
      
      let canMove = true;
      if (player.hp > 0) {
          if (checkBodyCollision(enemy, player, nextX)) {
              canMove = false;
              if (enemy.state !== 'attack' && enemy.state !== 'hit' && enemy.state !== 'dead' && (!enemy.attackCooldown || enemy.attackCooldown <= 0)) {
                  enemy.vx = 0;
                  performAttack(enemy, 'attack');
              }
          }
      }

      if (canMove) {
          enemy.x = nextX;
      }
      
      if (enemy.x < 0) enemy.x = 0; if (enemy.x > curWidth) enemy.x = curWidth;

      enemy.y += enemy.vy;
      if (enemy.y > curGroundY) {
          enemy.y = curGroundY;
          enemy.vy = 0;
      } else if (enemy.y < curGroundY) {
          enemy.vy += GRAVITY;
      }

      enemy.frameTimer++;
      const animSpeed = enemy.state === 'move' ? 10 : 12;
      
      if (enemy.frameTimer > animSpeed) {
          enemy.frameTimer = 0;

          if (enemy.frames && enemy.frames.length > 0) {
             if (enemy.state === 'attack') {
                 enemy.frameIndex++;
                 if (enemy.frameIndex >= enemy.frames.length) {
                     enemy.frameIndex = 0; enemy.state = 'idle';
                     if (enemy.attackBox) enemy.attackBox.active = false;
                     
                     enemy.attackCooldown = 60 + Math.floor(Math.random() * 60); 
                     enemy.vx = 0; 

                     if (enemy.frames !== enemy.attackFrames && enemyRef.current.frames) {
                         enemy.frames = enemyRef.current.frames; 
                         if(enemy.frames[0]) enemy.image = enemy.frames[0];
                     }
                 } else {
                     const mid = Math.floor(enemy.frames.length / 2);
                     if (enemy.frameIndex >= mid - 1 && enemy.frameIndex <= mid + 1 && enemy.attackBox) {
                         enemy.attackBox.active = true;
                     }
                 }
             } else {
                 enemy.frameIndex = (enemy.frameIndex + 1) % enemy.frames.length;
             }
          } 
          else {
              if (enemy.state === 'attack') {
                  enemy.frameIndex++;
                  if (enemy.frameIndex > 20) {
                      enemy.state = 'idle';
                      enemy.frameIndex = 0;
                      if (enemy.attackBox) enemy.attackBox.active = false;
                      enemy.attackCooldown = 60;
                  } else {
                      if (enemy.frameIndex >= 5 && enemy.frameIndex <= 15 && enemy.attackBox) {
                          enemy.attackBox.active = true;
                      } else if (enemy.attackBox) {
                          enemy.attackBox.active = false;
                      }
                  }
              }
          }
      }

      if (enemy.frames) {
          if (enemy.state === 'idle' && enemyRef.current.frames) { 
              if (enemy.frames !== enemyRef.current.frames) enemy.frames = enemyRef.current.frames;
          }
          else if (enemy.state === 'move') { 
              if (enemyRef.current.frames && enemy.frames !== enemyRef.current.frames) {
                  enemy.frames = enemyRef.current.frames;
              }
          }
          else if (enemy.state === 'attack') {
               if (enemy.attackCombo === 2 && enemy.attack2Frames) enemy.frames = enemy.attack2Frames;
               else if (enemy.attackFrames) enemy.frames = enemy.attackFrames;
          }
      }

      if (enemy.state === 'attack' && enemy.attackBox) {
          const reach = 60;
          enemy.attackBox.x = enemy.x + (enemy.facing === 1 ? reach/2 : -reach - enemy.attackBox.w + 20);
          enemy.attackBox.y = enemy.y - 80; 
      }

      if (enemy.attackBox && enemy.attackBox.active) {
          if (checkCollision(enemy.attackBox, player)) {
              takeDamage(player, 10, enemy.facing, 10); 
              enemy.attackBox.active = false; 
              spawnParticle(player.x, player.y - 50, 'hit');
          }
      }
  };

  const performAttack = (e: Entity, type: string) => {
      if (e.state === 'attack') return; 
      e.state = 'attack'; e.vx = 0;
      e.frameIndex = 0; 
      
      if (type === 'attack2') {
          e.attackCombo = 2; 
          if (e.attack2Frames && e.attack2Frames.length > 0) {
              e.frames = e.attack2Frames;
          } else {
              e.frames = e.attackFrames; 
          }
      } else {
          e.attackCombo = 1;
          e.frames = e.attackFrames;
      }
      
      e.attackBox = { 
          x: 0, 
          y: 0, 
          w: 80, 
          h: 80, 
          active: false,
          damage: type === 'attack2' ? 20 : 10, 
          knockback: type === 'attack2' ? 15 : 10
      };
  };

  const checkCollision = (box: {x:number, y:number, w:number, h:number}, target: Entity) => {
      return (box.x < target.x + target.width/2 && 
              box.x + box.w > target.x - target.width/2 && 
              box.y < target.y && 
              box.y + box.h > target.y - target.height);
  };

  const takeDamage = (e: Entity, amount: number, hitDir: number, knockback: number) => {
      if (e.state === 'dead') return;
      
      if (e.state === 'defend') {
          amount *= 0.1; 
          knockback *= 0.5;
          spawnParticle(e.x, e.y - 50, 'block'); 
      } else {
          e.state = 'hit'; 
          e.hitTimer = 15; 
          spawnParticle(e.x, e.y - 50, 'blood');
          e.vy = -5;
      }
      
      e.hp -= amount; 
      e.vx = hitDir * knockback; 
      
      if (e.hp <= 0) {
          e.hp = 0;
          e.state = 'dead';
      }
  };

  const spawnParticle = (x: number, y: number, type: string) => { particlesRef.current.push({ x, y, life: 20, type }); };
  const updateParticles = () => { particlesRef.current.forEach((p, i) => { p.life--; p.y -= 1; if (p.life <= 0) particlesRef.current.splice(i, 1); }); };

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      const curGroundY = dimensions.height - 100;

      // --- Draw Background Image ---
      if (bgImage) {
          ctx.drawImage(bgImage, 0, 0, dimensions.width, dimensions.height);
      } else {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      }

      const entities = [playerRef.current, enemyRef.current].sort((a, b) => a.y - b.y);
      entities.forEach(e => {
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(e.x, curGroundY + 5, 40, 10, 0, 0, Math.PI*2); ctx.fill();

          const spriteY = e.y;
          const bobOffset = (e.state === 'move' && Math.floor(Date.now() / 150) % 2 === 0) ? -5 : 0;

          ctx.save();
          
          if (e.type === 'enemy') {
             const drawY = spriteY - 5;

             if (e.facing === -1) {
                 if (e.image) {
                    let img = e.image;
                    if (e.frames && e.frames.length > 0) {
                        const idx = e.frameIndex % e.frames.length;
                        if(e.frames[idx]) img = e.frames[idx];
                    }
                    ctx.drawImage(img, e.x - e.width/2, drawY - e.height, e.width, e.height);
                 } else {
                    ctx.fillStyle = e.color; 
                    ctx.fillRect(e.x - e.width/2, drawY - e.height, e.width, e.height);
                 }
             } else {
                 ctx.save();
                 ctx.translate(e.x, drawY);
                 ctx.scale(-1, 1); 
                 if (e.image) {
                    let img = e.image;
                    if (e.frames && e.frames.length > 0) {
                        const idx = e.frameIndex % e.frames.length;
                        if(e.frames[idx]) img = e.frames[idx];
                    }
                    ctx.drawImage(img, -e.width/2, -e.height, e.width, e.height);
                 } else {
                    ctx.fillStyle = e.color;
                    ctx.fillRect(-e.width/2, -e.height, e.width, e.height);
                 }
                 ctx.restore();
             }
          } else {
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
      });
      
      particlesRef.current.forEach(p => { 
          ctx.fillStyle = '#FFD700'; 
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          ctx.font = 'bold 24px Galmuri11, monospace'; 
          ctx.strokeText('HIT!', p.x, p.y);
          ctx.fillText('HIT!', p.x, p.y); 
      });
      
      // HUD
      // Player HUD
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 320, 60);
      ctx.fillStyle = '#fff'; ctx.font = '16px Galmuri11'; ctx.fillText('HERO', 20, 30);
      ctx.fillStyle = '#333'; ctx.fillRect(20, 40, 280, 20);
      const playerHpPct = Math.max(0, playerRef.current.hp / playerRef.current.maxHp);
      ctx.fillStyle = '#00E676'; 
      ctx.fillRect(20, 40, 280 * playerHpPct, 20);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 40, 280, 20);

      // Enemy HUD
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(dimensions.width - 330, 10, 320, 60);
      ctx.fillStyle = '#fff'; ctx.fillText('RIVAL NINJA', dimensions.width - 310, 30);
      ctx.fillStyle = '#333'; ctx.fillRect(dimensions.width - 310, 40, 280, 20);
      const enemyHpPct = Math.max(0, enemyRef.current.hp / enemyRef.current.maxHp);
      ctx.fillStyle = '#F44336'; 
      ctx.fillRect(dimensions.width - 310, 40, 280 * enemyHpPct, 20);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(dimensions.width - 310, 40, 280, 20);
  };

  // --- RENDER ---
  return (
    <div className="w-screen h-screen flex flex-col items-center bg-gray-900 overflow-hidden relative">
        {/* Full Screen Canvas for Game */}
        <canvas 
            ref={canvasRef} 
            width={dimensions.width} 
            height={dimensions.height} 
            className={`absolute inset-0 w-full h-full pixelated transition-opacity duration-500 ${phase === 'playing' || phase === 'gameover' || phase === 'victory' ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}
        />

        {/* Game Over / Victory Overlay */}
        {(phase === 'gameover' || phase === 'victory') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
                <div className="text-center text-white">
                    <h2 className="text-6xl mb-6 pixel-text animate-bounce">{phase === 'victory' ? 'YOU WIN!' : 'GAME OVER'}</h2>
                    <button onClick={() => setPhase('creation')} className="bg-yellow-500 hover:bg-yellow-400 text-black text-2xl px-8 py-4 pixel-button transform hover:scale-110 transition-transform">
                        NEW GAME
                    </button>
                </div>
            </div>
        )}

        {/* Creation UI - Centered */}
        {phase === 'creation' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-900 pixel-box overflow-y-auto z-10 relative">
                <div className="w-full max-w-6xl mb-2 flex justify-between items-center">
                     <a href="/" className="pixel-text text-white hover:text-yellow-400 transition-colors text-base no-underline">← BACK TO HOME</a>
                </div>
                <h2 className="pixel-label text-3xl mb-4 text-white" style={{ textShadow: '3px 3px 0px rgba(0, 0, 0, 0.5)' }}>PIXEL CHARACTER</h2>
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="pixel-box p-4" style={{ border: '3px solid #4169E1' }}>
                            <label className="pixel-label block text-sm mb-2">CHARACTER DESCRIPTION</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder='e.g., "cute pink-haired warrior"' className="pixel-input w-full text-base" rows={2} />
                        </div>
                        <div className="pixel-box p-4">
                            <label className="pixel-label block text-sm mb-2">PRIMARY COLOR</label>
                            <div className="flex flex-wrap gap-1">
                                {colorOptions.map((option) => (
                                    <button key={option.value} onClick={() => setColor(option.value)} className={`pixel-color-box ${color === option.value ? 'selected' : ''}`} style={{ backgroundColor: option.color, borderColor: option.color === '#FFFFFF' || option.color === 'transparent' ? 'black' : option.color, width: '32px', height: '32px' }} title={option.name} />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="pixel-box p-4">
                                <label className="pixel-label block text-sm mb-2">MOOD</label>
                                <div className="space-y-1">
                                    {moodOptions.map((option) => (
                                        <div key={option} className="pixel-radio-label flex items-center gap-2 cursor-pointer" onClick={() => setMood(option)}>
                                            <img src={mood === option ? "/radio-checked.png" : "/radio-unchecked.png"} alt={option} className="w-5 h-5 pixelated" />
                                            <span className="pixel-text text-sm">{option}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="pixel-box p-4">
                                <label className="pixel-label block text-sm mb-2">WEAPON</label>
                                <div className="flex flex-wrap gap-2">
                                    {weaponOptions.map((option) => (
                                        <button key={option} onClick={() => setWeapon(option)} className={`pixel-color-box ${weapon === option ? 'selected' : ''}`} style={{ backgroundColor: 'white', borderColor: 'black', width: '100%', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={option}>
                                            {option === 'Candy' && <img src="/candy-icon.png" alt="Candy" className="w-5 h-5 mr-2 pixelated object-contain" />}
                                            {option === 'Baguette' && <img src="/baguette-icon.png" alt="Baguette" className="w-5 h-5 mr-2 pixelated object-contain" />}
                                            {option === 'Magic Wand' && <img src="/magic-wand-icon.png" alt="Magic Wand" className="w-5 h-5 mr-2 pixelated object-contain" />}
                                            {option === 'Sword' && <img src="/sword-icon.png" alt="Sword" className="w-5 h-5 mr-2 pixelated object-contain" />}
                                            <span className="pixel-text text-xs text-black">{option}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <button onClick={generatePixelCharacter} disabled={genLoading} className="pixel-button w-full text-lg py-3">
                                {genLoading ? 'GENERATING...' : 'GENERATE (AI)'}
                            </button>
                            <label className="pixel-button w-full text-lg py-3 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer flex items-center justify-center text-center">
                                UPLOAD IMAGE
                                <input type="file" accept="image/*" onChange={handleCharacterUpload} className="hidden" />
                            </label>
                        </div>
                        {genLoading && (<div className="mt-2"><div className="flex items-center justify-between mb-1"><span className="pixel-text text-xs">Generating...</span><span className="pixel-text text-xs">{genProgress}%</span></div><div className="pixel-progress-bar h-2"><div className="pixel-progress-bar-fill" style={{ width: `${genProgress}%` }}></div></div></div>)}
                    </div>
                    <div className="space-y-4">
                        <div className="pixel-box h-full flex flex-col p-4">
                            <h3 className="pixel-label text-base mb-2">GENERATED PIXEL ART CHARACTER</h3>
                            <div className="flex-grow flex items-center justify-center bg-gray-800 rounded p-4 border-2 border-dashed border-gray-600 min-h-[250px]">
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Generated" className="w-full max-h-[300px] object-contain pixelated" />
                                ) : (
                                    <div className="text-center">
                                         <div className="pixelated inline-block mb-4 transform scale-125"><img src="/character-silhouette.png" alt="Silhouette" className="w-16 h-16 opacity-20" /></div>
                                         <p className="pixel-text text-gray-500 text-sm">NO CHARACTER GENERATED YET</p>
                                    </div>
                                )}
                            </div>
                            {generatedImage && (
                                <button onClick={() => setPhase('sprites')} className="pixel-button w-full mt-3 bg-green-500 text-white py-2 text-lg hover:bg-green-600">NEXT: SPRITES</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Sprite Gen UI - Centered */}
        {phase === 'sprites' && (
           <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-900 pixel-box overflow-y-auto z-10 relative">
               <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                     <h2 className="pixel-text text-white text-3xl mb-4">STEP 2: GENERATE SPRITES</h2>
                     <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <label className="pixel-text block text-lg mb-4 font-bold">ANIMATION TYPE</label>
                        <div className="flex flex-wrap gap-4 mb-6">
                           {['attack', 'attack2', 'jump', 'defense', 'dead'].map(type => (
                               <button key={type} onClick={() => setSpriteActionType(type as any)} className={`px-6 py-3 border-2 uppercase ${spriteActionType === type ? 'border-blue-500 bg-blue-100 transform -translate-y-1 shadow-md' : 'border-gray-300 hover:bg-gray-50'} pixel-text transition-all`}>
                                   {type}
                               </button>
                           ))}
                        </div>
                        <div className="p-4 bg-gray-100 rounded border-2 border-gray-200 mb-6 min-h-[100px]"><p className="pixel-text text-sm whitespace-pre-line leading-relaxed">{animationInfo}</p></div>
                        <button onClick={generateSprites} disabled={spriteLoading || !spriteReferenceImage} className="pixel-button w-full bg-indigo-600 text-white py-4 text-xl hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {spriteLoading ? 'GENERATING SPRITES...' : 'GENERATE FRAMES'}
                        </button>
                        <p className="pixel-text text-sm mt-2 text-black min-h-[20px]">{spriteStatus}</p>
                     </div>
                  </div>
                  <div className="space-y-4 bg-white p-6 border-4 border-black h-fit shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="pixel-text font-bold text-xl mb-4">GENERATED FRAMES</h3>
                      
                      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                          {attackSprites.length > 0 && (
                              <div><p className="text-xs font-bold mb-1">Attack</p><div className="grid grid-cols-4 gap-1">{attackSprites.map((f, i) => <img key={i} src={f} className="w-full border pixelated" />)}</div></div>
                          )}
                          {attack2Sprites.length > 0 && (
                              <div><p className="text-xs font-bold mb-1">Attack 2</p><div className="grid grid-cols-4 gap-1">{attack2Sprites.map((f, i) => <img key={i} src={f} className="w-full border pixelated" />)}</div></div>
                          )}
                          {jumpSprites.length > 0 && (
                              <div><p className="text-xs font-bold mb-1">Jump</p><div className="grid grid-cols-4 gap-1">{jumpSprites.map((f, i) => <img key={i} src={f} className="w-full border pixelated" />)}</div></div>
                          )}
                          {defenseSprites.length > 0 && (
                              <div><p className="text-xs font-bold mb-1">Defense</p><div className="grid grid-cols-4 gap-1">{defenseSprites.map((f, i) => <img key={i} src={f} className="w-full border pixelated" />)}</div></div>
                          )}
                          {deadSprites.length > 0 && (
                              <div><p className="text-xs font-bold mb-1">Dead</p><div className="grid grid-cols-4 gap-1">{deadSprites.map((f, i) => <img key={i} src={f} className="w-full border pixelated" />)}</div></div>
                          )}
                      </div>

                      {(attackSprites.length > 0 || attack2Sprites.length > 0 || jumpSprites.length > 0 || defenseSprites.length > 0 || deadSprites.length > 0) ? (
                          <div className="pt-4 border-t-2 border-gray-200">
                            <button onClick={downloadAllFrames} className="pixel-button w-full bg-green-600 text-white py-2 text-sm hover:bg-green-700 mb-3">DOWNLOAD ZIP</button>
                            <button onClick={() => setPhase('playing')} className="pixel-button w-full bg-red-500 text-white py-4 text-xl hover:bg-red-600 animate-bounce shadow-lg">START BATTLE!</button>
                          </div>
                      ) : (
                           <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-sm italic border-2 border-dashed border-gray-300">
                               Generate sprites to start
                           </div>
                      )}
                  </div>
               </div>
           </div>
        )}
    </div>
  );
}
