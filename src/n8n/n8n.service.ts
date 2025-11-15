import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHmac } from 'crypto';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async sendAppointmentEvent(salonId: string, event: string, appointmentId: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
    });
    if (!salon) {
      this.logger.warn(`Salon not found for appointment event: ${salonId}`);
      return;
    }
    const webhookUrl = salon.n8nWebhookUrl || this.configService.get<string>('n8n.baseUrl');
    if (!webhookUrl) {
      this.logger.warn(`No n8n webhook URL configured for salon ${salonId}`);
      return;
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        service: true,
        staff: { include: { user: true } },
      },
    });
    if (!appointment) {
      this.logger.warn(`Appointment not found for event payload: ${appointmentId}`);
      return;
    }

    const body = {
      event,
      appointment: {
        id: appointment.id,
        salon_id: salonId,
        customer: {
          id: appointment.customer.id,
          name: appointment.customer.name,
          phone: appointment.customer.phone,
          email: appointment.customer.email,
        },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          duration: appointment.durationMinutes,
        },
        staff: appointment.staff
          ? {
              id: appointment.staff.id,
              name: appointment.staff.user.name,
            }
          : null,
        start_at: appointment.startAt,
        end_at: appointment.endAt,
        status: appointment.status,
      },
      meta: {
        idempotency_key: appointment.idempotencyKey,
        sent_at: new Date().toISOString(),
      },
    };

    const secret = salon.webhookSecret;
    const signature = createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    try {
      await axios.post(webhookUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Salon-Id': salonId,
        },
        timeout: 5000,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to send event ${event} to n8n for salon ${salonId}: ${error.message}`,
      );
    }
  }
}


