import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { N8nService } from '../n8n/n8n.service';

@Injectable()
export class AppointmentEventsListener {
  constructor(private readonly n8nService: N8nService) {}

  @OnEvent('appointment.created')
  async handleCreated(payload: { salonId: string; appointmentId: string }) {
    await this.n8nService.sendAppointmentEvent(
      payload.salonId,
      'appointment.created',
      payload.appointmentId,
    );
  }

  @OnEvent('appointment.confirmed')
  async handleConfirmed(payload: { salonId: string; appointmentId: string }) {
    await this.n8nService.sendAppointmentEvent(
      payload.salonId,
      'appointment.confirmed',
      payload.appointmentId,
    );
  }

  @OnEvent('appointment.cancelled')
  async handleCancelled(payload: { salonId: string; appointmentId: string }) {
    await this.n8nService.sendAppointmentEvent(
      payload.salonId,
      'appointment.cancelled',
      payload.appointmentId,
    );
  }

  @OnEvent('appointment.completed')
  async handleCompleted(payload: { salonId: string; appointmentId: string }) {
    await this.n8nService.sendAppointmentEvent(
      payload.salonId,
      'appointment.completed',
      payload.appointmentId,
    );
  }

  @OnEvent('appointment.no_show')
  async handleNoShow(payload: { salonId: string; appointmentId: string }) {
    await this.n8nService.sendAppointmentEvent(
      payload.salonId,
      'appointment.no_show',
      payload.appointmentId,
    );
  }
}


