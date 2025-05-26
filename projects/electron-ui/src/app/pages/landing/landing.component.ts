import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ElectronUiMessageService } from '../../services/electron-ui-message.service';
import { TitleBarService } from '../../services/title-bar.service';
import { LocalisationService } from '../../shared';
import { EndpointConfigurationComponent } from '../endpoint/endpoint-configuration.component';
import { CopyrightDetails } from '@simpl/element-ng';

enum LandingContent {
  Endpoint = 'endpoint',
  ConnectionError = 'connection-error',
  CertificateError = 'certificate-error'
}

@Component({
    selector: 'gms-landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss'],
    standalone: false
})
export class LandingComponent implements OnInit {

  public links: any[] = [];
  public languages: any[] = [];
  public translationKey = 'en';
  public copyrightDetails: CopyrightDetails = {
    startYear: 2012,
    lastUpdateYear: 2025
  };

  public landingImage = 'assets/Login_image.jpg';
  public contentType = '';
  @ViewChild(EndpointConfigurationComponent) public endpointCmp: EndpointConfigurationComponent;

  constructor(
    public electronUiMessageService: ElectronUiMessageService,
    private titleBarService: TitleBarService,
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private localisationService: LocalisationService) {

    this.titleBarService.showTitleBar = !this.electronUiMessageService.isChildWindow;

    const brandInfo = this.electronUiMessageService.getBrandInfo();
    if (brandInfo != undefined) {
      this.landingImage = brandInfo.landingImage;
    }
  }

  public ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      this.contentType = paramMap.get('content');
    });

    this.translateService.onLangChange.subscribe((value) => {
      this.setLinks();
      console.info(`translateService.onLangChange() called for language: ${value.lang}; Setting acive language in main process.`);
      this.electronUiMessageService.setActiveLanguage(value.lang);
    });

    this.setLinks();

    this.localisationService.languageInfo.installedLanguages.forEach((name, idx) => {
      this.languages.push({ 'value': name, 'name': this.localisationService.languageInfo.installedLanguageNames[idx] });
    });
    this.translationKey = this.translateService.currentLang;
  }

  public get showTitleBar(): boolean {
    return this.titleBarService.showTitleBar;
  }

  public get showEndpoint(): boolean {
    return (this.contentType === LandingContent.Endpoint)? true: false;
  }

  public get showConnectionError(): boolean {
    return (this.contentType === LandingContent.ConnectionError)? true: false;
  }

  public get showCertificateError(): boolean {
    return (this.contentType === LandingContent.CertificateError)? true: false;
  }

  private setLinks(): void {
    this.links = [];
  }
}
