import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppRights, AppRightsService } from '@gms-flex/services';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppRightsResolver {
  constructor(private readonly router: Router,
    private readonly appRightsService: AppRightsService) {}

  public resolve(): Observable<AppRights> {
    this.appRightsService.getAppRightsAll().subscribe({
      error: _error => {
        this.router.navigate(['/loginpage'], { skipLocationChange: false });
      }
    });
    return this.appRightsService.getAppRightsAll();
  }
}
