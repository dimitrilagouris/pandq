import { app, BrowserWindow, session, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './database';
import { registerAllHandlers } from './ipc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

/**
 * Apply a Content Security Policy to all renderer responses.
 * Development mode permits the Vite dev server and HMR websocket;
 * production locks sources down to 'self' only.
 */
function applyContentSecurityPolicy(): void {
  const isDev = !!process.env.VITE_DEV_SERVER_URL;

  const csp = isDev
    ? [
        "default-src 'self'",
        // Vite injects an inline script preamble for React Fast Refresh
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://www.transparenttextures.com https://*.tile.openstreetmap.org https://*.openstreetmap.org https://*.basemaps.cartocdn.com https://*.cartocdn.com",
        "connect-src 'self' ws://localhost:* http://localhost:* https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://*.openstreetmap.org https://*.basemaps.cartocdn.com https://*.cartocdn.com",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://www.transparenttextures.com https://*.tile.openstreetmap.org https://*.openstreetmap.org https://*.basemaps.cartocdn.com https://*.cartocdn.com",
        "connect-src 'self' https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://*.openstreetmap.org https://*.basemaps.cartocdn.com https://*.cartocdn.com",
      ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((_details, callback) => {
    callback({
      responseHeaders: {
        ..._details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

/**
 * Create the main application window.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();
  mainWindow.show();

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open links in external browser if target="_blank" is used
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialise window, database, and handlers on application ready state
app.whenReady().then(() => {
  initDatabase(__dirname);
  registerAllHandlers();
  applyContentSecurityPolicy();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Terminate application when all windows are closed on non-macOS platforms
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
