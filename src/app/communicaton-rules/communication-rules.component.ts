import { Component, ElementRef, HostBinding, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SystemBrowserServiceBase } from '@gms-flex/services';
import { AppContextService, AuthenticationServiceBase, LanguageServiceBase, LocalizationService, TraceService } from '@gms-flex/services-common';
import { ModalDialogResult, ObjectManagerService, ObjectManagerServiceModalOptions } from '@gms-flex/snapin-common';
import { TranslateService } from '@ngx-translate/core';
import { ColumnMode, SelectionType, TableColumn } from '@siemens/ngx-datatable';
import { DeleteConfirmationDialogResult, SiActionDialogService, SiWizardComponent } from '@simpl/element-ng';
import { SI_DATATABLE_CONFIG } from '@simpl/element-ng/datatable';
import { GetWindowRequestInfo, WindowInfo } from 'desktop-main/src/messaging/window-message.data';
import { animationFrameScheduler, Subject, Subscription } from 'rxjs';

import { DesktopMessageService, trcModuleNameDesktop } from '../desktop-renderer/messaging/desktop-message.service';
import { CommunicationRule, ObjectFilterInstanceType, ObjectFilterInstanceTypeInfo, 
  ObjectFilterType, ObjectFilterTypeInfo } from '../desktop-renderer/multi-monitor/multi-monitor-configuration.data';
import { TitleBarService } from '../title-bar/title-bar.service';
import { CommunicationRuleVm } from './comunication-rule-vm';

