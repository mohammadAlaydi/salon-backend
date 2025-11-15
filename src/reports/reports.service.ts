import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyReport(salonId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [totalBookings, completed, noShows, revenueAgg] = await this.prisma.$transaction([
      this.prisma.appointment.count({
        where: { salonId, startAt: { gte: dayStart, lte: dayEnd } },
      }),
      this.prisma.appointment.count({
        where: {
          salonId,
          status: 'COMPLETED',
          startAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.appointment.count({
        where: {
          salonId,
          status: 'NO_SHOW',
          startAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.appointment.aggregate({
        where: {
          salonId,
          status: 'COMPLETED',
          startAt: { gte: dayStart, lte: dayEnd },
        },
        _sum: { priceCents: true },
      }),
    ]);

    return {
      date,
      totalBookings,
      completed,
      noShows,
      revenueCents: revenueAgg._sum.priceCents ?? 0,
    };
  }

  async getStaffPerformance(
    salonId: string,
    staffId: string,
    from: string,
    to: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const [completed, noShows, revenueAgg] = await this.prisma.$transaction([
      this.prisma.appointment.count({
        where: {
          salonId,
          staffId,
          status: 'COMPLETED',
          startAt: { gte: fromDate, lte: toDate },
        },
      }),
      this.prisma.appointment.count({
        where: {
          salonId,
          staffId,
          status: 'NO_SHOW',
          startAt: { gte: fromDate, lte: toDate },
        },
      }),
      this.prisma.appointment.aggregate({
        where: {
          salonId,
          staffId,
          status: 'COMPLETED',
          startAt: { gte: fromDate, lte: toDate },
        },
        _sum: { priceCents: true },
      }),
    ]);

    return {
      staffId,
      from,
      to,
      completed,
      noShows,
      revenueCents: revenueAgg._sum.priceCents ?? 0,
    };
  }

  async getTopServices(salonId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const rows = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        salonId,
        status: 'COMPLETED',
        startAt: { gte: fromDate, lte: toDate },
      },
      _count: { _all: true },
      _sum: { priceCents: true },
      orderBy: { _sum: { priceCents: 'desc' } },
      take: 10,
    });

    const serviceIds = rows.map((r) => r.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    return rows.map((row) => {
      const service = services.find((s) => s.id === row.serviceId);
      return {
        serviceId: row.serviceId,
        serviceName: service?.name ?? 'Unknown',
        bookings: row._count._all,
        revenueCents: row._sum.priceCents ?? 0,
      };
    });
  }
}


