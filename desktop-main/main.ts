import {app, BrowserWindow, nativeTheme, screen } from 'electron';
import { WindowMessageService } from './src/messaging/window-message.service';
import { MultiMonitorConfigurationHandler } from './src/multi-monitor/multi-monitor-configuration-handler';
import { WindowHandler } from './src/multi-monitor/window-handler';
import { MainTraceService } from './src/tracing/main-trace-service';
import { CertificateHelper } from './src/certificate/certificate-helper';

import * as path from 'path';
import * as process from 'process';
import * as fs from 'fs';
import * as os from 'os';
import { EndpointFile, localConfigFolder } from './src/endpoint/endpoint-file';
import { ClientIdFile } from './src/client-id/client-id-file';
import { ClientCertificateWindow } from './src/certificate/client-certificate-window';
import { CertificateConfigurationFile } from './src/certificate/certificate-configuration-file';
import { ClientUpdater } from './src/update/client-updater';
import { WsiService } from './src/messaging/wsi.service';
import { ProductSettingsFile } from './src/endpoint/product-settings-file';
import { closedMode } from './src/config';
import { AppInfo, ShowBackDropInfo, ShowBackDropReason } from './src/messaging/window-message.data';
import { GmsBrand } from './src/brand/gms-brand';

// app.commandLine.appendSwitch('lang', 'de');

let startupTraces: string[] = [];
const handleCwd = () => {
  startupTraces.push(`Main(): Desktop application starting...
    Current process execution path (process.execPath): ${process.execPath}
    Current process working directory (process.cwd): ${process.cwd()}`);
  if (app.isPackaged) {
    if (path.dirname(process.execPath) !== process.cwd()) {
      // Note: This got happen whenever the Flex Client was startup via the installer.
      // The cwd was set then to: 'C:/Windows/System32)
      // This results in 'wrong' resolutions of relative paths when using the Path or the FileSystem API
      process.chdir(path.dirname(process.execPath));
      startupTraces.push(`Main(): CWD changed due to startup via installer:
        Current process working directory (process.cwd): ${process.cwd()}`);
    }
  }
}

handleCwd();
let traceService = new MainTraceService();
let wsiService = new WsiService(traceService);
let brand = new GmsBrand(traceService);
let configurationHandler = new MultiMonitorConfigurationHandler(traceService);
let certificateHelper = new CertificateHelper(traceService);
let managerWindowHandler = new WindowHandler(configurationHandler, wsiService, certificateHelper, traceService);
let clientCertificatesWindow = new ClientCertificateWindow(traceService);
let endpointFile = new EndpointFile(traceService);
let clientIdFile = new ClientIdFile(traceService);
let clientUpdater = new ClientUpdater(managerWindowHandler, traceService);
let windowMessageService = new WindowMessageService(
  managerWindowHandler,
  configurationHandler,
  certificateHelper,
  clientCertificatesWindow,
  clientUpdater,
  wsiService,
  brand,
  traceService
);
managerWindowHandler.inject(windowMessageService);

