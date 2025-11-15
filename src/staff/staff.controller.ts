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
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon } from '@prisma/client';

@ApiTags('staff')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_ADMIN)
@Controller('admin/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async list(@CurrentSalon() salon: Salon, @Query() pagination: PaginationDto) {
    return this.staffService.findAll(salon.id, pagination);
  }

  @Get(':id')
  async get(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    return this.staffService.findOne(salon.id, id);
  }

  @Post()
  async create(
    @CurrentSalon() salon: Salon,
    @Body() dto: CreateStaffDto,
  ) {
    return this.staffService.create(salon.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentSalon() salon: Salon,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(salon.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    await this.staffService.remove(salon.id, id);
    return { success: true };
  }
}


