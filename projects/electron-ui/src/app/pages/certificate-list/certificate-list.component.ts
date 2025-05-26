import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ColumnMode, SelectionType } from '@siemens/ngx-datatable';
import { SI_DATATABLE_CONFIG } from '@simpl/element-ng/datatable';
import { CertificateInfo } from 'desktop-main/src/messaging/window-message.data';
import { ElectronUiMessageService } from '../../services/electron-ui-message.service';
import { TitleBarService } from '../../services/title-bar.service';

@Component({
    selector: 'gms-certificate-list',
    templateUrl: './certificate-list.component.html',
    styleUrls: ['./certificate-list.component.scss'],
    standalone: false
})
export class CertificateListComponent implements OnInit {

  public hostUrl: string = '';
  public hostUrlParam: any;
  public acceptanceChecked = false;
  public useCertificate = true;
  public columns = [];

  tableConfig = SI_DATATABLE_CONFIG;
  selected = [];
  rows: any[] = [];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ColumnMode = ColumnMode;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  SelectionType = SelectionType;

  constructor(
    public electronUiMessageService: ElectronUiMessageService,
    private titleBarSrvice: TitleBarService,
    private translateService: TranslateService) {
    this.titleBarSrvice.showTitleBar = false;
  }

  public ngOnInit(): void {
    this.translateService.get(['CERTIFICATE_LIST.COLUMN_SUBJECT', 'CERTIFICATE_LIST.COLUMN_ISSUER', 'CERTIFICATE_LIST.COLUMN_SERIAL']).subscribe(result => {
      this.columns[0] = { name: result['CERTIFICATE_LIST.COLUMN_SUBJECT'], prop: 'subjectName'};
      this.columns[1] = { name: result['CERTIFICATE_LIST.COLUMN_ISSUER'], prop: 'issuerName'};
      this.columns[2] = { name: result['CERTIFICATE_LIST.COLUMN_SERIAL'], prop: 'serialNumber'};
    })

    const certInfo = this.electronUiMessageService.getClientCertificateInfo();
    if (certInfo !== undefined) {
      certInfo.forEach(info => {
        this.rows.push({
          url: info.hostUrl,
          subjectName: info.subjectName,
          issuerName: info.issuerName,
          serialNumber: info.serialNumber,
          thumbPrint: info.thumbPrint
        });
      });
    }

    if (this.rows.length > 0) {
      this.selected.push(this.rows[0]);
      this.hostUrlParam = { url: certInfo[0].hostUrl };
    }
  }

  public certificateInfo(): void {
    this.electronUiMessageService.viewClientCertificate(<CertificateInfo>this.selected[0])
  }

  public selectCertificate(): void {
    if (this.useCertificate) {
      this.electronUiMessageService.selectClientCertificateAndCloseDialog(<CertificateInfo>this.selected[0], this.acceptanceChecked);
    } else {
      this.electronUiMessageService.selectClientCertificateAndCloseDialog(undefined, this.acceptanceChecked);
    }
  }

  public cancel(): void {
    this.electronUiMessageService.cancelClientCertificateSelectionAndCloseApp();
  }

  public onUseCertificateRadioChange(_value: boolean): void {
    this.useCertificate = true;
  }

  public onNoCertificateRadioChange(_value: boolean): void {
    this.useCertificate = false;
  }
}
