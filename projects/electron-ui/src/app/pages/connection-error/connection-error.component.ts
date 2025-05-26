import { Component, OnInit } from '@angular/core';
import { ConnectionErrorInfo } from 'desktop-main/src/messaging/window-message.data';
import { ElectronUiMessageService } from '../../services/electron-ui-message.service';

@Component({
    selector: 'gms-connection-error',
    templateUrl: './connection-error.component.html',
    styleUrls: ['./connection-error.component.scss'],
    standalone: false
})
export class ConnectionErrorComponent implements OnInit {

  public hostUrl: string = '';
  public hostUrlParam: any;
  public connectionError: ConnectionErrorInfo;

  constructor(public electronUiMessageService: ElectronUiMessageService) {
  }

  public ngOnInit(): void {
    this.connectionError = this.electronUiMessageService.getCurrentConnectionError();
    if (this.connectionError !== undefined) {
      this.hostUrl = this.connectionError.hostUrl;
    }
    this.hostUrlParam = { url: this.hostUrl };
  }

  public get isChildWindow(): boolean {
    return this.electronUiMessageService.isChildWindow;
  }

  public reload(): void {
    if (this.isChildWindow) {
      this.electronUiMessageService.reloadChildWindow();
    } else {
      this.electronUiMessageService.reloadApplication();
    }
  }

  public configureEndpoint(): void {
    this.electronUiMessageService.configureEndpointAddress();
  }

  public closeWindow(): void {
    this.electronUiMessageService.closeChildWindow();
  }
}
