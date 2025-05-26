import { Injectable, NgZone } from '@angular/core';
import { BrowserObject, ViewDefinition } from '@gms-flex/services';
import { TraceService } from '@gms-flex/services-common';
import { Observable, Subject } from 'rxjs';

import {
  ActiveLayoutInfo,
  AppInfo,
  AsyncMessageType,
  BootstrapInfo,
  CaptureWindowInfo,
  CaptureWindowRequestInfo,
  ClientIdentifier,
  GetWindowRequestInfo,
  HistoryUpdateInfo,
  MainMessage,
  MessageType,
  MultiMonitorConfigurationInfo,
  RendererMessage,
  ShowBackDropInfo,
  ShutdownInfo,
  SynchData,
  SyncMessageType,
  TraceType,
  UiState,
  UserInfo,
  WindowCloseInfo,
  WindowInfo
} from '../../../../desktop-main/src/messaging/window-message.data';
import { CommunicationRule, FrameDefinition, ManagerInfo, MultiMonitorConfiguration } from '../multi-monitor/multi-monitor-configuration.data';
import { WindowCloseInfoRequest } from './desktop-message.data';
import { ElectronMessageService } from './electron-message.service';

export const trcModuleNameDesktop = 'gmsApplication_DesktopMain';

@Injectable({ providedIn: 'root' })
export class DesktopMessageService {

  private readonly _objectSelected: Subject<any> = new Subject<any>();
  private readonly _eventSelected: Subject<any> = new Subject<any>();
  private readonly _currentManagerConfigurationChanged: Subject<ManagerInfo> = new Subject<ManagerInfo>();
  private readonly _currentMmConfigurationChanged: Subject<MultiMonitorConfigurationInfo> = new Subject<MultiMonitorConfigurationInfo>();
  private readonly _defaultMmConfigurationChanged: Subject<MultiMonitorConfigurationInfo> = new Subject<MultiMonitorConfigurationInfo>();
  private readonly _uiStateChanged: Subject<SynchData> = new Subject<SynchData>();
  private readonly _historyStateChanged: Subject<HistoryUpdateInfo> = new Subject<HistoryUpdateInfo>();
  private readonly _canWindowBeClosed: Subject<WindowCloseInfoRequest> = new Subject<WindowCloseInfoRequest>();
  private readonly _showBackDrop: Subject<ShowBackDropInfo> = new Subject<ShowBackDropInfo>();
  private readonly _focus: Subject<boolean> = new Subject<boolean>();
  private readonly _isMainManager?: boolean;

