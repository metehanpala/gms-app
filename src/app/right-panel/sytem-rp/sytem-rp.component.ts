import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, Inject, Input, NgZone, OnDestroy, OnInit, Self, ViewChild } from '@angular/core';
import { FullPaneId, FullQParamId, FullSnapInId, IHfwMessage, IObjectSelection, ISnapInConfig,
  MessageParameters, MobileNavigationService, QParam } from '@gms-flex/core';
import { ContextState, PropertyApiService, PropertySnapInService, PropertySnapInViewModel } from '@gms-flex/property';
import { CreateItemMenuHelper, RelatedItemBase, RelatedItemSelectionArgs, RelatedItemsViewModel,
  RelatedItemsViewModelBase, SelectionType } from '@gms-flex/related-items';
import {
  ApplicationRight,
  AppRightsService,
  BrowserObject,
  CnsHelperService,
  GmsMessageData,
  ItemProcessingServiceBase,
  LicenseOptionsService,
  MultiMonitorServiceBase,
  RelatedItemsServiceBase,
  SiIconMapperService,
  SystemBrowserServiceBase,
  SystemsResponseObject,
  SystemsServiceBase,
  ValidationHelperService
} from '@gms-flex/services';
import { CustomData, isNullOrUndefined, TraceService } from '@gms-flex/services-common';
import { GridData } from '@gms-flex/snapin-common/events/event-data.model';
import { PaneControls } from '@gms-flex/snapin-common/log-viewer/services/history-log-view.model';
import { TranslateService } from '@ngx-translate/core';
import { DateFormat, PropertyApi, SiPropertyConfig, SiPropertyService, TimeFormat } from '@simpl/buildings-ng';
import { Criterion, MenuItem, SiCollapsiblePanelComponent,
  SiDropdownDirective, SiSidePanelService, SiToastNotificationService, StatusItem } from '@simpl/element-ng';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { auditTime, take } from 'rxjs/operators';

import { RightPanelStateService } from '../right-panel-state.service';

export const systemRPModuleName = 'gmsApplication_SystemRightPanel';
const PROPERTY_PANEL_ID = 'Properties';

const logViewerSnapinId = 82;
const logViewerShowOptId = 2624;

const LOGVIEWER_PANEL_ID = 'LogViewer';
export interface ParamsSendMessage {
  fullId: FullSnapInId;
  location?: FullPaneId;
  types: string[];
  messageBody: any;
  preselection: boolean;
  qParam?: QParam;
  broadcast?: boolean;
  applyRuleId: string;
  secondarySelectionInSinglePane: boolean;
}

interface StateIcons {
  icon: string;
  secondaryIcon: string;
}

@Component({
  selector: 'gms-sytem-rp',
  templateUrl: './sytem-rp.component.html',
  styleUrl: './sytem-rp.component.scss',
  providers: [
    SiPropertyConfig,
    SiPropertyService,
    { provide: PropertyApi, useClass: PropertyApiService }
  ],
  standalone: false
})
export class SytemRPComponent implements AfterViewChecked, OnInit, OnDestroy, CreateItemMenuHelper {
  private static readonly rightPanelClass = '.full-height';

  @Input() public frameId: string;
  @Input() public parentId: string;
  @Input() public displayRelatedItems = true;
  public isFromRPComponent = true;
  public fromRightSnapin = true;
  public detailPaneHeight = '';
  public logViewerDetailPaneHeight = 0;
  public logViewerLength = 0;
  public isLogViewerEmpty = false;
  public isRightsApplicable = false;
  public logViewerHeight = '';
  public isLoadingData = false;
  public logViewerOffset = 0;
  public objectIdLogViewerNavigate: string;
  public systemIdLogViewerNavigate: number;
  public criteriaData: Criterion[];
  public systemName: string;
  public prevMessageBodyData: BrowserObject[];
  public isDetailLogLoadFirst = false;
  public isHistoryExpanded: boolean;
  public detailPaneActive: boolean;
  public dropDownRef = '';
  public dropDownRefEvents = '';
  public selectedNodeHeading = '';
  public viewId: number;
  public blockOpacity = 0;

  public navigateToLogViewer = [
    { title: 'RIGHT-PANEL.NAVIGATE-TO-LOG-VIEWER',
      action: (): void => this.navigatetoLogViewer()
    }
  ];

  public memoMenuItem: MenuItem = { title: 'Memo', icon: 'element-notes-edit', iconOnly: true, action: (): void => { this.dropdownMemo.toggle(); } };

