import { Component, OnInit } from '@angular/core';
import { ElectronUiMessageService } from '../../services/electron-ui-message.service';
import { TitleBarService } from '../../services/title-bar.service';

@Component({
    selector: 'gms-update-info',
    templateUrl: './update-info.component.html',
    styleUrls: ['./update-info.component.scss'],
    standalone: false
})
export class UpdateInfoComponent implements OnInit {

  public messageValues: any;
  public currentVersion: any;
  public newVersion: any;
  public reminderDelay = 10 * 60 * 1000; // 10 min
  public installNow = false;

  constructor(public electronUiMessageService: ElectronUiMessageService, private titleBarSrvice: TitleBarService) {
    this.titleBarSrvice.showTitleBar = false;
  }

  public ngOnInit(): void {
    const updateInfo = this.electronUiMessageService.getClientUpdateInfo();
    if (updateInfo !== undefined) {
      this.messageValues = { appName: updateInfo.applicationName, version: updateInfo.newVersion };
      this.currentVersion = { version: updateInfo.currentVersion };
      this.newVersion = { version: updateInfo.newVersion };
    } else {
      this.messageValues = { appName: 'ApplicationName', version: '1.0.0'};
      this.currentVersion = { version: '1.0.0'};
      this.newVersion = { version: '1.0.0'};
    }
  }

  public onInstallRadioChange(_value: boolean): void {
    this.installNow = true;
  }

  public onSnoozeRadioChange(_value: boolean): void {
    this.installNow = false;
  }

  public onContinue(): void {
    if (this.installNow) {
      this.electronUiMessageService.quitAndInstall();
    } else {
      this.electronUiMessageService.remindLater(this.reminderDelay);
    }
  }

  public onChangeReminder(item: number): void {
    if (item === 0) {
      this.reminderDelay = 600000; // 10 minutes reminder in milliseconds
    } else if (item === 1) {
      this.reminderDelay = 3600000; // 1 hour in milliseconds
    } else {
      this.reminderDelay = 24 * 3600000; // 24 hour in milliseconds
    }
  }
}
