import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Salon } from '@prisma/client';

export const CurrentSalon = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Salon | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.salon as Salon | undefined;
  },
);


