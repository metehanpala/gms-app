import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { localConfigFolder } from '../endpoint/endpoint-file';
import { MainTraceService } from '../tracing/main-trace-service';

const certConfigFileName = 'certificate-configuration.json';

export class CertificateConfigurationFile {
  private readonly disabledKey = 'client-certificate-selection-disabled';

  constructor(private traceService: MainTraceService) {}

  public read(): CertificateConfiguration | undefined {
    try {
      let rawdata = fs.readFileSync(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, certConfigFileName), { encoding: 'utf8'});
      let certConfig: CertificateConfiguration = JSON.parse(rawdata);
      return certConfig;
    }
    catch (error) {
      this.traceService.warn(`CertificateConfigurationFile.read(): CertificateConfiguration file could not been read:
      ${error}`);
      return undefined;
    }
  }

  public clearAllSecuritySettings(): void {
    this.clearAllAcceptedHostUrls();
    this.clearSelectedClientCertificate();
  }

  public clearAllAcceptedHostUrls(): void {
    let certificateConfiguration = this.read();
    if (certificateConfiguration === undefined) {
      return;
    }
    certificateConfiguration.serverHostUrlAccepted = [];
    this.writeConfigurationFile(certificateConfiguration);
  }

  public clearSelectedClientCertificate(): void {
    let certificateConfiguration = this.read();
    if (certificateConfiguration === undefined) {
      return;
    }
    certificateConfiguration.selectedClientCertificate = null;
    this.writeConfigurationFile(certificateConfiguration);
  }

  public writeAcceptedHostUrl(hostUrlAccepted: string): void {
    let certificateConfiguration = this.read();
    if (certificateConfiguration === undefined) {
      certificateConfiguration = {
        selectedClientCertificate: null,
        serverHostUrlAccepted: []
      };
    }
    if (certificateConfiguration.serverHostUrlAccepted.indexOf(hostUrlAccepted) === -1) {
      certificateConfiguration.serverHostUrlAccepted.push(hostUrlAccepted);
    }

    this.writeConfigurationFile(certificateConfiguration);
  }

  public disableClientCertificateSelection(): void {
    let certificateConfiguration = this.read();
    if (certificateConfiguration === undefined) {
      certificateConfiguration = {
        selectedClientCertificate: this.disabledKey,
        serverHostUrlAccepted: []
      };
    } else {
      certificateConfiguration.selectedClientCertificate = this.disabledKey;
    }

    this.writeConfigurationFile(certificateConfiguration);
  }

  public isClientCertifcateSelectionDisabled(): boolean {
    let certificateConfiguration = this.read();
    if (certificateConfiguration !== undefined) {
      return (certificateConfiguration.selectedClientCertificate === this.disabledKey);
    } else {
      return false;
    }
  }

  public storeSelectedClientCertificateKey(certificateKey: string): void {
    let certificateConfiguration = this.read();
    if (certificateConfiguration === undefined) {
      certificateConfiguration = {
        selectedClientCertificate: certificateKey,
        serverHostUrlAccepted: []
      };
    } else {
      certificateConfiguration.selectedClientCertificate = certificateKey;
    }

    this.writeConfigurationFile(certificateConfiguration);
  }

  private writeConfigurationFile(certificateConfiguration: CertificateConfiguration): void {
    try {
      fs.writeFileSync(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, certConfigFileName), JSON.stringify(certificateConfiguration));
    }
    catch (error) {
      this.traceService.error(`EndpointFile.write(): Certificate configuration file could not been written: ${error}`);
    }
  }
}

export interface CertificateConfiguration {
  selectedClientCertificate: string | null,
  serverHostUrlAccepted: string[]
}
