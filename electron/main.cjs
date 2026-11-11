const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: "PharmaCare ERP & POS",
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    frame: true,
    backgroundColor: '#0f172a'
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production package, load bundled index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error("Failed to load local index.html:", err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Thermal Printer IPC handler
ipcMain.handle('print-pos-receipt', async (event, receiptData) => {
  try {
    if (!mainWindow) return { success: false, message: 'Window not ready' };
    
    const printOptions = {
      silent: false,
      printBackground: true,
      deviceName: receiptData?.printerName || '',
      pageSize: { height: 297000, width: 80000 }
    };

    return new Promise((resolve) => {
      mainWindow.webContents.print(printOptions, (success, errorType) => {
        if (!success) resolve({ success: false, error: errorType });
        else resolve({ success: true });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