  public origPrimaryActions: MenuItem[] = [
    { title: 'About', icon: 'element-info', iconOnly: true, action: (): void => { this.dropdown.toggle(); } },
    this.memoMenuItem
  ];

  public primaryActions = this.origPrimaryActions;
  public secondaryActions: MenuItem[];
  public validationActions: MenuItem[] = [
    { title: 'ValidationIconMenuItem', icon: 'element-activate-user', iconOnly: true }
  ];

  public statusActions: StatusItem[] = [
    {
      id: 'event-popover-btn',
      title: '',
      tooltip: '',
      icon: '',
      overlayIcon: '',
      disabled: true,
      action: (): void => this.dropdownEvents.toggle()
    }
  ];

  public snapInVm: PropertySnapInViewModel;

  public isMemoEmpty;
  public placeholderFilter: string;
  public labelAdvancedSwitch: string;
  public labelBasicSwitch: string;
  public saveErrorTitle: string;
  public commandErrorTitle: string;
  public defaultCommandErrorMesg: string;
  public noPropertiesText: string;
  public propertiesText: string;
  public differentPropertyTypesText: string;
  public multiEventsTitle: string;
  public isMobile: boolean;

  public isLoading: boolean;
  public isLoadingSpinnerEnabled: boolean;

  // to set record id of event object
  // E.g.: "System1:GmsDevice_1_72000_4194305.Alarm.OffNormal:_alert_hdl.2._value~638107035612400000~2~518"
  public eventSelectedId: string | undefined;

  // related item properties
  public relatedSnapInVm: RelatedItemsViewModelBase;
  public noRelatedItemsText: string;
  public hasComparisonPane: boolean;

  // Event popover properties
  public eventsCounter = 0;
  public events: GridData[];

  public lastHeadingOpened;
  @Input() public readonly isRightPanelExpanded: boolean;

  @ViewChild('historyOpenClose', { static: false, read: ElementRef }) public historyOpenClosed!: ElementRef;
  @ViewChild('historyOpenClose') private readonly historyOpenClose!: SiCollapsiblePanelComponent;
  @ViewChild('dropdown', { read: SiDropdownDirective }) private readonly dropdown!: SiDropdownDirective;
  @ViewChild('dropdownMemo', { read: SiDropdownDirective }) private readonly dropdownMemo!: SiDropdownDirective;
  @ViewChild('dropdownEvents', { read: SiDropdownDirective }) private readonly dropdownEvents!: SiDropdownDirective;

  private readonly subs: Subscription[] = [];
  private readonly propertyApiService: PropertyApiService;
  private appRightsLogViewer!: ApplicationRight | any;
  private isRightPanelOpen: boolean;
  public readonly trackByIndex = (index: number): number => index;

  constructor(private readonly appRightsService: AppRightsService,
    private readonly systemService: SystemsServiceBase,
    private readonly licenseOptionsServices: LicenseOptionsService,
    private readonly traceService: TraceService,
    private readonly mgsBroker: IHfwMessage,
    private readonly objectSelection: IObjectSelection,
    private readonly propertySnapInService: PropertySnapInService,
    private readonly toastNotificationService: SiToastNotificationService,
    private readonly translateService: TranslateService,
    @Self() private readonly siPropertyConfig: SiPropertyConfig,
    @Self() propertyApi: PropertyApi,
    private readonly ngZone: NgZone,
    private readonly riService: RelatedItemsServiceBase,
    private readonly itemProcService: ItemProcessingServiceBase,
    private readonly iconMapperService: SiIconMapperService,
    private readonly cnsHelperService: CnsHelperService,
    private readonly snapinConfig: ISnapInConfig,
    private readonly rightPanelState: RightPanelStateService,
    private readonly systemBrowserService: SystemBrowserServiceBase,
    private readonly rightPanelService: SiSidePanelService,
    private readonly cdRef: ChangeDetectorRef,
    private readonly validationHelperService: ValidationHelperService,
    @Inject(MobileNavigationService) private readonly mobileNavigationService: MobileNavigationService) {
    this.isFromRPComponent = true;

    // Get the browser locale
    const browserLocale = this.translateService.getBrowserLang();

    // The PropertyApiService is provided to the SiPropertyService injected into the si-property-viewercomponent.
    // It must be initialized with the SNI view-model during local component initialization in order to process
    // get-property and property-command requests from the child si-property-viewer component.
    this.propertyApiService = propertyApi as PropertyApiService;

    // The SiPropertyConfig service is shared with the si-property-viewer component and holds component configuration information.
    this.siPropertyConfig.update({
      dateFormat: browserLocale === 'en' ? DateFormat.DF_MMDDYYYY_FSLASH : DateFormat.DF_DDMMYYYY_FSLASH,
      timeFormat: TimeFormat.TWELVE });
  }

