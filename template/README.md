# WebXR VR Template

A premium, zero-build, and highly customizable VR (WebXR) boilerplate built with **Three.js** and **Vanilla CSS**. It works out of the box with zero configuration and is designed specifically to be hosted on **GitHub Pages** (e.g., `https://<username>.github.io/<repository>/<gamename>/`).

## Features
- ⚡ **Zero Build Setup**: Uses modern browser `importmap` to resolve ES modules directly from a CDN. No Webpack, Vite, or npm installs required.
- 👓 **Immersive WebXR**: Built-in support for VR headsets (Meta Quest, Apple Vision Pro, Cardboard, etc.) via Three.js `VRButton`.
- 🕹️ **Controller Support**: Visual pointer rays, generic hand models, and interactive object selection with haptic feedback.
- 💻 **Desktop Fallback**: Uses OrbitControls for non-VR visitors, allowing click interaction.
- 🎨 **Premium Aesthetics**: Dark theme with neon accents, custom glassmorphism landing panel, custom styles for the default Three.js VR button, grid floor, and atmospheric fog.

---

## Folder Structure
```text
template/
├── index.html   # Main HTML entry point & Import Maps configuration
├── style.css    # Premium CSS styles, animations, and VRButton overrides
├── app.js       # Main application logic (Three.js setup, scene, controllers)
└── README.md    # Guide and deployment instructions (this file)
```

---

## Getting Started Locally

> [!IMPORTANT]
> WebXR APIs require a **Secure Context** (either `localhost` or `HTTPS`). If you try to access WebXR features over standard HTTP from another IP address, the browser will block them.

To run the template locally, you need a local web server:

### Option A: Using Node (npx)
If you have Node.js installed, run:
```bash
npx serve template
# or
npx http-server template
```

### Option B: Using Python
If you have Python installed, run:
```bash
# Python 3
python -m http.server --directory template
```

### Option C: VS Code Live Server
If you use VS Code, right-click `index.html` and select **"Open with Live Server"**.

---

## Deploying to GitHub Pages

To host your game at `https://<username>.github.io/<webvr_etc>/<gamename>/`, follow these steps:

1. **Create your Game Directory**:
   Copy the contents of the `template/` folder into a new folder named after your game, for example, `pong-vr/`:
   ```bash
   cp -r template pong-vr
   ```

2. **Commit and Push**:
   Add and push the files to your GitHub repository:
   ```bash
   git add pong-vr/
   git commit -m "Add Pong VR boilerplate"
   git push origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click on **Settings** -> **Pages**.
   - Under **Build and deployment**, set the source to **Deploy from a branch** and select your main branch (typically `main` and `/root`).
   - Click **Save**.

Your game will be available at:
`https://<your-username>.github.io/<webvr_etc>/pong-vr/`

---

## Customizing the Template

### Adding 3D Models (glTF/GLB)
To load a custom 3D model, you can import the `GLTFLoader` from the import map.
1. Add a model to your game directory (e.g., `pong-vr/assets/table.glb`).
2. Update `app.js` to import the loader:
   ```javascript
   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
   ```
3. Instantiate the loader and load the model:
   ```javascript
   const loader = new GLTFLoader();
   loader.load('assets/table.glb', (gltf) => {
       const model = gltf.scene;
       model.position.set(0, 1, -2);
       scene.add(model);
       
       // If you want it to be interactive, add it to the raycasting array:
       // interactiveObjects.push(model);
   });
   ```

### Adjusting Interactive Objects
The interactive objects are created in `createInteractiveShapes()` inside [app.js](file:///d:/repos/webvr_etc/template/app.js). You can modify their dimensions, colors, or physics.

The click/select behavior is handled in `triggerInteraction(object)`:
- Currently, it switches the object's color to a random neon color, boosts emissive glow, and does a pulse scale animation.
- You can extend this function to trigger game actions (like hitting a ball, clicking a menu, or opening doors).
