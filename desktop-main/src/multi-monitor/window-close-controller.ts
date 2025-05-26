import { ShowBackDropInfo, ShowBackDropReason } from "../messaging/window-message.data";
import { WindowHandler } from "./window-handler";


/**
 * This class contains the functionality for a proper closing of the windows.
 * This includes:
 * Asking the respective window (wbsite) if it can be closed or not (e.g. due to any state such as 'unsaved' data,...).
 * Closing the window if allowed.
 *
 * @export
 * @class WindowCloseController
 */
export class WindowCloseController {
  private dirtyStatePerWindow = new Map<number, boolean | undefined>();
  private _closeAllWindowsInvoked = false;
  private _doCloseMain = false;
  private _canMainWindowBeClosed = false;
  private singleCanWindowBeClosedRequests = new Map<number, Promise<boolean>>();
  private singleCanWindowBeClosedRequestsHijacked = new Map<number, boolean>();
  private _dirtyCheckWindowsInvoked = false;
  private showBackDropDisappearDelay = 0;
  private windowBackdropCommand = new Map<number, ShowBackDropInfo>();

  constructor(private windowHandler: WindowHandler) { }

  public get doCloseMain(): boolean {
    return this._doCloseMain;
  }

  public set doCloseMain(value: boolean) {
    this._doCloseMain = value;
  }

  public get closeAllWindowsInvoked(): boolean {
    return this._closeAllWindowsInvoked;
  }

  public get dirtyCheckWindowsInvoked(): boolean {
    return this._dirtyCheckWindowsInvoked;
  }

  public get closeAnyWindowInvoked(): boolean {
    return (this._closeAllWindowsInvoked || (this.singleCanWindowBeClosedRequests.size > 0));
  }

  public isWindowDirty(winId: number): boolean | undefined {
    return this.dirtyStatePerWindow.get(winId);
  }

  public isWindowDirtyCheckStarted(winId: number): boolean {
    return this.dirtyStatePerWindow.has(winId);
  }

  public isWindowDirtyCheckPending(winId: number): boolean {
    return ((this.dirtyStatePerWindow.has(winId)) && (this.dirtyStatePerWindow.get(winId) === undefined));
  }

  public isWindowDirtyCheckDone(winId: number): boolean {
    return ((this.dirtyStatePerWindow.has(winId)) && (this.dirtyStatePerWindow.get(winId) !== undefined));
  }

  public canMainWindowBeClosed(): boolean {
    return (this._canMainWindowBeClosed && (this._doCloseMain));
  }

  /**
   *
   *
   * @param {number[]} windowIds
   * @returns {Promise<boolean>} True, if the check succeeds (not windows are dirty) and the action can go on
   * @memberof WindowCloseController
   */
  public checkWindows(windowIds: number[]):  Promise<boolean> {
    if (this.closeAnyWindowInvoked) {
      return Promise.resolve(false);
    }
    if (windowIds.length === 0) {
      return Promise.resolve(true);
    }

    this._dirtyCheckWindowsInvoked = true;
    const p = new Promise<boolean>((resolve) => {
      const proms: Promise<boolean>[] = [];
      windowIds.forEach(winId => {
        proms.push(this.windowHandler.canWindowBeClosed(winId));
        this.windowHandler.restoreAndFocus(winId);
      });

      let canDoClose = true;
      const resultMap = new Map<number, boolean | undefined>();
      proms.forEach((prom, index) => {
        prom.then(result => {
          resultMap.set(index, result);
          if (result === false) {
            canDoClose = false;
          }
          if (resultMap.size === proms.length) {
            // all promises are done
            windowIds.forEach((winId) => {
              this.windowHandler.showBackDrop(winId,  new ShowBackDropInfo(false, ShowBackDropReason.Close));
            });
            resolve(canDoClose);
            this._dirtyCheckWindowsInvoked = false;
          } else {
            // as long as not all answers are retrieved, we disable the respecive window
            this.windowHandler.showBackDrop(windowIds[index],  new ShowBackDropInfo(true, ShowBackDropReason.Close));
          }
        });
      });
    });
    return p;
  }

