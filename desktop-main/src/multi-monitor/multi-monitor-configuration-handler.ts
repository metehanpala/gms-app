import { BrowserWindow, Display, screen } from "electron";
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { CommunicationRule, MultiMonitorConfiguration, ManagerDefinition, ManagerType, ManagerWindow, FrameDefinition, ManagerInfo, ViewDefinition } from "../../../src/app/desktop-renderer/multi-monitor/multi-monitor-configuration.data";
import { ActiveLayoutInfo, BootstrapInfo } from "../messaging/window-message.data";
import { closedMode } from '../config';
import { MainTraceService } from "../tracing/main-trace-service";
import { BrowserObject } from "@gms-flex/services";
import { WindowHandler } from "./window-handler";
import { CommunicationRulesFilter } from "./communication-rules-filter";

export const multiMonitorConfigurationVersion = 2;
export const maxWindows = 10;

export const summaryBarFrameId = 'summary-bar';
export const aboutFrameId = 'about-frame-id';
export const investigativeFrameId = 'investigative';
export const accountFrameId = 'account-frame-id';
export const notificationConfigurationFrameId = 'notifconfig-frame-id';
export const eventListId = 'event-list';
export const systemManagerId = 'system-manager';
export const operatorTaskId = 'operator-task';
export const easyNavigationFrameId = 'easy-navigation-bar-frame-id';

function newAdditionalSystemManagerFrames(): FrameDefinition[] {
  return [
    { id: systemManagerId, views: [] },
    { id: investigativeFrameId, views: [] },
    { id: aboutFrameId, views: [] },
    { id: accountFrameId, views: [] },
    { id: easyNavigationFrameId, views: [] }
  ];
}

function newAdditionalEventManagerFrames(): FrameDefinition[] {
    return [
    { id: summaryBarFrameId, views: [] },
    { id: investigativeFrameId, views: [] },
    { id: aboutFrameId, views: [] },
    { id: eventListId, views: [] }
  ];
}

function newMainManagerFrames(): FrameDefinition[] {
  return [
    { id: summaryBarFrameId, views: [] },
    { id: investigativeFrameId, views: [] },
    { id: systemManagerId, views: [] },
    { id: aboutFrameId, views: [] },
    { id: accountFrameId, views: [] },
    { id: notificationConfigurationFrameId, views: [] },
    { id: eventListId, views: [] },
    { id: operatorTaskId, views: [] },
    { id: easyNavigationFrameId, views: [] }
  ];
}

function newMainManagerWoEventFrames(): FrameDefinition[] {
  return [
    { id: summaryBarFrameId, views: [] },
    { id: investigativeFrameId, views: [] },
    { id: systemManagerId, views: [] },
    { id: aboutFrameId, views: [] },
    { id: accountFrameId, views: [] },
    { id: notificationConfigurationFrameId, views: [] },
    { id: operatorTaskId, views: [] },
    { id: easyNavigationFrameId, views: [] }
  ];
}

export class MultiMonitorConfigurationHandler {

  private _defaultConfiguration: MultiMonitorConfiguration | null | undefined;
  private _currentConfiguration: MultiMonitorConfiguration = { version: multiMonitorConfigurationVersion, overruleAllowed: false, windows: [], communicationRules: [] };
  private _configurationEvents = new EventEmitter();
  private userHasConfigureRight = false;

  constructor(private traceService: MainTraceService) {}

  public notifyCurrentManagerDefinitionChange(managerWindow: ManagerWindow): void {
    this._configurationEvents.emit('current-manager-info', managerWindow.id, this.createManagerInfo(managerWindow.manager));
  }

  public subscribeForCurrentManagerInfoChanges(listener: ((windowId: string, info: ManagerInfo) => void)): void {
    this._configurationEvents.addListener('current-manager-info', listener);
  }

  public unSubscribeForCurrentManagerInfoChanges(listener: ((windowId: string, info: ManagerInfo) => void)): void {
    this._configurationEvents.removeListener('current-manager-info', listener);
  }

