import { Injectable } from '@angular/core';
import { BrowserObject, ManagerInfo, MultiMonitorServiceBase } from '@gms-flex/services';
import { TranslateService } from '@ngx-translate/core';
import { ThemeType } from '@simpl/element-ng';
import { CaptureWindowRequestInfo, ElectronThemeType, MultiMonitorConfigurationInfo, SynchData } from 'desktop-main/src/messaging/window-message.data';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { Observable } from 'rxjs';
import { WindowCaptureListComponent } from 'src/app/window-list/window-capture-list.component';

import { DesktopMessageService } from '../messaging/desktop-message.service';

export const themeTypeAuto: ThemeType = 'auto';
export const themeTypeSystem: ElectronThemeType = 'system';

@Injectable()
export class MultiMonitorService implements MultiMonitorServiceBase {
  private windowsDialogTitle = '';

  constructor(
    private readonly desktopMessageService: DesktopMessageService,
    private readonly modalService: BsModalService,
    private readonly translationService: TranslateService) {
    this.translationService.get('DESKTOP.SEND_TO_WINDOW_DLG_TITLE').subscribe(title => this.windowsDialogTitle = title);
  }

  public get runsInElectron(): boolean {
    return this.desktopMessageService.runsInElectron;
  }

  /**
   * Returns true, if the manager invoking it is the main manager.
   */
  public isMainManager(): boolean | undefined {
    return this.desktopMessageService.isMainManager();
  }

  public async isSingleSystemManager(): Promise<boolean | undefined> {
    const requestInfo: CaptureWindowRequestInfo = { includeOwnWindow: false, includeThumbnail: false, includeDetachedEvent: false };

    const windows = await this.desktopMessageService.captureWindows(requestInfo);

    return windows?.length > 0;
  }

  public onCurrentMultiMonitorConfigurationChanged(): Observable<MultiMonitorConfigurationInfo> {
    return this.desktopMessageService.onCurrentMultiMonitorConfigurationChanged;
  }

  public onCurrentManagerConfigurationChanged(): Observable<ManagerInfo> {
    return this.desktopMessageService.onCurrentManagerConfigurationChanged;
  }

  /**
   * Returns true, if the manager invoking it is the a manager with the event list.
   */
  public isManagerWithEvent(): boolean | undefined {
    return this.desktopMessageService.isManagerWithEvent();
  }

  public isCurrentMultiMonitorConfigurationChangeAllowed(): boolean | undefined {
    return this.desktopMessageService.isCurrentMultiMonitorConfigurationChangeAllowed();
  }

  public saveCurrentConfigurationAsDefault(overruleAllowed: boolean): void {
    this.desktopMessageService.saveCurrentConfigurationAsDefault(overruleAllowed);
  }

  public resetToDefaultConfiguration(): Promise<boolean> {
    return this.desktopMessageService.resetToDefaultConfiguration();
  }

  public sendEvent(eventToSend: any): void {
    this.desktopMessageService.sendEvent(eventToSend);
  }

  public sendObjectToWindow(objectToSend: any): void {
    this.showCapturedWindowsDialog(objectToSend);
  }

  public sendObjectToAllWindows(objectToSend: any): void {
    this.desktopMessageService.sendObjectToAllWindows(objectToSend);
  }

  public sendObjectToMainManager(objectToSend: any): void {
    this.desktopMessageService.sendObjectToMainManager(objectToSend);
  }

  public sendObject(webContentsId: number, data: any): void {
    this.desktopMessageService.sendObject(webContentsId, data);
  }

  public synchronizeUiState(state: any): void {
    const syncData = state as SynchData;
    if ((syncData.state.themeType !== undefined) && (syncData.state.themeType as ThemeType === themeTypeAuto)) {
      syncData.state.themeType = themeTypeSystem;
    }
    this.desktopMessageService.synchronizeUiState(syncData);
  }

  public startAdditionalSystemManager(): void {
    this.desktopMessageService.startAdditionalSystemManager();
  }

  public detachEventManager(initialUrl?: string): void {
    this.desktopMessageService.detachEventManager(initialUrl);
  }

  public resumeEventManager(initialUrl?: string): void {
    this.desktopMessageService.resumeEventManager(initialUrl);
  }

  public isDefaultMultiMonitorConfigurationChangeAllowed(): boolean | undefined {
    return this.desktopMessageService.isDefaultMultiMonitorConfigurationChangeAllowed();
  }

  public synchronizeWithUserSettings(): boolean {
    if (this.isMainManager()) {
      return this.desktopMessageService.isUserConfigurationChangeAllowed();
    } else {
      return false;
    }
  }

  public matchCommunicationRules(node: BrowserObject): number | undefined {
    if (this.runsInElectron) {
      return this.desktopMessageService.matchCommunicationRules(node);
    } else {
      return undefined;
    }
  }

  public setStartupNode(designation: string): void {
    this.desktopMessageService.setStartupNode(designation);
  }

  public getStartupNode(): string | undefined {
    return this.desktopMessageService.getCurrentManagerConfiguration()?.managerDefinition.startupNode;
  }

  public setActiveLayout(frameId: string, viewId: string, layoutId: string): void {
    this.desktopMessageService.setActiveLayout(frameId, viewId, layoutId);
  }

  public getActiveLayout(frameId: string, viewId: string): string | undefined {
    return this.desktopMessageService.getActiveLayout(frameId, viewId);
  }

  private showCapturedWindowsDialog(objectToSend: any): void {
    const initialState: ModalOptions = {
      initialState: {},
      ignoreBackdropClick: false,
      keyboard: false,
      animated: true
    };
    initialState.initialState['heading'] = this.windowsDialogTitle; // eslint-disable-line
    initialState.initialState['message'] = ''; // eslint-disable-line

    const modalRef = this.modalService.show(WindowCaptureListComponent, initialState);
    const subscription = (modalRef.content as WindowCaptureListComponent).closed.subscribe(() => {
      modalRef.hide();
      subscription.unsubscribe();
    });

    const subscriptionWdw = (modalRef.content as WindowCaptureListComponent).windowClicked.subscribe(webContentsId => {
      if (this.desktopMessageService.runsInElectron) {
        this.desktopMessageService.sendObject(webContentsId, objectToSend);
      }
      subscriptionWdw.unsubscribe();
    });
  }

}