  /**
   * Checks all windows (websites) if they an be closed. A window (website) typically checks if it is in dirty state (contains invalid data).
   * The windows which reply with true, will be immediately closed. The others not.
   *
   * @param {boolean} [doCloseMain=false] If the main manager shall be closed or not
   * @param {boolean} [skipDirtyCheck=false] Skip the dirty check of the windows
   * @returns {Promise<boolean>} Returns true, if all windows are allowed to be closed.
   * @memberof WindowCloseController
   */
  public closeAllWindows(doCloseMain: boolean = false, skipDirtyCheck: boolean = false): Promise<boolean> {
    if (this.closeAllWindowsInvoked) {
      return Promise.resolve(false);
    }

    this._closeAllWindowsInvoked = true;
    this._canMainWindowBeClosed = false;
    this._doCloseMain = doCloseMain;
    const bdReason = doCloseMain? ShowBackDropReason.Close : ShowBackDropReason.Logoff;
    const p = this.checkAllWindows(bdReason, skipDirtyCheck);
    p.then(notDirty => {
      if (notDirty) {
        // no window is dirty, all can be closed => closing all additional managers first and then possibly the main manager
        this._canMainWindowBeClosed = true;
        const winIds: number[] = this.windowHandler.additionalManagerWindows.map(win => win.id);
        winIds.forEach(winId => {
          this.windowHandler.closeWindow(winId);
        });
        if (doCloseMain) {
          this.windowHandler.closeWindow(this.windowHandler.mainMangerWindow!.id);
        }
      }
      this.clearDirtyState();
      this._closeAllWindowsInvoked = false;
    });
    return p;
  }

  public checkAllWindows(bdReason: ShowBackDropReason, skipDirtyCheck: boolean = false, showBackDropDisappearDelay: number = 0): Promise<boolean> {
    if (this.dirtyCheckWindowsInvoked) {
      return Promise.resolve(false);
    }

    this.clearDirtyState();
    this._dirtyCheckWindowsInvoked = true;
    this.windowBackdropCommand.clear();
    this.showBackDropDisappearDelay = showBackDropDisappearDelay;
    const p = new Promise<boolean>((resolve) => {
      const proms: Promise<boolean>[] = [];
      const winIds: number[] = [];
      this.windowHandler.additionalManagerWindows.forEach(win => {
        if (skipDirtyCheck) {
          proms.push(Promise.resolve(true));
        } else {
          if (this.singleCanWindowBeClosedRequests.has(win.id)) {
            // a single close window action is already pending for this window => we hijack this promise!
            proms.push(this.singleCanWindowBeClosedRequests.get(win.id)!);
            this.singleCanWindowBeClosedRequestsHijacked.set(win.id, true);
          } else {
            proms.push(this.windowHandler.canWindowBeClosed(win.id));
          }
        }
        winIds.push(win.id);
        this.windowHandler.restoreAndFocus(win.id);
      });
      if (skipDirtyCheck) {
        proms.push(Promise.resolve(true));
      } else {
        proms.push(this.windowHandler.canWindowBeClosed(this.windowHandler.mainMangerWindow!.id));
      }
      winIds.push(this.windowHandler.mainMangerWindow!.id);
      this.windowHandler.restoreAndFocus(this.windowHandler.mainMangerWindow!.id);
      let canDoClose = true;

      const resultMap = new Map<number, boolean | undefined>();
      proms.forEach((prom, index) => {
        this.dirtyStatePerWindow.set(winIds[index], undefined);
        prom.then(result => {
          resultMap.set(index, result);
          this.dirtyStatePerWindow.set(winIds[index], !result); // the result is true when the window can be closed.
          if (result === false) {
            canDoClose = false;
          }

          // windows which did reply need to be disabled in order that the user does not edit on them as long as the process is transient
          this.windowBackdropCommand.set(winIds[index], new ShowBackDropInfo(true, bdReason));
          setTimeout(() => {
            // windows which did reply need to be disabled in order that the user does not edit on them as long as the process is transient
            this.invokeShowBackdrop(winIds[index]);
          }, 100);

          if (resultMap.size === proms.length) {
            setTimeout(() => {
              if (this.windowHandler.mainMangerWindow !== undefined) {
                this.windowBackdropCommand.set(this.windowHandler.mainMangerWindow!.id, new ShowBackDropInfo(false, bdReason));
                this.invokeShowBackdrop(this.windowHandler.mainMangerWindow!.id);
                winIds.forEach((winId) => {
                  this.windowBackdropCommand.set(winId, new ShowBackDropInfo(false, bdReason));
                  this.invokeShowBackdrop(winId);
                });
              }
            }, this.showBackDropDisappearDelay);

            resolve(canDoClose);
            this._dirtyCheckWindowsInvoked = false;
          }
        });
      });
    });

    setTimeout(() => {
      this.showBackDropDisappearDelay = 0;
    }, 2000);

    return p;
  }