  public ngOnInit(): void {

    this.receivePreSelection();
    this.isFromRPComponent = true;

    this.dropDownRef = '#' + this.parentId + ' .rpanel-wrapper > .rpanel-header';
    this.dropDownRefEvents = '.rpanel-content';
    this.snapInVm = this.propertySnapInService.registerViewModel('system-right-panel');

    this.relatedSnapInVm = this.registerViewModel('system-right-panel', this.ngZone);
    if (!this.snapInVm) {
      throw new Error('view-model registration failed');
    }
    // Initialize the propertyApiService to process si-property-viewer component requests
    this.propertyApiService.initialize(this.traceService, this.snapInVm);
    this.propertyApiService.commandError
      .subscribe(errMesg => {
        this.toastNotificationService.queueToastNotification('danger', this.commandErrorTitle, errMesg || this.defaultCommandErrorMesg);
      });

    // Set locale for formatting numeric and date-time values (from browser setting)
    this.snapInVm.setLocale(this.translateService.getBrowserLang());
    this.translateService.get('RIGHT-PANEL.FILTER-PLACEHOLDER').subscribe(s => this.placeholderFilter = s);
    this.translateService.get('RIGHT-PANEL.ADVANCED-SWITCH-LABEL').subscribe(s => this.labelAdvancedSwitch = s);
    this.translateService.get('RIGHT-PANEL.BASIC-SWITCH-LABEL').subscribe(s => this.labelBasicSwitch = s);
    this.translateService.get('RIGHT-PANEL.SAVE-ERROR-TITLE').subscribe(s => this.saveErrorTitle = s);
    this.translateService.get('RIGHT-PANEL.COMMAND-ERROR-TITLE').subscribe(s => this.commandErrorTitle = s);
    this.translateService.get('RIGHT-PANEL.COMMAND-ERROR-MESSAGE-DEFAULT').subscribe(s => this.defaultCommandErrorMesg = s);
    this.translateService.get('RIGHT-PANEL.NO-PROPERTIES').subscribe(s => this.noPropertiesText = s);
    this.translateService.get('RIGHT-PANEL.PROPERTIES').subscribe(s => this.propertiesText = s);
    this.translateService.get('RIGHT-PANEL.DIFFERENT-PROPERTY-TYPES').subscribe(s => this.differentPropertyTypesText = s);
    this.translateService.get('RIGHT-PANEL.EVENT-POPOVER-EVENTS').subscribe(s => this.multiEventsTitle = s);
    this.translateService.get('RIGHT-PANEL.EVENT-POPOVER-EVENTS-TOOLTIP').subscribe(s => this.statusActions[0].tooltip = s);

    // Related Items begin.
    // Load language dependent strings
    this.translateService.get('RIGHT-PANEL.NO-RELATED-ITEMS').subscribe(s => this.noRelatedItemsText = s);

    // Subscribe to changes in the availability of a "comparison-pane" in the layout
    this.snapinConfig.paneCanBeDisplayed(this.frameId, 'comparison-pane')
      // .pipe(
      //   takeUntil(this.destroyInd))
      .subscribe(
        val => {
          this.hasComparisonPane = val;
        });

    // In the event VM data is changed outside of Angular change detection, manually trigger
    // change detection in order to keep UI control data bindings up to date.
    // Indications to this handler are throttled to avoid rapid CD cycles.
    this.relatedSnapInVm.dataChangedUndetected
      .pipe(
        auditTime(100)
        // takeUntil(this.destroyInd)
      )
      .subscribe(
        () => {
          this.cdRef.detectChanges();
        });
    // end.

    // get related items config
    this.getHldlConfigs();

    this.subs.push(this.mgsBroker.getRightPanelMessage(this.frameId).subscribe(
      (m => {
        if (m != null) {
          this.systemIdLogViewerNavigate = m?.data[0]?.SystemId ?? null;
          this.traceService.debug(systemRPModuleName, 'message arrived.', m);
          this.receiveMessage(m);
        }
      })
    ));
    this.subs.push(this.objectSelection.getRightPanelSelectedObject(this.frameId).subscribe(
      (info => {
        this.selectedNodeHeading = info?.title;
      })
    ));

    this.snapInVm.loading.subscribe(loading => {
      this.isLoading = loading;
      if (this.isLoading) {
        // Delay showing the spinner until we have been waiting a short period of time.
        // This avoids the spinner "blinking" quickly in/out of view on every selection no
        // matter how quickly the new context loads.
        setTimeout(() => this.isLoadingSpinnerEnabled = this.isLoading, 800);
      } else {
        this.isLoadingSpinnerEnabled = false;
      }
    });

    this.rightPanelService.isOpen$.subscribe(isOpen => {
      this.isRightPanelOpen = isOpen;
      if (isOpen && this.historyOpenClose?.opened && this.logViewerOffset) {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.historyOpenClosed.nativeElement.getElementsByClassName('collapsible-content')[0].scrollTop = this.logViewerOffset;
          }, 200);
        });
      } else if (!isOpen && this.lastHeadingOpened === 'LogViewer') {
        this.logViewerOffset =
          this.historyOpenClosed.nativeElement.getElementsByClassName('collapsible-content')[0].scrollTop;
      }
    });

    // Mobile Only Visibility
    this.isMobile = this.mobileNavigationService.mobileOnlyVisibilityLast;

    this.subs.push(this.mobileNavigationService.mobileOnlyVisibility$.subscribe((mobileOnlyVisibility: boolean) => {
      this.isMobile = mobileOnlyVisibility;
    }));

  }

  public ngAfterViewChecked(): void {
    this.onRightPanelExpandCollapse(this.isRightPanelOpen);
  }

  public receivePreSelection(): void {
    forkJoin({
      requestOne: this.getShowRights(),
      requestTwo: this.getLicenseOptionsRight()
    })
      .subscribe(({ requestOne, requestTwo }) => {
        this.isRightsApplicable = requestOne && requestTwo;
      });
  }

  public onPropertyToggle(): void {
    this.lastHeadingOpened = PROPERTY_PANEL_ID;
  }

  public onRelatedToggle(heading: string): void {
    this.lastHeadingOpened = heading;
  }

  public ngOnDestroy(): void {
    this.subs.forEach(subscription => {
      if (subscription !== null) {
        subscription.unsubscribe();
      }
    });

    if (!isNullOrUndefined(this?.snapInVm?.detailProperty?.objectFilter)) {
      this.snapInVm.detailProperty.objectFilter = '';
    }

    this.snapInVm.propertyFilter = '';
  }

  /**
   * Handles the expand and collapse events of the right panel.
   * Adjusts the size and state of the right panel, as well as performs
   * additional actions based on the panel's open or closed status.
   *
   * @param isOpen A boolean indicating whether the right panel is being expanded (true) or collapsed (false).
   */
  public onRightPanelExpandCollapse(isOpen: boolean): void {
    // Select the right panel element using its class
    const element = document.querySelector(SytemRPComponent.rightPanelClass) as HTMLElement;

    // Run the following operations outside of the Angular zone for performance optimization
    this.ngZone.runOutsideAngular(() => {
      // Set a timeout to delay the adjustments for a smoother visual transition
      setTimeout(() => {
        // Adjust the blockSize property of the right panel based on its open or closed status
        // At the moment it is handled like this to stop inconsistent behavior on Safari.
        if (element) {
          element.style.blockSize = isOpen ? '100%' : '0%';

          // If in mobile view, update the right panel state in the mobile navigation service
          // for configureView() adjustments in mobile-view.component
          if (this.isMobile) {
            this.mobileNavigationService.setRightPanelState(isOpen);
          }
        }
      }, 100);
    });
  }

  public onLogViewerToggle(): void {
    this.lastHeadingOpened = LOGVIEWER_PANEL_ID;
    // if node is selected
    // And history panel is opened for the first time
    this.isHistoryExpanded = !this.isHistoryExpanded;
    this.isDetailLogLoadFirst = false;
    if (!this.isHistoryExpanded) {
      this.logViewerOffset = this.historyOpenClosed.nativeElement.getElementsByClassName('collapsible-content')[0].scrollTop;
    }
    this.isDetailActive(this.detailPaneActive);

  }

  public setPrimaryActionMenuItems(): void {
    const objectList: BrowserObject[] = this?.snapInVm?.contextObjectList || [];
    this.primaryActions = this.origPrimaryActions;

    if (objectList.length != 0) {
      this.validationHelperService.getRequiresValidation(this.snapInVm.contextObjectList).subscribe({
        next: (isValidationRequired: boolean) => {
          if (isValidationRequired) {
            this.primaryActions = [...this.validationActions, ...this.origPrimaryActions];
            this.cdRef.detectChanges();
          }
        },
        error: (err: any) => {
          this.traceService.error('Could not retrieve validation status for side panel');
        }
      });
    }
  }

  public logTableDataLength(length: number): void {
    this.logViewerLength = length;
    if (length <= 0) {
      this.isLogViewerEmpty = true;
      this.logViewerHeight = '';
    } else {
      this.logViewerLength = length;
      this.isLogViewerEmpty = false;
      this.logViewerHeight = (length * 104 + 69) + 'px';
    }
  }

  public historyDataFetched(dataFetched: boolean): void {
    this.isLoadingData = dataFetched;
    this.blockOpacity = dataFetched ? 0 : 1;
  }

  public paneControls(event: PaneControls): void {
    this.logViewerDetailPaneHeight = 130 + ((event.noOfSections - 1) * 34) + (event.noOfControls * 58);
    this.isDetailActive(true);
  }

  public criteriaLocLogViewer(criteria: Criterion[]): void {
    this.criteriaData = criteria;
  }

  public isDetailActive(event: boolean): void {
    if (event) {
      this.detailPaneActive = true;
      this.logViewerOffset = this.historyOpenClosed.nativeElement.getElementsByClassName('collapsible-content')[0].scrollTop;
      this.logViewerHeight = this.logViewerDetailPaneHeight + 'px';
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.historyOpenClosed.nativeElement.getElementsByClassName('collapsible-content')[0].scrollTop = 0;
        }, 200);
      });
    } else {
      this.detailPaneActive = false;
      if (this.logViewerLength) {
        this.logViewerHeight = (this.logViewerLength * 104 + 69) + 'px';
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.historyOpenClosed.nativeElement.getElementsByClassName('collapsible-content')[0].scrollTop = this.logViewerOffset;
          }, 200);
        });
      }
    }
  }

  public onMemoEmptyStateChanged(event: boolean): void {
    this.memoMenuItem = { ...this.memoMenuItem, badgeDot: !event };
    const memoIndex = this.primaryActions.findIndex(i => i.title === 'Memo');
    if (memoIndex >= 0) {
      this.primaryActions[memoIndex] = this.memoMenuItem;
    }
  }

  public togglePropertyList(): void {
    if (this.snapInVm) {
      this.snapInVm.showPropertyListExt = !this.snapInVm.showPropertyListExt;
    }
  }

  public get filterPattern(): string {
    if (!this.snapInVm) {
      return undefined;
    }
    return this.snapInVm.detailProperty ? this.snapInVm.detailProperty.objectFilter : this.snapInVm.propertyFilter;
  }

  public get switchLabel(): string {
    let lab = '';
    if (this.snapInVm) {
      lab = this.snapInVm.showPropertyListExt ? this.labelAdvancedSwitch : this.labelBasicSwitch;
    }
    return lab;
  }

  public get isPropertyListEmpty(): boolean {
    if (!(this.snapInVm && this.snapInVm.contextState !== ContextState.Empty)) {
      return false;
    }
    const propListLen: number = this.snapInVm.siPropertyList?.length || 0;
    const bulkListLen: number = this.snapInVm.siBulkPropertyList?.length || 0;
    return this.snapInVm.contextState === ContextState.SingleObject ? propListLen === 0 : bulkListLen === 0;
  }

  public get propertyListEmptyText(): string {
    return this.snapInVm.contextState === ContextState.MultiObjectDifferent ? this.differentPropertyTypesText : this.noPropertiesText;
  }

  public get isMemoEnabled(): boolean {
    return this.snapInVm?.contextState === ContextState.SingleObject;
  }

  public onFilterChange(filter: string): void {
    if (this.snapInVm.detailProperty) {
      this.snapInVm.detailProperty.objectFilter = filter;
    } else {
      this.snapInVm.propertyFilter = filter;
    }
  }

  // related items methods begin

  public get isRelatedItemsEmpty(): boolean {
    if (this.relatedSnapInVm && (this.relatedSnapInVm.loadingItems || this.relatedSnapInVm.relatedItemGroups.length > 0)) {
      return false; // either in the process of loading items, or there are more than zero related items loaded
    }
    return true;
  }

  public get menuHelper(): CreateItemMenuHelper {
    return this;
  }

  public selectNewItem(inst: any, selectionType: SelectionType): void {
    this.onItemSelected(new RelatedItemSelectionArgs(inst, selectionType));
  }

  public getMenuItemCreateText(): Observable<string> {
    return this.translateService.get('RIGHT-PANEL.NEW-ITEM-MENU');
  }

  public getMenuItemNewText(inst: any, selectionType: SelectionType): Observable<string> {
    const ri: RelatedItemBase = inst as RelatedItemBase;
    if (!ri) {
      return of(undefined);
    }
    let resp: Observable<string> = of('');
    switch (selectionType) {
      case SelectionType.SendToPrimary:
        resp = this.isMobile ? this.translateService.get('RIGHT-PANEL.NEW-ITEM-MOBILE', { itemLabel: ri.itemLabel }) :
          this.translateService.get('RIGHT-PANEL.NEW-ITEM-IN-PRIMARY', { itemLabel: ri.itemLabel });
        break;
      case SelectionType.SendToSecondary:
        resp = this.translateService.get('RIGHT-PANEL.NEW-ITEM-IN-SECONDARY', { itemLabel: ri.itemLabel });
        break;
      default:
        break;
    }
    return resp;
  }

  public onItemSelected(args: RelatedItemSelectionArgs): void {
    if (!(args?.item)) {
      return;
    }
    if (args.selectionType === SelectionType.OpenInNewTab) {
      this.relatedSnapInVm.openInTab(args.item);
    } else {
      const sendToSecondary: boolean = args.selectionType === SelectionType.SendToSecondary;
      this.sendSelectionMessage(args.item.objectRef, sendToSecondary, 'related-items');
    }
    // Close right side-panel automatically on mobile screen
    if (this.isMobile) {
      this.rightPanelService.close();
    }
  }
  // end

  public receiveMessage(messageBody: GmsMessageData): boolean {
    this.isLogViewerEmpty = false;
    this.processReceivedMessage(messageBody);
    // 0 = explicit selection type of None. Used when alarms are reset for example.
    if (messageBody?.selectionType === 0 || messageBody?.data?.length === 0) {
      this.snapInVm.setContext(undefined);
      this.eventSelectedId = undefined;
      this.setPopoverToDefault();
      return;
    }
    if (messageBody?.data?.length > 0) {
    // if event list snapin is selected we got selectionType = 1
    // we are setting evnt record id for sending to logviewer which will pass as
    // additionalinfo for fetching history data specific to event snapin
      if (messageBody.selectionType === 1) {
        this.eventSelectedId = messageBody.customData?.[0].id;
      }
      this.viewId = messageBody?.data[0]?.ViewId;
      this.snapInVm.setContext(undefined);
      this.snapInVm.setContext(messageBody.data);
      this.setPrimaryActionMenuItems();
    }

    // To check the change in message broker data.
    // If message broker data is changed as compared to previous data
    // Means detail Log is loading for the first time.
    // Hence, setting isDetailLogLoadFirst flag as true.
    if (JSON.stringify(this.prevMessageBodyData) !== JSON.stringify(messageBody.data)) {
      this.isDetailLogLoadFirst = true;
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          if (this.historyOpenClosed) {
            this.historyOpenClosed.nativeElement.getElementsByClassName('collapsible-content')[0].scrollTop = 0;
          }
        }, 200);
      });
    }

    // detail Log is loading for the first time.

    // when object is getting changed and history is expanded

    if (this.isDetailLogLoadFirst && !this.historyOpenClose?.opened) {
      this.isHistoryExpanded = false;
      this.isDetailLogLoadFirst = true;
    } else if (this.isDetailLogLoadFirst && this.historyOpenClose?.opened) {
      this.isHistoryExpanded = true;
    }

    this.prevMessageBodyData = messageBody.data;
  }

  public onEventsCounterChange(eventsNum: number): void {
    this.eventsCounter = eventsNum;
    const evtPopoverBtn = this.statusActions.find(itm => itm.id === 'event-popover-btn');

    evtPopoverBtn.disabled = eventsNum < 1;
  }

  public onEventsChange(events: GridData[]): void {
    this.events = events;
    const evtPopoverBtn = this.statusActions.find(itm => itm.id === 'event-popover-btn');

    if (events.length > 0) {
    // if (events.length === 1){
      const ev = events[0];
      const srcState = ev?.cellData?.get('srcState');
      const srcStateText = Array.isArray(srcState) ? srcState[0] : srcState;
      const state = ev?.cellData?.get('state');
      const stateText = Array.isArray(state) ? state[0] : state;
      const iconClasses = this.getSourceStateIcons(srcState, state[0]);

      evtPopoverBtn.title = `${ srcStateText }\n${ stateText }`;
      evtPopoverBtn.icon = iconClasses.icon;
      evtPopoverBtn.overlayIcon = iconClasses.secondaryIcon;
    } else {
      evtPopoverBtn.title = `${this.multiEventsTitle}: ${events.length}`;
    }
  }

  public onPopoverClose(ev): void {
    this.dropdownEvents.close();
  }

  public navigatetoLogViewer(): void {
    this.subs.push(this.systemService.getSystemsExt().subscribe((sys: SystemsResponseObject) => {
      const systemName = sys?.Systems.filter(s => s.Id === this.systemIdLogViewerNavigate)[0]?.Name ?? '';
      this.objectIdLogViewerNavigate = systemName + ':LogViewer';
      this.sendSelection(this.objectIdLogViewerNavigate, 'log-viewer');
    }));

    // Close right side-panel automatically on mobile screen
    if (this.isMobile) {
      this.rightPanelService.close();
    }
  }

  private setPopoverToDefault(): void {
    const evtPopoverBtn = this.statusActions.find(itm => itm.id === 'event-popover-btn');

    evtPopoverBtn.icon = 'dot text-muted text-center';
    evtPopoverBtn.overlayIcon = '';
    evtPopoverBtn.disabled = true;
  }

  private getShowRights(): Observable<boolean> {
    this.appRightsLogViewer = this.appRightsService.getAppRights(logViewerSnapinId);
    // check if show rights are available
    return (this.appRightsLogViewer?.Operations.find((appRight: any) => appRight.Id === logViewerShowOptId))
      ? of(true)
      : of(false);
  }

  private getLicenseOptionsRight(): Observable<boolean> {
    const licensOptionsDocument = this.licenseOptionsServices.getLicenseOptionsRights('sbt_gms_opt_logviewer');
    if (!isNullOrUndefined(licensOptionsDocument)) {
      if (licensOptionsDocument!.Available === -1) {
        return of(true);
      } else if (licensOptionsDocument!.Available === 0) {
        return of(false);
      } else {
      // required <= assigned
        return licensOptionsDocument!.Required <= (licensOptionsDocument!.Available) ? of(true) : of(false);
      }
    }
    return of(false);
  }

  private getSourceStateIcons(sourceState: string, eventState: string): StateIcons {
    const icons = { icon: '', secondaryIcon: undefined };
    if (sourceState === 'Quiet') {
      if (this.isEventAcked(eventState)) {
        icons.icon = 'element-alarm-background text-body';
        icons.secondaryIcon = 'element-alarm-tick text-body';
      } else {
        icons.icon = 'element-alarm text-body';
      }
    } else {
      if (this.isEventAcked(eventState)) {
        icons.icon = 'element-alarm-background-filled event-info-source-icon-active-color';
        icons.secondaryIcon = 'element-alarm-tick text-body';
      } else {
        icons.icon = 'element-alarm-filled event-info-source-icon-active-color';
      }
    }

    return icons;
  }

  private isEventAcked(eventState: string): boolean {
    switch (eventState) {
      case 'Unprocessed':
      case 'UnprocessedWithTimer': {
        return false;
      }
      default: {
        return true;
      }
    }
  }

  private getHldlConfigs(): void {
    const relatedFullId = new FullSnapInId(this.frameId, 'related');
    const hldlConfigs: any = this.snapinConfig.getSnapInHldlConfig(relatedFullId, null);
    if (hldlConfigs) {
      // Read list of managed types that are treated specially (exceptions to normal treatment)
      if (hldlConfigs.exceptions && Array.isArray(hldlConfigs.exceptions)) {
        const exceptionArr: any[] = hldlConfigs.exceptions;
        const newArr: string[] = [];
        const hiddenArr: string[] = [];
        exceptionArr.forEach(item => {
          if (item?.managedTypeName) {
            if (item.new === true) {
              newArr.push(item.managedTypeName);
            }
            if (item.hide === true) {
              hiddenArr.push(item.managedTypeName);
            }
          }
        });
        this.relatedSnapInVm.config.newTypes = newArr;
        this.relatedSnapInVm.config.hiddenTypes = hiddenArr;
      }
    }
  }

  private registerViewModel(id: string, ngZone?: NgZone): RelatedItemsViewModelBase {
    if (!id) {
      throw new Error('invalid sniId');
    }
    let vm: RelatedItemsViewModel = this.rightPanelState.getComponentState(id) as RelatedItemsViewModel;
    if (!vm) {
      this.traceService.info(systemRPModuleName, `Create new VM: id=[${id}]`);
      vm = new RelatedItemsViewModel(
        id,
        ngZone,
        this.riService,
        this.itemProcService,
        this.iconMapperService,
        this.cnsHelperService,
        this.traceService);
      this.rightPanelState.setComponentState(id, vm);
    }
    return vm;
  }

  private processReceivedMessage(msg: GmsMessageData): void {
    if (!(msg?.data)) {
      return;
    }
    let boArr: BrowserObject[];
    if (msg.selectionType !== 0) { // 0 = explicit selection type of 'None'; ignore message data!
      boArr = msg.data;
    }
    this.relatedSnapInVm.setContext(boArr).subscribe(
      () => {
        this.checklastHeadingOpened();
      },
      err => this.traceService.error(systemRPModuleName, 'Failed to set context: %s', err));
  }

  private checklastHeadingOpened(): void {
    if (this.lastHeadingOpened && this.lastHeadingOpened !== PROPERTY_PANEL_ID) {
      if (this.relatedSnapInVm.relatedItemGroups?.length <= 0 ||
          this.relatedSnapInVm.relatedItemGroups.findIndex(g => g.groupLabel === this.lastHeadingOpened) < 0) {
        // use property panel as fallback.
        // this.lastHeadingOpened = PROPERTY_PANEL_ID;
      }
    }
  }

  private sendSelectionMessage(bo: BrowserObject, secondaryPane: boolean, frame: string): void {
    this.traceService.info(systemRPModuleName, 'Send selection message: bo=%s, secondaryPane=%s', bo ? bo.Designation : undefined, secondaryPane);
    if (!bo) {
      return;
    }
    let applyRuleId;
    const boArr: BrowserObject[] = [bo];
    const messageTypes: string[] = boArr.map(item => item.Attributes ? bo.Attributes.ManagedTypeName : '');
    const data: GmsMessageData = new GmsMessageData(boArr);

    if (this.relatedSnapInVm.context) {
      data.customData = this.relatedSnapInVm.context.slice(0);
    }
    applyRuleId = secondaryPane ? 'SecondarySelection' : undefined;
    if (frame === 'log-viewer') {
      applyRuleId = 'new-primary-selection';
      data.customData = this.criteriaData;
    }

    const fullQParamId = new FullQParamId('system-manager', 'SystemQParamService', 'primary');
    const qParamValue: QParam = { name: fullQParamId.fullId(), value: boArr[0].Designation };
    const message: MessageParameters = {
      messageBody: data,
      qParam: qParamValue,
      types: messageTypes
    };

    if (this.frameId === 'system-manager') {
      this.mgsBroker.sendMessageFromRightPanel('right-panel-related-item',
        this.frameId,
        frame,
        messageTypes,
        data,
        true,
        undefined,
        false,
        applyRuleId,
        false).subscribe(
        res => this.traceService.debug(systemRPModuleName, 'sendMessage completed: result=%s', res),
        err => this.traceService.debug(systemRPModuleName, 'sendMessage error: %s', err)
      );
    }
    if (this.frameId === 'event-list') {
      this.mgsBroker.switchToNextFrame(fullQParamId.frameId, message).pipe(take(1)).subscribe((frameChanged: boolean) => {
        this.traceService.debug(systemRPModuleName, 'goToSystem() completed. result: %s', frameChanged);
      });
    }
  }

  private sendSelection(objectId: string, receivedRuleName?: string): void {
    if (objectId) {
      this.systemBrowserService.searchNodeMultiple(this.systemIdLogViewerNavigate, [objectId]).subscribe(nodes => {
        const navigationBrowserObject: BrowserObject[] = [nodes[0].Nodes[0]];
        this.sendSelectionMessage(navigationBrowserObject[0], false, receivedRuleName);
      });
    }
  }
}
