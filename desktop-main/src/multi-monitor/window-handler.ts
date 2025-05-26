import { app, BrowserWindow, nativeTheme } from "electron";
import * as path from 'path';
import { format } from 'url';
import { ManagerType, ManagerWindow } from "../../../src/app/desktop-renderer/multi-monitor/multi-monitor-configuration.data";
import { EndpointFile } from "../endpoint/endpoint-file";
import { MainTraceService } from "../tracing/main-trace-service";
import { MultiMonitorConfigurationHandler } from "./multi-monitor-configuration-handler";
import { AppInfo, BootstrapInfo, ConnectionErrorInfo, ElectronThemeType, GetWindowRequestInfo, ShowBackDropInfo, ShowBackDropReason, ShutdownInfo, UiState, WindowInfo } from '../messaging/window-message.data'
import { WindowMessageService } from "../messaging/window-message.service";
import { WindowCloseController } from "./window-close-controller";
import { WsiService } from "../messaging/wsi.service";
import { WindowOpenHandler } from "./window-open-handler";
import { GmsBrand } from "../brand/gms-brand";
import { CertificateErrorResult, CertificateHelper } from "../certificate/certificate-helper";

export enum MainWindowType {
  FlexClientApplication = 'flex-client-application',
  EndpointConfiguration = 'endpoint-configuration',
  ServerCertificateError = 'server-certificate-error',
  ConnectionError = 'connection-error'
}

export const defaultManagerWindowWidth = 1200;
export const defaultManagerWindowHeight = 800;
export const defaultManagerWindowMinWidth = 800;
export const defaultManagerWindowMinHeight = 600;

export const defaultRulesWindowWidth = 1200;
export const defaultRulesWindowHeight = 900;
export const defaultRulesWindowMinWidth = 1200;
export const defaultRulesWindowMinHeight = 900;

const colorElementBase1Light = '#FFFFFF';
const colorElementBase1Dark = '#23233C';
const colorElementActionSecondaryTextLight = '#007993';
const colorElementActionSecondaryTextDark = '#00CCCC';

export class WindowHandler {

  public appInfo?: AppInfo;
  private _mainMangerWindow?: BrowserWindow;
  private _additionalManagerWindows: BrowserWindow[] = [];
  private readyToCommunicate = new Map<number, boolean>();
  private mapWindowIdRuntimeToConfiguration = new Map<number, string>();
  private mapWindowIdRuntimeToTitle = new Map<number, string>();
  private endpointFile: EndpointFile;
  private windowMessageService!: WindowMessageService;
  public currentMainManagerConnectionError: ConnectionErrorInfo | undefined;
  private windowCloseController!: WindowCloseController;
  private mainWindowTypeLoaded = MainWindowType.FlexClientApplication;
  private bootstrapWindowsDone = false;
  private _uiSyncState: UiState | undefined;
  private openWindowHandler: WindowOpenHandler;
  private brand!: GmsBrand;
  private _communicationRulesWindow?: BrowserWindow;

  constructor(
    private configurationHandler: MultiMonitorConfigurationHandler,
    private wsiService: WsiService,
    private certificateHelper: CertificateHelper,
    private traceService: MainTraceService) {
      this.endpointFile = new EndpointFile(traceService)
      this.brand = new GmsBrand(traceService);
      this.openWindowHandler = new WindowOpenHandler(this.configurationHandler.closedMode, this.brand, this.certificateHelper, traceService);
    }

  public inject(windowMessageService: WindowMessageService): void {
    this.windowMessageService = windowMessageService;
    this.windowCloseController = new WindowCloseController(this);
  }

  public getOpenWindowHandler(): WindowOpenHandler {
    return this.openWindowHandler;
  }

  public getWindowConfigurationId(browserWindowId: number) : string | undefined {
    return this.mapWindowIdRuntimeToConfiguration.get(browserWindowId);
  }

  public getBrowserWindowIdFromConfigId(configId: string): number | undefined {
    let keyFound: number | undefined;
    this.mapWindowIdRuntimeToConfiguration.forEach((value, key) => {
      if (value === configId) {
        keyFound = key;
      }
    });
    return keyFound;
  }

  public getBrowserWindowIdsFromConfigIds(configIds: string[]): number[] {
    let keysFound: number[] = [];
    configIds.forEach(id => {
      const keyFound = this.getBrowserWindowIdFromConfigId(id);
      if (keyFound !== undefined) {
        keysFound.push(keyFound);
      }
    });
    return keysFound;
  }

  public isReadyToCommunicate(windowId: number) : boolean {
    const ready = this.readyToCommunicate.get(windowId);
    return (ready !== undefined)? ready: false;
  }

  public newMainManagerWindow(): void {
    if (this.configurationHandler.checkForCreation(ManagerType.Main)) {
      const endpointAddress = this.endpointFile.read();
      this._mainMangerWindow = this.createWindow(
        endpointAddress, undefined, undefined, defaultManagerWindowWidth, defaultManagerWindowHeight, this.configurationHandler.closedMode, true);
      this.setWindowAttributes(this._mainMangerWindow, true);

      if (endpointAddress === undefined) {
        this.loadEndpointConfigurePageOnMainManagerWindow();
      }

      this.readyToCommunicate.set(this._mainMangerWindow.id, false);
      const mgrWin = this.configurationHandler.newManagerWindowConfiguration(this._mainMangerWindow, ManagerType.Main);
      this.mapWindowIdRuntimeToConfiguration.set(this._mainMangerWindow.id, mgrWin!.id);
      this.openWindowHandler.setWindowOpenHandler(this._mainMangerWindow);
      this.traceService.info(
        `WindowHandler.newMainManagerWindow():
        Main manager browser window created! Id:=${this._mainMangerWindow.id}, Manager window config Id=${mgrWin!.id}`);
    }
  }

