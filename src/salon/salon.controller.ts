import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentSalon } from '../tenancy/tenant.decorator';
import { Salon } from '@prisma/client';

@ApiTags('salon')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALON_ADMIN)
@Controller('admin/salon')
export class SalonController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getSalon(@CurrentSalon() salon: Salon) {
    return {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      timezone: salon.timezone,
      currency: salon.currency,
      primaryDomain: salon.primaryDomain,
      customDomains: salon.customDomains,
      defaultSettings: salon.defaultSettings,
      n8nWebhookUrl: salon.n8nWebhookUrl,
      createdAt: salon.createdAt,
      updatedAt: salon.updatedAt,
    };
  }

  @Put()
  async updateSalon(
    @CurrentSalon() salon: Salon,
    @Body()
    dto: {
      name?: string;
      timezone?: string;
      currency?: string;
      primaryDomain?: string;
      customDomains?: string[];
      defaultSettings?: any;
      n8nWebhookUrl?: string;
    },
  ) {
    const updated = await this.prisma.salon.update({
      where: { id: salon.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.primaryDomain !== undefined && { primaryDomain: dto.primaryDomain }),
        ...(dto.customDomains !== undefined && { customDomains: dto.customDomains }),
        ...(dto.defaultSettings !== undefined && { defaultSettings: dto.defaultSettings }),
        ...(dto.n8nWebhookUrl !== undefined && { n8nWebhookUrl: dto.n8nWebhookUrl }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      timezone: updated.timezone,
      currency: updated.currency,
      primaryDomain: updated.primaryDomain,
      customDomains: updated.customDomains,
      defaultSettings: updated.defaultSettings,
      n8nWebhookUrl: updated.n8nWebhookUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}

