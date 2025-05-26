import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, webContents } from 'electron';
import * as https from 'https';

import { ManagerInfo, MultiMonitorConfiguration } from '../../../src/app/desktop-renderer/multi-monitor/multi-monitor-configuration.data';
import { MultiMonitorConfigurationHandler } from '../multi-monitor/multi-monitor-configuration-handler';
import { WindowHandler } from '../multi-monitor/window-handler';
import { CertificateHelper } from '../certificate/certificate-helper';
import { ClientCertificateWindow } from '../certificate/client-certificate-window';
import { MainTraceService } from '../tracing/main-trace-service';
import { AsyncMessageType, WindowCloseInfo, ClientIdentifier, HistoryUpdateInfo, MainMessage,
  MessageType, RendererMessage, SyncMessageType, TraceType, ShowBackDropInfo, ShutdownInfo, ShowBackDropReason, MultiMonitorConfigurationInfo, BrandInfo } from './window-message.data';
import { EndpointFile } from '../endpoint/endpoint-file';
import { CertificateConfigurationFile } from '../certificate/certificate-configuration-file';
import { ClientUpdater } from '../update/client-updater';
import { EventEmitter } from 'events';
import { WsiService } from './wsi.service';
import { WindowCapture } from '../multi-monitor/window-capture';
import { ProductSettingsFile } from '../endpoint/product-settings-file';
import { ClientIdentification, ClientIdFile } from '../client-id/client-id-file';
import { GmsBrand } from '../brand/gms-brand';

export class WindowMessageService {
  private static contextIdCounter = 0;
  private _messagesFromRenderer = new EventEmitter();
  private clientIdentification?: ClientIdentification;

  constructor(
    private managerWindowHandler: WindowHandler,
    private configurationHandler: MultiMonitorConfigurationHandler,
    private certificateHelper: CertificateHelper,
    private clientCertificatesWindow: ClientCertificateWindow,
    private clientUpdater: ClientUpdater,
    private wsiService: WsiService,
    private brand: GmsBrand,
    private traceService: MainTraceService
    ) {
    this.traceService.subscribeForInfoTraces((message: string, ...optionalParams: any[]) => this.sendTrace(TraceType.Info, message, ...optionalParams) );
    this.traceService.subscribeForWarnTraces((message: string, ...optionalParams: any[]) => this.sendTrace(TraceType.Warn, message, ...optionalParams) );
    this.traceService.subscribeForDebugTraces((message: string, ...optionalParams: any[]) => this.sendTrace(TraceType.Debug, message, ...optionalParams) );
    this.traceService.subscribeForErrorTraces((message: string, ...optionalParams: any[]) => this.sendTrace(TraceType.Error, message, ...optionalParams) );

    this.configurationHandler.subscribeForCurrentManagerInfoChanges((windowId: string, managerInfo: ManagerInfo) => this.sendManagerInfo(windowId, managerInfo));
    this.configurationHandler.subscribeForCurrentConfigurationChanges((config) => this.saveCurrentMultiMonitorConfiguration(config));
    this.configurationHandler.subscribeForDefaultConfigurationChanges((config) => this.saveDefaultMultiMonitorConfiguration(config));
  };

  private notifyCanWindowBeClosedReply(info: WindowCloseInfo): void {
    this._messagesFromRenderer.emit('can-window-be-closed-reply', info);
  }

  private subscribeForCanWindowBeClosedReply(listener: ((info: WindowCloseInfo) => void)): void {
    this._messagesFromRenderer.addListener('can-window-be-closed-reply', listener);
  }

  private unSubscribeForCanWindowBeClosedReply(listener: ((info: WindowCloseInfo) => void)): void {
    this._messagesFromRenderer.removeListener('can-window-be-closed-reply', listener);
  }