  public newAdditionalSystemManagerWindow(initialUrl?: string): void {
    if (!this.configurationHandler.changeCurrentConfigurationAllowed) {
      return;
    }

    // the optional initialUrl may specify a complete deeplink including query parameters.
    if (this.configurationHandler.checkForCreation(ManagerType.System)) {
      const url = (initialUrl) ? initialUrl : this.endpointFile.read();
      const newWin = this.createWindow(url, undefined, undefined, defaultManagerWindowWidth, defaultManagerWindowHeight);
      this._additionalManagerWindows.push(newWin);
      this.readyToCommunicate.set(newWin.id, false);
      const mgrWin = this.configurationHandler.newManagerWindowConfiguration(newWin, ManagerType.System);
      this.mapWindowIdRuntimeToConfiguration.set(newWin.id, mgrWin!.id);
      this.openWindowHandler.setWindowOpenHandler(newWin);
      this.traceService.info(`WindowHandler.newAdditionalSystemManagerWindow():
      Additional manager browser window created! Id=${newWin.id}, Manager window config Id=${mgrWin!.id}`);
    }
  }

  public newEventManagerWindow(initialUrl?: string): void {
    if (!this.configurationHandler.changeCurrentConfigurationAllowed) {
      return;
    }

    // the optional initialUrl may specify a complete deeplink including query parameters.
    if (this.configurationHandler.checkForCreation(ManagerType.Event)) {
      const url = (initialUrl) ? initialUrl : this.endpointFile.read();
      const newWin = this.createWindow(url, undefined, undefined, defaultManagerWindowWidth, defaultManagerWindowHeight);
      this._additionalManagerWindows.push(newWin);
      this.readyToCommunicate.set(newWin.id, false);
      const mgrWin = this.configurationHandler.newManagerWindowConfiguration(newWin, ManagerType.Event);
      this.mapWindowIdRuntimeToConfiguration.set(newWin.id, mgrWin!.id);
      this.openWindowHandler.setWindowOpenHandler(newWin);
      this.traceService.info(`WindowHandler.newEventManagerWindow():
      Event manager browser window created! Id=${newWin.id}, Manager window config Id=${mgrWin!.id}`);
    }
  }

  public getWindowForEvents(): BrowserWindow | undefined {
    let win: BrowserWindow | undefined;
    this.mapWindowIdRuntimeToConfiguration.forEach((value, key) => {
      if (this.configurationHandler.isEventLikeManager(value)) {
        win = this.getBrowserManagerWindow(key);
      }
    });
    return win;
  }

  public getWindowForDetachedEvents(): BrowserWindow | undefined {
    let win: BrowserWindow | undefined;
    this.mapWindowIdRuntimeToConfiguration.forEach((value, key) => {
      if (this.configurationHandler.isDetachedEventManager(value)) {
        win = this.getBrowserManagerWindow(key);
      }
    });
    return win;
  }

  public getBrowserManagerWindow(id: number): BrowserWindow | undefined {
    if (this._mainMangerWindow?.id === id) {
      return this._mainMangerWindow;
    } else {
      return (this._additionalManagerWindows.find(win => win.id === id));
    }
  }

  public get additionalManagerWindows(): readonly BrowserWindow[] {
    return this._additionalManagerWindows;
  }

  public get uiSyncState(): UiState | undefined {
    return this._uiSyncState;
  }

  public set uiSyncState(state: UiState | undefined) {
    this._uiSyncState = state;
  }

  public get mainMangerWindow(): BrowserWindow | undefined {
    return this._mainMangerWindow;
  }

  public isMainManagerWindow(windowId: number): boolean {
    return (this._mainMangerWindow?.id === windowId);
  }

  public isManagerWithEvent(id: number): boolean {
    const winEvent = this.getWindowForEvents();
    if (winEvent !== undefined) {
      return (winEvent.id === id);
    }
    return false;
  }

  public getWindowsInfo(senderBrowserWindowId: number, requestInfo: GetWindowRequestInfo): WindowInfo[] {
    const wins: BrowserWindow[] = [];
    if (requestInfo.includeOwnWindow || (this.mainMangerWindow!.id !== senderBrowserWindowId)) {
      wins.push(this.mainMangerWindow!);
    }
    this.additionalManagerWindows.forEach(win => {
      if (requestInfo.includeOwnWindow || (win.id !== senderBrowserWindowId)) {
        if ((requestInfo.includeDetachedEvent) || (this.getWindowForDetachedEvents()?.id !== win.id)) {
          wins.push(win);
        }
      }
    });
    const winInfos: WindowInfo[] = [];
    wins.forEach(win => {
      const winInfo: WindowInfo = {
          browserWindowId: win.id,
          managerWindowId: this.getWindowConfigurationId(win.id)!,
          webContentsId: win.webContents.id,
          title: this.getHtmlTitle(win.id)
      };
      winInfos.push(winInfo);
    });
    return winInfos;
  }

