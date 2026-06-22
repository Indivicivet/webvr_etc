/**
 * Neon Punch VR - Application Logic
 * Synthesized Web Audio Sequencer & 3D WebXR Interaction Engine
 */

// ==========================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.schedulerTimerId = null;
        
        // Tempo & Timing
        this.bpm = 120;
        this.nextNoteTime = 0.0;
        this.currentStep = 0;
        this.barCount = 0;
        this.scheduleAheadTime = 0.15; // Schedule notes 150ms ahead
        this.lookahead = 30.0;         // Poll every 30ms

        // Synth Routing Channels
        this.masterGain = null;
        this.drumGain = null;
        this.synthGain = null;
        
        // Pre-computed White Noise Buffer
        this.noiseBuffer = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // 1. Generate White Noise Buffer
        const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // 2. Setup Gain Nodes
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.drumGain = this.ctx.createGain();
        this.drumGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        this.drumGain.connect(this.masterGain);

        this.synthGain = this.ctx.createGain();
        this.synthGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        this.synthGain.connect(this.masterGain);
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startLoop() {
        this.resume();
        if (this.schedulerTimerId) return;

        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.currentStep = 0;
        this.barCount = 0;

        const schedulerTick = () => {
            while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
                this.scheduleStep(this.currentStep, this.nextNoteTime);
                
                // Increment steps (16th notes)
                const secondsPerBeat = 60.0 / this.bpm;
                this.nextNoteTime += 0.25 * secondsPerBeat; // 1/4 of a beat
                
                this.currentStep++;
                if (this.currentStep >= 16) {
                    this.currentStep = 0;
                    this.barCount++;
                }
            }
            this.schedulerTimerId = setTimeout(schedulerTick, this.lookahead);
        };
        
        schedulerTick();
    }

    stopLoop() {
        if (this.schedulerTimerId) {
            clearTimeout(this.schedulerTimerId);
            this.schedulerTimerId = null;
        }
    }

    scheduleStep(step, time) {
        // --- 1. DRUMS SEQUENCER (120 BPM Synthwave) ---
        // Kick on 0, 4, 8, 12 (Four-on-the-floor)
        if (step === 0 || step === 4 || step === 8 || step === 12) {
            this.triggerKick(time);
        }

        // Snare / Clap on 4, 12 (Backbeat)
        if (step === 4 || step === 12) {
            this.triggerSnare(time);
        }

        // Hi-Hat on offbeats 2, 6, 10, 14 (Open), and others (Closed)
        const isOpen = (step === 2 || step === 6 || step === 10 || step === 14);
        if (step % 2 === 0) {
            this.triggerHihat(time, isOpen ? 0.08 : 0.04, isOpen ? 0.12 : 0.03);
        }

        // --- 2. SYNTHWAVE BASSLINE (Pumping 8th notes) ---
        if (step % 2 === 0) {
            // Progression: C -> Eb -> Bb -> Ab (4 bars)
            const roots = [65.41, 77.78, 58.27, 51.91]; // C2, Eb2, Bb1, Ab1
            const barIndex = this.barCount % 4;
            const rootFreq = roots[barIndex];
            
            // Octave bouncing pattern
            let bassFreq = rootFreq;
            if (step === 2 || step === 6 || step === 10 || step === 14) {
                bassFreq = rootFreq * 2; // Bouncing octave up on offbeats
            }
            this.triggerBass(bassFreq, time, 0.22);
        }

        // --- 3. ARPEGGIATOR CHORDS (16th notes synth roll) ---
        if (step % 4 === 0) {
            const chords = [
                [130.81, 155.56, 196.00, 246.94], // Cm7
                [155.56, 196.00, 233.08, 293.66], // Ebmaj7
                [116.54, 146.83, 174.61, 220.00], // Bb7
                [103.83, 130.81, 155.56, 196.00]  // Abmaj7
            ];
            const barIndex = this.barCount % 4;
            const chord = chords[barIndex];
            // Play note from chord arpeggio based on step
            const noteFreq = chord[(step / 4) % chord.length] * 2.0; // Play in higher register
            this.triggerChordSynth(noteFreq, time, 0.4);
        }

        // --- 4. BEAT SPAWNER TRIGGER (Procedural Rhythm) ---
        if (game.active) {
            // Trigger spawners slightly ahead of the beat (evaluated on eighth/quarter notes)
            if (step % 2 === 0) {
                const isQuarter = (step % 4 === 0);
                const spawnChance = isQuarter ? 0.35 : 0.15; // 35% on quarter beat, 15% on eighth note
                if (Math.random() < spawnChance) {
                    spawnOrbForTime(time);
                }
            }
        }
    }

    // --- SYNTH GENERATORS ---

    triggerKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.09);
        
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        
        osc.connect(gain);
        gain.connect(this.drumGain);
        
        osc.start(time);
        osc.stop(time + 0.11);
    }

    triggerSnare(time) {
        // 1. Noise body
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, time);
        filter.Q.setValueAtTime(2.0, time);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.drumGain);
        
        noise.start(time);
        noise.stop(time + 0.16);

        // 2. Fundamental tone
        const osc = this.ctx.createOscillator();
        const toneGain = this.ctx.createGain();
        
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + 0.07);
        
        toneGain.gain.setValueAtTime(0.2, time);
        toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        
        osc.connect(toneGain);
        toneGain.connect(this.drumGain);
        
        osc.start(time);
        osc.stop(time + 0.09);
    }

    triggerHihat(time, vol, decay) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, time);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.drumGain);
        
        noise.start(time);
        noise.stop(time + decay + 0.01);
    }

    triggerBass(freq, time, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        // Filter envelope for a biting bass pluck
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, time);
        filter.frequency.exponentialRampToValueAtTime(120, time + duration - 0.02);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.synthGain);

        osc.start(time);
        osc.stop(time + duration + 0.01);
    }

    triggerChordSynth(freq, time, duration) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, time);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq + 1.5, time); // detune slightly for thickness

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, time);
        filter.frequency.exponentialRampToValueAtTime(400, time + duration);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.synthGain);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration + 0.01);
        osc2.stop(time + duration + 0.01);
    }

    // --- INTERACTIVE SFX SYNTHESIS ---

    playHitChime(type) {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        let freq = 880; // Standard target hit chime (A5)
        let noteLength = 0.25;
        if (type === 'golden') {
            // Golden chiming arpeggio
            freq = 1320; // E6
            noteLength = 0.5;
        } else if (type === 'shield') {
            freq = 1174.66; // D6 (upward sci-fi sweep)
            noteLength = 0.35;
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        if (type === 'shield') {
            osc.frequency.exponentialRampToValueAtTime(1567.98, t + 0.2); // sweep up
        }

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + noteLength);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + noteLength + 0.01);
    }

    playMineExplosion() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        // Low pitch frequency drop boom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(30, t + 0.4);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.46);

        // Explosion noise burst
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(t);
        noise.stop(t + 0.41);
    }

    playThudMiss() {
        this.resume();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.linearRampToValueAtTime(40, t + 0.15);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.16);
    }
}

