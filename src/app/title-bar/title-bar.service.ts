import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { FullSnapInId, IObjectSelection, StateService } from '@gms-flex/core';
import { TraceService } from '@gms-flex/services-common';
import { TranslateService } from '@ngx-translate/core';
import { MenuItem } from '@simpl/element-ng';
import { Observable, Subject, Subscription } from 'rxjs';

import { trcModuleNameApp } from '../app.component';
import { NAVBAR_RESOURCE_KEY } from '../main/main.component';

@Injectable({ providedIn: 'root' })
export class TitleBarService {
  private readonly subscriptions: Subscription[] = [];
  private readonly _title: Subject<string> = new Subject<string>();
  private titleKey = '';

  constructor(
    private readonly titleService: Title,
    private readonly stateService: StateService,
    private readonly objectSelectionService: IObjectSelection,
    private readonly translateService: TranslateService,
    private readonly traceService: TraceService) {}

  public get title(): Observable<string> {
    return this._title.asObservable();
  }

  /**
   * The application title is set, based on the selected primary or vertical navigation bar item label.
   * The following rules/priorities apply:
   * 1. The label of the vertical menu item selected.
   * This corresponds to a frame (Examples: Account, Notification) or a view (Examples: Device View, Recipients or Tree View of System Manager).
   * 2. The label of the primary menu item selected. Example: Events
   * 3. If no vertical and no primary menu is shown, the frame id is translated to the respective frame title.
   *
   * Exception: In case of the System Manager with the Tree View, the selected object shown in the primary pane header is used for the title.
   *
   * @param {} selectedPrimaryMenu
   * @param {} selectedVerticalMenu
   * @param {} frameId
   * @param {} brandProductName
   * @memberof TitleBarService
   */
  public setAppTitle(selectedPrimaryMenu: MenuItem, selectedVerticalMenu: MenuItem, frameId: string, brandProductName: string, browserWinId?: number): void {
    this.subscriptions.forEach((subscription: Subscription) => { if (subscription != null) { subscription.unsubscribe(); } });

    if (selectedVerticalMenu !== undefined) {
      this.titleKey = selectedVerticalMenu.title;
    } else if (selectedPrimaryMenu !== undefined) {
      this.titleKey = selectedPrimaryMenu.title;
    } else {
      this.titleKey = `${NAVBAR_RESOURCE_KEY}${frameId}`;
    }

    this.traceService.info(trcModuleNameApp, `setAppTitle() called; subTitle translate key set to: ${this.titleKey}`);

    // set the title based on frame/view selection
    this.translateService.get(this.titleKey).subscribe(text => {
      this.setAppTitleInt(text, brandProductName, browserWinId);
    });

    const frameStore = this.stateService.currentState.getFrameStoreViaId(frameId);
    this.subscriptions.push(frameStore.selectedLayoutId.subscribe(layoutId => {
      const paneIds = frameStore.paneIdsPerLayout.get(layoutId);
      const paneId = paneIds.find(item => {
        const paneStore = this.stateService.currentState.getPaneStoreViaIds(frameId, item);
        return paneStore.paneConfig.showSelectedObjectInAppTitle;
      });
      if (paneId !== undefined) {
        const paneStore = this.stateService.currentState.getPaneStoreViaIds(frameId, paneId);
        this.subscriptions.push(paneStore.selectedSnapInId.subscribe(snapinId => {
          this.subscriptions.push(this.objectSelectionService.getSelectedObject(new FullSnapInId(frameId, snapinId)).subscribe(selObject => {
            this.setAppTitleInt(selObject.title, brandProductName, browserWinId, frameId, layoutId, paneId);
          }));
        }));
      } else {
        this.translateService.get(this.titleKey).subscribe(text => {
          this.setAppTitleInt(text, brandProductName, browserWinId, frameId, layoutId, paneId);
        });
      }
    }));
  }

  /**
   * Sets the title of the titlebar explicit in the form: 'SubTitle - Title - (browserWinId)'
   *
   * @param  subTitle
   * @param  title
   * @memberof TitleBarService
   */
  public setTitle(subTitle: string, title: string, browserWinId?: number): string {
    let appTitle = `${subTitle} - ${title}`;
    if (browserWinId != undefined) {
      appTitle = `${appTitle} (#${browserWinId})`;
    }
    this._title.next(appTitle);
    this.titleService.setTitle(appTitle);
    return appTitle;
  }

  public setTitle2(title: string, browserWinId?: number): string {
    let appTitle = title;
    if (browserWinId != undefined) {
      appTitle = `${appTitle} (#${browserWinId})`;
    }
    this._title.next(appTitle);
    this.titleService.setTitle(appTitle);
    return appTitle;
  }

  private setAppTitleInt(subTitle: string, brandProductName: string, browserWinId?: number, frameId?: string, layoutId?: string, paneId?: string): void {
    const appTitle = this.setTitle(subTitle, brandProductName, browserWinId);

    if (layoutId === undefined) {
      this.traceService.info(trcModuleNameApp, `setAppTitle(); setting app title to: ${appTitle}`);
    } else {
      this.traceService.info(trcModuleNameApp, `Selected layout changed; setting app title to: ${appTitle};
      frameId=${frameId}, layoutId=${layoutId}, paneId=${paneId}`);
    }
  }
}
