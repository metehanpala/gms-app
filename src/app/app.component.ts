import { HttpClient } from '@angular/common/http';
import { Component, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationStart, Router, RoutesRecognized } from '@angular/router';
import { SnapinMessageBroker, StateService } from '@gms-flex/core';
import { AppRightsService, MultiMonitorConfiguration, StationData, StationDataPerUser, WsiEndpointService } from '@gms-flex/services';
import {
  AppContextService, AuthenticationServiceBase, isNullOrUndefined,
  Language, LanguageServiceBase, LocalizationService, ProductInfo, ProductService, TraceService
} from '@gms-flex/services-common';
import { TranslateService } from '@ngx-translate/core';
import { SiThemeService, SiToastNotificationService, Theme, ThemeType } from '@simpl/element-ng';
import { BootstrapInfo, ShowBackDropReason, UserInfo } from 'desktop-main/src/messaging/window-message.data';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';

import { DesktopMessageService, trcModuleNameDesktop } from './desktop-renderer/messaging/desktop-message.service';
import { EventMessageService } from './desktop-renderer/multi-monitor/event-message.service';
import { MultiMonitorConfigurationService } from './desktop-renderer/multi-monitor/multi-monitor-configuration.service';
import { ObjectMessageService } from './desktop-renderer/multi-monitor/object-message.service';
import { UiStateHandler } from './desktop-renderer/multi-monitor/ui-state-handler';
import { NotifyDialogComponent } from './notification-dialog/notify-dialog.component';
import { PushNotificationUtilityService } from './push-notification';
import { PushNotificationService } from './push-notification/push-notification.service';
import { TitleBarService } from './title-bar/title-bar.service';

export const trcModuleNameApp = 'gmsApplication_Application';
const gmsDeepLink = 'gms-deep-link';

/**
 * GLOBAL DECLARATIONS START
 */
@Component({
  selector: 'gms-app',
  templateUrl: './app.component.html',
  standalone: false
})

export class ApplicationComponent implements OnInit, OnDestroy {

  public canGoBack = false;
  public canGoFwd = false;
  public title = '';
  public focus = true;
  public changeCurrentConfigurationAllowed = true;
  public electronAppBootstrapped = false;
  private readonly routingSub: Subscription;
  private _showBackdrop = false;
  private modalRef: BsModalRef;
  private previousState: any;
  private titleSub: Subscription;

  @HostBinding('class.gms-has-navbar-titlebar-fixed-top-login') public get classForTitlebarFixedTop(): boolean {
    return this.runsInElectron;
  }

  public get runsInElectron(): boolean { return this.desktopMessageService.runsInElectron; }

  public get showBackdrop(): boolean { return this._showBackdrop; }

  public onBackward(): void {
    history.back();
  }

  public onEditRules(): void {
    if (this.runsInElectron) {
      this.desktopMessageService.editCommunicationRules();
    }
  }

  public onForward(): void {
    history.forward();
  }

  public onReload(emptyCache: boolean): void {
    this.traceService.info(trcModuleNameDesktop, `onReload() (electron) initiated. Need to check for unsaved data...`);
    this.stateService.triggerUnsavedDataCheckForLogout().subscribe(result => {
      this.traceService.info(trcModuleNameDesktop, `Unsaved data check returned (due to onReload()), logout/reload possible: ${result}`);
      if (result) {
        if (emptyCache) {
          this.desktopMessageService.reload(true);
        } else {
          location.reload();
        }
      }
    });
  }

  /*
   * Handles initialization after directive's data-bound properties have been initialized.
   */
  public ngOnInit(): void {
    this.authenticationServiceBase.restoreAuthentication.subscribe({ next: (value: boolean) => this.loggedIn(value) });
    // this.localizationService.detectLanguage(this.translateService.getBrowserLang()!);
    this.siThemeService.themeNames$.pipe(first()).subscribe(names => {
      const customThemeName = 'custom';
      if (!names.includes(customThemeName)) {
        const customThemePath = './assets/themes/theme-' + customThemeName + '.json';
        this.httpClient.get<Theme>(customThemePath).subscribe({
          next: theme => {
            this.traceService.info('Added new custom theme, ' + customThemePath);
            this.siThemeService.addOrUpdateTheme(theme);
            this.traceService.info('Setting active theme to: ' + customThemeName);
            this.siThemeService.setActiveTheme(customThemeName);
          },
          error: error =>
            this.traceService.error('Error loading custom theme ' + customThemePath + ', default theme element is now active, details: ' + error + '.')
        });
      } else {
        this.traceService.info('Setting active theme to: ' + customThemeName);
        this.siThemeService.setActiveTheme(customThemeName);
      }
    });

    if (!this.desktopMessageService.runsInElectron) {
      this.applyThemeType('auto');
    }
    this.initializePPWAApp();
  }