  public getWindowInfo(browserWindowId: number): WindowInfo | undefined {
    let foundWin: BrowserWindow | undefined;
    if (this.mainMangerWindow!.id === browserWindowId) {
      foundWin = this.mainMangerWindow!;
    } else {
      foundWin = this.additionalManagerWindows.find(win => win.id === browserWindowId);
    }
    if (foundWin != undefined) {
      const winInfo: WindowInfo = {
        browserWindowId: foundWin.id,
        managerWindowId: this.getWindowConfigurationId(foundWin.id)!,
        webContentsId: foundWin.webContents.id,
        title: this.getHtmlTitle(foundWin.id)
      };
      return winInfo;
    }
    return undefined;
  }

  public bootstrapManagerWindows(bsInfo: BootstrapInfo): void {
    this.traceService.info(`WindowHandler.bootstrapManagerWindows()...`);
    if (this.bootstrapWindowsDone) {
      this.traceService.info(`WindowHandler.bootstrapManagerWindows(). Bootstrap already done!`);
      return;
    }
    this.appInfo!.userInfo = bsInfo.userInfo;
    this.openWindowHandler.setTranslationText(bsInfo.translationText);
    this.configurationHandler.initializeDefaultConfigurationFromProject(bsInfo);

    const mainWindow = this.configurationHandler.getCurrentMainManager();
    this.traceService.info(`WindowHandler.bootstrapManagerWindows():
    mainWindow configuration: ${JSON.stringify(mainWindow)}`);

    if (mainWindow != undefined) {
      // The main manager is already running
      // => it needs to be moved based on the current configuration (if existing)
      // => the manager window configuration Id must be updated based on the retrieved configuration (if existing)
      this.mapWindowIdRuntimeToConfiguration.set(this._mainMangerWindow!.id, mainWindow.id);
      // => in order that moving, maximizing and minimizing does work properly, window attributes such as minimizable must be enabled/reset
      this.resetWindowAttributes(this._mainMangerWindow!);
      if (this.configurationHandler.doesDisplayExist(mainWindow)) {
        this._mainMangerWindow!.unmaximize(); // set windows bounds works only properly on unmaximized windows
        this._mainMangerWindow!.setBounds({ x: mainWindow.x, y: mainWindow.y, width: mainWindow.width, height: mainWindow.height });
        this._mainMangerWindow!.setPosition(mainWindow.x, mainWindow.y);
        if (mainWindow.maximized) {
          this._mainMangerWindow!.maximize();
        }
      }
      else {
        // the current window position/bounds are not valid anymore; the screen configuration has changed.
        this.configurationHandler.updateCurrentConfigurationForPosition(mainWindow.id, this._mainMangerWindow!);
      }
      this.setWindowAttributes(this._mainMangerWindow!, true);
      if (mainWindow.manager.managerType === ManagerType.MainWoEvent) {
        // the very first window created is of type 'Main'! => The respective client needs to be notified on the type change request!
        this.configurationHandler.notifyCurrentManagerDefinitionChange(mainWindow);
      }
    } else {
      this.traceService.error(`WindowHandler.bootstrapManagerWindows(): No main manager definition found!`);
    }

    // the additional managers need to be created.
    this.bootstrapAdditionalManagerWindows(this.configurationHandler.currentConfiguration!.windows);

    this.bootstrapWindowsDone = true;
    this.traceService.info(`WindowHandler.bootstrapManagerWindows() done!`);
  }

  public setCommunicationChannelReady(windowId: number): void {
    this.readyToCommunicate.set(windowId, true);
  }

  public isFlexClientLoadedOnMainWindow(): boolean {
    return (this.mainWindowTypeLoaded === MainWindowType.FlexClientApplication);
  }

  public reloadFlexClientApplicationOnMainManager(): void {
    const endpointAddress = this.endpointFile.read();
    if (endpointAddress !== undefined) {
      this.certificateHelper.cleanupAllServerCertificateUrls();
      this._mainMangerWindow!.loadURL(endpointAddress).then(() => {
        this._mainMangerWindow!.webContents.clearHistory();
      });
      this.readyToCommunicate.set(this._mainMangerWindow!.id, false);
      this.mainWindowTypeLoaded = MainWindowType.FlexClientApplication;
    }
  }

  public reloadPage(browserWinId: number, emptyCache: boolean): void {
    const win = this.getBrowserManagerWindow(browserWinId);
    if (win !== undefined) {
      if (emptyCache) {
        // Note:
        // The method 'clearCache()' did not do the job as expected. Still http calls fetched the data from cache afterwards.
        // Could not figure out why. Google did not help.
        // However, the method reloadIgnoringCache() works. This is not exactly the same, but it is a workaround and helps in lots of the use cases.
        win.webContents.session.clearCache().then(() => win.webContents.reloadIgnoringCache());
      } else {
        win.webContents.reload();
      }
    }
  }

  public loadCertificateErrorPageOnMainManagerWindow(): void {
    if (app.isPackaged) {
      this._mainMangerWindow!.loadURL(format({
        pathname: path.join(__dirname, '../../../../electron-ui/browser/index.html'),
        protocol: 'file:',
        hash: 'landing;content=certificate-error',
        slashes: true
      }));
    } else {
      this._mainMangerWindow!.loadURL('http://localhost:4200/#/landing;content=certificate-error');
    }
    this.readyToCommunicate.set(this._mainMangerWindow!.id, false);
    this.mainWindowTypeLoaded = MainWindowType.ServerCertificateError;
    this._mainMangerWindow!.webContents.clearHistory();
  }