const audio = new SoundEngine();

// ==========================================
// 2. GAME STATE CONFIGURATION
// ==========================================
const game = {
    active: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    totalTargets: 0,
    totalHits: 0,
    shield: 100, // 0 to 100
    multiplier: 1, // 1 or 2
    multiplierTimer: 0,
    highScore: 0,
    
    // Game lists
    orbs: [],
    particles: [],
    
    // Inputs (Desktop mouse aim coordinates)
    mouseX: 0,
    mouseY: 0,
    isVR: false,
    
    // Octagonal lanes layout configuration
    // center of tunnel is at y=1.4, radius R=0.8
    lanes: [
        { angle: 0, x: 0.8, y: 1.4, color: '#00f0ff', side: 'right' },        // Lane 0 (Right)
        { angle: Math.PI / 4, x: 0.566, y: 1.966, color: '#00f0ff', side: 'right' }, // Lane 1 (Up-Right)
        { angle: Math.PI / 2, x: 0, y: 2.2, color: '#ff007f', side: 'left' },       // Lane 2 (Up)
        { angle: 3 * Math.PI / 4, x: -0.566, y: 1.966, color: '#ff007f', side: 'left' }, // Lane 3 (Up-Left)
        { angle: Math.PI, x: -0.8, y: 1.4, color: '#ff007f', side: 'left' },      // Lane 4 (Left)
        { angle: 5 * Math.PI / 4, x: -0.566, y: 0.834, color: '#ff007f', side: 'left' }, // Lane 5 (Down-Left)
        { angle: 3 * Math.PI / 2, x: 0, y: 0.6, color: '#00f0ff', side: 'right' },      // Lane 6 (Down)
        { angle: 7 * Math.PI / 4, x: 0.566, y: 0.834, color: '#00f0ff', side: 'right' }  // Lane 7 (Down-Right)
    ],
    
    // VR Hands tracking variables
    leftHandPrevPos: new THREE.Vector3(),
    rightHandPrevPos: new THREE.Vector3(),
    leftHandVelocity: 0,
    rightHandVelocity: 0
};

