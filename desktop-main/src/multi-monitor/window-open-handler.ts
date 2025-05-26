import { app, BaseWindow, BrowserWindow, Event, KeyboardEvent, Menu, MenuItem } from "electron";
import * as path from 'path';
import { format } from 'url';
import { GmsBrand } from "../brand/gms-brand";
import { CertificateErrorResult, CertificateHelper } from "../certificate/certificate-helper";
import { ConnectionErrorInfo } from "../messaging/window-message.data";
import { MainTraceService } from "../tracing/main-trace-service";
import { defaultManagerWindowHeight, defaultManagerWindowMinHeight, defaultManagerWindowWidth, defaultManagerWindowMinWidth } from "./window-handler";

const defaultTopSpace = 40;
const defaultWidthDiff = 100;
const defaultHeightDiff = defaultTopSpace + 10;
const defaultTopSpaceClosedMode = 150;
const defaultHeightDiffClosedMode = defaultTopSpaceClosedMode + 10;

const zoomLevel100 = 5;
const zoomLevels = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];
const keyZoomIn = 'TITLE_BAR.ZOOM_IN';
const keyZoomOut = 'TITLE_BAR.ZOOM_OUT';
const keyZoomReset = 'TITLE_BAR.RESET_ZOOM';
const keyZoomRefresh = 'TITLE_BAR.REFRESH';
const keyGoBack = 'TITLE_BAR.GO_BACK';
const keyGoForward = 'TITLE_BAR.GO_FORWARD';
const keyView = 'TITLE_BAR.VIEW';
const keyNavigate = 'TITLE_BAR.NAVIGATE';


export class WindowOpenHandler {

  private translationText: any = {};
  private mapWinIdToUrl: Map<number, string> = new Map<number, string>();
  private connectionErrorPerWinId: Map<number, ConnectionErrorInfo> = new Map<number, ConnectionErrorInfo>();

  constructor(
    private closedMode: boolean,
    private brand: GmsBrand,
    private certificateHelper: CertificateHelper,
    private traceService: MainTraceService) {
    this.translationText[keyZoomIn] = 'Zoom in';
    this.translationText[keyZoomOut] = 'Zoom out';
    this.translationText[keyZoomReset] = 'Reset zoom';
    this.translationText[keyZoomRefresh] = 'Refresh';
    this.translationText[keyGoBack] = 'Go back';
    this.translationText[keyGoForward] = 'Go forward';
    this.translationText[keyView] = 'View';
    this.translationText[keyNavigate] = 'Navigate';
  }

  public setTranslationText(text: any): void {
    if (text != undefined) {
      Object.assign(this.translationText, text);
    }
  }

