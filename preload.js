const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
})

contextBridge.exposeInMainWorld('electronAPI', {
  passPricingProb: (callback) => ipcRenderer.on('pricing-prob', callback),
  passMCPath: (callback) => ipcRenderer.on('mc-path', callback),
  passSnbResult: (callback) => ipcRenderer.on('snb-result', callback),
})