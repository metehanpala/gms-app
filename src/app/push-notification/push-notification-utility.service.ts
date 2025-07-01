import { Injectable } from '@angular/core';
import { TraceModules } from '@gms-flex/services';
import { AuthenticationServiceBase, TraceService } from '@gms-flex/services-common';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

import { PushNotificationService } from './push-notification.service';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationUtilityService {
  private isAppInForeground = true;
  private messaging: any;
  private registration: ServiceWorkerRegistration | undefined;
  public constructor(private readonly authenticationService: AuthenticationServiceBase, 
    private readonly pushNotificationService: PushNotificationService, private readonly traceService: TraceService) { }

  private readonly firebaseConfig = {
    apiKey: "AIzaSyCtyDy8h3X-apr2ZVeBu_u3R2pWGWeDF6s",
    authDomain: "flexwebapp.firebaseapp.com",
    projectId: "flexwebapp",
    storageBucket: "flexwebapp.appspot.com",
    messagingSenderId: "947194390802",
    appId: "1:947194390802:android:e147425b895ef418a62bcb",
    vapidKey: "BNFbd3l62kMJ-dQb5fGzW-vlc_61BwegfLqTWgsQVkvq29IXyAJNeIBB8VT-V2k1Wh8RGQSM_-T10wHsxh9ozqs"
  }
  private readonly app = initializeApp(this.firebaseConfig);

  public async registerNotifications(): Promise<void> {
    try {
      this.pushNotificationService.isPushNotificationPossible(this.authenticationService.userToken).subscribe(
        async (isPossible: boolean) => {
          if (isPossible) {
            if (Notification.permission === 'granted') {
              this.traceService.info(TraceModules.pushNotifications, 'Notification permission already granted.');
              await this.getFCMToken();
              return;
            }
  
            if (Notification.permission === 'default') {
              await Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  this.getFCMToken();
                } else {
                  this.pushNotificationService.enablePushNotification(this.authenticationService.userToken, false).subscribe();
                }
              });
            } else if (Notification.permission === 'denied') {
              this.traceService.warn(TraceModules.pushNotifications, 'Notification permission denied.');
              this.pushNotificationService.enablePushNotification(this.authenticationService.userToken, false).subscribe();
            }
          }
        });
    } catch (error) {
      this.traceService.error(TraceModules.pushNotifications, 'Error while registering notification:', error);
    }
  }

  public async unregisterServiceWorker(): Promise<void> {
    this.pushNotificationService.unsubscribeEventNotifications(this.authenticationService.userToken).subscribe();
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

  public addAppListeners(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('firebase-messaging-sw.js')
        .then(async registration => {
          try {
            this.registration = registration;
            this.messaging = getMessaging(this.app);
            await this.registerNotifications();
          } catch (error) {
            this.traceService.error(TraceModules.pushNotifications, 'Error during service worker registration:', error);
          }
        })
        .catch(error => {
          this.traceService.error(TraceModules.pushNotifications, 'Error registering service worker:', error);
        });
    }
  }

  private async getFCMToken(): Promise<void> {
    try {
      const token = await getToken(this.messaging, {
        vapidKey: "BNFbd3l62kMJ-dQb5fGzW-vlc_61BwegfLqTWgsQVkvq29IXyAJNeIBB8VT-V2k1Wh8RGQSM_-T10wHsxh9ozqs",
        serviceWorkerRegistration: this.registration
      });

      if (token) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userAgent = navigator.userAgent;
        const osInfo = this.getOSInfo(userAgent);

        this.pushNotificationService.registerToken(this.authenticationService.userToken, token, osInfo.name, timeZone, "DesigoCC", osInfo.version).subscribe(
          () => {
            this.pushNotificationService.subscribeEventNotifications(this.authenticationService.userToken).subscribe();
            document.addEventListener("visibilitychange", () => {
              this.isAppInForeground = document.hidden;
              this.pushNotificationService.isApplicationInBackground(this.authenticationService.userToken, this.isAppInForeground).subscribe();
              this.pushNotificationService.enablePushNotification(this.authenticationService.userToken, true).subscribe();
            });
          },
          error => {
            this.traceService.error(TraceModules.pushNotifications, 'Error registering token:', error);
          }
        );

      }
    } catch (error) {
      this.traceService.error(TraceModules.pushNotifications, "Error getting FCM token:", error);
    }
  }

  private getOSInfo(userAgent: string): any {
    let osName = "Android";
    let osVersion = "14.0";

    if (/Android (\d+(\.\d+)?)/.test(userAgent)) {
      osName = "Android";
      osVersion = RegExp.$1;
    } else if (/iPhone OS (\d+(_\d+)?)/.test(userAgent)) {
      osName = "iOS";
      osVersion = RegExp.$1.replace("_", ".");
    }

    return { name: osName, version: osVersion };
  }
}