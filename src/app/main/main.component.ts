import { CdkPortal } from '@angular/cdk/portal';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ChildrenId, FrameInfo, HfwFrame, IHfwMessage, ISnapInConfig, MobileNavigationService, PrimaryBarConfig, PrimaryItem,
  StateService, VerticalBarConfig, VerticalBarItem } from '@gms-flex/core';
import { NavBarPrimaryComponent, UtilityPanelsEn } from '@gms-flex/navigation-bar';
import { AppRightsService, GraphicsCommonTemplateServiceBase, LicenseOptionsService, MultiMonitorServiceBase, Operation } from '@gms-flex/services';
import { isNullOrUndefined, NotificationServiceBase, ProductInfo, ProductService, SettingsServiceBase, TraceService } from '@gms-flex/services-common';
import { EventsCommonServiceBase } from '@gms-flex/snapin-common';
import { MenuItem, NavbarItem, SiSidePanelService } from '@simpl/element-ng';
import { ShutdownInfo } from 'desktop-main/src/messaging/window-message.data';
import { Subscription } from 'rxjs';

import { DesktopMessageService, trcModuleNameDesktop } from '../desktop-renderer/messaging/desktop-message.service';
import { ManagerType } from '../desktop-renderer/multi-monitor/multi-monitor-configuration.data';
import { RightPanelStateService } from '../right-panel/right-panel-state.service';
import { SytemRPComponent } from '../right-panel/sytem-rp/sytem-rp.component';
import { TitleBarService } from '../title-bar/title-bar.service';
import { PrimaryItemStore } from './primary-item.store';

export const NAVBAR_RESOURCE_KEY = 'NAVBAR.';

@Component({
  selector: 'gms-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  standalone: false
})
export class MainComponent implements AfterViewInit, OnInit, OnDestroy {

  private static readonly queryMobileVerticalBarDrawer = `[class*="${'collapse-toggle mobile-drawer'}"]`;
  @ViewChild('graphicsCommon', { static: true }) public graphicsCommonTemplate: TemplateRef<any>;

  @HostBinding('class') public get classAttribute(): string {
    if (this.desktopMessageService.runsInElectron) {
      return 'gms-has-navbar-titlebar-fixed-top si-layout-fixed-height h-100';
    } else {
      return 'has-navbar-fixed-top si-layout-fixed-height h-100';
    }
  }

  public get runsInElectron(): boolean { return this.desktopMessageService.runsInElectron; }

  public frames: HfwFrame[];
  public primaryItems: NavbarItem[] = [];
  public currentVerticalItems: NavbarItem[];

  public isVerticalVisible = false;
  public isMainManager: boolean;

  public currentFrameId: string;
  public rightPanelExpandFlag: boolean;

  @ViewChild('systemRP', { read: SytemRPComponent }) public systemRP!: SytemRPComponent;
  @ViewChild('navbar', { read: NavBarPrimaryComponent }) public navbar!: NavBarPrimaryComponent;

  public isRPCollapsible = false;

  private primaryBarConfig: PrimaryBarConfig;

  // <primaryItemId - primaryStore>
  private readonly primaryItemMap: Map<string, PrimaryItemStore> = new Map<string, PrimaryItemStore>();

  private readonly verticalItemMap: Map<string, NavbarItem[]> = new Map<string, NavbarItem[]>();
  private readonly verticalConfigPerFrame: Map<string, string> = new Map<string, string>();
  private readonly verticalNavItemPerFrame: Map<string, NavbarItem> = new Map<string, NavbarItem>();

  private verticalBarConfigs: VerticalBarConfig[];

  private readonly subscriptions: Subscription[] = [];

  private rightPanelOpenSub: Subscription;
  private rightPanelTempContentSub: Subscription;
  private viewChangeSub: Subscription;

  private pendingUtilityId: UtilityPanelsEn | undefined;
  private brandProductName = '';
  private readonly browserWinId: number;