// DOM Cache
const UI = {
    panelStart: document.getElementById('panel-start'),
    panelGameover: document.getElementById('panel-gameover'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score-val'),
    hudCombo: document.getElementById('hud-combo-val'),
    hudAccuracy: document.getElementById('hud-accuracy-val'),
    hudMultiplier: document.getElementById('hud-multiplier'),
    multiplierBanner: document.getElementById('multiplier-banner'),
    shieldFill: document.getElementById('shield-bar-fill'),
    
    statFinalScore: document.getElementById('stat-final-score'),
    statMaxCombo: document.getElementById('stat-max-combo'),
    statAccuracy: document.getElementById('stat-accuracy'),
    statHighScore: document.getElementById('stat-high-score'),
    newRecordBanner: document.getElementById('new-record-banner'),
    
    desktopAim: document.getElementById('desktop-aim'),
    orbContainer: document.getElementById('orb-container'),
    particleContainer: document.getElementById('particle-container'),
    
    // 3D VR Dashboard
    vrHud: document.getElementById('vr-hud'),
    vrScore: document.getElementById('vr-score'),
    vrCombo: document.getElementById('vr-combo'),
    vrShieldBar: document.getElementById('vr-shield-bar'),
    
    // Hands & Gloves
    leftHand: document.getElementById('left-hand'),
    rightHand: document.getElementById('right-hand'),
    desktopGloves: document.getElementById('desktop-gloves'),
    desktopLeftGlove: document.getElementById('desktop-left-glove'),
    desktopRightGlove: document.getElementById('desktop-right-glove')
};

// ==========================================
// 3. TARGET ORB AND MINE CLASS
// ==========================================
class Orb {
    constructor(laneIndex, type, targetTime) {
        this.id = 'orb_' + Math.random().toString(36).substring(2, 9);
        this.laneIndex = laneIndex;
        this.lane = game.lanes[laneIndex];
        this.type = type; // 'standard', 'golden', 'shield', 'hazard'
        
        this.targetTime = targetTime;
        this.travelTime = 2.0; // takes exactly 2 seconds to reach hit zone
        
        // Spawn/Initial values
        this.x = this.lane.x;
        this.y = this.lane.y;
        this.z = -15; // emerges at far z = -15m
        
        this.isHit = false;
        this.isMissed = false;
        
        this.createElement();
    }

    createElement() {
        this.el = document.createElement('a-sphere');
        this.el.setAttribute('id', this.id);
        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        
        let radius = 0.09;
        let color = this.lane.color; // Standard matches the lane color (pink/blue)
        let metalness = 0.2;
        let roughness = 0.8;
        
        if (this.type === 'golden') {
            color = '#ffb703'; // Yellow
            radius = 0.11;
        } else if (this.type === 'shield') {
            color = '#10b981'; // Green
            radius = 0.11;
        } else if (this.type === 'hazard') {
            color = '#ef4444'; // Red
            radius = 0.11;
            // Spiked hazard: make it a dodecahedron
            this.el.setAttribute('geometry', { primitive: 'dodecahedron', radius: radius });
        } else {
            this.el.setAttribute('radius', radius);
        }

        if (this.type !== 'hazard') {
            this.el.setAttribute('material', {
                shader: 'standard',
                color: color,
                emissive: color,
                emissiveIntensity: 0.6,
                roughness: roughness,
                metalness: metalness
            });

            // Inner core glow sphere
            const core = document.createElement('a-sphere');
            core.setAttribute('radius', radius * 0.7);
            core.setAttribute('material', {
                shader: 'flat',
                color: '#ffffff',
                opacity: 0.8,
                transparent: true
            });
            this.el.appendChild(core);
        } else {
            this.el.setAttribute('material', {
                shader: 'standard',
                color: '#ef4444',
                roughness: 0.9,
                metalness: 0.1
            });
            
            // Add a flashing red light warning inside hazard mine
            const warningLight = document.createElement('a-entity');
            warningLight.setAttribute('light', 'type: point; color: #ff0000; intensity: 0.4; distance: 2');
            this.el.appendChild(warningLight);
        }

        UI.orbContainer.appendChild(this.el);
    }

    update(currentTime) {
        if (this.isHit || this.isMissed) return;

        // Position based on absolute time progression
        const elapsed = currentTime - (this.targetTime - this.travelTime);
        const progress = elapsed / this.travelTime;

        if (progress >= 0) {
            // Move along Z axis from -15m to -1.2m (hit zone) and keep going to 0.5m
            this.z = -15 + progress * 13.8; // -15 to -1.2 is 13.8m. Orbs keep traveling forward
            this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        }

        // Miss check: if orb passes hit zone (z = -1.2m) by more than 0.18 seconds (approx 1.2m further)
        if (currentTime > this.targetTime + 0.18) {
            this.triggerMiss();
        }
    }

    triggerHit() {
        if (this.isHit) return;
        this.isHit = true;
        
        spawnExplosionParticles(this.x, this.y, this.z, this.type === 'hazard' ? '#ef4444' : (this.type === 'golden' ? '#ffb703' : (this.type === 'shield' ? '#10b981' : this.lane.color)));

        if (this.type === 'hazard') {
            audio.playMineExplosion();
            damageShield(20); // heavy shield penalty
            resetCombo();
            triggerCameraShake();
        } else {
            audio.playHitChime(this.type);
            game.totalHits++;
            game.combo++;
            if (game.combo > game.maxCombo) {
                game.maxCombo = game.combo;
            }

            // Standard / Golden / Shield logic
            let scoreAdd = 100 * game.multiplier;
            if (this.type === 'golden') {
                scoreAdd = 200 * game.multiplier;
                activateMultiplier(10000); // 10 seconds of 2x
            } else if (this.type === 'shield') {
                scoreAdd = 100 * game.multiplier;
                repairShield(15); // heal 15%
            }
            
            game.score += scoreAdd;
            updateHUD();
        }

        this.destroy();
    }

    triggerMiss() {
        if (this.isMissed) return;
        this.isMissed = true;

        // If it's a standard/golden/shield target orb, missing it hurts shield
        if (this.type !== 'hazard') {
            audio.playThudMiss();
            damageShield(10); // Standard miss penalty
            resetCombo();
            updateHUD();
        }
        
        // Hazard mines passing safely is good, no penalty!

        this.destroy();
    }

    destroy() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        const idx = game.orbs.indexOf(this);
        if (idx !== -1) {
            game.orbs.splice(idx, 1);
        }
    }
}

