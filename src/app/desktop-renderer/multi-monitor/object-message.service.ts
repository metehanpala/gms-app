import { Injectable, NgZone } from '@angular/core';
import { FullQParamId, MessageParameters, SnapinMessageBroker, StateService } from '@gms-flex/core';
import { MultiMonitorServiceBase, ObjectMessage, ObjectMessageType } from '@gms-flex/services';
import { isNullOrUndefined, TraceService } from '@gms-flex/services-common';
import { ObjectManagerCoreServiceBase } from '@gms-flex/snapin-common';
import { ShutdownInfo } from 'desktop-main/src/messaging/window-message.data';
import { TraceModules } from 'src/app/shared/trace-modules';

import { DesktopMessageService, trcModuleNameDesktop } from '../messaging/desktop-message.service';

export const systemManagerFrameId = 'system-manager';
export const treeViewId = 'tree-view';
const DEFAULT_MODE_ID = 'default';
@Injectable()
export class ObjectMessageService {
  constructor(
    private readonly messageBroker: SnapinMessageBroker,
    private readonly objectManagerCoreService: ObjectManagerCoreServiceBase,
    private readonly traceService: TraceService,
    private readonly desktopMessageService: DesktopMessageService,
    private readonly multimonitorService: MultiMonitorServiceBase,
    private readonly ngZone: NgZone
  ) {}

  public handleObjectMessage(data: ObjectMessage): void {
    if (!isNullOrUndefined(data)) {
      this.ngZone.run(() => {
        if (data.type === ObjectMessageType.SwitchFrame) {
          this.messageBroker.switchToNextFrame(data.data.frame, data.data.msg);
        } else if (data.type === ObjectMessageType.ChangeMode) {
          // Change mode
          this.messageBroker.changeMode({
            id: data.data.id,
            relatedValue: data.data.relatedValue
          },
          undefined, data.data.newSelectionMessage).subscribe((modeChanged: boolean) => {

          });
        } else if (data.type === ObjectMessageType.SystemBrowserFilter) {
          this.objectManagerCoreService.updateVmFilter();
        } else if (data.type === ObjectMessageType.Logout) {
          // Leave if in electron
          this.messageBroker.changeMode({ id: DEFAULT_MODE_ID, relatedValue: null }, undefined).subscribe((modeChanged: boolean) => {

            this.multimonitorService.synchronizeUiState({
              sendToItself: true,
              state: {
                mode: {
                  currentMode: {
                    id: DEFAULT_MODE_ID,
                    relatedValue: null
                  }
                }
              }
            });

            this.desktopMessageService.invokeShutdownProcedure(new ShutdownInfo(data.data.dirtyState, false)).then(result => {
              this.traceService.info(trcModuleNameDesktop, `Logout procedure executed by electron main process, logout can finally be done: ${result}`);
              if (result === true) {
                this.messageBroker.logout(data.data.dirtyState);
              }
            });
          });

        } else if (data.type === ObjectMessageType.SendSelectionMessage) {
          // Node is selected from system browser

          // Reading the current active frame and view. They are notfied immediatly.
          let currentFrameId = '';
          const frameSub = this.messageBroker.getCurrentWorkAreaFrameInfo().subscribe(frame => {
            currentFrameId = frame.id;
          });
          frameSub?.unsubscribe();
          let currentViewId = '';
          const viewSub = this.messageBroker.getCurrentWorkAreaView().subscribe(view => {
            currentViewId = view;
          });
          viewSub?.unsubscribe();
          // Selecting frame and view and select object
          // Rules: Select System Manager - Tree View
          const msg: MessageParameters = data.data.message;
          if (currentFrameId === systemManagerFrameId) {
            if ((currentViewId !== treeViewId)) {
              this.messageBroker.changeView(systemManagerFrameId, treeViewId).subscribe(_changed => {
                // select the primary object
                this.messageBroker.switchToNextFrame(systemManagerFrameId, msg).subscribe();
              });
            } else {
              this.messageBroker.switchToNextFrame(systemManagerFrameId, msg).subscribe();
            }
          } else {
            this.messageBroker.switchToNextFrame(systemManagerFrameId, msg).subscribe(_changed => {
              this.messageBroker.changeView(systemManagerFrameId, treeViewId).subscribe();
            });
          }
        }
      });
    }
  }
}