  public loadConnectionRefusedErrorPageOnMainManagerWindow(): void {
    if (app.isPackaged) {
      this._mainMangerWindow!.loadURL(format({
        pathname: path.join(__dirname, '../../../../electron-ui/browser/index.html'),
        protocol: 'file:',
        hash: 'landing;content=connection-error',
        slashes: true
      }));
    } else {
      this._mainMangerWindow!.loadURL('http://localhost:4200/#/landing;content=connection-error');
    }
    this.readyToCommunicate.set(this._mainMangerWindow!.id, false);
    this.mainWindowTypeLoaded = MainWindowType.ConnectionError;
    this._mainMangerWindow!.webContents.clearHistory();
  }

  public loadEndpointConfigurePageOnMainManagerWindow(): void {
    if (app.isPackaged) {
      this._mainMangerWindow!.loadURL(format({
        pathname: path.join(__dirname, '../../../../electron-ui/browser/index.html'),
        protocol: 'file:',
        hash: 'landing;content=endpoint',
        slashes: true
      }));
    } else {
      this._mainMangerWindow!.loadURL('http://localhost:4200/#/landing;content=endpoint');
    }
    this.readyToCommunicate.set(this._mainMangerWindow!.id, false);
    this.mainWindowTypeLoaded = MainWindowType.EndpointConfiguration;
    this._mainMangerWindow!.webContents.clearHistory();
  }

  public createCommunicationRulesEditor(): void {
    if (this._communicationRulesWindow !== undefined) {
      if (this._communicationRulesWindow.isMinimized()) {
        this._communicationRulesWindow.restore();
      }
      this._communicationRulesWindow.focus();
      return;
    } else {
      this._communicationRulesWindow = this.createWindow(this.endpointFile.read() + '/communicationrules', undefined, undefined,
      defaultRulesWindowWidth, defaultRulesWindowHeight, false, false, defaultRulesWindowMinWidth, defaultRulesWindowMinHeight);
      if(app.isPackaged === false) {
        this._communicationRulesWindow.webContents.openDevTools();
      }
    }
  }

  public closeCommunicationRulesEditor(): void {
    this._communicationRulesWindow?.close();
    this._communicationRulesWindow = undefined;
  }

  public resetToDefaultConfiguration(): Promise<boolean> {
    if (this.windowCloseController.dirtyCheckWindowsInvoked) {
      // whenever a check is pending, we do not execute this method.
      return Promise.resolve(false);
    }
    this.configurationHandler.resetCommunicationRulesToDefault();

    const pCheck = this.windowCloseController.checkAllWindows(ShowBackDropReason.AppyDefault, false, 2000);
    pCheck.then(notDirty => {
      if (notDirty) {
        // If the manager windows Id's of the default and the user (current) configuration are different, the shall be aligned.
        // Note: Different Id's can only exist, if the user specific configuration was create before the default one.
        this.alignCurrentMainManagerWindowId();

        // close the windows which are not part of the default configuration
        const mgrWindowsIds = this.configurationHandler.evalCurrentManagerWindowsNotExistingInDefault();
        const browserWindowsNotExistIds = this.getBrowserWindowIdsFromConfigIds(mgrWindowsIds);
        browserWindowsNotExistIds.forEach(id => this.closeWindow(id));

        // reset the window position and the startup node of all the started windows of the default configuration
        this.resetPositionAndBounds(this.configurationHandler.evalDefaultManagerWindowsStarted());
        this.resetStartupNodeandLayouts(this.configurationHandler.evalDefaultManagerWindowsStarted());

        // start windows which are not part of the current configuration
        const notStarted = this.configurationHandler.evalDefaultManagerWindowsNotStarted();
        this.configurationHandler.addToCurrentConfiguration(notStarted);
        this.bootstrapAdditionalManagerWindows(notStarted);
      }
      this.windowCloseController.clearDirtyState();
    });
    return pCheck;
  }

  public checkAllManagersForDirtyState(backDropReason: ShowBackDropReason): Promise<boolean> {
    if (this.windowCloseController.dirtyCheckWindowsInvoked) {
      // whenever a check is pending, we do not execute this method.
      return Promise.resolve(false);
    }

    const pCheck = this.windowCloseController.checkAllWindows(backDropReason, false, 0);
    pCheck.then(_notDirty => {
      this.windowCloseController.clearDirtyState();
    });
    return pCheck;
  }


  /**
   * Checks all windows (websites) if they an be closed. A window (website) typically checks if it is in dirty state (contains invalid data).
   * The windows which reply with true, will be immediately closed. The others not.
   *
   * @private
   * @param {booShutdownInfolean} sdInfo If the main manager shall be closed or not and if dirty check needs to be done or not
   * @returns {Promise<boolean>} Returns true, if all windows were closed.
   * @memberof WindowHandler
   */
  public closeAllWindowsWithCheck(sdInfo: ShutdownInfo): Promise<boolean> {
    this.traceService.info(`WindowHandler.closeAllWindowsWithCheck() requested...`);
    const p = this.windowCloseController.closeAllWindows(sdInfo.closeMainWindow, sdInfo.skipDirtyCheck);
    p.then(result => {
      if (result) {
        this.bootstrapWindowsDone = false;
        this.configurationHandler.resetDefaultConfiguration();
        if ((!this.configurationHandler.closedMode) && (this._mainMangerWindow !== undefined)) {
          this.resetWindowAttributes(this._mainMangerWindow);
        }
      }
      this.traceService.info(`WindowHandler.closeAllWindowsWithCheck() done, result=${result}.`);
    });
    return p;
  }

