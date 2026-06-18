/**
 * Zen Bubble Popper - Game Core Logic
 * Fully gaze-driven VR gameplay using A-Frame and synthesized Web Audio.
 */

// ==========================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.ambientInterval = null;
        this.droneOsc1 = null;
        this.droneOsc2 = null;
        this.droneGain = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // High quality organic bubble pop sound (sine sweep + bandpass filtered noise)
    playPop() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        // Fast sweep downwards to simulate bubble membrane snapping
        osc.frequency.setValueAtTime(750, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);
        
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.07);
        
        // Dynamic noise burst for high frequency "snapping" texture
        try {
            const bufferSize = this.ctx.sampleRate * 0.012; // ~12ms
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(4500, t);
            filter.Q.setValueAtTime(4, t);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.1, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
            
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            
            noise.start(t);
            noise.stop(t + 0.02);
        } catch (e) {
            console.warn("Pop noise synthesis failed: ", e);
        }
    }

    // Sparkling chime sound for golden multiplier
    playChime() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        // Ascending pentatonic arpeggio (C5, D5, G5, C6)
        const freqs = [523.25, 587.33, 783.99, 1046.50];
        
        freqs.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = t + index * 0.05;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(noteStart + 0.36);
        });
    }

    // Explosive sweep whoosh for star bubbles popping all on screen
    playBlast() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.35);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.36);
        
        // Low pass noise burst for a satisfying soft boom
        try {
            const bufferSize = this.ctx.sampleRate * 0.25; // 250ms
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.08, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            
            noise.start(t);
            noise.stop(t + 0.26);
        } catch (e) {}
    }

    // Starts ambient zen background drone (C3 & G3) and schedules random high chimes
    startAmbience() {
        this.resume();
        if (!this.ctx) return;
        if (this.droneOsc1) return; // already playing
        
        const t = this.ctx.currentTime;
        
        // Create gain for background drone
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.setValueAtTime(0, t);
        this.droneGain.gain.linearRampToValueAtTime(0.04, t + 2.0); // smooth fade in
        this.droneGain.connect(this.ctx.destination);
        
        // C3 drone osc
        this.droneOsc1 = this.ctx.createOscillator();
        this.droneOsc1.type = 'sine';
        this.droneOsc1.frequency.value = 130.81;
        this.droneOsc1.connect(this.droneGain);
        this.droneOsc1.start(t);
        
        // G3 drone osc (perfect fifth)
        this.droneOsc2 = this.ctx.createOscillator();
        this.droneOsc2.type = 'sine';
        this.droneOsc2.frequency.value = 196.00;
        this.droneOsc2.connect(this.droneGain);
        this.droneOsc2.start(t);
        
        // Schedule gentle chimes randomly every 4-8 seconds
        this.ambientInterval = setInterval(() => {
            if (Math.random() > 0.4) {
                this.playZenChime();
            }
        }, 5000);
    }

    // Play a single soft wind-chime note
    playZenChime() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        // Select random high note from C major pentatonic (C6, D6, E6, G6, A6, C7)
        const notes = [1046.50, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00];
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        
        // Soft volume, slow decay
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.03, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 2.6);
    }

    // Stop ambient sounds smoothly
    stopAmbience() {
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
        
        if (this.droneGain && this.ctx) {
            const t = this.ctx.currentTime;
            this.droneGain.gain.cancelScheduledValues(t);
            this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, t);
            this.droneGain.gain.linearRampToValueAtTime(0, t + 1.5);
            
            setTimeout(() => {
                if (this.droneOsc1) {
                    this.droneOsc1.stop();
                    this.droneOsc1.disconnect();
                    this.droneOsc1 = null;
                }
                if (this.droneOsc2) {
                    this.droneOsc2.stop();
                    this.droneOsc2.disconnect();
                    this.droneOsc2 = null;
                }
                if (this.droneGain) {
                    this.droneGain.disconnect();
                    this.droneGain = null;
                }
            }, 1600);
        }
    }
}

const audio = new SoundEngine();

