import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld(
  'electronChildWin',
  {
    send: (message: any): void => ipcRenderer.send('child-renderer-to-main-message-channel', message),
    sendSyncToMain: (message: any): any => ipcRenderer.sendSync('synch-child-renderer-to-main-message-channel', message),
  }
)
