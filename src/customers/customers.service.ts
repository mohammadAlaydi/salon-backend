import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(salonId: string, pagination: PaginationDto) {
    const take = pagination.limit ?? 20;
    const skip = ((pagination.page ?? 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where: { salonId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({
        where: { salonId },
      }),
    ]);
    return { items, total, page: pagination.page ?? 1, limit: take };
  }

  async findOne(salonId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, salonId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async create(salonId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        salonId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
      },
    });
  }

  async update(salonId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(salonId, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
      },
    });
  }

  async remove(salonId: string, id: string) {
    await this.findOne(salonId, id);
    await this.prisma.customer.delete({
      where: { id },
    });
  }
}


