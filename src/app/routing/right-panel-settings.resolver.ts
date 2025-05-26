import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

import { RightPanelStateService } from '../right-panel/right-panel-state.service';

@Injectable({
  providedIn: 'root'
})
export class RightPanelSettingsResolver {
  constructor(private readonly rightPanelStateService: RightPanelStateService) {}

  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.rightPanelStateService.getRightPanelSettings();
  }

}