  private isMobileView = false;

  constructor(private readonly traceService: TraceService,
    private readonly config: ISnapInConfig,
    private readonly messageBroker: IHfwMessage,
    private readonly desktopMessageService: DesktopMessageService,
    private readonly multiMonitorService: MultiMonitorServiceBase,
    private readonly stateService: StateService,
    private readonly rightPanelService: SiSidePanelService,
    private readonly rightPanelState: RightPanelStateService,
    private readonly appRightsService: AppRightsService,
    private readonly licenseOptionsService: LicenseOptionsService,
    private readonly titleService: Title,
    private readonly productService: ProductService,
    private readonly titleBarService: TitleBarService,
    private readonly settingsService: SettingsServiceBase,
    private readonly el: ElementRef,
    private readonly renderer: Renderer2,
    private readonly mobileNavigationService: MobileNavigationService,
    private readonly graphicsCommonTemplateServiceBase: GraphicsCommonTemplateServiceBase,
    private readonly eventsCommonService: EventsCommonServiceBase,
    private readonly notificationService: NotificationServiceBase
  ) {
    if (this.desktopMessageService.runsInElectron) {
      const winInfo = this.desktopMessageService.getOwnWindowInfo();
      if (winInfo != undefined) {
        this.browserWinId = winInfo.browserWindowId;
      }
    }

    this.productService.getProductSettings().subscribe((productSettings: ProductInfo) => {
      if (productSettings != null) {
        this.brandProductName = productSettings.brandProductName;
        this.titleBarService.setTitle2(productSettings.brandProductName, this.browserWinId);
      }
    });
  }

  public ngOnInit(): void {
    this.isMainManager = !this.desktopMessageService.runsInElectron || this.desktopMessageService.isMainManager();

    this.frames = this.stateService.getFrames();

    this.updateDataStructure();

    this.subscribeToFrameChange();

    if (this.desktopMessageService.isMainManager()) {
      this.desktopMessageService.onCurrentManagerConfigurationChanged.subscribe(info => {
        this.stateService.updateAvailableFrames(info.framesToCreate).subscribe(() => {
          this.frames = this.stateService.getFrames();
          this.updateDataStructure();
        });

        if (this.multiMonitorService.synchronizeWithUserSettings()) {
          this.settingsService.putSettings('Web_Account_SelectedNode', info.managerDefinition.startupNode).subscribe(_success => {
            this.traceService.info(trcModuleNameDesktop, `User startup node set: ${info.managerDefinition.startupNode}`);
          }, _error => {
            this.traceService.error(trcModuleNameDesktop, `User startup node set failed: ${info.managerDefinition.startupNode}`);
          });

          info.managerDefinition.frames.forEach(frame => {
            if (frame !== undefined) {
              if (frame.views?.length > 0) {
                frame.views.forEach(view => {
                  this.settingsService.putSettings(`Flex_Hfw_LayoutSettings-${frame.id}-${view.id}`, view.defaultLayout).subscribe(_success => {
                    this.traceService.info(trcModuleNameDesktop, `User layout:${view.defaultLayout} set for frame:${frame.id}, view:${view.id}`);
                  }, _error => {
                    this.traceService.error(trcModuleNameDesktop, `User layout:${view.defaultLayout} set failed for frame:${frame.id}, view:${view.id}`);
                  });
                });
              }
            }
          });
        }
      });
    }
    // Mobile visibility
    this.isMobileView = this.mobileNavigationService.mobileOnlyVisibilityLast;

    this.subscriptions.push(this.mobileNavigationService.mobileOnlyVisibility$.subscribe((isVisible: boolean) => {
      this.isMobileView = isVisible;
    }));

    // trigger right panel closure when clicking on an event notification
    this.subscriptions.push(this.notificationService.closeRightPanel.subscribe(res => {
      if (res === true && this.isMobileView) {
        this.rightPanelService.close();
      }
    }));
  }