  public clearDirtyState(): void {
    this.dirtyStatePerWindow.clear();
  }

  public closeWindow(winId: number): Promise<boolean> {
    if (this._closeAllWindowsInvoked) {
      return Promise.resolve(false);
    }
    if (this.singleCanWindowBeClosedRequests.has(winId)) {
      return Promise.resolve(false);
    }

    const p = new Promise<boolean>((resolve) => {
      const pReq = this.windowHandler.canWindowBeClosed(winId);
      this.singleCanWindowBeClosedRequests.set(winId, pReq);
      this.singleCanWindowBeClosedRequestsHijacked.set(winId, false);
      pReq.then(result => {
        if (this.singleCanWindowBeClosedRequestsHijacked.get(winId) === false) {
          // we only close the window if the promise got not hijacked
          this.dirtyStatePerWindow.set(winId, !result); // the result is true when the window can be closed.
          if (result) {
            this.windowHandler.closeWindow(winId);
          }
          resolve(result);
          this.dirtyStatePerWindow.delete(winId);
        } else {
          // the promise got hijacked by a 'close all windows request. The respective promise result is handled there
          resolve(false);
        }
        this.singleCanWindowBeClosedRequests.delete(winId);
      });
    });
    return p;
  }

  private invokeShowBackdrop(winId: number): void {
    if (this.windowBackdropCommand.has(winId)) {
      this.windowHandler.showBackDrop(winId, this.windowBackdropCommand.get(winId)!);
    }
    this.windowBackdropCommand.delete(winId);
  }

  // Method waits for all promises to complete before the windows do close
  // => wrong approach, as already checked windows might get dirty again
  // public Invoke(): Promise<boolean> {
  //   // This method closes the windows after all windows did reply for the dirty check
  //   const p = new Promise<boolean>((resolve) => {
  //     const proms: Promise<boolean>[] = [];
  //     const winIds: number[] = [];
  //     this.windowHandler.additionalManagerWindows.forEach(win => {
  //       proms.push(this.messageService.canDoLogout(win.id));
  //       winIds.push(win.id);
  //       this.windowHandler.restoreAndFocus(win.id);
  //     });
  //     proms.push(this.messageService.canDoLogout(this.windowHandler.mainMangerWindow!.id));
  //     winIds.push(this.windowHandler.mainMangerWindow!.id);
  //     this.windowHandler.restoreAndFocus(this.windowHandler.mainMangerWindow!.id);

  //     let canDoClose = true;
  //     // ask all windows, if logout could be done (no unsaved data existing...)
  //     Promise.all(proms).then(results => {
  //       for (let idx = 0; idx < results.length - 1; idx++) {
  //         if (results[idx] === true) {
  //           // close the window (no unsaved data)
  //           this.windowHandler.closeWindow(winIds[idx]);
  //         } else {
  //           canDoClose = false;
  //         }
  //       }
  //       // check also the main window
  //       if (results[results.length - 1] === false) {
  //         canDoClose = false
  //       }
  //       resolve(canDoClose);
  //     });
  //   });
  //   return p;
  // }
}
