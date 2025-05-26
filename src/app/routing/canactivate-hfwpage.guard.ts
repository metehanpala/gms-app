import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { StateService } from '@gms-flex/core';
import { AuthenticationServiceBase } from '@gms-flex/services-common';
@Injectable({
  providedIn: 'root'
})
export class CanActivateHfwPage {

  public constructor(private readonly router: Router,
    private readonly state: StateService,
    private readonly authenticationServiceBase: AuthenticationServiceBase) {
    // constructor
  }

  public canActivate(): boolean {
    if (this.authenticationServiceBase.userToken != null && this.authenticationServiceBase.userToken !== '400 - Bad Request') {
      if (this.state.hasRouteConfigBeenReset) {
        return true;
      } else {
        // route config not ready so redirect to loading page.
        this.router.navigate(['/loading'], { skipLocationChange: true });
        return false;
      }
    } else {
      // not logged in so redirect to login page with the return url and return false
      this.router.navigate(['/loginpage']);
      return false;
    }
  }
}
