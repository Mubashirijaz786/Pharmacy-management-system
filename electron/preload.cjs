const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  printReceipt: (receiptData) => ipcRenderer.invoke('print-pos-receipt', receiptData)
});
