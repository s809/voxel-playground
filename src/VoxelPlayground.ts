import * as THREE from 'three'
import { CodeEditor, type CodeEditorAPI } from './CodeEditor'

interface VoxelData {
  x: number
  y: number
  z: number
  color: number
}

export class VoxelPlayground {
  private container: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer

  // Voxel grid data
  private voxels: Map<string, VoxelData> = new Map()
  private voxelMeshes: Map<string, THREE.Mesh> = new Map()
  private voxelSize = 1

  // Camera controls
  private isPointerLocked = false
  private moveSpeed = 0.1
  private lookSpeed = 0.002
  private keys: { [key: string]: boolean } = {}
  private pitch = 0
  private yaw = 0

  // GUI controls
  private codeEditor!: CodeEditor
  private settings = {
    voxelColor: '#4CAF50',
    clearAll: () => this.clearAllVoxels(),
    exportData: () => this.exportVoxelData(),
    importData: () => this.importVoxelData()
  }

  constructor(container: HTMLElement) {
    this.container = container
  }

  public init(): void {
    this.setupScene()
    this.setupCamera()
    this.setupRenderer()
    this.setupLighting()
    this.setupControls()
    this.setupInfinitePlane()
    this.setupCodeEditor()
    this.setupEventListeners()
    this.animate()
  }

  private setupScene(): void {
    this.scene = new THREE.Scene()
    this.setupSkybox()
  }

  private setupSkybox(): void {
    // Create a simple gradient skybox
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32)

