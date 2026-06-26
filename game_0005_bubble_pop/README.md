# Zen Bubble Popper (WebVR Game 0005)

A relaxing, satisfying WebVR game set in a peaceful garden. Stand before a cobblestone pebble pond and pop translucent, shimmering bubbles as they drift upward.

Optimized for **WebXR VR Headsets** (via tracked controllers and gaze fallback) and fully playable on **Desktop** and **Mobile** browsers.

---

## 🌸 Visuals & Aesthetics

- **Peaceful Garden Setting**: Features a circular grass meadow, low-poly cherry blossom trees, far-off mountains, soft clouds drifting across a morning sky, glowing Japanese stone lanterns (Toro), lily pads, lotus flowers, and surrounding pine trees.
- **Translucent Bubbles**: Shiny, translucent spheres styled with high reflectivity (`roughness: 0.05`, `metalness: 0.95`) and transparency, spawning both from the pond and scattered throughout the garden closer and further away.
- **Particle Droplet Splash**: Popping a bubble generates a burst of 12-18 tiny water droplets that spray outward, experience gravity, and fade away.
- **Glassmorphic UI**: High-contrast, clean pastel interfaces using the *Outfit* typeface. Includes a 3D in-world floating dashboard for VR players.

---

## 🔮 Bubble Types & Scoring

1. **Standard Bubble (Translucent Turquoise)**:
   - *Scoring*: `+1 Point` (multiplied by active boosts).
   - *Behavior*: Spawns continuously in a stream.
2. **Golden Bubble (Translucent Yellow)**:
   - *Scoring*: `+2 Points` on pop.
   - *Boost*: Activates a **2x Score Multiplier for 10 seconds**, turning the HUD golden and doubling all subsequent pops.
3. **Star Bubble (Translucent Lavender)**:
   - *Scoring*: `+3 Points` on pop.
   - *Boost*: Triggers a **cascade chain reaction**, instantly popping all active bubbles currently floating on screen.

---

## 🎵 Dynamic Audio Synthesis

Built entirely with the **HTML5 Web Audio API**—no external audio assets required.
- **Pop Sound**: A wet sweep sine wave combined with a fast bandpass noise burst.
- **Chime chord**: A pentatonic arpeggio sweep for golden power-up events.
- **Explosion sweep**: A descending triangle rumble for star bubble detonations.
- **Zen Ambience**: A low C3/G3 pitch drone playing in the background with randomized soft wind chimes.

## 🕹️ Controls

1. **VR Tracked Controllers (Recommended for VR)**:
   - **Aiming**: Point either controller at a bubble or 3D Start/Restart button (rendered as laser pointers).
   - **Popping / Interacting**: Pull the Trigger button on either controller.
2. **Gaze-Only (VR Headsets without Controllers)**:
   - Look around to center your camera reticle over bubbles or the 3D Start/Restart buttons.
   - Hovering over a bubble pops it immediately (instant 0ms fuse).
3. **Desktop (Keyboard & Mouse)**:
   - Click and drag the mouse on the screen to look around.
   - Hover the center reticle over bubbles to pop them.
4. **Mobile (Gaze/Tilt/Drag)**:
   - Drag your finger on the screen or look around (if gyro is enabled) to center your cursor over bubbles.

---

## 📁 File Structure

- **`index.html`**: Defines the HTML structure, preloads A-Frame library 1.6.0, sets up the 3D garden environment (trees, mountains, lighting), and configures the camera system.
- **`style.css`**: Styling sheets for the 2D start panels, game over stats, HUD labels, and screen multipliers banners.
- **`app.js`**: Core game script containing the synthesizer engines, particle effects, bubble update loops, and difficulty speed triggers.

---

## 🚀 Serving Locally & Deployment

### Serving Locally
To run the game on your local machine, serve the folder using any HTTP server:

**Using Python:**
```bash
python -m http.server 8000
```
Open `http://localhost:8000/game_0005_bubble_pop/` in your browser.

**Using Node.js:**
```bash
npx http-server -p 8000
```

### GitHub Pages Deployment
Because this project utilizes static files (HTML, CSS, JS) and CDNs for library links, it is 100% ready for hosting on **GitHub Pages**. Simply commit your files and push them to your repository:
`https://<your-username>.github.io/webvr_etc/game_0005_bubble_pop/`