  public notifyCurrentConfigurationChange(config: MultiMonitorConfiguration): void {
    this._configurationEvents.emit('current-mm-configuration', config);
  }

  public subscribeForCurrentConfigurationChanges(listener: ((config: MultiMonitorConfiguration) => void)): void {
    this._configurationEvents.addListener('current-mm-configuration', listener);
  }

  public unSubscribeForCurrentConfigurationChanges(listener: ((config: MultiMonitorConfiguration) => void)): void {
    this._configurationEvents.removeListener('current-mm-configuration', listener);
  }

  public notifyDefaultConfigurationChange(config: MultiMonitorConfiguration): void {
    this._configurationEvents.emit('default-mm-configuration', config);
  }

  public subscribeForDefaultConfigurationChanges(listener: ((config: MultiMonitorConfiguration) => void)): void {
    this._configurationEvents.addListener('default-mm-configuration', listener);
  }

  public unSubscribeForDefaultConfigurationChanges(listener: ((config: MultiMonitorConfiguration) => void)): void {
    this._configurationEvents.removeListener('default-mm-configuration', listener);
  }

  public get defaultConfiguration(): MultiMonitorConfiguration | null | undefined {
    return this._defaultConfiguration;
  }

  public get currentConfiguration(): MultiMonitorConfiguration {
    return this._currentConfiguration;
  }

  public initializeDefaultConfigurationFromProject(bsInfo: BootstrapInfo) {
    this.traceService.info(`MultiMonitorConfigurationHandler.initializeDefaultConfigurationFromProject():
    User: ${JSON.stringify(bsInfo.userInfo.user)},
    hasConfigureRight: ${JSON.stringify(bsInfo.userInfo.hasConfigureRight)},
    closedMode: ${JSON.stringify(this.closedMode)},
    Default configuration read from project: ${JSON.stringify(bsInfo.defaultConfiguration)},
    User configuration read from project: ${JSON.stringify(bsInfo.userConfiguration)}`);

    this.handleVersion(bsInfo.defaultConfiguration);
    this.handleVersion(bsInfo.userConfiguration);

    if (bsInfo.defaultConfiguration != undefined) {
      this._defaultConfiguration = this.copyConfiguration(bsInfo.defaultConfiguration);
    }
    this.userHasConfigureRight = bsInfo.userInfo.hasConfigureRight;
    if (this.userSpecificConfigurationAllowed && (bsInfo.userConfiguration != null)) {
      if (bsInfo.userConfiguration != null) {
        this._currentConfiguration = this.copyConfiguration(bsInfo.userConfiguration);
      }
    } else {
      if (this._defaultConfiguration != null) {
        this._currentConfiguration = this.copyConfiguration(this._defaultConfiguration);
      }
    }

    if (this._currentConfiguration != null) {
      this._currentConfiguration.windows.forEach(window => {
        this.updateDisplayAndWindowProperties(window);
      });
    }

    this.traceService.info(`MultiMonitorConfigurationHandler.initializeDefaultConfigurationFromProject() done:
    Default configuration: ${JSON.stringify(this._defaultConfiguration)},
    Current configuration: ${JSON.stringify(this._currentConfiguration)}`);
  }

  public handleVersion(configuration: MultiMonitorConfiguration | undefined): void {
    if (configuration == undefined) {
      return;
    }

    // allows to handle model version changes.
    // no model change to be handled from version 1 to 2: Only the communcication rules were added.
    // Note that the rules are optional.
    if (configuration.version == 1) {
      this.traceService.info(`MultiMonitorConfigurationHandler.initializeDefaultConfigurationFromProject() handle version:
      Old version: ${configuration.version},
      New version: ${multiMonitorConfigurationVersion}`);
      configuration.version = 2;
    }
  }

  public resetDefaultConfiguration(): void {
    this.traceService.info(`MultiMonitorConfigurationHandler.resetDefaultConfiguration()...`);
    this._defaultConfiguration = undefined;
  }

  public get closedMode(): boolean {
    return closedMode();
  }

  public get changeDefaultConfigurationAllowed(): boolean {
    return this.userHasConfigureRight && !this.closedMode;
  }

