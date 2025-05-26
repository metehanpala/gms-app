import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ElectronMessageService {

  private readonly _mainProcessNotification: Subject<{ senderWebContentsId: number; data: any }> = new Subject<{ senderWebContentsId: number; data: any }>();

  constructor() {
    if (this.runsInElectron) {
      this.mainProcessApi.subscribeForMessages(
        (senderWebContentsId: number, message: any) => this._mainProcessNotification.next({ senderWebContentsId, data: message })
      );
    }
  }

  public get runsInElectron(): boolean {
    return ((window as any).electron !== undefined) ? true : false;
  }

  public get mainProcessNotification(): Observable<{ senderWebContentsId: number; data: any }> {
    return this._mainProcessNotification.asObservable();
  }

  public sendToWindow(webContentsId: number, message: any): void {
    if (this.runsInElectron) {
      this.mainProcessApi.sendToRenderer(webContentsId, message);
    }
  }

  public sendToMain(message: any): void {
    if (this.runsInElectron) {
      this.mainProcessApi.send(message);
    }
  }

  public sendAsyncToMain(message: any): Promise<any> {
    if (this.runsInElectron) {
      return this.mainProcessApi.sendAsync(message);
    } else {
      return undefined;
    }
  }

  public sendSyncToMain(message: any): any {
    if (this.runsInElectron) {
      return this.mainProcessApi.sendSyncToMain(message);
    } else {
      return undefined;
    }
  }

  private get mainProcessApi(): any {
    return (window as any).electron;
  }
}
