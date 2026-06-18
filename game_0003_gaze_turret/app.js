/**
 * Gaze Turret Defender - Game Core Logic
 * Fully gaze-driven VR gameplay using A-Frame and synthesized Web Audio.
 */

// ==========================================
// 1. DYNAMIC SYNTH AUDIO ENGINE
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.laserOscs = [];
        this.laserGain = null;
        this.isLaserPlaying = false;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create laser loop gain node
        this.laserGain = this.ctx.createGain();
        this.laserGain.gain.setValueAtTime(0, this.ctx.currentTime);
        
        // Lowpass filter for smooth Sci-Fi mechanical rumble
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, this.ctx.currentTime);
        
        this.laserGain.connect(filter);
        filter.connect(this.ctx.destination);
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playBoot() {
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (arpeggio)
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + index * 0.08);
            
            gain.gain.setValueAtTime(0.12, t + index * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + index * 0.08 + 0.45);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t + index * 0.08);
            osc.stop(t + index * 0.08 + 0.5);
        });
    }

    startLaserLoop() {
        this.resume();
        if (!this.ctx || this.isLaserPlaying) return;
        this.isLaserPlaying = true;

        const t = this.ctx.currentTime;
        
        // Oscillator 1: low mechanical hum
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(70, t);
        
        // Oscillator 2: secondary energy tone
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(130, t);
        
        // LFO for pulsing plasma feel
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(25, t); // 25Hz vibrato
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(12, t);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
        
        osc1.connect(this.laserGain);
        osc2.connect(this.laserGain);
        
        lfo.start(t);
        osc1.start(t);
        osc2.start(t);
        
        this.laserOscs = [osc1, osc2, lfo];
        
        // Avoid audio pops by ramping volume quickly
        this.laserGain.gain.cancelScheduledValues(t);
        this.laserGain.gain.setValueAtTime(0, t);
        this.laserGain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    }

    stopLaserLoop() {
        if (!this.ctx || !this.isLaserPlaying) return;
        this.isLaserPlaying = false;
        
        const t = this.ctx.currentTime;
        this.laserGain.gain.cancelScheduledValues(t);
        this.laserGain.gain.setValueAtTime(this.laserGain.gain.value, t);
        this.laserGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        
        // Store reference to close current oscillators
        const currentOscs = this.laserOscs;
        this.laserOscs = [];
        
        setTimeout(() => {
            currentOscs.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
        }, 120);
    }

    playExplosion() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const duration = 0.6;
        
        // Generate white noise buffer
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;
        
        // Bandpass filter sweep down
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(220, t);
        filter.frequency.exponentialRampToValueAtTime(25, t + duration);
        filter.Q.setValueAtTime(3.0, t);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noiseSource.start(t);
        noiseSource.stop(t + duration);
        
        // Sub-bass sweep
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(90, t);
        subOsc.frequency.linearRampToValueAtTime(15, t + 0.4);
        
        subGain.gain.setValueAtTime(0.45, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        
        subOsc.start(t);
        subOsc.stop(t + 0.45);
    }

    playShieldWarning() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        
        // Pulse 1
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.25);
        
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
        
        // Pulse 2 (0.15s later)
        setTimeout(() => {
            if (!this.ctx) return;
            const t2 = this.ctx.currentTime;
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(110, t2);
            osc2.frequency.linearRampToValueAtTime(50, t2 + 0.25);
            
            gain2.gain.setValueAtTime(0.35, t2);
            gain2.gain.linearRampToValueAtTime(0.001, t2 + 0.25);
            
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(t2);
            osc2.stop(t2 + 0.25);
        }, 150);
    }

    playTick() {
        this.resume();
        if (!this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, t);
        
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    }
}

// Global Audio Engine Instantiation
window.soundEngine = new SoundEngine();


