import { Component, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MenuItem } from '@simpl/element-ng';
import { ElectronUiMessageService } from '../services/electron-ui-message.service';
import { interval, Subject, Subscription } from 'rxjs';

// TODO:
// This class must be moved to SiMPL!
// Currently it is duplicated code, as I do not want to introduce a lib for it only

@Component({
    selector: 'electron-ui-title-bar',
    templateUrl: './electron-title-bar.component.html',
    styleUrls: ['./electron-title-bar.component.scss'],
    standalone: false
})
export class ElectronTitleBarComponent implements OnDestroy {

  @Output() public readonly backward = new EventEmitter<void>();
  @Output() public readonly forward = new EventEmitter<void>();
  @Output() public readonly reload = new EventEmitter<void>();
  @Input() public appTitle = '';
  @Input() public canGoBack = false;
  @Input() public canGoFwd = false;
  @Input() public focus = true;

  public menuItems: MenuItem[] = [];
  public dateTimeNow: Subject<string> = new Subject<string>();
  public timeNow: Subject<string> = new Subject<string>();
  public dateNow: Subject<string> = new Subject<string>();
  public dayNow: Subject<string> = new Subject<string>();
  public translatedText: Map<string, string> = new Map<string, string>();
  private readonly zoomLevel100 = 5;
  private zoomLevelCurrent = 5;
  private readonly zoomLevels = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];
  private timerSubscription: Subscription | undefined;
  public closedMode = false;

  constructor(
    private readonly messageService: ElectronUiMessageService,
    private readonly translateService: TranslateService
  ) {
    const winInfo = this.messageService.getWindowInfo();
    this.appTitle = this.messageService.getBrandInfo()?.brandDisplayName;
    if (winInfo != undefined) {
      this.appTitle = `${this.appTitle} (#${winInfo.browserWindowId})`;
    }
    this.closedMode = this.messageService.isClosedModeActive();
    this.menuItems = [
      { title: 'TITLE_BAR.ZOOM_IN', icon: 'element-zoom-in', action: (): void => this.zoomIn() },
      { title: 'TITLE_BAR.ZOOM_OUT', icon: 'element-zoom-out', action: (): void => this.zoomOut() },
      { title: 'TITLE_BAR.RESET_ZOOM', icon: 'element-empty', action: (): void => this.zoom100() },
      { title: '-' },
      { title: 'TITLE_BAR.REFRESH', icon: 'element-refresh', action: (): void => this.onReload() },
      { title: '-' },
      { title: 'TITLE_BAR.ADVANCED', icon: 'element-empty', items: [
        { title: 'TITLE_BAR.EDIT_ENDPOINT_ADDRESS', disabled: this.closedMode, action: (): void => this.editEndpointAddress() },
        { title: 'TITLE_BAR.DELETE_SECURITY_SETTINGS', disabled: this.closedMode, action: (): void => this.clearSecuritySettings() }
      ] }
    ];

    this.timerSubscription = interval(250).subscribe(() => {
      this.readDateTime();
    });
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

  public onReload(): void {
    this.reload.emit();
  }

  public zoomIn(): void {
    const zoom: number = Math.round(this.messageService.setZoom(undefined));
    this.zoomLevelCurrent = this.zoomLevels.findIndex(z => z === zoom);
    if (this.zoomLevels.length > this.zoomLevelCurrent + 1) {
      this.zoomLevelCurrent = this.zoomLevelCurrent + 1;
      this.messageService.setZoom(this.zoomLevels[this.zoomLevelCurrent]);
    }
  }

  public zoomOut(): void {
    const zoom: number = Math.round(this.messageService.setZoom(undefined));
    this.zoomLevelCurrent = this.zoomLevels.findIndex(z => z === zoom);
    if (this.zoomLevelCurrent > 0) {
      this.zoomLevelCurrent = this.zoomLevelCurrent - 1;
      this.messageService.setZoom(this.zoomLevels[this.zoomLevelCurrent]);
    }
  }

  public zoom100(): void {
    this.zoomLevelCurrent = this.zoomLevel100;
    this.messageService.setZoom(this.zoomLevels[this.zoomLevelCurrent]);
  }

  public dtPopoverShown(): void {
    this.readDateTime();
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
    this.messageService.clearSecuritySettings();
  }

  private editEndpointAddress(): void {
    this.messageService.editEndpointAddress().then(result => {});
  }
}
