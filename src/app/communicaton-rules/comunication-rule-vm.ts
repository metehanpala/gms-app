import { BrowserObject, SystemBrowserServiceBase } from '@gms-flex/services';
import { TranslateService } from '@ngx-translate/core';
import { WindowInfo } from 'desktop-main/src/messaging/window-message.data';

import { CommunicationRule, ObjectFilterCritera, ObjectFilterType } from '../desktop-renderer/multi-monitor/multi-monitor-configuration.data';

export class CommunicationRuleVm {

  public browserObject: BrowserObject;
  private tableWinAnySelected: string;
  private tableWinError: string;
  private tableFilterError: string;

  constructor(
    private readonly communicationRule: CommunicationRule,
    private readonly winInfos: WindowInfo[],
    private readonly systemBrowser: SystemBrowserServiceBase,
    private readonly translateService: TranslateService) {
    this.validate();

    this.translateService.get([
      'RULES.TABLE_WIN_ANY_SELECTED',
      'RULES.TABLE_WIN_ERROR',
      'RULES.TABLE_FILTER_ERROR'
    ]).subscribe(texts => {
      this.tableWinAnySelected = texts['RULES.TABLE_WIN_ANY_SELECTED'];
      this.tableWinError = texts['RULES.TABLE_WIN_ERROR'];
      this.tableFilterError = texts['RULES.TABLE_FILTER_ERROR'];
    });
  }

  public get rule(): CommunicationRule {
    return this.communicationRule;
  }

  public get filterCriteria(): ObjectFilterCritera {
    return this.communicationRule.filterCriteria;
  }

  public set filterCriteria(filterCriteria: ObjectFilterCritera) {
    this.communicationRule.filterCriteria = filterCriteria;
  }

  public get sourceWindowId(): string {
    return this.communicationRule.sourceWindowId;
  }

  public set sourceWindowId(sourceWindowId: string) {
    this.communicationRule.sourceWindowId = sourceWindowId;
  }

  public get targetWindowId(): string {
    return this.communicationRule.targetWindowId;
  }

  public set targetWindowId(targetWindowId: string) {
    this.communicationRule.targetWindowId = targetWindowId;
  }

  public get isRuleActive(): boolean {
    return this.communicationRule.isRuleActive;
  }

  public set isRuleActive(isRuleActive: boolean) {
    this.communicationRule.isRuleActive = isRuleActive;
  }

  public get sourceWindowDescriptor(): string {
    const found = this.winInfos.find(wInfo => wInfo.managerWindowId === this.sourceWindowId);
    return found ? found.title : this.tableWinAnySelected;
  }

  public get targetWindowDescriptor(): string {
    const found = this.winInfos.find(wInfo => wInfo.managerWindowId === this.targetWindowId);
    return found ? found.title : this.tableWinError;
  }

  public get objectFilterCriteria(): string {
    if (this.filterCriteria.filterValueDescriptor == undefined) {
      return this.tableFilterError;
    } else if (this.filterCriteria.filterType === ObjectFilterType.ObjectInstance) {
      return `${this.filterCriteria.filterTypeText} = ${this.filterCriteria.filterValueDescriptor} (${this.filterCriteria.filterInstanceTypeText})`;
    } else {
      return `${this.filterCriteria.filterTypeText} = ${this.filterCriteria.filterValueDescriptor}`;
    }
  }

  public get useAnySourceWindow(): boolean {
    return (this.sourceWindowId === undefined);
  }

  public get isFilterObjectSet(): boolean {
    return ((this.filterCriteria.objectDesignation !== undefined) && (this.filterCriteria.objectDesignation !== ''));
  }

  public get showFilterCriteriaWarning(): boolean {
    return (this.isFilterObjectSet && !this.isFilterCriteriaValid);
  }

  public get isFilterCriteriaValid(): boolean {
    return (this.filterCriteria.filterValue !== undefined) && (this.filterCriteria.filterValue !== '');
  }

  public get isFilterTypeInstance(): boolean {
    return (this.filterCriteria.filterType === ObjectFilterType.ObjectInstance);
  }

  public get isObjectFilterValid(): boolean {
    if (this.isFilterTypeInstance) {
      return (this.objectIsValid && this.isFilterCriteriaValid && this.isFilterObjectSet);
    } else {
      return (this.isFilterCriteriaValid && this.isFilterObjectSet);
    }
  }

  public get isTargetWindowValid(): boolean {
    if (this.targetWindowId === undefined ||
      this.winInfos.find(wInfo => wInfo.managerWindowId === this.targetWindowId) === undefined) {
      return false;
    }
    return true;
  }

  public get isSourceWindowValid(): boolean {
    if ((this.sourceWindowId !== undefined) && (this.winInfos.find(wInfo => wInfo.managerWindowId === this.sourceWindowId) === undefined)) {
      return false;
    }
    return true;
  }

  public get isValid(): boolean {
    if (this.isObjectFilterValid === false ||
      this.isTargetWindowValid === false ||
      this.isSourceWindowValid === false) {
      return false;
    }
    return true;
  }

  public get isFilterCriteriaInstance(): boolean {
    return (this.filterCriteria.filterType === ObjectFilterType.ObjectInstance);
  }

  public clone(): CommunicationRuleVm {
    return new CommunicationRuleVm({
      filterCriteria: {
        filterType: this.filterCriteria.filterType,
        filterTypeText: this.filterCriteria.filterTypeText,
        filterInstanceType: this.filterCriteria.filterInstanceType,
        filterInstanceTypeText: this.filterCriteria.filterInstanceTypeText,
        filterValue: this.filterCriteria.filterValue,
        filterValueDescriptor: this.filterCriteria.filterValueDescriptor,
        objectDesignation: this.filterCriteria.objectDesignation
      },
      sourceWindowId: this.sourceWindowId,
      targetWindowId: this.targetWindowId,
      isRuleActive: this.isRuleActive },
    this.winInfos,
    this.systemBrowser,
    this.translateService);
  }

  public validate(): void {
    this.validateObjectDesignation();
  }

  public get objectIsValid(): boolean {
    return (this.browserObject !== undefined);
  }

  private validateObjectDesignation(): void {
    if (this.isFilterObjectSet) {
      // TODO: system Id!
      this.systemBrowser.searchNodes(1, this.filterCriteria.objectDesignation).subscribe(page => {
        this.browserObject = (page.Nodes?.length > 0) ? page.Nodes[0] : undefined;
      });
    } else {
      this.browserObject = undefined;
    }
  }
}
