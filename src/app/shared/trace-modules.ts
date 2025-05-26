/* eslint-disable @typescript-eslint/naming-convention */

enum TraceModulesEn {
  gmsApp_rightPanelState,
  gmsApp_objetMessageService
}

export class TraceModules {
  public static rightPanelState: string = TraceModulesEn[TraceModulesEn.gmsApp_rightPanelState];
  public static objectMessageService: string = TraceModulesEn[TraceModulesEn.gmsApp_objetMessageService];
}