  public ngAfterViewInit(): void {
    if (this.navbar && this.pendingUtilityId !== undefined) {
      this.navbar.showUtility(this.pendingUtilityId);
    }
    this.verticalBarVisible();
    // Create a MutationObserver to observe changes in the DOM
    const observer = new MutationObserver(() => {
      this.verticalBarVisible();
    });
    // Start observing the entire DOM, including child elements
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    this.graphicsCommonTemplateServiceBase.GraphicsCommonTemplate = this.graphicsCommonTemplate;
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((subscription: Subscription) => { if (subscription != null) { subscription.unsubscribe(); } });
    this.unsubscribeRightPanelIsOpen();
    this.unsubscribeRightPanelTempContent();
    this.unsubscribeViewChangeSub();
  }

  /**
   * Manages the visibility of the vertical bar (mobile drawer) based on the current view.
   * In the mobile version, this method hides the vertical bar by setting its display property to 'none'.
   * In desktop or non-mobile views, it ensures the vertical bar is visible by setting its display property to 'block'.
   */
  public verticalBarVisible(): void {
    // Query and select all elements matching the mobile vertical bar drawer selector
    const elements = this.el.nativeElement.querySelectorAll(MainComponent.queryMobileVerticalBarDrawer);

    // Check if the current view is a mobile view
    if (this.isMobileView) {
      // Hide the vertical bar in the mobile version
      elements.forEach((element: HTMLElement) => {
        this.renderer.setStyle(element, 'display', 'none');
      });
    } else {
      // Ensure the vertical bar is visible in desktop or non-mobile views
      elements.forEach((element: HTMLElement) => {
        this.renderer.setStyle(element, 'display', 'block');
      });
    }
  }

  public contentResize(): void {
    // It will check the current state of right Panel whether open or close.
    const frameRPState = this.rightPanelState.getRightPanelState(this.currentFrameId);
    this.rightPanelExpandFlag = frameRPState;
  }

  public primaryItemClicked(itemId: string): void {
    if (this.primaryItemMap.has(itemId)) {
      const itemStore: PrimaryItemStore = this.primaryItemMap.get(itemId);
      const frameId: string = !isNullOrUndefined(itemStore.lastFrameIdSelected) ? itemStore.lastFrameIdSelected : itemStore.frameIds[0];
      this.eventsCommonService.destinationFrame = frameId;
      this.messageBroker.switchToNextFrame(frameId).subscribe((frameChanged: boolean) => {
        //
      });
    }
  }

  public switchFrame(frame: string): void {
    this.messageBroker.switchToNextFrame(frame).subscribe((frameChanged: boolean) => {
      // this.traceService.info(TraceModules.navigationBar, "switchToNextFrame completed. Result: %s", frameChanged);
    });
  }

  public switchView(frame: string, viewId: string): void {
    this.messageBroker.changeView(frame, viewId).subscribe((frameChanged: boolean) => {
      // this.traceService.info(TraceModules.navigationBar, "switchToNextFrame completed. Result: %s", frameChanged);
    });
  }
  public onUtilityPanelChanged(utilityId: UtilityPanelsEn | null): void {
    if (utilityId != null) {
      this.rightPanelState.setUtilityRightPanelState(UtilityPanelsEn[utilityId]);
    } else {
      this.rightPanelState.resetUtilityRightPanelState();
    }
  }

  @HostListener('window:keyup', ['$event'])
  public keyEvent(event: KeyboardEvent): void {
    if (event.ctrlKey && event.altKey && (event.code === 'KeyD')) {
      if (!this.desktopMessageService.runsInElectron) {
        this.downloadDesktopApp();
      }
    }

    if (event.ctrlKey && event.altKey && (event.code === 'KeyE')) {
      if (this.desktopMessageService.runsInElectron) {
        this.desktopMessageService.editEndpointAddress();
      }
    }
  }

