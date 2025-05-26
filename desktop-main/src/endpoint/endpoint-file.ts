import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { MainTraceService } from '../tracing/main-trace-service';

export const localConfigFolder = 'Siemens-Gms-FlexClient';
const endpointFileName = 'endpoint.json';

export class EndpointFile {

  constructor(private traceService: MainTraceService) {}

  public read(): string | undefined {
    try {
      let rawdata = fs.readFileSync(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, endpointFileName), { encoding: 'utf8'});
      let endpoint = JSON.parse(rawdata);
      if ((endpoint.address === '') || (endpoint.address === null)) {
        return undefined;
      }
      return endpoint.address;
    }
    catch (error) {
      this.traceService.warn(`EndpointFile.read(): Endpoint file could not been read:
      ${error}`);
      return undefined;
    }
  }

  public write(address: string): void {
    let endpoint = {
      address: address
    };

    try {
      fs.writeFileSync(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, endpointFileName), JSON.stringify(endpoint));
    }
    catch (error) {
      this.traceService.error(`EndpointFile.write(): Endpoint file could not been written: ${error}`);
    }
  }
}
