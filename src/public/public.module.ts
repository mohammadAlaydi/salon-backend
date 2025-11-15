import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PrismaModule } from '../db/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicController],
})
export class PublicModule {}