  public ngOnDestroy(): void {
    this.traceService.info(trcModuleNameApp, 'Application component destroyed.');
    this.titleSub.unsubscribe();
  }

  constructor(private readonly traceService: TraceService,
    private readonly modalService: BsModalService,
    private readonly wsiEndpointService: WsiEndpointService,
    private readonly stateService: StateService,
    private readonly authenticationServiceBase: AuthenticationServiceBase,
    private readonly router: Router,
    private readonly translateService: TranslateService,
    private readonly appContextService: AppContextService,
    private readonly languageServiceBase: LanguageServiceBase,
    private readonly localizationService: LocalizationService,
    private readonly titleService: Title,
    private readonly productService: ProductService,
    private readonly desktopMessageService: DesktopMessageService,
    private readonly multiMonitorConfigurationService: MultiMonitorConfigurationService,
    private readonly toastNotificationService: SiToastNotificationService,
    private readonly eventMessageService: EventMessageService,
    private readonly objectMessageService: ObjectMessageService,
    private readonly snapinMessageBroker: SnapinMessageBroker,
    private readonly uiStateHandler: UiStateHandler,
    private readonly siThemeService: SiThemeService,
    private readonly httpClient: HttpClient,
    private readonly appRightsService: AppRightsService,
    private readonly titleBarService: TitleBarService,
    private readonly pushNotificationUtilityService: PushNotificationUtilityService,
    private readonly pushNotificationService: PushNotificationService
  ) {

    this.productService.getProductSettings().subscribe((productSettings: ProductInfo) => {
      if (productSettings != null) {
        let winId: number;
        if (this.desktopMessageService.runsInElectron) {
          const winInfo = this.desktopMessageService.getOwnWindowInfo();
          if (winInfo != undefined) {
            winId = winInfo.browserWindowId;
          }
        }
        this.titleSub = titleBarService.title.subscribe(title => this.title = title);
        this.titleBarService.setTitle2(productSettings.brandProductName, winId);
      }
    });

    this.routingSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.saveFirstUrl(event);
      }
    });
    this.traceService.info(trcModuleNameApp, 'Launching application…');

    this.appContextService.themeType.subscribe(type => {
      this.traceService.info(trcModuleNameApp, `Applying them type: Type: ${type}`);
      if (this.siThemeService.resolvedColorScheme === type) {
        // Note:
        // SiSchemeService will not do a change of its theme type in this case.
        // If the selected scheme type is 'auto', the OS setting is 'dark' => the resolvedColorScheme is 'dark',
        // if we change noew the selected theme type to 'dark', this should cause a change nevertheless. But SiThemeService remains on 'auto'
        // This is a workaround to fix the issue: Force an (unneeded) theme type change which triggers SiThemeService.
        this.siThemeService.applyThemeType((type === 'light') ? 'dark' : 'light');
      }
      this.siThemeService.applyThemeType(type);
    });
    if (this.desktopMessageService.runsInElectron) {
      this.changeCurrentConfigurationAllowed = this.desktopMessageService.isCurrentMultiMonitorConfigurationChangeAllowed();

      this.desktopMessageService.onCurrentManagerConfigurationChanged.subscribe(info => {
        if (info !== undefined) {
          this.traceService.info(trcModuleNameApp, `Current configuration changed; This manager runs as type: ${info.managerDefinition.managerType}`);
        } else {
          this.traceService.error(trcModuleNameApp, 'manager info undefined');
        }
      });

      this.previousState = this.desktopMessageService.getUiSyncState();
      if (this.previousState?.themeType !== undefined) {
        this.applyThemeType(this.previousState?.themeType as ThemeType);
      } else {
        this.applyThemeType('auto');
      }
      this.desktopMessageService.onUiStateChanged.subscribe(synchData => {
        const newState = synchData.state;
        this.traceService.info(trcModuleNameApp, `UI state changed; Changed state : ${newState}`);
        this.uiStateHandler.handleUiState(this.previousState, newState);
        this.previousState = synchData.state;
      });

      this.desktopMessageService.onHistoryStateChanged.subscribe(historyUpdate => {
        this.traceService.info(trcModuleNameApp, `History changed; CanGoBack=${historyUpdate.canGoBack}; CanGoForward=${historyUpdate.canGoFwd}`);
        this.canGoBack = historyUpdate.canGoBack;
        this.canGoFwd = historyUpdate.canGoFwd;
      });

      this.desktopMessageService.onFocusChanged.subscribe(focus => {
        this.focus = focus;
      });

      this.desktopMessageService.onShowBackDropChanged.subscribe(showBdInfo => {
        this.traceService.info(trcModuleNameApp, `Show backdrop; show=${showBdInfo.show}`);
        if (showBdInfo.show) {
          if (showBdInfo.reason === ShowBackDropReason.None) {
            this._showBackdrop = true;
          } else if (showBdInfo.reason === ShowBackDropReason.Logoff) {
            this.translateService.get(['DESKTOP.LOG_OUT_MODAL_TITLE', 'DESKTOP.LOG_OUT_MODAL_MSG']).subscribe(values => {
              this.showNotifyDialog(values['DESKTOP.LOG_OUT_MODAL_TITLE'], values['DESKTOP.LOG_OUT_MODAL_MSG']);
            });
          } else if (showBdInfo.reason === ShowBackDropReason.AppyDefault) {
            this.translateService.get(['DESKTOP.RESET_LAYOUT_MODAL_TITLE', 'DESKTOP.RESET_LAYOUT_MODAL_MSG']).subscribe(values => {
              this.showNotifyDialog(values['DESKTOP.RESET_LAYOUT_MODAL_TITLE'], values['DESKTOP.RESET_LAYOUT_MODAL_MSG']);
            });
          } else {
            this.translateService.get(['DESKTOP.CLOSE_APP_MODAL_TITLE', 'DESKTOP.CLOSE_APP_MODAL_MSG']).subscribe(values => {
              this.showNotifyDialog(values['DESKTOP.CLOSE_APP_MODAL_TITLE'], values['DESKTOP.CLOSE_APP_MODAL_MSG']);
            });
          }
        } else {
          this.hideNotifyDialog();
          this._showBackdrop = false;
        }
      });

      if (this.desktopMessageService.isMainManager() === false) {
        const info = this.desktopMessageService.getCurrentManagerConfiguration();
        if (info !== undefined) {
          this.traceService.info(trcModuleNameApp, `Get current configuration; This manager runs as type: ${info.managerDefinition.managerType}`);
        } else {
          this.traceService.error(trcModuleNameApp, 'manager info undefined');
        }

      }

      if (this.desktopMessageService.isMainManager()) {

        const appInfo = this.desktopMessageService.getAppInfo();
        if (appInfo?.activeLanguage !== undefined) {
          this.translateService.onLangChange.subscribe(value => {
            this.traceService.info(trcModuleNameApp,
              `translateService.onLangChange() called for language: ${value.lang}; Setting acive language in main process.`);
            this.desktopMessageService.setActiveLanguage(value.lang);
          });
          const langToSet = this.localizationService.detectLanguage(appInfo.activeLanguage);
          this.translateService.use(langToSet).subscribe((res: any) => {
            this.appContextService.setUserCulture(langToSet);
            this.traceService.info(trcModuleNameApp, 'Applying active user language from electron process: ' + this.translateService.currentLang);
          });
        }

        this.desktopMessageService.onCurrentMultiMonitorConfigurationChanged.subscribe(config => {
          if (!isNullOrUndefined(this.authenticationServiceBase.userToken)) {
            const configData = {
              /* eslint-disable @typescript-eslint/naming-convention */
              Configuration: JSON.stringify(config.configuration),
              OverruleSettings: config.configuration.overruleAllowed,
              HostName: config.clientId.hostName
              /* eslint-enable @typescript-eslint/naming-convention */
            };
            this.multiMonitorConfigurationService.saveMultiMonitorConfigurationPerUser(config.clientId.clientId, configData)
              .subscribe((res: StationDataPerUser) => {
                this.traceService.info(trcModuleNameApp, `Save current configuration for current user: ${JSON.stringify(res)}`);
              });
          }
        });

        this.desktopMessageService.onDefaultMultiMonitorConfigurationChanged.subscribe(config => {
          const configData = {
            /* eslint-disable @typescript-eslint/naming-convention */
            Configuration: JSON.stringify(config.configuration),
            OverruleSettings: config.configuration.overruleAllowed,
            HostName: config.clientId.hostName
            /* eslint-enable @typescript-eslint/naming-convention */
          };
          this.multiMonitorConfigurationService.saveMultiMonitorConfiguration(config.clientId.clientId, configData).subscribe((res: StationData) => {
            this.traceService.info(trcModuleNameApp, `Save default configuration : ${JSON.stringify(res)}`);
          });
        });
      }

      this.desktopMessageService.onCanWindowBeClosedRequestChanged.subscribe(info => {
        this.traceService.info(trcModuleNameDesktop, 'CanWindowBeClosed event occurred, checking for unsaved data...');
        this.stateService.triggerUnsavedDataCheckForLogout().subscribe(result => {
          this.traceService.info(trcModuleNameDesktop, `Unsaved data check returned, logout possible: ${result}`);
          info.setReply(result);
        });
      });

      this.desktopMessageService.onObjectSelectionChanged.subscribe(data => {
        this.objectMessageService.handleObjectMessage(data);
      });

      this.desktopMessageService.onEventSelectionChanged.subscribe(data => {
        this.eventMessageService.handleEventMessage(data);
      });
    }
  }

  /*
   * Handles AuthenticationService's user is log-in event.
   */
  public loggedIn(value: boolean): void {
    if (value != null) {
      this.appContextService.setUserName(this.authenticationServiceBase.userName);
      this.appContextService.setUserDescriptor(this.authenticationServiceBase.userDescriptor);

      this.languageServiceBase.getUserLanguage().subscribe({
        next: language => {
          if (language != null) {
            const lang = this.localizationService.detectLanguage(language.Code);
            this.translateService.use(lang).subscribe((res: any) => {
              this.appContextService.setUserCulture(lang);
              if (this.desktopMessageService.runsInElectron) {
                this.appContextService.setUserLocalizationCulture(this.translateService.currentLang);
              } else {
                this.appContextService.setUserLocalizationCulture(this.translateService.getBrowserCultureLang());
              }
              this.appContextService.setUserLocalizationCulture(this.translateService.getBrowserCultureLang());
              this.traceService.info(trcModuleNameApp, 'Applying user language: ' + this.translateService.currentLang);
              this.bootstrapElectronApplication();
            });
          }
          if (this.router.getCurrentNavigation() === null && this.router.routerState.snapshot.url !== '/communicationrules') {
            this.router.navigate(['/loading'], { skipLocationChange: true });
          }
        },
        error: error => {
          this.traceService.warn(trcModuleNameApp, 'Error retreiving Applying user language: ');
        }
      });
    }
  }

  private applyThemeType(themeType?: ThemeType): void {
    if (themeType === undefined) {
      themeType = 'auto';
    }
    this.appContextService.setThemeType(themeType);
  }

  private bootstrapElectronApplication(): void {
    if (this.desktopMessageService.isMainManager()) {
      const clientId = this.desktopMessageService.getClientIdentification();
      const obsDefaultMmConfig = this.multiMonitorConfigurationService.getMultiMonitorConfiguration(clientId.clientId);
      const obsUserMmConfig = this.multiMonitorConfigurationService.getMultiMonitorConfigurationPerUser(clientId.clientId);
      const obsTranslationtext = this.getElectronTranslationText();
      // retreive all the rights through an observable since "getAppRights(id)" call cannot return the MM rights on time
      const obsAppRightsArr = this.appRightsService.getAppRightsAll();
      forkJoin([obsDefaultMmConfig, obsUserMmConfig, obsAppRightsArr, obsTranslationtext]).subscribe({
        next: ([config, userConfig, appRightsArr, translationtext]) => {
          const hasConfigureRight = !isNullOrUndefined(appRightsArr.ApplicationRights.find(appRight => appRight.Id === 92));
          const bsConfig = config.Configuration !== '' ? JSON.parse(config.Configuration) : null;
          const userBsConfig = userConfig.Configuration !== '' ? JSON.parse(userConfig.Configuration) : null;
          this.bootstrapElectronApp(hasConfigureRight, bsConfig, userBsConfig, translationtext);
        },
        error: e => {
          // in case there is no datapoint created yet, then the calls to get mm config will go into error
          obsAppRightsArr.subscribe(appRightsArr => {
            const hasConfigureRight = !isNullOrUndefined(appRightsArr.ApplicationRights.find(appRight => appRight.Id === 92));
            this.bootstrapElectronApp(hasConfigureRight, null, null, null);
          });
        }
      });
    }
  }

  private getElectronTranslationText(): Observable<any> {
    return this.translateService.get([
      'TITLE_BAR.ZOOM_IN',
      'TITLE_BAR.ZOOM_OUT',
      'TITLE_BAR.RESET_ZOOM',
      'TITLE_BAR.REFRESH',
      'TITLE_BAR.GO_BACK',
      'TITLE_BAR.GO_FORWARD',
      'TITLE_BAR.NAVIGATE',
      'TITLE_BAR.VIEW']);
  }

  private showNotifyDialog(heading: string, message: string): void {
    const initialState: ModalOptions = {
      initialState: {},
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true
    };
    initialState.initialState['heading'] = heading; // eslint-disable-line
    initialState.initialState['message'] = message; // eslint-disable-line

    this.modalRef = this.modalService.show(NotifyDialogComponent, initialState);
  }

  private hideNotifyDialog(): void {
    if (this.modalRef !== undefined) {
      this.modalRef.hide();
    }
  }

  private saveFirstUrl(event: any): void {
    this.routingSub.unsubscribe();
    let url: string = ((event.url).toString());
    if (url.startsWith('/loginpage?code')) {
      if (sessionStorage.getItem(gmsDeepLink)) {
        url = sessionStorage.getItem(gmsDeepLink);
        sessionStorage.removeItem(gmsDeepLink);
        this.stateService.redirectUrl = url;
      } else {
        this.stateService.redirectUrl = '/';
      }
    } else if (url.startsWith('/loginpage') || url === '/') {
      this.stateService.redirectUrl = '/';
      if (sessionStorage.getItem(gmsDeepLink)) {
        sessionStorage.removeItem(gmsDeepLink);
      }
    } else {
      sessionStorage.setItem(gmsDeepLink, url);
      this.stateService.redirectUrl = url;
    }
  }

  private bootstrapElectronApp(appRight: boolean, config: MultiMonitorConfiguration, userConfig: MultiMonitorConfiguration, translationText: any): void {
    let wsiEnpoint = this.wsiEndpointService.entryPoint;
    if ((this.wsiEndpointService as any).isRelative) {
      wsiEnpoint = new URL(this.wsiEndpointService.entryPoint, window.location.origin).toString();
    }
    const bsInfo = new BootstrapInfo(
      new UserInfo(
        this.authenticationServiceBase.userName,
        this.appContextService.userCultureValue,
        appRight
      ),
      wsiEnpoint,
      config,
      userConfig,
      translationText
    );
    this.desktopMessageService.bootstrapApplication(bsInfo);
    this.changeCurrentConfigurationAllowed = this.desktopMessageService.isCurrentMultiMonitorConfigurationChangeAllowed();
    const info = this.desktopMessageService.getCurrentManagerConfiguration();
    this.traceService.info(trcModuleNameApp, `This manager runs as type: ${info?.managerDefinition.managerType}`);
    this.electronAppBootstrapped = true;
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  private onBeforeInstallPrompt(event: any): void {
    event.preventDefault();
  }

  @HostListener('window:appinstalled', ['$event'])
  private onAppInstalled(event: any): void {
    this.initializePPWAApp();
  }
  
  private initializePPWAApp(): void {
    const isPWAInstalled = (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone);
    if (isPWAInstalled) {
      this.authenticationServiceBase.loginObservable.subscribe(isLogedIn => {
        if (isLogedIn) {
          this.pushNotificationUtilityService.addAppListeners();
        }
      });

      this.authenticationServiceBase.beforeLogoutObservable.subscribe(() => {
        this.pushNotificationService.unsubscribeEventNotifications(this.authenticationServiceBase.userToken).subscribe();
      });
    }
  }
}
