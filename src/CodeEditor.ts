import * as monaco from 'monaco-editor'

export interface CodeEditorAPI {
  setVoxel: (x: number, y: number, z: number, color?: string) => void
  removeVoxel: (x: number, y: number, z: number) => void
  getVoxel: (x: number, y: number, z: number) => {x: number, y: number, z: number, color: number} | null
  clearAll: () => void
  getVoxels: () => Array<{x: number, y: number, z: number, color: number}>
  console: {
    log: (...args: any[]) => void
    error: (...args: any[]) => void
    clear: () => void
  }
}

export class CodeEditor {
  private container: HTMLElement
  private editor!: monaco.editor.IStandaloneCodeEditor
  private api: CodeEditorAPI

  private defaultCode = `// 🎮 3D Voxel Playground
// Controls: WASD - movement, Mouse - look around, Space/Shift - up/down
// Click on the 3D area to capture cursor
// Escape or Enter to release cursor

// Example: create a colorful tower
function createRainbowTower() {
  console.clear()
  api.clearAll()

  for (let y = 0; y < 10; y++) {
    const hue = (y * 36) % 360
    api.setVoxel(0, y, 0, \`hsl(\${hue}, 100%, 50%)\`)
  }

  console.log('🌈 Rainbow tower created!')
}

// Example: create a house
function createHouse() {
  console.clear()
  api.clearAll()

  // House walls (5x5x5)
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      for (let y = 0; y < 4; y++) {
        // Create only walls (hollow inside)
        if (x === -2 || x === 2 || z === -2 || z === 2) {
          api.setVoxel(x, y, z, '#8B4513') // Brown walls
        }
      }
    }
  }

  // Roof
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      api.setVoxel(x, 4, z, '#FF0000') // Red roof
    }
  }

  // Door
  api.removeVoxel(0, 0, -2)
  api.removeVoxel(0, 1, -2)

  console.log('🏠 House built!')
}

// Example: create a spiral
function createSpiral() {
  console.clear()
  api.clearAll()

  let angle = 0
  for (let y = 0; y < 20; y++) {
    const radius = 5
    const x = Math.round(Math.cos(angle) * radius)
    const z = Math.round(Math.sin(angle) * radius)
    api.setVoxel(x, y, z, \`hsl(\${y * 18}, 100%, 50%)\`)
    angle += 0.3
  }

  console.log('🌀 Spiral created!')
}

// Example: create a chessboard
function createChessboard() {
  console.clear()
  api.clearAll()

  const size = 8
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const isWhite = (x + z) % 2 === 0
      const color = isWhite ? '#FFFFFF' : '#000000'
      api.setVoxel(x - size/2, 0, z - size/2, color)
    }
  }

  console.log('♟️ Chessboard created!')
}

// Example: check voxels
function checkVoxels() {
  console.clear()

  // Create some voxels
  api.setVoxel(0, 0, 0, '#FF0000') // Red
  api.setVoxel(1, 0, 0, '#00FF00') // Green
  api.setVoxel(2, 0, 0, '#0000FF') // Blue

  // Check that they exist
  const red = api.getVoxel(0, 0, 0)
  const green = api.getVoxel(1, 0, 0)
  const blue = api.getVoxel(2, 0, 0)
  const empty = api.getVoxel(5, 5, 5)

  if (red) console.log('Red voxel found:', red)
  if (green) console.log('Green voxel found:', green)
  if (blue) console.log('Blue voxel found:', blue)
  console.log('Empty position (5,5,5):', empty || 'Nothing there')

  console.log('🔍 Voxel check completed!')
}

// Run one of the functions:
createRainbowTower()
// createHouse()
// createSpiral()
// createChessboard()
// checkVoxels()`

