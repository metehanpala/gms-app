import { app, BrowserWindow, Certificate } from 'electron';
import * as path from 'path';
import { format } from 'url';
import { CertificateInfo } from "../messaging/window-message.data";
import { MainTraceService } from '../tracing/main-trace-service';

export class ClientCertificateWindow {

  private _certificateInfos: CertificateInfo[] = [];
  private certificateMap: Map<string, Certificate> = new Map<string, Certificate>();
  private childWindow: BrowserWindow | undefined;
  //private callback?: (certificate?: Certificate) => void;
  private callbacks: ((certificate?: Certificate) => void)[] = [];

  constructor(private traceService: MainTraceService) {}

  public getWindowHandle(): Buffer | undefined {
    return (this.childWindow !== undefined)? this.childWindow.getNativeWindowHandle(): undefined;
  }

  public getWindow(): BrowserWindow | undefined {
    return this.childWindow;
  }

  public isWindowShown(): boolean {
    return (this.childWindow !== undefined) ? true : false;
  }

  public get certificateInfos(): ReadonlyArray<CertificateInfo> {
    return this._certificateInfos;
  }

  public findCertificate(certificateInfo: CertificateInfo): Certificate | undefined {
    return this.certificateMap.get(this.createKey2(certificateInfo));
  }

  public createKey1(certificate: Certificate): string {
    return this.createKey3(certificate.subjectName, certificate.serialNumber, certificate.fingerprint);
  }

  public createKey2(certificateInfo: CertificateInfo): string {
    return this.createKey3(certificateInfo.subjectName, certificateInfo.serialNumber, certificateInfo.thumbPrint);
  }

  public cancelCertificateSelectionAndClose(): void {
    this.traceService.info('ClientCertificateWindow.cancelCertificateSelectionAndClose(): Cancel certificate selection and close the certificate list view.');

    if (this.callbacks.length > 0) {
      this.callbacks.forEach(callback => callback());
      this.callbacks = [];
    }
    this.childWindow?.close();
  }

  public selectCertificateAndClose(certificateInfo: CertificateInfo | undefined): void {
    if (certificateInfo === undefined) {
      this.traceService.warn('ClientCertificateWindow.selectCertificateAndClose(): No certificate selected, close the the certificate list view');

      if (this.callbacks.length > 0) {
        this.callbacks.forEach(callback => callback());
        this.callbacks = [];
      }
    } else {
      this.traceService.info(`ClientCertificateWindow.selectCertificateAndClose(): Certificate selected, close the certificate list view:
      hostUrl: ${certificateInfo.hostUrl}
      issuerName: ${certificateInfo.issuerName}
      serialNumber: ${certificateInfo.serialNumber}
      subjectName: ${certificateInfo.subjectName}
      thumbPrint: ${certificateInfo.thumbPrint}`);

      const certificate = this.findCertificate(certificateInfo);
      if (certificate !== undefined) {
        if (this.callbacks.length > 0) {
          this.callbacks.forEach(callback => {
            this.traceService.info(`ClientCertificateWindow.selectCertificateAndClose(): Calling callback with certificate:
            subjectName: ${certificate.subjectName}
            issuerName: ${certificate.issuerName}
            serialNumber: ${certificate.serialNumber}`);
            callback(certificate);
          });
          this.callbacks = [];
        }
      } else {
        this.traceService.error('ClientCertificateWindow.selectCertificateAndClose(): No certificate stored, should not land here!');
        if (this.callbacks.length > 0) {
          this.callbacks.forEach(callback => callback());
          this.callbacks = [];
        }
      }
    }

    this.childWindow?.close();
  }

  public registerCallback(callback: (certificate?: Certificate) => void): void {
    this.callbacks.push(callback);
  }

  public showWindow(parent: BrowserWindow, url: string, certificateList: Certificate[], callback: (certificate?: Certificate) => void): void {
    this.traceService.info('ClientCertificateWindow.showWindow(): Show the certificate list view.');

    this.callbacks.push(callback);
    this._certificateInfos = [];
    this.certificateMap.clear();
    certificateList.forEach(element => {
      this._certificateInfos.push(new CertificateInfo(url, element.subjectName, element.issuerName, element.serialNumber, element.fingerprint));
      this.certificateMap.set(this.createKey1(element), element);
    });

    if (parent.isMinimized()) {
      parent.restore();
    }

    const bounds = parent.getBounds();
    const childHeight = 476;
    const childWidth = 600;
    this.childWindow = new BrowserWindow({
      parent: parent,
      modal: true,
      height: childHeight,
      width: childWidth,
      x: Math.round(bounds.x + (bounds.width - childWidth)/2),
      // y: Math.round(bounds.y + (bounds.height - childHeight)/2),  // center
      y: Math.round(bounds.y + 36), // top
      useContentSize: true,
      resizable: false,
      movable: false,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        sandbox: true,
        contextIsolation: true
      }
    });

    // if(app.isPackaged === false) {
    //   // Open the DevTools.
    //   this.childWindow.webContents.openDevTools();
    // }

    this.childWindow.on('closed', () => {
      this._certificateInfos = [];
      this.certificateMap.clear();
      this.childWindow = undefined;
      this.callbacks = [];
    });

    if (app.isPackaged) {
      this.childWindow.loadURL(format({
        pathname: path.join(__dirname, '../../../../electron-ui/browser/index.html'),
        protocol: 'file:',
        hash: 'certificate-list',
        slashes: true
      }));
    } else {
      this.childWindow.loadURL('http://localhost:4200#certificate-list');
    }
  }

  private createKey3(subjectName: string, serialNumber: string, fingerprint: string): string {
    return `${subjectName}-${serialNumber}-${fingerprint}`;
  }
}
