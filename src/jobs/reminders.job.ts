import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../db/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class RemindersJob {
  private readonly logger = new Logger(RemindersJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nService: N8nService,
  ) {}

  // Runs every 15 minutes to send reminders for appointments in 24h and 1h windows
  @Cron('0 */15 * * * *')
  async handleReminders() {
    const now = new Date();
    const in24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const in1hStart = new Date(now.getTime() + 50 * 60 * 1000);
    const in1hEnd = new Date(now.getTime() + 70 * 60 * 1000);

    const upcoming = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        startAt: {
          gte: in24hStart,
          lte: in24hEnd,
        },
      },
      select: { id: true, salonId: true },
    });

    const imminent = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        startAt: {
          gte: in1hStart,
          lte: in1hEnd,
        },
      },
      select: { id: true, salonId: true },
    });

    for (const appt of upcoming) {
      this.logger.debug(`Sending 24h reminder for appointment ${appt.id}`);
      await this.n8nService.sendAppointmentEvent(
        appt.salonId,
        'appointment.reminder.24h',
        appt.id,
      );
    }

    for (const appt of imminent) {
      this.logger.debug(`Sending 1h reminder for appointment ${appt.id}`);
      await this.n8nService.sendAppointmentEvent(
        appt.salonId,
        'appointment.reminder.1h',
        appt.id,
      );
    }
  }
}


