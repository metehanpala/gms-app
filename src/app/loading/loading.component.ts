import { Component, OnInit } from '@angular/core';
import { IHfwMessage, StateService } from '@gms-flex/core';

import { DesktopMessageService } from '../desktop-renderer/messaging/desktop-message.service';
import { UiStateHandler } from '../desktop-renderer/multi-monitor/ui-state-handler';

@Component({
  selector: 'gms-loading',
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
  standalone: false
})
export class LoadingComponent implements OnInit {

  constructor(
    private readonly messageBroker: IHfwMessage,
    private readonly stateService: StateService,
    private readonly desktopMessageService: DesktopMessageService,
    private readonly uiStateHandler: UiStateHandler
  ) {
  }

  public ngOnInit(): void {
    this.stateService.navigateFrames(this.messageBroker).subscribe(res => {
      if (res) {
        if (this.desktopMessageService.runsInElectron) {
          const currentState = this.desktopMessageService.getUiSyncState();
          if (currentState) {
            for (const property in currentState) {
              if (currentState.hasOwnProperty(property)) {
                this.uiStateHandler.handleUiState(property, currentState);
              }
            }
          }
        }
      }
    });
  }

}
