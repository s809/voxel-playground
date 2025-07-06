import './style.css'
import { VoxelPlayground } from './VoxelPlayground'

// Initialize the voxel playground
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div id="voxel-container">
    <h1>🎮 3D Voxel Playground</h1>
    <div class="code-panel"></div>
    <div id="canvas-container"></div>
  </div>
`

// Create and start the voxel playground
const playground = new VoxelPlayground(
  document.getElementById('canvas-container')!
)
playground.init()
