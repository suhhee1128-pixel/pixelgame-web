'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    p5: any;
  }
}

export default function BattleTab() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // p5 인스턴스를 저장할 변수
    let myP5: any = null;

    // p5.js 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js';
    script.async = true;
    
    const sketch = (p: any) => {
      // --- CONFIGURATION ---
      const SCREEN_W = 800;
      const SCREEN_H = 500;
      const GROUND_Y = 420; // Visual horizon
        const GRAVITY = 0.6;
        const FRICTION = 0.85;

        // --- GAME STATES ---
        const STATE_MENU = 0;
        const STATE_SELECT = 1;
        const STATE_GAME = 2;
        const STATE_GAMEOVER = 3;
        const STATE_VICTORY = 4;

        let gameState = STATE_MENU;
        let assets = {};
        let entities: Fighter[] = [];
        let particles: Particle[] = [];
        let player: Fighter;
        let camX = 0;
        let stageW = 3000;
        let wave = 0;
        let shakeFrames = 0;

        // Key States
        let keys: { [key: string]: boolean } = {
          ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
          z: false, x: false, c: false
        };

        let lastKeyTime = { ArrowLeft: 0, ArrowRight: 0 }; // For dashing

        // --- ENTITY CLASS ---
        class Fighter {
          pos: any;
          vel: any;
          dir: number;
          color: number[];
          isPlayer: boolean;
          maxHp: number;
          hp: number;
          speed: number;
          strength: number;
          state: string;
          stateTimer: number;
          animFrame: number;
          onGround: boolean;
          isDashing: boolean;
          attackCombo: number;
          hitbox: any;
          dead: boolean;
          deadTimer: number;

          constructor(x: number, y: number, dir: number, color: number[], isPlayer: boolean, stats: any) {
            this.pos = p.createVector(x, y);
            this.vel = p.createVector(0, 0);
            this.dir = dir; // 1 = right, -1 = left
            this.color = color;
            this.isPlayer = isPlayer;
            
            this.maxHp = stats.hp;
            this.hp = this.maxHp;
            this.speed = stats.spd;
            this.strength = stats.str;
            this.state = "IDLE";
            this.stateTimer = 0;
            this.animFrame = 0;
            
            this.onGround = true;
            this.isDashing = false;
            
            this.attackCombo = 0;
            this.hitbox = null;
            this.dead = false;
            this.deadTimer = 0;
          }

          update() {
            if (this.dead) {
              this.deadTimer--;
              return;
            }
            // Physics
            this.pos.add(this.vel);
            
            // Ground Collision
            if (this.pos.y >= 450) this.pos.y = 450; 
            if (this.pos.y <= 250) this.pos.y = 250; // Horizon limit
            
            // Gravity (Simulated Z jump height logic separate)
            if (this.pos.z === undefined) this.pos.z = 0; // z is height from ground
            this.pos.z += (this.vel.z || 0);
            
            if (this.pos.z > 0) {
              this.vel.z -= GRAVITY;
              this.onGround = false;
            } else {
              this.pos.z = 0;
              this.vel.z = 0;
              this.onGround = true;
              if (this.state === "JUMP_ATTACK") this.setState("IDLE");
              if (this.state === "JUMP") this.setState("IDLE");
              if (this.state === "HURT_AIR") this.setState("IDLE");
            }

            // Friction
            this.vel.x *= FRICTION;
            this.vel.y *= FRICTION;

            // State Machine
            this.stateTimer++;
            this.animFrame += 0.2;

            if (this.isPlayer) this.handlePlayerInput();
            else this.handleAI();

            this.handleStateLogic();
          }

          setState(newState: string) {
            if (this.state === newState) return;
            this.state = newState;
            this.stateTimer = 0;
            this.animFrame = 0;
            this.hitbox = null;
          }

          handlePlayerInput() {
            if (this.state === "HURT" || this.state === "HURT_AIR" || this.dead) return;
            if (this.state.includes("ATTACK")) return; // Lock input during attack

            let moveSpeed = this.isDashing ? this.speed * 2.5 : this.speed;

            // Movement
            if (this.onGround && (this.state === "IDLE" || this.state === "WALK" || this.state === "RUN")) {
              let moving = false;
              if (keys.ArrowLeft) { this.vel.x = -moveSpeed; this.dir = -1; moving = true; }
              if (keys.ArrowRight) { this.vel.x = moveSpeed; this.dir = 1; moving = true; }
              if (keys.ArrowUp) { this.vel.y = -moveSpeed * 0.7; moving = true; }
              if (keys.ArrowDown) { this.vel.y = moveSpeed * 0.7; moving = true; }
              
              if (keys.c) {
                this.setState("DEFEND");
                this.vel.mult(0);
                return;
              }

              if (moving) this.setState(this.isDashing ? "RUN" : "WALK");
              else {
                this.setState("IDLE");
                this.isDashing = false;
              }
            }
          }

          inputJump() {
            if (this.onGround && (this.state === "IDLE" || this.state === "WALK" || this.state === "RUN")) {
              this.vel.z = 10;
              this.setState("JUMP");
            }
          }

          dash(dir: number) {
            if (this.onGround && this.state !== "HURT") {
              this.dir = dir;
              this.isDashing = true;
              this.setState("RUN");
              // Dust effect
              particles.push(new Particle(this.pos.x, this.pos.y, 0, 0, [200,200,200], 20));
            }
          }

          inputAttack() {
            if (this.state === "HURT" || this.dead) return;

            if (!this.onGround) {
              this.setState("JUMP_ATTACK");
              this.hitbox = { x: 30, y: 10, w: 40, h: 40, damage: 8 };
              return;
            }

            if (this.state === "IDLE" || this.state === "WALK" || this.state === "RUN") {
              this.attackCombo = 1;
              this.setState("ATTACK1");
            } else if (this.state === "ATTACK1" && this.stateTimer > 10) {
              this.attackCombo = 2;
              this.setState("ATTACK2");
            } else if (this.state === "ATTACK2" && this.stateTimer > 10) {
              this.attackCombo = 3;
              this.setState("ATTACK3");
            }
          }

          handleAI() {
            if (this.dead || this.state === "HURT" || this.state === "HURT_AIR") return;
            
            let dist = p.dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
            let xDist = Math.abs(this.pos.x - player.pos.x);
            let yDist = Math.abs(this.pos.y - player.pos.y);

            // Simple behavior
            if (this.state.includes("ATTACK")) return;

            if (dist < 60 && yDist < 20) {
              // Attack range
              if (p.random() < 0.05) this.inputAttack();
            } else {
              // Chase
              let moveSpeed = this.speed * 0.8;
              if (this.pos.x > player.pos.x + 40) { this.vel.x = -moveSpeed; this.dir = -1; }
              else if (this.pos.x < player.pos.x - 40) { this.vel.x = moveSpeed; this.dir = 1; }
              
              if (this.pos.y > player.pos.y) this.vel.y = -moveSpeed * 0.5;
              else if (this.pos.y < player.pos.y) this.vel.y = moveSpeed * 0.5;

              if (this.vel.mag() > 0.1) this.setState("WALK");
              else this.setState("IDLE");
            }
          }

          handleStateLogic() {
            // Attack Hitboxes triggers at specific frames
            if (this.state === "ATTACK1") {
              this.vel.x = 0; // Stop moving
              if (this.stateTimer === 5) this.hitbox = { x: 30, y: 0, w: 40, h: 30, damage: this.strength };
              if (this.stateTimer > 20) this.setState("IDLE");
            }
            else if (this.state === "ATTACK2") {
              this.vel.x = this.dir * 2; // Step forward
              if (this.stateTimer === 5) this.hitbox = { x: 35, y: 0, w: 45, h: 30, damage: this.strength };
              if (this.stateTimer > 25) this.setState("IDLE");
            }
            else if (this.state === "ATTACK3") {
              this.vel.x = this.dir * 3; // Lunge
              if (this.stateTimer === 8) this.hitbox = { x: 40, y: 10, w: 50, h: 50, damage: this.strength * 1.5, knockback: 10 };
              if (this.stateTimer > 35) this.setState("IDLE");
            }
            else if (this.state === "DEFEND") {
              if (!keys.c && this.isPlayer) this.setState("IDLE");
              if (!this.isPlayer && this.stateTimer > 60) this.setState("IDLE");
            }
            else if (this.state === "HURT") {
              if (this.stateTimer > 15) this.setState("IDLE");
            }

            // Process Hitbox
            if (this.hitbox) {
              this.checkCollisions();
              // Remove hitbox immediately after checking (single frame hit)
              this.hitbox = null; 
            }
          }

          checkCollisions() {
            for (let e of entities) {
              if (e === this || e.dead || e.isPlayer === this.isPlayer) continue;
              
              // Check Hitbox overlap
              // Convert local hitbox to world coords
              let hx = this.pos.x + (this.hitbox.x * this.dir);
              let hy = (this.pos.y - this.pos.z) + this.hitbox.y;
              
              // Target Box (Body)
              let tx = e.pos.x;
              let ty = e.pos.y - e.pos.z;
              
              // X/Y overlap (Street Fighter logic: strict on Y(depth), loose on X)
              let xOverlap = Math.abs(hx - tx) < (this.hitbox.w + 20);
              let yOverlap = Math.abs(this.pos.y - e.pos.y) < 20; // Depth check
              let zOverlap = Math.abs(this.pos.z - e.pos.z) < 50; // Height check

              if (xOverlap && yOverlap && zOverlap) {
                e.takeDamage(this.hitbox.damage, this.dir, this.hitbox.knockback || 3);
                // Hit Effect
                shakeFrames = 5;
                for(let i=0; i<5; i++) {
                  particles.push(new Particle(tx, ty - 40, p.random(-2,2), p.random(-2,2), [255, 255, 0], 15));
                }
              }
            }
          }

          takeDamage(amount: number, hitDir: number, knockback: number) {
            if (this.state === "DEFEND") {
              amount *= 0.1; // Reduced damage
              knockback *= 0.5;
              particles.push(new Particle(this.pos.x, this.pos.y - 40, 0, -2, [100, 100, 255], 30)); // Spark
            } else {
              this.hp -= amount;
              this.vel.x = hitDir * knockback;
              this.vel.z = 5; // Pop up slightly
              this.setState("HURT");
              // Blood/Impact
              particles.push(new Particle(this.pos.x, this.pos.y - 40, hitDir*2, -2, [255, 50, 50], 30));
            }
            if (this.hp <= 0) {
              this.dead = true;
              this.deadTimer = 100; // Time before body disappears
              this.vel.x = hitDir * 5;
              this.vel.z = 8;
              this.state = "DEAD";
            }
          }

          draw() {
            p.push();
            p.translate(this.pos.x, this.pos.y - this.pos.z);
            
            // Shadow
            p.fill(0, 100);
            p.noStroke();
            p.ellipse(0, this.pos.z, 40, 10);
            p.scale(this.dir, 1);

            // Stickman Drawing (6-head tall approx 90px height)
            p.stroke(this.color);
            p.strokeWeight(4);
            p.noFill();
            let t = this.animFrame;
            
            // --- ANIMATION POSES ---
            
            // Default Joint Positions
            let head = p.createVector(0, -90);
            let neck = p.createVector(0, -75);
            let pelvis = p.createVector(0, -40);
            let kneeL = p.createVector(-10, -20);
            let footL = p.createVector(-15, 0);
            let kneeR = p.createVector(10, -20);
            let footR = p.createVector(15, 0);
            let elbowL = p.createVector(-15, -60);
            let handL = p.createVector(-20, -45);
            let elbowR = p.createVector(15, -60);
            let handR = p.createVector(20, -45);

            if (this.state === "IDLE") {
              head.y += Math.sin(t) * 2;
              handL.y += Math.sin(t) * 3;
              handR.y += Math.sin(t) * 3;
            } 
            else if (this.state === "WALK") {
              kneeL.x = Math.sin(t) * 15; footL.x = Math.sin(t) * 20;
              kneeR.x = Math.sin(t + Math.PI) * 15; footR.x = Math.sin(t + Math.PI) * 20;
              elbowL.x = Math.sin(t + Math.PI) * 15; handL.x = Math.sin(t + Math.PI) * 20;
              elbowR.x = Math.sin(t) * 15; handR.x = Math.sin(t) * 20;
            }
            else if (this.state === "RUN") {
              let s = 1.5;
              neck.x = 10; head.x = 15;
              kneeL.x = Math.sin(t*s) * 25; footL.x = Math.sin(t*s) * 35; footL.y = -10 + Math.cos(t*s)*10;
              kneeR.x = Math.sin(t*s + Math.PI) * 25; footR.x = Math.sin(t*s + Math.PI) * 35; footR.y = -10 + Math.cos(t*s+Math.PI)*10;
              handL.x = -20; handL.y = -60;
              handR.x = 20; handR.y = -60;
            }
            else if (this.state === "ATTACK1") { // Punch
              handR.x = 40; handR.y = -75; // Extend Right
              elbowR.x = 20; elbowR.y = -75;
              pelvis.x = 10;
            }
            else if (this.state === "ATTACK2") { // Kick
              footR.x = 45; footR.y = -50;
              kneeR.x = 20; kneeR.y = -50;
              pelvis.x = -5;
            }
            else if (this.state === "ATTACK3") { // Uppercut/Strong
              handR.x = 30; handR.y = -100;
              elbowR.x = 20; elbowR.y = -80;
              head.y = -100;
            }
            else if (this.state === "DEFEND") {
              handL.x = 10; handL.y = -80;
              handR.x = 15; handR.y = -75;
              head.x = -5;
            }
            else if (this.state === "HURT" || this.dead) {
              head.x = -10; head.y = -80;
              neck.x = -5; pelvis.x = -10;
              handL.y = -90; handR.y = -90;
              kneeL.x = 10; kneeR.x = -10;
            }
            else if (this.state === "JUMP" || this.state === "JUMP_ATTACK") {
              kneeL.y = -30; footL.y = -10;
              kneeR.y = -30; footR.y = -10;
              if (this.state === "JUMP_ATTACK") {
                footR.x = 40; footR.y = -20; // Jump Kick
              }
            }

            // Draw Limbs
            p.line(neck.x, neck.y, pelvis.x, pelvis.y); // Body
            p.line(pelvis.x, pelvis.y, kneeL.x, kneeL.y); p.line(kneeL.x, kneeL.y, footL.x, footL.y); // Left Leg
            p.line(pelvis.x, pelvis.y, kneeR.x, kneeR.y); p.line(kneeR.x, kneeR.y, footR.x, footR.y); // Right Leg
            p.line(neck.x, neck.y, elbowL.x, elbowL.y); p.line(elbowL.x, elbowL.y, handL.x, handL.y); // Left Arm
            p.line(neck.x, neck.y, elbowR.x, elbowR.y); p.line(elbowR.x, elbowR.y, handR.x, handR.y); // Right Arm
            
            // Draw Head
            p.fill(this.color);
            p.noStroke();
            p.ellipse(head.x, head.y, 25, 25);
            
            p.pop();
          }
        }

        // --- PARTICLE CLASS ---
        class Particle {
          pos: any;
          vel: any;
          color: number[];
          life: number;
          maxLife: number;

          constructor(x: number, y: number, vx: number, vy: number, color: number[], life: number) {
            this.pos = p.createVector(x, y);
            this.vel = p.createVector(vx, vy);
            this.color = color;
            this.life = life;
            this.maxLife = life;
          }
          
          update() {
            this.pos.add(this.vel);
            this.life--;
          }
          
          draw() {
            p.noStroke();
            let alpha = p.map(this.life, 0, this.maxLife, 0, 255);
            p.fill(this.color[0], this.color[1], this.color[2], alpha);
            p.ellipse(this.pos.x, this.pos.y, 8, 8);
          }
        }

        // --- SETUP & DRAW ---
        p.setup = () => {
          const canvas = p.createCanvas(SCREEN_W, SCREEN_H);
          canvas.parent(containerRef.current);
          p.noSmooth();
          p.textFont('Courier New');
        };

        p.draw = () => {
          p.background(50);
          
          // Screen Shake
          if (shakeFrames > 0) {
            p.translate(p.random(-3, 3), p.random(-3, 3));
            shakeFrames--;
          }

          switch(gameState) {
            case STATE_MENU: drawMenu(); break;
            case STATE_SELECT: drawSelect(); break;
            case STATE_GAME: drawGame(); break;
            case STATE_GAMEOVER: drawGameOver(); break;
            case STATE_VICTORY: drawVictory(); break;
          }

          // Always draw UI Overlay on top (Input Display)
          p.resetMatrix(); // Reset camera/shake for UI
          drawInputDisplay();
        };

        // --- INPUT HANDLING ---
        p.keyPressed = () => {
          // console.log("Key Pressed:", p.key, p.keyCode); // 디버깅용
          
          if (keys.hasOwnProperty(p.key)) keys[p.key] = true;
          // 대소문자 구분 없이 처리하기 위해 소문자로 변환
          const lowerKey = p.key.toLowerCase();
          if (keys.hasOwnProperty(lowerKey)) keys[lowerKey] = true;
          
          let keyName = codeToKey(p.keyCode);
          if (keyName && keys.hasOwnProperty(keyName)) keys[keyName] = true;

          // Menu Navigation
          if (gameState === STATE_MENU && lowerKey === 'z') gameState = STATE_SELECT;
          else if (gameState === STATE_GAMEOVER || gameState === STATE_VICTORY) {
            if (lowerKey === 'z') resetGame();
          }
          
          // Select Screen
          if (gameState === STATE_SELECT && lowerKey === 'z') {
              startGame(selectedChar);
          }
          
          // Dash Logic (Double Tap)
          let time = p.millis();
          if (gameState === STATE_GAME && player) {
            if (p.keyCode === p.LEFT_ARROW) {
              if (time - lastKeyTime.ArrowLeft < 250) player.dash(-1);
              lastKeyTime.ArrowLeft = time;
            }
            if (p.keyCode === p.RIGHT_ARROW) {
              if (time - lastKeyTime.ArrowRight < 250) player.dash(1);
              lastKeyTime.ArrowRight = time;
            }
            
            // Attack/Jump triggers
            if (lowerKey === 'z') player.inputAttack();
            if (lowerKey === 'x') player.inputJump();
          }
        };

        p.keyReleased = () => {
          if (keys.hasOwnProperty(p.key)) keys[p.key] = false;
          const lowerKey = p.key.toLowerCase();
          if (keys.hasOwnProperty(lowerKey)) keys[lowerKey] = false;
          
          let keyName = codeToKey(p.keyCode);
          if (keyName && keys.hasOwnProperty(keyName)) keys[keyName] = false;
        };

        function codeToKey(code: number) {
          if (code === 38) return 'ArrowUp';
          if (code === 40) return 'ArrowDown';
          if (code === 37) return 'ArrowLeft';
          if (code === 39) return 'ArrowRight';
          return '';
        }

        // --- GAME SCREENS ---
        function drawMenu() {
          p.textAlign(p.CENTER, p.CENTER);
          p.fill(255);
          p.textSize(50);
          p.text("STREET STICK FIGHTER", p.width/2, p.height/3);
          p.textSize(20);
          p.text("PRESS 'Z' TO START", p.width/2, p.height/2);
          
          p.fill(150);
          p.text("Controls:", p.width/2, p.height/2 + 60);
          p.text("Move: Arrows | Attack: Z | Jump: X | Defend: C | Dash: Double Tap", p.width/2, p.height/2 + 90);
        }

        let selectedChar = 0;
        const charTypes = [
          { name: "RYU (Balanced)", color: [50, 100, 255], stats: { hp: 100, spd: 4, str: 10 } },
          { name: "KEN (Speed)", color: [255, 50, 50], stats: { hp: 80, spd: 6, str: 8 } },
          { name: "HULK (Power)", color: [50, 200, 50], stats: { hp: 150, spd: 2, str: 15 } }
        ];

        function drawSelect() {
          p.textAlign(p.CENTER, p.CENTER);
          p.fill(255);
          p.textSize(30);
          p.text("SELECT FIGHTER", p.width/2, 50);

          for (let i = 0; i < 3; i++) {
            let x = p.width/4 * (i + 1);
            let y = p.height/2;
            
            if (keys.ArrowLeft && p.frameCount % 10 === 0) selectedChar = (selectedChar - 1 + 3) % 3;
            if (keys.ArrowRight && p.frameCount % 10 === 0) selectedChar = (selectedChar + 1) % 3;
            
            // Selection Box
            p.stroke(i === selectedChar ? 'yellow' : 'gray');
            p.strokeWeight(i === selectedChar ? 4 : 2);
            p.noFill();
            p.rect(x - 60, y - 80, 120, 200);
            // Preview Stickman
            p.noStroke();
            p.fill(charTypes[i].color);
            p.ellipse(x, y - 40, 30, 30); // Head
            p.stroke(charTypes[i].color);
            p.strokeWeight(4);
            p.line(x, y - 25, x, y + 30); // Body
            
            p.noStroke();
            p.fill(255);
            p.textSize(16);
            p.text(charTypes[i].name, x, y + 100);
            
            if (i === selectedChar && keys.z) {
              // startGame(i); // Z키 누름 처리 중복 방지, keyPressed에서 처리
            }
          }
          
          p.fill(200);
          p.textSize(14);
          p.text("Left/Right to Select, 'Z' to Confirm", p.width/2, p.height - 50);
        }

        function resetGame() {
          gameState = STATE_MENU;
          camX = 0;
          wave = 0;
        }

        function startGame(typeIndex: number) {
          entities = [];
          particles = [];
          camX = 0;
          wave = 1;
          let stats = charTypes[typeIndex].stats;
          player = new Fighter(100, 300, 1, charTypes[typeIndex].color, true, stats);
          entities.push(player);
          gameState = STATE_GAME;
        }

        function drawGame() {
          // Background & Camera
          p.push();
          
          // Parallax background
          p.background(30, 30, 40);
          p.fill(20);
          p.noStroke();
          p.rect(0, 0, p.width, p.height); // Sky
          
          // Floor
          p.fill(60);
          p.rect(0, 250, p.width, p.height);
          
          // Parallax buildings
          p.fill(40);
          for(let i=0; i<20; i++) {
            p.rect(i * 300 - (camX * 0.5) % 3000, 150, 100, 200);
          }
          p.translate(-camX, 0);
          
          // Stage Limits
          p.stroke(255, 0, 0);
          p.line(0, 250, 0, p.height);
          p.line(stageW, 250, stageW, p.height);

          // Sort entities by Y for depth
          entities.sort((a, b) => a.pos.y - b.pos.y);

          // Update & Draw Entities
          for (let i = entities.length - 1; i >= 0; i--) {
            let e = entities[i];
            e.update();
            e.draw();
            if (e.dead && e.deadTimer <= 0) entities.splice(i, 1);
          }

          // Particles
          for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
          }

          // Camera follow player
          if (player) {
            let targetCamX = player.pos.x - p.width/3;
            targetCamX = p.constrain(targetCamX, 0, stageW - p.width);
            camX += (targetCamX - camX) * 0.1;
          }

          // Wave Logic
          if (entities.filter(e => !e.isPlayer).length === 0) {
            if (player && player.pos.x > wave * 800) {
              spawnEnemyWave();
            }
          }

          // Win condition
          if (player && player.pos.x >= stageW - 100) {
            gameState = STATE_VICTORY;
          }
          
          // Lose condition
          if (player && player.hp <= 0) {
            gameState = STATE_GAMEOVER;
          }
          
          p.pop();
          
          // HUD
          drawHUD();
        }

        function spawnEnemyWave() {
          wave++;
          let count = wave + 1;
          for (let i = 0; i < count; i++) {
            let ex = player.pos.x + 400 + p.random(200);
            let ey = p.random(260, 450);
            // Ensure within bounds
            ex = p.constrain(ex, 0, stageW - 50);
            
            let type = p.random() > 0.7 ? 2 : 1; // 30% chance of strong enemy
            let color = type === 2 ? [150, 50, 150] : [100, 100, 100];
            let stats = type === 2 ? {hp: 60, spd: 2, str: 8} : {hp: 30, spd: 3, str: 5};
            
            entities.push(new Fighter(ex, ey, -1, color, false, stats));
          }
        }

        function drawHUD() {
          if (!player) return;
          
          // Player HP
          p.fill(0);
          p.rect(20, 20, 200, 20);
          p.fill(0, 255, 0);
          let hpW = p.map(player.hp, 0, player.maxHp, 0, 200);
          p.rect(20, 20, hpW, 20);
          p.stroke(255);
          p.noFill();
          p.rect(20, 20, 200, 20);
          
          p.fill(255);
          p.noStroke();
          p.textSize(16);
          p.textAlign(p.LEFT);
          p.text("PLAYER 1", 20, 15);
          
          p.textAlign(p.RIGHT);
          p.text("WAVE " + wave, p.width - 20, 30);
        }

        function drawGameOver() {
          p.fill(0, 150);
          p.rect(0,0,p.width,p.height);
          p.fill(255, 50, 50);
          p.textAlign(p.CENTER);
          p.textSize(60);
          p.text("GAME OVER", p.width/2, p.height/2);
          p.textSize(20);
          p.fill(255);
          p.text("Press 'Z' to Retry", p.width/2, p.height/2 + 50);
        }

        function drawVictory() {
          p.fill(0, 150);
          p.rect(0,0,p.width,p.height);
          p.fill(50, 255, 50);
          p.textAlign(p.CENTER);
          p.textSize(60);
          p.text("STAGE CLEAR!", p.width/2, p.height/2);
          p.textSize(20);
          p.fill(255);
          p.text("Press 'Z' to Return to Menu", p.width/2, p.height/2 + 50);
        }

        function drawInputDisplay() {
          let baseX = p.width / 2 - 100;
          let baseY = p.height - 50;
          let size = 30;
          let gap = 5;
          drawKey("ArrowUp", baseX + size + gap, baseY - size - gap, "↑");
          drawKey("ArrowDown", baseX + size + gap, baseY, "↓");
          drawKey("ArrowLeft", baseX, baseY, "←");
          drawKey("ArrowRight", baseX + (size + gap)*2, baseY, "→");
          drawKey("z", baseX + 150, baseY, "Z");
          drawKey("x", baseX + 190, baseY, "X");
          drawKey("c", baseX + 230, baseY, "C");
          
          p.fill(200);
          p.textSize(10);
          p.textAlign(p.CENTER);
          p.text("Att Jump Def", baseX + 190, baseY - 20);
        }

        function drawKey(kName: string, x: number, y: number, label: string) {
          let pressed = keys[kName];
          p.fill(pressed ? '#ffcc00' : '#444');
          p.stroke(200);
          p.strokeWeight(2);
          p.rect(x, y, 30, 30, 5);
          p.fill(pressed ? 0 : 255);
          p.noStroke();
          p.textSize(14);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(label, x + 15, y + 15);
        }
      };

    const initP5 = () => {
      if (containerRef.current) {
        // 기존 캔버스 제거 (중복 방지)
        containerRef.current.innerHTML = '';
      }
      
      if (window.p5) {
        myP5 = new window.p5(sketch);
      }
    };

    script.onload = initP5;
    
    // 이미 로드되어 있다면 바로 실행
    if (window.p5) {
      initP5();
    } else {
      document.body.appendChild(script);
    }

    return () => {
      if (myP5) {
        myP5.remove();
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[600px] bg-gray-900 rounded-lg p-4">
      <div ref={containerRef} className="shadow-2xl rounded-lg overflow-hidden border-4 border-gray-700"></div>
      <div className="mt-4 text-gray-400 text-sm text-center font-mono">
        <p>Click on the game area to focus</p>
        <p>Use Arrow Keys to Move • Z to Attack • X to Jump • C to Defend</p>
      </div>
    </div>
  );
}
