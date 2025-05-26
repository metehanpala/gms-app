import { title } from 'process';

import { EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IHfwMessage } from '@gms-flex/core';
import { PropertyApiService, PropertySnapInService } from '@gms-flex/property';
import { AppRightsService, CnsHelperService, CnsLabel, ItemProcessingServiceBase, LicenseOptionsService, MultiMonitorServiceBase,
  RelatedItemsServiceBase, SiIconMapperService, SystemBrowserServiceBase } from '@gms-flex/services';
import { MockTraceService, TraceService } from '@gms-flex/services-common';
import { TranslateService } from '@ngx-translate/core';
import { SiAccordionModule, SiContentActionBarModule, SiEmptyStateModule, SiLoadingSpinnerModule,
  SiSidePanelModule, SiSwitchModule, SiToastNotificationService } from '@simpl/element-ng';
import { Observable, of } from 'rxjs';

import { RightPanelStateService } from '../right-panel-state.service';
import { SytemRPComponent } from './sytem-rp.component';

describe('SytemRPComponent', () => {
  let component: SytemRPComponent;
  let fixture: ComponentFixture<SytemRPComponent>;

  let propertySnapInServiceStub: Partial<PropertySnapInService>;
  let propertyApiServiceStub: Partial<PropertyApiService>;
  let siToastNotificationServiceStub: Partial<SiToastNotificationService>;
  let translateServiceStub: Partial<TranslateService>;
  let appRightsServiceStub: Partial<AppRightsService>;
  let licenseOptionsServiceStub: Partial<LicenseOptionsService>;
  let relatedItemsServiceBaseStub: Partial<RelatedItemsServiceBase>;
  let itemProcessingServiceBaseStub: Partial<ItemProcessingServiceBase>;
  let siIconMapperServiceStub: Partial<SiIconMapperService>;
  let cnsHelperServiceStub: Partial<CnsHelperService>;
  let rightPanelStateServiceStub: Partial<RightPanelStateService>;
  let systemBrowserServiceBaseStub: Partial<SystemBrowserServiceBase>;
  let multiMonitorServiceBaseStub: Partial<MultiMonitorServiceBase>;
  let appIHfwMessageStub: Partial<IHfwMessage>;
  let mockMessageBroker: IHfwMessage;
  let mockPropertySnapInService: PropertySnapInService;
  let mockPropertyApiService: PropertyApiService;
  let mockTraceService: TraceService;
  let mockToastNotificationService: SiToastNotificationService;
  let mockTranslateService: TranslateService;
  let mockAppRightsService: AppRightsService;
  let mockLicenseOptionsServices: LicenseOptionsService;
  let mockRiService: RelatedItemsServiceBase;
  let mockItemProcService: ItemProcessingServiceBase;
  let mockIconMapperService: SiIconMapperService;
  let mockCnsHelperService: CnsHelperService;
  let mockRightPanelState: RightPanelStateService;
  let mockSystemBrowserService: SystemBrowserServiceBase;
  let mockMultiMonitorService: MultiMonitorServiceBase;

  beforeEach(async () => {

    translateServiceStub = {
      onLangChange: new EventEmitter(),
      onTranslationChange: new EventEmitter(),
      onDefaultLangChange: new EventEmitter(),
      defaultLang: 'langs',
      get: (): Observable<string> => of('passed'),
      use: (lang: string): Observable<string> => of('passed'),
      setDefaultLang: (lang: string): void => { translateServiceStub.defaultLang = lang; },
      getBrowserLang: (): string => ''
    };

    systemBrowserServiceBaseStub = jasmine.createSpyObj('appSystemBrowserServiceStub', ['searchNodeMultiple']);

    cnsHelperServiceStub = {
      get activeCnsLabel(): Observable<CnsLabel> { return of(new CnsLabel()); }
    };

    appIHfwMessageStub = {
      getMessage: (): Observable<any> => of()
    };

    TestBed.configureTestingModule({
      imports: [
        SiContentActionBarModule,
        SiSwitchModule,
        SiLoadingSpinnerModule,
        SiEmptyStateModule,
        SiAccordionModule,
        SiSidePanelModule
      ],
      // schemas: [NO_ERRORS_SCHEMA],
      declarations: [SytemRPComponent],
      providers: [
        { provide: PropertySnapInService, useValue: propertySnapInServiceStub },
        { provide: PropertyApiService, useValue: propertyApiServiceStub },
        { provide: TraceService, useClass: MockTraceService },
        { provide: SiToastNotificationService, useValue: siToastNotificationServiceStub },
        { provide: TranslateService, useValue: translateServiceStub },
        { provide: AppRightsService, useValue: appRightsServiceStub },
        { provide: LicenseOptionsService, useValue: licenseOptionsServiceStub },
        { provide: RelatedItemsServiceBase, useValue: relatedItemsServiceBaseStub },
        { provide: ItemProcessingServiceBase, useValue: itemProcessingServiceBaseStub },
        { provide: SiIconMapperService, useValue: siIconMapperServiceStub },
        { provide: CnsHelperService, useValue: cnsHelperServiceStub },
        { provide: RightPanelStateService, useValue: rightPanelStateServiceStub },
        { provide: SystemBrowserServiceBase, useValue: systemBrowserServiceBaseStub },
        { provide: MultiMonitorServiceBase, useValue: multiMonitorServiceBaseStub },
        { provide: IHfwMessage, useValue: appIHfwMessageStub }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(SytemRPComponent);
    component = fixture.debugElement.componentInstance;
    mockTraceService = TestBed.inject(TraceService);
    fixture.detectChanges();

  });

  it('should create', () => {
    fixture = TestBed.createComponent(SytemRPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeDefined();
    fixture.detectChanges();
  });

  it('should check navigate to log-viewer called', () => {
    const spy = spyOn(component as any, 'navigatetoLogViewer');
    expect(spy).toHaveBeenCalled();
    fixture.detectChanges();
  });

  it('should check navigate to log-viewer has called selected Node', () => {
    const sendSelectionSpy = spyOn(component as any, 'sendSelection');
    (component as any).navigatetoLogViewer();
    fixture.detectChanges();
    const objectIdLogViewerNavigate = 'System1:LogViewer';
    expect(sendSelectionSpy).toHaveBeenCalledWith(objectIdLogViewerNavigate, 'log-viewer');
    fixture.detectChanges();
  });

  // it('should check navigating in system-browser', () => {
  //   const sendSelectionSpy = spyOn(component as any, 'sendSelection');
  //   const sendSelectionMessageSpy = spyOn(component as any, 'sendSelectionMessage');
  //   (component as any).navigatetoLogViewer();
  //   fixture.detectChanges();
  //   const objectIdLogViewerNavigate='System1:LogViewer';
  //   expect(sendSelectionSpy).toHaveBeenCalledWith(objectIdLogViewerNavigate, 'log-viewer');
  //   (component as any).objectId = 'System1:LogViewer';
  //   expect(sendSelectionMessageSpy).toHaveBeenCalled();
  //   fixture.detectChanges();
  // });

});
