import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { NotificationsService } from './notifications.service';
import { createHmac } from 'crypto';

interface N8nCallbackBody {
  appointmentId: string;
  type: string;
  provider: string;
  payload: any;
  status: 'SENT' | 'FAILED';
  sentAt?: string;
  salonId: string;
}

@Controller('webhooks/n8n')
export class NotificationsCallbackController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('callback')
  async handleCallback(
    @Body() body: N8nCallbackBody,
    @Headers('x-signature') signature: string | undefined,
  ) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: body.salonId },
    });
    if (!salon) {
      throw new UnauthorizedException('Unknown salon');
    }

    const computed = createHmac('sha256', salon.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (!signature || signature !== computed) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.notificationsService.logNotification({
      appointmentId: body.appointmentId,
      type: body.type,
      provider: body.provider,
      payload: body.payload,
      status: body.status,
      sentAt: body.sentAt ? new Date(body.sentAt) : undefined,
    });

    return { success: true };
  }
}