    // Create gradient material for sky
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87CEEB) }, // Sky blue
        bottomColor: { value: new THREE.Color(0xffffff) }, // White
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    })

    const sky = new THREE.Mesh(skyGeometry, skyMaterial)
    this.scene.add(sky)
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    )
    // Position will be set in setupControls with proper angle calculation
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Linear color space for accurate color representation
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NoToneMapping // No tone mapping for pure colors

    this.container.appendChild(this.renderer.domElement)
  }

  private setupLighting(): void {
    // High ambient light for accurate color representation
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9) // Pure white, high intensity
    this.scene.add(ambientLight)

    // Soft directional light for subtle shadows without color distortion
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4) // Pure white, low intensity
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048

    // Soft shadow settings
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20

    this.scene.add(directionalLight)
  }

  private setupControls(): void {
    // Setup pointer lock for controls
    this.renderer.domElement.addEventListener('click', () => {
      this.renderer.domElement.requestPointerLock()
    })

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement
    })

    // Mouse movement for looking around
    document.addEventListener('mousemove', (event) => {
      if (!this.isPointerLocked) return

      this.yaw -= event.movementX * this.lookSpeed
      this.pitch -= event.movementY * this.lookSpeed
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch))

      this.updateCameraRotation()
    })

    // Keyboard controls for movement
    document.addEventListener('keydown', (event) => {
      this.keys[event.key.toLowerCase()] = true

      // Escape to unlock pointer
      if (event.key === 'Escape') {
        document.exitPointerLock()
      }

      // Enter to unlock pointer as well
      if (event.key === 'Enter') {
        document.exitPointerLock()
      }
    })

    document.addEventListener('keyup', (event) => {
      this.keys[event.key.toLowerCase()] = false
    })

    // Set initial camera position and calculate angles to look at origin
    this.camera.position.set(15, 10, 15)

    // Calculate initial yaw and pitch to look at origin (0, 0, 0)
    const direction = this.camera.position.clone().normalize()
    this.yaw = Math.atan2(direction.x, direction.z)
    this.pitch = Math.asin(-direction.y)

    this.updateCameraRotation()
  }

  private updateCameraRotation(): void {
    // Create rotation quaternion from yaw and pitch
    const quaternion = new THREE.Quaternion()
    quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
    this.camera.quaternion.copy(quaternion)
  }

  private updateMovement(): void {
    if (!this.isPointerLocked) return

    // Calculate horizontal movement vectors based only on yaw (ignore pitch)
    const forwardHorizontal = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    )

    const rightHorizontal = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    )

    const up = new THREE.Vector3(0, 1, 0)

    const velocity = new THREE.Vector3()

    // WASD movement - W and S only move horizontally based on yaw
    if (this.keys['w']) velocity.add(forwardHorizontal)
    if (this.keys['s']) velocity.sub(forwardHorizontal)
    if (this.keys['a']) velocity.sub(rightHorizontal)
    if (this.keys['d']) velocity.add(rightHorizontal)
    if (this.keys[' ']) velocity.add(up) // Space for up
    if (this.keys['shift']) velocity.sub(up) // Shift for down

    velocity.normalize().multiplyScalar(this.moveSpeed)
    this.camera.position.add(velocity)
  }

  private setupInfinitePlane(): void {
    // Create an infinite gray plane
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000)
    const planeMaterial = new THREE.MeshLambertMaterial({
      color: 0x808080, // Gray color
      side: THREE.DoubleSide
    })

    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2 // Rotate to be horizontal
    plane.position.y = -0.01 // Slightly below y=0
    plane.receiveShadow = true

    this.scene.add(plane)
  }

  private setupCodeEditor(): void {
    const codePanel = document.querySelector('.code-panel') as HTMLElement
    if (!codePanel) return

    // Create API for code editor
    const api: CodeEditorAPI = {
      setVoxel: (x: number, y: number, z: number, color?: string) => {
        if (color) {
          const originalColor = this.settings.voxelColor
          this.settings.voxelColor = color
          this.addVoxel(x, y, z)
          this.settings.voxelColor = originalColor
        } else {
          this.addVoxel(x, y, z)
        }
      },
      removeVoxel: (x: number, y: number, z: number) => {
        const key = this.getVoxelKey(x, y, z)
        this.removeVoxel(key)
      },
      getVoxel: (x: number, y: number, z: number) => {
        const key = this.getVoxelKey(x, y, z)
        return this.voxels.get(key) || null
      },
      clearAll: () => {
        this.clearAllVoxels()
      },
      getVoxels: () => {
        return Array.from(this.voxels.values())
      },
      console: {
        log: () => {}, // Will be overridden by CodeEditor
        error: () => {}, // Will be overridden by CodeEditor
        clear: () => {} // Will be overridden by CodeEditor
      }
    }

    this.codeEditor = new CodeEditor(codePanel, api)
    this.codeEditor.init()
  }

  private setupEventListeners(): void {
    // Only window resize - removed voxel interaction events
    window.addEventListener('resize', () => this.onWindowResize())
  }

  private addVoxel(x: number, y: number, z: number, customColor?: string): void {
    const key = this.getVoxelKey(x, y, z)

    if (this.voxels.has(key)) return // Voxel already exists

    const colorStr = customColor || this.settings.voxelColor
    const color = new THREE.Color(colorStr).getHex()
    const voxelData: VoxelData = { x, y, z, color }

    this.voxels.set(key, voxelData)
    this.createVoxelMesh(voxelData)
  }

  private removeVoxel(key: string): void {
    if (!this.voxels.has(key)) return

    const mesh = this.voxelMeshes.get(key)
    if (mesh) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }
    }

    this.voxels.delete(key)
    this.voxelMeshes.delete(key)
  }

  private createVoxelMesh(voxelData: VoxelData): void {
    const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize)
    const material = new THREE.MeshLambertMaterial({ color: voxelData.color })
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.set(voxelData.x, voxelData.y + this.voxelSize / 2, voxelData.z)
    mesh.castShadow = true
    mesh.receiveShadow = true

    const key = this.getVoxelKey(voxelData.x, voxelData.y, voxelData.z)
    this.voxelMeshes.set(key, mesh)
    this.scene.add(mesh)
  }

  private getVoxelKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`
  }

  private clearAllVoxels(): void {
    this.voxelMeshes.forEach((mesh) => {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }
    })

    this.voxels.clear()
    this.voxelMeshes.clear()
  }

  private exportVoxelData(): void {
    const data = Array.from(this.voxels.values())
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'voxel-data.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  private importVoxelData(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as VoxelData[]
          this.clearAllVoxels()

          data.forEach(voxelData => {
            const key = this.getVoxelKey(voxelData.x, voxelData.y, voxelData.z)
            this.voxels.set(key, voxelData)
            this.createVoxelMesh(voxelData)
          })
        } catch (error) {
          console.error('Error importing voxel data:', error)
          alert('Error importing voxel data. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }

    input.click()
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())
    this.updateMovement()
    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    if (this.codeEditor) {
      this.codeEditor.dispose()
    }
    this.clearAllVoxels()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
