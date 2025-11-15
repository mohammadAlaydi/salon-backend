import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';
import { AppointmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(
    salonId: string,
    pagination: PaginationDto,
    filters: { staffId?: string; status?: AppointmentStatus; from?: Date; to?: Date },
  ) {
    const take = pagination.limit ?? 20;
    const skip = ((pagination.page ?? 1) - 1) * take;
    const where: Prisma.AppointmentWhereInput = {
      salonId,
      staffId: filters.staffId,
      status: filters.status,
      startAt:
        filters.from || filters.to
          ? {
              gte: filters.from,
              lte: filters.to,
            }
          : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { startAt: 'asc' },
        include: { customer: true, service: true, staff: { include: { user: true } } },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, total, page: pagination.page ?? 1, limit: take };
  }

  async get(salonId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, salonId },
      include: { customer: true, service: true, staff: { include: { user: true } } },
    });
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }
    return appt;
  }

  async create(
    salonId: string,
    idempotencyKey: string | undefined,
    dto: CreateAppointmentDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, salonId },
    });
    if (!service || !service.isActive) {
      throw new BadRequestException('Service not found or inactive');
    }

    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid startAt');
    }
    const durationMinutes = service.durationMinutes;
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    const staffId = dto.staffId ?? (await this.autoAssignStaff(salonId, service.id, startAt, endAt));

    if (!staffId) {
      throw new ConflictException('STAFF_UNAVAILABLE');
    }

    const resourceKey = `staff:${staffId}:${startAt.toISOString().substring(0, 10)}`;

    const appointment = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: {
          salonId,
          idempotencyKey,
        },
      });
      if (existing) {
        return existing;
      }

      // Acquire advisory lock to prevent concurrent booking on same staff/day
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        resourceKey,
      );

      const hasOverlap = await tx.appointment.findFirst({
        where: {
          salonId,
          staffId,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        },
      });
      if (hasOverlap) {
        throw new ConflictException('CONFLICT');
      }

      const created = await tx.appointment.create({
        data: {
          salonId,
          customerId: dto.customerId,
          serviceId: dto.serviceId,
          staffId,
          startAt,
          endAt,
          durationMinutes,
          priceCents: dto.priceCents ?? service.priceCents,
          status: dto.status ?? AppointmentStatus.PENDING,
          paymentStatus: dto.paymentStatus ?? PaymentStatus.UNPAID,
          idempotencyKey,
          notes: dto.notes,
        },
      });
      return created;
    });

    const full = await this.get(salonId, appointment.id);
    this.eventEmitter.emit('appointment.created', {
      salonId,
      appointmentId: appointment.id,
    });
    return full;
  }

  async update(
    salonId: string,
    id: string,
    dto: UpdateAppointmentDto,
  ) {
    const existing = await this.get(salonId, id);
    const service =
      dto.serviceId && dto.serviceId !== existing.serviceId
        ? await this.prisma.service.findFirst({
            where: { id: dto.serviceId, salonId },
          })
        : existing.service;
    if (!service) {
      throw new BadRequestException('Service not found');
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const durationMinutes = service.durationMinutes;
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    const staffId = dto.staffId ?? existing.staffId;
    if (!staffId) {
      throw new BadRequestException('Staff is required for rescheduling');
    }

    const resourceKey = `staff:${staffId}:${startAt.toISOString().substring(0, 10)}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        resourceKey,
      );

      const hasOverlap = await tx.appointment.findFirst({
        where: {
          salonId,
          staffId,
          id: { not: id },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        },
      });
      if (hasOverlap) {
        throw new ConflictException('CONFLICT');
      }

      await tx.appointment.update({
        where: { id },
        data: {
          customerId: dto.customerId ?? existing.customerId,
          serviceId: dto.serviceId ?? existing.serviceId,
          staffId,
          startAt,
          endAt,
          durationMinutes,
          priceCents: dto.priceCents ?? existing.priceCents,
          notes: dto.notes ?? existing.notes,
        },
      });
    });

    const updated = await this.get(salonId, id);
    this.eventEmitter.emit('appointment.rescheduled', {
      salonId,
      appointmentId: updated.id,
    });
    return updated;
  }

  async updateStatus(
    salonId: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const existing = await this.get(salonId, id);
    const updated = await this.prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
      },
    });
    let eventName: string | null = null;
    switch (dto.status) {
      case AppointmentStatus.CONFIRMED:
        eventName = 'appointment.confirmed';
        break;
      case AppointmentStatus.CANCELLED:
        eventName = 'appointment.cancelled';
        break;
      case AppointmentStatus.COMPLETED:
        eventName = 'appointment.completed';
        break;
      case AppointmentStatus.NO_SHOW:
        eventName = 'appointment.no_show';
        break;
      default:
        eventName = null;
    }
    if (eventName) {
      this.eventEmitter.emit(eventName, {
        salonId,
        appointmentId: updated.id,
      });
    }
    return updated;
  }

  private async autoAssignStaff(
    salonId: string,
    serviceId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<string | null> {
    // Simple strategy: any staff in salon with no conflicting appointment
    const staff = await this.prisma.staffProfile.findMany({
      where: { salonId },
      include: { appointments: true },
    });

    for (const s of staff) {
      const overlapping = s.appointments.find(
        (a) =>
          a.startAt < endAt &&
          a.endAt > startAt &&
          [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(a.status),
      );
      if (!overlapping) {
        return s.id;
      }
    }

    return null;
  }
}


