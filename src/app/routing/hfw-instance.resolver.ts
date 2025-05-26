import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { HfwInstance, StateService } from '@gms-flex/core';
import { ManagerInfo } from '@gms-flex/services';
import { TraceService } from '@gms-flex/services-common';
import { Observable, of } from 'rxjs';

import { trcModuleNameApp } from '../app.component';
import { DesktopMessageService } from '../desktop-renderer/messaging/desktop-message.service';

@Injectable({
  providedIn: 'root'
})
export class HfwInstanceResolver {
  private currentManagerInfoChangedFlag = false;

  constructor(private readonly router: Router,
    private readonly stateService: StateService,
    private readonly desktopMessageService: DesktopMessageService,
    private readonly traceService: TraceService) {
    this.desktopMessageService.onCurrentManagerConfigurationChanged.subscribe(managerInfo => {
      // Note:
      // At startup, this notification comes quite immediately in case of a detached event list.
      // The notification arrives earlier than the 'stateService.getHfwInstance(...)' method resolves in the 'resolve(...)' method below.
      // Due to this fact, we cannot update the available frames in the state service here.
      // We postpone the update and do it within the next call of the 'resolve(...)' method below.
      this.currentManagerInfoChangedFlag = true;
    });
  }

  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<HfwInstance> {
    let managerInfo: ManagerInfo;
    let desktopParams: { layoutsPerFrameViewMap: Map<string, string>; userLayoutStoringEnabled: boolean };
    if (this.desktopMessageService.runsInElectron) {
      managerInfo = this.desktopMessageService.getCurrentManagerConfiguration();
      desktopParams = this.createDesktopParams(managerInfo);
      if (this.currentManagerInfoChangedFlag) {
        this.stateService.updateAvailableFrames(managerInfo.framesToCreate);
        this.currentManagerInfoChangedFlag = false;
      }
      this.traceService.info(trcModuleNameApp, 'managerInfo: %s', JSON.stringify(managerInfo.framesToCreate));
    }
    return this.stateService.getHfwInstance(managerInfo?.framesToCreate, desktopParams?.layoutsPerFrameViewMap, desktopParams?.userLayoutStoringEnabled);
  }

  private createDesktopParams(managerInfo: ManagerInfo): { layoutsPerFrameViewMap: Map<string, string>; userLayoutStoringEnabled: boolean } {
    const userLayoutStoringEnabled = this.desktopMessageService.isUserConfigurationChangeAllowed() && this.desktopMessageService.isMainManager();
    const layoutsPerFrameViewMap = new Map<string, string>();
    managerInfo.managerDefinition.frames.forEach(frame => {
      if (managerInfo.framesToCreate.some(frameToCreate => frameToCreate === frame.id)) {
        if (frame.views?.length > 0) {
          frame.views.forEach(view => {
            layoutsPerFrameViewMap.set(frame.id + '.' + view.id, view.defaultLayout);
          });
        }
      }
    });
    return { layoutsPerFrameViewMap, userLayoutStoringEnabled };
  }
}
