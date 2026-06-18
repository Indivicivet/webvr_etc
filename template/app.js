import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// --- Global Variables ---
let container;
let camera, scene, renderer;
let controls;
let raycaster, mouse;
let controllers = [];
let controllerGrips = [];
let interactiveObjects = [];
const tempMatrix = new THREE.Matrix4();

// Custom Palette for interaction
const NEON_COLORS = [
    0x8b5cf6, // Violet
    0xec4899, // Pink
    0x06b6d4, // Cyan
    0x10b981, // Emerald
    0xf59e0b, // Amber
    0xef4444  // Red
];

// --- Initialization ---
init();

function init() {
    container = document.getElementById('canvas-container');

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09080f);
    // Exponential fog for depth and atmosphere
    scene.fog = new THREE.FogExp2(0x09080f, 0.05);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 3); // Eyeline height in meters (standard height)

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Add VR Button to body
    document.body.appendChild(VRButton.createButton(renderer));

    // 4. Controls Setup (Desktop Fallback)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Limit panning below ground

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x150f2b, 0.4);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(4, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    const d = 4;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // 6. Environment Floor & Grid
    createEnvironment();

    // 7. Interactive Objects
    createInteractiveShapes();

    // 8. VR Controller Setup
    setupVRControllers();

    // 9. Desktop Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 10. Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointerdown', onPointerDown);
    
    // UI HUD Controls
    const btnDesktopEnter = document.getElementById('btn-desktop-enter');
    btnDesktopEnter.addEventListener('click', () => {
        const overlay = document.getElementById('ui-overlay');
        overlay.classList.add('hidden');
    });

    // Check VR Availability to update status text
    checkXRAvailability();

    // Start rendering loop
    renderer.setAnimationLoop(animate);
}

// --- Create Scene Environment ---
function createEnvironment() {
    // Ground Plane
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0c0b13,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Cyberpunk-style grid helper
    const gridHelper = new THREE.GridHelper(60, 60, 0x8b5cf6, 0x2e1065);
    gridHelper.position.y = 0.01; // Slightly above floor to prevent z-fighting
    gridHelper.material.opacity = 0.4;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
}

// --- Generate Interactive Geometric Shapes ---
function createInteractiveShapes() {
    const geometries = [
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.SphereGeometry(0.25, 32, 32),
        new THREE.ConeGeometry(0.25, 0.5, 32),
        new THREE.TorusGeometry(0.2, 0.08, 16, 100)
    ];

    const count = 8;
    const radius = 2.5;

    for (let i = 0; i < count; i++) {
        // Distribute shapes in a circle around the center (0, 0)
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 1.2 + Math.sin(i) * 0.3; // Vary heights slightly

        // Select random geometry
        const geom = geometries[i % geometries.length];
        
        // Premium default material
        const mat = new THREE.MeshStandardMaterial({
            color: 0x4f46e5, // Royal Indigo
            roughness: 0.1,
            metalness: 0.8,
            emissive: 0x4f46e5,
            emissiveIntensity: 0.15
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Custom metadata for animations & state
        mesh.userData = {
            baseY: y,
            hoverSpeed: 1 + Math.random() * 1.5,
            rotateSpeed: {
                x: 0.005 + Math.random() * 0.01,
                y: 0.005 + Math.random() * 0.01,
                z: 0.005 + Math.random() * 0.01
            },
            isPulsing: false,
            pulseTimer: 0
        };

        scene.add(mesh);
        interactiveObjects.push(mesh);
    }
}

// --- VR Controller Configurations ---
function setupVRControllers() {
    // Input controllers (pointer line, interactions)
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        scene.add(controller);
        controllers.push(controller);

        // Visual pointer laser beam
        const laserGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -3) // 3 meters long pointer
        ]);
        const laserMat = new THREE.LineBasicMaterial({
            color: 0xec4899, // Pink ray
            transparent: true,
            opacity: 0.7
        });
        const laser = new THREE.Line(laserGeo, laserMat);
        laser.name = 'laser';
        controller.add(laser);
    }

    // Grip controllers (holds 3D controller models)
    const controllerModelFactory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i++) {
        const grip = renderer.xr.getControllerGrip(i);
        grip.add(controllerModelFactory.createControllerModel(grip));
        scene.add(grip);
        controllerGrips.push(grip);
    }
}