  // This is a workaround to allow the resolution of the graphic step within the assisted treatment.
  public onResolveGraphicStep(resolveExecutionResult: any, step: any): void {
    resolveExecutionResult.emit({ status: 1, step: step });
  }

  private subscribeToFrameChange(): void {
    this.subscriptions.push(this.messageBroker.getCurrentWorkAreaFrameInfo().subscribe(frame => {
      if (frame) {
        this.unsubscribeViewChangeSub();
        this.viewChangeSub = this.messageBroker.getCurrentWorkAreaView().subscribe(view => {

          const isFirstFrameIdAssignement = this.currentFrameId === undefined;
          this.currentFrameId = frame.id;

          if (isFirstFrameIdAssignement) {
            const currentUtilityId = this.rightPanelState.getCurrentUtilityId();
            if (currentUtilityId) {
              this.pendingUtilityId = UtilityPanelsEn[currentUtilityId];
            }
          }
          this.unsubscribeRightPanelIsOpen();
          this.unsubscribeRightPanelTempContent();

          this.updateRightPanelComponentOnFrameChange();
          if (this.frameHasApplicationRightPanel(this.currentFrameId)) {
            this.subscribeRightPanelIsOpen();
          }
          this.subscribeRightPanelTempContent();

          // check if the vertical-bar is required:
          this.updateVerticalBarInputs(frame);

          // UPDATE Primary Item selected
          this.primaryItems.filter(x => x.isActive === true).map((item, index, items) => {
            item.isActive = false;
          });
          let selectedPrimaryMenu: MenuItem;
          const primaryItemText: string = this.findPrimaryItemTextForFrame(frame.id);
          this.primaryItems.filter(x => x.title === NAVBAR_RESOURCE_KEY + primaryItemText).map((item, index, items) => {
            item.isActive = true;
            selectedPrimaryMenu = item;
          });
          const primaryItemStore = this.primaryItemMap.get(primaryItemText);
          if (primaryItemStore) {
            primaryItemStore.lastFrameIdSelected = frame.id;
          }

          // UPDATE Vertical Item selected
          this.verticalNavItemPerFrame.forEach((item: NavbarItem) => {
            item.isActive = false;
          });

          let selectedVerticalMenu: MenuItem;
          const selectedItemId = (view) ? frame.id + '.' + view : frame.id;
          if (this.verticalNavItemPerFrame.has(selectedItemId)) {
            this.verticalNavItemPerFrame.get(selectedItemId).isActive = true;
            selectedVerticalMenu = this.verticalNavItemPerFrame.get(selectedItemId);
          } else if (this.verticalNavItemPerFrame.has(frame.id)) {
            // in case of vertical bar entries 'without' primary bar entries (e.g for Account, Notification Settings):
            this.verticalNavItemPerFrame.get(frame.id).isActive = true;
            selectedVerticalMenu = this.verticalNavItemPerFrame.get(frame.id);
          }

          this.titleBarService.setAppTitle(selectedPrimaryMenu, selectedVerticalMenu, frame.id, this.brandProductName, this.browserWinId);
        });
      }
    }));
  }

  private checkNotificationLicenseRights(notificationRecipientViewer: any, notificationRecipientGroupViewer: any,
    notificationTemplateViewer: any, verticalEntries: any[]): boolean {
    if (verticalEntries.length > 0) {
      if (notificationRecipientViewer !== -1 && notificationRecipientGroupViewer !== -1 && notificationTemplateViewer !== -1) {
        const appRightsNotification = this.appRightsService.getAppRights(1000);
        const showAppRightsReno = 32000;
        const showAppRightsRenoPlus = 32001;
        const licenseOptions = this.licenseOptionsService.getLicenseOptionsRights('sbt_gms_mns_opt_SMTPEmail');
        if (appRightsNotification != null) {
          const show: Operation[] = appRightsNotification.Operations.filter(f => f.Id === showAppRightsReno ||
            f.Id === showAppRightsRenoPlus);
          if (show.length === 0) {
            // remove Notification from vertical bar if all apprights of reno and reno plus are false
            return false;
          }
        } else {
          // remove Notification from vertical bar if apprights are not found
          return false;
        }

        // remove notification viewer if license is not available or required > available
        if (!isNullOrUndefined(licenseOptions)) {
          if (licenseOptions!.Available === -1) {
            return true;
          } else if (licenseOptions!.Available === 0) {
            return false;
          } else {
            // required <= assigned
            return licenseOptions!.Required <= (licenseOptions!.Available) ? true : false;
          }
        }

        return true;
      }
    }
  }

