const { app, BrowserWindow } = require('electron');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 800,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('www/index.html');

  // Interceptar enlaces externos para abrirlos en el navegador predeterminado del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});