// --- VR Interactivity (Select Start) ---
function onSelectStart(event) {
    const controller = event.target;
    const intersections = getIntersections(controller);

    if (intersections.length > 0) {
        const hitObject = intersections[0].object;
        triggerInteraction(hitObject);

        // Vibrate Controller (Haptics)
        triggerHaptics(event.session, controller);
    }
}

function onSelectEnd(event) {
    // Placeholder for released event if needed
}

// --- Desktop Mouse Interactivity ---
function onPointerDown(event) {
    // Only interact if overlay is hidden
    const overlay = document.getElementById('ui-overlay');
    if (!overlay.classList.contains('hidden')) return;

    // Avoid interacting when clicking on actual UI elements if they existed
    if (event.target !== renderer.domElement) return;

    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        triggerInteraction(intersects[0].object);
    }
}

// --- Shared Interaction Handler ---
function triggerInteraction(object) {
    // Trigger color change
    const newColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
    object.material.color.setHex(newColor);
    object.material.emissive.setHex(newColor);
    object.material.emissiveIntensity = 0.6; // High neon glow

    // Trigger scale-pulse animation
    object.userData.isPulsing = true;
    object.userData.pulseTimer = 0;
    object.scale.set(1.4, 1.4, 1.4);
}

// --- Controller Haptics ---
function triggerHaptics(session, controller) {
    if (!session || !session.inputSources) return;

    // Find the inputSource matching this controller
    for (const source of session.inputSources) {
        if (source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators.length > 0) {
            // Check handiness or association if needed, but a quick pulse is usually fine
            const actuator = source.gamepad.hapticActuators[0];
            actuator.pulse(0.8, 100); // Intensity: 0.8, Duration: 100ms
        }
    }
}

// --- Get Intersections for VR Pointer ---
function getIntersections(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    return raycaster.intersectObjects(interactiveObjects, false);
}

// --- Detect WebXR/VR Capability ---
async function checkXRAvailability() {
    const statusMsg = document.getElementById('vr-status-msg');
    
    if ('xr' in navigator) {
        try {
            const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (isSupported) {
                statusMsg.textContent = '⚡ VR Headset Detected / Supported';
                statusMsg.style.color = '#10b981'; // Green
            } else {
                statusMsg.textContent = '💻 VR not detected. Launching in Desktop Mode.';
            }
        } catch (err) {
            statusMsg.textContent = '❌ WebXR detection failed. Desktop Mode active.';
        }
    } else {
        statusMsg.textContent = '🌐 WebXR not supported in this browser. Desktop Mode active.';
    }
}

// --- Window Resize Handler ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Main Animation & Render Loop ---
function animate(timestamp) {
    // 1. Update interactive objects animations (Rotation, float, and pulsing)
    const time = timestamp * 0.001; // convert to seconds

    interactiveObjects.forEach((obj) => {
        // Floating animation (y axis sine wave)
        obj.position.y = obj.userData.baseY + Math.sin(time * obj.userData.hoverSpeed) * 0.08;

        // Custom rotations
        obj.rotation.x += obj.userData.rotateSpeed.x;
        obj.rotation.y += obj.userData.rotateSpeed.y;
        obj.rotation.z += obj.userData.rotateSpeed.z;

        // Pulse scale-down animation
        if (obj.userData.isPulsing) {
            obj.userData.pulseTimer += 0.05;
            if (obj.userData.pulseTimer >= Math.PI) {
                obj.userData.isPulsing = false;
                obj.scale.set(1.0, 1.0, 1.0);
                obj.material.emissiveIntensity = 0.15; // Reset to default glow
            } else {
                // Smooth cosine interpolation back to normal scale
                const scaleVal = 1.0 + Math.sin(obj.userData.pulseTimer) * 0.4;
                obj.scale.set(scaleVal, scaleVal, scaleVal);
            }
        }
    });

    // 2. Update WebXR controller pointers
    controllers.forEach((controller) => {
        const laser = controller.getObjectByName('laser');
        if (laser) {
            const intersects = getIntersections(controller);
            if (intersects.length > 0) {
                // Shorten laser to touch point
                laser.scale.z = intersects[0].distance / 3;
                laser.material.color.setHex(0x8b5cf6); // Turn purple on hover
            } else {
                // Full laser extension
                laser.scale.z = 1;
                laser.material.color.setHex(0xec4899); // Pink by default
            }
        }
    });

    // 3. Update orbit controls (only active when not in VR)
    if (!renderer.xr.isPresenting) {
        controls.update();
    }

    // 4. Render Scene
    renderer.render(scene, camera);
}