const singleAppLock = app.requestSingleInstanceLock();
if (singleAppLock === false) {
  app.quit();
} else {
  // got the lock, this is the first instance
  app.on('second-instance', (_event, _commandLine, _workingDirectory, _additionalData) => {
    traceService.info('Main(): Second instance started. Bring first instance to foreground/focus.');
    managerWindowHandler.restoreAndFocusAllWindows();
  });

  app.whenReady().then(() => {
    if(app.isPackaged) {
      try {
        app.setAppLogsPath(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, 'logs'));
        const output = fs.createWriteStream(app.getPath('logs') + '/stdout.log');
        const errorOutput = fs.createWriteStream(app.getPath('logs') + '/stderr.log')
        console = new console.Console({ stdout: output, stderr: errorOutput });
      } catch (error) {
        traceService.info('Main(): Desktop application starting, redirecting the console output to file failed...');
      }
      startupTraces.forEach(item => traceService.info(item));
    }
    traceService.info('Main(): Desktop application starting, app ready, initiating now the autoUpdater, windows and communication...');

    clientIdFile.init();
    clientUpdater.init();
    managerWindowHandler.appInfo = new AppInfo(app.getLocale());
    managerWindowHandler.newMainManagerWindow();
    windowMessageService.initIpc();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        managerWindowHandler.newMainManagerWindow();
      }
    });

    app.on('before-quit', () => {
      if (clientUpdater.installOnUserAppClose) {
        traceService.info(`Main(): app.before-quit event called: installing the update`);
        clientUpdater.quitAndInstall();
      } else {
        traceService.info(`Main(): app.before-quit event called: no update to install`);
      }
    });

    app.on('will-quit', () => {
      traceService.info(`Main(): app.will-quit event called`);
    });

    app.on('quit', () => {
      traceService.info(`Main(): app.quit event called`);
    });

    traceStartupInfo();

    if(app.isPackaged === false) {
      // Open the DevTools.
      managerWindowHandler.mainMangerWindow!.webContents.openDevTools();
    }

    traceService.info('Main(): Desktop application started and ready!');
  });

  app.on('select-client-certificate', (event, webContents, url, certificateList: Electron.Certificate[], callback) => {
    // Remark: Electron does not show any certificate selection dialog in case the certificate list contains only one certificate.
    // Due to this, the user is forced to enter his PIN/PWD even if he does not want to transmit the client certificate as the server does not really need it.
    // If the user aborts entering the PIN/PWD, the application will not connect to the backend.
    // Thus, we show here a modal 'dialog' first, in order that the user can decide if he wants/needs to transmit the client certificate and which one.

    const isFromMainManager = (managerWindowHandler.mainMangerWindow!.webContents.id === webContents.id);

    traceService.info(`Main(): app.select-client-certificate event:
      url=${url};
      isfromMainManager=${isFromMainManager};
      commonNames=${certificateList.map(value => value.subjectName).join("; ")}`);

    if (certificateList.length >= 1) {
      const certConfigFile = new CertificateConfigurationFile(traceService);
      const certConfig = certConfigFile.read();
      let foundCertificate: Electron.Certificate | undefined;
      let clientCertificateSelectionDisabled = false;
      if (certConfig !== undefined) {
        foundCertificate = certificateList.find(element => {
          return (clientCertificatesWindow.createKey1(element) === certConfig.selectedClientCertificate);
        });
        clientCertificateSelectionDisabled = certConfigFile.isClientCertifcateSelectionDisabled();
      }

      event.preventDefault();
      if (clientCertificateSelectionDisabled) {
        callback();
      } else if (foundCertificate !== undefined) {
        callback(foundCertificate);
      } else if (!isFromMainManager) {
        traceService.info('Main(): app.select-client-certificate event: Not from main manager, client identification on child windows is not supported!');
        callback();
      } else {
        if (clientUpdater.isUpdateDialogShown()) {
          clientUpdater.getDialogResult(closingApp => {
            if (!closingApp) {
              windowMessageService.showBackDrop(managerWindowHandler.mainMangerWindow!.id, new ShowBackDropInfo(true, ShowBackDropReason.None));
              clientCertificatesWindow.showWindow(managerWindowHandler.mainMangerWindow!, url, certificateList, callback);
            }
          });
        } else {
          if (!clientCertificatesWindow.isWindowShown()) {
            windowMessageService.showBackDrop(managerWindowHandler.mainMangerWindow!.id, new ShowBackDropInfo(true, ShowBackDropReason.None));
            clientCertificatesWindow.showWindow(managerWindowHandler.mainMangerWindow!, url, certificateList, callback);
          } else {
            traceService.info('Main(): app.select-client-certificate event: Certificate window already shown! Register callback only.');
            clientCertificatesWindow.registerCallback(callback);
          }
        }
      }
    } else {
      // certificateList contains zero entries, no need for a dialog
      traceService.info('Main(): app.select-client-certificate event: certificateList contains zero entries');
      event.preventDefault();
      callback();
    }
  });
}

nativeTheme.on('updated', () => {
  traceService.info(`Main(): nativeTheme.on() update event called; shouldUseDarkColors=${nativeTheme.shouldUseDarkColors}`);
  managerWindowHandler.updateTitleBarOverlay();
});

const traceStartupInfo = () => {
  const clientId = clientIdFile.read();
  traceService.info(`Main(): Application startup info:
    Node version: ${process.versions['node']}
    Electron version: ${process.versions['electron']}
    Chrome version: ${process.versions['chrome']}
    Platfrom: ${process.platform}
    app.name: ${app.name}
    app.getVersion(): ${app.getVersion()}
    app.getAppPath(): ${app.getAppPath()}
    app.getPath('exe'): ${app.getPath('exe')}
    process.execPath: ${process.execPath}
    process.cwd: ${process.cwd()}
    os.userInfo: ${JSON.stringify(os.userInfo())}
    ALLUSERSPROFILE env variable: ${process.env.ALLUSERSPROFILE}
    ProgramData env variable: ${process.env.ProgramData}
    APPDATA env variable: ${process.env.APPDATA}
    USERNAME env variable: ${process.env.USERNAME}
    Logs path: ${app.getPath('logs')}
    Endpoint configured: ${endpointFile.read()}
    Client identification: id=${clientId?.id}, hostName=${clientId?.hostName}, createDateMs=${clientId?.createDateMs}, createDate=${clientId?.createDate}
    Flex Client address (from product-settings.json): ${(new ProductSettingsFile()).read()?.flexClientAddress}
    Brand set: ${brand.brand.toString()}
    Brand icon set: ${brand.getBrandIcon()}
    Brand display name set: ${brand.getBrandDisplayName()}
    Closed mode command line switch set: ${closedMode()}
    app.getLocale(): ${app.getLocale()}
    app.getLocaleCountryCode(): ${app.getLocaleCountryCode()}
    app.getSystemLocale(): ${app.getSystemLocale()}
    app.getPreferredSystemLanguages(): ${app.getPreferredSystemLanguages().toString()}
    `);

  screen.getAllDisplays().forEach(display => {
    traceService.info(`Main(): Display info of connected displays:
      Display Id: ${display.id},
      BoundsX: ${display.bounds.x}, BoundsY: ${display.bounds.y}, BoundsWidth: ${display.bounds.width}, BoundsHeight: ${display.bounds.height},
      SizeWidth: ${display.size.width}, SizeHeight: ${display.size.height},
      WAreaX: ${display.workArea.x}, WAreaY: ${display.workArea.y}, WAreaWidth: ${display.workArea.width}, WAreaHeight: ${display.workArea.height},
      ScaleFactor: ${display.scaleFactor}`);
  });

};
