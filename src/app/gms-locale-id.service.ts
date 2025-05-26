import { registerLocaleData } from '@angular/common';
import { Injectable } from '@angular/core';
import { AppContextService, TraceService } from '@gms-flex/services-common';

import { trcModuleNameApp } from './app.component';

export class GmsLocaleId extends String {

  constructor(private readonly gmsLocaleIdService: GmsLocaleIdService) {
    super();
  }

  public toString(): string {
    return this.gmsLocaleIdService.localeId;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GmsLocaleIdService {

  private readonly localeIdDefault = 'en';
  private localeIdActive = this.localeIdDefault;
  private latestRegisterLocaleId!: string;

  public get localeId(): string {
    return this.localeIdActive;
  }

  public constructor(private readonly appContextService: AppContextService, private readonly traceService: TraceService) {
    this.registerLocale(this.localeIdActive);
    this.appContextService.userLocalizationCulture.subscribe(locale => {
      this.traceService.info(trcModuleNameApp, `GmsLocaleIdService(): AppContextService.userLocalizationCulture changed: ${locale}`);
      this.registerLocale(locale);
    });
  }

  private registerLocale(localeId: string): void {
    if ((localeId === undefined) || (localeId === null) || (localeId === '')) {
      return;
    }
    this.traceService.info(trcModuleNameApp, `GmsLocaleIdService.registerLocale(): For locale: ${localeId}`);
    this.latestRegisterLocaleId = localeId;

    this.genericLocaleInitializer(localeId).then(result => {
      this.traceService.info(trcModuleNameApp, `GmsLocaleIdService.registerLocale(): Succeded for locale: ${localeId}; result: ${result}`);
      if (this.latestRegisterLocaleId === localeId) {
        this.localeIdActive = localeId;
      } else {
        this.traceService.info(trcModuleNameApp,
          `GmsLocaleIdService.registerLocale(): (${localeId}) outdated due to newer request for locale: ${this.latestRegisterLocaleId}`);
      }
    }, error => {
      this.traceService.info(trcModuleNameApp, `GmsLocaleIdService.registerLocale(): Failed for locale: ${localeId}; result: ${error}`);
      if (this.latestRegisterLocaleId === localeId) {
        const lang = this.extractLanguage(localeId);
        if ((lang === localeId) && (localeId === this.localeIdDefault)) {
          // stop trying, severe issues, should not come here!
          this.traceService.info(trcModuleNameApp, 'GmsLocaleIdService.registerLocale(): Failed, severe issues, should not come here');
          return;
        }

        if (lang === undefined) {
          this.registerLocale(this.localeIdDefault);
        } else {
          this.registerLocale(lang);
        }
      } else {
        this.traceService.info(trcModuleNameApp,
          `GmsLocaleIdService.registerLocale(): (${localeId}) outdated due to newer request for locale: ${this.latestRegisterLocaleId}`);
      }
    });
  }

  private extractLanguage(localeId: string): string | undefined {
    if ((localeId === undefined) || (localeId === '')) {
      return undefined;
    }

    const localeSplit = localeId.split('-');
    if (localeSplit.length > 1) {
      return localeSplit[0];
    } else {
      return undefined;
    }
  }

  private genericLocaleInitializer(localeId: string): Promise<any> {
    this.traceService.info(trcModuleNameApp, `GmsLocaleIdService.genericLocaleInitializer(): Registering locale data for: ${localeId}`);

    return import(
      // eslint-disable-next-line max-len
      /* webpackInclude: /(ar-SA|bg|bg-BG|cs|cs-CZ|da|da-DK|de|de-DE|en|en-GB|en-US|es|es-ES|et|et-EE|fi|fi-FI|fr-CA|fr|fr-FR|he|he-IL|hr|hr-HR|hu|hu-HU|it|it-IT|ja|ja-JP|ko|ko-KR|nb|nb-NO|nl|nl-NL|pl|pl-PL|pt|pt-BR|pt-PT|ro|ro-RO|ru|ru-RU|sk|sk-SK|sl|sl-SI|sv|sv-SE|tr|tr-TR|uk|uk-UA|zh|zh-CN|zh-TW)\.m?js$/ */
      `/node_modules/@angular/common/locales/${localeId}`
    ).then(module => {
      registerLocaleData(module.default);
    });
  }
}
