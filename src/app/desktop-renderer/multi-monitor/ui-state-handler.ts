/* eslint-disable @typescript-eslint/naming-convention */
import { Injectable } from '@angular/core';
import { SnapinMessageBroker } from '@gms-flex/core';
import { CnsHelperService, CnsLabel, MultiMonitorServiceBase, NavbarCommunicationService, ViewInfo, ViewNode } from '@gms-flex/services';
import { AppContextService, isNullOrUndefined, TraceService } from '@gms-flex/services-common';
import { SiThemeService } from '@simpl/element-ng';

import { themeTypeAuto, themeTypeSystem } from './multi-monitor.service';

export const systemManagerFrameId = 'system-manager';

@Injectable({ providedIn: 'root' })
export class UiStateHandler {

  public constructor(
    private readonly snapinMessageBroker: SnapinMessageBroker,
    private readonly traceService: TraceService,
    public cnsHelper: CnsHelperService,
    private readonly navBarService: NavbarCommunicationService,
    private readonly siThemeService: SiThemeService,
    private readonly appContextService: AppContextService,
    private readonly multiMonitorService: MultiMonitorServiceBase
  ) { }

  public handleUiState(previousState: any, newState: any): void {
    for (const property in newState) {
      if (isNullOrUndefined(previousState)) {
        this.setUiState(property, newState);
      } else if ((!isNullOrUndefined(previousState[property]) && !isNullOrUndefined(newState[property]))
        || JSON.stringify(previousState[property]) !== JSON.stringify(newState[property])
      ) {
        this.setUiState(property, newState);
      }
    }
  }

  private setUiState(property, newState): void {
    switch (property) {
      case 'textRepresentation':
        this.navBarService.setCnsLabel(newState.textRepresentation);
        this.cnsHelper.setActiveCnsLabel(newState.textRepresentation);
        break;
      case 'statusBarHeight':
        this.navBarService.setStatusBarState(newState.statusBarHeight);
        break;
      case 'buzzerEnabled':
        this.navBarService.setBuzzerState(newState.buzzerEnabled);
        break;
      case 'themeType':
        if (newState.themeType === themeTypeSystem) {
          newState.themeType = themeTypeAuto;
        }
        this.appContextService.setThemeType(newState.themeType);
        break;
      case 'activeView':
        if (typeof newState.activeView === 'string') {
          // Deserialize data received from the main-electron window
          const activeViewObj = JSON.parse(newState.activeView);
          // Check if cnsViews is a valid array
          if (Array.isArray(activeViewObj.cnsViews)) {
            // Reconstruct the array of ViewNode objects
            const viewNodes: ViewNode[] = activeViewObj.cnsViews.map(view => {
              // Validate and create a ViewNode object from the plain data
              if (view && !isNaN(view.systemId) && !isNaN(view.viewId) && view.systemName && view.viewName) {
                return {
                  SystemId: view.systemId,
                  ViewId: view.viewId,
                  SystemName: view.systemName,
                  Name: view.viewName,
                  Descriptor: activeViewObj.description,
                  ViewType: activeViewObj.viewType
                };
              } else {
                throw new Error('Invalid view data for ViewNode');
              }
            });
            // Construct the ViewInfo object with the valid ViewNode instances
            newState.activeView = new ViewInfo(viewNodes);
          } else {
            throw new Error('Invalid cnsViews array');
          }
        }
        this.cnsHelper.setActiveView(newState.activeView);
        break;
      case 'mode':
        this.traceService.debug(`Detected mode: ${newState[property].currentMode.id}}`);
        this.snapinMessageBroker.changeMode(newState.mode.currentMode, this.preferredFrameConfig(), newState.mode.firstSelectionObj)
          .subscribe(modeChanged => {
            if (modeChanged) {
              this.traceService.debug(`Mode changed to : ${newState[property].currentMode.id}}`);
            }
          });
        break;
      default:
        return;
    }
  }

  /**
   * Determines and returns the preferred frame ID based on the current environment and status.
   * If running in Electron and not the main manager but is a manager with an event, it returns undefined to avoid qParam miscalculations.
   * Otherwise, it returns the systemManagerFrameId.
   */
  private preferredFrameConfig(): string | undefined {
    return (this.multiMonitorService.runsInElectron &&
      !this.multiMonitorService.isMainManager() &&
      this.multiMonitorService.isManagerWithEvent())
      ? undefined // Avoid qParam miscalculations in Electron if the event manager is detached
      : systemManagerFrameId; // Return systemManagerFrameId if it is not detached or it is a web client
  }
}
