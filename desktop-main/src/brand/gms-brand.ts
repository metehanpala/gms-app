import * as fs from 'fs';
import * as path from 'path';
import { MainTraceService } from '../tracing/main-trace-service';

const localConfigFolder = 'config/desktop';
const brandFileName = 'siemens-gms-flexclient-brand.txt';

// Note: The values match the brand names of the Desigo CC platform!
// These values are used at various other places
export enum GmsBrandEn {
  DesigoCC = 'Desigo CC',
  DesigoCCConnect = 'Desigo CC Connect',
  DesigoCCCompact = 'Desigo CC Compact',
  CerberusDMS = 'Cerberus DMS',
  PowerManager = 'powermanager',
  Undefined = ''
}

// enum must be aligned with the above enum: GmsBrandEn
export enum GmsBrandPipedEn {
  DesigoCC = 'desigo-cc',
  DesigoCCConnect = 'desigo-cc-connect',
  DesigoCCCompact = 'desigo-cc-compact',
  CerberusDMS = 'cerberus-dms',
  PowerManager = 'powermanager',
  Undefined = ''
}

export class GmsBrand {
  public brand = GmsBrandEn.Undefined;

  constructor(private traceService: MainTraceService) {
    this.brand = this.readBrand();
    this.traceService.info(`GmsBrand.readBrand(): brand=${this.brand.toString()}`);
  }

  public getBrandIcon(): string {
    if (this.brand === GmsBrandEn.Undefined) {
      // Fallback to the Desigo CC icon
      return path.join(__dirname, `../assets/${GmsBrandPipedEn.DesigoCC.toString()}/ApplicationIcon.ico`);
    } else {
      return path.join(__dirname, `../assets/${this.getBrandNamePiped()}/ApplicationIcon.ico`);
    }
  }

  public getLandingImage(): string {
    if (this.brand === GmsBrandEn.Undefined) {
      // Fallback to the Desigo CC image
      return new URL('file:///' + path.join(__dirname, `../assets/${GmsBrandPipedEn.DesigoCC.toString()}/Login_image.jpg`)).toString();
    } else {
      return  new URL('file:///' + path.join(__dirname, `../assets/${this.getBrandNamePiped()}/Login_image.jpg`)).toString();;
    }
  }

  public getBrandDisplayName(): string {
    if (this.brand === GmsBrandEn.PowerManager) {
      return 'Power Manager';
    } else if (this.brand === GmsBrandEn.Undefined) {
      return 'Flex Client';
    } else {
      return this.brand.toString();
    }
  }

  public getBrandName(): string {
    return this.brand.toString();
  }

  public getBrandNamePiped(): string {
    if (this.brand === GmsBrandEn.DesigoCC) {
      return GmsBrandPipedEn.DesigoCC.toString();
    } else if (this.brand === GmsBrandEn.DesigoCCConnect) {
      return GmsBrandPipedEn.DesigoCCConnect.toString();
    } else if (this.brand === GmsBrandEn.DesigoCCCompact) {
      return GmsBrandPipedEn.DesigoCCCompact.toString();
    } else if (this.brand === GmsBrandEn.CerberusDMS) {
      return GmsBrandPipedEn.CerberusDMS.toString();
    } else if (this.brand === GmsBrandEn.PowerManager) {
      return GmsBrandPipedEn.PowerManager.toString();
    } else {
      return '';
    }
  }

  private readBrand(): GmsBrandEn {
    try {
      let rawdata = fs.readFileSync(localConfigFolder + '/' + brandFileName, { encoding: 'ascii'});
      if ((rawdata === undefined) || (rawdata === null) || (rawdata === '')) {
        return GmsBrandEn.Undefined;
      } else if (rawdata === GmsBrandEn.DesigoCC) {
        return GmsBrandEn.DesigoCC;
      } else if (rawdata === GmsBrandEn.DesigoCCCompact) {
        return GmsBrandEn.DesigoCCCompact;
      } else if (rawdata === GmsBrandEn.DesigoCCConnect) {
        return GmsBrandEn.DesigoCCConnect;
      } else if (rawdata === GmsBrandEn.CerberusDMS) {
        return GmsBrandEn.CerberusDMS;
      } else if (rawdata === GmsBrandEn.PowerManager) {
        return GmsBrandEn.PowerManager;
      } else {
        return GmsBrandEn.Undefined;
      }
    }
    catch {
      this.traceService.info('Error reading brand...');
      return GmsBrandEn.Undefined;
    }
  }
}
