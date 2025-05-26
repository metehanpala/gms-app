import { MainMessage, MessageType, WindowCloseInfo } from 'desktop-main/src/messaging/window-message.data';

import { ElectronMessageService } from './electron-message.service';

export class WindowCloseInfoRequest {
  constructor(
    public contextId: number,
    private readonly apiElectron: ElectronMessageService
  ) {}

  public setReply(canWindowBeClosed: boolean): void {
    this.sendCanWindowBeClosedResult(new WindowCloseInfo(this.contextId, canWindowBeClosed));
  }

  private sendCanWindowBeClosedResult(info: WindowCloseInfo): void {
    this.apiElectron.sendToMain(new MainMessage(MessageType.CanWindowBeClosedReply, info));
  }
}
