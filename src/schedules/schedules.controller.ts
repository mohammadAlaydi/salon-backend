import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon } from '@prisma/client';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@ApiTags('schedules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_ADMIN)
@Controller('admin/staff')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get(':id/schedule')
  async getSchedule(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    return this.schedulesService.getStaffSchedule(salon.id, id);
  }

  @Put(':id/schedule')
  async updateSchedule(
    @CurrentSalon() salon: Salon,
    @Param('id') id: string,
    @Body() dto: UpdateWorkingHoursDto,
  ) {
    return this.schedulesService.updateStaffSchedule(salon.id, id, dto);
  }
}


