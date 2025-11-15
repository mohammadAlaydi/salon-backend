import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon, AppointmentStatus } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';

@ApiTags('appointments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_ADMIN, Role.STAFF)
@Controller('admin/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  async list(
    @CurrentSalon() salon: Salon,
    @Query() pagination: PaginationDto,
    @Query('staffId') staffId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsService.list(
      salon.id,
      pagination,
      {
        staffId,
        status,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      },
    );
  }

  @Get(':id')
  async get(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    return this.appointmentsService.get(salon.id, id);
  }

  @Post()
  async create(
    @CurrentSalon() salon: Salon,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(salon.id, idempotencyKey, dto);
  }

  @Put(':id')
  async update(
    @CurrentSalon() salon: Salon,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(salon.id, id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentSalon() salon: Salon,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(salon.id, id, dto);
  }

  @Patch(':id')
  async patchAppointment(
    @CurrentSalon() salon: Salon,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    // Support PATCH /admin/appointments/:id for status updates
    return this.appointmentsService.updateStatus(salon.id, id, dto);
  }
}