  public closeWindow(windowId: number): void {
    const win = this.getBrowserManagerWindow(windowId);
    if (windowId === this._mainMangerWindow!.id) {
      this.wsiService.doTerminateSession();
    }
    if (win !== undefined) {
      // must be set in order that the window is closable
      win.closable = true;
      win.close();
    }
  }

  public canWindowBeClosed(windowId: number): Promise<boolean> {
    if (this.isMainManagerWindow(windowId)) {
      if (this.mainWindowTypeLoaded === MainWindowType.FlexClientApplication) {
        return this.windowMessageService.canWindowBeClosed(windowId);
      } else {
        // this is not the Flec Client application, it is a configuration or error window which does not implement the dirty check.
        return Promise.resolve(true);
      }
    } else {
      return this.windowMessageService.canWindowBeClosed(windowId);
    }
  }

  public isCloseAnyWindowPending(): boolean {
    return this.windowCloseController.closeAnyWindowInvoked;
  }

  public isDirtyCheckWindowsPending(): boolean {
    return this.windowCloseController.dirtyCheckWindowsInvoked;
  }

  public showBackDrop(windowId: number, showBdInfo: ShowBackDropInfo): void {
    if (this.isReadyToCommunicate(windowId)) {
      this.windowMessageService.showBackDrop(windowId, showBdInfo);
    } else {
      setTimeout(() => {
        this.showBackDrop(windowId, showBdInfo);
      }, 200);
    }
  }

  public restoreAndFocus(windowId: number): void {
    const win = this.getBrowserManagerWindow(windowId);
    if (win?.isMinimized()) {
      win?.restore();
    }
    win?.focus();
  }

  public restoreAndFocusAllWindows(): void {
    this._additionalManagerWindows.forEach(win => {
      this.restoreAndFocus(win.id);
    });
    this.restoreAndFocus(this._mainMangerWindow!.id);
  }

  public getAllWindows(): BrowserWindow[] {
    let windows: BrowserWindow[] = this._additionalManagerWindows;
    windows.push(this.mainMangerWindow!);
    return windows;
  }

  public getHtmlTitle(browserWinId: number): string {
    const title = this.mapWindowIdRuntimeToTitle.get(browserWinId);
    return (title !== undefined)? title:  browserWinId.toString();
  }

  public applyNativeTheme(themeType: ElectronThemeType): void {
    nativeTheme.themeSource = themeType;
  }

  public updateTitleBarOverlay(): void {
    if (this.configurationHandler.changeCurrentConfigurationAllowed) {
      // all windows show an overlay
      this.mainMangerWindow!.setTitleBarOverlay({ color: this.getTitleBarOverlayColor(), symbolColor: this.getTitleBarOverlaySymbolColor()});
      this._additionalManagerWindows.forEach(win => win.setTitleBarOverlay({ color: this.getTitleBarOverlayColor(), symbolColor: this.getTitleBarOverlaySymbolColor()}));
    } else {
      if (!this.configurationHandler.closedMode) {
        // only the main/primary manager shows a overlay:
        this.mainMangerWindow!.setTitleBarOverlay({ color: this.getTitleBarOverlayColor(), symbolColor: this.getTitleBarOverlaySymbolColor()});
      }
    }
  }

  private getTitleBarOverlayColor(): string {
    return (nativeTheme.shouldUseDarkColors) ? colorElementBase1Dark: colorElementBase1Light;
  }

  private getTitleBarOverlaySymbolColor(): string {
    return (nativeTheme.shouldUseDarkColors) ? colorElementActionSecondaryTextDark: colorElementActionSecondaryTextLight;
  }

  private alignCurrentMainManagerWindowId(): void {
    const currentId = this.configurationHandler.alignCurrentMainManagerWindowId();
    if (currentId !== undefined) {
      this.mapWindowIdRuntimeToConfiguration.set(this.mainMangerWindow!.id, currentId);
    }
  }

  private resetPositionAndBounds(windows: ManagerWindow[]): void {
    windows.forEach((window: ManagerWindow) => {
      const browserWinId = this.getBrowserWindowIdFromConfigId(window.id);
      if (browserWinId !== undefined) {
        const browserWin = this.getBrowserManagerWindow(browserWinId);
        if (browserWin !== undefined) {
          browserWin.unmaximize(); // set windows bounds works only properly on unmaximized windows
          browserWin.setBounds({ x: window.x, y: window.y, width: window.width, height: window.height });
          browserWin.setPosition(window.x, window.y);
          if (window.maximized) {
            browserWin.maximize();
          }
          // note: programatically setting the position of the window does not fire the 'moved', 'resized', 'maximized' ... events.
          // => we need to trigger the change explicit:
          this.configurationHandler.updateCurrentConfigurationForPosition(window.id, browserWin);
        }
      }
    });
  }

  private resetStartupNodeandLayouts(windows: ManagerWindow[]): void {
    this.configurationHandler.updateCurrentConfigurationStartupNodesAndActiveLayout(windows);
  }