// ==========================================
// 2. DYNAMIC STARFIELD SIMULATION
// ==========================================
AFRAME.registerComponent('starfield', {
    init: function() {
        this.stars = [];
        const sceneEl = this.el;
        
        // 1. Drifting star streaks
        for (let i = 0; i < 40; i++) {
            const star = document.createElement('a-box');
            star.setAttribute('width', 0.04);
            star.setAttribute('height', 0.04);
            star.setAttribute('depth', 0.35); // elongated to simulate speed streaks
            star.setAttribute('color', '#ffffff');
            star.setAttribute('material', 'shader: flat; opacity: 0.7; transparent: true');
            
            const x = (Math.random() - 0.5) * 35;
            const y = (Math.random() - 0.5) * 22 + 2; // offset upwards slightly
            const z = -Math.random() * 45;
            
            star.setAttribute('position', `${x} ${y} ${z}`);
            sceneEl.appendChild(star);
            
            this.stars.push({
                el: star,
                speed: 0.12 + Math.random() * 0.15
            });
        }
        
        // 2. Static dome stars (distant dots)
        for (let i = 0; i < 60; i++) {
            const dot = document.createElement('a-sphere');
            dot.setAttribute('radius', 0.05 + Math.random() * 0.08);
            dot.setAttribute('color', Math.random() > 0.5 ? '#9ee7ff' : '#ffffff');
            dot.setAttribute('material', 'shader: flat; opacity: 0.35; transparent: true');
            
            const radius = 45;
            const theta = Math.random() * Math.PI * 0.42; // front hemisphere cone
            const phi = Math.random() * Math.PI * 2;
            
            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi) + 1.6;
            const z = -radius * Math.cos(theta);
            
            dot.setAttribute('position', `${x} ${y} ${z}`);
            sceneEl.appendChild(dot);
        }
    },
    tick: function(time, timeDelta) {
        // Prevent huge jumps when tabbing out
        const dt = Math.min(timeDelta, 100) / 16.66;
        
        // Update drifting star coordinates
        this.stars.forEach(star => {
            const pos = star.el.object3D.position;
            pos.z += star.speed * dt;
            if (pos.z >= 2) {
                pos.z = -45;
                pos.x = (Math.random() - 0.5) * 35;
                pos.y = (Math.random() - 0.5) * 22 + 2;
            }
        });
    }
});


