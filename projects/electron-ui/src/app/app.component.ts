import { Component, OnInit } from '@angular/core';
import { SiThemeService, ThemeType } from '@simpl/element-ng';
import { ElectronUiMessageService } from './services/electron-ui-message.service';
import { TitleBarService } from './services/title-bar.service';
import { LocalisationService } from './shared';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit {

  constructor(public titleBarService: TitleBarService,
    public electronUiMessageService: ElectronUiMessageService,
    private readonly siThemeService: SiThemeService,
    private localisationService: LocalisationService) {
  }

  public ngOnInit(): void {

    if (this.electronUiMessageService.runsInElectron) {
      const uiState = this.electronUiMessageService.getUiSyncState();
      if (uiState?.themeType !== undefined) {
        this.applyThemeType(uiState.themeType as ThemeType);
      } else {
        this.applyThemeType('auto');
      }
    } else {
      this.applyThemeType('auto');
    }

    const appInfo = this.electronUiMessageService.getAppInfo();
    console.info(`AppComponent.ngOnInit():
    appInfo.appLocale: ${appInfo.appLocale}
    appInfo.activeLanguage: ${appInfo.activeLanguage}
    appInfo.userInfo.user: ${appInfo.userInfo?.user}
    appInfo.userInfo.userLanguage.: ${appInfo.userInfo?.userLanguage}
    appInfo.userInfo?.hasConfigureRight: ${appInfo.userInfo?.hasConfigureRight}`);

    if (appInfo?.activeLanguage != undefined) {
      this.localisationService.setUserLanguage(appInfo.activeLanguage);
    }
  }

  public onReload(): void {
    location.reload();
  }

  private applyThemeType(themeType?: ThemeType): void {
    if (themeType === undefined) {
      themeType = 'auto';
    }
    this.siThemeService.applyThemeType(themeType);
  }
}
