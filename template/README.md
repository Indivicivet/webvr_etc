# WebXR VR Template

A zero-build and minimal VR (WebXR) boilerplate built with **A-Frame** and **Vanilla CSS**. It works out of the box and is ready to be hosted on **GitHub Pages**.

## Folder Structure
```text
template/
├── index.html   # HTML layout, A-Frame scene, and camera rig
├── style.css    # Glassmorphic start screen styles
└── app.js       # Audio synthesis and click interaction logic
```

## Running Locally

To run the template locally, start a local web server inside the `template/` directory:

```bash
# Python 3
python -m http.server --directory template
```

## Deploying to GitHub Pages

1. Copy the `template/` directory to a new folder named after your game:
   ```bash
   cp -r template my-vr-game
   ```
2. Commit and push the new folder to your GitHub repository.
3. Enable GitHub Pages in your repository settings (Settings -> Pages), setting the source to your main branch.
4. Your game will be live at: `https://<username>.github.io/<repository>/my-vr-game/`
