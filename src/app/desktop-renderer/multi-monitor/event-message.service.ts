import { Injectable } from '@angular/core';
import { EventMessage, EventMessageType, EventService } from '@gms-flex/services';
import { isNullOrUndefined } from '@siemens/ngx-datatable';

@Injectable()
export class EventMessageService {
  constructor(
    private readonly eventService: EventService
  ) {}

  public handleEventMessage(evtMessage: EventMessage): void {
    if (!isNullOrUndefined(evtMessage)) {
      if (evtMessage.type === EventMessageType.EventFiltering) {
        if (evtMessage.data?.length > 0) {
          this.eventService.notificationActionFilter(evtMessage.data[0]);
          this.eventService.setMmSelectedEventsIds([(evtMessage.data[1])[0].id]);
        } else {
          this.eventService.notificationActionFilter(evtMessage.data);
        }
      }
    }
  }
}
