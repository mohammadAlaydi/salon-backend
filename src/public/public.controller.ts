import { Controller, Get, Param, Post, Query, Body, NotFoundException, Headers, ConflictException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../db/prisma.service';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon, AppointmentStatus, PaymentStatus } from '@prisma/client';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  // Salon-specific routes
  @Get('salons/:slug')
  async getSalon(@Param('slug') _slug: string, @CurrentSalon() salon: Salon | undefined) {
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    // Return public salon informationss
    return {
      id: salon.id,
      slug: salon.slug,
      name: salon.name,
      address: null, // Add to schema if needed
      phone: null, // Add to schema if needed
      email: null, // Add to schema if needed
      branding: salon.defaultSettings as any,
      timezone: salon.timezone,
    };
  }

  @Get('salons/:slug/services')
  async getServicesBySlug(@Param('slug') _slug: string, @CurrentSalon() salon: Salon | undefined) {
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    // Return only active services
    const services = await this.prisma.service.findMany({
      where: {
        salonId: salon.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((service) => ({
      id: service.id,
      salonId: service.salonId,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      currency: salon.currency,
      isActive: service.isActive,
    }));
  }

  @Get('salons/:slug/staff')
  async getStaffBySlug(@Param('slug') _slug: string, @CurrentSalon() salon: Salon | undefined) {
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return this.getStaffList(salon.id);
  }

  // Generic public routes (used by booking flow)
  @Get('services')
  async getServices(@CurrentSalon() salon: Salon | undefined) {
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    // Return only active services
    const services = await this.prisma.service.findMany({
      where: {
        salonId: salon.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((service) => ({
      id: service.id,
      salonId: service.salonId,
      name: service.name,
      description: null,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      currency: salon.currency,
      isActive: service.isActive,
    }));
  }

  @Get('staff')
  async getStaff(@Query('serviceId') _serviceId: string | undefined, @CurrentSalon() salon: Salon | undefined) {
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    const staffList = await this.getStaffList(salon.id);

    // If serviceId is provided, filter staff by service (for now, return all)
    // TODO: Implement service-staff relationship filtering
    return staffList.map((staff) => ({
      staff,
      availability: [], // Will be populated by availability endpoint
    }));
  }

  @Get('availability')
  async getAvailability(
    @Query('serviceId') serviceId: string | undefined,
    @Query('staffId') staffId: string | undefined,
    @Query('date') date: string | undefined,
    @CurrentSalon() salon: Salon | undefined,
  ) {
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    if (!staffId || !date) {
      return [];
    }

    // Get staff working hours
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffId, salonId: salon.id },
      include: { workingHours: true },
    });

    if (!staff) {
      return [];
    }

    // Get service duration
    let durationMinutes = 60; // Default
    if (serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: serviceId, salonId: salon.id },
      });
      if (service) {
        durationMinutes = service.durationMinutes;
      }
    }

    // Get existing appointments for the date
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        salonId: salon.id,
        staffId: staffId,
        startAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
      },
    });

    // Get working hours for the day of week
    const dayOfWeek = selectedDate.getDay();
    const workingHours = staff.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek && wh.isAvailable);

    if (!workingHours) {
      return [];
    }

    // Generate time slots
    const slots: Array<{ startTime: string; endTime: string; isReserved: boolean }> = [];
    const [startHour, startMinute] = workingHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = workingHours.endTime.split(':').map(Number);

    const startTime = new Date(selectedDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    let currentTime = new Date(startTime);
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);
      if (slotEnd > endTime) break;

      // Check if slot conflicts with existing appointment
      const isReserved = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.startAt);
        const aptEnd = new Date(apt.endAt);
        return (
          (currentTime >= aptStart && currentTime < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (currentTime <= aptStart && slotEnd >= aptEnd)
        );
      });

      slots.push({
        startTime: currentTime.toISOString(),
        endTime: slotEnd.toISOString(),
        isReserved,
      });

      // Move to next slot (30-minute intervals)
      currentTime = new Date(currentTime.getTime() + 30 * 60000);
    }

    return slots;
  }

  @Post('appointments')
  async createAppointment(
    @Body() body: {
      serviceId: string;
      staffId: string;
      startTime: string;
      customer: { name: string; email?: string; phone: string };
      notes?: string;
    },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentSalon() salon: Salon | undefined,
  ) {
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    // Validate service
    const service = await this.prisma.service.findFirst({
      where: { id: body.serviceId, salonId: salon.id, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Validate staff
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: body.staffId, salonId: salon.id },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    // Check for idempotency
    if (idempotencyKey) {
      const existing = await this.prisma.appointment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // Check availability
    const startAt = new Date(body.startTime);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60000);

    // Check for conflicts
    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        salonId: salon.id,
        staffId: body.staffId,
        startAt: {
          lt: endAt,
        },
        endAt: {
          gt: startAt,
        },
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
      },
    });

    if (conflicting) {
      throw new ConflictException('Selected time slot is no longer available');
    }

    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        salonId: salon.id,
        OR: [
          body.customer.phone ? { phone: body.customer.phone } : { id: 'never-match' },
          body.customer.email ? { email: body.customer.email } : { id: 'never-match' },
        ],
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          salonId: salon.id,
          name: body.customer.name,
          email: body.customer.email,
          phone: body.customer.phone,
        },
      });
    }

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        salonId: salon.id,
        customerId: customer.id,
        serviceId: service.id,
        staffId: body.staffId,
        startAt,
        endAt,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        status: AppointmentStatus.CONFIRMED,
        paymentStatus: PaymentStatus.UNPAID,
        idempotencyKey: idempotencyKey || undefined,
        notes: body.notes ? { notes: body.notes } : undefined,
      },
      include: {
        service: true,
        staff: {
          include: { user: true },
        },
        customer: true,
      },
    });

    return {
      id: appointment.id,
      salonId: appointment.salonId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      customerId: appointment.customerId,
      startTime: appointment.startAt.toISOString(),
      endTime: appointment.endAt.toISOString(),
      status: appointment.status,
      notes: appointment.notes,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      source: 'PUBLIC',
    };
  }

  // Helper method to get staff list
  private async getStaffList(salonId: string) {
    const staffProfiles = await this.prisma.staffProfile.findMany({
      where: {
        salonId,
        user: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        workingHours: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return staffProfiles.map((staff) => ({
      id: staff.id,
      salonId: staff.salonId,
      userId: staff.userId,
      name: staff.user.name,
      bio: null, // Add to schema if needed
      avatarUrl: staff.photoUrl,
      skills: (staff.skills as string[]) || [],
      rating: null, // Add to schema if needed
      workingHours: staff.workingHours.map((wh) => ({
        dayOfWeek: wh.dayOfWeek,
        startTime: wh.startTime,
        endTime: wh.endTime,
        breaks: [], // Add to schema if needed
      })),
    }));
  }
}