// ==========================================
// 4. PARTICLE EFFECTS SYSTEM
// ==========================================
class SparkParticle {
    constructor(x, y, z, color) {
        this.id = 'part_' + Math.random().toString(36).substring(2, 9);
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = color;
        
        const speed = 1.0 + Math.random() * 2.5;
        const angle = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * Math.PI;
        
        this.vx = Math.cos(angle) * Math.cos(pitch) * speed;
        this.vy = Math.sin(pitch) * speed;
        this.vz = Math.sin(angle) * Math.cos(pitch) * speed;
        
        this.life = 1.0; // lifespan in seconds
        this.decay = 1.5 + Math.random() * 1.5;
        
        this.createElement();
    }

    createElement() {
        this.el = document.createElement('a-sphere');
        this.el.setAttribute('id', this.id);
        this.el.setAttribute('radius', 0.015 + Math.random() * 0.015);
        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        this.el.setAttribute('material', {
            shader: 'flat',
            color: this.color,
            transparent: true,
            opacity: 0.9
        });
        UI.particleContainer.appendChild(this.el);
    }

    update(dt) {
        this.life -= this.decay * dt;
        if (this.life <= 0) {
            this.destroy();
            return;
        }

        // Apply velocities
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
        
        // Gravity slightly pulling down
        this.vy -= 1.2 * dt;

        this.el.setAttribute('position', `${this.x} ${this.y} ${this.z}`);
        this.el.setAttribute('material', 'opacity', this.life);
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

function spawnExplosionParticles(x, y, z, color) {
    const num = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < num; i++) {
        const p = new SparkParticle(x, y, z, color);
        game.particles.push(p);
    }
}

// ==========================================
// 5. GAME ACTIONS & MECHANICS
// ==========================================

function spawnOrbForTime(time) {
    // Choose a random lane (0 to 7)
    const laneIndex = Math.floor(Math.random() * 8);
    
    // Choose type: Standard (75%), Golden (8%), Shield (10%), Hazard Mine (7%)
    const roll = Math.random();
    let type = 'standard';
    if (roll < 0.07) {
        type = 'hazard'; // Mine
    } else if (roll < 0.15) {
        type = 'golden'; // 2x Multiplier
    } else if (roll < 0.25) {
        type = 'shield'; // Energy repair
    }
    
    // Add to game statistics count (mines don't count towards max accuracy score denominator)
    if (type !== 'hazard') {
        game.totalTargets++;
    }

    const orb = new Orb(laneIndex, type, time);
    game.orbs.push(orb);
}

function damageShield(amt) {
    game.shield = Math.max(0, game.shield - amt);
    if (game.shield <= 0) {
        triggerGameOver();
    }
}

function repairShield(amt) {
    game.shield = Math.min(100, game.shield + amt);
}

function resetCombo() {
    game.combo = 0;
}

function activateMultiplier(durationMs) {
    game.multiplier = 2;
    game.multiplierTimer = durationMs;
    UI.hudMultiplier.classList.remove('hidden');
    UI.multiplierBanner.classList.remove('hidden');
}

function updateHUD() {
    // Math checks
    const acc = game.totalTargets > 0 ? Math.round((game.totalHits / game.totalTargets) * 100) : 100;
    
    // Update DOM texts
    UI.hudScore.textContent = game.score;
    UI.hudCombo.textContent = game.combo;
    UI.hudAccuracy.textContent = acc + '%';
    
    // Shield UI fill mapping
    UI.shieldFill.style.width = game.shield + '%';
    if (game.shield < 35) {
        UI.shieldFill.classList.add('warning');
    } else {
        UI.shieldFill.classList.remove('warning');
    }

    // VR HUD values mapping
    UI.vrScore.setAttribute('value', `SCORE: ${String(game.score).padStart(6, '0')}`);
    UI.vrCombo.setAttribute('value', `COMBO: ${game.combo}  |  ${acc}%`);
    UI.vrShieldBar.setAttribute('scale', `${game.shield / 100} 1 1`);
    
    // Shift VR shield color if low
    if (game.shield < 35) {
        UI.vrShieldBar.setAttribute('material', 'color', '#ef4444');
    } else {
        UI.vrShieldBar.setAttribute('material', 'color', '#00f0ff');
    }
}

function triggerCameraShake() {
    const cam = document.getElementById('camera');
    const startPos = cam.getAttribute('position');
    
    let elapsed = 0;
    const dur = 250; // ms
    
    const shake = () => {
        if (elapsed > dur) {
            cam.setAttribute('position', '0 1.6 0');
            return;
        }
        
        const sx = (Math.random() - 0.5) * 0.08;
        const sy = 1.6 + (Math.random() - 0.5) * 0.08;
        const sz = (Math.random() - 0.5) * 0.08;
        cam.setAttribute('position', `${sx} ${sy} ${sz}`);
        
        elapsed += 16;
        setTimeout(shake, 16);
    };
    
    shake();
}

// ==========================================
// 6. DESKTOP INTERACTION / GLOVES AND AIM
// ==========================================
const desktopState = {
    // Current animated glove offsets
    leftGlovePunchTime: 0,
    rightGlovePunchTime: 0,
    leftGloveZ: -1.1,
    rightGloveZ: -1.1
};

// Trigger a punch animation for desktop gloves
function triggerPunchDesktop(side) {
    if (side === 'left' && desktopState.leftGlovePunchTime <= 0) {
        desktopState.leftGlovePunchTime = 0.20; // 200ms punch duration
        checkPunchCollisionDesktop('left');
    } else if (side === 'right' && desktopState.rightGlovePunchTime <= 0) {
        desktopState.rightGlovePunchTime = 0.20;
        checkPunchCollisionDesktop('right');
    }
}

function checkPunchCollisionDesktop(side) {
    // Check overlap with any active orb in the hit zone (near targetTime)
    const curTime = audio.ctx.currentTime;
    const hitTolerance = 0.22; // tolerance in seconds around targetTime

    // Choose active glove position
    let gloveX, gloveY;
    if (side === 'left') {
        gloveX = game.mouseX < 0 ? game.mouseX * 1.5 : -0.4;
        gloveY = 1.4 + game.mouseY * 0.8;
    } else {
        gloveX = game.mouseX >= 0 ? game.mouseX * 1.5 : 0.4;
        gloveY = 1.4 + game.mouseY * 0.8;
    }

    // Scan orbs
    const candidateOrbs = [...game.orbs];
    for (const orb of candidateOrbs) {
        if (orb.isHit || orb.isMissed) continue;
        
        // 1. Time evaluation
        const timeDiff = Math.abs(curTime - orb.targetTime);
        if (timeDiff < hitTolerance) {
            
            // 2. Glove hand/color matching logic
            // Pink hand matches Left, Blue hand matches Right
            const handMatch = (side === 'left' && orb.lane.side === 'left') || 
                              (side === 'right' && orb.lane.side === 'right');
            
            // Hazard mines can be punched by EITHER hand
            const isHazard = (orb.type === 'hazard');
            
            if (handMatch || isHazard) {
                // 3. Lane X/Y distance evaluation
                const dx = gloveX - orb.x;
                const dy = gloveY - orb.y;
                const dist2d = Math.sqrt(dx*dx + dy*dy);
                
                // If cursor is close to the orb's lane center, it's a hit!
                if (dist2d < 0.35) {
                    orb.triggerHit();
                    break; // hit one orb per click
                }
            }
        }
    }
}

// Bind keyboard & mouse events
function initDesktopControls() {
    // Mouse movement aim mapping
    window.addEventListener('mousemove', (e) => {
        if (!game.active) return;
        
        // Map normal window values: -1 to +1
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -((e.clientY / window.innerHeight) * 2 - 1);
        
        game.mouseX = nx;
        game.mouseY = ny;

        // Position 2D overlay crosshair follower
        UI.desktopAim.style.left = e.clientX + 'px';
        UI.desktopAim.style.top = e.clientY + 'px';
    });

    // Left click punch Left hand. Right click punch Right hand.
    window.addEventListener('mousedown', (e) => {
        if (!game.active) return;
        
        if (e.button === 0) {
            // Left Click -> Left Glove
            triggerPunchDesktop('left');
        } else if (e.button === 2) {
            // Right Click -> Right Glove
            triggerPunchDesktop('right');
        }
    });

    // Prevent default context menu
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Key presses
    window.addEventListener('keydown', (e) => {
        if (!game.active) return;
        
        const key = e.key.toLowerCase();
        
        // Support Left/Right Arrow and Space keys as alternate inputs
        if (e.key === 'ArrowLeft' || key === 'a' || key === 's' || e.key === 'ArrowUp') {
            // Snap mouse coordinates left and strike
            if (key === 'a' || e.key === 'ArrowLeft') {
                game.mouseX = -0.6; // Outer Left
            } else {
                game.mouseX = -0.2; // Inner Left
            }
            game.mouseY = 0;
            triggerPunchDesktop('left');
        } else if (e.key === 'ArrowRight' || key === 'k' || key === 'l' || e.key === 'ArrowDown' || e.key === ' ') {
            // Snap mouse coordinates right and strike
            if (key === 'l' || e.key === 'ArrowRight') {
                game.mouseX = 0.6; // Outer Right
            } else {
                game.mouseX = 0.2; // Inner Right
            }
            game.mouseY = 0;
            triggerPunchDesktop('right');
        }
    });
}

// Update desktop gloves animation
function updateDesktopGloves(dt) {
    if (!game.active || game.isVR) return;

    // --- Left Glove Punch animation ---
    if (desktopState.leftGlovePunchTime > 0) {
        desktopState.leftGlovePunchTime -= dt;
        const progress = (0.20 - desktopState.leftGlovePunchTime) / 0.20; // 0 to 1
        // Sine wave punch travel forward
        desktopState.leftGloveZ = -1.1 - Math.sin(progress * Math.PI) * 0.7;
    } else {
        desktopState.leftGloveZ = -1.1;
    }

    // --- Right Glove Punch animation ---
    if (desktopState.rightGlovePunchTime > 0) {
        desktopState.rightGlovePunchTime -= dt;
        const progress = (0.20 - desktopState.rightGlovePunchTime) / 0.20; // 0 to 1
        desktopState.rightGloveZ = -1.1 - Math.sin(progress * Math.PI) * 0.7;
    } else {
        desktopState.rightGloveZ = -1.1;
    }

    // Calculate active X/Y following mouse aiming
    let leftX = -0.4;
    let leftY = 1.4;
    let rightX = 0.4;
    let rightY = 1.4;

    if (game.mouseX < 0) {
        leftX = game.mouseX * 1.5;
        leftY = 1.4 + game.mouseY * 0.8;
    } else {
        rightX = game.mouseX * 1.5;
        rightY = 1.4 + game.mouseY * 0.8;
    }

    UI.desktopLeftGlove.setAttribute('position', `${leftX} ${leftY} ${desktopState.leftGloveZ}`);
    UI.desktopRightGlove.setAttribute('position', `${rightX} ${rightY} ${desktopState.rightGloveZ}`);
}

// ==========================================
// 7. VR INTERACTION / PHYSICAL COLLISION CHECK
// ==========================================
const leftHandPos = new THREE.Vector3();
const rightHandPos = new THREE.Vector3();
const orbPos = new THREE.Vector3();

function updateVRControls(dt) {
    if (!game.active || !game.isVR) return;

    // 1. Compute velocity vectors of controllers
    const currentLeftPos = new THREE.Vector3();
    const currentRightPos = new THREE.Vector3();
    
    UI.leftHand.object3D.getWorldPosition(currentLeftPos);
    UI.rightHand.object3D.getWorldPosition(currentRightPos);

    // Speed = distance traveled / dt
    if (dt > 0) {
        const leftDist = currentLeftPos.distanceTo(game.leftHandPrevPos);
        const rightDist = currentRightPos.distanceTo(game.rightHandPrevPos);
        
        game.leftHandVelocity = leftDist / dt;
        game.rightHandVelocity = rightDist / dt;
    }

    game.leftHandPrevPos.copy(currentLeftPos);
    game.rightHandPrevPos.copy(currentRightPos);

    // 2. Perform sphere-to-sphere collision check with active orbs
    const candidateOrbs = [...game.orbs];
    const collisionRadius = 0.22; // glove (0.08) + orb (0.09) + tolerance
    
    for (const orb of candidateOrbs) {
        if (orb.isHit || orb.isMissed) continue;
        
        orb.el.object3D.getWorldPosition(orbPos);

        // A. Left Hand (Pink) intersection check
        const dLeft = currentLeftPos.distanceTo(orbPos);
        if (dLeft < collisionRadius) {
            // Must match Left side target OR be a Hazard mine
            const isValidTarget = (orb.lane.side === 'left' || orb.type === 'hazard');
            // Must have high velocity (punch motion)
            const isPunching = (game.leftHandVelocity > 1.0);
            
            if (isValidTarget && isPunching) {
                orb.triggerHit();
                triggerHapticFeedback('left', 0.8, 80);
                continue;
            }
        }

        // B. Right Hand (Blue) intersection check
        const dRight = currentRightPos.distanceTo(orbPos);
        if (dRight < collisionRadius) {
            // Must match Right side target OR be a Hazard mine
            const isValidTarget = (orb.lane.side === 'right' || orb.type === 'hazard');
            // Must have high velocity
            const isPunching = (game.rightHandVelocity > 1.0);
            
            if (isValidTarget && isPunching) {
                orb.triggerHit();
                triggerHapticFeedback('right', 0.8, 80);
                continue;
            }
        }
    }
}

function triggerHapticFeedback(hand, intensity, duration) {
    const handEntity = hand === 'left' ? UI.leftHand : UI.rightHand;
    if (handEntity) {
        const trackedControls = handEntity.components['tracked-controls-webxr'] || handEntity.components['tracked-controls'];
        if (trackedControls && trackedControls.controller) {
            const gamepad = trackedControls.controller.gamepad;
            if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
                gamepad.hapticActuators[0].pulse(intensity, duration).catch(() => {});
            }
        }
    }
}