  private checkOperatorTasksRights(): boolean {
    const operatorTaskSnapinId = 110000;
    const showSnapin = 3520004;
    const operatorTaskLicenseId = 'sbt_gms_opt_operatortasks';

    const appRightsOperatorTask = this.appRightsService.getAppRights(operatorTaskSnapinId);
    const showOp: Operation = appRightsOperatorTask?.Operations?.find(value => value.Id === showSnapin);

    let licenseAvailable = false;
    const licenseOptionsDocument = this.licenseOptionsService.getLicenseOptionsRights(operatorTaskLicenseId);
    if (licenseOptionsDocument) {
      if (licenseOptionsDocument?.Available === -1) {
        licenseAvailable = true;
      } else {
        licenseAvailable = licenseOptionsDocument.Required <= (licenseOptionsDocument.Available);
      }
    }

    return showOp !== undefined && licenseAvailable;
  }

  private updateVerticalBarInputs(frame: FrameInfo): void {
    const frameHasAConfig = this.verticalConfigPerFrame.has(frame.id); // this.framesWithVerticalBar.includes(this.currentFrameId);
    let verticalEntries = [];
    if (frameHasAConfig) {
      verticalEntries = this.verticalItemMap.get(this.verticalConfigPerFrame.get(frame.id));
    }

    // check notification for application rights and license
    if (verticalEntries.length > 0) {
      // fetch notification entry from vertical entries
      const notificationViewer = verticalEntries.findIndex((i: any) => i.title === 'NAVBAR.Notification');
      if (notificationViewer !== -1 && !isNullOrUndefined(verticalEntries[notificationViewer].items)) {
        const notificationRecipientViewer = verticalEntries[notificationViewer].items.findIndex((i: any) => i.title === 'NAVBAR.Recipient-View');
        const notificationRecipientGroupViewer = verticalEntries[notificationViewer].items.findIndex((i: any) => i.title === 'NAVBAR.Group-View');
        const notificationTemplateViewer = verticalEntries[notificationViewer].items.findIndex((i: any) => i.title === 'NAVBAR.Template-View');
        if (!this.checkNotificationLicenseRights(notificationRecipientViewer, notificationRecipientGroupViewer, notificationTemplateViewer, verticalEntries)) {
          // remove notification entry if no application rights or license of notification
          verticalEntries.splice(notificationViewer, 1);
        }
      }
    }

    const countEntries = this.countVerticalEntries(verticalEntries);

    // collapse vertical menu in system manager
    if (frame.id === 'system-manager') {
      verticalEntries = this.collapseVerticalEntries(verticalEntries);
    }

    this.isVerticalVisible = frameHasAConfig && (countEntries > 1);
    if (countEntries > 1) {
      this.currentVerticalItems = verticalEntries;
    } else {
      this.currentVerticalItems = [];
    }

  }

  private frameHasApplicationRightPanel(frameId: string): boolean {
    return this.rightPanelState.hasRightPanelState(frameId);
  }

  private subscribeRightPanelIsOpen(): void {
    this.rightPanelOpenSub = this.rightPanelService.isOpen$.subscribe(isOpen => {
      if (this.frameHasApplicationRightPanel(this.currentFrameId) &&
          !this.rightPanelService.isTemporaryOpen()) {
        this.rightPanelState.setRightPanelState(this.currentFrameId, isOpen);
      }
    });
  }

