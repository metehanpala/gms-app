import { NgModule } from '@angular/core';
import { GmsCalendarManagerRootServicesModule } from '@gms-flex/calendar-manager-root-services';
import { GmsCentralFunctionRootServicesModule } from '@gms-flex/central-function-root-services';
import { GmsCommonEventRootServicesModule } from '@gms-flex/common-event-root-services';
import { GmsDocumentRootServicesModule } from '@gms-flex/document-root-services';
import { GmsEventDetailsRootServicesModule } from '@gms-flex/event-details-root-services';
import { GmsEventListRootServicesModule } from '@gms-flex/event-list-root-services';
import { GmsGraphicsViewerRootServicesModule } from '@gms-flex/graphics-viewer-root-services';
import { GmsLicenseRootServicesModule } from '@gms-flex/license-root-services';
import { GmsLogViewerRootServicesModule } from '@gms-flex/log-viewer-root-services';
import { GmsNodeMapRootServicesModule } from '@gms-flex/nodemap-root-services';
import { GmsNotificationRecipientGroupRootServicesModule } from '@gms-flex/notification-recipient-group-root-services';
import { GmsNotificationRecipientRootServicesModule } from '@gms-flex/notification-recipient-root-services';
import { GmsNotificationTemplateRootServicesModule } from '@gms-flex/notification-template-root-services';
import { GmsOperatorTaskRootServicesModule } from '@gms-flex/operator-task-root-services';
import { GmsPlantOverviewRootServicesModule } from '@gms-flex/plant-overview-root-services';
import { GmsPowermangerAreaSummaryRootServicesModule } from '@gms-flex/powermanager-area-summary-root-services';
import { GmsPowermangerCustomDashboardRootServicesModule } from '@gms-flex/powermanager-custom-dashboard-root-services';
import { GmsPowermanagerEnergyManagementRootServicesModule } from '@gms-flex/powermanager-energy-management-root-services';
import { GmsPowermangerPowerQualityRootServicesModule } from '@gms-flex/powermanager-power-quality-root-services';
import { GmsPowermangerSystemSummaryRootServicesModule } from '@gms-flex/powermanager-system-summary-root-services';
import { GmsPropertyRootServicesModule } from '@gms-flex/property-root-services';
import { GmsRelatedItemsRootServicesModule } from '@gms-flex/related-items-root-services';
import { GmsReportViewerRootServicesModule } from '@gms-flex/report-viewer-root-services';
import { GmsRoomOverviewRootServicesModule } from '@gms-flex/room-overview-root-services';
import { GmsSceneRootServicesModule } from '@gms-flex/scene-root-services';
import { GmsScheduleRootServicesModule } from '@gms-flex/schedule-root-services';
import { GmsSessionsRootServicesModule } from '@gms-flex/sessions-root-services'
import { GmsSubscriberRootServicesModule } from '@gms-flex/subscriber-root-services';
import { GmsSummaryBarRootServicesModule } from '@gms-flex/summary-bar-root-services';
import { GmsSystemBrowserRootServicesModule } from '@gms-flex/system-browser-root-services';
import { GmsTextualViewerRootServicesModule } from '@gms-flex/textual-viewer-root-services';
import { GmsTrendRootServicesModule } from '@gms-flex/trend-root-services';
import { GmsVideoManagementRootServicesModule } from '@gms-flex/video-management-root-services';
import { GmsWsScheduleRootServicesModule } from '@gms-flex/ws-schedule-root-services';

@NgModule({
  imports: [
    // ADD HERE YOUR ROOT SNAPIN MODULE NAME
    GmsCalendarManagerRootServicesModule,
    GmsCentralFunctionRootServicesModule,
    GmsCommonEventRootServicesModule,
    GmsDocumentRootServicesModule,
    GmsEventDetailsRootServicesModule,
    GmsEventListRootServicesModule,
    GmsGraphicsViewerRootServicesModule,
    GmsLicenseRootServicesModule,
    GmsLogViewerRootServicesModule,
    GmsNodeMapRootServicesModule,
    GmsNotificationRecipientGroupRootServicesModule,
    GmsNotificationRecipientRootServicesModule,
    GmsNotificationTemplateRootServicesModule,
    GmsOperatorTaskRootServicesModule,
    GmsPlantOverviewRootServicesModule,
    GmsPowermanagerEnergyManagementRootServicesModule,
    GmsPowermangerAreaSummaryRootServicesModule,
    GmsPowermangerCustomDashboardRootServicesModule,
    GmsPowermangerPowerQualityRootServicesModule,
    GmsPowermangerSystemSummaryRootServicesModule,
    GmsPropertyRootServicesModule,
    GmsRelatedItemsRootServicesModule,
    GmsReportViewerRootServicesModule,
    GmsRoomOverviewRootServicesModule,
    GmsSceneRootServicesModule,
    GmsScheduleRootServicesModule,
    GmsSessionsRootServicesModule,
    GmsSubscriberRootServicesModule,
    GmsSummaryBarRootServicesModule,
    GmsSystemBrowserRootServicesModule,
    GmsTextualViewerRootServicesModule,
    GmsTrendRootServicesModule,
    GmsVideoManagementRootServicesModule,
    GmsWsScheduleRootServicesModule
  ]
})

export class RootServicesModule {}