@Component({
  selector: 'gms-communication-rules',
  templateUrl: './communication-rules.component.html',
  styleUrl: './communication-rules.component.scss',
  standalone: false
})
export class CommunicationRulesComponent implements OnInit, OnDestroy {
  @HostBinding('class.hfw-flex-container-column') public guardFrame = true;
  @HostBinding('class.hfw-flex-item-grow') public guardGrow = true;
  @HostBinding('class.h-100') public guardHeight = true;
  public tableConfig = SI_DATATABLE_CONFIG;
  public communicationRules: CommunicationRuleVm[] = [];
  public selectedCommunicationRule: CommunicationRuleVm[] = [];
  public winInfos: WindowInfo[];
  public wizardCommunicationRule: CommunicationRuleVm;
  @Input() public sourceWindowStepInit = new Subject<boolean>();
  @Input() public targetWindowStepInit = new Subject<boolean>();
  public tableColumns!: TableColumn[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public ColumnMode = ColumnMode;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public SelectionType = SelectionType;

  public objectFilterTypesInfo: ObjectFilterTypeInfo[] = [];
    
  public objectFilterInstanceTypesInfo: ObjectFilterInstanceTypeInfo[] = [];
  
  public useAnySourceWindowSelection = true;
  public allRulesActivated = true;
  public rulesPartiallyActivated = false;
  public windowTitle: string;
  public backButtonText: string;
  public nextButtonText: string;
  public saveButtonText: string;
  @ViewChild('statusCellTempl', { static: true }) private readonly statusCellTempl!: TemplateRef<any>;
  @ViewChild('activeCellTempl', { static: true }) private readonly activeCellTempl!: TemplateRef<any>;
  @ViewChild('deleteCellTempl', { static: true }) private readonly deleteCellTempl!: TemplateRef<any>;
  @ViewChild('activeHeaderCellTempl', { static: true }) private readonly activeHeaderCellTempl!: TemplateRef<any>;
  @ViewChild(SiWizardComponent) private readonly siWizardComponent!: SiWizardComponent;
  private readonly subscriptions: Subscription[] = [];
  private subscriptionConfirm: Subscription;
  private objMgrTitle: string;

  public readonly trackByIndex = (index: number): number => index;

  constructor(private readonly objectManagerService: ObjectManagerService,
    private readonly authenticationServiceBase: AuthenticationServiceBase,
    private readonly appContextService: AppContextService,
    private readonly desktopMessageService: DesktopMessageService,
    private readonly titleService: Title,
    private readonly titleBarService: TitleBarService,
    private readonly systemBrowser: SystemBrowserServiceBase,
    private readonly siActionDlgService: SiActionDialogService,
    private readonly languageServiceBase: LanguageServiceBase,
    private readonly translateService: TranslateService,
    private readonly traceService: TraceService,
    private readonly localizationService: LocalizationService) {

    const appInfo = this.desktopMessageService.getAppInfo();

    if (appInfo?.activeLanguage !== undefined) {
      this.translateService.onLangChange.subscribe(value => {
        this.traceService.info(trcModuleNameDesktop,
          `translateService.onLangChange() called for language: ${value.lang}; Setting acive language in main process.`);
        this.desktopMessageService.setActiveLanguage(value.lang);
      });
      const langToSet = this.localizationService.detectLanguage(appInfo.activeLanguage);
      this.translateService.use(langToSet).subscribe((res: any) => {
        this.appContextService.setUserCulture(langToSet);
        this.traceService.info(trcModuleNameDesktop, 'Applying active user language from electron process: ' + this.translateService.currentLang);
      });
    }
  }

  public ngOnInit(): void {
    this.authenticationServiceBase.restoreAuthentication.subscribe({ next: (value: boolean) => this.loggedIn(value) });

    if (this.desktopMessageService.runsInElectron) {
      const rules = this.desktopMessageService.getCommunicationRules();
      const requestInfo: GetWindowRequestInfo = { includeOwnWindow: false, includeDetachedEvent: false };
      this.winInfos = this.desktopMessageService.getWindowsInfo(requestInfo);
      if (rules !== undefined) {
        rules.forEach(rule => {
          this.communicationRules.push(
            new CommunicationRuleVm(rule, this.winInfos, this.systemBrowser, this.translateService));
        });
      }
      this.updateHeaderCheckbox();
    }
  }

  public ngOnDestroy(): void {
    this.subscriptionConfirm?.unsubscribe();
    this.subscriptions.forEach(sub => sub?.unsubscribe());
  }

  public get isSourceWindowStepValid(): boolean {
    if (this.useAnySourceWindowSelection) {
      return true;
    } else {
      return this.wizardCommunicationRule.isSourceWindowValid;
    }
  }

  public get isTargetWindowStepValid(): boolean {
    return this.wizardCommunicationRule.isTargetWindowValid;
  }

  public get wizardCommunicationRuleObjectDesignation(): string {
    return this.wizardCommunicationRule?.filterCriteria.objectDesignation ?? '';
  }

  public onUseAnySourceWindowRadioChange(_value: boolean): void {
    this.wizardCommunicationRule.sourceWindowId = undefined;
    this.useAnySourceWindowSelection = true;
  }

  public onUseSingleSourceWindowRadioChange(_value: boolean): void {
    this.useAnySourceWindowSelection = false;
  }

  public onTargetWindowClicked(windowInfo: WindowInfo): void {
    this.wizardCommunicationRule.targetWindowId = windowInfo.managerWindowId;
  }

  public onSourceWindowClicked(windowInfo: WindowInfo): void {
    this.wizardCommunicationRule.sourceWindowId = windowInfo.managerWindowId;
  }

  public get selectedTargetManagerWindowId(): string {
    return this.wizardCommunicationRule.targetWindowId;
  }

  public get selectedSourceManagerWindowId(): string {
    return this.wizardCommunicationRule.sourceWindowId;
  }

  public activateRulesChanged(activateAllRules: boolean): void {
    this.allRulesActivated = activateAllRules;
    this.communicationRules.forEach(rule => rule.isRuleActive = this.allRulesActivated);
    this.saveAllCommunicationRules();
  }

  public activateRuleChanged(row: CommunicationRuleVm): void {
    row.isRuleActive = !row.isRuleActive;
    this.updateHeaderCheckbox();
    this.saveAllCommunicationRules();
  }

  public onSelectRow(row: CommunicationRuleVm): void {
    this.wizardCommunicationRule = row.clone();
    this.useAnySourceWindowSelection = (row.sourceWindowId === undefined);
    row.validate();
    if (this.siWizardComponent?.index > 0) {
      this.siWizardComponent.back(this.siWizardComponent.index);
    }
  }

  public loggedIn(value: boolean): void {
    if (value != null) {
      this.appContextService.setUserName(this.authenticationServiceBase.userName);
      this.appContextService.setUserDescriptor(this.authenticationServiceBase.userDescriptor);

      this.languageServiceBase.getUserLanguage().subscribe({
        next: language => {
          if (language != null) {
            const lang = this.localizationService.detectLanguage(language.Code);
            this.translateService.use(lang).subscribe((res: any) => {
              this.appContextService.setUserCulture(lang);
              this.appContextService.setUserLocalizationCulture(this.translateService.getBrowserCultureLang());
            });

            this.translateTexts();
          }
        },
        error: error => {
          this.traceService.warn(trcModuleNameDesktop, 'Error retreiving Applying user language: ');
        }
      });
    }
  }

  public translateTexts(): void {
    this.translateService.get([
      'RULES.WINDOW_TITLE',
      'RULES.TABLE_COL_FILTER',
      'RULES.TABLE_COL_SOURCE_WIN',
      'RULES.TABLE_COL_TARGET_WIN',
      'RULES.SELECT_OBJ_DLG_TITLE',
      'RULES.WIZARD_BACK_TEXT',
      'RULES.WIZARD_NEXT_TEXT',
      'RULES.WIZARD_SAVE_TEXT',
      'OBJECT_FILTER_TYPES.OBJECT_FUNCTION',
      'OBJECT_FILTER_TYPES.OBJECT_MODEL',
      'OBJECT_FILTER_TYPES.OBJECT_TYPE',
      'OBJECT_FILTER_TYPES.OBJECT_DISCIPLINE',
      'OBJECT_FILTER_TYPES.OBJECT_INSTANCE',
      'OBJECT_FILTER_TYPES.OBJECT_MANAGED_TYPE',
      'OBJECT_FILTER_INSTANCE_TYPES.ONLY_INSTANCE',
      'OBJECT_FILTER_INSTANCE_TYPES.ONLY_CHILDREN',
      'OBJECT_FILTER_INSTANCE_TYPES.ONLY_RECURSIVE_CHILDREN',
      'OBJECT_FILTER_INSTANCE_TYPES.INSTANCE_AND_CHILDREN',
      'OBJECT_FILTER_INSTANCE_TYPES.INSTANCE_AND_RECURSIVE_CHILDREN'
    ]).subscribe(texts => {

      this.backButtonText = texts['RULES.WIZARD_BACK_TEXT'];
      this.nextButtonText = texts['RULES.WIZARD_NEXT_TEXT'];
      this.saveButtonText = texts['RULES.WIZARD_SAVE_TEXT'];

      this.windowTitle = texts['RULES.WINDOW_TITLE'];
      this.objMgrTitle = texts['RULES.SELECT_OBJ_DLG_TITLE'];
      this.titleBarService.setTitle(this.windowTitle, this.titleService.getTitle());

      this.objectFilterTypesInfo = [
        { 
          type: ObjectFilterType.ObjectFunction, 
          text: texts['OBJECT_FILTER_TYPES.OBJECT_FUNCTION']
        },
        { 
          type: ObjectFilterType.ObjectModel, 
          text: texts['OBJECT_FILTER_TYPES.OBJECT_MODEL']
        },
        { 
          type: ObjectFilterType.ObjectType, 
          text: texts['OBJECT_FILTER_TYPES.OBJECT_TYPE']
        },
        { 
          type: ObjectFilterType.ObjectDiscipline, 
          text: texts['OBJECT_FILTER_TYPES.OBJECT_DISCIPLINE']
        },
        { 
          type: ObjectFilterType.ObjectInstance, 
          text: texts['OBJECT_FILTER_TYPES.OBJECT_INSTANCE']
        },
        { 
          type: ObjectFilterType.ObjectManagedType, 
          text: texts['OBJECT_FILTER_TYPES.OBJECT_MANAGED_TYPE']
        }];

      this.objectFilterInstanceTypesInfo = [
        {
          type: ObjectFilterInstanceType.OnlyInstance,
          text: texts['OBJECT_FILTER_INSTANCE_TYPES.ONLY_INSTANCE']
        },
        {
          type: ObjectFilterInstanceType.OnlyChildren,
          text: texts['OBJECT_FILTER_INSTANCE_TYPES.ONLY_CHILDREN']
        },
        {
          type: ObjectFilterInstanceType.OnlyRecursiveChildren,
          text: texts['OBJECT_FILTER_INSTANCE_TYPES.ONLY_RECURSIVE_CHILDREN']
        },
        {
          type: ObjectFilterInstanceType.InstanceAndChildren,
          text: texts['OBJECT_FILTER_INSTANCE_TYPES.INSTANCE_AND_CHILDREN']
        },
        {
          type: ObjectFilterInstanceType.InstanceAndRecursiveChildren,
          text: texts['OBJECT_FILTER_INSTANCE_TYPES.INSTANCE_AND_RECURSIVE_CHILDREN']
        }];
    
      this.tableColumns = [
        {
          prop: 'isRuleActive',
          resizeable: false,
          canAutoResize: false,
          cellTemplate: this.activeCellTempl,
          headerTemplate: this.activeHeaderCellTempl,
          width: 35
        },
        {
          resizeable: false,
          canAutoResize: false,
          cellTemplate: this.statusCellTempl,
          width: 35
        },
        {
          resizeable: false,
          canAutoResize: false,
          cellTemplate: this.deleteCellTempl,
          width: 35
        },
        {
          prop: 'objectFilterCriteria',
          name: texts['RULES.TABLE_COL_FILTER'],
          resizeable: true,
          canAutoResize: true
        },
        {
          prop: 'sourceWindowDescriptor',
          name: texts['RULES.TABLE_COL_SOURCE_WIN'],
          resizeable: true,
          canAutoResize: true
        },
        {
          prop: 'targetWindowDescriptor',
          name: texts['RULES.TABLE_COL_TARGET_WIN'],
          resizeable: true,
          canAutoResize: true
        }
      ];
    });
  }

  public deleteRowConfirmed(row: CommunicationRuleVm): void {
    this.subscriptionConfirm = this.siActionDlgService
      .showDeleteConfirmationDialog(
        'RULES.DELETE_RULE_DLG_MSG',
        'RULES.DELETE_RULE_DLG_TITLE',
        'RULES.DELETE_RULE_DLG_DELETE_BTN',
        'RULES.DELETE_RULE_DLG_CANCEL_BTN'
      )
      .subscribe(result => {
        switch (result) {
          case DeleteConfirmationDialogResult.Delete:
            this.deleteRow(row);
            break;
          case DeleteConfirmationDialogResult.Cancel:
            break;
          default:
            break;
        }
      });
  }

  public deleteRow(row: CommunicationRuleVm): void {
    const foundRule = this.communicationRules.findIndex(rule => rule === row);
    if (this.selectedCommunicationRule[0] === row) {
      this.selectedCommunicationRule = [];
      this.wizardCommunicationRule = undefined;
    }
    this.communicationRules.splice(foundRule, 1);
    this.updateList();
    this.saveAllCommunicationRules();
  }

  public onAddClick(): void {
    const newRule = new CommunicationRuleVm({
      filterCriteria: {
        filterType: ObjectFilterType.ObjectType,
        filterTypeText: this.objectFilterTypesInfo.find(t => t.type == ObjectFilterType.ObjectType).text,
        filterValue: undefined,
        filterValueDescriptor: undefined,
        objectDesignation: undefined,
        filterInstanceType: ObjectFilterInstanceType.OnlyInstance,
        filterInstanceTypeText: this.objectFilterInstanceTypesInfo.find(t => t.type == ObjectFilterInstanceType.OnlyInstance).text
      },
      sourceWindowId: undefined,
      targetWindowId: undefined,
      isRuleActive: true
    },
    this.winInfos,
    this.systemBrowser,
    this.translateService);
    this.useAnySourceWindowSelection = (newRule.sourceWindowId === undefined);
    this.communicationRules.push(newRule);
    this.updateList();

    this.selectedCommunicationRule = [];
    this.selectedCommunicationRule.push(newRule);
    this.wizardCommunicationRule = newRule.clone();
    if (this.siWizardComponent?.index > 0) {
      this.siWizardComponent.back(this.siWizardComponent.index);
    }
  }

  public onCloseClick(): void {
    this.desktopMessageService.closeCommunicationRulesEditor();
  }

  public objectFilterTypeChanged(_value: ObjectFilterType): void {
    this.wizardCommunicationRule.filterCriteria.filterTypeText = this.objectFilterTypesInfo.find(
      t => t.type === this.wizardCommunicationRule.filterCriteria.filterType).text;
    this.updateCurrentCommunicationRule();
  }

  public objectFilterInstanceTypeChanged(_value: ObjectFilterInstanceType): void {
    this.wizardCommunicationRule.filterCriteria.filterInstanceTypeText = this.objectFilterInstanceTypesInfo.find(
      t => t.type === this.wizardCommunicationRule.filterCriteria.filterInstanceType).text;
    this.updateCurrentCommunicationRule();
  }

  public onBrowseObjects(): void {
    const objectManagerConfig: ObjectManagerServiceModalOptions = {
      singleSelection: true,
      hideSearch: false
    };

    this.subscriptions.push(this.objectManagerService.show(this.objMgrTitle, objectManagerConfig).subscribe(selectedPoints => {
      if ((selectedPoints.action === ModalDialogResult.Ok) && (selectedPoints.selection.length > 0)) {
        if (selectedPoints.selection.length > 0) {
          this.wizardCommunicationRule.browserObject = selectedPoints.selection[0];
          this.updateCurrentCommunicationRule();
        }
      }
    }));
  }

  public onStepChanged(): void {
    const task: () => void = () => {
      if (this.siWizardComponent.index === 1) {
        this.sourceWindowStepInit.next(true);
      }
      if (this.siWizardComponent.index === 2) {
        this.targetWindowStepInit.next(true);
      }
    };
    animationFrameScheduler.schedule(task, 0);
  }

  public saveCommunicationRule(): void {
    this.updateSelectedRule(this.wizardCommunicationRule);
    this.updateList();
    this.selectedCommunicationRule = [];
    this.saveAllCommunicationRules();
  }

  public onComplete(): void {
    this.wizardCommunicationRule = undefined;
  }

  private saveAllCommunicationRules(): void {
    this.desktopMessageService.saveCommunicationRules(this.communicationRules.map(rule => rule.rule));
  }

  private updateSelectedRule(communicationRule: CommunicationRule): void {
    this.selectedCommunicationRule[0].filterCriteria = communicationRule.filterCriteria;
    this.selectedCommunicationRule[0].sourceWindowId = communicationRule.sourceWindowId;
    this.selectedCommunicationRule[0].targetWindowId = communicationRule.targetWindowId;
    this.selectedCommunicationRule[0].isRuleActive = communicationRule.isRuleActive;
    this.selectedCommunicationRule[0].validate();
  }

  private updateCurrentCommunicationRule(): void {
    if (this.wizardCommunicationRule.browserObject !== undefined) {
      this.wizardCommunicationRule.filterCriteria.objectDesignation = this.wizardCommunicationRule.browserObject.Designation;
      switch (this.wizardCommunicationRule.filterCriteria.filterType) {
        case ObjectFilterType.ObjectDiscipline:
          this.wizardCommunicationRule.filterCriteria.filterValue = this.wizardCommunicationRule.browserObject.Attributes.DisciplineId.toString();
          this.wizardCommunicationRule.filterCriteria.filterValueDescriptor = this.wizardCommunicationRule.browserObject.Attributes.DisciplineDescriptor;
          break;
        case ObjectFilterType.ObjectFunction:
          this.wizardCommunicationRule.filterCriteria.filterValue = this.wizardCommunicationRule.browserObject.Attributes.FunctionName;
          this.wizardCommunicationRule.filterCriteria.filterValueDescriptor = this.wizardCommunicationRule.browserObject.Attributes.FunctionName;
          break;
        case ObjectFilterType.ObjectInstance:
          this.wizardCommunicationRule.filterCriteria.filterValue = this.wizardCommunicationRule.browserObject.Designation;
          this.wizardCommunicationRule.filterCriteria.filterValueDescriptor = this.wizardCommunicationRule.browserObject.Location;
          break;
        case ObjectFilterType.ObjectModel:
          this.wizardCommunicationRule.filterCriteria.filterValue = this.wizardCommunicationRule.browserObject.Attributes.ObjectModelName;
          this.wizardCommunicationRule.filterCriteria.filterValueDescriptor = this.wizardCommunicationRule.browserObject.Attributes.ObjectModelName;
          break;
        case ObjectFilterType.ObjectType:
          this.wizardCommunicationRule.filterCriteria.filterValue = this.wizardCommunicationRule.browserObject.Attributes.TypeId.toString();
          this.wizardCommunicationRule.filterCriteria.filterValueDescriptor = this.wizardCommunicationRule.browserObject.Attributes.TypeDescriptor;
          break;
        case ObjectFilterType.ObjectManagedType:
          this.wizardCommunicationRule.filterCriteria.filterValue = this.wizardCommunicationRule.browserObject.Attributes.ManagedTypeName;
          this.wizardCommunicationRule.filterCriteria.filterValueDescriptor = this.wizardCommunicationRule.browserObject.Attributes.ManagedTypeName;
          break;
        default:
          this.traceService.error(trcModuleNameDesktop, `Argument not handled: ${this.wizardCommunicationRule.filterCriteria.filterType}`);
      }
    }
  }

  private updateList(): void {
    const tempRules: CommunicationRuleVm[] = [];
    tempRules.push(...this.communicationRules);
    this.communicationRules = [];
    this.communicationRules.push(...tempRules);
  }

  private updateHeaderCheckbox(): void {
    let allChecked = true;
    let noneChecked = true;
    this.communicationRules.forEach(rule => {
      if (rule.isRuleActive) {
        noneChecked = false;
      } else {
        allChecked = false;
      }
    });
    this.rulesPartiallyActivated = !(allChecked || noneChecked);
    if (noneChecked) {
      this.allRulesActivated = false;
    }
    if (allChecked) {
      this.allRulesActivated = true;
    }
  }
}