  private unsubscribeRightPanelIsOpen(): void {
    if (this.rightPanelOpenSub != null) {
      this.rightPanelOpenSub.unsubscribe();
    }
  }

  private subscribeRightPanelTempContent(): void {
    this.rightPanelTempContentSub = this.rightPanelService.tempContent$.subscribe(value => {
      if (!this.frameHasApplicationRightPanel(this.currentFrameId)) {
        if (this.rightPanelService.isOpen() && value === undefined) {
          this.rightPanelService.toggle();
        }
      }

      // if (this.rightPanelService.isOpen() && value instanceof CdkPortal && value.context?.utilityId != null) {
      //   this.rightPanelState.setUtilityRightPanelState(value.context.utilityId);
      // } else {
      //   this.rightPanelState.resetUtilityRightPanelState();
      // }
    });
  }

  private unsubscribeViewChangeSub(): void {
    if (this.viewChangeSub != null) {
      this.viewChangeSub.unsubscribe();
    }
  }

  private unsubscribeRightPanelTempContent(): void {
    if (this.rightPanelTempContentSub != null) {
      this.rightPanelTempContentSub.unsubscribe();
    }
  }

  private updateRightPanelComponentOnFrameChange(): void {
    const frameHasAppRP = this.frameHasApplicationRightPanel(this.currentFrameId);
    this.isRPCollapsible = frameHasAppRP;

    if (frameHasAppRP) {
      if (!this.rightPanelService.isTemporaryOpen()) {
        const frameRPState = this.rightPanelState.getRightPanelState(this.currentFrameId);
        if (frameRPState !== this.rightPanelService.isOpen()) {
          this.rightPanelService.toggle();
        }
      }
    } else {
      if (this.rightPanelService.isOpen()) {
        if (!this.rightPanelService.isTemporaryOpen()) {
          this.rightPanelService.close();
        }
      }
    }
  }

  private countVerticalEntries(verticalEntries: any[]): number {
    let count = 0;
    verticalEntries.forEach(item => {
      if (!isNullOrUndefined(item.items)) {
        count += item.items.length;
      } else {
        count++;
      }
    });
    return count;
  }

  private collapseVerticalEntries(verticalEntries: any[]): any[] {
    verticalEntries.forEach(item => {
      if (!isNullOrUndefined(item.items) && (item.items.length > 0)) {
        if (!isNullOrUndefined(item.expanded)) {
          item.expanded = false;
        }
      }
    });

    return verticalEntries;
  }

  private findPrimaryItemTextForFrame(frameId: string): string {
    let res = '';
    this.primaryItemMap.forEach((store, key) => {
      const id: string = store.frameIds.find(s => s === frameId);
      if (id !== undefined) {
        res = key;
      }
    });

    return res;
  }

  private updateDataStructure(): void {
    this.updatePrimaryBarItems();
    this.updateVerticalBarItems();
  }

