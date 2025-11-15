import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../db/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RegisterSalonAdminDto } from './dto/register-salon-admin.dto';
import { Role } from './roles.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUserByPassword(salonId: string, email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        salonId_email: {
          salonId,
          email,
        },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(tenantSalonId: string, dto: LoginDto) {
    const user = await this.validateUserByPassword(tenantSalonId, dto.email, dto.password);
    const payload = {
      sub: user.id,
      salonId: user.salonId,
      role: user.role,
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessTokenSecret'),
      expiresIn: this.configService.get<string>('jwt.accessTokenTtl'),
    });
    
    // Generate refresh token
    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
    };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshTokenSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshTokenTtl'),
    });
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        salonId: user.salonId,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }

  async registerSalonAdmin(dto: RegisterSalonAdminDto) {
    const existing = await this.prisma.salon.findUnique({
      where: { slug: dto.salonSlug },
    });
    if (existing) {
      throw new ConflictException('Salon slug already in use');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const salon = await this.prisma.salon.create({
      data: {
        name: dto.salonName,
        slug: dto.salonSlug,
        timezone: 'UTC',
        currency: 'USD',
        primaryDomain: null,
        customDomains: [],
        webhookSecret: await this.generateWebhookSecret(),
      },
    });

    const user = await this.prisma.user.create({
      data: {
        salonId: salon.id,
        email: dto.email,
        passwordHash,
        role: Role.SALON_ADMIN,
        name: dto.adminName,
      },
    });

    const payload = {
      sub: user.id,
      salonId: salon.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessTokenSecret'),
      expiresIn: this.configService.get<string>('jwt.accessTokenTtl'),
    });

    return {
      salon,
      admin: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      accessToken,
    };
  }

  private async generateWebhookSecret(): Promise<string> {
    return randomBytes(32).toString('hex');
  }
}


