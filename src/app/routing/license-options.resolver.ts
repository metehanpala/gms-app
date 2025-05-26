import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { LicenseOptionsService } from '@gms-flex/services';
import { LicencseOptions } from '@gms-flex/services/wsi-proxy-api/license/data.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LicenseOptionsResolver {
  constructor(private readonly router: Router,
    private readonly licenseOptionsService: LicenseOptionsService) {}

  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<LicencseOptions[]> {
    return this.licenseOptionsService.getLicenseOptionsRightsAll();
  }
}
