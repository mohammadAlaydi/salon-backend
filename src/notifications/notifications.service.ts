import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

export type NotificationStatus = 'SENT' | 'FAILED';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async logNotification(params: {
    appointmentId: string;
    type: string;
    provider: string;
    payload: any;
    status: NotificationStatus;
    sentAt?: Date;
  }) {
    return this.prisma.notificationLog.create({
      data: {
        appointmentId: params.appointmentId,
        type: params.type,
        provider: params.provider,
        payload: params.payload,
        status: params.status,
        sentAt: params.sentAt,
      },
    });
  }
}