  public get userSpecificConfigurationAllowed(): boolean {
    if ((this._defaultConfiguration == null) || (this._defaultConfiguration.overruleAllowed)) {
      return true;
    } else {
      return false;
    }
  }

  public get changeCurrentConfigurationAllowed(): boolean {
    if (this.closedMode) {
      return false;
    } else if ((this._defaultConfiguration == null) || (this._defaultConfiguration.overruleAllowed) || (this.userHasConfigureRight)) {
      return true;
    } else {
      return false;
    }
  }

  public get closeMainWindowAllowed(): boolean {
    return (this.closedMode)? false: true;
  }

  public isMainManager(type: ManagerType): boolean {
    return (type === ManagerType.Main || type === ManagerType.MainWoEvent)? true: false;
  }

  public isEventLikeManager(windowId: string): boolean {
    const mgrWin = this._currentConfiguration!.windows.find((window: ManagerWindow) => this.isEventLikeManagerForType(window.manager.managerType));
    return (mgrWin?.id === windowId);
  }

  public isEventLikeManagerForType(type: ManagerType): boolean {
    return (type === ManagerType.Main || type === ManagerType.Event);
  }

  public isDetachedEventManager(windowId: string): boolean {
    const mgrWin = this._currentConfiguration!.windows.find((window: ManagerWindow) => this.isDetachedEventManagerForType(window.manager.managerType));
    return (mgrWin?.id === windowId);
  }

  public isDetachedEventManagerForType(type: ManagerType): boolean {
    return (type === ManagerType.Event);
  }

  public getCurrentMainManager(): ManagerWindow | undefined {
    if (this._currentConfiguration != null) {
      return this._currentConfiguration!.windows.find((window: ManagerWindow) => this.isMainManager(window.manager.managerType));
    } else {
      return undefined
    }
  }

  public getDefaultMainManager(): ManagerWindow | undefined {
    if (this._defaultConfiguration != null) {
      return this._defaultConfiguration!.windows.find((window: ManagerWindow) => this.isMainManager(window.manager.managerType));
    } else {
      return undefined
    }
  }

  public checkForCreation(type: ManagerType): boolean {
    // checks that only one manager of type 'event' and 'main' is allowed
    // checks that the maximum number of allowed managers is not exceeded
    if (this._currentConfiguration.windows.length >= maxWindows) {
      return false;
    }
    let returnValue = true;
    if (type === ManagerType.Event) {
      if (this._currentConfiguration.windows.find((window: ManagerWindow) => window.manager.managerType === ManagerType.Event) !== undefined) {
        returnValue = false;
      }
    }
    if (this.isMainManager(type)) {
      if (this._currentConfiguration.windows.find((window: ManagerWindow) => this.isMainManager(window.manager.managerType)) !== undefined) {
        returnValue = false;
      }
    }
    if (returnValue === false) {
      this.traceService.error(`MultiMonitorConfigurationHandler.checkManagerTypeForCreation(): Manager not allowed to be created: ${type}`);
    }
    return returnValue;
  }

  public newManagerWindowConfiguration(window: BrowserWindow, type: ManagerType): ManagerWindow | undefined {
    if (this.checkForCreation(type) === false) {
      return undefined;
    }

    let mgrWin: ManagerWindow | undefined;
    if (type === ManagerType.Main) {
      mgrWin = this.createManagerWindowConfiguration(window, type, newMainManagerFrames());
    } else if (type === ManagerType.MainWoEvent) {
      mgrWin = this.createManagerWindowConfiguration(window, type, newMainManagerWoEventFrames());
    } else if (type === ManagerType.System) {
      mgrWin = this.createManagerWindowConfiguration(window, type, newAdditionalSystemManagerFrames());
      if (this.changeCurrentConfigurationAllowed) {
        this.notifyCurrentConfigurationChange(this._currentConfiguration);
      }
    } else if (type === ManagerType.Event) {
      mgrWin = this.createManagerWindowConfiguration(window, type, newAdditionalEventManagerFrames());
      this.changeCurrentMainManagerToMainWithoutEvent();
      if (this.changeCurrentConfigurationAllowed) {
        this.notifyCurrentConfigurationChange(this._currentConfiguration);
      }
    } else {
      throw Error(`Unknown enum member: ${type}`);
    }

    this.traceService.debug(`MultiMonitorConfigurationHandler.newManagerWindowConfiguration():
    Current configuration: ${JSON.stringify(this._currentConfiguration)}`);

    return mgrWin;
  }