// ==========================================
// 2. GAME STATE CONFIGURATION
// ==========================================
const game = {
    score: 0,
    multiplier: 1,
    multiplierTimer: 0, // dynamic remaining time in ms
    timeLeft: 60,       // countdown in seconds
    highscore: parseInt(localStorage.getItem('zen_bubble_highscore') || '0', 10),
    active: false,
    timerInterval: null,
    
    // Bubble Spawner configurations
    baseSpawnInterval: 1200, // starting rate in ms
    minSpawnInterval: 650,   // maximum pace floor
    spawnTimer: 0,           // cooldown count
    
    // Collection vectors
    bubbles: [],
    particles: []
};

// ==========================================
// 3. UI ELEMENT REFERENCES
// ==========================================
const UI = {
    // 2D HTML overlays
    panelStart: document.getElementById('panel-start'),
    panelGameOver: document.getElementById('panel-gameover'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    // 2D HUD overlays
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudTimer: document.getElementById('hud-timer-val'),
    hudHighScore: document.getElementById('hud-highscore-val'),
    hudMultiplier: document.getElementById('hud-multiplier'),
    hudMultiplierVal: document.getElementById('hud-multiplier-val'),
    multiplierBanner: document.getElementById('multiplier-banner'),
    
    // 2D Stats
    statFinalScore: document.getElementById('stat-final-score'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordIndicator: document.getElementById('new-record-indicator'),
    
    // 3D VR overlays
    vrBtnStart: document.getElementById('vr-btn-start'),
    vrBtnRestart: document.getElementById('vr-btn-restart'),
    vrHud: document.getElementById('vr-hud'),
    vrHudScore: document.getElementById('vr-hud-score'),
    vrHudTimer: document.getElementById('vr-hud-timer'),
    vrHudMultiplier: document.getElementById('vr-hud-multiplier'),
    
    // Containers
    bubbleContainer: document.getElementById('bubble-container'),
    particleContainer: document.getElementById('particle-container')
};

// ==========================================
// 4. ENTITY CLASSES (BUBBLE & PARTICLE)
// ==========================================

class Bubble {
    constructor(type = 'standard', x = 0, z = -4) {
        this.id = 'bubble_' + Math.random().toString(36).substring(2, 9);
        this.type = type;
        this.x = x;
        this.y = -0.4; // Starts underwater in pond
        this.z = z;
        
        // Drift parameters
        this.riseSpeed = 0.7 + Math.random() * 0.7; // m/s
        this.wobbleSpeedX = 1.2 + Math.random() * 1.5;
        this.wobbleSpeedZ = 1.0 + Math.random() * 1.5;
        this.wobbleAmpX = 0.08 + Math.random() * 0.12;
        this.wobbleAmpZ = 0.06 + Math.random() * 0.10;
        this.wobbleOffset = Math.random() * Math.PI * 2;
        
        this.radius = 0.16 + Math.random() * 0.08; // size
        if (type === 'golden') this.radius = 0.22;
        if (type === 'star') this.radius = 0.20;
        
        this.isPopped = false;
        this.createElement();
    }

    createElement() {
        this.el = document.createElement('a-sphere');
        this.el.setAttribute('id', this.id);
        this.el.setAttribute('class', 'bubble');
        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        this.el.setAttribute('radius', this.radius);
        
        let color = '#81ecec';
        let metalness = '0.9';
        let roughness = '0.05';
        let opacity = '0.55';
        
        if (this.type === 'golden') {
            color = '#ffa801';
            metalness = '0.95';
            roughness = '0.01';
            opacity = '0.65';
        } else if (this.type === 'star') {
            color = '#be2edd';
            metalness = '0.9';
            roughness = '0.05';
            opacity = '0.6';
        }
        
        this.el.setAttribute('material', `shader: standard; color: ${color}; roughness: ${roughness}; metalness: ${metalness}; opacity: ${opacity}; transparent: true; side: double`);
        
        // Add bubble shine highlights (using small inner sphere)
        const shine = document.createElement('a-sphere');
        shine.setAttribute('radius', this.radius * 0.95);
        shine.setAttribute('material', `shader: flat; color: #ffffff; opacity: 0.15; transparent: true`);
        shine.setAttribute('scale', '0.95 0.95 0.95');
        this.el.appendChild(shine);
        
        // Add rotating star indicators inside special power-up bubbles
        if (this.type === 'golden' || this.type === 'star') {
            const star = document.createElement('a-octahedron');
            star.setAttribute('radius', this.radius * 0.45);
            star.setAttribute('color', this.type === 'golden' ? '#ffa801' : '#ffffff');
            star.setAttribute('material', 'shader: flat; opacity: 0.85');
            star.setAttribute('animation', 'property: rotation; to: 360 360 0; dur: 2500; easing: linear; loop: true');
            this.el.appendChild(star);
            
            // Add soft positional light source for golden/star bubbles
            const light = document.createElement('a-entity');
            light.setAttribute('light', `type: point; color: ${color}; intensity: 0.3; distance: 1.5`);
            this.el.appendChild(light);
        }
        
        // Click listener (instant pop via look cursor)
        this.el.addEventListener('click', () => {
            this.pop();
        });
        
        UI.bubbleContainer.appendChild(this.el);
    }

    update(deltaSeconds) {
        if (this.isPopped) return;
        
        // Drift upward
        this.y += this.riseSpeed * deltaSeconds;
        
        // Sine wave wobble to simulate air currents
        const wobbleTime = this.y + this.wobbleOffset;
        const curX = this.x + Math.sin(wobbleTime * this.wobbleSpeedX) * this.wobbleAmpX;
        const curZ = this.z + Math.cos(wobbleTime * this.wobbleSpeedZ) * this.wobbleAmpZ;
        
        this.el.setAttribute('position', `${curX} ${this.y} ${curZ}`);
        
        // Natural self-destruct once risen out of view (y > 4.2m)
        if (this.y > 4.2) {
            this.destroy();
        }
    }

    pop(triggeredByChain = false) {
        if (this.isPopped) return;
        this.isPopped = true;
        
        // Spawn particle splash
        spawnSplash(this.x, this.y, this.z, this.type);
        
        if (this.type === 'standard') {
            audio.playPop();
            addPoints(1);
        } else if (this.type === 'golden') {
            audio.playChime();
            activateMultiplier(10000); // 10s golden boost
            addPoints(2);
        } else if (this.type === 'star') {
            audio.playBlast();
            addPoints(3);
            
            // Chain reaction: pop other bubbles (only if this wasn't popped by a chain itself to prevent infinite loops)
            if (!triggeredByChain) {
                triggerChainReaction();
            }
        }
        
        this.destroy();
    }

    destroy() {
        // Remove element from DOM
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        
        // Remove reference from game list
        const idx = game.bubbles.indexOf(this);
        if (idx !== -1) {
            game.bubbles.splice(idx, 1);
        }
    }
}

class Particle {
    constructor(x, y, z, color = '#81ecec') {
        this.id = 'particle_' + Math.random().toString(36).substring(2, 9);
        this.x = x;
        this.y = y;
        this.z = z;
        
        // Explode directions
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = 1.0 + Math.random() * 2.5; // slight upward spray bias
        this.vz = Math.sin(angle) * speed;
        
        this.scale = 1.0;
        this.opacity = 0.9;
        this.color = color;
        this.lifeTime = 0;
        
        this.createElement();
    }

    createElement() {
        this.el = document.createElement('a-sphere');
        this.el.setAttribute('id', this.id);
        this.el.setAttribute('radius', 0.022);
        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        this.el.setAttribute('material', `shader: flat; color: ${this.color}; opacity: ${this.opacity}; transparent: true`);
        
        UI.particleContainer.appendChild(this.el);
    }

    update(deltaSeconds) {
        this.lifeTime += deltaSeconds;
        
        // Move particle
        this.x += this.vx * deltaSeconds;
        this.y += this.vy * deltaSeconds;
        this.z += this.vz * deltaSeconds;
        
        // Apply physics: gravity + air drag
        this.vy -= 9.8 * deltaSeconds;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.vz *= 0.92;
        
        // Fade out & scale down
        this.opacity = Math.max(0, 0.9 - (this.lifeTime / 0.5)); // disappears in 500ms
        this.scale = Math.max(0.001, 1.0 - (this.lifeTime / 0.5));
        
        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        this.el.setAttribute('scale', `${this.scale} ${this.scale} ${this.scale}`);
        this.el.setAttribute('material', `shader: flat; color: ${this.color}; opacity: ${this.opacity}; transparent: true`);
        
        // Garbage collection
        if (this.lifeTime >= 0.5 || this.opacity <= 0.01) {
            this.destroy();
        }
    }

    destroy() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        const idx = game.particles.indexOf(this);
        if (idx !== -1) {
            game.particles.splice(idx, 1);
        }
    }
}

// ==========================================
// 5. GAME CONTROLLER ACTIONS
// ==========================================

// Initial Event Wiring
document.addEventListener('DOMContentLoaded', () => {
    // 2D start and restart triggers
    UI.btnStart.addEventListener('click', enterGarden);
    UI.btnRestart.addEventListener('click', startGame);
    
    // 3D VR bubble button gaze triggers
    UI.vrBtnStart.addEventListener('click', enterGarden);
    UI.vrBtnRestart.addEventListener('click', startGame);

    // Initial Highscore sync
    UI.hudHighScore.innerText = formatNumber(game.highscore);
    
    // Audio context activation on first touch
    document.body.addEventListener('pointerdown', () => audio.resume());
});

// Pad scores
function formatNumber(num) {
    return String(num).padStart(3, '0');
}

// Transition from 2D Start Panel to peaceful ambient garden
function enterGarden() {
    audio.resume();
    audio.startAmbience();
    
    // Start game immediately on entering
    startGame();
}

function startGame() {
    audio.resume();
    
    // Reset Game State
    game.score = 0;
    game.multiplier = 1;
    game.multiplierTimer = 0;
    game.timeLeft = 60;
    game.active = true;
    game.spawnTimer = 400; // spawn first bubble in 400ms
    
    // Clean out old entities
    clearAllEntities();
    
    // Sync HUD Elements (2D)
    UI.panelStart.classList.add('hidden');
    UI.panelGameOver.classList.add('hidden');
    UI.hud.classList.remove('hidden');
    UI.multiplierBanner.classList.add('hidden');
    UI.hudMultiplier.classList.add('hidden');
    
    updateHUDVisuals();
    
    // Sync VR UI panels (3D)
    UI.vrBtnStart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnStart.setAttribute('visible', 'false');
    UI.vrBtnRestart.setAttribute('scale', '0.001 0.001 0.001');
    UI.vrBtnRestart.setAttribute('visible', 'false');
    
    UI.vrHud.setAttribute('visible', 'true');
    UI.vrHudMultiplier.setAttribute('visible', 'false');
    
    // Start interval timer clock countdown
    if (game.timerInterval) clearInterval(game.timerInterval);
    game.timerInterval = setInterval(() => {
        if (!game.active) return;
        
        game.timeLeft -= 1;
        
        // Sync time displays
        UI.hudTimer.innerText = String(game.timeLeft);
        UI.vrHudTimer.setAttribute('value', `TIME: ${game.timeLeft}`);
        
        if (game.timeLeft <= 0) {
            gameOver();
        }
    }, 1000);
}

function gameOver() {
    game.active = false;
    if (game.timerInterval) {
        clearInterval(game.timerInterval);
        game.timerInterval = null;
    }
    
    audio.playBlast(); // play a final sweep chime sound
    
    // Persist scores
    let isNewRecord = false;
    if (game.score > game.highscore) {
        game.highscore = game.score;
        localStorage.setItem('zen_bubble_highscore', game.highscore);
        isNewRecord = true;
    }
    
    // Populate Game Over stats
    UI.statFinalScore.innerText = game.score;
    UI.statHighScore.innerText = game.highscore;
    
    if (isNewRecord) {
        UI.newRecordIndicator.classList.remove('hidden');
    } else {
        UI.newRecordIndicator.classList.add('hidden');
    }
    
    // Pop up 2D panels
    UI.panelGameOver.classList.remove('hidden');
    
    // Show 3D VR buttons
    UI.vrBtnRestart.setAttribute('visible', 'true');
    UI.vrBtnRestart.setAttribute('scale', '1 1 1');
}

function addPoints(pts) {
    if (!game.active) return;
    
    const addedScore = pts * game.multiplier;
    game.score += addedScore;
    
    updateHUDVisuals();
}

function activateMultiplier(durationMs) {
    game.multiplier = 2;
    game.multiplierTimer = durationMs;
    
    // Glow UI HUD
    UI.hudScore.classList.add('hud-multiplier');
    UI.hudMultiplier.classList.remove('hidden');
    UI.multiplierBanner.classList.remove('hidden');
    
    // Glow 3D VR overlay
    UI.vrHudMultiplier.setAttribute('visible', 'true');
}

function updateHUDVisuals() {
    const formattedScore = formatNumber(game.score);
    const formattedHighScore = formatNumber(game.highscore);
    
    // 2D Dashboard updating
    UI.hudScore.innerText = formattedScore;
    UI.hudHighScore.innerText = formattedHighScore;
    UI.hudTimer.innerText = String(game.timeLeft);
    
    // Add pop-grow pulse on score update
    UI.hudScore.classList.remove('score-pop');
    void UI.hudScore.offsetWidth; // trigger reflow
    UI.hudScore.classList.add('score-pop');
    
    // 3D VR HUD updating
    UI.vrHudScore.setAttribute('value', `SCORE: ${formattedScore}`);
    UI.vrHudTimer.setAttribute('value', `TIME: ${game.timeLeft}`);
}

// Spawns 10-15 droplet particles at coordinates
function spawnSplash(x, y, z, type) {
    let pColor = '#c7ecee'; // light cyan
    if (type === 'golden') pColor = '#f7b731'; // warm gold
    if (type === 'star') pColor = '#d6a2e8'; // sparkly lavender
    
    const count = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
        const particle = new Particle(x, y, z, pColor);
        game.particles.push(particle);
    }
}

