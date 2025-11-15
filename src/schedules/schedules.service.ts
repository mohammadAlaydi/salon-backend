import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getStaffSchedule(salonId: string, staffId: string) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffId, salonId },
      include: { workingHours: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    return staff.workingHours;
  }

  async updateStaffSchedule(
    salonId: string,
    staffId: string,
    dto: UpdateWorkingHoursDto,
  ) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffId, salonId },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    await this.prisma.$transaction([
      this.prisma.workingHours.deleteMany({ where: { staffId } }),
      this.prisma.workingHours.createMany({
        data: dto.entries.map((entry) => ({
          staffId,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          isAvailable: entry.isAvailable,
        })),
      }),
    ]);

    return this.getStaffSchedule(salonId, staffId);
  }
}


