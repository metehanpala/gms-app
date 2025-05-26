import { CnsLabel } from "@gms-flex/services";
import { ChangeModeData } from "@gms-flex/services-common";
import { MultiMonitorConfiguration } from "../../../src/app/desktop-renderer/multi-monitor/multi-monitor-configuration.data";

export class MainMessage {
  constructor(
    public messageType: string,
    public data?: any,
    public webContentsId?: number
  ) {}
}

export class RendererMessage extends MainMessage {
  constructor(
    public sourceWinId: number,
    public destinationWinId: number,
    messageType: string,
    data?: any
  )
  {
    super(messageType, data)
  }
}

export enum MessageType {
  SendObjectToWindow = 'send-object-to-window',
  SendObjectToMain = 'send-object-to-main',
  SendObjectToAllWindows = 'send-object-to-all-windows',
  SendEvent = 'send-event',
  SendTrace = 'send-trace',
  SynchronizeUiState = 'synchronize-ui-state',
  HistoryStateUpdate = 'history-state-update',
  ManagerInfoCurrentConfigurationChanged = 'manager-info-current-configuration-changed',
  CurrentMmConfigurationChanged = 'current-mm-configuration-changed',
  DefaultMmConfigurationChanged = 'default-mm-configuration-changed',
  CommunicationChannelReady = 'communication-channel-ready',
  StartAdditionalSystemManager = 'start-additional-system-manager',
  DetachEventManager = 'detach-event-manager',
  SaveCurrentConfigurationAsDefault = 'save-current-configuration-as-default',
  BootstrapApplication = 'bootstrap-application',
  ViewCertificate = 'view-certificate',
  AcceptCertificateAndReload = 'accept-certificate-and-reload',
  ImportCertificate = 'import-certificate',
  DenyCertificateAndClose = 'deny-certificate-and-close',
  TestEndpointAddress = 'test-endpoint-address',
  ConfigureEndpointAddress = 'configure-endpoint-address',
  ReloadApplication = 'reload-application',
  ReloadChildWindow = 'reload-child-window',
  CloseChildWindow = 'close-child-window',
  SelectClientCertificateAndCloseDialog = 'select-client-certificate-and-close-dialog',
  CancelClientCertificateSelectionAndCloseApp = 'cancel-client-certificate-selection-and-close-app',
  ViewClientCertificate = 'view-client-certificate',
  ClearSecuritySettings = 'clear-security-settings',
  QuitAndInstallUpdate = 'quit-and-install-update',
  RemindLaterForUpdate = 'remind-later-for-update',
  CanWindowBeClosedReply = 'can-window-be-closed-reply',
  SetActiveLayout = 'set-active-layout',
  SetActiveLanguage = 'set-active-language',
  SetStartupNode = 'set-startup-node',
  ShowBackDrop = 'show-back-drop',
  Focus = 'focus',
  ResumeEventManager = 'resume-event-manager',
  Reload = 'reload-page',
  EditCommunicationRules = 'edit-communication-rules',
  SaveCommunicationRules = 'save-communication-rules',
  CloseCommunicationRulesEditor = 'close-communication-rules-editor'
}

export enum SyncMessageType {
  GetClientIdentification = 'get-client-identification',
  GetAppInfo = 'get-app-info',
  GetDefaultConfiguration = 'get-default-configuration',
  GetManagerInfoOfCurrentConfiguration = 'get-manager-info-of-current-configuration',
  IsMainManager = 'is-main-manager',
  IsManagerWithEvent = 'is-manager-with-event',
  IsDefaultConfigurationChangeAllowed = 'is-default-configuration-change-allowed',
  IsCurrentConfigurationChangeAllowed = 'is-current-configuration-change-allowed',
  IsUserConfigurationChangeAllowed = 'is-user-configuration-change-allowed',
  IsClosedModeActive = 'is-closed-mode-active',
  GetCurrentCertificateError = 'get-current-certificate-error',
  GetCurrentConnectionError = 'get-current-connection-error',
  GetClientCertificateInfo = 'get-client-certificate-info',
  SaveEndpointAddress = 'save-endpoint-address',
  ReadEndpointAddress = 'read-endpoint-address',
  ReadDownloadedEndpointAddress = 'read-downloaded-endpoint-address',
  GetClientUpdateInfo = 'get-client-update-info',
  GetBrandInfo = 'get-brand-info',
  SetZoom ='set-zoom',
  GetUiState = 'get-ui-state',
  GetCommunicationRules = 'get-communication-rules',
  MatchCommunicationRules = 'match-communication-rules',
  GetWindowsInfo = 'get-windows-info',
  GetOwnWindowInfo = 'get-own-window-info'
}