  public deleteManagerWindowConfiguration(windowConfigId: string, saveUserConfiguration: boolean): void {
    let managerWin = this._currentConfiguration.windows.find((item: ManagerWindow) => item.id === windowConfigId);
    if (managerWin !== undefined) {
      if (managerWin.manager.managerType === ManagerType.System) {
        this.deleteFromCurrentConfiguration(managerWin);
      } else if (managerWin.manager.managerType === ManagerType.Event) {
        this.deleteFromCurrentConfiguration(managerWin);
        let mainWin = this._currentConfiguration!.windows.find((mgrWin: ManagerWindow) => this.isMainManager(mgrWin.manager.managerType));
        if (mainWin?.manager.managerType === ManagerType.MainWoEvent) {
          mainWin.manager.managerType = ManagerType.Main;
          this.notifyCurrentManagerDefinitionChange(mainWin);
        }
      }
      if (this.changeCurrentConfigurationAllowed && saveUserConfiguration) {
        this.notifyCurrentConfigurationChange(this._currentConfiguration);
      }
    }
    this.traceService.debug(`MultiMonitorConfigurationHandler.deleteManagerWindowConfiguration():
    Current configuration: ${JSON.stringify(this._currentConfiguration)}`);
  }

  public updateCurrentConfigurationForPosition(windowConfigId: string, window: BrowserWindow): void {
    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    let mgrWin = this._currentConfiguration.windows.find((item: ManagerWindow) => item.id === windowConfigId);
    if (mgrWin != undefined) {
      if (window.isMaximized()) {
        mgrWin.maximized = window.isMaximized();
      } else {
        mgrWin.x = bounds.x;
        mgrWin.y = bounds.y;
        mgrWin.width = bounds.width;
        mgrWin.height = bounds.height;
        mgrWin.maximized = window.isMaximized();
      }
      mgrWin.displayId = display.id;
      mgrWin.displayX = display.bounds.x;
      mgrWin.displayY = display.bounds.y;
      mgrWin.displayWidth = display.bounds.width;
      mgrWin.displayHeight = display.bounds.height;
      mgrWin.scaleFactor = display.scaleFactor;

      this.traceService.debug(`MultiMonitorConfigurationHandler.updateCurrentConfigurationForPosition():
      Window updated: ${JSON.stringify(mgrWin)}`)
    }
    this.traceService.debug(`MultiMonitorConfigurationHandler.updateCurrentConfigurationForPosition():
    Current configuration: ${JSON.stringify(this._currentConfiguration)}`);

    if (this.changeCurrentConfigurationAllowed) {
      this.notifyCurrentConfigurationChange(this._currentConfiguration);
    }
  }

  public updateCurrentConfigurationStartupNodesAndActiveLayout(mgrWins: ManagerWindow[]): void {
    mgrWins.forEach(mgrWin => {
      let mgrCurr = this._currentConfiguration.windows.find((item: ManagerWindow) => item.id === mgrWin.id);
      if (mgrCurr !== undefined) {
        mgrCurr.manager.startupNode = mgrWin.manager.startupNode;
        mgrWin.manager.frames?.forEach(frameDef => {
          let frameDefCurr = mgrCurr?.manager.frames?.find((item: FrameDefinition) => item.id === frameDef.id);
          if (frameDefCurr !== undefined) {
            frameDef.views?.forEach(viewDef => {
              let viewDefCurr = frameDefCurr?.views?.find((item: ViewDefinition) => item.id === viewDef.id);
              if (viewDefCurr !== undefined) {
                viewDefCurr.defaultLayout = viewDef.defaultLayout;
              }
            });
          }
        });
        this.notifyCurrentManagerDefinitionChange(mgrCurr);

        this.traceService.debug(`MultiMonitorConfigurationHandler.updateCurrentConfigurationStartupNode():
        Current window updated: ${JSON.stringify(mgrCurr)}`)
      }
    });

    this.traceService.debug(`MultiMonitorConfigurationHandler.updateCurrentConfigurationStartupNode():
    Current configuration: ${JSON.stringify(this._currentConfiguration)}`);

    if (this.changeCurrentConfigurationAllowed) {
      this.notifyCurrentConfigurationChange(this._currentConfiguration);
    }
  }