// ==========================================
// 3. DEBRIS ITEM BEHAVIOR
// ==========================================
AFRAME.registerComponent('debris-item', {
    schema: {
        type: { type: 'string', default: 'asteroid' },
        speed: { type: 'number', default: 0.06 },
        health: { type: 'number', default: 1.0 }
    },

    init: function() {
        this.maxHealth = this.data.health;
        this.health = this.data.health;
        this.baseScale = this.el.object3D.scale.clone();
        
        // Random rotational tumble velocities
        this.rotSpeed = {
            x: (Math.random() - 0.5) * 0.04,
            y: (Math.random() - 0.5) * 0.04,
            z: (Math.random() - 0.5) * 0.04
        };
        
        this.isBeingHit = false;
        this.originalPosition = this.el.object3D.position.clone();
    },

    tick: function(time, timeDelta) {
        const dt = Math.min(timeDelta, 100);
        
        // Move debris forward along Z
        const pos = this.el.object3D.position;
        pos.z += this.data.speed * (dt / 16.66);
        this.originalPosition.z = pos.z;
        
        // Apply rotation
        this.el.object3D.rotation.x += this.rotSpeed.x;
        this.el.object3D.rotation.y += this.rotSpeed.y;
        this.el.object3D.rotation.z += this.rotSpeed.z;
        
        // Process active laser damage
        if (this.isBeingHit) {
            // Damage Rate: 1.25 health points per second
            this.health -= 1.25 * (dt / 1000);
            
            // 1. Shaking effect based on current health depletion
            const shakeAmount = 0.06 * (1.0 - this.health / this.maxHealth);
            pos.x = this.originalPosition.x + (Math.random() - 0.5) * shakeAmount;
            pos.y = this.originalPosition.y + (Math.random() - 0.5) * shakeAmount;
            
            // 2. Shrinking effect
            const lifePercent = Math.max(0.25, this.health / this.maxHealth);
            this.el.object3D.scale.set(
                this.baseScale.x * (0.35 + 0.65 * lifePercent),
                this.baseScale.y * (0.35 + 0.65 * lifePercent),
                this.baseScale.z * (0.35 + 0.65 * lifePercent)
            );
            
            // 3. Emissive damage glow
            this.setDamageColor(time);
            
            // Destruction threshold
            if (this.health <= 0) {
                this.explode();
                return;
            }
        } else {
            // Reset position shaking and restore material color
            pos.x = this.originalPosition.x;
            pos.y = this.originalPosition.y;
            this.resetColor();
        }
        
        // Reset damage flag for next frame evaluation
        this.isBeingHit = false;

        // Collision check at shield zone
        if (pos.z >= -1.5) {
            this.hitShield();
        }
    },

    setDamageColor: function(time) {
        this.el.object3D.traverse(node => {
            if (node.isMesh && node.material) {
                if (node.userData.originalColor === undefined) {
                    node.userData.originalColor = node.material.color.getHex();
                    node.userData.originalEmissive = node.material.emissive ? node.material.emissive.getHex() : 0x000000;
                }
                
                // Transition color to glowing orange/red
                const damagePercent = 1.0 - (this.health / this.maxHealth);
                node.material.color.setHex(0xff3b00);
                if (node.material.emissive) {
                    node.material.emissive.setHex(0xff3b00);
                    node.material.emissiveIntensity = 0.4 + 0.6 * Math.sin(time * 0.05) + damagePercent * 0.6;
                }
            }
        });
    },

    resetColor: function() {
        this.el.object3D.traverse(node => {
            if (node.isMesh && node.material && node.userData.originalColor !== undefined) {
                node.material.color.setHex(node.userData.originalColor);
                if (node.material.emissive) {
                    node.material.emissive.setHex(node.userData.originalEmissive);
                    node.material.emissiveIntensity = 0.15;
                }
            }
        });
    },

    explode: function() {
        window.soundEngine.playExplosion();
        
        const worldPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(worldPos);
        spawnExplosionParticles(worldPos, this.data.type);
        
        const scoreVal = this.data.type === 'satellite' ? 250 : (this.data.type === 'shard' ? 100 : 150);
        
        const gameManager = document.querySelector('[gaze-turret]').components['gaze-turret'];
        gameManager.addScore(scoreVal);
        
        this.el.parentNode.removeChild(this.el);
    },

    hitShield: function() {
        window.soundEngine.playShieldWarning();
        triggerShieldFlash();
        
        const gameManager = document.querySelector('[gaze-turret]').components['gaze-turret'];
        gameManager.damageShield(25);
        
        this.el.parentNode.removeChild(this.el);
    }
});


// ==========================================
// 4. EXPLOSION PARTICLE EFFECT EMITTER
// ==========================================
function spawnExplosionParticles(position, type) {
    const sceneEl = document.querySelector('a-scene');
    const particleCount = type === 'satellite' ? 14 : 9;
    
    // Debris-specific color themes
    const colors = type === 'satellite' ? ['#00f3ff', '#ffffff', '#0077ff'] : ['#ff5e00', '#ffe600', '#ff007f'];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('a-sphere');
        particle.setAttribute('radius', 0.06 + Math.random() * 0.08);
        particle.setAttribute('color', colors[Math.floor(Math.random() * colors.length)]);
        particle.setAttribute('material', 'shader: flat; opacity: 1; transparent: true');
        particle.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
        
        // Random velocity direction
        const speed = 4 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        particle.setAttribute('explosion-particle', {
            vx: speed * Math.sin(phi) * Math.cos(theta),
            vy: speed * Math.sin(phi) * Math.sin(theta),
            vz: speed * Math.cos(phi)
        });
        
        sceneEl.appendChild(particle);
    }
}

AFRAME.registerComponent('explosion-particle', {
    schema: {
        vx: { type: 'number' },
        vy: { type: 'number' },
        vz: { type: 'number' }
    },
    init: function() {
        this.opacity = 1.0;
        this.life = 0.4 + Math.random() * 0.35;
        this.maxLife = this.life;
    },
    tick: function(time, timeDelta) {
        const dt = timeDelta / 1000;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.el.parentNode.removeChild(this.el);
            return;
        }
        
        const pos = this.el.object3D.position;
        pos.x += this.data.vx * dt;
        pos.y += this.data.vy * dt;
        pos.z += this.data.vz * dt;
        
        // Air resistance drag simulation
        this.data.vx *= 0.94;
        this.data.vy *= 0.94;
        this.data.vz *= 0.94;
        
        this.opacity = Math.max(0, this.life / this.maxLife);
        this.el.setAttribute('material', 'opacity', this.opacity);
        this.el.object3D.scale.set(this.opacity, this.opacity, this.opacity);
    }
});


