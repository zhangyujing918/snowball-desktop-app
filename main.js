const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const menuTemplate = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin', accelerator: 'CommandOrControl+=' },   // 修复快捷键bug
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // 页面跳转菜单，可随时切换到其他任何页面
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Home',
          click: () => {
            mainWindow.loadFile('home.html');
          }
        },
        {
          label: 'Pricing',
          click: () => {
            mainWindow.loadFile('pricing.html');
          }
        },
        {
          label: 'Backtesting',
          click: () => {
            mainWindow.loadFile('backtesting.html');
          }
        },
        {
          label: 'Monte-Carlo',
          click: () => {
            mainWindow.loadFile('monte-carlo.html');
          }
        }
      ]
    },
    {
      label: 'Pricing',
      submenu: [
        // 读取并传送回测结果
        {
          label: 'Get Probability',
          click: () => {
            // 获取路径
            dialog.showOpenDialog({ properties: ['openFile'] }).then(function (response) {
              if (!response.canceled) {
                const selectedFile = response.filePaths[0];
                const fileExtension = path.extname(selectedFile);
                // 检查文件扩展名是否为 .json
                if (fileExtension.toLowerCase() === '.json') {
                  // 读取文件，传给 renderer
                  fs.readFile(selectedFile, 'utf8', (err, result) => {
                    if (err) {
                      console.error('Error reading pricing file:', err);
                      return;
                    }
                    mainWindow.webContents.send('pricing-prob', result);
                  });
                } else {
                  dialog.showErrorBox('-1001', '数据格式错误');
                }
              }
            });
          },
        }
      ]
    },
    {
      label: 'Backtesting',
      submenu: [
        // 读取并传送回测结果
        {
          label: 'Get Result',
          click: () => {
            // 获取路径
            dialog.showOpenDialog({ properties: ['openFile'] }).then(function (response) {
              if (!response.canceled) {
                const selectedFile = response.filePaths[0];
                const fileExtension = path.extname(selectedFile);
                // 检查文件扩展名是否为 .json
                if (fileExtension.toLowerCase() === '.json') {
                  // 读取文件，传给 renderer
                  fs.readFile(selectedFile, 'utf8', (err, result) => {
                    if (err) {
                      console.error('Error reading backtesting result file:', err);
                      return;
                    }
                    mainWindow.webContents.send('snb-result', result);
                  });
                } else {
                  dialog.showErrorBox('-1001', '数据格式错误');
                }
              }
            });
          },
        }
      ]
    },
    {
      label: 'Monte-Carlo',
      submenu: [
        // 读取并传送路径json
        {
          label: 'Get Path',
          click: () => {
            // 获取路径
            dialog.showOpenDialog({ properties: ['openFile'] }).then(function (response) {
              if (!response.canceled) {
                const selectedFile = response.filePaths[0];
                const fileExtension = path.extname(selectedFile);
                // 检查文件扩展名是否为 .json
                if (fileExtension.toLowerCase() === '.json') {
                  // 读取文件，传给 renderer
                  fs.readFile(selectedFile, 'utf8', (err, path) => {
                    if (err) {
                      console.error('Error reading Monte Carlo path file:', err);
                      return;
                    }
                    mainWindow.webContents.send('mc-path', path);
                  });
                } else {
                  dialog.showErrorBox('-1001', '数据格式错误');
                }
              }
            });
          },
        },
      ]
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile('home.html');
  mainWindow.webContents.openDevTools();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});