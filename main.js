const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

// Function to start the Python backend
function startPythonBackend() {
  let scriptPath;
  let pythonExecutable;
  let args;

  if (app.isPackaged) {
    // Production: Use the bundled executable
    // In electron-builder, extraResources are placed in resources/
    const backendPath = path.join(process.resourcesPath, 'backend');
    const exeName = 'api.exe'; // Windows
    scriptPath = path.join(backendPath, exeName);

    console.log(`Starting Production Backend: ${scriptPath}`);
    pythonProcess = spawn(scriptPath);
  } else {
    // Development: Use python command
    pythonExecutable = 'python'; // Or from venv
    scriptPath = path.join(__dirname, 'backend', 'app.py');
    args = [scriptPath];

    console.log(`Starting Development Backend: ${pythonExecutable} ${scriptPath}`);
    pythonProcess = spawn(pythonExecutable, args);
  }

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python Backend stdout: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Backend stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python Backend exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the React app
  // In development, we load from the Vite dev server
  // In production, we would load from file://${path.join(__dirname, 'frontend/dist/index.html')}
  const isDev = !app.isPackaged; // Or use an environment variable

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Ensure the Python process is killed when the app quits
  if (pythonProcess) {
    pythonProcess.kill();
  }
});
