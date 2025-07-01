import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TraceModules, WsiEndpointService, WsiUtilityService } from '@gms-flex/services';
import { ErrorNotificationServiceBase, TraceService, UserInfoStorage } from '@gms-flex/services-common';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {

  constructor(
    private readonly cookieService: CookieService,
    private readonly httpClient: HttpClient,
    private readonly wsiEndpointService: WsiEndpointService,
    private readonly wsiUtilityService: WsiUtilityService,
    private readonly errorService: ErrorNotificationServiceBase,
    private readonly traceService: TraceService
  ) {
  }

  private readonly pushNotificationRegisterTokenUrl = '/api/PushNotifications/RegisterToken';
  private readonly pushNotificationAppIsInBackgroundUrl = '/api/PushNotifications/IsApplicationInBackground';
  private readonly enablePushNotificationUrl = '/api/PushNotifications/EnablePushNotification';
  private readonly pushNotificationSetEventCategoryFilterUrl = '/api/PushNotifications/SetEventCategoryFilter';
  private readonly pushNotificationSubscribeEventNotificationsUrl = '/api/PushNotifications/SubscribeEventNotifications';
  private readonly pushNotificationUnsubscribeEventNotificationsUrl = '/api/PushNotifications/UnsubscribeEventNotifications';
  private readonly isPushNotificationPossibleUrl = '/api/PushNotifications/IsPushNotificationPossible';
  
  public registerToken(userToken: string, devicetoken: string, osType: string, timeZone: string, brand: string, version: string): Observable<string> {
    const functionName = 'registerToken()';
    const userName = this.cookieService.get(UserInfoStorage.UserNameKey);
    const headers: HttpHeaders = this.wsiUtilityService.httpGetDefaultHeader(userToken);
    const url = this.wsiEndpointService.entryPoint + this.pushNotificationRegisterTokenUrl;
    let params: HttpParams = new HttpParams();

    params = params.append('devicetoken', String(devicetoken));
    params = params.append('osType', String(osType));
    params = params.append('timeZone', String(timeZone));
    params = params.append('brand', String(brand));
    params = params.append('version', String(version));
    params = params.append('api_key', userName);
    const body: string | null = null;
    return this.httpClient.post(url, body, { headers, params, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) =>
        this.wsiUtilityService.extractData(response, TraceModules.pushNotifications, `${functionName}: http post response`)),
      catchError((response: HttpResponse<any>) =>
        this.wsiUtilityService.handleError(response, TraceModules.pushNotifications, functionName, this.errorService)));
  }

  public subscribeEventNotifications(userToken: string): Observable<string> {
    const functionName = 'subscribeEventNotifications()';
    const headers: HttpHeaders = this.wsiUtilityService.httpGetDefaultHeader(userToken);
    const url = this.wsiEndpointService.entryPoint + this.pushNotificationSubscribeEventNotificationsUrl;
    let params: HttpParams = new HttpParams();

    const userName = this.cookieService.get(UserInfoStorage.UserNameKey);
    params = params.append('api_key', userName);

    const body: string | null = null;
    return this.httpClient.post(url, body, { headers, params, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) =>
        this.wsiUtilityService.extractData(response, TraceModules.pushNotifications, `${functionName}: http post response`)),
      catchError((response: HttpResponse<any>) =>
        this.wsiUtilityService.handleError(response, TraceModules.pushNotifications, functionName, this.errorService)));

  }

  public unsubscribeEventNotifications(userToken: string): Observable<string> {
    this.unregisterServiceWorker();
    const functionName = 'subscribeEventNotifications()';
    const headers: HttpHeaders = this.wsiUtilityService.httpGetDefaultHeader(userToken);
    const url = this.wsiEndpointService.entryPoint + this.pushNotificationUnsubscribeEventNotificationsUrl;
    let params: HttpParams = new HttpParams();

    const userName = this.cookieService.get(UserInfoStorage.UserNameKey);
    params = params.append('api_key', userName);

    const body: string | null = null;
    return this.httpClient.post(url, body, { headers, params, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) =>
        this.wsiUtilityService.extractData(response, TraceModules.pushNotifications, `${functionName}: http post response`)),
      catchError((response: HttpResponse<any>) =>
        this.wsiUtilityService.handleError(response, TraceModules.pushNotifications, functionName, this.errorService)));

  }

  public isPushNotificationPossible(userToken: string): Observable<boolean> {
    const functionName = 'isPushNotificationPossible()';
    const headers: HttpHeaders = this.wsiUtilityService.httpGetDefaultHeader(userToken);
    const url = this.wsiEndpointService.entryPoint + this.isPushNotificationPossibleUrl;
    let params: HttpParams = new HttpParams();
    params = params.append('api_key', String("defaultadmin"));
    return this.httpClient.get(url, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) =>
        this.wsiUtilityService.extractData(response, TraceModules.pushNotifications, functionName)),
      catchError((response: HttpResponse<any>) =>
        this.wsiUtilityService.handleError(response, TraceModules.pushNotifications, functionName, this.errorService)));
  }

  public isPushEnabledFromUI(userToken: string): Observable<boolean> {
    throw new Error('Method not implemented.');
  }

  public enablePushNotification(userToken: string, isNotificationEnabled: boolean): Observable<string> {
    const functionName = 'enablePushNotification()';
    const headers: HttpHeaders = this.wsiUtilityService.httpGetDefaultHeader(userToken);
    const url = this.wsiEndpointService.entryPoint + this.enablePushNotificationUrl;
    let params: HttpParams = new HttpParams();

    params = params.append('isNotificationEnabled', isNotificationEnabled);
    const userName = this.cookieService.get(UserInfoStorage.UserNameKey);
    params = params.append('api_key', userName);

    const body: string | null = null;
    return this.httpClient.post(url, body, { headers, params, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) =>
        this.wsiUtilityService.extractData(response, TraceModules.pushNotifications, `${functionName}: http post response`)),
      catchError((response: HttpResponse<any>) =>
        this.wsiUtilityService.handleError(response, TraceModules.pushNotifications, functionName, this.errorService)));
  }

  public isApplicationInBackground(userToken: string, isAppInBackground: boolean): Observable<string> {
    const functionName = 'isApplicationInBackground()';
    const headers: HttpHeaders = this.wsiUtilityService.httpGetDefaultHeader(userToken);
    const url = this.wsiEndpointService.entryPoint + this.pushNotificationAppIsInBackgroundUrl;
    let params: HttpParams = new HttpParams();

    params = params.append('isAppInBackground', isAppInBackground);
    const userName = this.cookieService.get(UserInfoStorage.UserNameKey);
    params = params.append('api_key', userName);

    const body: string | null = null;
    return this.httpClient.post(url, body, { headers, params, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) =>
        this.wsiUtilityService.extractData(response, TraceModules.pushNotifications, `${functionName}: http post response`)),
      catchError((response: HttpResponse<any>) =>
        this.wsiUtilityService.handleError(response, TraceModules.pushNotifications, functionName, this.errorService)));
  }

  private async unregisterServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          this.traceService.info(TraceModules.pushNotifications, 'Service worker unregistered successfully.');
        }
      } catch (error) {
        this.traceService.error(TraceModules.pushNotifications, 'Error unregistering service worker:', error);
      }
    } else {
      this.traceService.warn(TraceModules.pushNotifications, 'Service workers are not supported in this browser.');
    }
  }
}
