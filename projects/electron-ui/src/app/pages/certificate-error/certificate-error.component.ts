import { Component, OnInit } from '@angular/core';
import { ElectronUiMessageService } from '../../services/electron-ui-message.service';

@Component({
    selector: 'gms-certificate-error',
    templateUrl: './certificate-error.component.html',
    styleUrls: ['./certificate-error.component.scss'],
    standalone: false
})
export class CertificateErrorComponent implements OnInit {

  public hostUrl: string = '';
  public hostUrlParam: any;
  public acceptanceChecked = false;

  constructor(public electronUiMessageService: ElectronUiMessageService) {
  }

  public ngOnInit(): void {
    const certError = this.electronUiMessageService.getCurrentCertificateError();
    if (certError !== undefined) {
      this.hostUrl = certError.hostUrl;
    }
    this.hostUrlParam = { url: this.hostUrl };
  }

  public get isChildWindow(): boolean {
    return this.electronUiMessageService.isChildWindow;
  }

  public viewCertificate(): void {
    this.electronUiMessageService.viewCertificate(this.hostUrl);
  }

  public importCertificate(): void {
    this.electronUiMessageService.importCertificate(this.hostUrl);
  }

  public acceptCertificateAndReload(): void {
    this.electronUiMessageService.acceptCertificateAndReload(this.hostUrl, this.acceptanceChecked);
  }

  public denyCertificateAndClose(): void {
    this.electronUiMessageService.denyCertificateAndClose(this.hostUrl);
  }
}
