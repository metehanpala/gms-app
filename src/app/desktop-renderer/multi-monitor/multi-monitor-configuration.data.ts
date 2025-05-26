export enum ManagerType {
  Main = 'main',
  MainWoEvent = 'main-wo-event',
  System = 'system',
  Event = 'event'
}

export interface ViewDefinition {
  id: string;
  defaultLayout: string;
}

export interface FrameDefinition {
  id: string;
  views?: ViewDefinition[];
}

export interface ManagerDefinition {
  managerType: ManagerType;
  frames?: FrameDefinition[];
  startupNode?: string;
}

export interface ManagerWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  displayId: number;
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
  scaleFactor: number;
  manager: ManagerDefinition;
}

export interface MultiMonitorConfiguration {
  version: number;
  windows: ManagerWindow[];
  communicationRules?: CommunicationRule[];
  overruleAllowed: boolean;
}

export interface ManagerInfo {
  framesToCreate: string[];
  managerDefinition: ManagerDefinition;
}

export enum ObjectFilterType {
  ObjectFunction = 'Object function',
  ObjectModel = 'Object model',
  ObjectType = 'Object type',
  ObjectDiscipline = 'Object discipline',
  ObjectInstance = 'Object instance',
  ObjectManagedType = 'Object managed type'
}

export interface ObjectFilterTypeInfo {
  type: ObjectFilterType;
  text: string;
}

export enum ObjectFilterInstanceType {
  OnlyInstance = 'Only instance',
  OnlyChildren = 'Only children',
  OnlyRecursiveChildren = 'Only recursive children',
  InstanceAndChildren = 'Instance and children',
  InstanceAndRecursiveChildren = 'Instance and recursive children'
}

export interface ObjectFilterInstanceTypeInfo {
  type: ObjectFilterInstanceType;
  text: string;
}

export interface CommunicationRule {
  filterCriteria: ObjectFilterCritera;
  sourceWindowId: string;
  targetWindowId: string;
  isRuleActive: boolean;
}

export interface ObjectFilterCritera {
  filterType: ObjectFilterType;
  filterTypeText?: string;
  filterInstanceType?: ObjectFilterInstanceType;
  filterInstanceTypeText?: string;
  filterValue: string;
  filterValueDescriptor: string;
  objectDesignation: string;
}
