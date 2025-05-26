import { Component, OnInit, ViewChild } from '@angular/core';

import { ElectronUiMessageService } from '../../services/electron-ui-message.service';

@Component({
    selector: 'gms-endpoint-configuration',
    templateUrl: './endpoint-configuration.component.html',
    styleUrl: './endpoint-configuration.component.scss',
    standalone: false
})
export class EndpointConfigurationComponent implements OnInit {

  public endpoint = '';
  public endpointValid = false;
  public endpointNull = false;
  public brand = '';
  public brandParam: any;
  public isClosedMode = false;
  private readonly endpointRegex = /^((https:\/\/)|(http:\/\/))([a-zA-Z0-9\-\._~]+)(:(\d{1,5}))?(\/([a-zA-Z0-9\-\._~]+))?(\/?)/g;

  constructor(public electronUiMessageService: ElectronUiMessageService) {
  }

  public ngOnInit(): void {
    if (this.electronUiMessageService.runsInElectron) {
      const address = this.electronUiMessageService.readEndpointAddress();
      const addressDownloaded = this.electronUiMessageService.readDownloadedEndpointAddress();
      this.endpoint = address ?? (addressDownloaded ?? '');
    }
    const brandInfo = this.electronUiMessageService.getBrandInfo();
    if (brandInfo != undefined) {
      this.brand = brandInfo.brandName;
    }
    this.brandParam = { brandName: this.brand };
    this.validateAddress();

    this.isClosedMode = this.electronUiMessageService.isClosedModeActive();
  }

  public testEndpoint(): void {
    this.electronUiMessageService.testEndpointAddress(this.endpoint);
  }

  public saveEndpoint(): void {
    this.electronUiMessageService.saveEndpointAddress(this.endpoint);
    this.electronUiMessageService.reloadApplication();
  }

  public cancel(): void {
    this.electronUiMessageService.reloadApplication();
  }

  public changeAddress(event: any): void {
    this.endpoint = event.target.value;
    this.endpoint = this.endpoint.trim();
    this.validateAddress();
  }

  private validateAddress(): void {
    const result = this.endpoint.match(this.endpointRegex);
    this.endpointValid = result !== null && result[0] === this.endpoint;
    this.endpointNull = !this.endpointValid && this.endpoint === "";
  }

}
