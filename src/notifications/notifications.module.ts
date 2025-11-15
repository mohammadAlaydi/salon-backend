import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { N8nModule } from '../n8n/n8n.module';
import { NotificationsCallbackController } from './notifications.callback.controller';
import { AppointmentEventsListener } from './appointment-events.listener';

@Module({
  imports: [N8nModule],
  providers: [NotificationsService, AppointmentEventsListener],
  controllers: [NotificationsCallbackController],
  exports: [NotificationsService],
})
export class NotificationsModule {}