  private bootstrapAdditionalManagerWindows(windows: ManagerWindow[]): void {
    windows.forEach((window: ManagerWindow) => {
      if (this.configurationHandler.isMainManager(window.manager.managerType) === false) {
        let newWin: BrowserWindow;
        if (this.configurationHandler.doesDisplayExist(window)) {
          newWin = this.createWindow(this.endpointFile.read(), window.x, window.y, window.width, window.height);

          // Note:
          // TODO
          // When upgrading from Electron 15 to 16, a regression was introduced:
          // The BrowserWindow constructor seems not to apply the the width and the height in a rigjt manner
          // resetting the coordinates with below two method resolved the issue
          newWin.setBounds({ x: window.x, y: window.y, width: window.width, height: window.height });
          newWin.setPosition(window.x, window.y);

          if (window.maximized) {
            newWin.maximize();
          }
        } else {
          // the current window position/bounds are not valid anymore; the screen configuration has changed.
          newWin = this.createWindow(this.endpointFile.read());
          this.configurationHandler.updateCurrentConfigurationForPosition(window.id, newWin);
        }

        this.setWindowAttributes(newWin, false);
        this._additionalManagerWindows.push(newWin);
        this.readyToCommunicate.set(newWin.id, false);
        this.mapWindowIdRuntimeToConfiguration.set(newWin.id, window.id);
        this.openWindowHandler.setWindowOpenHandler(newWin);
      }
    });
  }

  private setWindowAttributes(win: BrowserWindow, isMainManager: boolean): void {
    // due to the following issue: https://github.com/electron/electron/issues/32285 and https://github.com/electron/electron/issues/31352
    // minimizable and maximizable do work now, but unmaximize does not yet work!!!!

    this.traceService.info(`WindowHandler.setWindowAttributes(): Setting window attributes!
    Id=${win.id}, ChangeConfigAllowed=${this.configurationHandler.changeCurrentConfigurationAllowed}`);

    win!.setMovable(this.configurationHandler.changeCurrentConfigurationAllowed);
    win!.minimizable = this.configurationHandler.changeCurrentConfigurationAllowed;
    win!.maximizable = this.configurationHandler.changeCurrentConfigurationAllowed;
    win!.resizable =  this.configurationHandler.changeCurrentConfigurationAllowed;

    if (win!.isMaximized() === false) {
      // Enabling resizable causes an issue when the window is maximized!
      // (the width/height is slightly changed so that a little bit of the window is visible on the second screen.)
      // Thus we enable it only if the window is not maximized, which is sufficient.
      win!.resizable =  this.configurationHandler.changeCurrentConfigurationAllowed;
    }

    if (isMainManager) {
      win!.closable = this.configurationHandler.closeMainWindowAllowed;
    } else {
      win!.closable = this.configurationHandler.changeCurrentConfigurationAllowed;
    }
  }

  private resetWindowAttributes(win: BrowserWindow): void {
    win!.resizable =  true;
    win!.setMovable(true);
    win!.minimizable = true;
    win!.maximizable = true;
    win!.closable = true;
  }

  private createWindow(initialUrl?: string, x?: number, y?: number, width?: number, height?: number, maximize?: boolean, mainWin = false,
      minWidth = defaultManagerWindowMinWidth, minHeight = defaultManagerWindowMinHeight): BrowserWindow {
    let titleBarOvrLay: boolean | Electron.TitleBarOverlay = {
      color: this.getTitleBarOverlayColor(),
      symbolColor: this.getTitleBarOverlaySymbolColor()
    };
    if (!this.configurationHandler.changeCurrentConfigurationAllowed) {
      titleBarOvrLay = false;
    }

    let newWindow = new BrowserWindow({
      x: x,
      y: y,
      width: width,
      height: height,
      minWidth: minWidth,
      minHeight: minHeight,
      backgroundColor: this.getTitleBarOverlayColor(),
      autoHideMenuBar: true,
      icon: this.brand.getBrandIcon(),
      title: this.brand.getBrandDisplayName(),
      frame: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: titleBarOvrLay,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        sandbox: true,
        contextIsolation: true
      }
    });

    if(app.isPackaged === false) {
      // Open the DevTools.
      newWindow.webContents.openDevTools();
    }