  constructor(
    private readonly traceService: TraceService,
    private readonly electronMessageService: ElectronMessageService,
    private readonly ngZone: NgZone) {
    if (this.runsInElectron) {
      this.electronMessageService.mainProcessNotification.subscribe(
        (notification: { senderWebContentsId: number; data: any }) => this.dispatchMainProcessMessage(notification.senderWebContentsId, notification.data)
      );
      this.communicationChannelReady();
      // We cache the following state (isMainManager), as it is asked many times from various components of the Flex Client, also in change detection cycles.
      // That state never changes during the lifetime of the application.
      this._isMainManager = this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.IsMainManager));
    }
  }

  /**
   * Returns true, if this Flex Client application instance is hosted in an Electon desktop application.
   *
   * @readonly
   * @type {boolean}
   * @memberof DesktopMessageService
   */
  public get runsInElectron(): boolean {
    return this.electronMessageService.runsInElectron;
  }

  /**
   * Notifies, if any window (containing a Flex Client application instance)  sent a DesigoCC object.
   *
   * @readonly
   * @type {Observable<any>}
   * @memberof DesktopMessageService
   */
  public get onObjectSelectionChanged(): Observable<any> {
    return this._objectSelected.asObservable();
  }

  /**
   * Notifies, if any window (containing a Flex Client application instance) sent a DesigoCC event (alarm).
   *
   * @readonly
   * @type {Observable<any>}
   * @memberof DesktopMessageService
   */
  public get onEventSelectionChanged(): Observable<any> {
    return this._eventSelected.asObservable();
  }

  /**
   * The current configuration of the respective manager changed.
   * The Flex CLient application UI might need to update itself.
   *
   * @readonly
   * @type {Observable<ManagerInfo>}
   * @memberof DesktopMessageService
   */
  public get onCurrentManagerConfigurationChanged(): Observable<ManagerInfo> {
    return this._currentManagerConfigurationChanged.asObservable();
  }

  /**
   * The current multi monitor configuration changed.
   *
   * @readonly
   * @type {Observable<MultiMonitorConfigurationInfo>}
   * @memberof DesktopMessageService
   */
  public get onCurrentMultiMonitorConfigurationChanged(): Observable<MultiMonitorConfigurationInfo> {
    return this._currentMmConfigurationChanged.asObservable();
  }

  /**
   * The default multi monitor configuration changed.
   *
   * @readonly
   * @type {Observable<MultiMonitorConfigurationInfo>}
   * @memberof DesktopMessageService
   */
  public get onDefaultMultiMonitorConfigurationChanged(): Observable<MultiMonitorConfigurationInfo> {
    return this._defaultMmConfigurationChanged.asObservable();
  }

  /**
   * The ui state changed.
   *
   * @readonly
   * @type {Observable<SynchData>}
   * @memberof DesktopMessageService
   */
  public get onUiStateChanged(): Observable<SynchData> {
    return this._uiStateChanged.asObservable();
  }

  /**
   * Notifies, if the history state of the hosted Flex Client application changed.
   *
   * @readonly
   * @type {Observable<HistoryUpdateInfo>}
   * @memberof DesktopMessageService
   */
  public get onHistoryStateChanged(): Observable<HistoryUpdateInfo> {
    return this._historyStateChanged.asObservable();
  }

  /**
   * Notifies a request to check if the respective window (hosting Flex Cient application) can be closed.
   * The subscriber shall evaluate the dirty state of Flex Client application and set the reply on the notified request object.
   *
   * @readonly
   * @type {Observable<WindowCloseInfoRequest>}
   * @memberof DesktopMessageService
   */
  public get onCanWindowBeClosedRequestChanged(): Observable<WindowCloseInfoRequest> {
    return this._canWindowBeClosed.asObservable();
  }

  /**
   * Notifies, if the subscriber shall show/hide a backdrop including a dialog with a message.
   *
   * @readonly
   * @type {Observable<ShowBackDropInfo>}
   * @memberof DesktopMessageService
   */
  public get onShowBackDropChanged(): Observable<ShowBackDropInfo> {
    return this._showBackDrop.asObservable();
  }

  /**
   * Notifies focus changes
   *
   * @readonly
   * @type {Observable<boolean>}
   * @memberof DesktopMessageService
   */
  public get onFocusChanged(): Observable<boolean> {
    return this._focus.asObservable();
  }

  public setActiveLanguage(language: string): void {
    if (this.runsInElectron) {
      return this.electronMessageService.sendToMain(new MainMessage(MessageType.SetActiveLanguage, language));
    }
  }

  public reload(emptyCache: boolean): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.Reload, emptyCache));
    }
  }

  /**
   * Sets the active layout for the respective frame of the current multimonitor configuration.
   *
   * @param frameId
   * @param viewId
   * @param layoutId
   * @memberof DesktopMessageService
   */
  public setActiveLayout(frameId: string, viewId: string, layoutId: string): void {
    if (this.runsInElectron) {
      const layoutinfo: ActiveLayoutInfo = { frameId, viewId, layoutId };
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SetActiveLayout, layoutinfo));
    }
  }

  /**
   * Returns the set layoutId
   *
   * @param frameId
   * @param viewId
   * @memberof DesktopMessageService
   */
  public getActiveLayout(frameId: string, viewId: string): string | undefined {
    const mgrDef = this.getCurrentManagerConfiguration()?.managerDefinition;
    if (mgrDef !== undefined) {
      const frameFound = mgrDef.frames?.find((frame: FrameDefinition) => frame.id === frameId);
      if (frameFound !== undefined) {
        const viewFound = frameFound.views?.find((view: ViewDefinition) => view.id === viewId);
        if (viewFound !== undefined) {
          return viewFound.defaultLayout;
        }
      }
    }
    return undefined;
  }

  /**
   * Sets the startup node designation for the current configuration
   *
   * @param designation
   * @memberof DesktopMessageService
   */
  public setStartupNode(designation: string): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SetStartupNode, designation));
    }
  }

  /**
   * Clears the stored security settings. The settings are:
   * The accepted server certificate.
   * The client certificate to use for the SSL handshake.
   *
   * @memberof DesktopMessageService
   */
  public clearSecuritySettings(): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.ClearSecuritySettings));
    }
  }

  /**
   * Starts a new addtional system manager.
   *
   * @memberof DesktopMessageService
   */
  public startAdditionalSystemManager(): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.StartAdditionalSystemManager));
    }
  }

  /**
   * Detaches the event list from the main manager and starts a new manager with the detached event list.
   *
   * @param [initialUrl]
   * @memberof DesktopMessageService
   */
  public detachEventManager(initialUrl?: string): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.DetachEventManager, initialUrl));
    }
  }
  /**
   * Attaches the event list to the main manager and closes additional detached event manager.
   *
   * @param [initialUrl]
   * @memberof DesktopMessageService
   */
  public resumeEventManager(initialUrl?: string): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.ResumeEventManager, initialUrl));
    }
  }

  /**
   * Saves the current (what you see is what you get) multi monitor configuration as default multi monitor configuration.
   * Before saving, it is checked if the user has:
   * - The 'Multi Monitor - Configure' application right.
   *
   * @param [overruleAllowed=false] If true, any user is allowed to overrule the default configuration.
   * @memberof DesktopMessageService
   */
  public saveCurrentConfigurationAsDefault(overruleAllowed: boolean = false): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SaveCurrentConfigurationAsDefault, overruleAllowed));
    }
  }

  /**
   * Bootstraps the application.
   * Shall be called once, after the login has been excuted.
   * Calling the method again shall only be done after calling 'invokeShutdownProcedure(...)'.
   *
   * @param bsInfo
   * @memberof DesktopMessageService
   */
  public bootstrapApplication(bsInfo: BootstrapInfo): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.BootstrapApplication, bsInfo));
    }
  }

  /**
   * Request to invoke the communication rules editor
   *
   * @memberof DesktopMessageService
   */
  public editCommunicationRules(): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.EditCommunicationRules));
    }
  }

  /**
   * Saves the communication rules
   *
   * @param rules
   * @memberof DesktopMessageService
   */
  public saveCommunicationRules(rules: CommunicationRule[]): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SaveCommunicationRules, rules));
    }
  }

  /**
   *  Closes the communication rules editor window
   *
   * @memberof DesktopMessageService
   */
  public closeCommunicationRulesEditor(): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.CloseCommunicationRulesEditor));
    }
  }

  /**
   * Invokes the shutdown procedure.
   * Dependent on the parameter, all windows are closed and the application is shutdown
   * or the additional windows are closed and the main manager logsoff only; the main manager remains alive.
   * The main process will ask any window with Flex Client running, if unsaved data exists (also dependent on the parameter).
   * If no window has unsaved data (or discarded or saved the data meanwhile), this method will reply with true.
   * The invoker can do then the logout call.
   * The main process closes all windows which have no unsaved data (or discarded the data).
   *
   * @returns A promise resolving to true, if all windows are not dirty (have no unsaved data).
   * @param sdInfo Allows to specify if dirtyCheck of the windows need to be done and if the main window shall remain alive or not.
   * @memberof DesktopMessageService
   */
  public invokeShutdownProcedure(sdInfo: ShutdownInfo): Promise<boolean> {
    if (this.runsInElectron) {
      return this.electronMessageService.sendAsyncToMain(new MainMessage(AsyncMessageType.DoShutdownProcedure, sdInfo));
    }
  }

  /**
   * Retrieves the Id's of all windows needed to do video capturing via navigator object.
   * Retrieves thumbnails of all windows.
   *
   * @param requestInfo
   * @returns
   * @memberof DesktopMessageService
   */
  public captureWindows(requestInfo: CaptureWindowRequestInfo): Promise<CaptureWindowInfo[]> {
    if (this.runsInElectron) {
      return this.electronMessageService.sendAsyncToMain(new MainMessage(AsyncMessageType.CaptureWindows, requestInfo));
    }
  }

  /**
   * Resets the current multi monitor configuration to the default configuration.
   * This might cause windows to be closed (if not dirty) and others be recreated or just moved to the default position.
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public resetToDefaultConfiguration(): Promise<boolean> {
    if (this.runsInElectron) {
      return this.electronMessageService.sendAsyncToMain(new MainMessage(AsyncMessageType.ResetToDefaultConfiguration));
    }
  }

  /**
   * Closes all manager windows, if they are not dirty, except the main manager and navigates then to the endpoint configuration page.
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public editEndpointAddress(): Promise<boolean> {
    if (this.runsInElectron) {
      return this.electronMessageService.sendAsyncToMain(new MainMessage(AsyncMessageType.EditEndpointAddress));
    }
  }

  public getWindowsInfo(requestInfo: GetWindowRequestInfo): WindowInfo[] {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetWindowsInfo, requestInfo));
    }
  }

  public getOwnWindowInfo(): WindowInfo {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetOwnWindowInfo));
    }
  }

  public getCommunicationRules(): CommunicationRule[] | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetCommunicationRules));
    }
  }

  public matchCommunicationRules(node: BrowserObject): number | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.MatchCommunicationRules, node));
    } else {
      return undefined;
    }
  }

  /**
   * Returns the client identification
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public getClientIdentification(): ClientIdentifier | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetClientIdentification));
    }
  }

  public getAppInfo(): AppInfo | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetAppInfo));
    }
  }

  /**
   * Returns the default multi monitor configuration.
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public getDefaultMultiMonitorConfiguration(): MultiMonitorConfiguration | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetDefaultConfiguration));
    }
  }

  /**
   * Returns the current configuration of the manager invoking it.
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public getCurrentManagerConfiguration(): ManagerInfo | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetManagerInfoOfCurrentConfiguration));
    }
  }

  /**
   * Returns true, if the manager invoking it is the main manager.
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public isMainManager(): boolean | undefined {
    if (this.runsInElectron) {
      return this._isMainManager;
    }
  }

  /**
   * Returns true, if the manager invoking it is the a manager with the event list.
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public isManagerWithEvent(): boolean | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.IsManagerWithEvent));
    }
  }

  /**
   * Returns true, if the default multi monitor configuration is allowed to be changed.
   * This is true in the following case:
   * ('Closed-Mode' not active) AND (the user owns the application right 'Configure Multi Monitor')
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public isDefaultMultiMonitorConfigurationChangeAllowed(): boolean | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.IsDefaultConfigurationChangeAllowed));
    }
  }

  /**
   * Returns true, if the current (user specific) multi monitor configuration is allowed to be changed.
   * This is true in the following cases:
   * (No default multi monitor configuration available) OR ('OverruleAllowed' flag of the default multi monitor configuration is set) OR
   * (the user owns the application right 'Configure Multi Monitor') AND (closed mode is not enabled)
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public isCurrentMultiMonitorConfigurationChangeAllowed(): boolean | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.IsCurrentConfigurationChangeAllowed));
    }
  }

  /**
   * Returns true, if no default multimonitor configuration is defined or if its 'OverruleAllowed' flag is to true
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public isUserConfigurationChangeAllowed(): boolean | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.IsUserConfigurationChangeAllowed));
    }
  }

  /**
   * Returns true, if the application is started with the closed mode flag.
   *
   * @returns
   * @memberof DesktopMessageService
   */
  public isClosedModeActive(): boolean | undefined {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.IsClosedModeActive));
    }
  }

  /**
   * Sets the zoom factor of the web content of all windows with the same domain.
   * If undefined is set on the parameter, the method only returns the current zoom factor.
   *
   * @param zoom in percentage
   * @returns the current applied zoom factor
   * @memberof DesktopMessageService
   */
  public setZoom(zoom: number | undefined): number {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.SetZoom, zoom));
    }
  }

  /**
   * Gets the current ui state.
   *
   * @returns UiState
   * @memberof DesktopMessageService
   */
  public getUiSyncState(): UiState {
    if (this.runsInElectron) {
      return this.electronMessageService.sendSyncToMain(new MainMessage(SyncMessageType.GetUiState));
    }
  }

  /**
   * Sets focus
   *
   * @param focus
   * @memberof DesktopMessageService
   */
  public setFocus(focus: boolean): void {
    this._focus.next(focus);
  }

  /**
   * Sends a DesigoCC object to the main manager.
   *
   * @param data
   * @memberof DesktopMessageService
   */
  public sendObjectToMainManager(data: any): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SendObjectToMain, data));
    }
  }

  /**
   * Sends a DesigoCC object to the specified window.
   *
   * @param webContentsId
   * @param data
   * @memberof DesktopMessageService
   */
  public sendObject(webContentsId: number, data: any): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SendObjectToWindow, data, webContentsId));
    }
  }

  /**
   * Send a DesigoCC object to all windows.
   *
   * @param data
   * @memberof DesktopMessageService
   *
   */
  public sendObjectToAllWindows(data: any): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SendObjectToAllWindows, data));
    }
  }

  /**
   * Sends a DesigoCC event to the manager which includes the event list.
   *
   * @param data
   * @memberof DesktopMessageService
   */
  public sendEvent(data: any): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SendEvent, data));
    }
  }

  /**
   * Sends the synchronization state object to all windows.
   *
   * @param synchData
   * @memberof DesktopMessageService
   */
  public synchronizeUiState(synchData: SynchData): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.SynchronizeUiState, synchData));
    }
  }

  private communicationChannelReady(): void {
    if (this.runsInElectron) {
      this.electronMessageService.sendToMain(new MainMessage(MessageType.CommunicationChannelReady));
    }
  }

  private dispatchMainProcessMessage(senderWebContentsId: number, message: MainMessage | RendererMessage): void {
    // Remark: _senderWebContentsId parameter shall not be used!! It is here only for API compatibility
    if (message.messageType !== MessageType.SendTrace) {
      this.traceService.info(trcModuleNameDesktop, `DesktopMessageService.dispatchMainProcessMessage():
      Incoming message: type=${message.messageType}; senderId=${senderWebContentsId}; data= ${JSON.stringify(message.data)}`);
    } else {
      if (message.data.traceType === TraceType.Info) {
        this.traceService.info(trcModuleNameDesktop, message.data.message, ...message.data.optionalParams);
      } else if (message.data.traceType === TraceType.Warn) {
        this.traceService.warn(trcModuleNameDesktop, message.data.message, ...message.data.optionalParams);
      } else if (message.data.traceType === TraceType.Debug) {
        this.traceService.debug(trcModuleNameDesktop, message.data.message, ...message.data.optionalParams);
      } else if (message.data.traceType === TraceType.Error) {
        this.traceService.error(trcModuleNameDesktop, message.data.message, ...message.data.optionalParams);
      } else {
        this.traceService.error(trcModuleNameDesktop, `Trace type not handled: ${message.data.traceType}`);
      }
      return;
    }

    this.ngZone.run(() => {
      if (message.messageType === MessageType.SendObjectToWindow) {
        this._objectSelected.next(message.data);
      } else if (message.messageType === MessageType.SendEvent) {
        this._eventSelected.next(message.data);
      } else if (message.messageType === MessageType.HistoryStateUpdate) {
        this._historyStateChanged.next(message.data);
      } else if (message.messageType === MessageType.ManagerInfoCurrentConfigurationChanged) {
        this._currentManagerConfigurationChanged.next(message.data);
      } else if (message.messageType === MessageType.CurrentMmConfigurationChanged) {
        this._currentMmConfigurationChanged.next(message.data);
      } else if (message.messageType === MessageType.DefaultMmConfigurationChanged) {
        this._defaultMmConfigurationChanged.next(message.data);
      } else if (message.messageType === MessageType.SynchronizeUiState) {
        this._uiStateChanged.next(message.data);
      } else if (message.messageType === AsyncMessageType.CanWindowBeClosed) {
        this._canWindowBeClosed.next(new WindowCloseInfoRequest((message.data as WindowCloseInfo).contextId, this.electronMessageService));
      } else if (message.messageType === MessageType.ShowBackDrop) {
        this._showBackDrop.next(message.data);
      } else if (message.messageType === MessageType.Focus) {
        this._focus.next(message.data);
      } else {
        this.traceService.error(trcModuleNameDesktop, `Message type not handled: ${message.messageType}`);
      }
    });
  }
}
