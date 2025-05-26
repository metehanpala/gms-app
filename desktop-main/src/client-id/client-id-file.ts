import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as os from 'os';
import * as crypto from 'crypto';
import { localConfigFolder } from '../endpoint/endpoint-file';
import { MainTraceService } from '../tracing/main-trace-service';

const clientIdFileName = 'client-identification.json';

export class ClientIdFile {

  constructor(private traceService: MainTraceService) {}

  public init() {
    if (!this.isFileValid()) {
      this.initFile();
    }
  }

  public read(): ClientIdentification | undefined {
    try {
      let rawdata = fs.readFileSync(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, clientIdFileName), { encoding: 'utf8'});
      let clientId: ClientIdentification = JSON.parse(rawdata);
      return clientId;
    }
    catch (error) {
      this.traceService.warn(`ClientIdFile.read(): ClientId file could not been read:
      ${error}`);
      return undefined;
    }
  }

  private isFileValid(): boolean {
    this.traceService.info(`ClientIdFile.isFileValid(): Checking file for validity...`);

    try {
      let rawdata = fs.readFileSync(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, clientIdFileName), { encoding: 'utf8'});
      let clientId: ClientIdentification = JSON.parse(rawdata);
      if (clientId !== undefined) {
        if ((clientId.id !== undefined) && (clientId.hostName !== undefined) && (clientId.createDate !== undefined)) {
          this.traceService.info(`ClientIdFile.isFileValid(): File valid:
          id=${clientId.id}, hostName=${clientId.hostName }, createDate=${clientId.createDate}`);
          return true;
        }
        this.traceService.warn(`ClientIdFile.isFileValid(): File invalid:
        id=${clientId.id}, hostName=${clientId.hostName }, createDate=${clientId.createDate}`);
      }
      this.traceService.warn(`ClientIdFile.isFileValid(): File invalid!`);
      return false;
    }
    catch (error) {
      this.traceService.error(`ClientIdFile.isFileValid(): File could not been read: ${error}`);
      return false;
    }
  }

  private initFile(): void {
    this.traceService.info(`ClientIdFile.initFile(): Creating ClientId (GUID) and storing in file...`);

    const cd = Date.now();
    let clientId: ClientIdentification = {
      id: crypto.randomUUID(),
      hostName: os.hostname(),
      createDateMs: cd,
      createDate: (new Date(cd)).toString()
    };
    this.write(clientId);
  }

  private write(clientId: ClientIdentification): void {
    try {
      fs.writeFileSync(path.resolve(process.env.ALLUSERSPROFILE!, localConfigFolder, clientIdFileName), JSON.stringify(clientId));
    }
    catch (error) {
      this.traceService.error(`ClientIdFile.write(): ClientId file could not been written: ${error}`);
    }
  }
}

export interface ClientIdentification {
  id: string,
  hostName: string,
  createDateMs: number
  createDate: string
}
