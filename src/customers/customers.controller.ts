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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon } from '@prisma/client';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_ADMIN, Role.STAFF)
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @CurrentSalon() salon: Salon,
    @Query() pagination: PaginationDto,
  ) {
    return this.customersService.findAll(salon.id, pagination);
  }

  @Get(':id')
  async get(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    return this.customersService.findOne(salon.id, id);
  }

  @Post()
  async create(
    @CurrentSalon() salon: Salon,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(salon.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentSalon() salon: Salon,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(salon.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentSalon() salon: Salon, @Param('id') id: string) {
    await this.customersService.remove(salon.id, id);
    return { success: true };
  }
}