  public initIpc(): void {
    this.clientIdentification = (new ClientIdFile(this.traceService)).read();
    ipcMain.on('renderer-to-main-message-channel', (event: IpcMainEvent, arg: MainMessage | RendererMessage) => {
      // Important: The browser window id of the sender must be retrieved as follows! Do not use event.sender.id as this is a webContents Id
      const windowId = BrowserWindow.fromWebContents(event.sender)!.id;

      if (arg.messageType === MessageType.BootstrapApplication) {
        this.traceService.info(
          `WindowMessageService: Message/event from window id=${windowId};
          messageType=${arg.messageType}
          userName=${arg.data.userName}
          hasConfigureRight=${arg.data.hasConfigureRight}
          userLanguage=${arg.data.userLanguage}
          defaultConfiguration=${arg.data.defaultConfiguration}
          userConfiguration=${arg.data.userConfiguration}`);
      } else {
        this.traceService.info(
          `WindowMessageService: Message/event from window id=${windowId};
          messageType=${arg.messageType};
          data=${JSON.stringify(arg.data)}`);
      }

      if (arg.messageType === MessageType.BootstrapApplication) {
        this.wsiService.setEndpoint(arg.data.endpointAddress)
        this.managerWindowHandler.bootstrapManagerWindows(arg.data);
      } else if (arg.messageType === MessageType.StartAdditionalSystemManager) {
        this.managerWindowHandler.newAdditionalSystemManagerWindow();
      } else if (arg.messageType === MessageType.DetachEventManager) {
        this.managerWindowHandler.newEventManagerWindow(arg.data);
      } else if (arg.messageType === MessageType.ResumeEventManager) {
        const detachedEventManager = this.managerWindowHandler.getWindowForDetachedEvents();
        if (detachedEventManager !== undefined) {
          this.managerWindowHandler.closeWindow(detachedEventManager.id);
        }
      } else if (arg.messageType === MessageType.CommunicationChannelReady) {
        this.managerWindowHandler.setCommunicationChannelReady(windowId);
      } else if (arg.messageType === MessageType.SendEvent) {
        this.sendEvent(this.managerWindowHandler.getWindowForEvents()!.id, arg.data);
      } else if (arg.messageType === MessageType.SendObjectToMain) {
        this.sendObject(this.managerWindowHandler.mainMangerWindow!.id, arg.data);
      } else if (arg.messageType === MessageType.SendObjectToWindow) {
        const webContentsDestination = webContents.fromId(arg.webContentsId!)!;
        const windowIdDestination = BrowserWindow.fromWebContents(webContentsDestination!)!.id;
        this.sendObject(windowIdDestination, arg.data);        
      } else if (arg.messageType === MessageType.SendObjectToAllWindows) {
        this.sendObjectToAllWindows(arg.data);
      } else if (arg.messageType === MessageType.SynchronizeUiState) {
        this.synchronizeToWindows(windowId, arg.data);
      } else if (arg.messageType === MessageType.SaveCurrentConfigurationAsDefault) {
        this.configurationHandler.saveCurrentConfigurationAsDefault(arg.data);
      } else if (arg.messageType === MessageType.ViewCertificate) {
        const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
        this.certificateHelper.showServerHostCertificate(arg.data, win);
      } else if (arg.messageType === MessageType.ImportCertificate) {
        const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
        this.certificateHelper.importCertificate(win!, this.certificateHelper.getServerHostCertificate(arg.data)!);
      } else if (arg.messageType === MessageType.ConfigureEndpointAddress) {
        this.managerWindowHandler.loadEndpointConfigurePageOnMainManagerWindow();
      } else if (arg.messageType === MessageType.EditCommunicationRules) {
        this.managerWindowHandler.createCommunicationRulesEditor();
      } else if (arg.messageType === MessageType.SaveCommunicationRules) {
        this.configurationHandler.saveCommunicationRules(arg.data);
      } else if (arg.messageType === MessageType.CloseCommunicationRulesEditor) {
        this.managerWindowHandler.closeCommunicationRulesEditor();
      } else if (arg.messageType === MessageType.ReloadApplication) {
        this.clientUpdater.init();
        this.managerWindowHandler.reloadFlexClientApplicationOnMainManager();
      } else if (arg.messageType === MessageType.AcceptCertificateAndReload) {
        // certificate error accepted, user wants to proceed
        this.certificateHelper.acceptServerHostCertificate(arg.data.hostUrl, true, arg.data.persistAcceptance);
        // load again the Flex Client HTML app
        this.managerWindowHandler.reloadFlexClientApplicationOnMainManager();
      } else if (arg.messageType === MessageType.DenyCertificateAndClose) {
        // certificate error not accepted, no sense to proceed, quit the app
        this.certificateHelper.acceptServerHostCertificate(arg.data, false);
        app.quit();
      } else if (arg.messageType === MessageType.SelectClientCertificateAndCloseDialog) {
        this.clientCertificatesWindow.selectCertificateAndClose(arg.data.certificateInfo);
        this.showBackDrop(this.managerWindowHandler.mainMangerWindow!.id, new ShowBackDropInfo(false, ShowBackDropReason.None));
        if (arg.data.persistAcceptance === true) {
          const certConfigFile = new CertificateConfigurationFile(this.traceService);
          if (arg.data.certificateInfo === undefined) {
            certConfigFile.disableClientCertificateSelection();
          } else {
            certConfigFile.storeSelectedClientCertificateKey(this.clientCertificatesWindow.createKey2(arg.data.certificateInfo));
          }
        }
      } else if (arg.messageType === MessageType.CancelClientCertificateSelectionAndCloseApp) {
        this.showBackDrop(this.managerWindowHandler.mainMangerWindow!.id, new ShowBackDropInfo(false, ShowBackDropReason.None));
        this.clientCertificatesWindow.cancelCertificateSelectionAndClose();
        // if (arg.data.persistAcceptance === true) {
        //   const certConfigFile = new CertificateConfigurationFile();
        //   certConfigFile.disableClientCertificateSelection();
        // }
        app.quit();
      } else if (arg.messageType === MessageType.ViewClientCertificate) {
        const certificate = this.clientCertificatesWindow.findCertificate(arg.data.certificateInfo);
        if (certificate !== undefined) {
          this.certificateHelper.showCertificate(certificate, this.clientCertificatesWindow.getWindow());
        }
      } else if (arg.messageType === MessageType.ClearSecuritySettings) {
        const certConfigFile = new CertificateConfigurationFile(this.traceService);
        certConfigFile.clearAllSecuritySettings();
      } else if (arg.messageType === MessageType.SetActiveLayout) {
        this.configurationHandler.setActiveLayout(this.managerWindowHandler.getWindowConfigurationId(windowId)!, arg.data);
      } else if (arg.messageType === MessageType.SetActiveLanguage) {
        this.managerWindowHandler.appInfo!.activeLanguage = arg.data;
      } else if (arg.messageType === MessageType.SetStartupNode) {
        this.configurationHandler.setStartupNode(this.managerWindowHandler.getWindowConfigurationId(windowId)!, arg.data);
      } else if (arg.messageType === MessageType.TestEndpointAddress) {
        this.testEndpoint(arg.data);
      } else if (arg.messageType === MessageType.QuitAndInstallUpdate) {
        this.clientUpdater.quitAndInstall();
      } else if (arg.messageType === MessageType.RemindLaterForUpdate) {
        this.clientUpdater.remindLaterForUpdate(arg.data);
      } else if (arg.messageType === MessageType.CanWindowBeClosedReply) {
        this.notifyCanWindowBeClosedReply(arg.data);
      } else if (arg.messageType === MessageType.Reload) {
        this.managerWindowHandler.reloadPage(windowId, arg.data);
      } else {
        this.traceService.error(`WindowMessageService: Message type not implemented: ${arg.messageType}`);
      }
    });

    ipcMain.on('synch-renderer-to-main-message-channel', (event: IpcMainEvent, arg: MainMessage) => {
      // Important: The browser window id of the sender must be retrieved as follows! Do not use event.sender.id as this is a webContents Id
      const windowId = BrowserWindow.fromWebContents(event.sender)!.id;

      this.traceService.info(
        `WindowMessageService: Synch message from window id=${windowId};
        messageType=${arg.messageType};
        data=${JSON.stringify(arg.data)}`);

      let msgReturnValue: any;
      if (arg.messageType === SyncMessageType.IsMainManager) {
        msgReturnValue = this.managerWindowHandler.isMainManagerWindow(windowId);
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.IsManagerWithEvent) {
        msgReturnValue = this.managerWindowHandler.isManagerWithEvent(windowId);
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.IsDefaultConfigurationChangeAllowed) {
        msgReturnValue = this.configurationHandler.changeDefaultConfigurationAllowed;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.IsCurrentConfigurationChangeAllowed) {
        msgReturnValue = this.configurationHandler.changeCurrentConfigurationAllowed;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.IsUserConfigurationChangeAllowed) {
        msgReturnValue = this.configurationHandler.userSpecificConfigurationAllowed;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.IsClosedModeActive) {
        msgReturnValue = this.configurationHandler.closedMode;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetManagerInfoOfCurrentConfiguration) {
        msgReturnValue =  this.configurationHandler.getManagerInfoOfCurrentConfiguration(this.managerWindowHandler.getWindowConfigurationId(windowId)!);
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetClientIdentification) {
        msgReturnValue = this.getClientIdentifier();
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetAppInfo) {
        msgReturnValue = this.managerWindowHandler.appInfo;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetDefaultConfiguration) {
        msgReturnValue = this.configurationHandler.defaultConfiguration;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetWindowsInfo) {
        msgReturnValue = this.managerWindowHandler.getWindowsInfo(windowId, arg.data);
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetOwnWindowInfo) {
        msgReturnValue = this.managerWindowHandler.getWindowInfo(windowId);
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetCommunicationRules) {
        msgReturnValue = this.configurationHandler.getCommunicationRules();
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.MatchCommunicationRules) {
        msgReturnValue = this.configurationHandler.matchCommunicationRules(windowId, arg.data, this.managerWindowHandler);
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.SaveEndpointAddress) {
        msgReturnValue = this.saveEndpointAddress(arg.data);
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetUiState) {
        msgReturnValue = this.managerWindowHandler.uiSyncState;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.ReadEndpointAddress) {
        msgReturnValue = this.readEndpointAddress();
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.ReadDownloadedEndpointAddress) {
        msgReturnValue = this.readDownloadedEndpointAddress();
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.SetZoom) {
        if (arg.data !== undefined) {
          event.sender.setZoomFactor(arg.data / 100);
        }
        event.returnValue = event.sender.getZoomFactor() * 100;
      } else if (arg.messageType === SyncMessageType.GetCurrentCertificateError) {
        event.returnValue = this.certificateHelper.getCertificateErrorInfo(windowId);
      } else if (arg.messageType === SyncMessageType.GetCurrentConnectionError) {
        if (this.managerWindowHandler.currentMainManagerConnectionError !== undefined) {
          event.returnValue = this.managerWindowHandler.currentMainManagerConnectionError;;
        } else {
          event.returnValue = undefined;
        }
      } else if (arg.messageType === SyncMessageType.GetClientCertificateInfo) {
        if (this.clientCertificatesWindow.isWindowShown()) {
          event.returnValue = this.clientCertificatesWindow.certificateInfos;
        } else {
          event.returnValue = undefined;
        }
      } else if (arg.messageType === SyncMessageType.GetClientUpdateInfo) {
        event.returnValue = this.clientUpdater.getClientUpdateInfo()
      } else if (arg.messageType === SyncMessageType.GetBrandInfo) {
        event.returnValue = new BrandInfo(this.brand.getBrandName(), this.brand.getBrandDisplayName(), this.brand.getLandingImage());
      } else {
        this.traceService.error(`WindowMessageService: Message type not implemented: ${arg.messageType}`);
        msgReturnValue = undefined;
        event.returnValue = undefined;
      }

      this.traceService.info(
        `WindowMessageService: Returned data for synch message from window id=${windowId};
        messageType=${arg.messageType};
        returnValue=${JSON.stringify(msgReturnValue)}`);
    });

    ipcMain.handle('asynch-renderer-to-main-message-channel', (event: IpcMainInvokeEvent, arg: MainMessage): Promise<any> => {
      // Important: The browser window id of the sender must be retrieved as follows! Do not use event.sender.id as this is a webContents Id
      const windowId = BrowserWindow.fromWebContents(event.sender)!.id;

      this.traceService.info(
        `WindowMessageService: Asynch message from window id=${windowId};
        messageType=${arg.messageType};
        data=${JSON.stringify(arg.data)}`);

      if (arg.messageType === AsyncMessageType.DoShutdownProcedure) {
        return this.managerWindowHandler.closeAllWindowsWithCheck(arg.data);
      } else if (arg.messageType === AsyncMessageType.ResetToDefaultConfiguration) {
        return this.managerWindowHandler.resetToDefaultConfiguration();
      } else if (arg.messageType === AsyncMessageType.CaptureWindows) {
        return new WindowCapture(this.managerWindowHandler).captureWindows(windowId, arg.data);
      } else if (arg.messageType === AsyncMessageType.EditEndpointAddress) {
        const p = this.managerWindowHandler.closeAllWindowsWithCheck(new ShutdownInfo(false, false));
        p.then(notDirty => {
          if (notDirty) {
            this.managerWindowHandler.loadEndpointConfigurePageOnMainManagerWindow();
            // Note: after the endpoint is saved, the Flex Client will be reload in the main manager.
          }
        });
        return p;
      } else {
        this.traceService.error(`WindowMessageService: Message type not implemented: ${arg.messageType}`);
        return new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve('Message type not implemented');
          }, 10);
        });
      }

    });

    ipcMain.on('child-renderer-to-main-message-channel', (event: IpcMainEvent, arg: MainMessage | RendererMessage) => {
      // Important: The browser window id of the sender must be retrieved as follows! Do not use event.sender.id as this is a webContents Id
      const windowId = BrowserWindow.fromWebContents(event.sender)!.id;

      this.traceService.info(
        `WindowMessageService: Message from child window id=${windowId};
        messageType=${arg.messageType};
        data=${JSON.stringify(arg.data)}`);

      if (arg.messageType === MessageType.CommunicationChannelReady) {
        // not needed for child windows:
        // this.managerWindowHandler.setCommunicationChannelReady(windowId);
      } else if (arg.messageType === MessageType.ViewCertificate) {
        const win = BrowserWindow.fromId(windowId);
        this.certificateHelper.showServerHostCertificate(arg.data, win!);
      } else if (arg.messageType === MessageType.ImportCertificate) {
        const win = BrowserWindow.fromId(windowId);
        this.certificateHelper.importCertificate(win!, this.certificateHelper.getServerHostCertificate(arg.data)!);
      } else if (arg.messageType === MessageType.AcceptCertificateAndReload) {
        // certificate error accepted, user wants to proceed
        this.certificateHelper.acceptServerHostCertificate(arg.data.hostUrl, true, arg.data.persistAcceptance);
        // reload the target content into the child window again
        this.managerWindowHandler.getOpenWindowHandler().reloadChildWindow(windowId);
      } else if (arg.messageType === MessageType.DenyCertificateAndClose) {
        // certificate error not accepted, close the child window
        this.certificateHelper.acceptServerHostCertificate(arg.data, false);
        this.managerWindowHandler.getOpenWindowHandler().closeChildWindow(windowId);
      } else if (arg.messageType === MessageType.ReloadChildWindow) {
        this.managerWindowHandler.getOpenWindowHandler().reloadChildWindow(windowId);
      } else if (arg.messageType === MessageType.CloseChildWindow) {
        this.managerWindowHandler.getOpenWindowHandler().closeChildWindow(windowId);
      } else if (arg.messageType === MessageType.SetActiveLanguage) {
        this.managerWindowHandler.appInfo!.activeLanguage = arg.data;
      } else {
        this.traceService.error(`WindowMessageService: Message type not implemented: ${arg.messageType}`);
      }
    });

    ipcMain.on('synch-child-renderer-to-main-message-channel', (event: IpcMainEvent, arg: MainMessage) => {
      // Important: The browser window id of the sender must be retrieved as follows! Do not use event.sender.id as this is a webContents Id
      const windowId = BrowserWindow.fromWebContents(event.sender)!.id;

      this.traceService.info(
        `WindowMessageService: Synch message from child window id=${windowId};
        messageType=${arg.messageType};
        data=${JSON.stringify(arg.data)}`);

      let msgReturnValue: any;
      if (arg.messageType === SyncMessageType.GetAppInfo) {
        msgReturnValue = this.managerWindowHandler.appInfo;
        event.returnValue = msgReturnValue;
      } else if (arg.messageType === SyncMessageType.GetCurrentCertificateError) {
        event.returnValue = this.certificateHelper.getCertificateErrorInfo(windowId);
      } else if (arg.messageType === SyncMessageType.GetCurrentConnectionError) {
        event.returnValue = this.managerWindowHandler.getOpenWindowHandler().getConnectionErrorInfo(windowId);
      } else if (arg.messageType === SyncMessageType.GetBrandInfo) {
        event.returnValue = new BrandInfo(this.brand.getBrandName(), this.brand.getBrandDisplayName(), this.brand.getLandingImage());
      } else {
        this.traceService.error(`WindowMessageService: Message type not implemented: ${arg.messageType}`);
        msgReturnValue = undefined;
        event.returnValue = undefined;
      }

      this.traceService.info(
        `WindowMessageService: Returned data for synch message from child window id=${windowId};
        messageType=${arg.messageType};
        returnValue=${JSON.stringify(msgReturnValue)}`);
    });
  }

  public saveCurrentMultiMonitorConfiguration(config: MultiMonitorConfiguration): void {
    if (this.managerWindowHandler.mainMangerWindow !== undefined) {
      const configInfo: MultiMonitorConfigurationInfo = { clientId: this.getClientIdentifier(), configuration: config};
      this.sendToRenderer(this.managerWindowHandler.mainMangerWindow,
        new MainMessage(MessageType.CurrentMmConfigurationChanged,  configInfo));
    }
  }

  public saveDefaultMultiMonitorConfiguration(config: MultiMonitorConfiguration): void {
    if (this.managerWindowHandler.mainMangerWindow !== undefined) {
      const configInfo: MultiMonitorConfigurationInfo = { clientId: this.getClientIdentifier(), configuration: config};
      this.sendToRenderer(this.managerWindowHandler.mainMangerWindow,
        new MainMessage(MessageType.DefaultMmConfigurationChanged, configInfo));
    }
  }

  public sendManagerInfo(windowId: string, managerInfo: ManagerInfo): void {
    const browserWinId = this.managerWindowHandler.getBrowserWindowIdFromConfigId(windowId);
    const win = this.managerWindowHandler.getBrowserManagerWindow(browserWinId!);
    if (win !== undefined) {
      this.sendToRenderer(win, new MainMessage(MessageType.ManagerInfoCurrentConfigurationChanged, managerInfo));
    }
  }

  public sendHistoryState(windowId: number, canGoBack: boolean, canGoFwd: boolean): void {
    const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
    if (win !== undefined) {
      this.sendToRenderer(win, new MainMessage(MessageType.HistoryStateUpdate, new HistoryUpdateInfo(canGoBack, canGoFwd)));
    }
  }

  public sendFocusState(windowId: number, focus: boolean): void {
    const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
    if (win !== undefined) {
      this.sendToRenderer(win, new MainMessage(MessageType.Focus, focus));
    }
  }


  public showBackDrop(windowId: number, showBdInfo: ShowBackDropInfo): void {
    const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
    if (win !== undefined) {
      this.sendToRenderer(win, new MainMessage(MessageType.ShowBackDrop, showBdInfo));
    }
  }

  /**
   * Asks the window (running Flex Cient) if it can be closed.
   * The window (Flex Client) typically checks if there is unsaved data.
   *
   * @param {number} windowId
   * @returns {Promise<boolean>}
   * @memberof WindowMessageService
   */
  public canWindowBeClosed(windowId: number): Promise<boolean> {
    this.traceService.info(`WindowMessageService.canWindowBeClosed(): windowId=${windowId}`);

    const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);

    if (win !== undefined) {
      const p = new Promise<boolean>((resolve) => {
        const ctxId = WindowMessageService.contextIdCounter++;

        const listener = (info: WindowCloseInfo) => {
          if (info.contextId === ctxId) {
            this.traceService.info(`WindowMessageService.canWindowBeClosed(): Async reply for windowId=${windowId}, canWindowBeClosed=${info.canWindowBeClosed}`);
            resolve(info.canWindowBeClosed);
            this.unSubscribeForCanWindowBeClosedReply(listener);
          }
        }
        this.subscribeForCanWindowBeClosedReply(listener);
        this.sendToRenderer(win, new MainMessage(AsyncMessageType.CanWindowBeClosed, new WindowCloseInfo(ctxId)));
      });
      return p;
    } else {
      throw Error(`Argument window id is invalid: ${windowId}`);
    }
  }

  private getClientIdentifier(): ClientIdentifier {
    const clientId: ClientIdentifier = { clientId: this.clientIdentification!.id, hostName: this.clientIdentification!.hostName };
    return clientId;
  }

  private sendTrace(traceType: TraceType, message: string, ...optionalParams: any[]): void {
    if (this.managerWindowHandler.mainMangerWindow != undefined) {
      if (this.managerWindowHandler.isReadyToCommunicate(this.managerWindowHandler.mainMangerWindow.id) && (this.managerWindowHandler.isFlexClientLoadedOnMainWindow())) {
        this.sendToRenderer(this.managerWindowHandler.mainMangerWindow,
          new MainMessage(MessageType.SendTrace, { traceType, message, optionalParams: [...optionalParams] } ));
      }
    }
  }

  private sendEvent(windowId: number, data: any): void {
    const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
    if (win !== undefined) {
      this.sendToRenderer(win, new MainMessage(MessageType.SendEvent, data));
      win.focus();
    }
  }

  private sendObject(windowId: number, data: any): void {
    const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
    if (win !== undefined) {
      if (win.isMinimized()) {
        win.restore();
      }
      this.sendToRenderer(win, new MainMessage(MessageType.SendObjectToWindow, data));
      win.focus();
    }
  }

  private sendObjectToAllWindows(data: any): void {
    this.managerWindowHandler.getAllWindows().forEach(win => {
      if (win !== undefined) {
        this.sendToRenderer(win, new MainMessage(MessageType.SendObjectToWindow, data));
      }
    });
  }

  private synchronizeToWindows(senderWindowId: number, data: any): void {
    let newStateData: any = {};
    const incomingState: any = data.state;
    const previousState: any = this.managerWindowHandler.uiSyncState;

    for (const property in incomingState) {
      if (typeof previousState === 'undefined') {
        newStateData[property] = incomingState[property];
      } else if ((typeof previousState[property] !== 'undefined' && typeof incomingState[property] !== 'undefined')
      || JSON.stringify(incomingState[property] !== JSON.stringify(previousState[property]))) {
        newStateData[property] = incomingState[property];
      }
    }
    newStateData = {
      ...previousState,
      ...newStateData
    };
    this.managerWindowHandler.uiSyncState = newStateData;

    if (this.managerWindowHandler.mainMangerWindow!.id !== senderWindowId) {
      this.synchronizeToWindow(this.managerWindowHandler.mainMangerWindow!.id, data);
    }
    this.managerWindowHandler.additionalManagerWindows.forEach(win => {
      if (data.sendToItself || win.id !== senderWindowId) {
        this.synchronizeToWindow(win.id, data);
      }
    });

    if ((this.managerWindowHandler!.uiSyncState?.themeType !== undefined) && (previousState?.themeType !== this.managerWindowHandler!.uiSyncState?.themeType)) {
      this.managerWindowHandler!.applyNativeTheme(this.managerWindowHandler!.uiSyncState?.themeType);
    }
  }

  private synchronizeToWindow(windowId: number, data: any): void {
    const win = this.managerWindowHandler.getBrowserManagerWindow(windowId);
    if (win !== undefined) {
      this.sendToRenderer(win, new MainMessage(MessageType.SynchronizeUiState, data));
    }
  }

  private sendToRenderer(window: BrowserWindow, message: MainMessage | RendererMessage): void {
    window.webContents.send('main-to-renderer-message-channel', message);
  }

  private testEndpoint(address: string): void {
    const req = https.get(address, (res) => {
      console.log(`statusCode: ${res.statusCode}`)

      res.on('data', d => {
        process.stdout.write(d)
      });
    });

    req.on('error', error => {
      console.error(error)
    });

    req.end();
  }

  private saveEndpointAddress(address: string): void {
    const endpointFile = new EndpointFile(this.traceService);
    endpointFile.write(address);
  }

  private readEndpointAddress(): string | undefined {
    const endpointFile = new EndpointFile(this.traceService);
    return endpointFile.read();
  }

  private readDownloadedEndpointAddress(): string | undefined {
    return (new ProductSettingsFile()).read()?.flexClientAddress;
  }
}
