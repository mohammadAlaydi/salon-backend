import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../db/prisma.service';
import { ConfigService } from '@nestjs/config';

declare module 'express-serve-static-core' {
  interface Request {
    salon?: any;
  }
}

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const hostHeader = req.headers.host;
    const host = hostHeader?.split(':')[0];
    // Express normalizes headers to lowercase
    const tenantHeader = (req.headers['x-tenant-id'] ||
      req.headers['x-tenant']) as string | undefined;
    const baseDomain = this.configService.get<string>('tenancy.baseDomain');

    // Extract salon slug from URL path (e.g., /public/salons/demo-salon/services)
    let slugFromPath: string | undefined;
    const pathMatch = req.path.match(/\/public\/salons\/([^/]+)/);
    if (pathMatch) {
      slugFromPath = pathMatch[1];
    }

    // Log all headers for debugging
    this.logger.log(
      `[TenantResolver] Request to ${req.path} - host: ${host}, tenantHeader: ${tenantHeader}, slugFromPath: ${slugFromPath}, baseDomain: ${baseDomain}`,
    );

    let salon = null;

    // Priority 1: Check URL path for salon slug (for public routes)
    if (!salon && slugFromPath) {
      this.logger.log(`[TenantResolver] Looking up salon by path slug: ${slugFromPath}`);
      salon = await this.prisma.salon.findUnique({
        where: { slug: slugFromPath },
      });
      if (salon) {
        this.logger.log(`[TenantResolver] Found salon by path slug: ${salon.slug} (${salon.id})`);
      }
    }

    // Priority 2: Check host header
    if (!salon && host) {
      salon = await this.findByHost(host, baseDomain);
      if (salon) {
        this.logger.log(`[TenantResolver] Found salon by host: ${salon.slug} (${salon.id})`);
      }
    }

    // Priority 3: Check tenant header
    if (!salon && tenantHeader) {
      this.logger.log(`[TenantResolver] Looking up salon by header: ${tenantHeader}`);
      salon = await this.findByTenantHeader(tenantHeader);
      if (salon) {
        this.logger.log(`[TenantResolver] Found salon by header: ${salon.slug} (${salon.id})`);
      } else {
        this.logger.warn(`[TenantResolver] No salon found for tenant header: ${tenantHeader}`);
        // Try to list available salons for debugging
        try {
          const allSalons = await this.prisma.salon.findMany({
            select: { slug: true, id: true },
            take: 5,
          });
          this.logger.log(`[TenantResolver] Available salons: ${JSON.stringify(allSalons)}`);
        } catch (error) {
          this.logger.error(`[TenantResolver] Error querying salons: ${error}`);
        }
      }
    }

    // Priority 4: For public routes without tenant, try default demo-salon
    if (!salon && req.path.startsWith('/public/') && !req.path.includes('/salons/')) {
      this.logger.log(`[TenantResolver] Public route without tenant, trying default demo-salon`);
      salon = await this.prisma.salon.findUnique({
        where: { slug: 'demo-salon' },
      });
      if (salon) {
        this.logger.log(`[TenantResolver] Using default demo-salon: ${salon.slug} (${salon.id})`);
      }
    }

    if (salon) {
      (req as any).salon = salon;
    } else {
      this.logger.warn(
        `[TenantResolver] Tenant not resolved - host: ${host}, tenantHeader: ${tenantHeader}, slugFromPath: ${slugFromPath}, path: ${req.path}`,
      );
    }

    next();
  }

  private async findByHost(host: string, baseDomain?: string | null) {
    // Custom domain mapping
    const byDomain = await this.prisma.salon.findFirst({
      where: {
        OR: [{ primaryDomain: host }, { customDomains: { has: host } }],
      },
    });
    if (byDomain) {
      return byDomain;
    }

    // Subdomain mapping: slug.baseDomain
    if (baseDomain && host.endsWith(baseDomain)) {
      const slug = host.replace(`.${baseDomain}`, '');
      if (slug && slug !== host) {
        return this.prisma.salon.findUnique({
          where: { slug },
        });
      }
    }

    return null;
  }

  private async findByTenantHeader(header: string) {
    // Accept either salon id or slug
    const byId = await this.prisma.salon.findUnique({
      where: { id: header },
    });
    if (byId) {
      return byId;
    }

    return this.prisma.salon.findUnique({
      where: { slug: header },
    });
  }
}


