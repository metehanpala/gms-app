import { net, session } from 'electron';
import { MainTraceService } from '../tracing/main-trace-service';

export class WsiService {
  private address?: string;

  constructor(private traceService: MainTraceService) {}

  public setEndpoint(address: string): void {
    this.address = address;
  }

  public doTerminateSession(): void {
    this.traceService.info(`WsiService.doTerminateSession(): Calling DELETE api/token...`);

    session.defaultSession.cookies.get({ name: 'gms-user-token'}).then((cookies) => {
      if (cookies.length < 1) {
        this.traceService.warn(`WsiService.doTerminateSession(): No 'gms-user-token' cookie available! Possibly not yet logged in?`);
        return;
      }

      if (this.address !== undefined) {
        const url = this.address + '/api/token';
        const options = { url: url, method: 'DELETE', useSessionCookies: true };
        const request = net.request(options);
        request.setHeader('Authorization', 'Bearer ' + cookies[0].value);
        request.on('response', (response) => {
          this.traceService.info(`WsiService.doTerminateSession(): HTTP status of logout: ${response.statusCode}`);
        })
        request.end();
      }
    }).catch((error) => {
      this.traceService.error('WsiService.doTerminateSession(): Error: ' + error);
    })
  }
}
