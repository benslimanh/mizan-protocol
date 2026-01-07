const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Add API methods here
    sendMessage: (channel, data) => ipcRenderer.send(channel, data),
    onMessage: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});