  constructor(container: HTMLElement, api: CodeEditorAPI) {
    this.container = container

    // Simple Monaco Environment setup for Vite
    ;(window as any).MonacoEnvironment = {
      getWorkerUrl: function (_moduleId: string, _label: string) {
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
          self.MonacoEnvironment = {
            baseUrl: 'https://unpkg.com/monaco-editor@latest/min/'
          };
          importScripts('https://unpkg.com/monaco-editor@latest/min/vs/base/worker/workerMain.js');
        `)}`
      }
    }

    this.api = api
    this.setupConsoleRedirect()
  }

  public init(): void {
    this.createEditorLayout()
    this.createEditor()
    this.addActionButtons()
  }

  private createEditorLayout(): void {
    this.container.innerHTML = `
      <div class="code-editor-layout">
        <div class="code-editor-header">
          <h3>Code Playground</h3>
          <div class="editor-actions">
            <button id="run-code" class="action-btn run-btn">▶️ Run</button>
            <button id="clear-code" class="action-btn">🗑️ Clear</button>
            <button id="reset-code" class="action-btn">🔄 Reset</button>
          </div>
        </div>
        <div class="code-editor-content">
          <div id="monaco-editor" class="monaco-container"></div>
          <div class="output-panel">
            <div class="output-header">
              <span>Console</span>
              <button id="clear-console" class="clear-console-btn">Clear</button>
            </div>
            <div id="code-output" class="code-output"></div>
          </div>
        </div>
      </div>
    `
  }

  private createEditor(): void {
    const editorContainer = document.getElementById('monaco-editor')!

    this.editor = monaco.editor.create(editorContainer, {
      value: this.defaultCode,
      language: 'javascript',
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      automaticLayout: true,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3
    })
  }

  private addActionButtons(): void {
    const runBtn = document.getElementById('run-code')!
    const clearBtn = document.getElementById('clear-code')!
    const resetBtn = document.getElementById('reset-code')!
    const clearConsoleBtn = document.getElementById('clear-console')!

    runBtn.addEventListener('click', () => this.runCode())
    clearBtn.addEventListener('click', () => this.clearCode())
    resetBtn.addEventListener('click', () => this.resetCode())
    clearConsoleBtn.addEventListener('click', () => this.clearConsole())

    // Hotkeys
    this.editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => this.runCode()
    })
  }

  private setupConsoleRedirect(): void {
    const originalLog = console.log
    const originalError = console.error

    this.api.console = {
      log: (...args: any[]) => {
        this.addToOutput(args.join(' '), 'log')
        originalLog.apply(console, args)
      },
      error: (...args: any[]) => {
        this.addToOutput(args.join(' '), 'error')
        originalError.apply(console, args)
      },
      clear: () => {
        this.clearConsole()
      }
    }
  }

  private addToOutput(message: string, type: 'log' | 'error' = 'log'): void {
    const outputElement = document.getElementById('code-output')!
    const messageElement = document.createElement('div')
    messageElement.className = `output-line output-${type}`
    messageElement.textContent = `${new Date().toLocaleTimeString()} | ${message}`

    outputElement.appendChild(messageElement)
    outputElement.scrollTop = outputElement.scrollHeight
  }

  private clearConsole(): void {
    const outputElement = document.getElementById('code-output')!
    outputElement.innerHTML = ''
  }

  private runCode(): void {
    try {
      const code = this.editor.getValue()

      // Create safe execution environment
      const safeEval = new Function('api', 'console', code)

      this.addToOutput('🚀 Running code...', 'log')
      safeEval(this.api, this.api.console)

    } catch (error) {
      this.addToOutput(`❌ Error: ${error}`, 'error')
    }
  }

  private clearCode(): void {
    this.editor.setValue('')
    this.editor.focus()
  }

  private resetCode(): void {
    this.editor.setValue(this.defaultCode)
    this.clearConsole()
    this.editor.focus()
  }

  public getCode(): string {
    return this.editor.getValue()
  }

  public setCode(code: string): void {
    this.editor.setValue(code)
  }

  public dispose(): void {
    this.editor.dispose()
  }
}
