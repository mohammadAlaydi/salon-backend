import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterSalonAdminDto } from './dto/register-salon-admin.dto';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@CurrentSalon() salon: Salon | undefined, @Body() dto: LoginDto) {
    if (!salon) {
      throw new BadRequestException('Tenant not resolved from host or header');
    }
    return this.authService.login(salon.id, dto);
  }

  @Post('register')
  async register(@Body() dto: RegisterSalonAdminDto) {
    return this.authService.registerSalonAdmin(dto);
  }
}


