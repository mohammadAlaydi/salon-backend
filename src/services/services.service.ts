import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(salonId: string, pagination: PaginationDto) {
    const take = pagination.limit ?? 20;
    const skip = ((pagination.page ?? 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where: { salonId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.service.count({ where: { salonId } }),
    ]);
    return { items, total, page: pagination.page ?? 1, limit: take };
  }

  async findOne(salonId: string, id: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id, salonId },
    });
    if (!svc) {
      throw new NotFoundException('Service not found');
    }
    return svc;
  }

  async create(salonId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        salonId,
        name: dto.name,
        priceCents: dto.priceCents,
        durationMinutes: dto.durationMinutes,
        addOns: dto.addOns,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(salonId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(salonId, id);
    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        priceCents: dto.priceCents,
        durationMinutes: dto.durationMinutes,
        addOns: dto.addOns,
        isActive: dto.isActive,
      },
    });
  }

  async remove(salonId: string, id: string) {
    await this.findOne(salonId, id);
    await this.prisma.service.delete({
      where: { id },
    });
  }
}