  public setActiveLayout(windowId: string, activeLayoutInfo: ActiveLayoutInfo): void {
    const mgrWind = this._currentConfiguration?.windows.find((mgrWin: ManagerWindow) => mgrWin.id === windowId);
    if (mgrWind !== undefined) {
      const frameFound = mgrWind.manager.frames?.find((frame: FrameDefinition) => frame.id === activeLayoutInfo.frameId);
      if (frameFound !== undefined) {
        const viewFound = frameFound.views?.find((view: ViewDefinition) => view.id === activeLayoutInfo.viewId);
        if (viewFound !== undefined) {
          viewFound.defaultLayout = activeLayoutInfo.layoutId;
        } else {
          const newView: ViewDefinition = { id: activeLayoutInfo.viewId, defaultLayout: activeLayoutInfo.layoutId };
          if (frameFound.views === undefined) {
            frameFound.views = [];
          }
          frameFound.views?.push(newView);
        }
        if (this.changeCurrentConfigurationAllowed) {
          this.notifyCurrentConfigurationChange(this._currentConfiguration);
        }
      }
    }
  }

  public setStartupNode(windowId: string, designation: string): void {
    const mgrWind = this._currentConfiguration?.windows.find((mgrWin: ManagerWindow) => mgrWin.id === windowId);
    if (mgrWind !== undefined) {
      mgrWind.manager.startupNode = designation;
      if (this.changeCurrentConfigurationAllowed) {
        this.notifyCurrentConfigurationChange(this._currentConfiguration);
      }
    }
  }

  public saveCurrentConfigurationAsDefault(overruleAllowed: boolean = false): void {
    if (this.userHasConfigureRight) {
      this._defaultConfiguration = JSON.parse(JSON.stringify(this._currentConfiguration));
      if (this._defaultConfiguration != null) {
        this._defaultConfiguration.overruleAllowed = overruleAllowed;
      }
      this.traceService.debug(`MultiMonitorConfigurationHandler.copyCurrentConfigurationToDefault():
      Default configuration: ${JSON.stringify(this._defaultConfiguration)}`);

      if (this._defaultConfiguration != undefined) {
        this.notifyDefaultConfigurationChange(this._defaultConfiguration);
      }
    }
  }

  public resetCommunicationRulesToDefault(): void {
    if (this._defaultConfiguration?.communicationRules != undefined) {
      this._currentConfiguration.communicationRules = JSON.parse(JSON.stringify(this._defaultConfiguration.communicationRules));
      if (this.changeCurrentConfigurationAllowed) {
        this.notifyCurrentConfigurationChange(this._currentConfiguration);
      }
    }
  }

  public saveCommunicationRules(rules: CommunicationRule[]): void {
    this._currentConfiguration.communicationRules = rules;
    if (this.changeCurrentConfigurationAllowed) {
      this.notifyCurrentConfigurationChange(this._currentConfiguration);
    }
  }

  public getCommunicationRules(): CommunicationRule[] | undefined {
    return this._currentConfiguration.communicationRules;
  }

  public matchCommunicationRules(browserWindowId: number, node: BrowserObject, windowHandler: WindowHandler): number | undefined {
    if ((this._currentConfiguration.communicationRules != undefined) && (this._currentConfiguration.communicationRules?.length > 0)) {
      const sourceManagerWindowId = windowHandler.getWindowConfigurationId(browserWindowId);
      const filter = new CommunicationRulesFilter(this._currentConfiguration.communicationRules, this.traceService);
      const targetManagerWindowId = filter.match(sourceManagerWindowId!, node);
      if (targetManagerWindowId != undefined) {
        const targetBrowserWinId = windowHandler.getBrowserWindowIdFromConfigId(targetManagerWindowId);
        if (targetBrowserWinId !== undefined) {
          return windowHandler.getBrowserManagerWindow(targetBrowserWinId)?.webContents.id;
        }
      }
    }
    return undefined;
  }

