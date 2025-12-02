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
    jumpFrames?: (HTMLImageElement | HTMLCanvasElement)[];
    attackBox?: { x: number, y: number, w: number, h: number, active: boolean, damage?: number, knockback?: number }; // Added damage/knockback
    hitTimer: number;
    isDashing?: boolean; // Added
    attackCombo?: number; // Added
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
  const [spriteActionType, setSpriteActionType] = useState<'attack' | 'jump'>('attack');
  const [spriteReferenceImage, setSpriteReferenceImage] = useState<File | null>(null);
  const [attackSprites, setAttackSprites] = useState<string[]>([]);
  const [jumpSprites, setJumpSprites] = useState<string[]>([]);
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

  // --- Effects ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
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
        
        // Trigger Actions immediately on press (Z: Attack, X: Jump)
        if (phase === 'playing' && playerRef.current.hp > 0) {
             if (e.code === 'KeyZ') performAttack(playerRef.current, 'attack');
             if (e.code === 'KeyX') {
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
  }, []);

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
    } else {
      setAnimationInfo('Frame 1: Original\nFrame 2: Prep\nFrame 3: Launch\nFrame 4: Rising\nFrame 5: Apex\nFrame 6: Descend\nFrame 7: Land\nFrame 8: Sheet');
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
            else setJumpSprites(data.frames);
            setSpriteStatus(`✅ ${spriteActionType} animation generated successfully!`);
        } else {
            setSpriteStatus(`❌ Error: ${data.error}`);
        }
    } catch(e: any) { setSpriteStatus(`❌ Error: ${e.message}`); }
    setSpriteLoading(false);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'attack' | 'jump') => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        const urls = files.map(file => URL.createObjectURL(file));
        
        if (type === 'attack') setAttackSprites(urls);
        else setJumpSprites(urls);
        
        setSpriteStatus(`✅ Custom ${type} sprites loaded (${files.length} frames)`);
    }
  };

  const downloadAllFrames = async () => {
    const framesToDownload = spriteActionType === 'attack' ? attackSprites : jumpSprites;
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
    particlesRef.current = [];
    const loop = () => {
        update();
        draw();
        if (phase === 'playing') requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
  };

  const update = () => {
    if (playerRef.current.hp <= 0) setPhase('gameover');
    if (enemyRef.current.hp <= 0) setPhase('victory');
    updateEntity(playerRef.current, keysPressed.current);
    updateAI(enemyRef.current, playerRef.current);
    updateParticles();
  };

  const updateEntity = (e: Entity, keys: { [key: string]: boolean }) => {
    if (e.state === 'dead') return;
    
    e.animFrame += 0.2;

    // Hit Stun
    if (e.state === 'hit') {
        if (e.hitTimer > 0) {
            e.hitTimer--;
            if (e.hitTimer === 0) e.state = 'idle';
        }
        // Apply Gravity during hit
        e.y += e.vy;
        if (e.y >= GROUND_Y) { e.y = GROUND_Y; e.vy = 0; }
        else e.vy += GRAVITY;
        
        e.x += e.vx; // Knockback
        return;
    }

    // Defense
    if (e.type === 'player' && keys['KeyC']) {
        e.state = 'defend';
        e.vx = 0;
    } else if (e.state === 'defend') {
        e.state = 'idle';
    }

    // Attack Logic (State Machine handled in performAttack/Animation loop)
    if (e.state === 'attack') {
        // Lock movement during attack
        e.vx = 0;
        if (e.attackFrames && e.frames !== e.attackFrames) {
            e.frames = e.attackFrames;
            e.frameIndex = 0;
            e.frameTimer = 0;
        }
        // Update attack box position
        if (e.attackBox) {
            e.attackBox.x = e.x + (e.facing === 1 ? 0 : -e.attackBox.w);
            e.attackBox.y = e.y - 100;
        }
    } else {
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
                e.state = 'idle'; // Technically jump
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

            // Jump
            if (keys['KeyX'] && onGround) { e.vy = -18; } 
            
            // Attack Trigger
            if (keys['KeyZ']) performAttack(e, 'attack');
        }
    }

    // Physics 2D
    e.x += e.vx; 
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
      if (enemy.state === 'hit' || enemy.state === 'dead') return;
      
      enemy.animFrame += 0.2;

      const dx = player.x - enemy.x;
      const dist = Math.abs(dx);
      
      // Simple AI
      if (dist > 80) {
          enemy.vx = dx > 0 ? 3 : -3;
          enemy.state = 'move';
          enemy.facing = dx > 0 ? 1 : -1;
      } else {
          enemy.vx = 0; 
          // Attack chance
          if (Math.random() < 0.02 && enemy.state !== 'attack') performAttack(enemy, 'attack');
          else enemy.state = 'idle';
      }
      
      // Physics 2D
      enemy.x += enemy.vx; 
      if (enemy.x < 0) enemy.x = 0; if (enemy.x > CANVAS_WIDTH) enemy.x = CANVAS_WIDTH;

      enemy.y += enemy.vy;
      if (enemy.y > GROUND_Y) {
          enemy.y = GROUND_Y;
          enemy.vy = 0;
      } else if (enemy.y < GROUND_Y) {
          enemy.vy += GRAVITY;
      }

      // Animation update
      enemy.frameTimer++;
      if (enemy.frameTimer > 12) {
          enemy.frameTimer = 0;
          if (enemy.frames && enemy.frames.length > 0) {
             enemy.frameIndex++;
             if (enemy.state === 'attack') {
                if (enemy.frameIndex >= 8) { enemy.frameIndex = 0; enemy.state = 'idle'; if(enemy.attackBox) enemy.attackBox.active = false; }
                if (enemy.frameIndex === 4 && enemy.attackBox) enemy.attackBox.active = true;
             } else {
                 if (enemy.frameIndex > 1) enemy.frameIndex = 0;
             }
          }
      }
      
      // Update Attack Box
      if (enemy.state === 'attack' && enemy.attackBox) {
          enemy.attackBox.x = enemy.x + (enemy.facing === 1 ? 0 : -enemy.attackBox.w);
          enemy.attackBox.y = enemy.y - 100;
      }

      // Enemy Hitbox
      if (enemy.attackBox && enemy.attackBox.active) {
          if (checkCollision(enemy.attackBox, player)) {
              takeDamage(player, 5, enemy.facing, 5);
              enemy.attackBox.active = false;
              spawnParticle(player.x, player.y - 50, 'hit');
          }
      }
  };

  const performAttack = (e: Entity, type: string) => {
      if (e.state === 'attack') return; // Already attacking
      e.state = 'attack'; e.vx = 0;
      e.frameIndex = 0; // Start from frame 0
      // Hitbox parameters
      e.attackBox = { 
          x: 0, // Set in update loop
          y: 0, 
          w: 80, 
          h: 80, 
          active: false,
          damage: 10,
          knockback: 10
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
            // Stickman specific transform
            ctx.translate(e.x, spriteY); // Anchor at feet
            ctx.scale(e.facing, 1);
            drawStickman(ctx, e);
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
  if (phase === 'creation') {
      return (
        <div className="w-full h-full min-h-[500px] flex flex-col items-center p-4 bg-gray-900 pixel-box overflow-y-auto">
            <h2 className="pixel-label text-3xl mb-6 text-white" style={{ textShadow: '3px 3px 0px rgba(0, 0, 0, 0.5)' }}>PIXEL CHARACTER</h2>
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="pixel-box" style={{ border: '3px solid #4169E1' }}>
                        <label className="pixel-label block text-base mb-3">CHARACTER DESCRIPTION</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder='e.g., "cute pink-haired warrior"' className="pixel-input w-full" rows={3} />
                    </div>
                    <div className="pixel-box">
                        <label className="pixel-label block text-base mb-3">HAIR COLOR / PRIMARY COLOR</label>
                        <div className="flex flex-wrap" style={{ gap: '5px', rowGap: '0px' }}>
                            {colorOptions.map((option) => (
                                <button key={option.value} onClick={() => setColor(option.value)} className={`pixel-color-box ${color === option.value ? 'selected' : ''}`} style={{ backgroundColor: option.color, borderColor: option.color === '#FFFFFF' || option.color === 'transparent' ? 'black' : option.color }} title={option.name} />
                            ))}
                        </div>
                    </div>
                    <div className="pixel-box">
                        <label className="pixel-label block text-base mb-3">MOOD</label>
                        <div className="space-y-2">
                            {moodOptions.map((option) => (
                                <div key={option} className="pixel-radio-label flex items-center gap-2 cursor-pointer" onClick={() => setMood(option)}>
                                    <img src={mood === option ? "/radio-checked.png" : "/radio-unchecked.png"} alt={option} className="pixel-radio-image w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                                    <span className="pixel-text text-base select-none">{option}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pixel-box">
                        <label className="pixel-label block text-base mb-3">WEAPON</label>
                        <div className="flex flex-wrap" style={{ gap: '5px', rowGap: '0px' }}>
                            {weaponOptions.map((option) => (
                                <button key={option} onClick={() => setWeapon(option)} className={`pixel-color-box ${weapon === option ? 'selected' : ''}`} style={{ backgroundColor: 'white', borderColor: 'black', minWidth: (option === 'Candy' || option === 'Baguette' || option === 'Magic Wand' || option === 'Sword') ? '180px' : '100px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingLeft: (option === 'Candy' || option === 'Baguette' || option === 'Magic Wand' || option === 'Sword') ? '20px' : '0px', paddingRight: (option === 'Candy' || option === 'Baguette' || option === 'Magic Wand' || option === 'Sword') ? '20px' : '0px' }} title={option}>
                                    {option === 'Candy' && <img src="/candy-icon.png" alt="Candy" style={{ width: '50px', height: '50px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    {option === 'Baguette' && <img src="/baguette-icon.png" alt="Baguette" style={{ width: '50px', height: '50px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    {option === 'Magic Wand' && <img src="/magic-wand-icon.png" alt="Magic Wand" style={{ width: '50px', height: '50px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    {option === 'Sword' && <img src="/sword-icon.png" alt="Sword" style={{ width: '50px', height: '50px', imageRendering: 'pixelated', objectFit: 'contain' }} />}
                                    <span className="pixel-text text-base" style={{ color: 'black', textAlign: 'center' }}>{option}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={generatePixelCharacter} disabled={genLoading} className="pixel-button w-full text-lg">
                            {genLoading ? 'GENERATING...' : 'GENERATE (AI)'}
                        </button>
                        <label className="pixel-button w-full text-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer flex items-center justify-center text-center">
                            UPLOAD IMAGE
                            <input type="file" accept="image/*" onChange={handleCharacterUpload} className="hidden" />
                        </label>
                    </div>
                    {genLoading && (<div className="mt-4"><div className="flex items-center justify-between mb-2"><span className="pixel-text text-sm">Generating...</span><span className="pixel-text text-sm">{genProgress}%</span></div><div className="pixel-progress-bar"><div className="pixel-progress-bar-fill" style={{ width: `${genProgress}%` }}></div></div></div>)}
                </div>
                <div className="space-y-6">
                    <div className="pixel-box">
                        <h3 className="pixel-label text-lg mb-4">GENERATED PIXEL ART CHARACTER</h3>
                        {!generatedImage && (
                            <div className="relative mb-4" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img src="/speech-bubble.png" alt="Speech bubble" style={{ imageRendering: 'pixelated', maxWidth: '150px' }} />
                                    <p className="pixel-text" style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)', color: 'black', textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>Hi</p>
                                </div>
                            </div>
                        )}
                        {generatedImage ? (
                            <div className="relative">
                                <img src={generatedImage} alt="Generated" className="w-full" style={{ imageRendering: 'pixelated' }} />
                                <button onClick={() => setPhase('sprites')} className="pixel-button w-full mt-4 bg-green-500 text-white py-3 text-lg hover:bg-green-600">NEXT: SPRITES</button>
                            </div>
                        ) : (
                            <div className="w-full h-64 flex flex-col items-center justify-center gap-4">
                                <div style={{ imageRendering: 'pixelated', transform: 'scale(3)' }}><img src="/character-silhouette.png" alt="Silhouette" style={{ filter: 'brightness(0)', width: '80px', height: '80px', objectFit: 'contain' }} /></div>
                                <p className="pixel-text text-gray-500" style={{ marginTop: '40px' }}>NO CHARACTER GENERATED YET</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  if (phase === 'sprites') {
      return (
        <div className="w-full h-full min-h-[500px] flex flex-col items-center p-4 bg-gray-900 pixel-box overflow-y-auto">
           <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                 <h2 className="pixel-text text-white text-2xl mb-4">STEP 2: GENERATE SPRITES</h2>
                 <div className="bg-white p-4 border-4 border-black">
                    <label className="pixel-text block text-sm mb-2 font-bold">ANIMATION TYPE</label>
                    <div className="flex gap-4 mb-4">
                       <button onClick={() => setSpriteActionType('attack')} className={`px-4 py-2 border-2 ${spriteActionType === 'attack' ? 'border-blue-500 bg-blue-100' : 'border-gray-300'} pixel-text`}>ATTACK</button>
                       <button onClick={() => setSpriteActionType('jump')} className={`px-4 py-2 border-2 ${spriteActionType === 'jump' ? 'border-blue-500 bg-blue-100' : 'border-gray-300'} pixel-text`}>JUMP</button>
                    </div>
                    <div className="p-3 bg-gray-100 rounded border-2 border-gray-200 mb-4"><p className="pixel-text text-xs whitespace-pre-line">{animationInfo}</p></div>
                    <button onClick={generateSprites} disabled={spriteLoading || !spriteReferenceImage} className="pixel-button w-full bg-indigo-600 text-white py-3 text-lg hover:bg-indigo-700 disabled:bg-gray-400">
                        {spriteLoading ? 'GENERATING SPRITES...' : 'GENERATE FRAMES'}
                    </button>
                    <p className="pixel-text text-sm mt-2 text-black">{spriteStatus}</p>
                 </div>
              </div>
              <div className="space-y-4 bg-white p-4 border-4 border-black h-fit">
                  <h3 className="pixel-text font-bold">GENERATED FRAMES</h3>
                  <div className="mb-2">
                      <p className="text-xs mb-1 font-bold">Or Upload Your Own:</p>
                      <div className="flex gap-2 flex-col">
                        <label className="pixel-button bg-gray-200 text-black text-xs cursor-pointer flex items-center justify-center">
                            UPLOAD ATTACK FRAMES
                            <input type="file" multiple accept="image/*" onChange={(e) => handleCustomUpload(e, 'attack')} className="hidden" />
                        </label>
                        <label className="pixel-button bg-gray-200 text-black text-xs cursor-pointer flex items-center justify-center">
                            UPLOAD JUMP FRAMES
                            <input type="file" multiple accept="image/*" onChange={(e) => handleCustomUpload(e, 'jump')} className="hidden" />
                        </label>
                      </div>
                  </div>

                  {attackSprites.length > 0 || jumpSprites.length > 0 ? (
                      <div className="space-y-2">
                          {attackSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold">Attack ({attackSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {attackSprites.map((frame, i) => <img key={`atk-${i}`} src={frame} className="w-full border border-gray-300" style={{ imageRendering: 'pixelated' }} />)}
                                  </div>
                              </div>
                          )}
                          {jumpSprites.length > 0 && (
                              <div>
                                  <p className="text-xs font-bold">Jump ({jumpSprites.length})</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {jumpSprites.map((frame, i) => <img key={`jmp-${i}`} src={frame} className="w-full border border-gray-300" style={{ imageRendering: 'pixelated' }} />)}
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No frames yet</div>}
                  
                  {(attackSprites.length > 0 || jumpSprites.length > 0) && (
                      <>
                        <button onClick={downloadAllFrames} className="pixel-button w-full bg-green-600 text-white py-2 text-sm hover:bg-green-700 mb-2">DOWNLOAD CURRENT (ZIP)</button>
                        <button onClick={() => setPhase('playing')} className="pixel-button w-full bg-red-500 text-white py-3 text-lg hover:bg-red-600 animate-bounce">START BATTLE!</button>
                      </>
                  )}
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
