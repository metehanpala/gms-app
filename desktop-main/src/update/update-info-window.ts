import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { format } from 'url';

export class UpdateInfoWindow {

  private childWindow: BrowserWindow | undefined;

  constructor() {}

  public getWindowHandle(): Buffer | undefined {
    return (this.childWindow !== undefined)? this.childWindow.getNativeWindowHandle(): undefined;
  }

  public isWindowShown(): boolean {
    return (this.childWindow !== undefined) ? true : false;
  }

  public showWindow(parent: BrowserWindow): void {
    if (parent.isMinimized()) {
      parent.restore();
    }

    const bounds = parent.getBounds();
    const childHeight = 305;
    const childWidth = 500;
    this.childWindow = new BrowserWindow({
      parent: parent,
      modal: true,
      height: childHeight,
      width: childWidth,
      x: Math.round(bounds.x + (bounds.width - childWidth)/2),
      // y: Math.round(bounds.y + (bounds.height - childHeight)/2), // center
      y: Math.round(bounds.y + 36), // top
      resizable: false,
      movable: false,
      backgroundColor: '#f0f2f5',
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        sandbox: true,
        contextIsolation: true,
        enablePreferredSizeMode: true
      }
    });

    // if(app.isPackaged === false) {
    //   // Open the DevTools.
    //   this.childWindow.webContents.openDevTools();
    // }

    this.childWindow.on('closed', () => {
      this.childWindow = undefined;
    });

    if (app.isPackaged) {
      this.childWindow.loadURL(format({
        pathname: path.join(__dirname, '../../../../electron-ui/browser/index.html'),
        protocol: 'file:',
        hash: 'update-info',
        slashes: true
      }));
    } else {
      this.childWindow.loadURL('http://localhost:4200#update-info');
    }
  }

  public closeWindow(): void {
    this.childWindow?.close();
  }
}