    newWindow.on('close', (event) => {
      this.traceService.info(`WindowHandler.on-close(): Manager window is about to close! Id=${newWindow.id}`);

      if (this._communicationRulesWindow?.id == newWindow.id) {
        this.traceService.debug(`WindowHandler.on-close(): Communication rules window requested close, not allowed, Id=${newWindow.id}`);
        this._communicationRulesWindow = undefined;
        return;
      } else if (this._mainMangerWindow?.id !== newWindow.id) {
        // additional manager window requested 'close'
        if (this.windowCloseController.closeAllWindowsInvoked) {
          // Closing all windows is in progress...
          if ((this.windowCloseController.isWindowDirtyCheckDone(newWindow.id) && (this.windowCloseController.isWindowDirty(newWindow.id) === false))) {
            this.traceService.debug(
              `WindowHandler.on-close(): Additional manager window shall be closed (due to 'Close all'), window can be closed, Id=${newWindow.id}`);
            this.deleteAdditionalManagerWindow(newWindow, false);
            return;
          } else {
            // cancel closing the window, dirty check is pending or true
            this.traceService.debug(
              `WindowHandler.on-close(): Additional manager window shall be closed (due to 'Close all'), dirty check is pending or true, Id=${newWindow.id}`);
            event.preventDefault();
            return;
          }
        } else {
          // closing an additional manager requested (single); e.g. by closing the window (x)
          if (!this.configurationHandler.changeCurrentConfigurationAllowed) {
            // cancel closing the window, not allowed
            this.traceService.debug(`WindowHandler.on-close(): Additional manager window requested close, not allowed, Id=${newWindow.id}`);
            event.preventDefault();
            return;
          }

          if (this.windowCloseController.isWindowDirtyCheckStarted(newWindow.id) === false) {
            this.traceService.debug(`WindowHandler.on-close(): Additional manager window requested close, do dirty check, Id=${newWindow.id}`);
            this.windowCloseController.closeWindow(newWindow.id).then(_result => {});
            // cancel closing the window, dirty check is pending
            event.preventDefault();
            return;
          } else if ((this.windowCloseController.isWindowDirtyCheckDone(newWindow.id) && (this.windowCloseController.isWindowDirty(newWindow.id) === false))) {
            this.traceService.debug(`WindowHandler.on-close(): Additional manager window requested close, window can be closed, Id=${newWindow.id}`);
            this.deleteAdditionalManagerWindow(newWindow, true);
            return;
          } else {
            // cancel closing the window, dirty check is pending or true
            this.traceService.debug(
              `WindowHandler.on-close(): Additional manager window requested close, dirty check is pending or true, Id=${newWindow.id}`);
            event.preventDefault();
            return;
          }
        }
      } else {
        // main window requested 'close'
        if (this.windowCloseController.closeAllWindowsInvoked) {
          // Closing all windows is in progress, e.g due to a logout request or a previous main window close request
          this.windowCloseController.doCloseMain = true;
          if (this.windowCloseController.canMainWindowBeClosed()) {
            this.closeCommunicationRulesEditor();
            this.traceService.debug(
              `WindowHandler.on-close(): Main manager window is closed now, Id=${newWindow.id}`);
            // all done, main window is the last one closing.
            this._mainMangerWindow = undefined;
            return;
          } else {
            // cancel closing the window, dirty check of all windows is pending or true
            this.traceService.debug(
              `WindowHandler.on-close(): Main manager window requested close, dirty check of all windows is pending or true, Id=${newWindow.id}`);
            event.preventDefault();
            return;
          }
        } else {
          if (!this.configurationHandler.closeMainWindowAllowed) {
            // cancel closing the main window, it is not allowed
            this.traceService.debug(`WindowHandler.on-close(): Main manager window requested close, not allowed, Id=${newWindow.id}`);
            event.preventDefault();
            return;
          }

          // closing main window allowed, check if initialization done and if dirty check can be skipped.
          let skipDirtyCheck = true;
          if (this.bootstrapWindowsDone && this.readyToCommunicate.get(newWindow.id)) {
            skipDirtyCheck = false;
          }
          // start closing all windows, including the main manager, do dirty checks if required
          this.traceService.debug(
            `WindowHandler.on-close(): Main manager window requested close, start closing all windows, Id=${newWindow.id}, dirtyCheck=${!skipDirtyCheck}`);
          this.windowCloseController.closeAllWindows(true, skipDirtyCheck).then(_result => {});
          // cancel closing the window, above method will do close all windows dependent on dirty checks required or not => dirty checks might be pending if so.
          event.preventDefault();
          return;
        }
      }
    });

    newWindow.webContents.on('will-prevent-unload', (event) => {
      // FlexClient did cancel page unload
      // This shold not happen as when running as desktop application we check unsaved data explicityly in the 'reload' handler
      // or when closing the window.
      // However, here we could also show the corresponding chrome dialog for: 'Do you want to leave this site? Changes you made may not be saved.'.

      this.traceService.error('WindowHandler.on-will-prevent-unload() called; Should not happen. Check the root cause.');
      event.preventDefault();
    });

    newWindow.on('closed', () => {
      this.traceService.info(`WindowHandler.on-closed():
      ${this._additionalManagerWindows.length} additional manager windows alive.
      Total browser windows alive: ${BrowserWindow.getAllWindows().length}`);
    });

    newWindow.on('show', () => {
      this.traceService.info(`WindowHandler.on-show(): Manager window show event! Id=${newWindow.id}`);
    });

    newWindow.on('ready-to-show', () => {
      this.traceService.info(`WindowHandler.on-ready-to-show(): Manager window ready-to-show event! Id=${newWindow.id}`);
    });

    newWindow.on('moved', () => {
      this.traceService.info(`WindowHandler.on-moved(): Window moved! Id=${newWindow.id}; bootstrapWindowsDone=${this.bootstrapWindowsDone}`);
      if (this.bootstrapWindowsDone) {
        this.configurationHandler.updateCurrentConfigurationForPosition(this.mapWindowIdRuntimeToConfiguration.get(newWindow.id)!, newWindow);
      }
    });

    newWindow.on('resized', () => {
      this.traceService.info(`WindowHandler.on-resized(): Window resized! Id=${newWindow.id}; bootstrapWindowsDone=${this.bootstrapWindowsDone}`);
      if (this.bootstrapWindowsDone) {
        this.configurationHandler.updateCurrentConfigurationForPosition(this.mapWindowIdRuntimeToConfiguration.get(newWindow.id)!, newWindow);
      }
    });

    newWindow.on('maximize', () => {
      this.traceService.info(`WindowHandler.on-maximize(): Window maximize event! Id=${newWindow.id}; bootstrapWindowsDone=${this.bootstrapWindowsDone}`);
      if (this.bootstrapWindowsDone) {
        if (this.configurationHandler.changeCurrentConfigurationAllowed) {
          this.configurationHandler.updateCurrentConfigurationForPosition(this.mapWindowIdRuntimeToConfiguration.get(newWindow.id)!, newWindow);
        }
      }
    });

