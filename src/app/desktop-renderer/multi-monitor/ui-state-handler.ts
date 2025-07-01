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
        // Check if the current instance is running as a single System Manager (i.e., not in a multi-manager environment).
        this.multiMonitorService.isSingleSystemManager().then(hasWindows => {
          // Log the detected mode for debugging purposes.
          this.traceService.debug(`Detected mode: ${newState[property].currentMode.id}}`);
          // If this instance is NOT the main System Manager,
          // AND we are in a multi-manager environment (hasWindows is true),
          // AND this instance is not a manager that handles specific events:
          if (!this.multiMonitorService.isMainManager() && hasWindows && !this.multiMonitorService.isManagerWithEvent()) {
            // In this scenario, only change the mode (do not update frame or selection object).
            // Typically, only the main manager should perform frame switches.
            this.snapinMessageBroker.changeMode(newState.mode.currentMode)
              .subscribe(modeChanged => {
                if (modeChanged) {
                  // Log mode change event.
                  this.traceService.debug(`Mode changed to : ${newState[property].currentMode.id}}`);
                }
              });
          } else {
            // If this instance is the main System Manager, or we are in a single-manager setup,
            // or this manager is responsible for event handling:
            // Switch the mode and update the frame and selection object as needed.
            this.snapinMessageBroker.changeMode(
              newState.mode.currentMode,
              this.preferredFrameConfig(),
              newState.mode.firstSelectionObj
            ).subscribe(modeChanged => {
              if (modeChanged) {
                // Log mode change event with frame/selection context.
                this.traceService.debug(`Mode changed to : ${newState[property].currentMode.id}}`);
              }
            });
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
