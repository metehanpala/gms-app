import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

export interface LanguageInfo {
  fallbackCulture: string;
  installedLanguages: string[];
  installedLanguageNames: string[];
}

const defaultLanguage = 'en';

@Injectable({ providedIn: 'root' })
export class LocalisationService {
  public languageInfo!: LanguageInfo;

  constructor(
    private translateService: TranslateService,
    private readonly httpClient: HttpClient
    ) {
    this.translateService.setDefaultLang(defaultLanguage);
    console.info(`LocalisationService(): setting translate service default language to: en`);
  }

  public init(): Observable<LanguageInfo> {
    return this.readLanguageSettingsFromConfig();
  }

  public setUserLanguage(language: string): void {
    if (this.isLanguageAndRegionSupported(language)) {
      this.translateService.use(language).subscribe(() => this.traceLang(language));
    } else if (this.isLanguageSupported(language)) {
      this.translateService.use(this.getLanguagePart(language)).subscribe(() => this.traceLang(language));
    } else {
      this.translateService.use(defaultLanguage).subscribe(() => this.traceLang(language));
    }
  }

  private isLanguageAndRegionSupported(language: string): boolean {
    if (language == undefined) {
      return false;
    }

    for (const item of this.languageInfo.installedLanguages) {
      if (item === language) {
        return true;
      }
    }
    return false;
  }

  private isLanguageSupported(language: string): boolean {
    if (language == undefined) {
      return false;
    }

    for (const item of this.languageInfo.installedLanguages) {
      if (item === this.getLanguagePart(language)) {
        return true;
      }
    }
    return false;
  }

  private getLanguagePart(language: string): string {
    return language?.substring(0, 2);
  }

  private readLanguageSettingsFromConfig(): Observable<LanguageInfo> {
    if (this.languageInfo !== null && this.languageInfo !== undefined) {
      return of(this.languageInfo);
    } else {
      return this.httpClient.get<LanguageInfo>('config/product-settings.json').pipe(
        map((response: LanguageInfo) =>
          this.onReadLanguageSettings(response)),
        catchError((response: HttpErrorResponse) => {
          const responseStatus: string =
            response.status ? `${response.status} - ${response.statusText}` : `LocalisationService: Error reading language info.`;
          const productError: string = (response.message) ? response.message : responseStatus;
          console.error(productError);
          return throwError(() => new Error(productError));
        }));
    }
  }

  private onReadLanguageSettings(res: LanguageInfo): LanguageInfo {
    const body: LanguageInfo = res;
    this.languageInfo = body;
    this.traceInit();
    // Note: getBrowserCultureLang() returns the same locale as the electron app locale
    this.setUserLanguage(this.translateService.getBrowserCultureLang());
    return body;
  }

  private traceInit(): void {
    console.info(`LocalisationService.onReadLanguageSettings():
    installedLanguages: ${this.languageInfo?.installedLanguages?.join("; ")}
    installedLanguageNames: ${this.languageInfo?.installedLanguageNames?.join("; ")}
    navigator.language: ${navigator.language}
    navigator.languages: ${navigator.languages.join("; ")}`);
  }

  private traceLang(languageToUse: string): void {
    console.info(`LocalisationService.setUserLanguage(${languageToUse}):
    currentLang of translateService: ${this.translateService.currentLang}
    defaultLang of translateService: ${this.translateService.defaultLang}
    browserLang of translateService: ${this.translateService.getBrowserLang()}
    browserCultureLang of translateService: ${this.translateService.getBrowserCultureLang()}`);
  }
}