    newWindow.on('unmaximize', () => {
      this.traceService.info(`WindowHandler.on-unmaximize(): Window unmaximize event! Id=${newWindow.id}; bootstrapWindowsDone=${this.bootstrapWindowsDone}`);
      if (this.bootstrapWindowsDone) {
        if (this.configurationHandler.changeCurrentConfigurationAllowed) {
          this.configurationHandler.updateCurrentConfigurationForPosition(this.mapWindowIdRuntimeToConfiguration.get(newWindow.id)!, newWindow);
        } else {
          // workaround because electron does not disable the 'unmaximize' button
          newWindow.maximize();
        }
      }
    });

    newWindow.on('minimize', () => {
      this.traceService.info(`WindowHandler.on-minimize(): Window minimize event! Id=${newWindow.id}; bootstrapWindowsDone=${this.bootstrapWindowsDone}`);
      if (this.bootstrapWindowsDone) {
        if (!this.configurationHandler.changeCurrentConfigurationAllowed) {
          newWindow.restore();
        }
      }
    });

    newWindow.on('focus', () => {
      this.windowMessageService.sendFocusState(newWindow.id, newWindow.isFocused());
    });

    newWindow.on('blur', () => {
      this.windowMessageService.sendFocusState(newWindow.id, newWindow.isFocused());
    })

    newWindow.webContents.on('did-navigate', (_event, url: string, responseCode: number, statusText: string) => {
      this.traceService.info(`WindowHandler.did-navigate():
      Id=${ newWindow.id},
      url=${url},
      code=${responseCode}, text=${statusText},
      canGoBack=${newWindow.webContents.navigationHistory.canGoBack()}, canGoFwd=${newWindow.webContents.navigationHistory.canGoForward()}`);

      if (responseCode === 404) {
        this.currentMainManagerConnectionError = new ConnectionErrorInfo(url, responseCode, statusText);
        this.loadConnectionRefusedErrorPageOnMainManagerWindow();
      }
      this.windowMessageService.sendHistoryState(newWindow.id, newWindow.webContents.navigationHistory.canGoBack(), newWindow.webContents.navigationHistory.canGoForward());
    });

    newWindow.webContents.on('did-navigate-in-page', (_event, url: string, isMainframe: boolean, _frameProcessId: number) => {
      this.traceService.info(`WindowHandler.did-navigate-in-page():
      Id=${ newWindow.id},
      url=${url},
      isMainframe=${isMainframe},
      canGoBack=${newWindow.webContents.navigationHistory.canGoBack()}, canGoFwd=${newWindow.webContents.navigationHistory.canGoForward()}`);
      this.windowMessageService.sendHistoryState(newWindow.id, newWindow.webContents.navigationHistory.canGoBack(), newWindow.webContents.navigationHistory.canGoForward());
    });

    newWindow.webContents.on('page-title-updated', (_event: Electron.Event, title: string, _explicitSet: boolean) => {
      this.mapWindowIdRuntimeToTitle.set(newWindow.id, title);
    });

    newWindow.webContents.on('certificate-error', (event, url, error, certificate, callback, _isMainFrame) =>  {
      // this.traceService.info(`certificate-error; for child window, url=${url}; error=${error}`);

      const result = this.certificateHelper.handleServerCertificateErrorEvent(url, certificate, newWindow.id, error);
      if (result === CertificateErrorResult .NotAccepted) {
        app.quit();
      } else if (result === CertificateErrorResult.Accepted) {
        event.preventDefault();
        callback(true);
      } else if (result === CertificateErrorResult.ShowConfirmation) {
        // load the certificate error page into the main window.
        this.loadCertificateErrorPageOnMainManagerWindow();
      } else if (result === CertificateErrorResult.ShowConfirmationPending) {
        // Note: multiple certificate errors (from different WSI calls) can issued here even before the first 'Server Certificate Error' Page got shown!!
        // => Noting to do now, dependent on the user action (accept or deny), the app will be reloaded of closed.
      }
    });

    if (mainWin) {
      this._mainMangerWindow = newWindow;
      newWindow.webContents.on('did-fail-load', (_event, errorCode: number,
        errorDescription: string, validatedUrl: string, _isMainFrame: boolean, _frameProcessId: number, _frameRoutingId: number) => {
          this.traceService.error(`WindowHandler.did-navigate-in-page(): Failed to load page:
          errorCode=${errorCode}; errorDescription=${errorDescription}; validatedUrl=${validatedUrl}`);

        this.currentMainManagerConnectionError = new ConnectionErrorInfo(validatedUrl, errorCode, errorDescription);
        this.loadConnectionRefusedErrorPageOnMainManagerWindow();
      });

      newWindow.webContents.on('did-finish-load', () => {
        this.traceService.info(`WindowHandler.did-finish-load(): Finished loading the page! Id=${newWindow.id}`);
      });
    }

    if (initialUrl !== undefined) {
      newWindow.loadURL(initialUrl);
    }

    if (maximize) {
      newWindow.maximize();
    }

    return newWindow;
  }

  private deleteAdditionalManagerWindow(window: BrowserWindow, saveUserConfiguration: boolean) : void {
    const idx = this._additionalManagerWindows.findIndex(win => win.id === window.id);
    this._additionalManagerWindows.splice(idx, 1);
    this.readyToCommunicate.delete(window.id);
    this.configurationHandler.deleteManagerWindowConfiguration(this.mapWindowIdRuntimeToConfiguration.get(window.id)!, saveUserConfiguration);
    this.mapWindowIdRuntimeToConfiguration.delete(window.id);
  };
}
