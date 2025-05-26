import { Injectable } from '@angular/core';
import { MultiMonitorConfigurationService as MultiMonitorConfigService, MultiMonitorConfigurationData,
  StationData, StationDataPerUser } from '@gms-flex/services';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MultiMonitorConfigurationService {

  constructor(
    private readonly multimonitorConfig: MultiMonitorConfigService
  ) {}

  public getMultiMonitorConfiguration(clientId: string): Observable<any> {
    return this.multimonitorConfig.getMultiMonitorConfiguration(clientId);
  }

  public getMultiMonitorConfigurationPerUser(clientId: string): Observable<any> {
    return this.multimonitorConfig.getMultiMonitorConfigurationPerUser(clientId);
  }

  public saveMultiMonitorConfiguration(clientId: string, configuration: MultiMonitorConfigurationData): Observable<StationData> {
    return this.multimonitorConfig.setMultiMonitorConfiguration(configuration, clientId);
  }

  public saveMultiMonitorConfigurationPerUser(clientId: string, configuration: MultiMonitorConfigurationData): Observable<StationDataPerUser> {
    return this.multimonitorConfig.setMultiMonitorConfigurationPerUser(configuration, clientId);
  }

  public deleteMultiMonitorConfiguration(clientId: string): Observable<StationData> {
    return this.multimonitorConfig.deleteMultiMonitorConfiguration(clientId);
  }

  public deleteMultiMonitorConfigurationPerUser(clientId: string): Observable<StationDataPerUser> {
    return this.multimonitorConfig.deleteMultiMonitorConfigurationPerUser(clientId);
  }
}
