import {app } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { EndpointFile } from '../endpoint/endpoint-file';
import { ClientUpdateInfo, ShowBackDropInfo, ShowBackDropReason } from '../messaging/window-message.data';
import { WindowHandler } from '../multi-monitor/window-handler';
import { MainTraceService } from '../tracing/main-trace-service';
import { UpdateInfoWindow } from './update-info-window';

const updateCheckPeriod = 300000; // 5minutes

export class ClientUpdater {

  public installOnUserAppClose = false;
  public reminderForUpdate = false;
  public reminderDelay = 600000; // 10 minutes
  private updateinfoWindow = new UpdateInfoWindow();
  private clientUpdateInfo = new ClientUpdateInfo(app.name, autoUpdater.currentVersion.version,  "", "");
  public callbackDialogClose?: (closingApp: boolean) => void;

  constructor(private windowHandler: WindowHandler, private traceService: MainTraceService) {
    autoUpdater.on('error', (error) => {
      this.traceService.error(`ClientUpdater.on-error() notification: ${error}`);
    });

    autoUpdater.on('checking-for-update', () => {
      this.traceService.info(`ClientUpdater.checking-for-update() notification`);
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.traceService.info(`ClientUpdater.update-available() notification:
      new version: ${info.version},
      releaseDate: ${info.releaseDate},
      file: ${info.files[0].url}`);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.traceService.info(`ClientUpdater.update-not-available() notification:
      current version: ${info.version},
      releaseDate: ${info.releaseDate},
      file: ${info.files[0].url}`);

      // trigger a regular update check
      this.triggerUpdateCheck(updateCheckPeriod);
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.traceService.info(`ClientUpdater.download-progress() notification:
      bytesPerSecond: ${progress.bytesPerSecond},
      percent: ${progress.percent},
      total: ${progress.total}`);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.traceService.info(`ClientUpdater.update-downloaded() notification:
      new version: ${info.version},
      releaseDate: ${info.releaseDate},
      file: ${info.files[0].url}`);

      this.clientUpdateInfo.newVersion = info.version;
      this.clientUpdateInfo.releaseDate = info.releaseDate;
      if (this.windowHandler.isCloseAnyWindowPending() || this.windowHandler.isDirtyCheckWindowsPending()) {
        // no dialog now! check in a minute again
        this.traceService.info(`ClientUpdater.update-downloaded(): windows are being closed or dirty checked => no update dialog now, but 1min later again.`);
        this.triggerUpdateCheck(60000);
      } else {
        this.windowHandler.showBackDrop(this.windowHandler.mainMangerWindow!.id, new ShowBackDropInfo(true, ShowBackDropReason.None));
        this.updateinfoWindow.showWindow(this.windowHandler.mainMangerWindow!);
      }
    });
  }

  public init(): void {
    let feedUrl = '';
    try {
      const endpointFile = new EndpointFile(this.traceService);
      const endpoint = endpointFile.read();
      if (endpoint !== undefined) {
        feedUrl = endpoint + '/desktop';
        autoUpdater.channel = "alpha";
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.allowDowngrade = true;
        autoUpdater.setFeedURL(feedUrl);

        this.traceService.info(`ClientUpdater.init(): Initiating autoUpdater...
        autoUpdater feed URL: ${feedUrl}
        autoUpdater.channel: ${autoUpdater.channel}
        autoUpdater.feedUrl: ${autoUpdater.getFeedURL()}
        autoUpdater.currentVersion: ${autoUpdater.currentVersion}`);

        setTimeout(() => {
          // 1 seconds after app start/init, we check for updates
          this.checkForUpdates();
        }, 1000);
      } else {
        this.traceService.error('ClientUpdater.init(): Undefined endpoint address, autoUpdater cannot be initialized.');
      }
    } catch (error) {
      this.traceService.error('ClientUpdater.init(): Error: ' + error);
    }
  }

  public checkForUpdates(): void {
    this.traceService.info(`ClientUpdater.checkForUpdates(): Invoking check for updates...`);

    autoUpdater.checkForUpdates().then((result) => this.traceService.info(`ClientUpdater.checkForUpdates():
    autoUpdater.checkForUpdates() returned: ${result?.updateInfo.version}`));
  }