// ==========================================
// 8. GAME LOOP & STATE MACHINE
// ==========================================
let lastFrameTime = performance.now();

function updateLoop(timestamp) {
    const dtMs = Math.min(50, timestamp - lastFrameTime);
    const dt = dtMs / 1000.0;
    lastFrameTime = timestamp;

    if (game.active) {
        // Multiplier timer decay
        if (game.multiplier > 1) {
            game.multiplierTimer -= dtMs;
            if (game.multiplierTimer <= 0) {
                game.multiplier = 1;
                UI.hudMultiplier.classList.add('hidden');
                UI.multiplierBanner.classList.add('hidden');
                updateHUD();
            }
        }

        // Update active target orbs
        const curTime = audio.ctx ? audio.ctx.currentTime : 0;
        for (let i = game.orbs.length - 1; i >= 0; i--) {
            game.orbs[i].update(curTime);
        }

        // Update active particles
        for (let i = game.particles.length - 1; i >= 0; i--) {
            game.particles[i].update(dt);
        }

        // Update controls
        if (game.isVR) {
            updateVRControls(dt);
        } else {
            updateDesktopGloves(dt);
        }
    }

    requestAnimationFrame(updateLoop);
}

function initializeGame() {
    game.score = 0;
    game.combo = 0;
    game.maxCombo = 0;
    game.totalTargets = 0;
    game.totalHits = 0;
    game.shield = 100;
    game.multiplier = 1;
    
    // Clear list entities
    while (game.orbs.length > 0) {
        game.orbs[0].destroy();
    }
    while (game.particles.length > 0) {
        game.particles[0].destroy();
    }

    updateHUD();
}

