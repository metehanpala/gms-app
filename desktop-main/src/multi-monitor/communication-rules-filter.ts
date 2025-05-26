import { BrowserObject } from "@gms-flex/services";
import { CommunicationRule, ObjectFilterInstanceType, ObjectFilterType } from "../../../src/app/desktop-renderer/multi-monitor/multi-monitor-configuration.data";
import { MainTraceService } from "../tracing/main-trace-service";

export class CommunicationRulesFilter {

  constructor(private communicationRules: CommunicationRule[], private traceService: MainTraceService) {}

  public match(sourceManagerWindowId: string, node: BrowserObject): string | undefined {
    for (let i = 0; i < this.communicationRules.length; i++) {
      const rule = this.communicationRules[i];
      if ((rule.isRuleActive) && (sourceManagerWindowId !== rule.targetWindowId)) {
        // sending to itself (via IPC) is not needed as this happens when no rule matches.
        if ((rule.sourceWindowId == undefined) || (rule.sourceWindowId ===  sourceManagerWindowId)) {
          let result = false;
          switch (rule.filterCriteria.filterType) {
            case ObjectFilterType.ObjectDiscipline:
              result = (rule.filterCriteria.filterValue === node.Attributes.DisciplineId.toString());
              break;
            case ObjectFilterType.ObjectFunction:
              result = (rule.filterCriteria.filterValue === node.Attributes.FunctionName);
              break;
            case ObjectFilterType.ObjectInstance:
              result = this.checkInstanceType(rule, node);
              break;
            case ObjectFilterType.ObjectManagedType:
              result = (rule.filterCriteria.filterValue === node.Attributes.ManagedTypeName);
              break;
            case ObjectFilterType.ObjectModel:
              result = (rule.filterCriteria.filterValue === node.Attributes.ObjectModelName);
              break;
            case ObjectFilterType.ObjectType:
              result = (rule.filterCriteria.filterValue === node.Attributes.TypeId.toString());
              break;
            default:
              this.traceService.error(`MultiMonitorConfigurationHandler.matchCommunicationRules(): Argument error: ${rule.filterCriteria.filterType}`);
          }
          if (result) {
            return rule.targetWindowId;
          }
        }
      }
    };
    return undefined;
  }

  private checkInstanceType(rule: CommunicationRule, node: BrowserObject): boolean {
    switch (rule.filterCriteria.filterInstanceType) {
      case ObjectFilterInstanceType.OnlyInstance:
        return this.checkOnlyInstance(rule, node);
      case ObjectFilterInstanceType.OnlyChildren:
        return this.checkOnlyChildren(rule, node);
      case ObjectFilterInstanceType.OnlyRecursiveChildren:
        return this.checkOnlyRecursiveChildren(rule, node);
      case ObjectFilterInstanceType.InstanceAndChildren:
        return this.checkInstanceAndChildren(rule, node);
      case ObjectFilterInstanceType.InstanceAndRecursiveChildren:
        return this.checkInstanceAndRecursiveChildren(rule, node);
      default:
        this.traceService.error(`MultiMonitorConfigurationHandler.checkInstanceType(): Argument error: ${rule.filterCriteria.filterInstanceType}`);
        return false;
    }
  }

  private checkOnlyInstance(rule: CommunicationRule, node: BrowserObject): boolean {
    return rule.filterCriteria.filterValue === node.Designation;
  }

  private checkOnlyChildren(rule: CommunicationRule, node: BrowserObject): boolean {
    if (node.Designation.startsWith(rule.filterCriteria.filterValue)) {
      const remaining = node.Designation.slice(rule.filterCriteria.filterValue.length);
      const remainingNodes = remaining.split('.');
      if ((remainingNodes.length === 2) && (remainingNodes[0] === '')) {
        // We have exactly one direct child.
        // Example: remaining = '.Child' => remainingNodes = ['', 'Child']
        return true;
      }
    }
    return false;
  }

  private checkOnlyRecursiveChildren(rule: CommunicationRule, node: BrowserObject): boolean {
    if (node.Designation.startsWith(rule.filterCriteria.filterValue)) {
      const remaining = node.Designation.slice(rule.filterCriteria.filterValue.length);
      const remainingNodes = remaining.split('.');
      if ((remainingNodes.length >= 2) && (remainingNodes[0] === '')) {
        // We have exactly one direct child or more recursive children
        // Example: remaining = '.Child.SubChild' => remainingNodes = ['', 'Child', 'SubChild']
        return true;
      }
    }
    return false;
  }

  private checkInstanceAndChildren(rule: CommunicationRule, node: BrowserObject): boolean {
    if (this.checkOnlyInstance(rule, node)) {
      return true;
    }
    if (this.checkOnlyChildren(rule, node)) {
      return true;
    }
    return false;
  }

  private checkInstanceAndRecursiveChildren(rule: CommunicationRule, node: BrowserObject): boolean {
    if (this.checkOnlyInstance(rule, node)) {
      return true;
    }
    if (this.checkOnlyRecursiveChildren(rule, node)) {
      return true;
    }
    return false;
  }
}