  public quitAndInstall(): void {
    this.traceService.info(`ClientUpdater.quitAndInstall() called`);

    // application shall be quited now; installation is started immediate afterwards
    this.installOnUserAppClose = false;
    this.updateinfoWindow.closeWindow();
    this.windowHandler.showBackDrop(this.windowHandler.mainMangerWindow!.id, new ShowBackDropInfo(false, ShowBackDropReason.None));
    if (this.callbackDialogClose !== undefined) {
      this.callbackDialogClose(true);
      this.callbackDialogClose = undefined;
    }

    this.windowHandler.checkAllManagersForDirtyState(ShowBackDropReason.Close).then(notDirty => {
      if (notDirty) {
        this.traceService.info(`ClientUpdater.quitAndInstall(): no window dirty, calling autoUpdater.quitAndInstall()`);
        autoUpdater.quitAndInstall();
      }

      // trigger always a regular update check (in case the 'before-quit' got prevented we still want a later update check)
      this.triggerUpdateCheck(updateCheckPeriod);
    });
  }

  public installOnApplicationClose(): void {
    this.traceService.info(`ClientUpdater.installOnApplicationClose() called`);
    // installation starts when the user closes the application
    this.updateinfoWindow.closeWindow();
    this.windowHandler.showBackDrop(this.windowHandler.mainMangerWindow!.id, new ShowBackDropInfo(false, ShowBackDropReason.None));
    if (this.callbackDialogClose !== undefined) {
      this.callbackDialogClose(false);
      this.callbackDialogClose = undefined;
    }
    this.installOnUserAppClose = true;
  }

  public remindLaterForUpdate(reminderDelay: number): void {
    this.traceService.info(`ClientUpdater.remindLaterForUpdate() called: reminderDelay: ${reminderDelay} ms`)
    this.updateinfoWindow.closeWindow();
    this.windowHandler.showBackDrop(this.windowHandler.mainMangerWindow!.id, new ShowBackDropInfo(false, ShowBackDropReason.None));
    if (this.callbackDialogClose !== undefined) {
      this.callbackDialogClose(false);
      this.callbackDialogClose = undefined;
    }
    this.installOnUserAppClose = false;
    this.reminderDelay = reminderDelay;
    this.reminderForUpdate = true;
    autoUpdater.autoInstallOnAppQuit = false;
    // trigger an addtional update check after the reminder delay
    this.triggerUpdateCheck(this.reminderDelay);
  }

  public doNotInstall(): void {
    this.traceService.info(`ClientUpdater.doNotInstall() called`);
    // no installation wanted
    this.updateinfoWindow.closeWindow();
    this.windowHandler.showBackDrop(this.windowHandler.mainMangerWindow!.id, new ShowBackDropInfo(false, ShowBackDropReason.None));
    if (this.callbackDialogClose !== undefined) {
      this.callbackDialogClose(false);
      this.callbackDialogClose = undefined;
    }
    this.installOnUserAppClose = false;
    autoUpdater.autoInstallOnAppQuit = false;
  }

  public getClientUpdateInfo(): ClientUpdateInfo {
    return this.clientUpdateInfo;
  }

  public isUpdateDialogShown(): boolean {
    return this.updateinfoWindow.isWindowShown();
  }

  public getDialogResult(callback: (closingApp: boolean) => void): void {
    if (callback === undefined) {
      return;
    }

    if (!this.updateinfoWindow.isWindowShown()) {
      callback(false);
    } else {
      this.callbackDialogClose = callback;
    }
  }

  private triggerUpdateCheck(delay: number): void {
    this.traceService.info(`ClientUpdater.triggerUpdateCheck() called: Will invoke check for updates again in ${delay} ms`)

    setTimeout(() => {
      autoUpdater.checkForUpdates().then((result) => this.traceService.info(`ClientUpdater.triggerUpdateCheck():
      autoUpdater.checkForUpdates() returned: ${result?.updateInfo.version}`));
    }, delay);
  }
}
