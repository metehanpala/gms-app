import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

var messageHandler: any;

ipcRenderer.on('main-to-renderer-message-channel', (_event: IpcRendererEvent, message: any) => {
  notifyMethod(_event, message);
})

function notifyMethod(_event: IpcRendererEvent, msg: any) {
  // console.log('Preload: message from main: ', msg);
  if (messageHandler != undefined) {
    messageHandler(msg.webContentsId, msg);
  } else {
    console.warn(`gmsApplication_DesktopMain: Preload.js: messageHandler not subscribed yet! message=${JSON.stringify(msg)}`);
  }
}

contextBridge.exposeInMainWorld(
  'electron',
  {
    send: (message: any): void => ipcRenderer.send('renderer-to-main-message-channel', message),
    sendAsync: (message: any): Promise<any> => ipcRenderer.invoke('asynch-renderer-to-main-message-channel', message),
    sendSyncToMain: (message: any): any => ipcRenderer.sendSync('synch-renderer-to-main-message-channel', message),
    // sendToRenderer: (id: number, message: any): any => ipcRenderer.sendTo(id, 'main-to-renderer-message-channel', message),
    subscribeForMessages: (handler: any) => { messageHandler = handler; }
  }
)
