import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon } from '@prisma/client';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_ADMIN)
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  async daily(@CurrentSalon() salon: Salon, @Query('date') date: string) {
    return this.reportsService.getDailyReport(salon.id, date);
  }

  @Get('staff/:id/performance')
  async staffPerformance(
    @CurrentSalon() salon: Salon,
    @Param('id') staffId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getStaffPerformance(salon.id, staffId, from, to);
  }

  @Get('top-services')
  async topServices(
    @CurrentSalon() salon: Salon,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getTopServices(salon.id, from, to);
  }
}


