import { Injectable, Optional } from '@angular/core';
import { isNullOrUndefined, SettingsServiceBase, TraceService } from '@gms-flex/services-common';
import { Observable, of } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';

import { TraceModules } from '../shared/trace-modules';
import { RIGHT_PANEL_FRAMES_IDS } from './right-panel-frame-ids.model';
import { RightPanelSetting } from './right-panel-settings.model';

// array of
// { frameId: <string> open: <boolean> }
export const rightPanelSettings = 'Flex_RightPanelSettings';
// i.e. 'notifications'
export const rightPanelUtilitySettings = 'Flex_RightPanelUtilitySettings';
@Injectable({
  providedIn: 'root'
})
export class RightPanelStateService {

  private currentUtilityPanelId: string | null;

  private currentSettings: RightPanelSetting[];

  private readonly isProvided: boolean;

  private readonly rightPanelComponentsState: Map<string, any> = new Map<string, any>();

  public constructor(private readonly trace: TraceService,
    @Optional() private readonly settingsService: SettingsServiceBase) {
    this.isProvided = !isNullOrUndefined(this.settingsService);
    if (this.isProvided) {
      this.trace.info(TraceModules.rightPanelState, 'settingsService provided.');
    } else {
      this.trace.info(TraceModules.rightPanelState, 'settingsService not provided.');
    }
  }

  public getRightPanelSettings(): Observable<boolean> {
    return this.getFrameSettings().pipe(
      concatMap(() => this.getUtilitySettings()),
      map(() => true)
    );
  }

  public hasRightPanelState(frameId: string): boolean {
    if (frameId != null) {
      const rpState = this.currentSettings.find(s => s.frameId === frameId);
      return (rpState != null);
    }
    return false;
  }

  public getRightPanelState(frameId: string): boolean {
    if (frameId != null) {
      const rpState = this.currentSettings.find(s => s.frameId === frameId);
      if (rpState != null) {
        return rpState.open;
      }
    }
    return false;
  }

  public setRightPanelState(frameId: string, isOpen: boolean): void {
    if (frameId != null) {
      let saveSettings = false;
      const stateIndex = this.currentSettings.findIndex(s => s.frameId === frameId);
      if (stateIndex >= 0) {
        saveSettings = this.currentSettings[stateIndex].open !== isOpen;
        this.currentSettings[stateIndex].open = isOpen;
      } else {
        saveSettings = true;
        this.currentSettings.push({ frameId, open: isOpen });
      }
      if (saveSettings) {
        this.saveLayoutSettings();
      }
    }
  }

  public setUtilityRightPanelState(utilityId: string): void {
    if (utilityId != null) {
      if (utilityId !== this.currentUtilityPanelId) {
        this.currentUtilityPanelId = utilityId;
        this.saveUtilitySettings();
      }
    }
  }

  public resetUtilityRightPanelState(): void {
    if (this.currentUtilityPanelId != null) {
      this.currentUtilityPanelId = null;
      this.deleteUtilitySettings();
    }
  }

  public getCurrentUtilityId(): string | null {
    return this.currentUtilityPanelId;
  }

  public getComponentState(id: string): any | null {
    return this.rightPanelComponentsState.get(id);
  }

  public setComponentState(id: string, value: any): void {
    this.rightPanelComponentsState.set(id, value);
  }

  private getFrameSettings(): Observable<boolean> {
    if (this.isProvided) {
      return this.settingsService.getSettings(rightPanelSettings).pipe(
        map(response => {
          this.onGetRPSettings(response);
          return true;
        })
      );
    } else {
      this.setupDefaultRPStates();
      return of(true);
    }
  }

  private getUtilitySettings(): Observable<boolean> {
    if (this.isProvided) {
      return this.settingsService.getSettings(rightPanelUtilitySettings).pipe(
        map(response => {
          this.currentUtilityPanelId = response;
          return true;
        })
      );
    } else {
      this.currentUtilityPanelId = null;
      return of(true);
    }
  }

  private saveLayoutSettings(): void {
    const serializedSettings = JSON.stringify(this.currentSettings).replace(/"/g, '\'');
    this.settingsService.putSettings(rightPanelSettings, serializedSettings).subscribe(
      val => this.onPutSettings(val, serializedSettings),
      err => this.trace.error(TraceModules.rightPanelState, 'Error saving rightPanelSettings settings %s : %s', serializedSettings, err)
    );
  }

  private saveUtilitySettings(): void {
    this.settingsService.putSettings(rightPanelUtilitySettings, this.currentUtilityPanelId).subscribe(
      val => this.onPutSettings(val, this.currentUtilityPanelId),
      err => this.trace.error(TraceModules.rightPanelState, 'Error saving rightPanel Utility settings %s : %s', this.currentUtilityPanelId, err)
    );
  }

  private deleteUtilitySettings(): void {
    this.settingsService.deleteSettings(rightPanelUtilitySettings).subscribe(
      val => this.onDeleteUtilitySettings(val),
      err => this.trace.error(TraceModules.rightPanelState, 'Error deleting rightPanel UtilityId settings. %s', err)
    );
  }

  private onDeleteUtilitySettings(isSuccess: boolean): void {
    if (isSuccess) {
      this.trace.info(TraceModules.rightPanelState, 'rightPanel UtilityId settings deleted.');
    } else {
      this.trace.warn(TraceModules.rightPanelState, 'rightPanel UtilityId settings.');
    }
  }

  private onGetRPSettings(settings: string): Observable<boolean> {
    this.trace.info(TraceModules.rightPanelState, 'Reading RightPanelSettings succeeds: %s', settings);
    if (settings != null) {
      const settingsUpdated: any = settings.replace(/'/g, '"');
      const parsedSettings = JSON.parse(settingsUpdated);
      if (parsedSettings != null) {
        this.setupDefaultRPStates();
        this.mergeSavedSettings(parsedSettings as RightPanelSetting[]);
      } else {
        this.setupDefaultRPStates();
      }
    } else {
      this.setupDefaultRPStates();
    }
    return of(true);
  }

  private onPutSettings(isSuccess: boolean, serializedSettings: string): void {
    if (isSuccess) {
      this.trace.info(TraceModules.rightPanelState, 'Right panel settings saved: %s.', serializedSettings);
    } else {
      this.trace.warn(TraceModules.rightPanelState, 'Right panel settings not saved: %s.', serializedSettings);
    }
  }

  private setupDefaultRPStates(): void {
    this.currentSettings = [];
    RIGHT_PANEL_FRAMES_IDS.forEach(id => this.currentSettings.push({ frameId: id, open: false }));
  }

  private mergeSavedSettings(parsedSettings: RightPanelSetting[]): void {
    if (parsedSettings != null) {
      parsedSettings.forEach(settings => {
        const settingsIndex = this.currentSettings.findIndex(s => s.frameId === settings.frameId);
        if (settingsIndex >= 0) {
          this.currentSettings[settingsIndex].open = settings.open;
        }
      });
    }
  }
}
