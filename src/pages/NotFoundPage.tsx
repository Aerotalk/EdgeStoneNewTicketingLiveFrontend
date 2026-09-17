import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Crosshair, Skull } from 'lucide-react';

export default function NotFoundPage() {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext();

        // Constants
        const GRAVITY = 0.6;
        const TERMINAL_VELOCITY = 12;
        const JUMP_FORCE = -11;
        const RUN_SPEED = 4.5;
        const WEAPONS = {
            normal: { type: 'normal', cooldown: 12, speed: 12, damage: 1, color: '#fff', sound: 'shoot' },
            machine: { type: 'machine', cooldown: 6, speed: 15, damage: 1, color: '#ef4444', sound: 'shoot' },
            spread: { type: 'spread', cooldown: 15, speed: 10, damage: 1, color: '#ef4444', sound: 'spread' }
        };

        // Game State Context
        const game = {
            canvas, ctx, audioCtx,
            keys: {} as Record<string, boolean>,
            keysJustPressed: {} as Record<string, boolean>,
            camera: { x: 0, y: 0 },
            platforms: [] as any[],
            enemies: [] as any[],
            bullets: [] as any[],
            particles: [] as any[],
            items: [] as any[],
            spawns: [] as any[],
            player: null as any,
            boss: null as any,
            score: 0,
            lives: 3,
            bossSpawned: false,
            endX: 5000,
            playSound: (type: string) => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                const now = audioCtx.currentTime;
                
                if (type === 'shoot') {
                    osc.type = 'square'; osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                    gain.gain.setValueAtTime(0.02, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    osc.start(now); osc.stop(now + 0.1);
                } else if (type === 'spread') {
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
                    gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                    osc.start(now); osc.stop(now + 0.15);
                } else if (type === 'explosion') {
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
                    osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
                    gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.start(now); osc.stop(now + 0.3);
                } else if (type === 'jump') {
                    osc.type = 'sine'; osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
                    gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.start(now); osc.stop(now + 0.2);
                } else if (type === 'hit') {
                    osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
                    gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.start(now); osc.stop(now + 0.2);
                } else if (type === 'boss_shoot') {
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                    gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    osc.start(now); osc.stop(now + 0.4);
                } else if (type === 'powerup') {
                    osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
                    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
                    gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.start(now); osc.stop(now + 0.2);
                }
            }
        };

        const createExplosion = (x: number, y: number, color: string, count: number) => {
            for (let i = 0; i < count; i++) {
                game.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
                    life: 1, color, size: Math.random() * 5 + 2,
                    decay: Math.random() * 0.03 + 0.01
                });
            }
        };

        const applyPhysics = (entity: any, platforms: any[]) => {
            if (entity.vy < TERMINAL_VELOCITY) entity.vy += GRAVITY;
            
            let oldY = entity.y;
            entity.y += entity.vy;
            entity.isGrounded = false;
            
            for (let p of platforms) {
                if (entity.x + entity.w > p.x && entity.x < p.x + p.w) {
                    if (p.type === 'solid') {
                        if (entity.vy >= 0 && oldY + entity.h <= p.y + 1 && entity.y + entity.h >= p.y) {
                            entity.y = p.y - entity.h; entity.vy = 0; entity.isGrounded = true;
                        } else if (entity.vy < 0 && oldY >= p.y + p.h - 1 && entity.y < p.y + p.h) {
                            entity.y = p.y + p.h; entity.vy = 0;
                        }
                    } else if (p.type === 'jump') {
                        if (entity.vy >= 0 && !entity.isDropping) {
                            if (oldY + entity.h <= p.y + 2 && entity.y + entity.h >= p.y) {
                                entity.y = p.y - entity.h; entity.vy = 0; entity.isGrounded = true;
                            }
                        }
                    }
                }
            }
            if (entity.isGrounded) entity.isDropping = false;

            entity.x += entity.vx;
            for (let p of platforms) {
                if (p.type === 'solid') {
                    if (entity.y + entity.h > p.y && entity.y < p.y + p.h) {
                        if (entity.x + entity.w > p.x && entity.x < p.x + p.w) {
                            if (entity.vx > 0) entity.x = p.x - entity.w;
                            else if (entity.vx < 0) entity.x = p.x + p.w;
                            entity.vx = 0;
                        }
                    }
                }
            }
        };

        class Bullet {
            x: number; y: number; w: number; h: number; vx: number; vy: number; isPlayer: boolean; color: string; active: boolean;
            constructor(x: number, y: number, vx: number, vy: number, isPlayer: boolean, color: string) {
                this.x = x; this.y = y; this.w = 6; this.h = 6;
                this.vx = vx; this.vy = vy; this.isPlayer = isPlayer; this.color = color; this.active = true;
            }
            update() { this.x += this.vx; this.y += this.vy; }
            draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - cx, this.y - cy, this.w, this.h);
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x - cx + 1, this.y - cy + 1, this.w-2, this.h-2);
            }
        }

        class Item {
            x: number; y: number; w: number; h: number; vx: number; vy: number; type: string; active: boolean; isGrounded: boolean; isDropping: boolean;
            constructor(x: number, y: number, type: string) {
                this.x = x; this.y = y; this.type = type;
                this.w = 24; this.h = 16;
                this.vx = (Math.random() - 0.5) * 4; this.vy = -6;
                this.active = true; this.isGrounded = false; this.isDropping = false;
            }
            update(game: any) {
                applyPhysics(this, game.platforms);
                if (this.isGrounded) { this.vy = -5; this.isGrounded = false; }
            }
            draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x - cx, this.y - cy, this.w, this.h);
                ctx.fillStyle = '#EF4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText(this.type === 'machine' ? 'M' : 'S', this.x - cx + 6, this.y - cy + 13);
            }
        }

        class Capsule {
            x: number; y: number; w: number; h: number; vx: number; vy: number; type: string; weaponType: string; active: boolean; hp: number; timer: number;
            constructor(x: number, y: number, weaponType: string) {
                this.x = x; this.y = y; this.type = 'capsule'; this.weaponType = weaponType;
                this.w = 30; this.h = 20; this.vx = -3; this.vy = 0;
                this.active = true; this.hp = 1; this.timer = 0;
            }
            update() {
                this.timer++; this.x += this.vx; this.y += Math.sin(this.timer * 0.1) * 2;
            }
            draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
                ctx.fillStyle = '#9CA3AF';
                ctx.beginPath();
                ctx.ellipse(this.x - cx + 15, this.y - cy + 10, 15, 10, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#EF4444';
                if (this.timer % 10 < 5) ctx.fillRect(this.x - cx + 10, this.y - cy + 5, 10, 10);
            }
        }

        class Turret {
            x: number; y: number; w: number; h: number; type: string; active: boolean; hp: number; timer: number; state: string; facing: number;
            constructor(x: number, y: number) {
                this.x = x; this.y = y; this.type = 'turret';
                this.w = 30; this.h = 30; this.hp = 8; this.timer = 0;
                this.active = true; this.state = 'hidden'; this.facing = -1;
            }
            update(game: any) {
                this.timer++;
                let dist = Math.sqrt(Math.pow(game.player.x - this.x, 2) + Math.pow(game.player.y - this.y, 2));
                
                if (this.state === 'hidden' && dist < 400 && this.timer > 100) {
                    this.state = 'opening'; this.timer = 0;
                } else if (this.state === 'opening' && this.timer > 30) {
                    this.state = 'open'; this.timer = 0;
                } else if (this.state === 'open') {
                    if (this.timer % 40 === 0 && this.timer < 120) {
                        game.playSound('shoot');
                        let angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                        game.bullets.push(new Bullet(this.x+15, this.y+15, Math.cos(angle)*6, Math.sin(angle)*6, false, '#EF4444'));
                    }
                    if (this.timer > 150) { this.state = 'closing'; this.timer = 0; }
                } else if (this.state === 'closing' && this.timer > 30) {
                    this.state = 'hidden'; this.timer = 0;
                }
            }
            draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
                ctx.fillStyle = '#374151';
                ctx.fillRect(this.x - cx, this.y - cy + 15, 30, 15);
                if (this.state !== 'hidden') {
                    let h = this.state === 'open' ? 15 : this.timer/2;
                    if (this.state === 'closing') h = 15 - this.timer/2;
                    ctx.fillStyle = '#EF4444';
                    ctx.fillRect(this.x - cx + 5, this.y - cy + 15 - h, 20, h);
                }
            }
        }

        class Soldier {
            x: number; y: number; w: number; h: number; type: string; subType: string; active: boolean; hp: number; timer: number; vx: number; vy: number; facing: number; isGrounded: boolean; isDropping: boolean;
            constructor(x: number, y: number, subType: string) {
                this.x = x; this.y = y; this.type = 'soldier'; this.subType = subType;
                this.w = 20; this.h = 40; this.hp = 1; this.timer = 0;
                this.vx = 0; this.vy = 0; this.facing = -1;
                this.active = true; this.isGrounded = false; this.isDropping = false;
            }
            update(game: any) {
                applyPhysics(this, game.platforms);
                this.timer++;
                
                if (this.subType === 'runner') {
                    this.vx = this.facing * RUN_SPEED * 0.8;
                    if (this.timer % 60 === 0 && Math.random() < 0.3) {
                        game.playSound('shoot');
                        game.bullets.push(new Bullet(this.x + 10, this.y + 10, this.facing * 5, 0, false, '#EF4444'));
                    }
                } else if (this.subType === 'sniper') {
                    this.facing = game.player.x < this.x ? -1 : 1;
                    if (this.timer % 90 === 0) {
                        game.playSound('shoot');
                        let angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                        game.bullets.push(new Bullet(this.x + 10, this.y + 10, Math.cos(angle)*7, Math.sin(angle)*7, false, '#EF4444'));
                    }
                }
            }
            draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
                ctx.save();
                ctx.translate(this.x - cameraX + this.w / 2, this.y - cameraY + this.h / 2);
                ctx.scale(this.facing, 1);

                const eBob = (Math.abs(this.vx) > 0.5 && this.isGrounded) ? Math.sin(this.timer * 0.4) * 2 : 0;

                ctx.fillStyle = '#166534'; // Legs
                ctx.fillRect(-6 - eBob, 0, 6, 20); ctx.fillRect(eBob, 0, 6, 20);
                ctx.fillStyle = '#111827'; // Boots
                ctx.fillRect(-8 - eBob, 15, 8, 5); ctx.fillRect(-2 + eBob, 15, 8, 5);
                ctx.fillStyle = '#166534'; // Torso
                ctx.fillRect(-8, -10 + eBob, 16, 15);
                ctx.fillStyle = '#fbccb4'; // Head
                ctx.fillRect(-6, -20 + eBob, 12, 12);
                ctx.fillStyle = '#166534'; // Helmet
                ctx.beginPath(); ctx.arc(0, -14 + eBob, 8, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#111'; // Gun
                ctx.fillRect(-4, -2 + eBob, 20, 4);
                ctx.restore();
            }
        }

        class Boss {
            x: number; y: number; w: number; h: number; type: string; active: boolean; core: any; turret1: any; turret2: any;
            constructor(x: number, y: number) {
                this.x = x; this.y = y; this.type = 'boss';
                this.w = 200; this.h = 400; this.active = true;
                this.core = { hp: 80, maxHp: 80, active: true, timer: 0 };
                this.turret1 = { hp: 30, active: true, timer: 0 };
                this.turret2 = { hp: 30, active: true, timer: 0 };
            }
            update(game: any) {
                if (this.turret1.active) {
                    this.turret1.timer++;
                    if (this.turret1.timer % 60 === 0) {
                        game.playSound('boss_shoot');
                        let angle = Math.atan2(game.player.y - (this.y + 100), game.player.x - (this.x + 20));
                        game.bullets.push(new Bullet(this.x+20, this.y+100, Math.cos(angle)*6, Math.sin(angle)*6, false, '#F59E0B'));
                    }
                }
                if (this.turret2.active) {
                    this.turret2.timer++;
                    if (this.turret2.timer % 80 === 0) {
                        game.playSound('boss_shoot');
                        let angle = Math.atan2(game.player.y - (this.y + 250), game.player.x - (this.x + 20));
                        game.bullets.push(new Bullet(this.x+20, this.y+250, Math.cos(angle)*6, Math.sin(angle)*6, false, '#F59E0B'));
                    }
                }
                if (this.core.active) {
                    this.core.timer++;
                    if (this.core.timer % 150 === 0) {
                        game.playSound('boss_shoot');
                        for(let i=0; i<3; i++) {
                            game.bullets.push(new Bullet(this.x + 50, this.y + 350 + (i-1)*20, -8, (i-1)*2, false, '#EF4444'));
                        }
                    }
                }
            }
            checkHit(b: Bullet, game: any) {
                let hit = false;
                if (this.turret1.active && b.x > this.x && b.x < this.x+40 && b.y > this.y+80 && b.y < this.y+120) {
                    this.turret1.hp -= 1;
                    if (this.turret1.hp <= 0) { this.turret1.active = false; game.playSound('explosion'); createExplosion(this.x+20, this.y+100, '#F59E0B', 30); game.score+=500; }
                    hit = true;
                }
                else if (this.turret2.active && b.x > this.x && b.x < this.x+40 && b.y > this.y+230 && b.y < this.y+270) {
                    this.turret2.hp -= 1;
                    if (this.turret2.hp <= 0) { this.turret2.active = false; game.playSound('explosion'); createExplosion(this.x+20, this.y+250, '#F59E0B', 30); game.score+=500; }
                    hit = true;
                }
                else if (this.core.active && b.x > this.x+20 && b.x < this.x+80 && b.y > this.y+320 && b.y < this.y+380) {
                    this.core.hp -= 1;
                    if (this.core.hp <= 0) { 
                        this.core.active = false; this.active = false; 
                        game.playSound('explosion'); createExplosion(this.x+50, this.y+350, '#EF4444', 100); 
                        game.score += 5000; 
                    }
                    hit = true;
                }
                return hit;
            }
            draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
                ctx.fillStyle = '#1E293B'; ctx.fillRect(this.x - cx, this.y - cy, this.w, this.h);
                if (this.turret1.active) { ctx.fillStyle = '#EF4444'; ctx.fillRect(this.x - cx, this.y - cy + 80, 40, 40); }
                else { ctx.fillStyle = '#000'; ctx.fillRect(this.x - cx, this.y - cy + 80, 40, 40); }
                
                if (this.turret2.active) { ctx.fillStyle = '#EF4444'; ctx.fillRect(this.x - cx, this.y - cy + 230, 40, 40); }
                else { ctx.fillStyle = '#000'; ctx.fillRect(this.x - cx, this.y - cy + 230, 40, 40); }
                
                if (this.core.active) {
                    ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(this.core.timer*0.1)*0.5})`;
                    ctx.beginPath(); ctx.arc(this.x - cx + 50, this.y - cy + 350, 40, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#4B5563'; ctx.fillRect(this.x - cx + 10, this.y - cy + 400, 80, 10);
                    ctx.fillStyle = '#EF4444'; ctx.fillRect(this.x - cx + 10, this.y - cy + 400, 80 * (this.core.hp / this.core.maxHp), 10);
                }
            }
        }

        class Player {
            x: number; y: number; w: number; h: number; vx: number; vy: number; facing: number;
            isGrounded: boolean; isCrouching: boolean; isSomersault: boolean; isDropping: boolean;
            aimDir: string; weapon: any; cooldown: number; invulnerable: number; frameCount: number; hp: number;

            constructor(x: number, y: number, hp: number) {
                this.x = x; this.y = y; this.w = 20; this.h = 40;
                this.vx = 0; this.vy = 0; this.facing = 1; this.hp = hp;
                this.isGrounded = false; this.isCrouching = false; this.isSomersault = false; this.isDropping = false;
                this.aimDir = 'straight'; this.weapon = WEAPONS.normal;
                this.cooldown = 0; this.invulnerable = 0; this.frameCount = 0;
            }

            update(game: any) {
                this.frameCount++;
                if (this.invulnerable > 0) this.invulnerable--;
                if (this.cooldown > 0) this.cooldown--;

                let keys = game.keys;
                let jp = game.keysJustPressed;

                let jumpPressed = jp['w'] || jp['ArrowUp'] || jp['z'] || jp['k'] || jp[' '];
                let shootPressed = keys['x'] || keys['j'] || keys['Shift'];
                let shootJustPressed = jp['x'] || jp['j'] || jp['Shift'];

                if (jumpPressed && this.isGrounded && !this.isCrouching) {
                    this.vy = JUMP_FORCE; this.isGrounded = false; this.isSomersault = true; game.playSound('jump');
                }

                let downPressed = keys['s'] || keys['ArrowDown'];
                let upPressed = keys['w'] || keys['ArrowUp'];
                let leftPressed = keys['a'] || keys['ArrowLeft'];
                let rightPressed = keys['d'] || keys['ArrowRight'];

                this.isCrouching = false;
                this.aimDir = 'straight';

                if (downPressed) {
                    if (this.isGrounded) {
                        if (leftPressed || rightPressed) {
                            this.aimDir = 'diag-down';
                            this.facing = leftPressed ? -1 : 1; this.vx = RUN_SPEED * this.facing;
                        } else {
                            this.isCrouching = true; this.vx = 0;
                            if (jumpPressed) {
                                this.isDropping = true; this.y += 5; this.isGrounded = false; this.isSomersault = false;
                            }
                        }
                    } else {
                        this.aimDir = 'diag-down';
                        if (leftPressed) { this.vx = -RUN_SPEED; this.facing = -1; }
                        else if (rightPressed) { this.vx = RUN_SPEED; this.facing = 1; }
                    }
                } else {
                    if (upPressed) {
                        this.aimDir = 'up';
                        if (leftPressed) { this.aimDir = 'diag-up'; this.vx = -RUN_SPEED; this.facing = -1; }
                        else if (rightPressed) { this.aimDir = 'diag-up'; this.vx = RUN_SPEED; this.facing = 1; }
                        else { this.vx = 0; }
                    } else {
                        if (leftPressed) { this.vx = -RUN_SPEED; this.facing = -1; }
                        else if (rightPressed) { this.vx = RUN_SPEED; this.facing = 1; }
                        else { this.vx = 0; }
                    }
                }

                applyPhysics(this, game.platforms);
                if (this.isGrounded) this.isSomersault = false;
                if (this.x < game.camera.x) this.x = game.camera.x;

                if (shootPressed) {
                    if (this.weapon.type === 'normal') {
                        if (shootJustPressed) this.fire(game);
                    } else {
                        if (this.cooldown <= 0) this.fire(game);
                    }
                }

                if (this.y > canvasRef.current!.height + 100) {
                    this.hp--; setLives(this.hp);
                    if (this.hp <= 0) { game.state = 'gameover'; } 
                    else {
                        this.x = game.camera.x + 100; this.y = 0; this.vx = 0; this.vy = 0;
                        this.invulnerable = 120;
                    }
                }
            }

            fire(game: any) {
                this.cooldown = this.weapon.cooldown;
                game.playSound(this.weapon.sound);

                let angle = 0;
                if (this.aimDir === 'straight') angle = this.facing === 1 ? 0 : Math.PI;
                else if (this.aimDir === 'up') angle = -Math.PI/2;
                else if (this.aimDir === 'diag-up') angle = this.facing === 1 ? -Math.PI/4 : -Math.PI*3/4;
                else if (this.aimDir === 'diag-down') angle = this.facing === 1 ? Math.PI/4 : Math.PI*3/4;

                let bx = this.x + this.w/2;
                let by = this.isCrouching ? this.y + 30 : this.y + 15;

                if (this.weapon.type === 'spread') {
                    for(let i=-2; i<=2; i++) {
                        let a = angle + i * 0.15;
                        game.bullets.push(new Bullet(bx, by, Math.cos(a)*this.weapon.speed, Math.sin(a)*this.weapon.speed, true, this.weapon.color));
                    }
                } else {
                    game.bullets.push(new Bullet(bx, by, Math.cos(angle)*this.weapon.speed, Math.sin(angle)*this.weapon.speed, true, this.weapon.color));
                }
            }

            draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
                if (this.invulnerable > 0 && Math.floor(this.frameCount / 4) % 2 === 0) return;

                ctx.save();
                ctx.translate(this.x - cameraX + this.w / 2, this.y - cameraY + this.h / 2);

                if (this.isSomersault) {
                    ctx.rotate(this.frameCount * 0.4 * this.facing);
                    ctx.fillStyle = '#fbccb4'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI); ctx.fill();
                    ctx.restore(); return;
                }

                ctx.scale(this.facing, 1);
                
                let headX = 0, headY = -10;
                let gunX = 5, gunY = 0;
                let gunRot = 0;

                if (this.isCrouching) {
                    headY = 5; gunY = 10; gunX = 10;
                } else {
                    if (this.aimDir === 'up') {
                        headY = -12; headX = -2; gunX = 2; gunY = -20; gunRot = -Math.PI/2;
                    } else if (this.aimDir === 'diag-up') {
                        gunX = 10; gunY = -15; gunRot = -Math.PI/4;
                    } else if (this.aimDir === 'diag-down') {
                        gunX = 10; gunY = 15; gunRot = Math.PI/4;
                    }
                }

                let bob = (this.vx !== 0 && this.isGrounded) ? Math.sin(this.frameCount * 0.5) * 2 : 0;
                let legDist = (this.vx !== 0 && this.isGrounded) ? Math.sin(this.frameCount * 0.5) * 6 : 3;
                
                if (this.isCrouching) {
                    ctx.fillStyle = '#1e3a8a';
                    ctx.fillRect(-10, 10, 15, 6); ctx.fillRect(-10, 10, 6, 10); ctx.fillRect(0, 15, 10, 5);
                } else {
                    ctx.fillStyle = '#1e3a8a';
                    ctx.fillRect(-3 - legDist, 5, 5, 15 - bob); ctx.fillRect(-3 + legDist, 5, 5, 15 + bob);
                }

                ctx.fillStyle = '#fbccb4';
                if (this.isCrouching) ctx.fillRect(-8, 0, 14, 12);
                else ctx.fillRect(-5, -5 + bob, 10, 12);

                ctx.fillStyle = '#fbccb4'; ctx.fillRect(headX - 5, headY - 5 + bob, 10, 10);
                ctx.fillStyle = '#fde047'; ctx.fillRect(headX - 6, headY - 7 + bob, 12, 4); ctx.fillRect(headX - 6, headY - 3 + bob, 4, 6);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(headX - 6, headY - 3 + bob, 12, 2);

                ctx.save();
                ctx.translate(gunX, gunY + bob); ctx.rotate(gunRot);
                ctx.fillStyle = '#4b5563'; ctx.fillRect(-4, -2, 20, 4);
                ctx.fillStyle = this.weapon.color === '#ef4444' ? '#ef4444' : '#1f2937'; ctx.fillRect(4, -3, 8, 6);
                ctx.restore();

                ctx.beginPath(); ctx.moveTo(0, headY + 5 + bob); ctx.lineTo(gunX, gunY + bob);
                ctx.lineWidth = 3; ctx.strokeStyle = '#fbccb4'; ctx.stroke();

                ctx.restore();
            }
        }

        // Initialize Level
        game.platforms = [
            { x: -500, y: 500, w: 1500, h: 200, type: 'solid' },
            { x: 1200, y: 500, w: 1000, h: 200, type: 'solid' },
            { x: 2400, y: 500, w: 1000, h: 200, type: 'solid' },
            { x: 3600, y: 500, w: 2000, h: 200, type: 'solid' },

            { x: 600, y: 400, w: 150, h: 20, type: 'jump' },
            { x: 800, y: 300, w: 150, h: 20, type: 'jump' },
            { x: 1000, y: 200, w: 400, h: 20, type: 'jump' },
            { x: 1600, y: 350, w: 300, h: 20, type: 'jump' },
            { x: 2000, y: 250, w: 200, h: 20, type: 'jump' },
            { x: 2600, y: 400, w: 200, h: 20, type: 'jump' },
            { x: 2900, y: 300, w: 200, h: 20, type: 'jump' },
            { x: 3200, y: 200, w: 200, h: 20, type: 'jump' },
            { x: 4200, y: 350, w: 500, h: 20, type: 'jump' },
            { x: 4200, y: 200, w: 500, h: 20, type: 'jump' },
        ];

        game.spawns = [
            { x: 400, type: 'runner' },
            { x: 800, type: 'sniper', ex: 900, ey: 260 },
            { x: 1000, type: 'capsule', weapon: 'spread', ey: 100 },
            { x: 1200, type: 'runner' },
            { x: 1400, type: 'turret', ex: 1750, ey: 320 },
            { x: 1600, type: 'runner' },
            { x: 1800, type: 'capsule', weapon: 'machine', ey: 150 },
            { x: 2100, type: 'sniper', ex: 2500, ey: 460 },
            { x: 2500, type: 'turret', ex: 2950, ey: 270 },
            { x: 2700, type: 'runner' },
            { x: 3000, type: 'runner' },
            { x: 3200, type: 'capsule', weapon: 'spread', ey: 100 },
            { x: 3400, type: 'sniper', ex: 3800, ey: 460 },
            { x: 3600, type: 'runner' }
        ];

        game.player = new Player(100, 300, lives);

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();

        let isRunning = true;
        let animationId: number;

        const handleKeyDown = (e: KeyboardEvent) => { if (!game.keys[e.key]) game.keysJustPressed[e.key] = true; game.keys[e.key] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { game.keys[e.key] = false; };
        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);

        const gameLoop = () => {
            if (!isRunning) return;
            
            game.player.update(game);
            
            let targetCameraX = game.player.x - canvas.width / 3;
            if (targetCameraX < 0) targetCameraX = 0;
            if (game.bossSpawned && targetCameraX > game.endX - canvas.width/2 + 300) targetCameraX = game.endX - canvas.width/2 + 300;
            game.camera.x += (targetCameraX - game.camera.x) * 0.1;

            while (game.spawns.length > 0 && game.camera.x > game.spawns[0].x - canvas.width) {
                let sp = game.spawns.shift();
                if (sp.type === 'runner') game.enemies.push(new Soldier(game.camera.x + canvas.width + 50, sp.ey || 0, 'runner'));
                else if (sp.type === 'sniper') game.enemies.push(new Soldier(sp.ex, sp.ey, 'sniper'));
                else if (sp.type === 'turret') game.enemies.push(new Turret(sp.ex, sp.ey));
                else if (sp.type === 'capsule') game.enemies.push(new Capsule(game.camera.x + canvas.width + 50, sp.ey, sp.weapon));
            }

            if (!game.bossSpawned && game.player.x > game.endX) {
                game.bossSpawned = true;
                game.boss = new Boss(game.endX + 300, 100);
                game.enemies.push(game.boss);
            }

            for (let i = game.enemies.length - 1; i >= 0; i--) {
                let e = game.enemies[i];
                e.update(game);
                if (e.y > canvas.height + 100 || !e.active) game.enemies.splice(i, 1);
                
                if (e.type !== 'boss' && e.type !== 'capsule' && game.player.invulnerable <= 0) {
                    if (game.player.x < e.x + e.w && game.player.x + game.player.w > e.x && game.player.y < e.y + e.h && game.player.y + game.player.h > e.y) {
                        game.playSound('hit'); createExplosion(game.player.x, game.player.y, '#fff', 20);
                        game.player.hp--; setLives(game.player.hp);
                        if (game.player.hp <= 0) (game as any).state = 'gameover';
                        else game.player.invulnerable = 120;
                    }
                }
            }

            for (let i = game.items.length - 1; i >= 0; i--) {
                let it = game.items[i];
                it.update(game);
                if (game.player.x < it.x + it.w && game.player.x + game.player.w > it.x && game.player.y < it.y + it.h && game.player.y + game.player.h > it.y) {
                    game.playSound('powerup');
                    game.player.weapon = WEAPONS[it.type as keyof typeof WEAPONS];
                    game.items.splice(i, 1);
                    game.score += 500;
                }
            }

            for (let i = game.bullets.length - 1; i >= 0; i--) {
                let b = game.bullets[i];
                b.update();
                
                let hitWall = false;
                for (let p of game.platforms) {
                    if (p.type === 'solid' && b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y) { hitWall = true; break; }
                }
                if (hitWall || b.x < game.camera.x - 200 || b.x > game.camera.x + canvas.width + 200) { game.bullets.splice(i, 1); continue; }
                
                if (b.isPlayer) {
                    let hitEnemy = false;
                    for (let j = game.enemies.length - 1; j >= 0; j--) {
                        let e = game.enemies[j];
                        if (e.type === 'boss') {
                            if (e.checkHit(b, game)) { game.bullets.splice(i, 1); hitEnemy = true; break; }
                        } else if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
                            e.hp -= 1; game.bullets.splice(i, 1); createExplosion(b.x, b.y, '#fff', 5); hitEnemy = true;
                            if (e.hp <= 0) {
                                e.active = false; game.playSound('explosion'); createExplosion(e.x+e.w/2, e.y+e.h/2, '#F59E0B', 20);
                                if (e.type === 'capsule') game.items.push(new Item(e.x, e.y, e.weaponType));
                                else game.score += e.type === 'turret' ? 200 : 100;
                            }
                            break;
                        }
                    }
                    if (hitEnemy) continue;
                } else {
                    if (game.player.invulnerable <= 0 && b.x < game.player.x + game.player.w && b.x + b.w > game.player.x && b.y < game.player.y + game.player.h && b.y + b.h > game.player.y) {
                        game.bullets.splice(i, 1); game.playSound('hit'); createExplosion(game.player.x, game.player.y, '#fff', 20);
                        game.player.hp--; setLives(game.player.hp);
                        if (game.player.hp <= 0) (game as any).state = 'gameover';
                        else game.player.invulnerable = 120;
                    }
                }
            }

            for (let i = game.particles.length - 1; i >= 0; i--) {
                let p = game.particles[i];
                p.x += p.vx; p.y += p.vy; p.life -= p.decay;
                if (p.life <= 0) game.particles.splice(i, 1);
            }

            ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < 40; i++) {
                let bx = ((i * 150) - (game.camera.x * 0.2)) % (canvas.width + 150) - 150;
                ctx.fillStyle = '#1E293B'; ctx.beginPath();
                ctx.moveTo(bx, canvas.height); ctx.lineTo(bx + 75, canvas.height - 200 - Math.sin(i)*50); ctx.lineTo(bx + 150, canvas.height); ctx.fill();
            }

            for(let p of game.platforms) {
                if (p.type === 'solid') {
                    ctx.fillStyle = '#064E3B'; ctx.fillRect(p.x - game.camera.x, p.y - game.camera.y, p.w, 10);
                    ctx.fillStyle = '#451A03'; ctx.fillRect(p.x - game.camera.x, p.y - game.camera.y + 10, p.w, p.h - 10);
                } else if (p.type === 'jump') {
                    ctx.fillStyle = '#B45309'; ctx.fillRect(p.x - game.camera.x, p.y - game.camera.y, p.w, p.h);
                    ctx.fillStyle = '#78350F'; for(let i=0; i<p.w; i+=20) ctx.fillRect(p.x - game.camera.x + i, p.y - game.camera.y, 2, p.h);
                }
            }

            for (let e of game.enemies) e.draw(ctx, game.camera.x, game.camera.y);
            for (let it of game.items) it.draw(ctx, game.camera.x, game.camera.y);
            for (let b of game.bullets) b.draw(ctx, game.camera.x, game.camera.y);
            game.player.draw(ctx, game.camera.x, game.camera.y);

            ctx.globalAlpha = 1;
            for (let p of game.particles) {
                ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x - game.camera.x, p.y - game.camera.y, p.size, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;

            setScore(game.score);
            game.keysJustPressed = {};

            if ((game as any).state === 'gameover') { isRunning = false; setTimeout(() => setGameState('gameover'), 1000); }
            if (game.bossSpawned && !game.boss.active) { isRunning = false; setTimeout(() => setGameState('victory'), 3000); }

            if (isRunning) animationId = requestAnimationFrame(gameLoop);
        };

        animationId = requestAnimationFrame(gameLoop);
        return () => { isRunning = false; cancelAnimationFrame(animationId); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); window.removeEventListener('resize', resize); };
    }, [gameState]);

    return (
        <div className="w-screen h-screen overflow-hidden bg-[#050505] relative flex items-center justify-center font-sans selection:bg-transparent text-white">
            {gameState === 'playing' && (
                <>
                    <canvas ref={canvasRef} className="absolute inset-0 z-10" />
                    <div className="absolute top-6 left-6 z-20 flex flex-col gap-1 pointer-events-none">
                        <div className="text-white font-black text-3xl tracking-tight drop-shadow-md">
                            SCORE: {score.toString().padStart(6, '0')}
                        </div>
                    </div>
                    <div className="absolute top-6 right-6 z-20 flex gap-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`w-10 h-10 border-2 flex items-center justify-center transition-all ${i < lives ? 'border-white bg-white/20' : 'border-gray-700 bg-transparent opacity-50'}`}>
                                <Skull size={20} className={i < lives ? 'text-white' : 'text-gray-700'} />
                            </div>
                        ))}
                    </div>
                    <div className="absolute bottom-6 right-6 z-20 text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase pointer-events-none text-right">
                        WASD / ARROWS : MOVE/AIM<br/>SPACE / K / Z : JUMP & SOMERSAULT<br/>SHIFT / J / X : FIRE WEAPON
                    </div>
                </>
            )}

            {gameState === 'menu' && (
                <div className="z-20 flex flex-col items-center animate-in zoom-in duration-500">
                    <h1 className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-orange-400 to-yellow-300 leading-none drop-shadow-2xl tracking-tighter mb-12">
                        CONTRA: 404
                    </h1>
                    <button 
                        onClick={() => { setScore(0); setLives(3); setGameState('playing'); }}
                        className="px-12 py-5 bg-white text-black rounded-none font-black text-[18px] tracking-widest transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-3 border-4 border-white hover:bg-transparent hover:text-white"
                    >
                        <Crosshair size={24} /> INSERT COIN (START)
                    </button>
                    <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 text-gray-500 hover:text-white font-bold tracking-widest text-[12px] uppercase transition-colors">
                        EXIT TO DASHBOARD
                    </button>
                </div>
            )}

            {gameState === 'gameover' && (
                <div className="z-20 flex flex-col items-center animate-in slide-in-from-bottom-10 duration-500">
                    <h2 className="text-[80px] font-black text-red-600 mb-2 tracking-tighter drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]">GAME OVER</h2>
                    <div className="text-2xl font-bold text-gray-400 tracking-[0.2em] mb-12">SCORE: {score.toString().padStart(6, '0')}</div>
                    <div className="flex gap-4">
                        <button onClick={() => { setScore(0); setLives(3); setGameState('playing'); }} className="px-8 py-4 bg-red-600 text-white font-black tracking-widest hover:bg-red-500 transition-colors border-2 border-red-600">CONTINUE?</button>
                        <button onClick={() => setGameState('menu')} className="px-8 py-4 bg-transparent text-gray-400 border-2 border-gray-700 hover:text-white hover:border-gray-500 font-bold tracking-widest transition-colors">QUIT</button>
                    </div>
                </div>
            )}

            {gameState === 'victory' && (
                <div className="z-20 flex flex-col items-center animate-in zoom-in duration-1000">
                    <h2 className="text-[80px] font-black text-green-500 mb-2 tracking-tighter drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]">MISSION ACCOMPLISHED</h2>
                    <div className="text-4xl font-black text-white tracking-[0.2em] mb-12 border-y-4 border-gray-800 py-6 w-full text-center">FINAL SCORE: {score.toString().padStart(6, '0')}</div>
                    <button onClick={() => navigate('/')} className="px-10 py-5 bg-white text-black font-black text-xl tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-3">
                        <Home size={24} /> RETURN TO DASHBOARD
                    </button>
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
        </div>
    );
}