// Chain reaction: Pop all active bubbles on screen
function triggerChainReaction() {
    // Collect references to avoid mutating array during loops
    const activeBubbles = [...game.bubbles];
    activeBubbles.forEach((bubble) => {
        // Pop immediately with a slight cascade delay based on index
        if (!bubble.isPopped) {
            setTimeout(() => {
                if (game.active && !bubble.isPopped) {
                    bubble.pop(true);
                }
            }, Math.random() * 300);
        }
    });
}

function clearAllEntities() {
    // Clear bubbles
    while (game.bubbles.length > 0) {
        game.bubbles[0].destroy();
    }
    // Clear particles
    while (game.particles.length > 0) {
        game.particles[0].destroy();
    }
}

// ==========================================
// 6. MAIN GAME ENGINE UPDATE TICK LOOP
// ==========================================
let lastTime = performance.now();

function update(time) {
    const deltaMs = Math.min(50, time - lastTime); // clamp delta
    const deltaSeconds = deltaMs / 1000;
    lastTime = time;

    // 1. Spawner trigger
    if (game.active) {
        game.spawnTimer -= deltaMs;
        if (game.spawnTimer <= 0) {
            spawnBubble();
        }
        
        // Multiplier countdown
        if (game.multiplier > 1) {
            game.multiplierTimer -= deltaMs;
            if (game.multiplierTimer <= 0) {
                // Multiplier expired
                game.multiplier = 1;
                UI.hudScore.classList.remove('hud-multiplier');
                UI.hudMultiplier.classList.add('hidden');
                UI.multiplierBanner.classList.add('hidden');
                UI.vrHudMultiplier.setAttribute('visible', 'false');
            }
        }
    }

    // 2. Update all active bubbles
    // Iterate backwards since update may remove items
    for (let i = game.bubbles.length - 1; i >= 0; i--) {
        game.bubbles[i].update(deltaSeconds);
    }

    // 3. Update all active particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
        game.particles[i].update(deltaSeconds);
    }

    requestAnimationFrame(update);
}

// Kick off frame loop
requestAnimationFrame(update);

// Instantiates a bubble at random positions over the pond
function spawnBubble() {
    // Spawns over the pond: x centering around 0, z centering around -4
    const xOffset = -0.55 + Math.random() * 1.1;
    const zOffset = -4.3 + Math.random() * 0.6;
    
    // Core distribution: Standard (80%), Golden (10%), Star (10%)
    const roll = Math.random();
    let type = 'standard';
    if (roll < 0.10) {
        type = 'golden';
    } else if (roll < 0.20) {
        type = 'star';
    }
    
    const bubble = new Bubble(type, xOffset, zOffset);
    game.bubbles.push(bubble);
    
    // Reset spawn timer with score-scaling difficulty curve
    // Frequency starts at 1200ms, floor at 650ms
    const difficultyLevel = Math.min(30, game.score); // clamp difficulty cap
    const baseInterval = Math.max(game.minSpawnInterval, game.baseSpawnInterval - (difficultyLevel * 18));
    
    // Add minor variation to feel organic
    game.spawnTimer = baseInterval * (0.8 + Math.random() * 0.4);
}