  public getManagerInfoOfCurrentConfiguration(windowConfigId: string): ManagerInfo | undefined {
    const mgrWin = this.getManagerWindowOfCurrentConfiguration(windowConfigId);
    return (mgrWin != undefined)? this.createManagerInfo(mgrWin.manager): undefined;
  }

  public get isDefaultConfigurationDefined(): boolean {
    return (this._defaultConfiguration != null);
  }

  public alignCurrentMainManagerWindowId(): string | undefined {
    // If the manager windows Id's of the default and the user (current) configuration are different, they are aligned.
    // Note: Different Id's can only exist, if the user specific configuration was create before the default one.
    const currentMain = this.getCurrentMainManager();
    const defaultMain = this.getDefaultMainManager();
    if ((currentMain != undefined) && (defaultMain != undefined)) {
      currentMain.id = defaultMain.id;
      return currentMain.id;
    }
    return undefined;
  }

  /**
   * Evaluates the current manager windows not existing in the default configuration
   *
   * @returns {string[]} Id's of the manager window (configuration)
   * @memberof MultiMonitorConfigurationHandler
   */
  public evalCurrentManagerWindowsNotExistingInDefault(): string[] {
    let idsNotExisting: string[] = [];
    this._currentConfiguration.windows.forEach(windowCurrent => {
      if (this._defaultConfiguration?.windows.findIndex(windowDef => windowDef.id === windowCurrent.id) === -1) {
        idsNotExisting.push(windowCurrent.id);
      }
    });
    return idsNotExisting;
  }

  public evalCurrentManagerWindowsExistingInDefault(): string[] {
    let idsExisting: string[] = [];
    this._currentConfiguration.windows.forEach(windowCurrent => {
      if (this._defaultConfiguration?.windows.findIndex(windowDef => windowDef.id === windowCurrent.id) !== -1) {
        idsExisting.push(windowCurrent.id);
      }
    });
    return idsExisting;
  }

  public evalDefaultManagerWindowsNotStarted(): ManagerWindow[] {
    let notStarted: ManagerWindow[] = [];
    if (this._defaultConfiguration != null) {
      this._defaultConfiguration.windows.forEach(windowDefault => {
        if (this._currentConfiguration?.windows.findIndex(windowCurrent => windowCurrent.id === windowDefault.id) === -1) {
          notStarted.push(windowDefault);
        }
      });
    }
    return notStarted;
  }

  public evalDefaultManagerWindowsStarted(): ManagerWindow[] {
    let started: ManagerWindow[] = [];
    if (this._defaultConfiguration != null) {
      this._defaultConfiguration.windows.forEach(windowDefault => {
        if (this._currentConfiguration?.windows.findIndex(windowCurrent => windowCurrent.id === windowDefault.id) !== -1) {
          started.push(windowDefault);
        }
      });
    }
    return started;
  }

  public addToCurrentConfiguration(windows: ManagerWindow[]): void {
    const copy: ManagerWindow[] = JSON.parse(JSON.stringify(windows));
    this._currentConfiguration.windows.push(...copy);
    const event = copy.find(window => window.manager.managerType === ManagerType.Event);
    if (event !== undefined) {
      this.changeCurrentMainManagerToMainWithoutEvent();
    }
  }

  public doesDisplayExist(window: ManagerWindow): boolean {
    return (screen.getAllDisplays().findIndex(display => display.id === window.displayId) !== -1);
  }