// ==========================================
// 5. GAME MANAGER & MAIN ORCHESTRATION
// ==========================================
AFRAME.registerComponent('gaze-turret', {
    init: function() {
        this.score = 0;
        this.highScore = 0;
        this.shield = 100;
        this.state = 'LOBBY'; // LOBBY, PLAYING, GAMEOVER
        
        this.spawnTimer = 0;
        this.spawnInterval = 2200; // ms
        
        this.vrGazeTime = 0;
        this.vrTickTimer = 0;
        
        // Bind UI Elements
        this.btnStart = document.getElementById('btn-start');
        this.btnRestart = document.getElementById('btn-restart');
        
        this.hud = document.getElementById('hud');
        this.panelStart = document.getElementById('panel-start');
        this.panelGameover = document.getElementById('panel-gameover');
        this.bezel = document.getElementById('cockpit-bezel');
        
        this.hudScore = document.getElementById('hud-score-val');
        this.hudHighscore = document.getElementById('hud-highscore-val');
        this.shieldFill = document.getElementById('shield-fill');
        this.shieldPercent = document.getElementById('shield-percent');
        
        this.statFinalScore = document.getElementById('stat-final-score');
        this.statHighScore = document.getElementById('stat-high-score');
        this.newRecordIndicator = document.getElementById('new-record-indicator');
        
        this.vrBtnOnline = document.getElementById('vr-btn-online');
        this.vrStatusPanel = document.getElementById('vr-status-panel');
        this.vrTextScore = document.getElementById('vr-text-score');
        this.vrTextShield = document.getElementById('vr-text-shield');
        
        this.laserLeft = document.getElementById('laser-left');
        this.laserRight = document.getElementById('laser-right');
        
        // Load High Score
        this.highScore = parseInt(localStorage.getItem('gaze_turret_highscore') || '0', 10);
        this.updateHUD();
        
        // Bind Actions
        this.btnStart.addEventListener('click', () => this.startGame());
        this.btnRestart.addEventListener('click', () => this.startGame());
        
        // VR State Listeners
        const sceneEl = this.el;
        sceneEl.addEventListener('enter-vr', () => this.onEnterVR());
        sceneEl.addEventListener('exit-vr', () => this.onExitVR());
        
        // Add starfield
        sceneEl.setAttribute('starfield', '');
        
        // Initial setup for laser start tips
        this.laserLeftStart = '-0.7 1.3 -1.5';
        this.laserRightStart = '0.7 1.3 -1.5';
        
        // Check WebXR headset connection message
        this.checkVRHeadset();
    },

    tick: function(time, timeDelta) {
        const dt = Math.min(timeDelta, 100);
        
        // 1. Process Gaze targeting and Laser updates
        this.processTargeting(time, dt);
        
        // 2. Play state logic
        if (this.state === 'PLAYING') {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnDebris();
                // Spawning speed increases as score increases
                this.spawnInterval = Math.max(650, 2200 - this.score * 0.4);
                this.spawnTimer = this.spawnInterval;
            }
        }
    },

    processTargeting: function(time, dt) {
        const cursorEl = document.getElementById('gaze-cursor');
        if (!cursorEl) return;
        
        const raycaster = cursorEl.components.raycaster;
        let activeTarget = null;
        let intersectPoint = null;
        
        if (raycaster && raycaster.intersections && raycaster.intersections.length > 0) {
            const intersection = raycaster.intersections[0];
            const hitEl = intersection.object.el;
            
            // Climb DOM to find parent debris element
            let parentDebris = hitEl;
            while (parentDebris && !parentDebris.classList.contains('debris') && parentDebris.tagName !== 'A-SCENE') {
                parentDebris = parentDebris.parentNode;
            }
            
            if (parentDebris && parentDebris.classList.contains('debris')) {
                activeTarget = parentDebris;
                intersectPoint = intersection.point;
            } else if (hitEl && hitEl.classList.contains('vr-target')) {
                activeTarget = hitEl;
                intersectPoint = intersection.point;
            }
        }
        
        // Handle Action based on activeTarget
        if (activeTarget) {
            if (activeTarget.classList.contains('debris') && this.state === 'PLAYING') {
                // Zap target
                activeTarget.components['debris-item'].isBeingHit = true;
                
                // Draw neon lasers
                const pt = intersectPoint;
                const endStr = `${pt.x} ${pt.y} ${pt.z}`;
                
                this.laserLeft.setAttribute('line', {
                    start: this.laserLeftStart,
                    end: endStr
                });
                this.laserLeft.setAttribute('visible', true);

                this.laserRight.setAttribute('line', {
                    start: this.laserRightStart,
                    end: endStr
                });
                this.laserRight.setAttribute('visible', true);
                
                // Play energy hum loop
                window.soundEngine.startLaserLoop();
                
            } else if (activeTarget.classList.contains('vr-target')) {
                // Look to click (fuse selector logic for VR console buttons)
                this.hideLasers();
                
                this.vrGazeTime += dt;
                
                // Modulate scale slightly to show charging selection
                const pulseScale = 1.0 - (this.vrGazeTime / 1000) * 0.12;
                activeTarget.setAttribute('scale', `${pulseScale} ${pulseScale} ${pulseScale}`);
                
                // Ticking feedback sound
                this.vrTickTimer += dt;
                if (this.vrTickTimer >= 220) {
                    window.soundEngine.playTick();
                    this.vrTickTimer = 0;
                }
                
                if (this.vrGazeTime >= 1000) {
                    // Trigger click
                    this.vrGazeTime = 0;
                    activeTarget.setAttribute('scale', '1 1 1');
                    
                    if (activeTarget.id === 'vr-btn-online') {
                        this.startGame();
                    }
                }
            } else {
                this.hideLasers();
                this.resetVRButtons();
            }
        } else {
            this.hideLasers();
            this.resetVRButtons();
        }
    },

    hideLasers: function() {
        this.laserLeft.setAttribute('visible', false);
        this.laserRight.setAttribute('visible', false);
        window.soundEngine.stopLaserLoop();
    },

    resetVRButtons: function() {
        this.vrGazeTime = 0;
        this.vrTickTimer = 0;
        
        const targets = document.querySelectorAll('.vr-target');
        targets.forEach(btn => {
            btn.setAttribute('scale', '1 1 1');
        });
    },

    startGame: function() {
        this.state = 'PLAYING';
        this.score = 0;
        this.shield = 100;
        this.spawnTimer = 500; // spawn first debris quickly
        
        // Sound boot
        window.soundEngine.playBoot();
        
        // Clean any existing debris
        this.clearAllDebris();
        
        // Sync menus
        this.panelStart.classList.add('hidden');
        this.panelGameover.classList.add('hidden');
        this.hud.classList.remove('hidden');
        
        // If not in VR, keep SVG bezel
        if (!this.el.is('vr-mode')) {
            this.bezel.classList.remove('hidden');
        }
        
        // Update 3D VR dashboard
        this.vrBtnOnline.setAttribute('visible', false);
        this.vrBtnOnline.setAttribute('scale', '0.001 0.001 0.001'); // scale down to prevent raycasting
        this.vrStatusPanel.setAttribute('visible', true);
        
        this.updateHUD();
    },

    gameOver: function() {
        this.state = 'GAMEOVER';
        this.hideLasers();
        this.clearAllDebris();
        
        // Save High Score
        let newRecord = false;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('gaze_turret_highscore', this.highScore.toString());
            newRecord = true;
        }
        
        // Sync 2D Menu
        this.hud.classList.add('hidden');
        this.bezel.classList.add('hidden');
        
        this.statFinalScore.textContent = this.score.toString();
        this.statHighScore.textContent = this.highScore.toString();
        
        if (newRecord) {
            this.newRecordIndicator.classList.remove('hidden');
        } else {
            this.newRecordIndicator.classList.add('hidden');
        }
        
        // Show panel
        this.panelGameover.classList.remove('hidden');
        
        // Update 3D VR dashboard
        this.vrStatusPanel.setAttribute('visible', false);
        
        this.vrBtnOnline.setAttribute('visible', true);
        this.vrBtnOnline.setAttribute('scale', '1 1 1');
        this.vrBtnOnline.querySelector('a-text').setAttribute('value', 'SYSTEM ERROR\nLOOK TO REBOOT');
        this.vrBtnOnline.setAttribute('color', '#ff007f');
        this.vrBtnOnline.setAttribute('material', 'emissive', '#ff007f');
    },

    addScore: function(val) {
        if (this.state !== 'PLAYING') return;
        this.score += val;
        this.updateHUD();
    },

    damageShield: function(val) {
        if (this.state !== 'PLAYING') return;
        this.shield = Math.max(0, this.shield - val);
        this.updateHUD();
        
        if (this.shield <= 0) {
            this.gameOver();
        }
    },

    updateHUD: function() {
        // Formatter (pad with zeros)
        const formatScore = (num) => num.toString().padStart(4, '0');
        
        // Update 2D HUD
        this.hudScore.textContent = formatScore(this.score);
        this.hudHighscore.textContent = formatScore(this.highScore);
        
        this.shieldPercent.textContent = `${this.shield}%`;
        this.shieldFill.style.width = `${this.shield}%`;
        
        // Update HUD bar color thresholds
        this.shieldFill.className = 'shield-bar-fill';
        this.shieldPercent.style.color = 'var(--neon-green)';
        
        if (this.shield <= 25) {
            this.shieldFill.classList.add('critical');
            this.shieldPercent.style.color = 'var(--neon-pink)';
        } else if (this.shield <= 50) {
            this.shieldFill.classList.add('warning');
            this.shieldPercent.style.color = 'var(--neon-yellow)';
        }
        
        // Update 3D VR HUD values
        this.vrTextScore.setAttribute('value', `SCORE: ${formatScore(this.score)}`);
        this.vrTextShield.setAttribute('value', `SHIELD: ${this.shield}%`);
        this.vrTextShield.setAttribute('color', this.shield <= 25 ? '#ff007f' : (this.shield <= 50 ? '#ffe600' : '#00f3ff'));
    },

    spawnDebris: function() {
        const container = document.getElementById('debris-container');
        const roll = Math.random();
        
        let type = 'asteroid';
        let health = 1.0;
        let speed = 0.05 + Math.random() * 0.035;
        
        const debrisEl = document.createElement('a-entity');
        
        if (roll < 0.55) {
            // 1. Asteroid (Standard rock)
            type = 'asteroid';
            health = 1.0;
            
            const rock = document.createElement('a-dodecahedron');
            rock.setAttribute('radius', 0.8 + Math.random() * 0.4);
            rock.setAttribute('color', '#5a5563');
            rock.setAttribute('material', 'roughness: 0.75; metalness: 0.25');
            
            const sx = 0.85 + Math.random() * 0.3;
            const sy = 0.85 + Math.random() * 0.3;
            const sz = 0.85 + Math.random() * 0.3;
            rock.setAttribute('scale', `${sx} ${sy} ${sz}`);
            
            debrisEl.appendChild(rock);
        } else if (roll < 0.8) {
            // 2. Satellite (Tougher, slower metallic debris)
            type = 'satellite';
            health = 1.6;
            speed = 0.045 + Math.random() * 0.025;
            
            // Satellite Chassis
            const core = document.createElement('a-cylinder');
            core.setAttribute('radius', 0.32);
            core.setAttribute('height', 0.95);
            core.setAttribute('color', '#acb5c3');
            core.setAttribute('material', 'roughness: 0.3; metalness: 0.85');
            core.setAttribute('rotation', '90 0 0');
            debrisEl.appendChild(core);
            
            // Panels left
            const panelL = document.createElement('a-box');
            panelL.setAttribute('width', 1.4);
            panelL.setAttribute('height', 0.35);
            panelL.setAttribute('depth', 0.04);
            panelL.setAttribute('position', '-0.95 0 0');
            panelL.setAttribute('color', '#0084ff');
            panelL.setAttribute('material', 'roughness: 0.15; metalness: 0.75; emissive: #0077ff; emissiveIntensity: 0.15');
            debrisEl.appendChild(panelL);
            
            // Panels right
            const panelR = document.createElement('a-box');
            panelR.setAttribute('width', 1.4);
            panelR.setAttribute('height', 0.35);
            panelR.setAttribute('depth', 0.04);
            panelR.setAttribute('position', '0.95 0 0');
            panelR.setAttribute('color', '#0084ff');
            panelR.setAttribute('material', 'roughness: 0.15; metalness: 0.75; emissive: #0077ff; emissiveIntensity: 0.15');
            debrisEl.appendChild(panelR);
            
            // Antenna dish
            const dish = document.createElement('a-cone');
            dish.setAttribute('radius-bottom', 0.28);
            dish.setAttribute('radius-top', 0);
            dish.setAttribute('height', 0.35);
            dish.setAttribute('color', '#948fb8');
            dish.setAttribute('position', '0 0 -0.6');
            dish.setAttribute('rotation', '90 0 0');
            debrisEl.appendChild(dish);
        } else {
            // 3. Shard (Small, fast debris)
            type = 'shard';
            health = 0.6;
            speed = 0.095 + Math.random() * 0.055;
            
            const shard = document.createElement('a-cone');
            shard.setAttribute('radius-bottom', 0.28);
            shard.setAttribute('height', 0.65);
            shard.setAttribute('color', '#ff5d00');
            shard.setAttribute('material', 'shader: standard; roughness: 0.2; metalness: 0.9; emissive: #ff5e00; emissiveIntensity: 0.5');
            shard.setAttribute('rotation', '45 35 0');
            debrisEl.appendChild(shard);
        }
        
        debrisEl.classList.add('debris');
        
        // Spawn inside comfortable 80-degree front field of view cone at Z = -35
        const x = (Math.random() - 0.5) * 11.5;
        const y = 0.6 + Math.random() * 3.3; // centers around players eyes
        const z = -35;
        
        debrisEl.setAttribute('position', `${x} ${y} ${z}`);
        
        // Apply scaling boost to speed as score increases
        const difficultySpeedMultiplier = 1.0 + Math.min(1.4, this.score / 5000);
        
        // Attach component behavior
        debrisEl.setAttribute('debris-item', {
            type: type,
            speed: speed * difficultySpeedMultiplier,
            health: health
        });
        
        container.appendChild(debrisEl);
    },

    clearAllDebris: function() {
        const container = document.getElementById('debris-container');
        if (container) {
            container.innerHTML = '';
        }
    },

    onEnterVR: function() {
        this.bezel.classList.add('hidden');
        // Resume AudioContext just in case browser blocked it
        window.soundEngine.resume();
    },

    onExitVR: function() {
        if (this.state === 'PLAYING') {
            this.bezel.classList.remove('hidden');
        }
    },

    checkVRHeadset: function() {
        const detectMsg = document.getElementById('vr-detect-msg');
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-vr')
                .then(supported => {
                    if (supported) {
                        detectMsg.textContent = '⚡ LINK ESTABLISHED: VR Headset Available';
                        detectMsg.style.color = 'var(--neon-green)';
                    } else {
                        detectMsg.textContent = '💻 LINK STABLE: Standby for desktop simulation';
                    }
                })
                .catch(() => {
                    detectMsg.textContent = '💻 LINK STABLE: Standby for desktop simulation';
                });
        } else {
            detectMsg.textContent = '💻 LINK STABLE: Standby for desktop simulation';
        }
    }
});


// ==========================================
// 6. DOM COMPATIBILITY & FLASH EVENTS
// ==========================================
function triggerShieldFlash() {
    const flashEl = document.getElementById('damage-flash');
    if (!flashEl) return;
    
    // Clear any active class to restart animation
    flashEl.className = 'damage-flash';
    // Trigger reflow to restart css animation
    void flashEl.offsetWidth;
    
    flashEl.classList.add('flash-blue-red');
}

// Global gesture triggers to initialize sound engine context
const initAudioEvents = ['click', 'mousedown', 'touchstart', 'keydown'];
const resumeOnGesture = () => {
    window.soundEngine.resume();
    // Clean up event listeners after activation
    initAudioEvents.forEach(evt => {
        window.removeEventListener(evt, resumeOnGesture);
    });
};
initAudioEvents.forEach(evt => {
    window.addEventListener(evt, resumeOnGesture);
});
