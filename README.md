# BlenderCell - 3D Cell Biology Viewer

Interactive web viewer for 3D cell models exported from Blender.

## Quick Start

```bash
npm install
npm run dev
```

## Adding Models

### Option 1: Download from Sketchfab
1. Download from https://sketchfab.com/3d-models/animal-cell-downloadable-ddc40bb0900544959f02d3ff83c32615
2. Choose **glTF** format when downloading
3. Place the `.glb` file in `/models/cell.glb`

### Option 2: Export from Blender
1. Open your `.blend` file in Blender
2. Go to **File → Export → glTF 2.0 (.glb/.gltf)**
3. Recommended export settings:
   - Format: **glTF Binary (.glb)** - single file, easier to manage
   - Include: Check **Selected Objects** if you only want specific objects
   - Transform: Apply all transforms
   - Geometry: Check **Apply Modifiers**
   - Compression: Enable **Draco mesh compression** for smaller files
4. Save to `/models/cell.glb`

## Project Structure

```
blendercell/
├── models/          # Place .glb/.gltf files here
├── public/          # Static assets
├── src/
│   └── main.js      # Three.js viewer
├── index.html
└── package.json
```

## Model Resources

**Free cell models:**
- [Sketchfab - Animal Cell](https://sketchfab.com/3d-models/animal-cell-downloadable-ddc40bb0900544959f02d3ff83c32615)
- [Free3D - Blender Cell Models](https://free3d.com/3d-models/blender-cell)
- [IconScout - Cell Biology](https://iconscout.com/3d-illustrations/cell-biology)

## Controls

- **Left-click + drag**: Rotate
- **Scroll**: Zoom in/out
- **Right-click + drag**: Pan

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready to deploy.
