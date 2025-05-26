import { app,  BrowserWindow,  Certificate, dialog } from 'electron';
import * as childProcess from 'child_process';
import * as process from 'process';
import { CertificateConfigurationFile } from './certificate-configuration-file';
import { MainTraceService } from '../tracing/main-trace-service';
import { CertificateErrorInfo } from '../messaging/window-message.data';

const showCertificateDialogExe = 'dist/desktop-win/certificate-dialog/certificate-dialog.exe';

export enum CertificateErrorResult {
  Accepted = 'accepted',
  NotAccepted = 'not-accepted',
  ShowConfirmation = 'show-confirmation',
  ShowConfirmationPending = 'show-confirmation-pending'
}

export enum CertificateAcceptance {
  Accepted = 'accepted',
  NotAccepted = 'not-accepted',
  Pending = 'pending'
}

export class CertificateHelper {

  private serverHostCertificates: Map<string, Certificate | undefined> = new Map<string, Certificate | undefined>();
  private serverHostUrlAccepted: Map<string, boolean | undefined> = new Map<string, boolean | undefined>();
  private serverHostUrlBrowserWinId: Map<string, number> = new Map<string, number>();

  constructor(private traceService: MainTraceService) {
    const certConfigFile = new CertificateConfigurationFile(traceService);
    const certificateConfig = certConfigFile.read();
    if (certificateConfig !== undefined) {
      certificateConfig.serverHostUrlAccepted.forEach(url => {
        this.serverHostUrlAccepted.set(url, true);
        this.serverHostCertificates.set(url, undefined)
      });
    }
  }

  public getCertificateErrorInfo(bWinId: number): CertificateErrorInfo | undefined {
    let hostUrl: string | undefined = undefined;
    this.serverHostUrlBrowserWinId.forEach((value, key) => {
      if (value === bWinId) {
        hostUrl = key;
      }
    });
    if (hostUrl !== undefined) {
      return new CertificateErrorInfo(
        hostUrl,
        this.getServerHostCertificate(hostUrl)!.subjectName,
        this.getServerHostCertificate(hostUrl)!.serialNumber);
    } else {
      return undefined;
    }
  }

  public getServerHostCertificate(hostUrl: string): Certificate | undefined {
    return this.serverHostCertificates.get(hostUrl);
  }

  public acceptServerHostCertificate(hostUrl: string, accept: boolean = true, peristAcceptance: boolean = false): void {
    if (this.serverHostUrlAccepted.has(hostUrl)) {
      this.serverHostUrlAccepted.set(hostUrl, accept);
      if ((accept) && (peristAcceptance)) {
        const certConfig = new CertificateConfigurationFile(this.traceService);
        certConfig.writeAcceptedHostUrl(hostUrl);
      }
    }
  }

  public showServerHostCertificate(hostUrl: string, win?: BrowserWindow): void {
    if (this.serverHostCertificates.has(hostUrl)) {
      const pemMod = this.preparePemForNet(this.serverHostCertificates.get(hostUrl)!.data);
      this.showCertificateInt(pemMod, win);
    }
  }

  public importCertificate(mainWindow: BrowserWindow, certificate: Certificate): void {
    // import the certificate into the trusted store
    dialog.showCertificateTrustDialog(mainWindow, { certificate: certificate, message: 'TestTest' }).then(() => {
      this.traceService.info('certificate import; showCertificateTrustDialog closed');
      // import dialog closed, however we do not know if the certificate got imported or not.
      app.relaunch();
      app.exit();
    });
  }

  public showCertificate(certificate: Certificate, win?: BrowserWindow): void {
    let pemMod = this.preparePemForNet(certificate.data);
    this.showCertificateInt(pemMod, win);
  }

  public handleServerCertificateErrorEvent(url: string, certificate: Electron.Certificate, bWinId: number, error: string): CertificateErrorResult {
    const serverUrl = new URL(url);
    if (this.isServerHostCertificateHandled(serverUrl.host, certificate, bWinId)) {
      if (this.serverHostCertificateAcceptance(serverUrl.host) === CertificateAcceptance.Accepted) {
        // certificate error already accepted for this host
        // console.info(`certificate-error: accepted for this host; url=${url}`);
        return CertificateErrorResult.Accepted;
      } else if (this.serverHostCertificateAcceptance(serverUrl.host) === CertificateAcceptance.Pending) {
        this.traceService.info(`CertificateHelper.handleServerCertificateErrorEvent(): error confirmation pending; url=${url}, error=${error}`);
        return CertificateErrorResult.ShowConfirmationPending;
      } else {
        this.traceService.info(`CertificateHelper.handleServerCertificateErrorEvent(): error not accepted for this host; close child window, url=${url}, error=${error}`);
        return CertificateErrorResult.NotAccepted;
      }
    } else {
      this.traceService.info(`CertificateHelper.handleServerCertificateErrorEvent(): error occurred first time for this origin:
      url=${url}, error=${error}`);

      this.storeServerHostCertificate(serverUrl.host, certificate, bWinId);
      return CertificateErrorResult.ShowConfirmation;
    }
  }