  private updateDisplayAndWindowProperties(window: ManagerWindow): void {
    if (!this.doesDisplayExist(window)) {
      return;
    }
    // the display exists, however could have been 'moved' or rescaled by the OS display settings dialog
    const display = screen.getAllDisplays().find(display => display.id === window.displayId);
    if (display !== undefined) {
      if (!this.compareDisplayScaleFactor(display, window)) {
        window.x = Math.round(((window.x - window.displayX) * window.scaleFactor / display.scaleFactor) + window.displayX);
        window.y = Math.round(((window.y - window.displayY) * window.scaleFactor / display.scaleFactor) + window.displayY);
        window.width = Math.round(window.width * window.scaleFactor / display.scaleFactor);
        window.height = Math.round(window.height * window.scaleFactor / display.scaleFactor);
      }
      if (!this.compareDisplayPosition(display, window)) {
        window.x = window.x + (display.bounds.x - window.displayX);
        window.y = window.y + (display.bounds.y - window.displayY);
      }
      window.displayX = display.bounds.x;
      window.displayY = display.bounds.y;
      window.displayWidth = display.bounds.width;
      window.displayHeight = display.bounds.height;
      window.scaleFactor = display.scaleFactor;
    }
  }

  private compareDisplayPosition(display: Display, window: ManagerWindow): boolean {
    return ((display.bounds.x === window.displayX) && (display.bounds.y === window.displayY));
  }

  private compareDisplayScaleFactor(display: Display, window: ManagerWindow): boolean {
    return (display.scaleFactor === window.scaleFactor);
  }

  private changeCurrentMainManagerToMainWithoutEvent(): void {
    let mainWin = this.getCurrentMainManager();
    if (mainWin?.manager.managerType === ManagerType.Main) {
      mainWin.manager.managerType = ManagerType.MainWoEvent;
      this.notifyCurrentManagerDefinitionChange(mainWin);
    }
  }

  private copyConfiguration(source: MultiMonitorConfiguration): MultiMonitorConfiguration {
    return JSON.parse(JSON.stringify(source));
  }

  private getNewManagerWindowConfigId(): string {
    return crypto.randomUUID();
  }

  private getManagerWindowOfCurrentConfiguration(windowId: string): ManagerWindow | undefined {
    return this._currentConfiguration?.windows.find((mgrWin: ManagerWindow) => mgrWin.id === windowId);
  }

  private deleteFromCurrentConfiguration(mgrWindow: ManagerWindow): void {
    const idx = this._currentConfiguration.windows.findIndex(windowItem => windowItem.id === mgrWindow.id);
    this._currentConfiguration.windows.splice(idx, 1);
  }

  private createManagerWindowConfiguration(window: BrowserWindow, type: ManagerType, frames: FrameDefinition[]): ManagerWindow | undefined {
    const newId = this.getNewManagerWindowConfigId();
    if (newId === undefined) {
      return undefined;
    }

    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    let win: ManagerWindow = {
      id: newId,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: window.isMaximized(),
      displayId: display.id,
      displayX: display.bounds.x,
      displayY: display.bounds.y,
      displayWidth: display.bounds.width,
      displayHeight: display.bounds.height,
      scaleFactor: display.scaleFactor,
      manager: { managerType: type, frames }
    };
    this._currentConfiguration.windows.push(win);
    return win;
  }

  private createManagerInfo(managerDefinition: ManagerDefinition): ManagerInfo {
    if (managerDefinition.managerType === ManagerType.Main) {
      return { framesToCreate: newMainManagerFrames().map((frameDef: FrameDefinition) => frameDef.id), managerDefinition };
    } else if (managerDefinition.managerType === ManagerType.MainWoEvent) {
      return { framesToCreate: newMainManagerWoEventFrames().map((frameDef: FrameDefinition) => frameDef.id), managerDefinition };
    } else if (managerDefinition.managerType === ManagerType.System) {
      return { framesToCreate: newAdditionalSystemManagerFrames().map((frameDef: FrameDefinition) => frameDef.id), managerDefinition };
    } else if (managerDefinition.managerType === ManagerType.Event) {
      return { framesToCreate: newAdditionalEventManagerFrames().map((frameDef: FrameDefinition) => frameDef.id), managerDefinition };
    } else {
      throw Error(`Unknown enum member: ${managerDefinition.managerType}`);
    }
  }
}
