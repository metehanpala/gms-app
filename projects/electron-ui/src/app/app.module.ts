import { NgModule, inject, provideAppInitializer } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { SiDropdownModule, SiLandingPageModule, SiMenuLegacyModule, SiPopoverModule } from '@simpl/element-ng';
import { SiTranslateNgxTModule } from '@simpl/element-ng/ngx-translate';
import { NgxDatatableModule } from '@siemens/ngx-datatable';

import { AppComponent } from './app.component';
import { LocalisationService, SharedModule } from './shared';
import { EndpointConfigurationComponent } from './pages/endpoint/endpoint-configuration.component';
import { CertificateErrorComponent } from './pages/certificate-error/certificate-error.component';
import { ConnectionErrorComponent } from './pages/connection-error/connection-error.component';
import { CertificateListComponent } from './pages/certificate-list/certificate-list.component';
import { UpdateInfoComponent } from './pages/update/update-info.component';
import { ElectronTitleBarComponent } from './title-bar/electron-title-bar.component';
import { AppRoutingModule } from './app-routing.module';
import { LandingComponent } from './pages/landing/landing.component';

export function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

export const initLocalization = (localisationService: LocalisationService): any => {
  return (): any => localisationService.init().toPromise();
};

@NgModule({ declarations: [
        AppComponent,
        CertificateErrorComponent,
        EndpointConfigurationComponent,
        ConnectionErrorComponent,
        CertificateListComponent,
        UpdateInfoComponent,
        ElectronTitleBarComponent,
        LandingComponent
    ],
    exports: [RouterModule],
    bootstrap: [AppComponent], imports: [BrowserAnimationsModule,
        AppRoutingModule,
        SiDropdownModule,
        SiLandingPageModule,
        SiMenuLegacyModule,
        SiPopoverModule,
        SiTranslateNgxTModule,
        NgxDatatableModule,
        SharedModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (createTranslateLoader),
                deps: [HttpClient]
            }
        })], providers: [
        provideAppInitializer(() => {
        const initializerFn = (initLocalization)(inject(LocalisationService));
        return initializerFn();
      }),
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule {}
