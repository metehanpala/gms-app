import { Component, EventEmitter, HostListener, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { TraceService } from '@gms-flex/services-common';
import { TranslateService } from '@ngx-translate/core';
import { MenuItem } from '@simpl/element-ng';
import { interval, Subject, Subscription } from 'rxjs';

import { DesktopMessageService, trcModuleNameDesktop } from '../desktop-renderer/messaging/desktop-message.service';

// T ODO:
// This class must be moved to SiMPL!
// Currently it is duplicated code, as I do not want to introduce a lib for it only

@Component({
  selector: 'gms-electron-title-bar',
  templateUrl: './electron-title-bar.component.html',
  styleUrl: './electron-title-bar.component.scss',
  standalone: false
})
export class ElectronTitleBarComponent implements OnDestroy, OnChanges {

  @Output() public readonly backward = new EventEmitter<void>();
  @Output() public readonly forward = new EventEmitter<void>();
  @Output() public readonly reload = new EventEmitter<boolean>();
  @Output() public readonly editRules = new EventEmitter<void>();
  @Input() public appTitle = '';
  @Input() public canGoBack = false;
  @Input() public canGoFwd = false;
  @Input() public focus = true;
  @Input() public changeCurrentConfigurationAllowed = true;
  @Input() public electronAppBootstrapped = false;

  public menuItems: MenuItem[] = [];
  public dateTimeNow: Subject<string> = new Subject<string>();
  public timeNow: Subject<string> = new Subject<string>();
  public dateNow: Subject<string> = new Subject<string>();
  public dayNow: Subject<string> = new Subject<string>();
  public strings: Map<string, string> = new Map<string, string>();
  public closedMode = false;
  private readonly zoomLevel100 = 5;
  private zoomLevelCurrent = 5;
  private readonly zoomLevels = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];
  private timerSubscription: Subscription | undefined;
  private readonly menuItemRule: MenuItem;

  constructor(
    private readonly desktopMessageService: DesktopMessageService,
    private readonly traceService: TraceService,
    private readonly translateService: TranslateService,
    private readonly ngZone: NgZone
  ) {
    this.closedMode = this.desktopMessageService.isClosedModeActive();

    let advancedMenuItems: MenuItem[];
    if (this.desktopMessageService.isMainManager()) {
      this.menuItemRule = { title: 'RULES.EDIT_COMMUNICATION_RULES', disabled: true, action: (): void => this.onEditRules() };
      advancedMenuItems = [
        { title: 'TITLE_BAR.EDIT_ENDPOINT_ADDRESS', disabled: this.closedMode, action: (): void => this.editEndpointAddress() },
        { title: 'TITLE_BAR.DELETE_SECURITY_SETTINGS', disabled: this.closedMode, action: (): void => this.clearSecuritySettings() },
        { title: '-' },
        { title: 'TITLE_BAR.EMPTY_CACHE_REFRESH', action: (): void => this.onReload(true) },
        { title: '-' },
        this.menuItemRule
      ];
    } else {
      advancedMenuItems = [
        { title: 'TITLE_BAR.EMPTY_CACHE_REFRESH', action: (): void => this.onReload(true) }
      ];
    }
    this.menuItems = [
      { title: 'TITLE_BAR.ZOOM_IN', icon: 'element-zoom-in', action: (): void => this.zoomIn() },
      { title: 'TITLE_BAR.ZOOM_OUT', icon: 'element-zoom-out', action: (): void => this.zoomOut() },
      { title: 'TITLE_BAR.RESET_ZOOM', icon: 'element-empty', action: (): void => this.zoom100() },
      { title: '-' },
      { title: 'TITLE_BAR.REFRESH', icon: 'element-refresh', action: (): void => this.onReload(false) },
      { title: '-' },
      { title: 'TITLE_BAR.ADVANCED', icon: 'element-empty', items: advancedMenuItems }
    ];

    this.ngZone.runOutsideAngular(() => {
      this.timerSubscription = interval(250).subscribe(() => {
        this.readDateTime();
      });
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.menuItemRule != undefined) {
      if (changes.changeCurrentConfigurationAllowed || (changes.electronAppBootstrapped)) {
        this.menuItemRule.disabled = !(this.changeCurrentConfigurationAllowed && this.electronAppBootstrapped);
      }
    }
  }

  public ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  public keyEvent(event: KeyboardEvent): void {
    if (event.code === 'F5') {
      this.reload.emit();
    }
  }

  public onBackward(): void {
    this.backward.emit();
  }

  public onForward(): void {
    this.forward.emit();
  }

  public onReload(emptyCache: boolean): void {
    this.reload.emit(emptyCache);
  }

  public onEditRules(): void {
    this.editRules.emit();
  }

  public zoomIn(): void {
    const zoom: number = Math.round(this.desktopMessageService.setZoom(undefined));
    this.zoomLevelCurrent = this.zoomLevels.findIndex(z => z === zoom);
    if (this.zoomLevels.length > this.zoomLevelCurrent + 1) {
      this.zoomLevelCurrent = this.zoomLevelCurrent + 1;
      this.desktopMessageService.setZoom(this.zoomLevels[this.zoomLevelCurrent]);
    }
  }

  public zoomOut(): void {
    const zoom: number = Math.round(this.desktopMessageService.setZoom(undefined));
    this.zoomLevelCurrent = this.zoomLevels.findIndex(z => z === zoom);
    if (this.zoomLevelCurrent > 0) {
      this.zoomLevelCurrent = this.zoomLevelCurrent - 1;
      this.desktopMessageService.setZoom(this.zoomLevels[this.zoomLevelCurrent]);
    }
  }

  public zoom100(): void {
    this.zoomLevelCurrent = this.zoomLevel100;
    this.desktopMessageService.setZoom(this.zoomLevels[this.zoomLevelCurrent]);
  }

  public dtPopoverShown(): void {
    this.ngZone.runOutsideAngular(() => this.readDateTime());
  }

  private readDateTime(): void {
    const dt = Date.now();
    const optionsDt: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    this.dateTimeNow.next((new Date(dt)).toLocaleString(undefined, optionsDt));
    this.timeNow.next((new Date(dt)).toLocaleTimeString());
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    this.dateNow.next((new Date(dt)).toLocaleDateString(undefined, options));
    const optionsDay: Intl.DateTimeFormatOptions = { weekday: 'long' };
    this.dayNow.next((new Date(dt)).toLocaleDateString(undefined, optionsDay));
  }

  private clearSecuritySettings(): void {
    if (this.desktopMessageService.isMainManager()) {
      this.desktopMessageService.clearSecuritySettings();
    }
  }

  private editEndpointAddress(): void {
    if (this.desktopMessageService.isMainManager()) {
      this.desktopMessageService.editEndpointAddress().then(result => {
        this.traceService.info(trcModuleNameDesktop, `Editing the endpoint possible: ${result}`);
      });
    }
  }
}
