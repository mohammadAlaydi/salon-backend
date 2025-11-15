import { Module } from '@nestjs/common';
import { SalonController } from './salon.controller';
import { PrismaModule } from '../db/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalonController],
})
export class SalonModule {}

