import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon } from '@prisma/client';

@ApiTags('services')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_ADMIN, Role.STAFF)
@Controller('admin/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async list(@CurrentSalon() salon: Salon, @Query() pagination: PaginationDto) {
    return this.servicesService.findAll(salon.id, pagination);
  }

  @Get(':id')
  async get(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    return this.servicesService.findOne(salon.id, id);
  }

  @Post()
  async create(
    @CurrentSalon() salon: Salon,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(salon.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentSalon() salon: Salon,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(salon.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    await this.servicesService.remove(salon.id, id);
    return { success: true };
  }
}