function startGame() {
    initializeGame();
    
    audio.resume();
    audio.startLoop();
    
    game.active = true;

    // Toggle DOM panels visibility
    UI.panelStart.classList.add('hidden');
    UI.panelGameover.classList.add('hidden');
    UI.hud.classList.remove('hidden');

    if (!game.isVR) {
        UI.desktopAim.style.display = 'block';
        UI.desktopGloves.setAttribute('visible', 'true');
    }
    
    // Reset controllers tracking
    if (UI.leftHand && UI.leftHand.object3D) {
        UI.leftHand.object3D.getWorldPosition(game.leftHandPrevPos);
    }
    if (UI.rightHand && UI.rightHand.object3D) {
        UI.rightHand.object3D.getWorldPosition(game.rightHandPrevPos);
    }
}

function triggerGameOver() {
    game.active = false;
    audio.stopLoop();

    UI.desktopAim.style.display = 'none';
    UI.hud.classList.add('hidden');
    UI.multiplierBanner.classList.add('hidden');

    // Retrieve stats accuracy score
    const acc = game.totalTargets > 0 ? Math.round((game.totalHits / game.totalTargets) * 100) : 100;

    // Fill Game Over stats rows
    UI.statFinalScore.textContent = game.score;
    UI.statMaxCombo.textContent = game.maxCombo;
    UI.statAccuracy.textContent = acc + '%';

    // High Score check
    let high = localStorage.getItem('neon_punch_high_score') || 0;
    high = parseInt(high, 10);
    
    if (game.score > high) {
        localStorage.setItem('neon_punch_high_score', game.score);
        high = game.score;
        UI.newRecordBanner.classList.remove('hidden');
    } else {
        UI.newRecordBanner.classList.add('hidden');
    }
    
    UI.statHighScore.textContent = high;
    UI.panelGameover.classList.remove('hidden');
}

// Bind load hooks
window.addEventListener('load', () => {
    const scene = document.querySelector('a-scene');

    const init = () => {
        // Load High score
        let high = localStorage.getItem('neon_punch_high_score') || 0;
        game.highScore = parseInt(high, 10);
        
        initDesktopControls();

        // Start animation frame loop
        requestAnimationFrame(updateLoop);

        // Bind VR Mode enter/exit triggers
        scene.addEventListener('enter-vr', () => {
            game.isVR = true;
            UI.desktopAim.style.display = 'none';
            UI.desktopGloves.setAttribute('visible', 'false');
            UI.vrHud.setAttribute('visible', 'true');
            updateHUD();
        });

        scene.addEventListener('exit-vr', () => {
            game.isVR = false;
            UI.vrHud.setAttribute('visible', 'false');
            if (game.active) {
                UI.desktopAim.style.display = 'block';
                UI.desktopGloves.setAttribute('visible', 'true');
            }
        });

        // Setup interaction clicks
        UI.btnStart.addEventListener('click', () => {
            startGame();
        });

        UI.btnRestart.addEventListener('click', () => {
            startGame();
        });
    };

    if (scene.hasLoaded) {
        init();
    } else {
        scene.addEventListener('loaded', init);
    }
});