  public setWindowOpenHandler(parentWin: BrowserWindow): void {
    parentWin.webContents.setWindowOpenHandler((details: Electron.HandlerDetails) => {
      this.traceService.info(`WindowOpenHandler.setWindowOpenHandler():
      url: ${details.url}
      referrer: ${JSON.stringify(details.referrer)}`);

      const winRect = this.calculateWindowPosition(parentWin);
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: this.closedMode ? parentWin : undefined,
          modal: this.closedMode, // in closed-mode, switching between windows is tedious -> window is modal
          fullscreenable: false,
          icon: this.brand.getBrandIcon(),
          minimizable: !this.closedMode, // in closed-mode there is no taskbar -> tedious to restore the window again
          maximizable: !this.closedMode, // in closed-mode there is no taskbar -> difficult to switch between windows
          backgroundColor: '#f0f2f5',
          x: winRect.x,
          y: winRect.y,
          width: winRect.width,
          height: winRect.height,
          minWidth: defaultManagerWindowMinWidth - defaultWidthDiff,
          minHeight: defaultManagerWindowMinHeight - defaultHeightDiffClosedMode,
          webPreferences: {
            preload: path.join(__dirname, '../preload-child-window.js'),
            sandbox: true,
            contextIsolation: true
          }
        }
      }
    });
    //parentWin.setMenu(this.createMenu(parentWin, this.translationText));

    parentWin.webContents.on('did-create-window', (childWindow: BrowserWindow, details: Electron.DidCreateWindowDetails) => {
      this.traceService.info(`WindowOpenHandler.did-create-window(): Notification from parent window:
      Id=${childWindow.id}, url=${details.url}, referrer=${JSON.stringify(details.referrer)},
      postBody=${JSON.stringify(details.postBody)}, disposition =${details.disposition}`);
      childWindow.setMenu(this.createMenu(childWindow, this.translationText));

      if (app.isPackaged === false) {
        // Open the DevTools.
        childWindow.webContents.openDevTools();
      }

      childWindow.on('page-title-updated', (event: Electron.Event, title: String, _explicitSet: boolean) => {
        event.preventDefault(); // if not called, the loaded page title does always overwrite the custom setting of the window title
        if ((title != undefined) && (title !== '')) {
          childWindow.setTitle(`${this.brand.getBrandDisplayName()} - ${title}`);
        }
      });

      childWindow.on('close', () => {
        this.cleanUpChildWindow(childWindow.id);
      });

      childWindow.webContents.on('did-navigate', (_event: Event, url: string, responseCode: number, statusText: string) => {
        this.traceService.info(`WindowOpenHandler.did-navigate():
        Id=${childWindow.id}, url=${url}, code=${responseCode}, text=${statusText},
        canGoBack=${childWindow.webContents.navigationHistory.canGoBack()}, canGoFwd=${childWindow.webContents.navigationHistory.canGoForward()}`);

        if (responseCode === 404) {
          this.connectionErrorPerWinId.set(childWindow.id, new ConnectionErrorInfo(url, responseCode, statusText));
          this.mapWinIdToUrl.set(childWindow.id, url);
          this.loadConnectionRefusedErrorPageOnChildWindow(childWindow);
        }
      });

      childWindow.webContents.on('did-fail-load', (_event: Event, errorCode: number,
        errorDescription: string, validatedUrl: string, _isMainFrame: boolean, _frameProcessId: number, _frameRoutingId: number) => {
        this.traceService.error(`WindowOpenHandler.did-fail-load(): Failed to load child page:
        errorCode=${errorCode}; errorDescription=${errorDescription}; validatedUrl=${validatedUrl}`);

        this.connectionErrorPerWinId.set(childWindow.id, new ConnectionErrorInfo(validatedUrl, errorCode, errorDescription));
        this.mapWinIdToUrl.set(childWindow.id, validatedUrl);
        this.loadConnectionRefusedErrorPageOnChildWindow(childWindow);
      });

      childWindow.webContents.on('certificate-error', (event, url, error, certificate, callback, _isMainFrame) => {
        // this.traceService.info(`certificate-error; for child window, url=${url}; error=${error}`);

        const result = this.certificateHelper.handleServerCertificateErrorEvent(url, certificate, childWindow.id, error);
        if (result === CertificateErrorResult.NotAccepted) {
          childWindow.close();
        } else if (result === CertificateErrorResult.Accepted) {
          event.preventDefault();
          callback(true);
        } else if (result === CertificateErrorResult.ShowConfirmation) {
          // load the certificate error page into the child window.
          this.mapWinIdToUrl.set(childWindow.id, url);
          this.loadCertificateErrorPageOnChildWindow(childWindow);
        } else if (result === CertificateErrorResult.ShowConfirmationPending) {
          // Note: multiple certificate errors  can be issued here even before the first 'Server Certificate Error Page' got shown!!
          // => noting to do now, dependent on the user action (accept or deny), the app will be reloaded of closed.
        }
      });

      this.setWindowOpenHandler(childWindow);
    });
  }

  public reloadChildWindow(bWinId: number): void {
    const url = this.mapWinIdToUrl.get(bWinId);
    if (url != undefined) {
      BrowserWindow.fromId(bWinId)?.loadURL(url).then(() => {
        BrowserWindow.fromId(bWinId)?.webContents.clearHistory();
      });
    }
    this.mapWinIdToUrl.delete(bWinId);
    this.connectionErrorPerWinId.delete(bWinId);
  }

  public closeChildWindow(bWinId: number): void {
    BrowserWindow.fromId(bWinId)?.close();
  }

  public getConnectionErrorInfo(bWinId: number): ConnectionErrorInfo | undefined {
    return this.connectionErrorPerWinId.get(bWinId);
  }

  private loadCertificateErrorPageOnChildWindow(childWin: BrowserWindow): void {
    if (app.isPackaged) {
      childWin.loadURL(format({
        pathname: path.join(__dirname, '../../../../electron-ui/browser/index.html'),
        protocol: 'file:',
        hash: 'landing;content=certificate-error',
        slashes: true
      }));
    } else {
      childWin.loadURL('http://localhost/#/landing;content=certificate-error');
    }
    childWin.webContents.clearHistory();
  }

  private loadConnectionRefusedErrorPageOnChildWindow(childWin: BrowserWindow): void {
    if (app.isPackaged) {
      childWin.loadURL(format({
        pathname: path.join(__dirname, '../../../../electron-ui/browser/index.html'),
        protocol: 'file:',
        hash: 'landing;content=connection-error',
        slashes: true
      }));
    } else {
      childWin.loadURL('http://localhost/#/landing;content=connection-error');
    }
    childWin.webContents.clearHistory();
  }

  private cleanUpChildWindow(bWinId: number): void {
    const url = this.mapWinIdToUrl.get(bWinId);
    if (url != undefined) {
      this.certificateHelper.cleanupServerCertificateUrl(url);
    }
    this.mapWinIdToUrl.delete(bWinId);
    this.connectionErrorPerWinId.delete(bWinId);
  }

  private calculateWindowPosition(parentWin: BrowserWindow): Electron.Rectangle {
    let rectangle: Electron.Rectangle = { x: 0, y: 0, width: 0, height: 0 };
    const bounds = parentWin.getBounds();
    rectangle.width = defaultManagerWindowWidth - defaultWidthDiff;
    rectangle.y = Math.round(bounds.y + defaultTopSpace);
    if (bounds.width < rectangle.width) {
      rectangle.width = bounds.width;
    }
    rectangle.height = defaultManagerWindowHeight - defaultHeightDiff;
    if (bounds.height < rectangle.height + defaultTopSpace) {
      rectangle.height = bounds.height - defaultTopSpace;
    }
    if (this.closedMode) {
      // in closed mode we want to see the summary bar
      // => the y-position of the opened window is defaultTopSpaceClosedMode px lower than the y position of the parent window
      rectangle.y = Math.round(bounds.y + defaultTopSpaceClosedMode);
      rectangle.height = defaultManagerWindowHeight - defaultHeightDiffClosedMode;
      if (bounds.height < rectangle.height + defaultTopSpaceClosedMode) {
        rectangle.height = bounds.height - defaultTopSpaceClosedMode;
      }
    }
    rectangle.x = Math.round(bounds.x + (bounds.width - rectangle.width) / 2);
    return rectangle;
  }

  private createMenu(childWindow: BrowserWindow, translationText: any): Menu {
    // the menu creation via template did not work.
    // => creating the menu programmatically:

    let childMenu = new Menu();

    childMenu.append(new MenuItem({ label: translationText[keyNavigate], id: 'navigate', submenu: new Menu() }));
    childMenu.items[0].submenu!.append(new MenuItem({
      label: translationText[keyGoBack], id: 'go-back', enabled: false,
      click: (_menuItem: MenuItem, browserWindow: BaseWindow | undefined, _event: KeyboardEvent) => {
        (browserWindow as BrowserWindow)?.webContents.navigationHistory.goBack();
      }
    }));
    childMenu.items[0].submenu!.append(new MenuItem({
      label: translationText[keyGoForward], id: 'go-forward', enabled: false,
      click: (_menuItem: MenuItem, browserWindow: BaseWindow | undefined, _event: KeyboardEvent) => {
        (browserWindow as BrowserWindow)?.webContents.navigationHistory.goForward();
      }
    }));

    childWindow.webContents.on('did-navigate', (_event: Event, _url: string, _responseCode: number, _statusText: string) => {
      childMenu.items[0].submenu!.items[0].enabled = childWindow.webContents.navigationHistory.canGoBack();
      childMenu.items[0].submenu!.items[1].enabled = childWindow.webContents.navigationHistory.canGoForward();
    });
    childWindow.webContents.on('did-navigate-in-page', (_event: Event, _url: string, _isMainframe: boolean, _frameProcessId: number) => {
      childMenu.items[0].submenu!.items[0].enabled = childWindow.webContents.navigationHistory.canGoBack();
      childMenu.items[0].submenu!.items[1].enabled = childWindow.webContents.navigationHistory.canGoForward();
    });

    childMenu.append(new MenuItem({ label: translationText[keyView], id: 'view', submenu: new Menu() }));
    childMenu.items[1].submenu!.append(new MenuItem({
      label: translationText[keyZoomIn],
      id: 'zoom-in',
      role: 'zoomIn',
      accelerator: 'CommandOrControl+=',
      enabled: true,
      click: (_menuItem: MenuItem, browserWindow: BaseWindow | undefined, _event: KeyboardEvent) => {
        const zoomCurrent: number = Math.round((browserWindow as BrowserWindow)!.webContents.getZoomFactor() * 100);
        let zoomLevelCurrent = zoomLevels.findIndex(z => z === zoomCurrent);
        if (zoomLevels.length > zoomLevelCurrent + 1) {
          zoomLevelCurrent = zoomLevelCurrent + 1;
          (browserWindow as BrowserWindow)?.webContents.setZoomFactor(zoomLevels[zoomLevelCurrent] / 100);
        }
      }
    }));
    childMenu.items[1].submenu!.append(new MenuItem({
      label: translationText[keyZoomOut],
      id: 'zoom-out',
      role: 'zoomOut',
      enabled: true,
      click: (_menuItem: MenuItem, browserWindow: BaseWindow | undefined, _event: KeyboardEvent) => {
        const zoomCurrent: number = Math.round((browserWindow as BrowserWindow)!.webContents.getZoomFactor() * 100);
        let zoomLevelCurrent = zoomLevels.findIndex(z => z === zoomCurrent);
        if (zoomLevelCurrent > 0) {
          zoomLevelCurrent = zoomLevelCurrent - 1;
          (browserWindow as BrowserWindow)?.webContents.setZoomFactor(zoomLevels[zoomLevelCurrent] / 100);
        }
      }
    }));
    childMenu.items[1].submenu!.append(new MenuItem({
      label: translationText[keyZoomReset],
      id: 'reset-zoom',
      role: 'resetZoom',
      click: (_menuItem: MenuItem, browserWindow: BaseWindow | undefined, _event: KeyboardEvent) => {
        (browserWindow as BrowserWindow)?.webContents.setZoomFactor(zoomLevels[zoomLevel100] / 100);
      }
    }));
    childMenu.items[1].submenu!.append(new MenuItem({ type: 'separator' }));
    childMenu.items[1].submenu!.append(new MenuItem({
      label: translationText[keyZoomRefresh], id: 'refresh',
      click: (_menuItem: MenuItem, browserWindow: BaseWindow | undefined, _event: KeyboardEvent) => {
        (browserWindow as BrowserWindow)?.reload();
      }
    }));

    return childMenu;
  }
}
