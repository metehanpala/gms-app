import { Injectable } from '@angular/core';
import {
  AsyncMessageType,
  CertificateErrorInfo,
  ConnectionErrorInfo,
  CertificateInfo,
  MainMessage,
  MessageType,
  RendererMessage,
  SyncMessageType,
  ClientUpdateInfo,
  BrandInfo,
  UserInfo,
  AppInfo,
  SynchData,
  UiState,
  WindowInfo
} from '../../../../../desktop-main/src/messaging/window-message.data';

export const trcModuleNameDesktop = 'gmsApplication_DesktopMain';

@Injectable({ providedIn: 'root' })
export class ElectronUiMessageService {

  constructor() {
    if (this.runsInElectron) {
      this.communicationChannelReady();
    }
  }

  public synchronizeUiState(synchData: SynchData): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.SynchronizeUiState, synchData));
    }
  }

  public getUiSyncState(): UiState {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetUiState));
    }
  }

  public setActiveLanguage(language: string): void {
    if (this.runsInElectron) {
      return this.send(new MainMessage(MessageType.SetActiveLanguage, language));
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
      return this.sendSync(new MainMessage(SyncMessageType.IsClosedModeActive));
    }
  }

  public get runsInElectron(): boolean {
    return (((window as any).electron !== undefined) || ((window as any).electronChildWin !== undefined)) ? true : false;
  }

  public getBrandInfo(): BrandInfo {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetBrandInfo));
    }
  }

  public getWindowInfo(): WindowInfo {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetOwnWindowInfo));
    }
  }

  public getAppInfo(): AppInfo | undefined {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetAppInfo));
    }
  }

  public getClientUpdateInfo(): ClientUpdateInfo | undefined {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetClientUpdateInfo));
    }
  }

  public getClientCertificateInfo(): CertificateInfo[] | undefined {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetClientCertificateInfo));
    }
  }

  public getCurrentConnectionError(): ConnectionErrorInfo | undefined {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetCurrentConnectionError));
    }
  }

  public getCurrentCertificateError(): CertificateErrorInfo | undefined {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.GetCurrentCertificateError));
    }
  }

  public readEndpointAddress(): string | undefined {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.ReadEndpointAddress));
    }
  }

  public readDownloadedEndpointAddress(): string | undefined {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.ReadDownloadedEndpointAddress));
    }
  }

  public saveEndpointAddress(address: string): boolean {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.SaveEndpointAddress, address));
    }
  }

  public setZoom(zoom: number | undefined): number {
    if (this.runsInElectron) {
      return this.sendSync(new MainMessage(SyncMessageType.SetZoom, zoom));
    }
  }

  public clearSecuritySettings(): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.ClearSecuritySettings));
    }
  }

  public quitAndInstall(): void {
    if (this.runsInElectron) {
      return this.send(new MainMessage(MessageType.QuitAndInstallUpdate));
    }
  }

  public remindLater(reminderDelay: number): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.RemindLaterForUpdate, reminderDelay));
    }
  }

  public reloadApplication(): void {
    if (this.runsInElectron) {
      return this.send(new MainMessage(MessageType.ReloadApplication));
    }
  }

  public reloadChildWindow(): void {
    if (this.runsInElectron) {
      return this.send(new MainMessage(MessageType.ReloadChildWindow));
    }
  }

  public closeChildWindow(): void {
    if (this.runsInElectron) {
      return this.send(new MainMessage(MessageType.CloseChildWindow));
    }
  }

  public configureEndpointAddress(): void {
    if (this.runsInElectron) {
      return this.send(new MainMessage(MessageType.ConfigureEndpointAddress));
    }
  }

  public testEndpointAddress(address: string): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.TestEndpointAddress, address));
    }
  }

  public viewCertificate(hostUrl: string): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.ViewCertificate, hostUrl));
    }
  }

  public denyCertificateAndClose(hostUrl: string): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.DenyCertificateAndClose, hostUrl));
    }
  }

  public acceptCertificateAndReload(hostUrl: string, persistAcceptance: boolean): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.AcceptCertificateAndReload, { hostUrl: hostUrl, persistAcceptance: persistAcceptance }));
    }
  }

  /**
   *
   *
   * @param {(CertificateInfo | undefined)} certificateInfo
   * @param {boolean} persistAcceptance
   * @memberof ElectronUiMessageService
   */
  public selectClientCertificateAndCloseDialog(certificateInfo: CertificateInfo | undefined, persistAcceptance: boolean): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.SelectClientCertificateAndCloseDialog, { certificateInfo: certificateInfo, persistAcceptance: persistAcceptance }));
    }
  }

  /**
   * Cancels the client certificate selection. This will close the dialog and shut down the application
   *
   * @param {boolean} persistAcceptance
   * @memberof ElectronUiMessageService
   */
  public cancelClientCertificateSelectionAndCloseApp(): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.CancelClientCertificateSelectionAndCloseApp));
    }
  }

  public viewClientCertificate(certificateInfo: CertificateInfo): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.ViewClientCertificate, { certificateInfo: certificateInfo }));
    }
  }

  public importCertificate(hostUrl: string): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.ImportCertificate, hostUrl));
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
      return this.sendAsync(new MainMessage(AsyncMessageType.EditEndpointAddress));
    }
  }

  public get isChildWindow(): boolean {
    if (this.runsInElectron) {
      return ((window as any).electronChildWin !== undefined)
    }
  }

  private communicationChannelReady(): void {
    if (this.runsInElectron) {
      this.send(new MainMessage(MessageType.CommunicationChannelReady));
    }
  }

  private send(message: MainMessage | RendererMessage): void {
    if (this.runsInElectron) {
      this.mainProcessApi.send(message);
    }
  }

  private sendSync(message: MainMessage): any {
    if (this.runsInElectron) {
      return this.mainProcessApi.sendSyncToMain(message);
    } else {
      return undefined;
    }
  }

  private sendAsync(message: any): Promise<any> {
    if (this.runsInElectron) {
      return this.mainProcessApi.sendAsync(message);
    } else {
      return undefined;
    }
  }

  private get mainProcessApi(): any {
    if ((window as any).electron !== undefined) {
      return (window as any).electron;
    } else {
      return (window as any).electronChildWin;
    }
  }
}
