import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flushMicrotasks, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStateService, PageNotFoundComponent, StateService } from '@gms-flex/core';
import { AppContextService, AppSettingsService, AuthenticationServiceBase, LanguageServiceBase,
  LocalizationService, MockAuthenticationService, MockLanguageService, TraceService } from '@gms-flex/services-common';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { Subject } from 'rxjs';
// Test Host Component //////

import { ApplicationComponent } from './app.component';

@Component({
  template: `
   <gms-app />
   `,
  standalone: false
})
class TestHostComponent {}

export const routerTraceModuleName = 'ng-router';

class RouterStub {
  public events: Subject<string> = new Subject<string>();
  public navigate(url: string): string { return url; }
}

describe('App component', () => {

  // Testing Vars //////
  let comp: ApplicationComponent;
  let fixture: ComponentFixture<ApplicationComponent>;

  // async beforeEach
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ApplicationComponent, PageNotFoundComponent],
      imports: [RouterTestingModule.withRoutes([
        { path: 'example', component: PageNotFoundComponent }
      ]),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: (httpClient: HttpClient): TranslateHttpLoader => new TranslateHttpLoader(httpClient, './base/www/i18n/', '.json'),
          deps: [HttpClient]
        }
      })],
      providers: [AppSettingsService, TraceService, AppContextService,
        { provide: AuthenticationServiceBase, useClass: MockAuthenticationService },
        { provide: LanguageServiceBase, useClass: MockLanguageService },
        { provide: StateService, useClass: MockStateService },
        { provide: Router, useClass: RouterStub },
        { provide: 'appSettingFilePath', useValue: 'noMatter' },
        TranslateService,
        LocalizationService, provideHttpClient(withInterceptorsFromDi())]
    }).compileComponents(); // compile template and css
  }));

  // synchronous beforeEach
  beforeEach(() => {
    fixture = TestBed.createComponent(ApplicationComponent);
    comp = fixture.componentInstance;
    // // fixture.detectChanges(); // trigger initial data binding
  });

  it('should call ApplicationComponent', () => {
    //  Cannot make XHRs from within a fake async test
  });

});

describe('App component with TestHost', () => {

  // Testing Vars //////
  let comp: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let homeInstance: ApplicationComponent;

  // async beforeEach
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ApplicationComponent, TestHostComponent, PageNotFoundComponent],
      imports: [RouterTestingModule.withRoutes([
        { path: 'example', component: PageNotFoundComponent }
      ]),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: (httpClient: HttpClient): TranslateHttpLoader => new TranslateHttpLoader(httpClient, './base/www/i18n/', '.json'),
          deps: [HttpClient]
        }
      })],
      providers: [AppSettingsService, TraceService, AppContextService,
        { provide: AuthenticationServiceBase, useClass: MockAuthenticationService },
        { provide: LanguageServiceBase, useClass: MockLanguageService },
        { provide: StateService, useClass: MockStateService },
        { provide: Router, useClass: RouterStub },
        { provide: 'appSettingFilePath', useValue: 'noMatter' },
        TranslateService,
        LocalizationService, provideHttpClient(withInterceptorsFromDi())]
    }).compileComponents(); // compile template and css
  }));

  // synchronous beforeEach
  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges(); // trigger initial data binding
    homeInstance = fixture.debugElement.children[0].componentInstance;
    comp = fixture.componentInstance;
  });

});