export enum AsyncMessageType {
  DoShutdownProcedure = 'do-shutdown-procedure',
  CanWindowBeClosed = 'can-window-be-closed',
  ResetToDefaultConfiguration = 'reset-to-default-configuration',
  EditEndpointAddress = 'edit-endpoint-address',
  CaptureWindows = 'capture-windows'
}

export enum TraceType {
  Info = 'info',
  Warn = 'warn',
  Debug = 'debug',
  Error = 'error'
}

export class CertificateErrorInfo {
  constructor(
    public hostUrl: string,
    public subjectName: string,
    public serialNumber: string
  ) {}
}

export class ActiveLayoutInfo {
  constructor(
    public frameId: string,
    public viewId: string,
    public layoutId: string
  ) {}
}

export class ConnectionErrorInfo {
  constructor(
    public hostUrl: string,
    public errorCode: number,
    public errorDescription?: string
  ) {}
}

export class CertificateInfo {
  constructor(
    public hostUrl: string,
    public subjectName: string,
    public issuerName: string,
    public serialNumber: string,
    public thumbPrint: string
  ) {}
}

export class BrandInfo {
  constructor(
    public brandName: string,
    public brandDisplayName: string,
    public landingImage: string
  ) {}
}

export class ClientUpdateInfo {
  constructor(
    public applicationName: string,
    public currentVersion: string,
    public newVersion: string,
    public releaseDate: string
  ) {}
}

export class HistoryUpdateInfo {
  constructor(
    public canGoBack: boolean,
    public canGoFwd: boolean
  ) {}
}

export class WindowCloseInfo {
  constructor(
    public contextId: number,
    public canWindowBeClosed: boolean = false
  ) {}
}

export class ShowBackDropInfo {
  constructor(
    public show: boolean,
    public reason: ShowBackDropReason
  ) {}
}

export enum ShowBackDropReason {
  Logoff = 'logoff',
  Close = 'close',
  AppyDefault = 'apply-default',
  None = 'none'
}

export class ShutdownInfo {
  constructor(
    public skipDirtyCheck: boolean,
    public closeMainWindow: boolean
  ) {}
}

export class BootstrapInfo {
  constructor(
    public userInfo: UserInfo,
    public endpointAddress: string,
    public defaultConfiguration: MultiMonitorConfiguration | undefined,
    public userConfiguration: MultiMonitorConfiguration | undefined,
    public translationText: any
  ) {}
}

export class AppInfo {
  constructor(
    public appLocale: string,
    public activeLanguage?: string,
    public userInfo?: UserInfo,
  ) {}
}

export class UserInfo {
  constructor(
    public user: string,
    public userLanguage: string,
    public hasConfigureRight: boolean,
  ) {}
}

export interface CaptureWindowRequestInfo {
  includeOwnWindow: boolean;
  includeThumbnail: boolean;
  includeDetachedEvent: boolean;
}

export interface GetWindowRequestInfo {
  includeOwnWindow: boolean;
  includeDetachedEvent: boolean;
}

export interface WindowInfo {
  browserWindowId: number;
  managerWindowId: string;
  webContentsId: number;
  title: string;
}

export interface CaptureWindowInfo {
  windowInfo: WindowInfo;
  sourceId: string;
  thumbNailDataUrl?: string
}

export type ElectronThemeType = 'dark' | 'light' | 'system';

export interface UiState {
  textRepresentation?: CnsLabel;
  statusBarHeight?: string;
  buzzerEnabled?: boolean;
  themeType?: ElectronThemeType;
  mode?: ChangeModeData;
}

export interface SynchData {
  sendToItself: boolean;
  state: UiState;
}

export interface ClientIdentifier {
  clientId: string,
  hostName: string
}

export interface MultiMonitorConfigurationInfo {
  clientId: ClientIdentifier,
  configuration: MultiMonitorConfiguration
}

// export interface ObjectAttributes {
//   Alias: string;
//   DefaultProperty: string;
//   DisciplineDescriptor: string;
//   DisciplineId: number;
//   FunctionDefaultProperty?: string;
//   FunctionName: string;
//   ManagedType: number;
//   ManagedTypeName: string;
//   ObjectId: string;
//   SubDisciplineDescriptor: string;
//   SubDisciplineId: number;
//   SubTypeDescriptor: string;
//   SubTypeId: number;
//   TypeDescriptor: string;
//   TypeId: number;
//   ObjectModelName: string;
//   CustomData?: any;
//   ValidationRules?: any;
// }

// export interface BrowserObject {
//   Attributes: ObjectAttributes;
//   Descriptor: string;
//   Designation: string;
//   HasChild: boolean;
//   Name: string;
//   Location: string;
//   ObjectId: string;
//   SystemId: number;
//   ViewId: number;
//   ViewType: number;
// }