  public cleanupServerCertificateUrl(url: string): void {
    const serverUrl = new URL(url);
    const hostUrl = serverUrl.host;
    this.cleanupServerCertificateHost(hostUrl);
  }

  public cleanupAllServerCertificateUrls(): void {
    let keys: string[] = [];
    this.serverHostUrlAccepted.forEach((_value, key) => {
      keys.push(key);
    });
    keys.forEach(key => this.cleanupServerCertificateHost(key));
  }

  private cleanupServerCertificateHost(host: string): void {
    if (this.serverHostUrlAccepted.has(host)) {
      const result = this.serverHostUrlAccepted.get(host);
      // Note:
      // We do not delete whenever the certificate got accepted
      // We delete whenever the certificate got denied or answer is pending.
      if ((result === undefined) || (result === false)) {
        this.serverHostUrlAccepted.delete(host);
        this.serverHostCertificates.delete(host);
        this.serverHostUrlBrowserWinId.delete(host);
      }
    }
  }

  private isServerHostCertificateHandled(hostUrl: string, certificate: Certificate, bWinId: number): boolean {
    if (this.serverHostCertificates.has(hostUrl)) {
      // must be set, as the certificate may have been accepted at a earlier session (being stored int the configuration file)
      this.serverHostCertificates.set(hostUrl, certificate);
      this.serverHostUrlBrowserWinId.set(hostUrl, bWinId);
      return true;
    } else {
      return false;
    }
  }

  private serverHostCertificateAcceptance(hostUrl: string): CertificateAcceptance {
    if (this.serverHostUrlAccepted.has(hostUrl)) {
      if (this.serverHostUrlAccepted.get(hostUrl) === true) {
        return CertificateAcceptance.Accepted;
      } else if (this.serverHostUrlAccepted.get(hostUrl) === undefined) {
        return CertificateAcceptance.Pending;
      } else {
        return CertificateAcceptance.NotAccepted;
      }
    } else {
      return CertificateAcceptance.NotAccepted;
    }
  }

  private storeServerHostCertificate(hostUrl: string, certificate: Certificate, bWinId: number): void {
    this.serverHostCertificates.set(hostUrl, certificate);
    this.serverHostUrlAccepted.set(hostUrl, undefined);
    this.serverHostUrlBrowserWinId.set(hostUrl, bWinId);
  }

  private showCertificateInt(pemData: string, window?: BrowserWindow): void {
    if (process.platform === 'win32') {
      this.showCertificateWin(pemData, window);
    } else {
      dialog.showMessageBoxSync(window!, {
        message: 'Display of the certificate is not possible.',
        type: 'error',
        title: 'Show certificate error',
        detail: `Showing the certificate on your OS is not yet possible.`
      });
    }
  }

  private showCertificateWin(pemData: string, window?: BrowserWindow): void {
    const winHandle = window?.getNativeWindowHandle();
    const winHandleStr = winHandle?.readBigUInt64LE().toString();
    let child: childProcess.ChildProcess;
    if (winHandleStr !== undefined) {
      child = childProcess.execFile(showCertificateDialogExe, [pemData, winHandleStr],  (error: any, stdout: string, stderr: string) => {
        this.traceService.info(`showCertificateInt(), execFile() called, stdout=${stdout}, stderr=${stderr}, error=${error}`);
      });
    } else {
      child = childProcess.execFile(showCertificateDialogExe, [pemData],  (error: any, stdout: string, stderr: string) => {
        this.traceService.info(`showCertificateInt(), execFile() called, stdout=${stdout}, stderr=${stderr}, error=${error.message}`);
      });
    }

    child.on('close', (exitCode, signal) => {
      this.traceService.info(`showCertificateInt(), close event called, exitCode=${exitCode}, signal=${signal}`);
      if (exitCode !== 0) {
        dialog.showMessageBoxSync(window!, {
          message: 'Display of the certificate is not possible.',
          type: 'error',
          title: 'Show certificate error',
          detail: `Check that .NET Runtime 6 or higher is installed.\n\nError code: ${exitCode}`
        });
      }
    });
    child.on('error', (error) => {
      this.traceService.error(`showCertificateInt(), error event called, error=${error}`);
    });
    child.on('exit', (exitCode, signal) => {
      this.traceService.info(`showCertificateInt(), exit event called, exitCode=${exitCode}, signal=${signal}`);
    });
    child.on('spawn', () => {
      this.traceService.info('showCertificateInt(), spawn event called, process started succesfully.');
    });
  }

  private preparePemForNet(pemElectron: string): string {
    let pemMod = pemElectron.replace('-----BEGIN CERTIFICATE-----', '');
    pemMod = pemMod.replace('-----END CERTIFICATE-----', '');
    pemMod = pemMod.replace(/\n/g, '');
    return pemMod;
  }
}