  private updatePrimaryBarItems(): void {
    this.primaryBarConfig = this.config.getPrimaryBarConfig();

    if (!isNullOrUndefined(this.primaryBarConfig)) {
      if (!isNullOrUndefined(this.primaryBarConfig.primaryItems)) {
        this.cleanUpPrimaryItems();

        const tasksFrameIndex = this.primaryBarConfig.primaryItems.findIndex(item => item.id === 'tasks');
        if (tasksFrameIndex > -1) {
          const tasksFrameHasRights = this.checkOperatorTasksRights();
          if (!tasksFrameHasRights) {
            this.primaryBarConfig.primaryItems.splice(tasksFrameIndex, 1);
          }
        }

        this.primaryBarConfig.primaryItems.forEach((item: PrimaryItem) => {
          if (!isNullOrUndefined(item.childrenIds) && item.childrenIds.length > 0 && !this.primaryItemMap.has(item.id)) {
            const primaryStore: PrimaryItemStore = new PrimaryItemStore();
            primaryStore.frameIds = [];
            item.childrenIds.forEach((element: ChildrenId) => {
              primaryStore.frameIds.push(element.id);
            });
            
            this.primaryItemMap.set(item.id, primaryStore);
            
            if (item.id == 'events') {
              this.primaryItems.splice(1, 0, {
                title: NAVBAR_RESOURCE_KEY + item.id,
                action: this.primaryItemClicked.bind(this, item.id)

              })
            } else { 
              this.primaryItems.push(
                {
                  title: NAVBAR_RESOURCE_KEY + item.id,
                  // icon: frame.iconClass, // actually there is no icon displayed for primary items.
                  action: this.primaryItemClicked.bind(this, item.id)
                  // isActive: isActive // TODO: evaluate this
                }
              );
            }
          }
        });
      }
    }
  }

  private updateVerticalBarItems(): void {
    this.verticalBarConfigs = this.config.getVerticalBarConfig();

    if (!isNullOrUndefined(this.verticalBarConfigs)) {
      this.verticalBarConfigs.forEach((item: VerticalBarConfig) => {
        const items: NavbarItem[] = [];
        item.verticalBarItems.forEach((subItem: VerticalBarItem) => {
          const subNavItem: NavbarItem = this.createNavItem(item.id, subItem);
          items.push(subNavItem);
        });
        this.verticalItemMap.set(item.id, items);
      });
    }
  }

  private cleanUpPrimaryItems(): void {
    const toBeRemoved = [];
    this.primaryItemMap.forEach((store, key) => {
      if (this.primaryBarConfig.primaryItems.find(x => x.id === key) === undefined) {
        toBeRemoved.push(key);
      }
    });
    toBeRemoved.forEach(s => this.primaryItemMap.delete(s));
    this.primaryItems = this.primaryItems.filter(item => this.includedInPrimaryConfig(item));
  }

  private downloadDesktopApp(): void {
    const baseHref = (document.getElementsByTagName('base')[0] as any).href;
    const urlFileZip = baseHref + 'desktop/Siemens-Gms-FlexClient-Installer.zip';
    const anchorZip = document.createElement('a');
    anchorZip.download = 'Siemens-Gms-FlexClient-Installer.zip';
    anchorZip.href = urlFileZip;
    anchorZip.click();
  }

  private createNavItem(configId: string, subItem: VerticalBarItem): NavbarItem {
    const result: NavbarItem = { title: NAVBAR_RESOURCE_KEY + subItem.id, icon: subItem.icon };
    // check if the item is a folder
    if (!isNullOrUndefined(subItem.verticalBarItems) && isNullOrUndefined(subItem.targetFrame)) {
      const children: NavbarItem[] = [];
      subItem.verticalBarItems.forEach((child: VerticalBarItem) => { children.push(this.createNavItem(configId, child)); });
      result.items = children;
    } else {
      if (!isNullOrUndefined(subItem.targetFrame)) {
        if (subItem.targetView) {
          result.action = this.switchView.bind(this, subItem.targetFrame, subItem.targetView);
          this.verticalConfigPerFrame.set(subItem.targetFrame, configId);
          this.verticalNavItemPerFrame.set(subItem.targetFrame + '.' + subItem.targetView, result);
        } else {
          result.action = this.switchFrame.bind(this, subItem.targetFrame);
          this.verticalConfigPerFrame.set(subItem.targetFrame, configId);
          this.verticalNavItemPerFrame.set(subItem.targetFrame, result);
        }
      }
    }
    return result;
  }

  private includedInPrimaryConfig(item: any): boolean {
    const itemId = item.title.replace(NAVBAR_RESOURCE_KEY, '');
    return (this.primaryBarConfig.primaryItems.find(x => x.id === itemId) != null);
  }

}
