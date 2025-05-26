import { ModuleWithProviders } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from '@gms-flex/controls';
import { PageComponent, PageNotFoundComponent } from '@gms-flex/core';
import { TraceSettings } from '@gms-flex/services-common';

import { CommunicationRulesComponent } from './communicaton-rules/communication-rules.component';
import { LoadingComponent } from './loading/loading.component';
import { MainComponent } from './main/main.component';
import { AppRightsResolver } from './routing/app-rights.resolver';
import { CanActivateHfwPage } from './routing/canactivate-hfwpage.guard';
import { HfwInstanceResolver } from './routing/hfw-instance.resolver';
import { LicenseOptionsResolver } from './routing/license-options.resolver';
import { RightPanelSettingsResolver } from './routing/right-panel-settings.resolver';

export const routerTraceModuleName = 'ng-router';

/* eslint-disable @typescript-eslint/explicit-function-return-type */
const appRoutes: Routes = [
  {
    path: 'communicationrules',
    component: CommunicationRulesComponent
  },
  {
    path: 'loginpage',
    component: LoginComponent
  },
  {
    path: 'AboutSnapinType',
    loadChildren: () => import('@gms-flex/about').then(mod => mod.GmsAboutSnapInModule)
  },
  {
    path: 'AccountSnapinType',
    loadChildren: () => import('@gms-flex/account').then(mod => mod.GmsAccountSnapInModule)
  },
  {
    path: 'DocumentViewerType',
    loadChildren: () => import('@gms-flex/document').then(mod => mod.GmsDocumentSnapInModule)
  },
  {
    path: 'EasyNavigationBarType',
    loadChildren: () => import('@gms-flex/easy-navigation-bar').then(mod => mod.GmsEasyNavigationBarSnapinModule)
  },
  {
    path: 'EventListType',
    loadChildren: () => import('@gms-flex/event-list').then(mod => mod.GmsEventListSnapInModule)
  },
  {
    path: 'EventDetailsType',
    loadChildren: () => import('@gms-flex/event-details').then(mod => mod.GmsEventDetailsSnapInModule)
  },
  {
    path: 'TextualViewerType',
    loadChildren: () => import('@gms-flex/textual-viewer').then(mod => mod.GmsTextualViewerSnapInModule)
  },
  {
    path: 'PropertyViewerType',
    loadChildren: () => import('@gms-flex/property').then(mod => mod.GmsPropertySnapInModule)
  },
  {
    path: 'GraphicsViewerType',
    loadChildren: () => import('@gms-flex/graphics-viewer').then(mod => mod.GmsGraphicsViewerSnapInModule)
  },
  {
    path: 'ScheduleSnapInType',
    loadChildren: () => import('@gms-flex/schedule').then(mod => mod.GmsScheduleSnapInModule)
  },
  {
    path: 'SceneSnapInType',
    loadChildren: () => import('@gms-flex/scene').then(mod => mod.GmsSceneSnapInModule)
  },
  {
    path: 'WsScheduleSnapInType',
    loadChildren: () => import('@gms-flex/ws-schedule').then(mod => mod.GmsWsScheduleSnapInModule)
  },
  {
    path: 'SubscriberSnapinType',
    loadChildren: () => import('@gms-flex/subscriber').then(mod => mod.GmsSubscriberSnapInModule)
  },
  {
    path: 'ReportViewerSnapInType',
    loadChildren: () => import('@gms-flex/report-viewer').then(mod => mod.GmsReportViewerModule)
  },
  {
    path: 'TrendSnapInType',
    loadChildren: () => import('@gms-flex/trend').then(mod => mod.GmsTrendSnapInModule)
  },
  {
    path: 'LogViewerSnapInType',
    loadChildren: () => import('@gms-flex/log-viewer').then(mod => mod.GmsLogViewerSnapinModule)
  },
  {
    path: 'SummaryBarType',
    loadChildren: () => import('@gms-flex/summary-bar').then(mod => mod.GmsSummaryBarSnapInModule)
  },
  {
    path: 'SystemBrowserType',
    loadChildren: () => import('@gms-flex/system-browser').then(mod => mod.GmsSystemBrowserSnapInModule)
  },
  {
    path: 'RelatedItemType',
    loadChildren: () => import('@gms-flex/related-items').then(mod => mod.GmsRelatedItemsSnapInModule)
  },
  {
    path: 'NotifConfigSnapinType',
    loadChildren: () => import('@gms-flex/notifconfig').then(mod => mod.GmsNotifConfigSnapInModule)
  },
  {
    path: 'CalendarManagerSnapinType',
    loadChildren: () => import('@gms-flex/calendar-manager').then(mod => mod.GmsCalendarManagerSnapinModule)
  },
  {
    path: 'CentralFunctionSnapinType',
    loadChildren: () => import('@gms-flex/central-function').then(mod => mod.GmsCentralFunctionSnapinModule)
  },
  {
    path: 'CommonEventSnapinType',
    loadChildren: () => import('@gms-flex/common-event').then(mod => mod.GmsCommonEventSnapinModule)
  },
  {
    path: 'RoomOverviewSnapinType',
    loadChildren: () => import('@gms-flex/room-overview').then(mod => mod.GmsRoomOverviewSnapinModule)
  },
  {
    path: 'VideoSnapinType',
    loadChildren: () => import('@gms-flex/video-management').then(mod => mod.GmsVideoManagementModule)
  },
  {
    path: 'NodeMapType',
    loadChildren: () => import('@gms-flex/nodemap').then(mod => mod.GmsNodeMapSnapInModule)
  },
  {
    path: 'NotificationRecipientSnapinType',
    loadChildren: () => import('@gms-flex/notification-recipient').then(mod => mod.GmsNotificationRecipientSnapinModule)
  },
  {
    path: 'NotificationRecipientGroupSnapinType',
    loadChildren: () => import('@gms-flex/notification-recipient-group').then(mod => mod.GmsNotificationRecipientGroupSnapinModule)
  },
  {
    path: 'NotificationTemplateSnapinType',
    loadChildren: () => import('@gms-flex/notification-template').then(mod => mod.GmsNotificationTemplateSnapinModule)
  },
  {
    path: 'investigativeTreatmentType',
    loadChildren: () => import('@gms-flex/investigative-treatment').then(mod => mod.GmsInvestigationSnapinModule)
  },
  {
    path: 'PlantOverviewSnapinType',
    loadChildren: () => import('@gms-flex/plant-overview').then(mod => mod.GmsPlantOverviewSnapinModule)
  },
  {
    path: 'PowermanagerAreaSummarySnapinType',
    loadChildren: () => import('@gms-flex/powermanager-area-summary').then(mod => mod.GmsPowermanagerAreaSummarySnapinModule)
  },
  {
    path: 'PowermanagerPowerQualitySnapinType',
    loadChildren: () => import('@gms-flex/powermanager-power-quality').then(mod => mod.GmsPowermanagerPowerQualitySnapinModule)
  },
  {
    path: 'PowermanagerSystemSummarySnapinType',
    loadChildren: () => import('@gms-flex/powermanager-system-summary').then(mod => mod.GmsPowermanagerSystemSummarySnapinModule)
  },
  {
    path: 'PowermanagerCustomDashboardSnapinType',
    loadChildren: () => import('@gms-flex/powermanager-custom-dashboard').then(mod => mod.GmsPowermanagerCustomDashboardSnapinModule)
  },
  {
    path: 'PowermanagerEnergyManagementSnapinType',
    loadChildren: () => import('@gms-flex/powermanager-energy-management').then(mod => mod.GmsPowermanagerEnergyManagementSnapinModule)
  },
  {
    path: 'OperatorTaskSnapinType',
    loadChildren: () => import('@gms-flex/operator-task').then(mod => mod.GmsOperatorTaskSnapinModule)
  },
  {
    path: 'SessionsSnapinType',
    loadChildren: () => import('@gms-flex/sessions').then(mod => mod.GmsSessionsSnapinModule)
  },
  {
    path: 'LicenseSnapinType',
    loadChildren: () => import('@gms-flex/license').then(mod => mod.GmsLicenseSnapinModule)
  },
  {
    path: 'main',
    component: MainComponent,
    canActivate: [CanActivateHfwPage],
    resolve: {
      hfwInstance: HfwInstanceResolver,
      appRights: AppRightsResolver,
      licenseOptions: LicenseOptionsResolver,
      rpSettings: RightPanelSettingsResolver
    },
    children: [
      {
        path: 'page',
        component: PageComponent
      },
      {
        path: '404notfound',
        component: PageNotFoundComponent
      }
    ]
  },
  {
    path: '',
    redirectTo: 'main/page',
    pathMatch: 'full'
  },
  {
    path: 'loading',
    component: LoadingComponent,
    resolve: {
      appRights: AppRightsResolver,
      licenseOptions: LicenseOptionsResolver,
      hfwInstance: HfwInstanceResolver
    }
  },
  {
    path: '**',
    redirectTo: 'main/page'
  },
  {
    path: '404notfound',
    component: PageNotFoundComponent
  }
];
/* eslint-enable @typescript-eslint/explicit-function-return-type */

const traceSettings: TraceSettings = TraceSettings.readTraceSettingsFromLocStore();
const routeChannelEnabled: boolean = (traceSettings.isVendorModuleEnabled(routerTraceModuleName) /* || traceSettings.allModulesEnabled */);

export const routing: ModuleWithProviders<RouterModule> =
RouterModule.forRoot(appRoutes, { enableTracing: routeChannelEnabled });