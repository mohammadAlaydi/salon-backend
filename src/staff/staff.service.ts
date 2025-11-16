import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/roles.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(salonId: string, pagination: PaginationDto) {
    const take = pagination.limit ?? 20;
    const skip = ((pagination.page ?? 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.staffProfile.findMany({
        where: { salonId },
        include: { user: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.staffProfile.count({ where: { salonId } }),
    ]);
    return { items, total, page: pagination.page ?? 1, limit: take };
  }

  async findOne(salonId: string, id: string) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id, salonId },
      include: { user: true, workingHours: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    return staff;
  }

  async create(salonId: string, dto: CreateStaffDto) {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          salonId,
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          passwordHash,
          role: Role.STAFF,
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          salonId,
          userId: user.id,
          skills: dto.skills?.length ? (dto.skills as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          colorTag: dto.colorTag,
        },
        include: { user: true },
      });

      return profile;
    });
  }

  async update(salonId: string, id: string, dto: UpdateStaffDto) {
    const existing = await this.findOne(salonId, id);
    return this.prisma.staffProfile.update({
      where: { id },
      data: {
        skills: (dto.skills as unknown) === null ? Prisma.DbNull : (dto.skills as unknown as Prisma.InputJsonValue),
        colorTag: dto.colorTag ?? existing.colorTag,
        user: {
          update: {
            name: dto.name ?? existing.user.name,
            email: dto.email ?? existing.user.email,
            phone: dto.phone ?? existing.user.phone,
          },
        },
      },
      include: { user: true },
    });
  }

  async remove(salonId: string, id: string) {
    const existing = await this.findOne(salonId, id);
    await this.prisma.staffProfile.delete({
      where: { id: existing.id },
    });
  }
}


